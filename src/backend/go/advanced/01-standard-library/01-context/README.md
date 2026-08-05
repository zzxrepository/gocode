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

学习 Go 后端基本绕不开 `context`。

你会在很多函数里看到它：

```go
func Query(ctx context.Context, id int64) error
```

`context` 中文常译作“上下文”。在 Go 里，可以先把它理解成**一次任务的上下文信息**：它由代码显式传递，负责携带这次任务的**取消信号、超时时间、截止时间和少量请求级数据**。

`context` 不是真正干活的人。它更像一张跟着调用链往下传的通知单，告诉后面的代码几件事：

1. **这件事最晚什么时候结束**。
2. **这件事是不是已经不用继续做了**。
3. **这次请求上有没有一些需要一起传下去的数据**，比如 `traceID`。

## 可能引起 P0 级事故的 context

为什么一个看起来只是“传参数”的包，会变成 Go 后端里的常规写法？

先看一个很常见的服务端场景。一次 HTTP 请求进来以后，服务端可能会启动好几个 goroutine：`HTTP 请求 -> goroutine A：查数据库 -> goroutine B：调库存服务 -> goroutine C：调推荐服务`。

这些 goroutine 都在为同一个请求工作。它们需要共享一些请求级信息，比如登录态、`traceID`、请求最大处理时间。同时，它们也应该共享同一个退出信号。

如果用户关掉页面，或者调用方已经超时不等了，这些 goroutine 的工作结果就没人要了。这个时候它们应该尽快退出，让系统释放连接、内存、定时器等资源。

问题是，Go 不能直接从外面强杀一个 goroutine。更常见的做法是：goroutine 自己在合适的位置监听一个信号，发现任务取消了，就主动返回。

没有 `context` 时，也可以自己用 `channel + select` 做这件事。但当一个请求衍生出很多 goroutine，而且还要传超时时间、取消信号、请求级数据时，手写这些控制逻辑很快就会变乱。

更严重一点，假设业务高峰期下游服务突然变慢，而当前服务没有设置合理超时，大量 goroutine 就会卡在等待下游返回的地方。goroutine 数量持续上涨，内存占用跟着上涨，请求越积越多，最后服务整体不可用。这种故障继续向上游扩散，就可能变成一次 P0 级事故。

`context` 要解决的就是这类问题：**在一组相关 goroutine 之间，传递取消信号、超时时间、截止时间和少量请求级数据**。

Go 1.7 把 `context` 放进标准库以后，很多标准库和社区库都开始把 `ctx context.Context` 作为参数，比如 `net/http`、`database/sql` 以及各种 RPC、数据库客户端。现在它几乎已经是 Go 里做并发控制和超时控制的标准写法。

下面基于 Go 1.26.5 版本中的 `context.go` 来介绍 `context` 包。

## 先看 Context 接口

源码里，`Context` 是一个接口：

```go
type Context interface {
	// 返回截止时间；如果没有设置截止时间，ok 为 false。
	Deadline() (deadline time.Time, ok bool)

	// 返回一个 channel。
	// context 被取消或超时时，这个 channel 会被关闭。
	Done() <-chan struct{}

	// 返回取消原因。
	// 如果 Done 还没有关闭，Err 返回 nil。
	Err() error

	// 根据 key 查找调用链上的值。
	Value(key any) any
}
```

这四个方法就是整个 `context` 包的骨架。

| 方法 | 可以怎么理解 |
| --- | --- |
| `Deadline()` | 这件事最晚什么时候结束 |
| `Done()` | 返回一个 channel，取消或超时时这个 channel 会关闭 |
| `Err()` | 返回取消原因 |
| `Value(key)` | 根据 key 查找请求级数据 |

最常用的是 `Done()`。

很多代码会这么写：

```go
<-ctx.Done()
```

这行代码最好拆开看：

```go
done := ctx.Done() // 第一步：调用 Done() 方法，拿到一个 channel

<-done             // 第二步：从 channel 接收，可能会阻塞
```

`ctx.Done()` 只是一个普通方法调用，它返回一个 channel。

