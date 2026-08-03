---
title: 01. context
icon: timeline
prev:
  text: 01. 标准库
  link: /backend/go/advanced/01-standard-library/
next:
  text: 02. 并发编程
  link: /backend/go/advanced/02-concurrency/
---

# 01. context

学 Go 后端绕不开 `context`。

一开始看它会觉得有点抽象：函数里到处传一个 `ctx context.Context`，有时候用来控制超时，有时候用来取消 goroutine，有时候又用来拿 `traceID`。这些能力看起来分散，但读一下源码会发现，它其实就围绕一个很小的接口展开。

先记一个结论：`context` 不是用来干活的，它是用来通知“这件事还要不要继续干”的。

比如一个 HTTP 请求进来以后，后面可能会继续查数据库、调 RPC、开 goroutine：

```text
HTTP 请求 -> 业务逻辑 -> 数据库 -> RPC -> goroutine
```

如果用户已经断开连接，或者请求已经超时，后面的任务还继续跑就没有意义了。`context` 要解决的就是这种调用链上的取消和超时问题。

## 先看 Context 接口

Go 源码里，`Context` 是一个接口，只有四个方法：

```go
type Context interface {
	Deadline() (deadline time.Time, ok bool)
	Done() <-chan struct{}
	Err() error
	Value(key any) any
}
```

这四个方法非常关键，后面的 `WithCancel`、`WithTimeout`、`WithValue` 都是在围绕它们做文章。

`Deadline` 返回截止时间。如果这个 context 没有设置过期时间，第二个返回值 `ok` 就是 `false`。

```go
deadline, ok := ctx.Deadline()
```

`Done` 返回一个 channel。这个 channel 平时不会有值，但当 context 被取消或者超时时，它会被关闭。所以代码里通常不是从里面读具体数据，而是监听它有没有关闭。

```go
select {
case <-ctx.Done():
	return ctx.Err()
}
```

`Err` 返回取消原因。常见就两个：

```go
context.Canceled
context.DeadlineExceeded
```

前者表示手动取消，后者表示超时。

`Value` 用来取请求级数据，比如 `traceID`、用户信息。它不是给你随便传业务参数用的，这点后面很容易踩坑。

## Background 到底是什么

我们平时经常这样写：

```go
ctx := context.Background()
```

`Background` 返回的是根 context。源码里它的底层基于 `emptyCtx`：

```go
type emptyCtx struct{}
```

`emptyCtx` 很“空”：

1. 没有 deadline。
2. `Done()` 返回 `nil`。
3. `Err()` 返回 `nil`。
4. `Value()` 返回 `nil`。

也就是说，`Background` 自己不会取消、不会超时、也不带任何值。它更像一个根节点，后面的 context 都是在它上面一层一层包出来的。

## WithCancel：给 context 加取消能力

先看最常见的写法：

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()
```

`WithCancel` 返回两个东西：一个新的 context，一个取消函数。

源码里真正干活的是 `cancelCtx`，核心字段大概是这样：

```go
type cancelCtx struct {
	Context

	mu       sync.Mutex
	done     atomic.Value
	children map[canceler]struct{}
	err      error
	cause    error
}
```

这里不要被字段吓到，抓住三个点就够了。

第一，`cancelCtx` 里面嵌了一个 `Context`。这说明它会包住父 context，形成一条链。

第二，`done` 里面放的是一个 channel。调用 `cancel()` 时，这个 channel 会被关闭。其他地方只要监听 `<-ctx.Done()`，就能知道任务该停了。

第三，`children` 保存子 context。父 context 被取消时，会继续把取消信号传给自己的孩子，所以 context 是有父子传播关系的。

把 `WithCancel` 翻译成人话，大概就是：

```text
基于父 context 包一层 cancelCtx
谁调用 cancel，谁就关闭 done
done 一关闭，监听 ctx.Done() 的地方就能收到信号
如果它下面还有子 context，也一起取消
```

所以 context 的取消不是靠“轮询某个 bool 变量”，而是靠关闭 channel 来广播信号。

## WithTimeout：本质是 WithDeadline

再看超时：

```go
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
```

源码里 `WithTimeout` 很薄，它本质上就是：

```go
return WithDeadline(parent, time.Now().Add(timeout))
```

真正多出来的是 `timerCtx`：

```go
type timerCtx struct {
	cancelCtx
	timer    *time.Timer
	deadline time.Time
}
```

这个结构体也很好读。它嵌入了 `cancelCtx`，说明它本来就有取消能力；然后又多了一个 `timer` 和一个 `deadline`。

所以 `WithTimeout` 的逻辑是：

```text
先创建一个能取消的 context
再挂一个 timer
时间一到，timer 自动调用 cancel
取消原因变成 context deadline exceeded
```

这就是为什么超时以后 `ctx.Err()` 拿到的是 `context deadline exceeded`。

## WithValue：只是包一层 key-value

`WithValue` 看起来像一个“全局参数袋”，但源码会提醒我们：它其实只是包了一层很薄的结构。

```go
type valueCtx struct {
	Context
	key, val any
}
```

它同样嵌入了父 context，然后自己保存一组 `key` 和 `val`。

当你调用：

```go
ctx = context.WithValue(ctx, traceIDKey{}, "trace-001")
```

就相当于在原来的 context 外面再套一层 `valueCtx`。取值时，如果当前这一层 key 对得上，就返回；对不上，就继续往父 context 找。

这也解释了为什么官方不建议用普通字符串做 key。项目大了以后，不同包都用 `"userID"`、`"traceID"`，很容易撞 key。更推荐定义一个私有类型：

```go
type traceIDKey struct{}
```

这样不同包之间不容易冲突。

## 把它们连起来看

如果你写了这样一段代码：

```go
ctx := context.Background()
ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
defer cancel()
ctx = context.WithValue(ctx, traceIDKey{}, "trace-001")
```

它不是在原地修改同一个 context，而是在不断包新的 context：

```text
valueCtx(traceID)
└── timerCtx(deadline: 2s)
    └── backgroundCtx
