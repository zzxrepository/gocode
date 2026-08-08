---
permalink: /backend/go/advanced/02-concurrency/03-select/
title: 03. select：在多个并发事件之间响应
shortTitle: 03. select
order: 3
category:
  - Go
  - Golang 进阶知识
  - 并发编程
tag:
  - Go
  - select
  - Channel
  - context
  - 超时
  - 并发编程
---

# 03. select：在多个并发事件之间响应

## 前言

并发程序很少只等一件事：报价可能先返回，客户端可能已经断开，服务可能正在关闭，定时任务可能到期。直接写 `<-resultCh` 只能等待一个固定 channel；`select` 让一个 goroutine 能在多个发送或接收事件之间等待，并对先发生的可处理事件作出响应。

`select` 不是 `switch` 的并发版，也不是轮询语法糖。它最重要的价值是把“收到结果、请求取消、超时、输入流结束”放入同一个等待点，并要求每条路径都能正确收尾。

## 语言规则：什么时候会阻塞，谁会被选中

```go
select {
case result := <-resultCh:
	use(result)
case <-ctx.Done():
	return ctx.Err()
}
```

- 每个 `case` 必须是一次 channel 发送或接收；
- 若至少一个通信可以立即进行，规范会从可执行的 case 中作出**均匀伪随机**选择；不能依赖书写顺序实现优先级；
- 若没有可执行 case 且没有 `default`，当前 goroutine 阻塞；
- 有 `default` 时立刻执行它，不会等待通信；
- 没有任何 case 的 `select {}` 会永久阻塞。

有一个容易被忽略的求值规则：进入 `select` 时，所有 case 中的 channel 操作数，以及发送 case 右侧的值，都会按源码顺序只求值一次；但接收赋值左侧只在该 case 被选中后才求值。不要把带副作用、昂贵或可能 panic 的函数藏在未必被选中的 case 里。

```go
// buildPayload() 会在进入 select 时执行，哪怕 ctx.Done() 最终被选中。
select {
case out <- buildPayload():
	// ...
case <-ctx.Done():
	return
}
```

## 用 `context` 管理结果、超时与取消

`time.After` 能提供一次到期信号，但它只能让当前 goroutine 停止等待，无法自动取消已经发出的 HTTP 请求、SQL 查询或 RPC。服务代码优先从调用方的 `context` 派生更短时限，并把同一个 `ctx` 交给下游。

下面的例子并发向多个供应商询价。每个 goroutine 最多发送一个结果，结果 channel 的容量正好能容纳全部结果：即使主流程因首个错误或超时提前返回，发送方也不会卡在结果发送上。更关键的是，`defer cancel()` 会通知仍在执行的 `Quote` 主动结束；实际 `Quote` 实现必须把 ctx 传给可取消的下游调用。

```go
package main

import (
	"context"
	"fmt"
	"time"
)

type Provider interface {
	Name() string
	Quote(ctx context.Context, sku string) (int, error)
}

type quoteResult struct {
	provider string
	price    int
	err      error
}

// demoProvider 让示例不依赖网络；真实实现应使用 ctx 调用 HTTP 或 RPC 客户端。
type demoProvider struct {
	name  string
	price int
	delay time.Duration
}

func (p demoProvider) Name() string { return p.name }

func (p demoProvider) Quote(ctx context.Context, _ string) (int, error) {
	select {
	case <-time.After(p.delay):
		return p.price, nil
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func collectQuotes(parent context.Context, providers []Provider, sku string) ([]quoteResult, error) {
	ctx, cancel := context.WithTimeout(parent, 300*time.Millisecond)
	defer cancel() // 返回时通知尚未结束的询价任务停止。

	quotes := make(chan quoteResult, len(providers))
	for _, provider := range providers {
		go func(provider Provider) {
			price, err := provider.Quote(ctx, sku)
			// 每个 goroutine 只发送一次，缓冲容量足够，因此提前返回不会遗留阻塞发送者。
			quotes <- quoteResult{provider: provider.Name(), price: price, err: err}
		}(provider)
	}

	results := make([]quoteResult, 0, len(providers))
	for received := 0; received < len(providers); {
		select {
		case result := <-quotes:
			received++
			if result.err != nil {
				return nil, fmt.Errorf("%s 询价失败: %w", result.provider, result.err)
			}
			results = append(results, result)
		case <-ctx.Done():
			return nil, fmt.Errorf("询价未在期限内完成: %w", ctx.Err())
		}
	}
	return results, nil
}

func main() {
	providers := []Provider{
		demoProvider{name: "A", price: 99, delay: 20 * time.Millisecond},
		demoProvider{name: "B", price: 101, delay: 40 * time.Millisecond},
	}
	quotes, err := collectQuotes(context.Background(), providers, "sku-1")
	if err != nil {
		panic(err)
	}
	fmt.Println(quotes) // 返回顺序由完成顺序决定，不应当作供应商优先级。
}
```

这里没有关闭 `quotes`，因为接收方只需要接收一个已知数量的结果，且发送者可能仍在运行；关闭不是垃圾回收要求。若消费者用 `for range` 读取未知数量的结果，才必须由能确认所有发送者结束的协调者关闭 channel。