真正等待取消信号的是 `<-done`。如果这个 channel 还没有关闭，`<-done` 就会阻塞；如果 context 被取消或者超时，这个 channel 会被关闭，等待它的 goroutine 就会醒过来。

所以业务代码里常见的是：

```go
select {
case <-ctx.Done():
	return ctx.Err()
default:
	// 继续执行
}
```

这一句也可以在脑子里拆成两步：

```go
done := ctx.Done() // 调方法，拿 channel

<-done             // 读 channel，等取消信号
```

真实代码里一般直接写 `case <-ctx.Done():` 就行，拆开只是为了看清楚它到底做了什么。

`Err()` 用来解释为什么停下来：

```go
context.Canceled
context.DeadlineExceeded
```

前者一般表示手动取消，后者表示超时。

还有一个细节很重要：`Context` 接口里没有 `Cancel()` 方法。也就是说，下游函数拿到 `ctx` 后，只能监听取消，不能取消父任务。谁创建可取消的 context，谁拿到 cancel 函数。

## 先认识几种 context 具体类型

读源码前，先把几个具体类型认一下。

Go 里没有 Java 那种 class object 体系，所以这篇文章会尽量少说“对象”。更准确的说法是：

```text
backgroundCtx 是一个结构体类型
backgroundCtx{} 是一个结构体值
&cancelCtx{} 是一个指向 cancelCtx 结构体值的指针
Context 是一个接口类型
```

`context` 不是一个大结构体，而是一层一层包出来的。

常见具体类型有这些：

| 类型 | 从哪里来 | 作用 |
| --- | --- | --- |
| `backgroundCtx` | `context.Background()` | 根 context，空的，不会取消、没有超时、没有值 |
| `todoCtx` | `context.TODO()` | 临时占位用的空 context |
| `cancelCtx` | `context.WithCancel(parent)` | 在父 context 外面包一层，增加取消能力 |
| `timerCtx` | `context.WithDeadline` / `context.WithTimeout` | 在 `cancelCtx` 基础上加 deadline 和 timer |
| `valueCtx` | `context.WithValue(parent, key, val)` | 在父 context 外面包一层 key-value |

比如：

```go
ctx := context.Background()
ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
defer cancel()

ctx = context.WithValue(ctx, traceIDKey{}, "trace-001")
```

最后的结构大概是：`valueCtx(traceID) -> timerCtx(2s) -> backgroundCtx`

这几行代码不是在原来的 `ctx` 上改字段，而是每调用一次 `WithXxx`，就创建一个新的 context 具体值，把旧的 context 包进去。

变量 `ctx` 最后指向最外层的 `valueCtx`。`valueCtx` 里面包着 `timerCtx`，`timerCtx` 再包着 `backgroundCtx`。

后面看源码时，一直带着这个图，会轻松很多。

再用一张表把“函数”和“具体类型”对上：

| 函数 | 返回类型 | 运行时实际装的具体值 |
| --- | --- | --- |
| `Background()` | `Context` 接口 | `backgroundCtx{}` 结构体值 |
| `TODO()` | `Context` 接口 | `todoCtx{}` 结构体值 |
| `WithCancel(parent)` | `Context` 接口和 `CancelFunc` | `*cancelCtx` 指针值 |
| `WithDeadline(parent, d)` | `Context` 接口和 `CancelFunc` | 通常是 `*timerCtx` 指针值 |
| `WithTimeout(parent, timeout)` | `Context` 接口和 `CancelFunc` | 本质来自 `WithDeadline`，通常是 `*timerCtx` 指针值 |
| `WithValue(parent, key, val)` | `Context` 接口 | `*valueCtx` 指针值 |

## Background 和 TODO

我们经常这样写：

```go
ctx := context.Background()
```

先看源码：

