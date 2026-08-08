---
permalink: /backend/go/advanced/02-concurrency/01-goroutines/
title: 01. Goroutine：并发任务的启动与等待
shortTitle: 01. Goroutine
order: 1
category:
  - Go
  - Golang 进阶知识
  - 并发编程
tag:
  - Go
  - Goroutine
  - sync.WaitGroup
  - context
  - 并发编程
---

# 01. Goroutine：并发任务的启动与等待

## 前言

一个订单详情页往往要同时读取订单、商品和物流信息。这三次调用彼此没有依赖，若按顺序执行，总耗时接近三次调用耗时之和；若同时发起，整体耗时通常接近其中最慢的一次。

Go 用 goroutine 表示这类可以独立推进的任务。它的起点很简单，只是在函数调用前加上 `go`。真正需要认真理解的是后半句：任务由谁等待、失败后怎样收尾、请求取消时又怎样停止。没有生命周期的 goroutine 不是“后台任务”，而是泄漏风险。

## 先分清并发与并行

并发表示多个任务在同一段时间内交替推进；并行表示多个任务在同一时刻使用多个 CPU 核心执行。goroutine 让程序容易写出并发结构，但不保证每个任务立刻执行，更不保证输出顺序。

goroutine 由 Go runtime 调度，不等同于操作系统线程。运行时会把许多 goroutine 调度到少量或多个操作系统线程上执行，并根据可用 CPU 决定并行度。业务代码只应依赖一件事：**goroutine 的执行顺序不确定**。

## 用 `go` 启动一个任务

普通调用必须等函数返回；加上 `go` 后，调用方会继续向下执行。

```go
package main

import "fmt"

func loadInventory() {
	// 这里模拟一次可能较慢的库存读取。
	fmt.Println("库存读取完成")
}

func main() {
	go loadInventory() // 启动新 goroutine，main 不会等待它完成。
	fmt.Println("主流程继续执行")
}
```

这段程序的输出顺序没有保证，甚至可能只看到“主流程继续执行”。原因是 `main` 函数返回时，进程会结束，尚未完成的 goroutine 也会被直接终止。

`time.Sleep` 能让演示看起来“正常”，却不能建立正确的同步关系：睡短了任务未必结束，睡长了只是浪费时间。程序应该等待明确的任务，而不是等待一个猜测出来的时长。

## 使用 `sync.WaitGroup` 等待一组任务

`WaitGroup` 只负责计数和等待，不传递结果，也不负责取消任务。它最适合回答“这批 goroutine 是否全部结束”。

| 调用 | 含义 |
| --- | --- |
| `Add(1)` | 登记一个即将启动的任务 |
| `Done()` | 声明一个已登记任务结束，等价于 `Add(-1)` |
| `Wait()` | 阻塞当前 goroutine，直到计数归零 |

下面把订单卡片读取并发化。每个 goroutine 只写入切片中自己对应的下标，因此没有多个任务竞争同一位置；主 goroutine 在 `Wait` 后读取完整结果。

```go
package dashboard

import (
	"context"
	"fmt"
	"sync"
)

type ProductClient interface {
	GetCard(ctx context.Context, productID int64) (ProductCard, error)
}

type ProductCard struct {
	ID   int64
	Name string
}

// LoadProductCards 同时读取多个商品卡片，并保持返回顺序与 productIDs 一致。
func LoadProductCards(ctx context.Context, client ProductClient, productIDs []int64) ([]ProductCard, error) {
	cards := make([]ProductCard, len(productIDs))
	errs := make([]error, len(productIDs))

	var wg sync.WaitGroup
	for index, productID := range productIDs {
		// 必须先 Add，再启动 goroutine；否则 Wait 可能过早观察到计数为零。
		wg.Add(1)
		go func(index int, productID int64) {
			defer wg.Done() // 无论成功、失败还是提前 return，都要归还一次计数。

			card, err := client.GetCard(ctx, productID)
			if err != nil {
				errs[index] = err
				return
			}
			cards[index] = card
		}(index, productID) // 显式传参，避免循环变量和闭包的歧义。
	}

	wg.Wait() // Wait 返回后，所有 cards 和 errs 的写入都已完成。
	for index, err := range errs {
		if err != nil {
			return nil, fmt.Errorf("读取商品 %d: %w", productIDs[index], err)
		}
	}
	return cards, nil
}
```

这里有两个容易忽略的点：

1. `WaitGroup` 不会让第一个失败的任务自动停止其他任务。需要停止时，应由调用方传入可取消的 `context`，并让 `GetCard` 把它继续传给下游。
2. 不要把 `WaitGroup` 当作互斥锁。它只保证 `Wait` 返回前任务已经结束；如果多个 goroutine 同时写同一个 map 或同一个结构体字段，仍然需要 Channel、互斥锁或重新设计数据所有权。

## Goroutine 必须有退出路径

短任务通常在函数返回时结束。轮询、消费和监听等长任务则必须能接收停止信号。`context.Context` 是 HTTP 请求和服务关闭场景中最常见的生命周期载体。

```go
func RefreshCache(ctx context.Context, refresh func(context.Context) error) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop() // 停止 ticker，避免它在函数返回后继续占用运行时资源。

	for {
		select {
		case <-ctx.Done():
			// 服务退出或上游请求取消时，循环必须立即有机会结束。
			return
		case <-ticker.C:
			if err := refresh(ctx); err != nil {
				log.Printf("刷新缓存失败: %v", err)
			}
		}
	}
```

这段代码中的 `select` 会在后文展开。现在先记住判断标准：启动 goroutine 的地方，应当能说清它在什么条件下结束；如果说不清，就不要启动它。

## 常见错误

### 在 `Wait` 之后才调用 `Add`

下面的顺序存在竞态：`Wait` 可能先看到计数为零并返回，然后新任务才被登记。

```go
// 错误示例：不要这样写。
go func() {
	wg.Add(1)
	defer wg.Done()
	work()
}()
wg.Wait()
```

通常应由启动任务的同一段代码先 `Add`、再 `go`。

### 无限制地为每个元素启动 goroutine

给十个订单并发请求通常合理；把几十万个数据库记录各启动一个 goroutine，就可能同时耗尽数据库连接、远程服务配额或内存。并发数应由最稀缺的下游资源决定，常见做法是使用固定数量的 worker 和有限容量的任务队列。

### 忘记等待 HTTP 请求里的任务

HTTP handler 返回后，响应就可能已经写回客户端。除非任务明确交给了可靠的异步系统，否则不要在 handler 里随手 `go` 一个仍依赖本次请求数据的任务，然后立刻返回。

## 总结

goroutine 是 Go 的并发执行单元，`go f()` 只表示“启动任务”，不表示任务一定完成。短任务通常用 `WaitGroup` 等待，长任务必须通过 `context` 或其他明确信号退出。并发能减少相互独立任务的等待时间，但不能替代资源上限、错误处理和数据同步设计。

## 参考资料

- [Go 语言规范：Go 语句](https://go.dev/ref/spec#Go_statements)
- [sync.WaitGroup 包文档](https://pkg.go.dev/sync#WaitGroup)
- [Go 官方：Context](https://go.dev/blog/context)
