---
permalink: /backend/go/advanced/02-concurrency/03-select/
title: 03. select：处理多个并发事件
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

# 03. select：处理多个并发事件

## 前言

一个服务调用多个下游时，主流程不只是在等“一个结果”：报价可能先返回，库存服务可能超时，用户可能已经断开连接。若只写 `<-resultCh`，程序只能等固定的一个 Channel；`select` 让一个 goroutine 同时等待多个发送或接收事件。

`select` 不是 `switch` 的并发版，也不是拿来轮询状态的语法糖。它的价值在于把“结果到了、超时了、该取消了”放在同一个等待点中处理。

## `select` 的基本规则

```go
select {
case value := <-resultCh:
	use(value)
case <-ctx.Done():
	return ctx.Err()
}
```

- 所有 `case` 必须是 Channel 的发送或接收操作；
- 如果至少一个通信操作可以立刻进行，运行时会从可执行的分支中选择一个；不要依赖多个就绪分支的固定顺序；
- 如果没有分支可执行且没有 `default`，当前 goroutine 阻塞；
- 有 `default` 时会立刻执行它，因此常用于非阻塞尝试，也最容易写出空转循环；
- `nil` Channel 的分支永远不会就绪，可以用来动态禁用一个分支。

## 场景：并发询价，但受请求截止时间约束

下面的聚合接口同时向三个供应商询价。任何一个供应商返回后，结果都会送入同一个 `quotes` Channel；主流程等待全部结果，或在请求超时后立刻停止等待。

```go
package pricing

import (
	"context"
	"fmt"
	"time"
)

type Provider interface {
	Name() string
	Quote(ctx context.Context, sku string) (int64, error)
}

type quoteResult struct {
	provider string
	price    int64
	err      error
}

// CollectQuotes 在调用方的 deadline 内收集所有供应商报价。
func CollectQuotes(parent context.Context, providers []Provider, sku string) ([]quoteResult, error) {
	ctx, cancel := context.WithTimeout(parent, 800*time.Millisecond)
	defer cancel() // 返回后通知尚未结束的下游调用停止。

	quotes := make(chan quoteResult, len(providers))
	for _, provider := range providers {
		go func(provider Provider) {
			price, err := provider.Quote(ctx, sku)
			// 缓冲区足够容纳每个任务一个结果；主流程超时返回后，发送方不会被卡住。
			quotes <- quoteResult{provider: provider.Name(), price: price, err: err}
		}(provider)
	}

	results := make([]quoteResult, 0, len(providers))
	for received := 0; received < len(providers); {
		select {
		case result := <-quotes:
			received++
			if result.err != nil {
				return nil, fmt.Errorf("供应商 %s 询价: %w", result.provider, result.err)
			}
			results = append(results, result)
		case <-ctx.Done():
			return nil, fmt.Errorf("询价超时: %w", ctx.Err())
		}
	}
	return results, nil
}
```

这里的 `context` 与 `select` 各有职责：`context` 把取消信号传给 `Quote` 及其 HTTP、数据库调用；`select` 让当前函数不必傻等结果，而是在取消发生时立即返回。只在外层 `select` 超时、却不把 `ctx` 传给下游，往往仍会留下继续运行的 goroutine。

## 超时：优先复用调用方的 `context`

HTTP handler、RPC handler 和数据库操作通常已经拿到了一个 `context`。给当前操作设定时限时，派生一个更短的 context 即可：

```go
ctx, cancel := context.WithTimeout(request.Context(), 200*time.Millisecond)
defer cancel() // 及时释放计时器并传播取消。

select {
case response := <-responseCh:
	return response, nil
case <-ctx.Done():
	return Response{}, ctx.Err()
}
```

`time.After` 也能产生一个到期信号，适合一次性的小示例：

```go
select {
case value := <-resultCh:
	return value
case <-time.After(time.Second):
	return fallback
}
```

但业务调用通常不应只靠它。`time.After` 只能让当前 `select` 放弃等待，不能自动停止正在执行的 HTTP 请求、数据库查询或 goroutine；可取消的 `context` 才能把停止意图继续向下传递。

## 在循环中退出 `select`

`break` 默认只跳出 `select`，不会跳出外层 `for`。事件循环需要结束时，使用具名标签更清晰：

```go
loop:
	for {
		select {
		case message, ok := <-messages:
			if !ok {
				break loop // 跳出 for，而不是只跳出 select。
			}
			handle(message)
		case <-ctx.Done():
			break loop
		}
	}
```

已关闭的 Channel 会不断立即返回零值，因此若一个循环还要继续监听其他 Channel，应在确认关闭后将变量设为 `nil`：

```go
for updates != nil || errors != nil {
	select {
	case update, ok := <-updates:
		if !ok {
			updates = nil // 禁用这个 case，避免已关闭 Channel 持续抢占执行机会。
			continue
		}
		apply(update)
	case err, ok := <-errors:
		if !ok {
			errors = nil
			continue
		}
		logError(err)
	}
}
```

## `default` 的适用边界

`default` 表示“当前没有任何通信可以立刻完成时，不阻塞”。它适合尝试投递一个可丢弃的通知：

```go
select {
case metrics <- event:
	// 指标队列有空间，正常投递。
default:
	// 指标不能影响主请求；队列满时允许丢弃并记录监控。
}
```

不要在无限循环中无条件使用 `default`：

```go
// 错误示例：没有消息时会持续占用 CPU。
for {
	select {
	case message := <-messages:
		handle(message)
	default:
	}
}
```

如果确实是轮询任务，通常应等待 ticker，而不是忙等。

## 总结

`select` 让一个 goroutine 能等待多个 Channel 事件。它最常用于结果聚合、请求取消、超时和事件循环。使用时要明确下游任务的停止方式，避免已关闭 Channel 反复触发，谨慎使用 `default`，并在循环中用标签或返回语句真正退出。

至此，并发这一组建立了完整顺序：goroutine 负责启动任务，Channel 负责传递数据和结束信号，`select` 负责在多个可能发生的事件之间作出响应。

## 参考资料

- [Go 语言规范：Select 语句](https://go.dev/ref/spec#Select_statements)
- [context 包文档](https://pkg.go.dev/context)
- [Go 官方：Pipelines and cancellation](https://go.dev/blog/pipelines)