```go
type emptyCtx struct{}

func (emptyCtx) Deadline() (deadline time.Time, ok bool) {
	// 直接返回 time.Time 零值和 false。
	// 表示没有 deadline。
	return
}

func (emptyCtx) Done() <-chan struct{} {
	// 返回 nil，表示这个 context 永远不会被取消。
	return nil
}

func (emptyCtx) Err() error {
	// 没有取消，自然也没有错误。
	return nil
}

func (emptyCtx) Value(key any) any {
	// 空 context 不保存任何值。
	return nil
}

// backgroundCtx 嵌入 emptyCtx，因此拥有 emptyCtx 的四个方法。
type backgroundCtx struct{ emptyCtx }

func (backgroundCtx) String() string {
	return "context.Background"
}

// todoCtx 也嵌入 emptyCtx，能力和 backgroundCtx 基本一样。
type todoCtx struct{ emptyCtx }

func (todoCtx) String() string {
	return "context.TODO"
}

func Background() Context {
	// 返回的是 Context 接口值。
	// 这个接口值的动态类型是 backgroundCtx，
	// 动态值是 backgroundCtx{} 这个结构体值。
	return backgroundCtx{}
}

func TODO() Context {
	// 返回的是 Context 接口值。
	// 这个接口值的动态类型是 todoCtx，
	// 动态值是 todoCtx{} 这个结构体值。
	return todoCtx{}
}
```

`emptyCtx` 实现了 `Context` 接口的四个方法，所以它本身就是一个空 context。

它的行为也很空：

```text
Deadline() 没有截止时间
Done()     返回 nil
Err()      返回 nil
Value()    返回 nil
```

`backgroundCtx` 里面嵌入了 `emptyCtx`：

```go
type backgroundCtx struct{ emptyCtx }
```

如果你学过 Java，第一反应可能会把它看成继承。这里最好先忍一下：**在 Go 里，这个叫结构体嵌入，不叫继承**。嵌入以后，`emptyCtx` 的方法会提升到 `backgroundCtx` 上，所以 `backgroundCtx` 也实现了 `Context` 接口。

因此：

```go
func Background() Context {
	return backgroundCtx{}
}
```

准确理解是：

```text
Background() 的返回类型是 Context 接口；
return backgroundCtx{} 返回的是一个 backgroundCtx 结构体值；
这个结构体值会被装进 Context 接口值里；
这个接口值的动态类型是 backgroundCtx；
这个接口值的动态值是 backgroundCtx{}；
backgroundCtx 通过嵌入 emptyCtx，拥有了 emptyCtx 的方法；
所以 backgroundCtx 实现了 Context 接口。
```

平时口语里说“接口值里装的是 `backgroundCtx{}`”也可以，但更严谨一点应该说：接口值里保存了一个动态类型和一个动态值，这里的动态类型是 `backgroundCtx`，动态值是 `backgroundCtx{}` 这个结构体值。

`TODO()` 和 `Background()` 能力差不多，区别主要是语义：

```text
Background：我明确要从一个根 context 开始
TODO：我现在还不知道该传什么 context，先占个位
```

还有一个小坑：因为 `Background()` 的 `Done()` 返回 `nil`，所以这样写会永远阻塞：

```go
ctx := context.Background()

done := ctx.Done() // done 是 nil
<-done             // 永远阻塞
```

但在 `select` 里，nil channel 对应的分支永远不会被选中：

```go
select {
case <-ctx.Done():
	// Background 不会走到这里
default:
	// 会走这里
}
```

`Background()` 自己不会取消。真正的取消能力来自后面的 `WithCancel`、`WithDeadline`、`WithTimeout`。

## WithCancel

`WithCancel` 用来在父 context 外面包一层可取消的 context：

```go
ctx, cancel := context.WithCancel(parent)
defer cancel()
```

源码入口是：

```go
func WithCancel(parent Context) (ctx Context, cancel CancelFunc) {
	// 创建一个 *cancelCtx 指针值，并把它挂到 parent 下面。
	c := withCancel(parent)

	// 返回新的 ctx，以及一个取消函数。
	// 调用 cancel() 时，会把错误设置为 context.Canceled。
	return c, func() { c.cancel(true, Canceled, nil) }
}

func withCancel(parent Context) *cancelCtx {
	if parent == nil {
		panic("cannot create context from nil parent")
	}

	// &cancelCtx{} 会先创建一个 cancelCtx 结构体值，
	// 然后返回指向这个结构体值的指针。
	// 所以 c 的类型是 *cancelCtx。
	c := &cancelCtx{}

	// 建立父子取消关系：parent 取消时，c 也要取消。
	c.propagateCancel(parent, c)
	return c
}
```

