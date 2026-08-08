---
permalink: /backend/go/advanced/02-concurrency/01-goroutines/
title: 01. Goroutine：并发任务的执行单元
shortTitle: 01. Goroutine
order: 1
category:
  - Go
  - Golang 进阶知识
  - 并发编程
tag:
  - Go
  - goroutine
  - sync.WaitGroup
  - context
  - 并发编程
---

# 01. Goroutine：并发任务的执行单元

## 前言

一个接口常常需要同时读取用户资料、订单状态和优惠资格。若按顺序请求三个下游，即使每个调用只需要 100 毫秒，整体延迟也会被累加。它们彼此独立时，更合理的做法是同时发起，再等待全部结果。

Go 用 `go` 关键字启动 goroutine。它解决的是“让独立任务并发推进”，不是“随手开一个后台函数”。真正可维护的并发代码还必须回答：谁等待结果、何时取消、最大并发量是多少、任务失败后怎样处理。

## Goroutine 是什么

```go
go refreshCache(ctx)
```

这行代码会创建一个新的 goroutine 执行 `refreshCache`，当前 goroutine 不会等待它完成。`main` 函数返回时，进程会结束，尚未完成的 goroutine 也会被终止，因此不能用“启动了”代替“完成了”。

goroutine 由 Go runtime 调度，不等同于操作系统线程。理解运行时的 M、P、G 模型有助于建立正确直觉：

- `G` 是 goroutine，保存待执行函数、栈和状态。
- `M` 是操作系统线程，实际执行 Go 代码。
- `P` 是执行 Go 代码所需的逻辑处理器资源；运行时把可运行的 `G` 分配给拥有 `P` 的 `M`。

这使大量 goroutine 可以复用较少的线程，也允许 CPU 密集任务在多个核心上并行。但 goroutine 仍会消耗栈、调度和外部资源；对每个请求、每条消息都无限制地创建 goroutine，最终可能先把数据库连接、下游连接或内存耗尽。

## 真实场景：并发聚合首页数据

下面的示例模拟订单服务的首页聚合。三个数据源相互独立，结果写入不同的切片位置；主流程在 `Wait` 后才读取结果，因此不会发生对同一元素的并发读写。

```go
package dashboard

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Source 定义一个可独立查询的首页数据源，例如订单、会员或优惠服务。
type Source interface {
	Name() string
	Load(ctx context.Context, userID int64) (any, error)
}

type sourceResult struct {
	name string
	data any
	err  error
}

// LoadDashboard 同时请求相互独立的数据源，避免把多个网络等待时间串行相加。
func LoadDashboard(ctx context.Context, userID int64, sources []Source) ([]sourceResult, error) {
	results := make([]sourceResult, len(sources))
	var wg sync.WaitGroup

	for i, source := range sources {
		wg.Add(1) // 必须在启动 goroutine 前登记，避免 Wait 提前返回。

		go func(index int, current Source) {
			defer wg.Done() // 无论成功、失败还是提前返回，都要完成一次登记。

			// 单个下游有更短的预算，不能把整个请求的时间全部耗在一个服务上。
			callCtx, cancel := context.WithTimeout(ctx, 300*time.Millisecond)
			defer cancel()

			data, err := current.Load(callCtx, userID)
			// 每个 goroutine 只写自己的槽位；Wait 返回后再由主 goroutine 统一读取。
			results[index] = sourceResult{name: current.Name(), data: data, err: err}
		}(i, source)
	}

	wg.Wait() // Wait 与各个 Done 建立完成顺序，之后读取 results 才有意义。

	for _, result := range results {
		if result.err != nil {
			return nil, fmt.Errorf("加载 %s 失败: %w", result.name, result.err)
		}
	}
	return results, nil
}
```

这里的并发收益来自同时等待 I/O，不来自“让 CPU 更快”。如果三个调用都受同一个数据库连接池限制，或都消耗同一份 CPU，盲目并发反而会增加竞争和尾延迟。

## `WaitGroup`、`context` 与生命周期

`sync.WaitGroup` 只负责等待，不负责取消、传值或错误传播。常见的职责划分是：

| 工具 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| `WaitGroup` | 等待一组任务结束 | 超时、取消、错误聚合 |
| `context.Context` | 截止时间、取消信号、请求链路传递 | 等待任务自动退出 |
| `Mutex` | 保护共享可变状态 | 任务间的数据流 |
| channel | 在 goroutine 之间传递数据或信号 | 自动限制所有资源 |

取消必须由任务主动响应。把 `ctx` 传给支持它的 HTTP、数据库或 RPC 调用；在自己的循环中检查 `ctx.Done()`。只调用 `cancel()` 并不会强行杀死正在运行的 goroutine。

```go
for {
	select {
	case <-ctx.Done():
		// 接到上游取消后主动退出，避免后台任务长期悬挂。
		return ctx.Err()
	default:
		// 处理一小段可中断的工作；不要在这里执行无限长的阻塞操作。
	}
}
```

## 常见错误

### 不要用 `time.Sleep` 等待

`Sleep` 只是在猜任务大概多久完成：机器变慢时不够，机器变快时浪费。表达“等待任务完成”应使用 `WaitGroup` 或 channel。

### 不要让 goroutine 无人回收

下面的发送可能永久阻塞：接收方已经因超时返回，但发送方仍在等待接收者。

```go
// 错误示意：若 receiver 提前退出，result <- value 可能永远阻塞。
go func() {
	value := slowWork()
	result <- value
}()
```

应把取消信号纳入发送逻辑，或为“一次结果”使用容量为 1 的结果 channel。下一节会详细说明这种模式。

### 不要把共享 Map 当作“天然安全”

多个 goroutine 同时写普通 `map` 会产生数据竞争，甚至触发运行时错误。要么用互斥锁保护同一份状态，要么改为让单个 goroutine 持有状态、其他 goroutine 通过 channel 传递事件。开发和测试阶段应执行：

```bash
go test -race ./...
```

## 并发度应由最稀缺资源决定

假设服务允许同时向对象存储发起 20 个上传，而数据库连接池最大只有 10 个连接。上传任务可以是 20，数据库任务则必须受连接池和数据库容量约束。并发度不是固定的“最佳数字”，应根据下游限流、连接池、CPU、内存和压测结果设置。

当任务数量很多时，通常使用固定数量的 worker，而不是一次为所有任务创建 goroutine。worker pool 会在 channel 一节中实现。

## 总结

goroutine 是 Go 的轻量并发执行单元，适合推进相互独立的 I/O 或计算任务。写业务代码时，重点不是会不会写 `go`，而是为每个任务建立完整生命周期：启动前登记、运行中响应 `context`、结束时通知等待者，并让并发度服从实际资源上限。

下一节用 channel 处理 goroutine 之间的数据流与关闭信号。

## 参考资料

- [Go 官方：Effective Go - Concurrency](https://go.dev/doc/effective_go#concurrency)
- [sync 包文档](https://pkg.go.dev/sync)
- [Go runtime 调度实现：runtime/proc.go](https://go.dev/src/runtime/proc.go)