```

再复杂一点，如果中间有 `WithCancel`，链路可能长这样：

```text
valueCtx
└── timerCtx
    └── cancelCtx
        └── backgroundCtx
```

这就是读 context 源码时最重要的视角：它不是一个大而全的对象，而是一层套一层的小对象。

## 一个小 demo

下面写一个很小的例子，模拟一次数据库查询。

目标是看清楚三件事：

1. `WithTimeout` 怎么让任务超时。
2. `Done()` 怎么通知任务停止。
3. `WithValue` 怎么传一个 `traceID`。

```go
package main

import (
	"context"
	"fmt"
	"time"
)

type traceIDKey struct{}

func queryDatabase(ctx context.Context) error {
	traceID, _ := ctx.Value(traceIDKey{}).(string)
	fmt.Println("开始查询数据库，traceID:", traceID)

	select {
	case <-time.After(3 * time.Second):
		fmt.Println("数据库查询完成")
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func main() {
	ctx := context.Background()

	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	ctx = context.WithValue(ctx, traceIDKey{}, "trace-001")

	if err := queryDatabase(ctx); err != nil {
		fmt.Println("请求失败:", err)
		return
	}

	fmt.Println("请求成功")
}
```

运行结果大概是：

```text
开始查询数据库，traceID: trace-001
请求失败: context deadline exceeded
```

为什么会这样？

`queryDatabase` 里模拟查询要 3 秒：

```go
case <-time.After(3 * time.Second):
```

但外层 context 只给了 2 秒：

```go
context.WithTimeout(ctx, 2*time.Second)
```

2 秒一到，`timerCtx` 里的 timer 触发取消，`Done()` 对应的 channel 被关闭，于是这个分支先执行：

```go
case <-ctx.Done():
	return ctx.Err()
```

所以最后打印的是：

```text
context deadline exceeded
```

这就把源码里的几个点串起来了：

1. `timerCtx` 负责到点取消。
2. `cancelCtx` 负责关闭 `Done()`。
3. `valueCtx` 负责保存 `traceID`。
4. 业务代码只需要监听 `ctx.Done()`。

## 使用时容易踩的几个点

`context.Context` 一般放在函数第一个参数：

```go
func Query(ctx context.Context, id int64) error
```

不要把 `context.Context` 存到结构体字段里。它表示的是一次调用、一次请求、一次任务的生命周期，直接通过参数传递更清楚。

`cancel` 要记得调用：

```go
ctx, cancel := context.WithTimeout(parent, time.Second)
defer cancel()
```

哪怕任务提前完成了，也应该调用 `cancel`，这样底层 timer 等资源可以及时释放。

`WithValue` 少用，而且只放请求级数据。比如 trace id 可以放，分页参数、业务开关、普通配置就别放了。

不要传 `nil` context。不确定时可以先用：

```go
context.TODO()
```

## 小结

读 `context` 源码时，不用一上来就追每个细节。先抓住这个顺序：

1. `Context` 接口只有四个方法。
2. `emptyCtx` 是根，什么都不做。
3. `cancelCtx` 负责取消。
4. `timerCtx` 在取消基础上加定时器。
5. `valueCtx` 在父 context 外面包一层值。

把这条线捋顺以后，再看业务代码里的 `ctx.Done()`、`ctx.Err()`、`ctx.Value()`，就不会觉得它玄乎了。
