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

刚开始看它会觉得有点抽象：函数里到处传一个 `ctx context.Context`，有时候用来控制超时，有时候用来取消 goroutine，有时候又用来拿 `traceID`。这些能力看起来分散，但顺着源码看一遍会发现，它其实一直围绕一个很小的接口展开。

先记一个朴素的理解：`context` 不是用来干活的，它是用来告诉后面的代码“这件事还要不要继续干”的。

比如一次 HTTP 请求进来以后，后面可能会查数据库、调 RPC、启动 goroutine：

```text
HTTP 请求 -> 业务逻辑 -> 数据库 -> RPC -> goroutine
```

如果用户已经断开连接，或者请求已经超时，后面的任务还继续跑就没什么意义了。`context` 要解决的就是这种调用链上的取消、超时和少量请求级数据传递问题。

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

这四个方法就是整套机制的骨架。后面的 `WithCancel`、`WithTimeout`、`WithDeadline`、`WithValue` 都是在这个接口上做包装。

| 方法 | 可以怎么理解 | 常见场景 |
| --- | --- | --- |
| `Deadline()` | 这件事最晚什么时候结束 | 判断请求是否设置了超时时间 |
| `Done()` | 取消信号，取消或超时时 channel 会关闭 | 在 `select` 里监听任务是否该停 |
| `Err()` | 为什么被取消 | 区分 `Canceled` 和 `DeadlineExceeded` |
| `Value()` | 从调用链上取请求级数据 | 取 `traceID`、用户信息等 |

其中最常用、也最重要的是 `Done()`。

`Done()` 返回的是一个 channel。这个 channel 平时不会吐出什么业务数据，它真正有用的地方是：一旦 context 被取消或者超时，这个 channel 会被关闭。

所以业务代码里经常这样写：

```go
select {
case <-ctx.Done():
	return ctx.Err()
default:
	// 继续执行任务
}
```

`Err()` 则负责告诉你为什么停下来。常见就两个：

```go
context.Canceled
context.DeadlineExceeded
```

前者表示手动取消，后者表示超时。

## Background 和 TODO 到底是什么

我们平时经常这样写：

```go
ctx := context.Background()
```

`Background()` 返回的是根 context。源码里它的底层基于 `emptyCtx`：

```go
type emptyCtx struct{}
```

这个名字很直白，它确实很“空”：

1. 没有 deadline。
2. `Done()` 返回 `nil`。
3. `Err()` 返回 `nil`。
4. `Value()` 返回 `nil`。

也就是说，`Background()` 自己不会取消、不会超时、也不带任何值。它更像一棵 context 树的根节点，后面的 context 都是在它上面一层一层包出来的。

`TODO()` 和 `Background()` 很像，也基于 `emptyCtx`。区别更多是语义上的：

1. `Background()`：main 函数、初始化、测试代码里常用。
2. `TODO()`：暂时不知道该传什么 context，先占个位，后面再补。

实际业务里，我们一般不会只停留在 `Background()`，而是基于它继续派生新的 context。

## WithCancel：给 context 加取消能力

