---
permalink: /backend/go/advanced/02-concurrency/02-channels/
title: 02. Channel：Goroutine 之间的通信
shortTitle: 02. Channel
order: 2
category:
  - Go
  - Golang 进阶知识
  - 并发编程
tag:
  - Go
  - Channel
  - Goroutine
  - Worker Pool
  - 并发编程
---

# 02. Channel：Goroutine 之间的通信

## 前言

启动 goroutine 只是让多个任务同时运行。它们还需要交换任务、结果和结束信号。直接共享一个 map 或计数器当然可行，但读写边界很容易变得模糊；Channel 则把“谁发送、谁接收、何时结束”写进了程序结构。

Channel 不是异步队列的同义词。无缓冲 Channel 是一次发送和一次接收的会合点；有缓冲 Channel 才能暂存有限数量的值。理解阻塞和关闭规则，比记住语法更重要。

## 创建、发送、接收

Channel 有元素类型，只能传递同一种类型的数据：

```go
jobs := make(chan string)       // 无缓冲：发送和接收必须配对。
results := make(chan Result, 8) // 有缓冲：最多暂存 8 个结果。

jobs <- "order-1001" // 向 Channel 发送。
jobID := <-jobs       // 从 Channel 接收。
```

`make(chan T)` 等价于 `make(chan T, 0)`。不要只为了“避免阻塞”就随意加大缓冲区，先弄清谁生产、谁消费、系统能接受多少排队任务。

| Channel 状态 | 发送 | 接收 |
| --- | --- | --- |
| 无缓冲且对方尚未就绪 | 阻塞 | 阻塞 |
| 有缓冲且缓冲区未满 | 可以发送 | - |
| 有缓冲且缓冲区非空 | - | 可以接收 |
| 已关闭但还有缓冲数据 | panic | 继续取得剩余数据 |
| 已关闭且已排空 | panic | 立即得到零值，`ok` 为 `false` |
| `nil` | 永久阻塞 | 永久阻塞 |

## 无缓冲 Channel：用通信完成同步

无缓冲 Channel 不保存值。发送方和接收方必须同时到达，值才会交接。这使它很适合表达“任务做完后通知我”。

```go
package main

import "fmt"

func main() {
	done := make(chan struct{})

	go func() {
		defer close(done) // 关闭只传递“已完成”这个事实，不需要额外的数据。
		fmt.Println("生成日报")
	}()

	<-done // 在收到完成信号前，main 不会继续。
	fmt.Println("日报任务结束")
}
```

若没有接收方，下面的发送会永久等待，最终触发死锁：

```go
ch := make(chan int)
ch <- 1 // 当前 goroutine 在这里等待接收方。
```

这不是 Channel “不好用”，而是在提醒我们：一次发送必须有对应的接收路径。

## 有缓冲 Channel：有限的任务队列

有缓冲 Channel 允许生产者暂时领先于消费者，但容量就是系统允许的积压上限。以图片转码为例，上传接口可以把任务交给固定数量的 worker；worker 数控制实际并发数，`jobs` 的容量控制等待处理的任务数量。

```go
package media

import (
	"fmt"
	"sync"
)

type Result struct {
	ObjectKey string
	Err       error
}

// ConvertAll 用固定数量的 worker 处理任务，避免为每个文件创建一个 goroutine。
func ConvertAll(objectKeys []string, workerCount int) []Result {
	jobs := make(chan string, workerCount)
	results := make(chan Result, len(objectKeys))

	var workers sync.WaitGroup
	for workerID := 0; workerID < workerCount; workerID++ {
		workers.Add(1)
		go func(workerID int) {
			defer workers.Done()
			for objectKey := range jobs {
				// 每个 worker 独占自己当前处理的任务，不共享可变任务状态。
				err := convertImage(objectKey)
				results <- Result{ObjectKey: objectKey, Err: err}
			}
		}(workerID)
	}

	go func() {
		defer close(jobs) // 发送 jobs 的一方负责关闭 jobs。
		for _, objectKey := range objectKeys {
			jobs <- objectKey
		}
	}()

	go func() {
		workers.Wait()  // 所有 worker 都不再向 results 发送后才能关闭它。
		close(results)
	}()

	converted := make([]Result, 0, len(objectKeys))
	for result := range results { // results 关闭并排空后，循环自然结束。
		if result.Err != nil {
			fmt.Printf("转码 %s 失败: %v\n", result.ObjectKey, result.Err)
		}
		converted = append(converted, result)
	}
	return converted
}
```

这段程序的关闭责任很明确：任务生产者关闭 `jobs`；协调者等待所有 worker 退出后关闭 `results`；接收方只消费，不关闭仍可能被发送的 Channel。

## `close`、逗号 `ok` 与 `range`

关闭 Channel 的含义不是“释放内存”，而是“以后不会再发送新值”。Channel 即使不关闭，也会在不再被引用时被垃圾回收。

接收方若需要区分普通零值和数据流结束，可使用逗号 `ok`：

```go
status, ok := <-updates
if !ok {
	// ok 为 false 表示 updates 已关闭且缓冲区已经取空。
	return
}
fmt.Println(status)
```

当数据流应该完整消费时，`for range` 更适合：

```go
for status := range updates {
	// range 会一直接收，直到发送方关闭 updates 且剩余值被取完。
	process(status)
}
```

因此，有限数据流必须有关闭者；否则 `range` 不知道何时结束。反过来，对广播通知、长期事件流等不以“全部结束”为语义的 Channel，不要为了习惯而随意关闭。

## 用方向表达接口边界

函数参数可以限制 Channel 的方向，防止调用方误用：

```go
// produce 只能发送，不能从 out 接收。
func produce(ids []int64, out chan<- int64) {
	defer close(out) // 生产者拥有关闭权。
	for _, id := range ids {
		out <- id
	}
}

// consume 只能接收，不能关闭后再发送。
func consume(in <-chan int64) {
	for id := range in {
		fmt.Println(id)
	}
}
```

方向不是运行时权限控制，而是编译期约束。它让函数签名直接说明数据流向。

## 容易写错的地方

### 接收方关闭 Channel

接收方通常不知道是否仍有发送者。关闭后其他发送者再写入会 panic。原则很简单：**谁能确定不会再发送，谁负责关闭。**

### 用 `len(ch)` 判断是否可以接收

并发程序里，读取 `len(ch)` 后状态就可能被其他 goroutine 改变。它可以用于监控，不应用作“先判断再接收”的同步机制。

### 让 worker 把结果写到无人接收的 Channel

如果 `results <- value` 没有接收方且缓冲区已满，worker 会卡住，`WaitGroup` 也就永远等不到结束。设计流水线时，要同时画出生产、消费和关闭三条路径。

## 总结

Channel 用来表达 goroutine 之间的数据流和同步关系。无缓冲 Channel 强调交接，有缓冲 Channel 提供有限排队。发送方通常负责关闭，接收方通过 `range` 或 `ok` 识别流结束。先明确数据所有权和结束条件，再决定是否需要 Channel、缓冲区和 worker pool。

## 参考资料

- [Go 语言规范：Channel 类型](https://go.dev/ref/spec#Channel_types)
- [Go 语言规范：接收操作](https://go.dev/ref/spec#Receive_operator)
- [Go 官方：Pipelines and cancellation](https://go.dev/blog/pipelines)
