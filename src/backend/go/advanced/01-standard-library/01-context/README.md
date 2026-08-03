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

`context` 是 Go 里用来在调用链之间传递取消信号、超时时间和请求级数据的标准库。它最常见的场景是：一个请求进来后，后面可能会调用数据库、RPC、HTTP 接口或启动 goroutine；如果请求超时或客户端断开，就应该让后续操作尽快停止。

## 基础知识

先把 `context` 理解成一个“请求生命周期控制器”：它本身不负责执行业务逻辑，而是负责告诉后面的函数“这个任务还能不能继续做”。

一个 context 通常会携带三类信息：

1. 取消信号：上游主动取消任务时，下游可以收到通知。
2. 超时或截止时间：任务超过指定时间后自动取消。
3. 请求级数据：例如 trace id、用户 id 等少量跨函数传递的数据。

## 为什么需要 context

假设一个 HTTP 请求会查询数据库。如果用户已经取消请求，数据库查询还继续占用资源，就会造成浪费。`context` 可以把“这个请求已经不需要继续了”的信号传下去。

常见用途：

1. 控制超时。
2. 主动取消 goroutine。
3. 在请求链路中传递少量请求级数据。

## 常用创建方式

`context.Background()` 通常作为根 context 使用，适合 main 函数、初始化流程和测试代码。

```go
ctx := context.Background()
```

`context.WithCancel` 可以手动取消：

```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()
```

`context.WithTimeout` 可以设置超时时间：

```go
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()
```

## 具体 Demo：超时取消任务

下面这个小例子模拟一个持续运行的任务。我们给它设置 2 秒超时，超过时间后，`context` 会自动发出取消信号，任务收到信号后退出。

`ctx.Done()` 会返回一个 channel。当 context 被取消或超时时，这个 channel 会被关闭。`ctx.Err()` 可以告诉我们取消原因，比如 `context canceled` 或 `context deadline exceeded`。

```go
func worker(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			fmt.Println("任务取消:", ctx.Err())
			return
		default:
			fmt.Println("继续处理任务")
			time.Sleep(500 * time.Millisecond)
		}
	}
}
```

完整代码：

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func worker(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			fmt.Println("任务取消:", ctx.Err())
			return
		default:
			fmt.Println("继续处理任务")
			time.Sleep(500 * time.Millisecond)
		}
	}
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	worker(ctx)
}
```

可能输出：

```text
继续处理任务
继续处理任务
继续处理任务
继续处理任务
任务取消: context deadline exceeded
```

这个 demo 的关键点是：`main` 函数只负责设置超时时间，真正干活的 `worker` 通过 `ctx.Done()` 感知取消。这样调用方和执行方就解耦了，后续换成数据库查询、HTTP 请求或 goroutine 任务，思路都是一样的。

## 使用原则

1. 函数参数里通常把 `ctx context.Context` 放在第一个参数。
2. 不要把 `context.Context` 存到结构体里，优先通过参数传递。
3. `WithCancel`、`WithTimeout`、`WithDeadline` 返回的 `cancel` 要及时调用。
4. `WithValue` 只适合传递请求级数据，不要拿它替代普通函数参数。

## 小结

`context` 的核心不是“传值”，而是“控制调用链生命周期”。写服务端代码时，只要涉及请求超时、取消、数据库访问、RPC 调用或 goroutine 管理，就应该优先考虑把 `context` 贯穿进去。