## `default`：非阻塞尝试，不是空转许可

`default` 让 `select` 在当前没有可通信 case 时立即返回。它适合“可丢弃的旁路工作”，例如指标上报不能阻塞主请求：

```go
select {
case metrics <- event:
	// 指标队列有容量，正常投递。
default:
	// 队列满时允许丢弃；生产环境通常还应对丢弃次数做监控。
}
```

以下代码看起来在“等消息”，实际没有消息时会不停执行 `default`，占满一个 CPU 核心：

```go
// 错误示例：不要这样轮询 channel。
for {
	select {
	case message := <-messages:
		handle(message)
	default:
	}
}
```

若确实需要周期性检查，加入 `time.Ticker` 的 channel 并正常阻塞；更常见的是直接去掉 `default`，让 goroutine 在没有事件时休眠。

## 已关闭与 `nil` channel：动态管理事件集合

已关闭的 channel 接收会立即返回。若事件循环同时监听多个输入，某个 channel 关闭后不处理 `ok`，它会持续成为可选分支，造成零值被反复处理或挤占其他事件。

把已经结束的 channel 设为 `nil` 可以禁用对应 case：nil channel 永远不能收发，`select` 会忽略它。循环条件必须同时反映所有输入是否结束。

```go
func merge(ctx context.Context, updates <-chan string, errs <-chan error) {
	for updates != nil || errs != nil {
		select {
		case update, ok := <-updates:
			if !ok {
				updates = nil // 禁用已关闭分支，避免它持续立即返回。
				continue
			}
			fmt.Println("更新:", update)
		case err, ok := <-errs:
			if !ok {
				errs = nil
				continue
			}
			fmt.Println("错误:", err)
		case <-ctx.Done():
			return // 上游取消时，无需再等待两个输入自然结束。
		}
	}
}
```

`nil` channel 也可以用于按状态临时关闭某个发送分支，但要小心：如果所有 case 都变成 nil 且没有 `default`，该 `select` 会永久阻塞。

## 在循环里真正退出

`break` 默认只跳出最内层的 `select`，不会退出外层 `for`。事件循环要结束时，使用 `return` 或具名标签：

```go
loop:
	for {
		select {
		case message, ok := <-messages:
			if !ok {
				break loop // 明确跳出 for；单独 break 只会跳出 select。
			}
			handle(message)
		case <-ctx.Done():
			break loop
		}
	}
```

## runtime 视角：选择、登记与唤醒

`select` 的“多个 channel 看起来同时等待”并不是忙轮询。以 Go 1.22 runtime 的 `selectgo` 为例，编译器先把 case 组织为内部描述；runtime 会忽略 nil channel，为 case 生成打乱后的检查顺序，并按固定锁顺序锁住涉及的 channel，避免多个 channel 的并发操作形成死锁。

接着它检查是否已有可立即完成的收发：有时直接完成并选择对应 case；没有 `default` 且暂时都不能完成时，当前 goroutine 会作为等待者登记到各 channel 的等待队列，然后被挂起。任何一个通信操作使其可运行后，runtime 会清理它在其他 channel 的等待登记，再由调度器恢复该 goroutine。具体数据结构和算法是实现细节，但这条路径解释了 `select` 为什么能阻塞等待多个事件而不持续消耗 CPU。

规范只承诺多个可执行 case 中的均匀伪随机选择，不承诺业务层面的优先级、公平服务时间或每个 case 都在固定次数内被选中。需要优先级时，应把优先级设计为明确的协议，例如先单独尝试高优先级队列，再进入正常阻塞等待；不要误用 case 的排列顺序。

## 常见错误

### 只让外层超时，却没有取消下游

```go
// 这只能让当前函数停止等待；work 仍可能持续运行。
select {
case value := <-result:
	return value
case <-time.After(time.Second):
	return fallback
}
```

应让 `work` 接收同一个可取消的 `context`，并确保它的网络、数据库或等待操作也监听该 context。

### 依赖 case 顺序

当两个 case 同时就绪，先写的 case 没有优先权。若业务需要“停止信号优先于普通任务”，可以在循环顶部先非阻塞检查停止信号，或改造队列协议；同时仍要接受并发时状态可能在下一瞬间改变。

### 在 select 里忘记发送方的退出

接收方因超时离开后，未缓冲 `resultCh` 的发送者可能永久阻塞。缓冲足够的“一任务一结果” channel、取消信号、继续排空结果三者至少应有一个与任务数量相匹配；实际服务中常同时使用取消和有界缓冲。

## 总结

`select` 是 goroutine 等待多个 channel 事件的控制结构。没有 `default` 时它会高效地阻塞；有多个就绪 case 时不能依赖顺序；已关闭的输入应识别并在必要时设为 `nil`。可靠使用它的关键不在语法，而在完整定义结果、取消、超时和关闭之后每个 goroutine 如何离开。

## 参考资料

- [Go 语言规范：Select 语句](https://go.dev/ref/spec#Select_statements)
- [context 包文档](https://pkg.go.dev/context)
- [Go 内存模型](https://go.dev/ref/mem)
- [Go 1.22 runtime：select.go](https://cs.opensource.google/go/go/+/refs/tags/go1.22.10:src/runtime/select.go)
