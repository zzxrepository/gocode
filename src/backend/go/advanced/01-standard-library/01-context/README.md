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

`context` 是 Go 标准库里用来控制调用链生命周期的包。它最重要的作用不是“传值”，而是把取消信号、超时时间和请求级数据沿着函数调用链一路传下去。

服务端开发里经常会遇到这样的链路：

```text
HTTP 请求 -> 业务逻辑 -> 数据库查询 -> RPC 调用 -> goroutine 后台任务
```

如果用户取消了请求，或者请求已经超时，后面的数据库、RPC、goroutine 就不应该继续傻跑。`context` 就是为了解决这个问题。

## 从源码看 Context 接口

`context.Context` 本身是一个接口，核心只有四个方法：

```go
type Context interface {
	Deadline() (deadline time.Time, ok bool)
	Done() <-chan struct{}
	Err() error
	Value(key any) any
}
```

这四个方法对应四件事：

| 方法 | 作用 | 常见用途 |
| --- | --- | --- |
| `Deadline()` | 返回任务的截止时间 | 判断还有多久超时 |
| `Done()` | 返回一个只读 channel，取消或超时时会被关闭 | 在 `select` 中监听取消信号 |
| `Err()` | 返回取消原因 | 区分主动取消还是超时 |
| `Value()` | 根据 key 读取请求级数据 | 传递 trace id、用户 id 等少量链路数据 |

其中最关键的是 `Done()`。它返回的是一个 channel，所以我们通常会这样写：

```go
select {
case <-ctx.Done():
	return ctx.Err()
default:
	// 继续执行任务
}
```

## Background 和 TODO 的底层

`context.Background()` 和 `context.TODO()` 都是根 context。

从源码看，它们底层都基于 `emptyCtx`。`emptyCtx` 的特点是：

1. 没有截止时间。
2. 永远不会被取消。
3. 不保存任何值。

可以把它理解成一棵 context 树的根节点。

```go
ctx := context.Background()
```

常见用法：

1. `Background()`：main 函数、初始化、测试代码里作为根 context。
2. `TODO()`：暂时不知道传什么 context 时先占位，后面再补。

实际业务代码里，更常见的是在根 context 上继续派生新的 context。

## WithCancel：手动取消

`context.WithCancel(parent)` 会基于父 context 派生一个可以取消的子 context。

```go
ctx, cancel := context.WithCancel(parent)
defer cancel()
```

它底层的核心实现是 `cancelCtx`。可以先抓住几个关键字段：

```go
type cancelCtx struct {
	Context
	done     atomic.Value
	children map[canceler]struct{}
	err      error
	cause    error
}
```

这里的重点是：

1. `Context`：内嵌父 context，所以子 context 可以继续向父 context 查 deadline 和 value。
2. `done`：保存取消信号对应的 channel，取消时关闭它。
3. `children`：保存子 context，父 context 取消时会级联取消所有子 context。
4. `err`：记录取消原因，比如 `context canceled`。
5. `cause`：Go 新版本里用于记录更具体的取消原因。

所以 `WithCancel` 的底层逻辑可以理解成：

```text
创建 cancelCtx
把它挂到父 context 下面
调用 cancel 时：
  1. 设置 err
  2. 关闭 done channel
  3. 递归取消 children
```

这就是为什么父 context 被取消时，它下面派生出来的子 context 也会一起取消。

## WithTimeout 和 WithDeadline：超时取消

`context.WithTimeout(parent, timeout)` 是常用的超时控制：

```go
ctx, cancel := context.WithTimeout(parent, 2*time.Second)
defer cancel()
```

从源码看，`WithTimeout` 本质上是调用 `WithDeadline`：

```go
return WithDeadline(parent, time.Now().Add(timeout))
```

而 `WithDeadline` 底层使用的是 `timerCtx`：

```go
type timerCtx struct {
	cancelCtx
	timer    *time.Timer
	deadline time.Time
}
```

`timerCtx` 内嵌了 `cancelCtx`，所以它天然拥有取消能力。同时它多了两个东西：

1. `timer`：时间到了以后自动触发取消。
2. `deadline`：记录具体截止时间。

