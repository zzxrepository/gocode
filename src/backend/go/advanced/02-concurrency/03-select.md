---
permalink: /backend/go/advanced/02-concurrency/03-select/
title: 03. select：在多个并发事件之间作出选择
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

# 03. select：在多个并发事件之间作出选择

## 前言

等待一个 channel 时，程序只关心一件事：“值什么时候到？”真实并发程序通常还要同时关心更多事件：查询结果先返回还是请求超时、任务 channel 是否关闭、调用方是否取消、另一个输入流是否已经准备好。若先顺序等待 A 再等待 B，A 长期没有数据就会让 B 的结果永远得不到处理。

`select` 是 Go 对“等待多个通信事件”的回答。它不是 `switch` 的并发版，也不保证某个 case 总是优先；它在一组发送或接收中选出当前能推进的一项。掌握它的关键是先理解 channel 的阻塞规则，再理解 `select` 的精确定义：case 表达式何时求值、多个 case 同时就绪时如何选择、`default` 会怎样改变等待行为。

这里先从一个聚合查询的超时问题出发，再建立 `select` 的规则，最后用一个可取消 worker pool 组合 goroutine、channel 和 Context。Go 1.26.5 的 runtime 源码会解释它怎样避免固定偏向与多 channel 锁死。

## 为什么顺序接收不够

下面的代码希望处理任意一个先到的结果，但实际上必须先等 `slow`：

```go
first := <-slow // slow 没有值时，程序不会观察 fast。
second := <-fast
fmt.Println(first, second)
```

`select` 将这些“可能阻塞”的通信放在同一个等待点：

```go
select {
case value := <-slow:
	fmt.Println("slow 先到：", value)
case value := <-fast:
	fmt.Println("fast 先到：", value)
}
```

它只执行一个 case 后就结束。若要持续处理事件，应把 `select` 放在循环中，并清楚定义循环何时退出。

## `select` 的五条基本规则

每个 `case` 必须是发送或接收；可以有最多一个 `default`。进入 `select` 时，语言规范规定如下：

1. 所有接收操作的 channel 表达式，以及发送操作的 channel 和右值表达式，按源码顺序各求值一次。
2. 若一个或多个通信可以立即进行，从其中一个作均匀伪随机选择。
3. 若没有 case 就绪且有 `default`，立即执行 `default`。
4. 若没有 case 就绪也没有 `default`，当前 goroutine 阻塞，直到有通信能进行。
5. 只有被选中的接收 case 才会执行其左侧赋值与分支语句。

“伪随机选择”不是给业务排序用的随机数。它的目的在于避免总偏向源码中靠前的 channel；程序正确性必须能接受任意一个同时就绪的 case 被选中。

下面的例子中两个缓冲 channel 都已就绪，多次运行可能打印不同结果：

```go
left := make(chan string, 1)
right := make(chan string, 1)
left <- "L"
right <- "R"

select {
case value := <-left:
	fmt.Println("选择 left：", value)
case value := <-right:
	fmt.Println("选择 right：", value)
}
```

## `default`：非阻塞尝试，而不是“超时”

有 `default` 的 `select` 从不等待。它适合“尽力发送”“有就取一个”或在循环里做有限的其他工作：

```go
func trySend(out chan<- string, message string) bool {
	select {
	case out <- message:
		return true // 缓冲有空位，或接收者已经等待。
	default:
		return false // 当前无法发送；调用方决定丢弃、记录或稍后重试。
	}
}
```

下面是常见错误：`default` 使循环反复立即返回，CPU 会忙等。

```go
for {
	select {
	case value := <-events:
		handle(value)
	default:
		// 没有任何阻塞，循环会高速空转。
	}
}
```

若没有必要轮询，就删除 `default`；若确实要定期做事，加入 timer、退避或其他明确的等待事件。

## 超时与取消：等待结束后还要让工作停止

用 `time.After` 可以给一次简单等待加时间限制：