这里真正创建的是一个 `cancelCtx` 结构体值，并拿到它的指针：

```go
c := &cancelCtx{}
```

这行代码可以拆开理解：

```text
cancelCtx{}   创建一个 cancelCtx 结构体值
&cancelCtx{}  取这个结构体值的地址，得到 *cancelCtx 指针值
c             保存这个 *cancelCtx 指针值
```

所以更严谨地说，`WithCancel` 最后返回的 `ctx` 是一个 `Context` 接口值，这个接口值里装的是 `*cancelCtx` 指针值。`*cancelCtx` 这个类型实现了 `Context` 接口，所以它可以被当成 `context.Context` 返回。

`cancelCtx` 的结构体定义是：

```go
type cancelCtx struct {
	// 嵌入父 context。
	// Deadline、Value 等能力可以继续交给父 context 处理。
	Context

	mu sync.Mutex // 保护下面这些字段

	// 保存取消信号 channel。
	// 第一次调用 Done() 时才创建；第一次 cancel 时关闭。
	done atomic.Value

	// 保存子 context。
	// 父 context 取消时，会遍历 children，把子 context 也取消。
	children map[canceler]struct{}

	// 保存取消原因，比如 context.Canceled。
	err atomic.Value

	// 保存更具体的取消原因，给 Cause(ctx) 使用。
	cause error
}
```

几个字段要看懂：

| 字段 | 作用 |
| --- | --- |
| `Context` | 嵌入父 context，所以 `cancelCtx` 包住了 parent |
| `mu` | 保护并发访问 |
| `done` | 保存取消信号 channel，第一次调用 `Done()` 时才创建 |
| `children` | 保存子 context，父 context 取消时会往下传 |
| `err` | 保存取消原因，比如 `context.Canceled` |
| `cause` | 更具体的取消原因，给 `Cause(ctx)` 用 |

`Done()` 的源码是：

```go
func (c *cancelCtx) Done() <-chan struct{} {
	// 先尝试直接读已有的 done channel。
	d := c.done.Load()
	if d != nil {
		return d.(chan struct{})
	}

	// 还没有创建 done channel，就加锁创建。
	c.mu.Lock()
	defer c.mu.Unlock()

	// 加锁后再检查一次，避免其他 goroutine 已经创建过。
	d = c.done.Load()
	if d == nil {
		// 第一次调用 Done() 时才真正创建 channel。
		d = make(chan struct{})
		c.done.Store(d)
	}
	return d.(chan struct{})
}
```

这段说明一件事：`done` 是懒加载的。

也就是说，创建 `cancelCtx` 时并不会立刻创建 channel。只有你第一次调用：

```go
done := ctx.Done()
```

它才会真的 `make(chan struct{})`。

再强调一次：

```go
done := ctx.Done() // 拿到 channel，不会阻塞
<-done             // 从 channel 接收，可能阻塞
```

`Err()` 的源码是：

```go
func (c *cancelCtx) Err() error {
	// An atomic load is ~5x faster than a mutex, which can matter in tight loops.
	if err := c.err.Load(); err != nil {
		// Ensure the done channel has been closed before returning a non-nil error.
		// 如果已经有 err，确保 done channel 已经关闭。
		<-c.Done()
		return err.(error)
	}

	// 还没有取消。
	return nil
}
```

如果还没有取消，`Err()` 返回 `nil`。如果已经取消，返回保存的错误。

真正取消发生在 `cancel` 方法里：