先看最常见的写法：

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()
```

`WithCancel` 返回两个东西：一个新的 context，一个取消函数。

源码里真正干活的是 `cancelCtx`。它的核心字段大概长这样：

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

这里不用一上来就追每一行，先抓住几个关键点。

第一，`cancelCtx` 里面嵌了一个 `Context`。这说明它会包住父 context，形成一条链。

第二，`done` 里面放的是取消信号对应的 channel。调用 `cancel()` 时，这个 channel 会被关闭。其他地方只要监听 `<-ctx.Done()`，就能知道任务该停了。

第三，`children` 保存子 context。父 context 被取消时，会把取消信号继续传给自己的子 context，所以 context 不是一个孤立对象，它有父子传播关系。

第四，`err` 记录取消原因，比如 `context canceled`。新版本里还有 `cause`，可以记录更具体的取消原因。

把 `WithCancel` 翻译成人话，大概就是：

```text
基于父 context 包一层 cancelCtx
调用 cancel 时设置 err
关闭 done channel
监听 ctx.Done() 的地方收到信号
如果下面还有子 context，也一起取消
```

所以 context 的取消不是靠到处轮询某个 bool 变量，而是靠关闭 channel 来广播信号。

## WithTimeout：本质是 WithDeadline

再看超时：

```go
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
```

源码里 `WithTimeout` 很薄，本质上就是调用 `WithDeadline`：

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

这个结构也很好读。它嵌入了 `cancelCtx`，说明它本来就有取消能力；然后又多了 `timer` 和 `deadline`。

所以 `WithTimeout` 的逻辑可以这样理解：

```text
先创建一个能取消的 context
再挂一个 timer
时间一到，timer 自动触发 cancel
取消原因变成 context deadline exceeded
```

这就是为什么超时以后，`ctx.Err()` 拿到的是：

```go
context.DeadlineExceeded
```

`WithTimeout` 并不是一套新机制，它是在 `cancelCtx` 的基础上加了一个定时器。

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

就相当于在原来的 context 外面再套一层 `valueCtx`。取值时，如果当前这一层 key 对得上，就返回；如果对不上，就继续往父 context 里找。

这也解释了为什么官方不建议用普通字符串做 key。项目大了以后，不同包都用 `"userID"`、`"traceID"`，很容易撞 key。更推荐定义一个私有类型：

```go
type traceIDKey struct{}
```

这样不同包之间不容易冲突。

另外，`WithValue` 要克制使用。它适合传递 `traceID`、`requestID`、用户认证信息这类跨 API 边界的请求级数据，不适合拿来替代普通函数参数。

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

如果中间再加一层 `WithCancel`，链路可能变成：

```text
valueCtx
└── timerCtx
    └── cancelCtx
        └── backgroundCtx
```

这就是读 context 源码时最重要的视角：它不是一个大而全的对象，而是一层套一层的小对象。

它的传播规则也比较好记：

1. 父 context 取消，子 context 会跟着取消。
2. 子 context 取消，不会影响父 context。
3. `WithTimeout` 到期，本质上也是取消当前子 context。
4. `WithValue` 只负责存值，不负责取消。

## 一个小 demo

下面写一个很小的例子，模拟一次数据库查询。

这个例子想看清楚三件事：

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

## Demo 背后的源码逻辑

这段代码实际形成了这样一条 context 链：

```text
valueCtx(traceID)
└── timerCtx(deadline: 2s)
    └── backgroundCtx
```

执行过程可以顺着源码这样看：

1. `context.Background()` 创建根 context。
2. `WithTimeout` 包一层 `timerCtx`，里面有定时器。
3. `WithValue` 再包一层 `valueCtx`，保存 `traceID`。
4. `queryDatabase` 调用 `ctx.Value(traceIDKey{})`，先从 `valueCtx` 里找值。
5. 2 秒后，`timerCtx` 的定时器触发取消。
6. 取消逻辑落到 `cancelCtx`，关闭 `Done()` 对应的 channel。
7. `select` 监听到 `<-ctx.Done()`，返回 `ctx.Err()`。

所以，`context` 并不神秘。它就是通过接口、结构体嵌套、channel 关闭和父子节点传播，把取消和超时能力串起来。

## 使用时容易踩的几个点

`context.Context` 一般放在函数第一个参数：

```go
func Query(ctx context.Context, id int64) error
```

不要把 `context.Context` 存到结构体字段里。它表示的是一次调用、一次请求、一次任务的生命周期，通过参数传递更清楚。

`cancel` 要记得调用：

```go
ctx, cancel := context.WithTimeout(parent, time.Second)
defer cancel()
```

哪怕任务提前完成了，也应该调用 `cancel`，这样底层 timer 等资源可以及时释放。

`WithValue` 少用，而且只放请求级数据。比如 `traceID` 可以放，分页参数、业务开关、普通配置就别放了。

不要传 `nil` context。不确定时可以先用：

```go
context.TODO()
```

## 小结

读 `context` 源码时，不用一上来就追每个细节。先抓住这条线：

1. `Context` 接口只有四个方法：`Deadline`、`Done`、`Err`、`Value`。
2. `emptyCtx` 是根，什么都不做。
3. `cancelCtx` 负责取消和级联取消。
4. `timerCtx` 在取消基础上加定时器。
5. `valueCtx` 在父 context 外面包一层值。

把这条线捋顺以后，再看业务代码里的 `ctx.Done()`、`ctx.Err()`、`ctx.Value()`，就不会觉得它玄乎了。
