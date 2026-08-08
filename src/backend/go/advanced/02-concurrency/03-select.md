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

## `select` 的完整执行规则

`select` 的每个 `case` 必须是 channel 的发送或接收。它在进入时并非按顺序“逐个等待”，而是把所有可选通信作为一个等待集合处理。

| 进入 `select` 时的状态 | 行为 |
| --- | --- |
| 只有一个通信 case 就绪 | 执行该 case |
| 有多个通信 case 就绪 | 在就绪 case 中作均匀伪随机选择 |
| 没有 case 就绪，且存在 `default` | 立即执行 `default` |
| 没有 case 就绪，也没有 `default` | 当前 goroutine 阻塞，直到某个通信可进行 |
| 所有通信 channel 都为 `nil`，没有 `default` | 永久阻塞 |
| 空 `select {}` | 永久阻塞 |

这里的“就绪”取决于通信能否立刻完成：读取有值的缓冲 channel、向未满缓冲 channel 发送、与无缓冲 channel 的另一端配对，以及从已关闭 channel 接收都可能就绪。不要把 case 的书写顺序当作优先级，也不要假设一次选择后下次仍会选择同一个 channel。

### 求值时机：未选中，不等于不会执行表达式

进入 `select` 时，每个 case 的 channel 操作数，以及发送 case 的右值，会按源码顺序求值一次；只有接收赋值左侧在对应 case 真正选中后才计算。副作用、昂贵计算或可能 panic 的调用不应放在发送右侧。

```go
package main

import (
	"context"
	"fmt"
)

func makePayload() string {
	fmt.Println("makePayload 已求值")
	return "payload"
}

func main() {

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // 使 ctx.Done() 在进入 select 前就可接收。
	out := make(chan string)

	select {
	case out <- makePayload():
		fmt.Println("发送成功")
	case <-ctx.Done():
		// 即使这一分支被选中，makePayload 也已经执行过。
		fmt.Println("已取消")
	}
}
```

若构建 payload 很贵，先在外层检查取消，或在 goroutine 内把计算和可取消的发送分开；不要依赖“这个 case 多半不会被选中”来避免工作。

## 一次性超时：`Timer`、`time.After` 与取消范围

`time.After(d)` 返回一个在 d 后可接收的 channel，写起来短，但它只能让当前 `select` 有机会走超时分支。它不会自动叫停已经发出的工作；真正的调用链取消仍应传递 `context`。

对于循环或可能提前结束的流程，显式 `Timer` 更容易控制生命周期。重置 timer 前要正确处理可能已经到达的信号，最简单可靠的做法是只由一个 goroutine 拥有和操作它。

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func waitForResult(ctx context.Context, result <-chan string, limit time.Duration) (string, error) {
	timer := time.NewTimer(limit)
	defer timer.Stop() // 提前收到结果时，释放该定时器不再需要的等待。

	select {
	case value := <-result:
		return value, nil
	case <-timer.C:
		return "", fmt.Errorf("等待结果超过 %s", limit)
	case <-ctx.Done():
		return "", ctx.Err()
	}
}

func main() {

	result := make(chan string, 1)
	go func() {
		// 缓冲为 1：调用方超时返回后，此演示发送者不会卡在发送点。
		result <- "完成"
	}()

	value, err := waitForResult(context.Background(), result, time.Second)
	fmt.Println(value, err)
}
```

缓冲只是避免这个“一次发送”的 goroutine 因无人接收而卡住；若工作本身会调用网络、数据库或无限循环，仍必须让它监听同一个 `ctx.Done()`。

## 周期事件：`Ticker` 必须停止，也不能补回每一次 tick

`time.Ticker` 通过 `C` 周期性提供时间信号，常用于批量刷新、心跳和限速检查。退出前调用 `Stop`，防止定时器资源无意义地继续活动。ticker 的用途是“现在可以做一次周期工作”，不是精确计数器；当消费者来不及处理时，不能依赖每一个理论 tick 都被逐一接收。

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func heartbeat(ctx context.Context, send func() error) error {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err() // 服务关闭时，不再等下一次 tick。
		case now := <-ticker.C:
			// 真实 send 应设置自身的 I/O deadline 或接收 ctx。
			fmt.Println("发送心跳：", now.Format(time.StampMilli))
			if err := send(); err != nil {
				return err
			}
		}
	}
}

func main() {

	ctx, cancel := context.WithTimeout(context.Background(), 1100*time.Millisecond)
	defer cancel()
	_ = heartbeat(ctx, func() error { return nil })
}
```

## 可取消 worker pool：把任务、结果和停机路径配对

worker pool 不只是“开 N 个 goroutine”。可靠的版本需要同时定义：谁停止投递任务、worker 如何在取消时离开、谁确认所有结果发送者都结束后再关闭结果流。下面示例将这些责任拆开。

```go
package main

import (
	"context"
	"fmt"
	"sync"
)

type Result struct {
	Input  int
	Square int
}

func worker(ctx context.Context, jobs <-chan int, results chan<- Result, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		select {
		case <-ctx.Done():
			return // 取消时不再等待新任务。
		case job, ok := <-jobs:
			if !ok {
				return // 任务生产者结束，worker 正常退出。
			}

			result := Result{Input: job, Square: job * job}
			select {
			case results <- result:
				// 结果交给消费者；顺序由 worker 调度决定。
			case <-ctx.Done():
				return // 消费者不再读取时，不被发送永久卡住。
			}
		}
	}
}

func squareAll(parent context.Context, inputs []int, count int) ([]Result, error) {
	if count <= 0 {
		return nil, fmt.Errorf("worker 数必须大于 0")
	}
	ctx, cancel := context.WithCancel(parent)
	defer cancel() // 任意返回路径都通知内部 goroutine 收尾。

	jobs := make(chan int, count)    // 有界等待队列。
	results := make(chan Result, count)

	var workers sync.WaitGroup
	workers.Add(count)
	for i := 0; i < count; i++ {
		go worker(ctx, jobs, results, &workers)
	}

	go func() {
		defer close(jobs) // 唯一任务生产者拥有 jobs 的关闭权。
		for _, input := range inputs {
			select {
			case jobs <- input:
			case <-ctx.Done():
				return
			}
		}
	}()

	go func() {
		workers.Wait()
		// 所有 worker 都已退出，之后不可能再发送 results，关闭才安全。
		close(results)
	}()

	output := make([]Result, 0, len(inputs))
	for result := range results {
		output = append(output, result)
	}
	return output, nil
}

func main() {

	values, err := squareAll(context.Background(), []int{1, 2, 3, 4}, 2)
	if err != nil {
		panic(err)
	}
	fmt.Println(values)
}
```

该例用 `select` 将每一个潜在阻塞点与取消信号并列：生产者发送 `jobs`，worker 接收 `jobs` 和发送 `results`。这比“只在最外层等待超时”多了一条真正可退出的路径。

## `default` 的正确范围：一次尝试，而非循环等待

非阻塞接收适合探测当前是否已有一条缓存消息：

```go
func tryReceive(in <-chan string) (string, bool) {
	select {
	case value := <-in:
		return value, true
	default:
		return "", false // 此刻没有可立刻接收的值。
	}
}
```

若 `in` 已关闭，上面的接收 case 会立即就绪，并返回零值；现实函数需要 comma-ok 形式来区分关闭。更重要的是，`default` 放进无限循环会形成忙等。等待事件时，应删除 `default` 让调度器挂起 goroutine，或将 ticker、退避定时器和明确的丢弃策略纳入设计。

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