```go
func (c *cancelCtx) cancel(removeFromParent bool, err, cause error) {
	if err == nil {
		panic("context: internal error: missing cancel error")
	}
	if cause == nil {
		// 没有更具体的 cause 时，就用 err 作为 cause。
		cause = err
	}

	c.mu.Lock()
	if c.err.Load() != nil {
		c.mu.Unlock()
		return // already canceled
	}

	// 记录取消原因。
	c.err.Store(err)
	c.cause = cause

	// 关闭 done channel。
	d, _ := c.done.Load().(chan struct{})
	if d == nil {
		// 如果 Done() 从来没被调用过，就直接保存一个已关闭的 channel。
		c.done.Store(closedchan)
	} else {
		close(d)
	}

	// 继续取消所有子 context。
	for child := range c.children {
		// NOTE: acquiring the child's lock while holding parent's lock.
		child.cancel(false, err, cause)
	}

	// 取消后不再需要保存 children。
	c.children = nil
	c.mu.Unlock()

	if removeFromParent {
		// 从父 context 的 children 里移除自己，释放引用。
		removeChild(c.Context, c)
	}
}
```

这段代码做了几件事：

```text
1. 如果已经取消过，直接返回
2. 保存 err 和 cause
3. 关闭 done channel
4. 遍历 children，把子 context 也取消
5. 清空 children
6. 必要时把自己从父 context 的 children 里移除
```

重点是第三步：关闭 `done` channel。

`context` 不是给每个 goroutine 发一条消息，而是关闭同一个 channel。所有在等 `<-ctx.Done()` 的地方，都会因为 channel 关闭而醒过来。

### 取消是怎么向下传的

`withCancel` 里有一句：

```go
c.propagateCancel(parent, c)
```

这句负责把子 context 和父 context 建立关系。

源码是：

```go
func (c *cancelCtx) propagateCancel(parent Context, child canceler) {
	// 先记住父 context。
	c.Context = parent

	// 取父 context 的 Done channel。
	done := parent.Done()
	if done == nil {
		return // parent is never canceled
	}

	select {
	case <-done:
		// parent is already canceled
		// 如果父 context 已经取消，子 context 立刻取消。
		child.cancel(false, parent.Err(), Cause(parent))
		return
	default:
	}

	if p, ok := parentCancelCtx(parent); ok {
		// parent is a *cancelCtx, or derives from one.
		p.mu.Lock()
		if err := p.err.Load(); err != nil {
			// parent has already been canceled
			child.cancel(false, err.(error), p.cause)
		} else {
			if p.children == nil {
				p.children = make(map[canceler]struct{})
			}
			// 父 context 还没取消，把 child 挂到父 context 下面。
			p.children[child] = struct{}{}
		}
		p.mu.Unlock()
		return
	}

	if a, ok := parent.(afterFuncer); ok {
		// parent implements an AfterFunc method.
		c.mu.Lock()
		stop := a.AfterFunc(func() {
			child.cancel(false, parent.Err(), Cause(parent))
		})
		c.Context = stopCtx{
			Context: parent,
			stop:    stop,
		}
		c.mu.Unlock()
		return
	}

	goroutines.Add(1)
	go func() {
		select {
		case <-parent.Done():
			// 兜底方案：启动 goroutine 监听父 context。
			child.cancel(false, parent.Err(), Cause(parent))
		case <-child.Done():
		}
	}()
}
```

读这段不用每个分支都背下来，先抓主线：

```text
1. 先把 parent 保存到 c.Context
2. 如果 parent.Done() 是 nil，说明父 context 永远不会取消，直接返回
3. 如果 parent 已经取消，child 立刻取消
4. 如果 parent 是 cancelCtx，就把 child 放进 parent.children
5. 如果是特殊 context，就用 AfterFunc 或 goroutine 监听父级取消
```

平时最常见的是第 2 种和第 4 种。

比如：

```go
root := context.Background()
ctx1, cancel1 := context.WithCancel(root)
ctx2, cancel2 := context.WithCancel(ctx1)
```

结构是：

```text
backgroundCtx
  -> cancelCtx(ctx1)
    -> cancelCtx(ctx2)
```

如果调用：

```go
cancel1()
```

`ctx1` 会取消，`ctx2` 也会跟着取消。

如果调用：

```go
cancel2()
```

只取消 `ctx2`，不会影响 `ctx1`。

所以取消方向很好记：

```text
父取消，子跟着取消。
子取消，父不受影响。
```

## WithDeadline 和 WithTimeout

`WithTimeout` 是最常用的超时写法：

```go
ctx, cancel := context.WithTimeout(parent, 2*time.Second)
defer cancel()
```