```go
select {
case result := <-resultCh:
	return result, nil
case <-time.After(time.Second):
	return Result{}, errors.New("等待结果超时")
}
```

这只让**调用者停止等待**。若计算 goroutine 仍在向无接收者的 `resultCh` 发送，它会泄漏。对请求链路，应优先传入 `context.Context`：超时或客户端离开时，`ctx.Done()` 会关闭，所有协作方都可以选择退出。

```go
func fetch(ctx context.Context, result <-chan string) (string, error) {
	select {
	case value, ok := <-result:
		if !ok {
			return "", errors.New("结果流提前结束")
		}
		return value, nil
	case <-ctx.Done():
		return "", ctx.Err() // 返回 deadline exceeded 或 canceled，保留上游原因。
	}
}
```

`time.After` 在每次循环中创建定时器通常不是最清晰的做法。需要反复重置或停止的超时，使用一个 `time.Timer` 并遵守当前 Go 版本文档；单次请求 deadline 则优先由 `context.WithTimeout` 统一管理。

## nil channel：动态移除一个 case

对 nil channel 的发送与接收永远不能进行。因此在 `select` 中把一个 channel 变量设为 nil，等价于暂时移除该 case，而不是关闭它。

这尤其适合合并多个有限输入。关闭的 channel 会永远立刻可接收；若不设为 nil，循环会不断选中它，造成空转。

```go
for left != nil || right != nil {
	select {
	case value, ok := <-left:
		if !ok {
			left = nil // 不再选择已经耗尽的输入。
			continue
		}
		fmt.Println("left:", value)
	case value, ok := <-right:
		if !ok {
			right = nil
			continue
		}
		fmt.Println("right:", value)
	}
}
```

注意：`select {}` 是一个没有 case、没有 default 的 select，会永久阻塞。它偶尔用于刻意让 goroutine 永不返回，但不是常规的等待工具。

## 一个完整示例：可取消且有上限的 worker pool

这个示例模拟并发检查一批 URL。它展示四种不同事件如何在一个循环中协作：任务到达、结果可交付、上游关闭、服务取消。`jobs` 的唯一发送者关闭 jobs；协调 goroutine 等待所有 worker 后关闭 `results`；消费者从不关闭自己只接收的 channel。

```go
package main

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
)

type checkResult struct {
	url string
	ok  bool
}

// check 模拟可被取消的网络操作。
func check(ctx context.Context, url string) (checkResult, error) {
	select {
	case <-time.After(100 * time.Millisecond):
		return checkResult{url: url, ok: strings.HasPrefix(url, "https://")}, nil
	case <-ctx.Done():
		return checkResult{}, ctx.Err()
	}
}

func worker(ctx context.Context, jobs <-chan string, results chan<- checkResult, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		select {
		case url, ok := <-jobs:
			if !ok {
				return // 上游完成，当前 worker 已没有工作可取。
			}
			result, err := check(ctx, url)
			if err != nil {
				return // ctx 取消后 check 已经返回，不再尝试发送结果。
			}
			select {
			case results <- result:
				// 消费者还在接收，交付结果。
			case <-ctx.Done():
				return // 消费者可能已离开，不能卡在 results <- result。
			}
		case <-ctx.Done():
			return
		}
	}
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	jobs := make(chan string)
	results := make(chan checkResult)
	urls := []string{"https://go.dev", "http://example.com", "https://gorm.io"}

	go func() {
		defer close(jobs) // 唯一生产者完成后关闭任务流。
		for _, url := range urls {
			select {
			case jobs <- url:
			case <-ctx.Done():
				return
			}
		}
	}()

	var wg sync.WaitGroup
	const workerCount = 2
	wg.Add(workerCount)
	for i := 0; i < workerCount; i++ {
		go worker(ctx, jobs, results, &wg)
	}
	go func() {
		wg.Wait()      // 所有 results 发送者都已经结束。
		close(results) // 所以现在关闭结果流不会与发送并发。
	}()

	for {
		select {
		case result, ok := <-results:
			if !ok {
				return // 正常完成：已消费所有 worker 产生的结果。
			}
			fmt.Printf("%s secure=%t\n", result.url, result.ok)
		case <-ctx.Done():
			fmt.Println("停止：", ctx.Err())
			return // defer cancel 通知生产者与 worker 尽快退出。
		}
	}
}
```

