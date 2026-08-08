---
permalink: /backend/go/advanced/02-concurrency/02-channels/
title: 02. Channel：并发任务之间的数据流
shortTitle: 02. Channel
order: 2
category:
  - Go
  - Golang 进阶知识
  - 并发编程
tag:
  - Go
  - channel
  - worker pool
  - context
  - 并发编程
---

# 02. Channel：并发任务之间的数据流

## 前言

goroutine 解决“谁来并发执行”，channel 解决“任务之间怎样安全地交接数据”。在真实服务中，常见场景不是两个 goroutine 打印字符串，而是生产者持续提交任务、固定数量的 worker 消费任务、调用方持续接收处理结果。

channel 是带元素类型的通信通道。它能传递数据、表达任务结束，也能形成背压：消费者来不及处理时，生产者会在发送处等待，而不会无限积压工作。

## 基本行为

```go
jobs := make(chan Job)       // 无缓冲：发送和接收必须配对。
results := make(chan Result, 8) // 有缓冲：最多暂存 8 个结果。
```

| 操作 | 无缓冲 channel | 有缓冲 channel |
| --- | --- | --- |
| 发送 | 等待接收者到达 | 缓冲未满时立即完成，满时等待 |
| 接收 | 等待发送者到达 | 缓冲非空时立即完成，空时等待 |
| `close(ch)` | 通知再无新值 | 先接收剩余缓冲值，再得到结束信号 |

关闭 channel 的语义是“不会再发送”，不是“释放内存”。channel 会被垃圾回收。通常由发送方关闭，因为发送方最清楚数据何时生产完毕；向已关闭 channel 发送或重复关闭都会 panic。

## 真实场景：有上限的图片处理流水线

商品运营一次上传很多图片时，服务需要生成缩略图。下面的 worker pool 固定启动 4 个 worker，让并发度稳定，避免同时打开成千上万个文件或请求。

```go
package thumbnail

import (
	"context"
	"fmt"
	"sync"
)

type Job struct {
	ProductID int64
	ObjectKey string
}

type Result struct {
	ProductID int64
	URL       string
	Err       error
}

// StartWorkers 只从 jobs 接收任务、向 results 发送结果。
// 单向 channel 让函数职责在类型层面清晰可见。
func StartWorkers(ctx context.Context, workers int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			for {
				select {
				case <-ctx.Done():
					// 调用方取消后，worker 不再领取新任务。
					return
				case job, ok := <-jobs:
					if !ok {
						// 任务输入关闭且已取空，说明生产者已经结束。
						return
					}

					url, err := createThumbnail(ctx, job.ObjectKey)
					result := Result{ProductID: job.ProductID, URL: url, Err: err}

					select {
					case results <- result:
						// 将一次处理结果交给收集者。
					case <-ctx.Done():
						// 收集者已经不需要结果时，不要在发送处泄漏 goroutine。
						return
					}
				}
			}
		}()
	}
}

func ProcessBatch(ctx context.Context, input []Job) ([]Result, error) {
	// 由本函数派生的取消信号会在首个错误或函数返回时停止生产者和 worker。
	workCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	jobs := make(chan Job)
	results := make(chan Result)
	var wg sync.WaitGroup

	StartWorkers(workCtx, 4, jobs, results, &wg)

	go func() {
		defer close(jobs) // 唯一的任务发送方负责关闭 jobs。
		for _, job := range input {
			select {
			case jobs <- job:
			case <-workCtx.Done():
				return
			}
		}
	}()

	go func() {
		wg.Wait()
		// 所有 worker 都已停止发送后，协调者才能安全关闭 results。
		close(results)
	}()

	output := make([]Result, 0, len(input))
	for result := range results {
		if result.Err != nil {
			// defer cancel 会唤醒可能还在取任务或发送结果的 goroutine。
			return nil, fmt.Errorf("处理商品 %d: %w", result.ProductID, result.Err)
		}
		output = append(output, result)
	}
	return output, nil
}
```

这段代码的关键不是缓冲区大小，而是所有权：生产者关闭 `jobs`；worker 只消费 `jobs`；协调者等待所有 worker 结束后关闭 `results`；调用方只接收 `results`。每个 channel 只有一个明确的关闭责任方。

## `range` 与逗号 `ok`

当接收方需要持续处理直到上游结束时，使用 `range` 最清楚：

```go
for result := range results {
	// range 会在 results 被关闭并取空后结束。
	consume(result)
}
```

若要在同一轮中区分“收到了零值”和“通道关闭”，使用逗号 `ok`：

```go
job, ok := <-jobs
if !ok {
	// ok 为 false 只表示 channel 已关闭且没有剩余值。
	return
}
```

## 从运行时角度理解阻塞

runtime 用内部的 channel 结构保存元素类型、环形缓冲区、关闭状态，以及等待发送和接收的 goroutine 队列。无缓冲 channel 没有元素队列，发送与接收需要直接配对；有缓冲 channel 则先写入固定容量的缓冲区。缓冲区满时发送方进入等待队列，空时接收方进入等待队列。

因此，channel 阻塞不是错误，而是协议的一部分。错误在于没有设计解除阻塞的路径，例如没有消费者、取消后仍发送、多个发送者竞争关闭同一通道。

## 缓冲区不是“性能开关”

缓冲容量应表达允许积压多少工作，而不是随意设成很大：

- 容量为 `0`：要求生产者与消费者同步交接，适合需要严格背压的阶段。
- 小容量：吸收短暂抖动，但仍能快速把慢消费者反馈给生产者。
- 大容量：会推迟问题暴露，并可能把内存、超时和任务过期风险集中到队列里。

worker 数量控制同时执行多少任务；channel 容量控制允许排队多少任务。这是两个不同的维度。

## 总结

channel 用明确的数据流替代无序共享状态。使用它时先确定四件事：谁发送、谁接收、谁关闭、取消后谁负责退出。固定 worker 数量加上 `context`，能让批量任务既有并发收益，又不会无限占用资源。

下一节将用 `select` 同时等待多个 channel、超时和取消信号。

## 参考资料

- [Go 语言规范：Channel types](https://go.dev/ref/spec#Channel_types)
- [Go 语言规范：Close](https://go.dev/ref/spec#Close)
- [channel 运行时实现：runtime/chan.go](https://go.dev/src/runtime/chan.go)