源码里它很薄：

```go
func WithTimeout(parent Context, timeout time.Duration) (Context, CancelFunc) {
	// timeout 是一段持续时间，把它转换成具体截止时间。
	return WithDeadline(parent, time.Now().Add(timeout))
}
```

所以 `WithTimeout(parent, 2*time.Second)` 本质上就是：

```go
WithDeadline(parent, time.Now().Add(2*time.Second))
```

`WithDeadline` 的入口是：

```go
func WithDeadline(parent Context, d time.Time) (Context, CancelFunc) {
	// 普通 WithDeadline 不设置额外 cause。
	return WithDeadlineCause(parent, d, nil)
}
```

真正逻辑在 `WithDeadlineCause`：

```go
func WithDeadlineCause(parent Context, d time.Time, cause error) (Context, CancelFunc) {
	if parent == nil {
		panic("cannot create context from nil parent")
	}

	if cur, ok := parent.Deadline(); ok && cur.Before(d) {
		// The current deadline is already sooner than the new one.
		// 父 context 更早超时，没必要再创建一个更晚的 timer。
		return WithCancel(parent)
	}

	// 创建 timerCtx，记录 deadline。
	c := &timerCtx{
		deadline: d,
	}

	// 建立父子取消关系。
	c.cancelCtx.propagateCancel(parent, c)

	dur := time.Until(d)
	if dur <= 0 {
		// deadline 已经过了，立刻取消。
		c.cancel(true, DeadlineExceeded, cause) // deadline has already passed
		return c, func() { c.cancel(false, Canceled, nil) }
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.err.Load() == nil {
		// 到达 deadline 时自动取消。
		c.timer = time.AfterFunc(dur, func() {
			c.cancel(true, DeadlineExceeded, cause)
		})
	}

	// 手动调用返回的 cancel 时，按普通取消处理。
	return c, func() { c.cancel(true, Canceled, nil) }
}
```

这里涉及到 `timerCtx`：

```go
type timerCtx struct {
	// 嵌入 cancelCtx，所以 timerCtx 本身也能取消。
	cancelCtx

	// 到点后触发 cancel。
	timer *time.Timer // Under cancelCtx.mu.

	// 截止时间。
	deadline time.Time
}

func (c *timerCtx) Deadline() (deadline time.Time, ok bool) {
	// timerCtx 有明确的截止时间。
	return c.deadline, true
}

func (c *timerCtx) cancel(removeFromParent bool, err, cause error) {
	// 先执行 cancelCtx 的取消逻辑：关 done、取消 children。
	c.cancelCtx.cancel(false, err, cause)
	if removeFromParent {
		// Remove this timerCtx from its parent cancelCtx's children.
		removeChild(c.cancelCtx.Context, c)
	}

	// 停掉自己的 timer，释放资源。
	c.mu.Lock()
	if c.timer != nil {
		c.timer.Stop()
		c.timer = nil
	}
	c.mu.Unlock()
}
```

`timerCtx` 嵌入了 `cancelCtx`，所以它天然有取消能力。它自己多了两个东西：

```text
deadline：截止时间
timer：定时器
```

创建 `timerCtx` 后，源码会启动一个定时器：

```go
c.timer = time.AfterFunc(dur, func() {
	c.cancel(true, DeadlineExceeded, cause)
})
```

时间一到，它就调用 `cancel`，取消原因是：

```go
context.DeadlineExceeded
```

所以这段代码：

```go
ctx, cancel := context.WithTimeout(context.Background(), time.Second)
defer cancel()

done := ctx.Done()
<-done

fmt.Println(ctx.Err())
```

超时后会输出：

```text
context deadline exceeded
```

有一个源码细节值得留意：

```go
if cur, ok := parent.Deadline(); ok && cur.Before(d) {
	return WithCancel(parent)
}
```

如果父 context 的 deadline 比你新设置的 deadline 更早，源码不会再创建一个更晚的 timer。

比如父 context 1 秒后超时，子 context 设置 5 秒后超时。子 context 根本等不到 5 秒，因为 1 秒后父 context 就会把它取消。所以这里直接退化成 `WithCancel(parent)`。