这也是 `WithTimeout` 的核心：它不是一种全新的机制，而是在 `cancelCtx` 的基础上加了一个定时器。

## WithValue：请求级数据传递

`context.WithValue(parent, key, val)` 用来传递请求级数据：

```go
ctx := context.WithValue(parent, traceIDKey{}, "trace-001")
```

它底层是 `valueCtx`：

```go
type valueCtx struct {
	Context
	key, val any
}
```

`valueCtx` 也内嵌了父 context。查值时，如果当前节点的 key 匹配，就返回当前值；否则继续向父 context 查。

可以把它想象成一条链：

```text
valueCtx(trace_id) -> timerCtx(timeout) -> cancelCtx(cancel) -> backgroundCtx
```

调用 `ctx.Value(key)` 时，会沿着这条链往上找。

`WithValue` 要克制使用。它适合传递 trace id、request id、用户认证信息这类跨 API 边界的请求级数据，不适合拿来替代普通函数参数。

## Context 是一棵树

`context` 最好按“树”来理解：

```text
Background
└── WithCancel
    ├── WithTimeout
    │   └── WithValue
    └── WithValue
```

它的传播规则是：

1. 父 context 取消，子 context 全部取消。
2. 子 context 取消，不会影响父 context。
3. `WithTimeout` 到期，本质上也是对子 context 执行取消。
4. `WithValue` 只是包一层 key-value，不负责取消。

## Demo：超时取消 + trace id 传递

下面这个例子模拟一次请求处理：

1. `main` 创建一个带超时时间的 context。
2. 用 `WithValue` 放入一个 trace id。
3. `queryDatabase` 模拟数据库查询。
4. 如果查询超过 2 秒，任务会被 context 取消。

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
		fmt.Println("数据库查询成功")
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
		fmt.Println("请求结束:", err)
		return
	}

	fmt.Println("请求成功")
}
```

可能输出：

```text
开始查询数据库，traceID: trace-001
请求结束: context deadline exceeded
```

这个 demo 里，`time.After(3 * time.Second)` 模拟数据库查询需要 3 秒，但 `WithTimeout` 设置的是 2 秒，所以 `ctx.Done()` 会先收到信号，`queryDatabase` 返回 `ctx.Err()`。

## Demo 背后的源码逻辑

这段代码实际形成了这样一条 context 链：

```text
valueCtx(traceID)
└── timerCtx(2s deadline)
    └── backgroundCtx
```

执行过程是：

1. `context.Background()` 创建根 context。
2. `WithTimeout` 包一层 `timerCtx`，里面有定时器。
3. `WithValue` 再包一层 `valueCtx`，保存 trace id。
4. `queryDatabase` 调用 `ctx.Value(traceIDKey{})`，从 `valueCtx` 里拿到 trace id。
5. 2 秒后，`timerCtx` 的定时器触发取消，关闭 `Done()` 对应的 channel。
6. `select` 监听到 `<-ctx.Done()`，返回 `context deadline exceeded`。

所以，`context` 并不是魔法，它就是通过接口、结构体嵌套、channel 关闭和父子节点传播，把取消和超时能力串起来。

## 使用原则

1. 函数参数里通常把 `ctx context.Context` 放在第一个参数。
2. 不要把 `context.Context` 存到结构体字段里，优先通过参数显式传递。
3. `WithCancel`、`WithTimeout`、`WithDeadline` 返回的 `cancel` 要及时调用。
4. `WithValue` 只传请求级数据，不要传普通业务参数。
5. 不要传 `nil` context，不确定时用 `context.TODO()`。

## 小结

`context` 的核心可以浓缩成一句话：它是调用链上的生命周期控制器。

源码层面重点记住三类实现：

1. `cancelCtx`：负责取消和级联取消。
2. `timerCtx`：在 `cancelCtx` 基础上增加截止时间和定时器。
3. `valueCtx`：在父 context 基础上增加一组 key-value。

再往上看，所有能力最终都落回 `Context` 接口的四个方法：`Deadline`、`Done`、`Err`、`Value`。