工作池限制的是同时调用 `check` 的数量，而不是入口处可接受的任务总数。高负载服务还需要为队列长度、拒绝策略、重试和下游限流设置明确规则；`select` 只是把这些事件的等待和退出写得可组合。

## 源码视角：从语言规则到 `runtime.selectgo`

编译器会将多个 case 的通用 select 编译为调用 `runtime.selectgo`。Go 1.26.5 的实现首先收集非 nil channel，生成一个随机化的 `pollorder`；这与规范的“多个可通信 case 均匀伪随机选择”相对应。它又按 channel 地址生成 `lockorder`，以固定顺序持有多把 channel 锁，避免两个 goroutine 以相反顺序锁住两个 channel 而死锁。

```go
// Go 1.26.5：runtime/select.go 的关键流程，删去 synctest 与调试代码。
for i := range scases {
	cas := &scases[i]
	if cas.c == nil {
		continue // nil channel 根本不进入候选集合。
	}
	j := cheaprandn(uint32(norder + 1))
	pollorder[norder] = pollorder[j]
	pollorder[j] = uint16(i) // 打乱轮询次序，避免总偏向前面的 case。
	norder++
}
```

紧接着的真实源码会对候选 channel 按地址做原地堆排序，得到 `lockorder`，再按这个顺序加锁。第一轮按已打乱的 `pollorder` 检查：接收 case 查看等待发送者、缓冲数据和关闭状态；发送 case 查看关闭状态、等待接收者和缓冲容量。若第一轮没有就绪 case 且没有 `default`，runtime 会把当前 goroutine 同时登记到每个候选 channel 的等待队列，然后停放它。任何一个通信唤醒该 goroutine 后，runtime 会撤销它在其余 channel 上的登记，只执行真正获胜的一个 case。于是一个 goroutine 可以安全地“等多个地方”，但一次 select 仍只完成一项通信。

规范中“case 操作数进入 select 时都求值一次”也很重要：即使某个 case 最终未被选中，它的 channel 表达式和发送右值的副作用也已经发生。不要把有副作用的函数调用藏在 case 中；先计算清楚的局部变量，代码更容易推理和测试。

## 容易出错的边界

- 不要依赖多个就绪 case 的固定优先级；需要优先级时设计明确的两阶段检查或队列策略。
- 不要在无限循环里加无条件 `default`，它会忙等。
- 不要只给调用者加超时却不通知生产者或 worker；可能遗留阻塞 goroutine。
- 不要把已关闭 channel 留在合并循环中；设为 nil 后才会真正移除该 case。
- 不要把 `select` 当数据竞争的解决方案；共享状态仍需要 channel 的所有权约定或锁。
- 不要让超时成为常态控制流；频繁 timeout 往往意味着下游容量、队列或 deadline 设计有问题。

## 总结

`select` 让 goroutine 在多个发送、接收、取消和定时事件之间等待一次可推进的操作。没有 `default` 时它是阻塞等待；有 `default` 时它是非阻塞尝试；nil channel 可以动态禁用 case；关闭 channel 则是可立即观察到的结束事件。

把它与有边界的 channel、`context` 和明确的关闭所有权组合起来，才能写出既能完成任务、又能在超时和停止时干净退出的并发程序。

## 参考资料

- [Go 语言规范：Select statements](https://go.dev/ref/spec#Select_statements)
- [Go 并发模式：Pipelines and cancellation](https://go.dev/blog/pipelines)
- [Go 并发模式：Context](https://go.dev/blog/context)
- [Go 1.26.5 `runtime/select.go` 源码](https://cs.opensource.google/go/go/+/go1.26.5:src/runtime/select.go)