另外，`WithTimeout` 后面要写 `defer cancel()`。即使没有手动取消，超时也会自动取消，但如果任务提前结束，调用 `cancel()` 可以及时停止 timer，并且把自己从父 context 的 children 里移走。

## WithValue

`WithValue` 用来给调用链挂一组请求级数据：

```go
ctx = context.WithValue(ctx, traceIDKey{}, "trace-001")
```

源码是：

```go
func WithValue(parent Context, key, val any) Context {
	if parent == nil {
		panic("cannot create context from nil parent")
	}
	if key == nil {
		panic("nil key")
	}
	if !reflectlite.TypeOf(key).Comparable() {
		// key 必须可比较，因为查找时会用 == 比较。
		panic("key is not comparable")
	}

	// 返回一个新的 valueCtx，把 parent 包起来。
	return &valueCtx{parent, key, val}
}
```

它返回的是 `valueCtx`：

```go
type valueCtx struct {
	// 嵌入父 context。
	// Done、Deadline、Err 等方法都可以继续交给父 context。
	Context

	// 当前这一层保存的一组 key-value。
	key, val any
}
```

`valueCtx` 也嵌入了父 context，只是自己多存了一组 `key` 和 `val`。

查值源码是：

```go
func (c *valueCtx) Value(key any) any {
	if c.key == key {
		// 当前层命中，直接返回。
		return c.val
	}

	// 当前层没命中，就去父 context 继续找。
	return value(c.Context, key)
}
```

如果当前这一层 key 匹配，就返回当前层的值；如果不匹配，就去父 context 继续找。

`value` 函数会沿着 context 链一直往上走：

```go
func value(c Context, key any) any {
	for {
		switch ctx := c.(type) {
		case *valueCtx:
			if key == ctx.key {
				// 找到最近的一层 valueCtx。
				return ctx.val
			}
			// 当前层没找到，继续往父 context 找。
			c = ctx.Context
		case *cancelCtx:
			if key == &cancelCtxKey {
				return c
			}
			c = ctx.Context
		case withoutCancelCtx:
			if key == &cancelCtxKey {
				// This implements Cause(ctx) == nil
				// when ctx is created using WithoutCancel.
				return nil
			}
			c = ctx.c
		case *timerCtx:
			if key == &cancelCtxKey {
				return &ctx.cancelCtx
			}
			c = ctx.Context
		case backgroundCtx, todoCtx:
			// 到根节点了，还没找到，返回 nil。
			return nil
		default:
			return c.Value(key)
		}
	}
}
```

比如：

```go
ctx := context.Background()
ctx = context.WithValue(ctx, key1{}, "v1")
ctx = context.WithValue(ctx, key2{}, "v2")
```

结构是：

```text
valueCtx(key2=v2)
  -> valueCtx(key1=v1)
    -> backgroundCtx
```

调用：

```go
ctx.Value(key1{})
```

查找过程是：

```text
先看 valueCtx(key2=v2)，key 不匹配
再看 valueCtx(key1=v1)，key 匹配，返回 v1
```

所以 `Value` 不是从一个大 map 里查，而是沿着链一层层找。

这带来几个结论：

```text
子 context 能读到父 context 的值
父 context 读不到子 context 的值
相同 key 时，离当前 ctx 最近的那层优先
链太长时，Value 查找也会一层层走
```

官方文档也提醒：`WithValue` 只适合传请求级数据，不要拿它代替普通函数参数。

推荐这样写 key：

```go
type traceIDKey struct{}
```

不推荐这样：

```go
context.WithValue(ctx, "traceID", traceID)
```

字符串 key 太容易撞。两个包都用了 `"userID"`，最后查出来是谁的值就很难说清楚。

更完整的写法是给自己的包提供访问函数：

```go
type traceIDKey struct{}

func WithTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, traceIDKey{}, traceID)
}

func TraceIDFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(traceIDKey{}).(string)
	return v, ok
}
```

## 一个完整 demo

下面这个例子把 `Background`、`WithTimeout`、`WithValue`、`Done`、`Err` 都串起来了。

