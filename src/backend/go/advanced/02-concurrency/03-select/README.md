---
title: 03. Select：等待多个事件
shortTitle: 03. Select
order: 3
icon: arrows-split-up-and-left
category:
  - Go
  - Golang 进阶知识
  - 并发编程
tag:
  - Go
  - select
  - context
  - timeout
  - 并发编程
---

# 03. Select：等待多个事件

## 前言

服务端等待的通常不止一个事件：下游结果可能先返回，客户端可能断开，请求可能超时，服务也可能正在关闭。`select` 让一个 goroutine 同时等待多个 channel 操作，谁先就绪就处理谁。

它不是 `switch` 的并发版。`switch` 判断普通值；`select` 判断发送或接收能否立即进行。把取消和超时写进 `select`，才能让并发程序在不再需要结果时及时收尾。

## 基本规则

```go
select {
case value := <-resultCh:
	use(value)
case <-ctx.Done():
	return ctx.Err()
}
```

- 没有 case 就绪时，`select` 阻塞。
- 多个 case 同时就绪时，语言规范会在可执行 case 中做均匀伪随机选择；不要把它当作优先级或公平性保证。
- `default` 会让没有 case 就绪的 `select` 立即返回；循环中滥用它会形成忙等并占满 CPU。

## 真实场景：聚合下游结果并处理超时

订单确认页需要同时查询库存、运费和优惠。每个异步任务只会产生一个结果，因此结果 channel 设为容量 1：即使调用方超时返回，刚结束的生产者也不会卡在发送处。

```go
package checkout

import (
	"context"
	"fmt"
	"time"
)

type Result[T any] struct {
	Value T
	Err   error
}

// async 将一个阻塞调用变成“一次结果”的 channel。
func async[T any](ctx context.Context, fn func(context.Context) (T, error)) <-chan Result[T] {
	resultCh := make(chan Result[T], 1)

	go func() {
		value, err := fn(ctx)
		// 容量为 1 保证调用方提前退出时，这个单次发送仍可完成并让 goroutine 结束。
		resultCh <- Result[T]{Value: value, Err: err}
	}()
	return resultCh
}

type Summary struct {
	StockOK bool
	Freight int64
	Discount int64
}

func LoadSummary(parent context.Context, productID, userID int64) (Summary, error) {
	ctx, cancel := context.WithTimeout(parent, 800*time.Millisecond)
	defer cancel() // 返回后通知仍在运行的下游调用尽快停止。

	stockCh := async(ctx, func(ctx context.Context) (bool, error) {
		return queryStock(ctx, productID)
	})
	freightCh := async(ctx, func(ctx context.Context) (int64, error) {
		return queryFreight(ctx, productID)
	})
	discountCh := async(ctx, func(ctx context.Context) (int64, error) {
		return queryDiscount(ctx, userID)
	})

	var summary Summary
	for received := 0; received < 3; received++ {
		select {
		case result := <-stockCh:
			if result.Err != nil {
				return Summary{}, fmt.Errorf("查询库存: %w", result.Err)
			}
			summary.StockOK = result.Value
		case result := <-freightCh:
			if result.Err != nil {
				return Summary{}, fmt.Errorf("查询运费: %w", result.Err)
			}
			summary.Freight = result.Value
		case result := <-discountCh:
			if result.Err != nil {
				return Summary{}, fmt.Errorf("查询优惠: %w", result.Err)
			}
			summary.Discount = result.Value
		case <-ctx.Done():
			return Summary{}, fmt.Errorf("加载结算信息: %w", ctx.Err())
		}
	}
	return summary, nil
}
```

示例中的 `queryStock` 等函数必须把 `ctx` 继续传给 HTTP、RPC 或数据库调用。否则 `cancel()` 只能让外层返回，不能停止真正耗时的下游操作。

## `time.After` 和超时控制

临时等待一个事件可以写成：

```go
select {
case message := <-messages:
	consume(message)
case <-time.After(200 * time.Millisecond):
	return ErrTimeout
}
```

但在请求处理或循环中，更推荐从入口创建一个 `context.WithTimeout` 并一路传递。这样 HTTP、数据库和业务循环都共享同一份截止时间，避免每层各自设置计时器而出现总耗时失控。

## 如何安全地退出循环

关闭的 channel 会一直处于可接收状态。若在循环里继续保留它，`select` 会反复选中该 case，读到元素零值。收到关闭信号后，应返回、跳出循环，或把对应 channel 设为 `nil` 以禁用该 case。

```go
for updates != nil {
	select {
	case update, ok := <-updates:
		if !ok {
			updates = nil // nil channel 永远不会就绪，等价于移除此 case。
			continue
		}
		handle(update)
	case <-ctx.Done():
		return ctx.Err()
	}
}
```

## 从实现理解 `select`

运行时会先检查各个通信 case 是否可执行；如果都不可执行，就把当前 goroutine 登记到相关 channel 的等待队列并挂起。任一通信成功后，运行时唤醒该 goroutine，并清理它在其他等待队列中的登记。

这也是为什么一个 `select` 同时监听多个 channel 是可行的，但把它包在带 `default` 的无限循环里会很危险：运行时没有机会挂起当前 goroutine，代码会不停空转。

## 总结

`select` 是并发程序的事件协调器。优先把请求取消和截止时间放进 case；对关闭的 channel 明确退出或禁用；不要依赖 case 的执行顺序，也不要用 `default` 轮询代替真正的等待。这样多个异步结果、超时和服务退出才能被清晰地编排在同一个控制流中。

## 参考资料

- [Go 语言规范：Select statements](https://go.dev/ref/spec#Select_statements)
- [context 包文档](https://pkg.go.dev/context)
- [select 运行时实现：runtime/select.go](https://go.dev/src/runtime/select.go)