```go
package main

import (
	"context"
	"fmt"
	"time"
)

type traceIDKey struct{}

func WithTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, traceIDKey{}, traceID)
}

func TraceIDFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(traceIDKey{}).(string)
	return v, ok
}

func main() {
	ctx := context.Background()

	ctx, cancel := context.WithTimeout(ctx, 250*time.Millisecond)
	defer cancel()

	ctx = WithTraceID(ctx, "trace-001")

	if err := queryDB(ctx); err != nil {
		fmt.Println("query failed:", err)
		return
	}

	fmt.Println("query success")
}

func queryDB(ctx context.Context) error {
	if traceID, ok := TraceIDFromContext(ctx); ok {
		fmt.Println("traceID:", traceID)
	}

	for i := 1; i <= 5; i++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(100 * time.Millisecond):
			fmt.Println("query step:", i)
		}
	}

	return nil
}
```

大概率输出类似这样：

```text
traceID: trace-001
query step: 1
query step: 2
query failed: context deadline exceeded
```

这段代码背后的 context 结构是：

```text
valueCtx(traceID=trace-001)
  -> timerCtx(250ms)
    -> backgroundCtx
```

执行到：

```go
case <-ctx.Done():
```

这句可以拆开理解：

```go
done := ctx.Done() // 调方法，拿 channel

<-done             // 读 channel，等取消信号
```

这里的 `ctx` 是最外层的 `valueCtx`。`valueCtx` 自己没有实现 `Done()`，所以它会使用嵌入的父 context 的 `Done()`，继续往里找到 `timerCtx`。`timerCtx` 嵌入了 `cancelCtx`，最终拿到的是 `cancelCtx` 里的 done channel。

`ctx.Done()` 这一步只是拿 channel。`<-done` 这一步才是等待取消信号。在 demo 里没有真的写一个 `done` 变量，只是直接把这两步合在了 `case <-ctx.Done():` 里。

250ms 到了以后，`timerCtx` 的 timer 触发：

```text
timer 到点
  -> 调用 cancel
  -> 关闭 done channel
  -> case <-ctx.Done() 被唤醒
  -> queryDB 返回 ctx.Err()
```

这就是 `context` 控制超时的完整链路。

## 平时怎么用

官方文档里有几条习惯很值得照着写：

1. `Context` 通常作为函数第一个参数，名字叫 `ctx`。
2. 不要把 `Context` 长期存在结构体里，应该显式传给需要它的函数。
3. 不要传 `nil` context，不确定传什么时用 `context.TODO()`。
4. `WithCancel`、`WithDeadline`、`WithTimeout` 返回的 `cancel` 要调用。
5. `WithValue` 只放请求级数据，不要当成万能参数包。
6. 同一个 `Context` 可以被多个 goroutine 同时使用。
7. 取消不是强杀 goroutine，只是发信号；goroutine 要自己监听 `ctx.Done()` 并返回。

## 最后总结

`context` 的源码主线其实很清楚：

```text
Context 是接口，定义 Deadline、Done、Err、Value 四个方法。

Background 和 TODO 返回空 context。

WithCancel 创建 cancelCtx，增加取消能力。

WithDeadline 和 WithTimeout 创建 timerCtx，增加超时能力。

WithValue 创建 valueCtx，增加一组 key-value。
```

读源码时把两条线分开：

```text
取消看树：
父 context 取消，子 context 跟着取消。

取值看链：
从当前 context 往父 context 一层层找。
```

最后再记住 `Done()` 的两步：

```go
done := ctx.Done() // 调方法，拿 channel

<-done             // 读 channel，等取消信号
```

`ctx.Done()` 本身不取消任何东西。  
`cancel()` 才是发起取消。  
`<-ctx.Done()` 是等待那个取消信号。

## 参考资料

- [context package - pkg.go.dev](https://pkg.go.dev/context)
- [Go Concurrency Patterns: Context](https://go.dev/blog/context)
- [Contexts and structs](https://go.dev/blog/context-and-structs)
- [Go Concurrency Patterns: Pipelines and cancellation](https://go.dev/blog/pipelines)
