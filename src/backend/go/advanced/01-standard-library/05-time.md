---
title: 05. time：时间、日期与定时任务
shortTitle: 05. time
order: 5
permalink: /backend/go/advanced/01-standard-library/05-time/
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - 标准库
---

# 05. time：时间、日期与定时任务

## 前言

时间处理的关键在于区分时间点、时长与时区。以下保留原有结构，依次介绍构造与解析、计算与比较，以及 `Timer`、`Ticker` 的使用。

> 说明：本章按原有内容、示例和顺序拆分为独立文章。代码中的资源关闭、错误处理、参数含义等关键点均保留在原示例及其紧邻说明中，便于对照阅读。

## 14.2.1 `time` 包概述

`time` 包提供时间点表示、时间间隔计算、日期格式化与解析、时区转换以及定时任务等能力。

首先需要区分三个核心概念：

| 类型            | 含义                                     |
| --------------- | ---------------------------------------- |
| `time.Time`     | 一个具体的时间点                         |
| `time.Duration` | 两个时间点之间的时间间隔，底层单位为纳秒 |
| `time.Location` | 时区及其转换规则                         |

`time.Time` 表示“什么时候”，`time.Duration` 表示“持续多久”，`time.Location` 决定时间如何显示为年月日和时分秒。

## 14.2.2 获取和构造时间

### 1. 获取当前时间

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // Now 返回当前瞬间，并附带本地时区信息。
    now := time.Now()
    fmt.Println("当前时间：", now)

    // Date 和 Clock 将时间点拆成日历字段和时钟字段。
    year, month, day := now.Date()
    hour, minute, second := now.Clock()

    fmt.Printf(
        "%d-%02d-%02d %02d:%02d:%02d\n",
        year,
        month,
        day,
        hour,
        minute,
        second,
    )
}
```

也可以分别调用以下方法获取时间字段：

```go
now.Year()
now.Month()
now.Day()
now.Hour()
now.Minute()
now.Second()
now.Nanosecond()
now.Weekday()
```

### 2. 使用 `time.Date` 构造时间

```go
// 使用 IANA 时区名加载规则，避免依赖机器的默认本地时区。
loc, err := time.LoadLocation("Asia/Shanghai")
if err != nil {
    panic(err)
}

// Date 的最后一个参数决定这个“年月日时分秒”属于哪个时区。
t := time.Date(2026, time.July, 15, 14, 30, 0, 0, loc)
fmt.Println(t)
```

构造业务时间时应明确指定时区，避免无意中依赖程序运行环境的本地时区。

## 14.2.3 Unix 时间戳

Unix 时间戳以 **1970 年 1 月 1 日 00:00:00 UTC** 为起点。

| 方法          | 单位 |
| ------------- | ---- |
| `Unix()`      | 秒   |
| `UnixMilli()` | 毫秒 |
| `UnixMicro()` | 微秒 |
| `UnixNano()`  | 纳秒 |

```go
// 由同一个时间点分别取得不同精度的 Unix 时间戳。
now := time.Now()

fmt.Println("秒：", now.Unix())
fmt.Println("毫秒：", now.UnixMilli())
fmt.Println("微秒：", now.UnixMicro())
fmt.Println("纳秒：", now.UnixNano())
```

时间戳本身不携带时区。同一个 Unix 时间戳在全球表示同一个瞬间，只是在不同时区中显示的本地日期和时间不同。

将秒级时间戳转换为 `time.Time`：

```go
// Unix 的第二个参数为纳秒部分；秒级时间戳时传 0。
seconds := int64(1721044200)
timeObj := time.Unix(seconds, 0)

fmt.Println("本地时间：", timeObj)
fmt.Println("UTC 时间：", timeObj.UTC())
```

将毫秒时间戳转换为 `time.Time`：

```go
// 毫秒时间戳应使用 UnixMilli，不能直接传给 Unix 的秒参数。
milliseconds := int64(1721044200000)
timeObj := time.UnixMilli(milliseconds)
```

## 14.2.4 时间间隔 `time.Duration`

`time.Duration` 表示一段时间间隔，其底层类型是 `int64`，单位为纳秒。

```go
const (
    Nanosecond  Duration = 1
    Microsecond          = 1000 * Nanosecond
    Millisecond          = 1000 * Microsecond
    Second               = 1000 * Millisecond
    Minute               = 60 * Second
    Hour                 = 60 * Minute
)
```

常见写法：

```go
// 每个变量的单位都由 time.Duration 常量明确表达。
retryInterval := 500 * time.Millisecond
timeout := 3 * time.Second
cacheTTL := 30 * time.Minute
```

不要将未经转换的整数直接理解为秒：

```go
// 未乘单位的整数会被当作纳秒，几乎不会产生可见等待。
time.Sleep(3) // 仅休眠 3 纳秒
```

正确写法：

```go
time.Sleep(3 * time.Second)
```

使用 `time.ParseDuration` 可以解析带单位的时间间隔字符串：

```go
// 解析配置中的时长文本；输入格式错误时必须停止使用结果。
d, err := time.ParseDuration("1h30m15s")
if err != nil {
    panic(err)
}
fmt.Println(d)
```

常用单位包括 `ns`、`us`、`µs`、`ms`、`s`、`m` 和 `h`。`Duration` 不提供天和月单位，因为它们并不是固定时长。

## 14.2.5 时间计算与比较

### 1. `Add` 和 `AddDate`

```go
// Add 增加固定时长；负 Duration 则向过去移动。
now := time.Now()
later := now.Add(time.Hour)
earlier := now.Add(-30 * time.Minute)
```

`Add` 适合增加固定时长。对于“下个月”或“明年同一天”这类日历计算，应使用 `AddDate`：

```go
// AddDate 按日历规则增加年、月、日，适合“下个月”这样的业务语义。
nextMonth := now.AddDate(0, 1, 0)
nextYear := now.AddDate(1, 0, 0)
```

### 2. `Sub`、`Since` 和 `Until`

```go
// 记录开始时间，再用 Since 计算已耗时。
start := time.Now()
time.Sleep(120 * time.Millisecond)
elapsed := time.Since(start)
fmt.Println(elapsed)
```

`time.Since(start)` 等价于 `time.Now().Sub(start)`。

```go
// Until 返回 deadline 距离当前时刻的剩余 Duration。
deadline := time.Now().Add(5 * time.Minute)
fmt.Println(time.Until(deadline))
```

### 3. 比较时间先后

```go
// 基于同一时刻创建一小时后的比较对象。
t1 := time.Now()
t2 := t1.Add(time.Hour)

fmt.Println(t1.Before(t2)) // true
fmt.Println(t2.After(t1))  // true
fmt.Println(t1.Equal(t2))  // false
```

`Equal` 判断两个值是否表示同一个时间点，即使它们使用不同的时区显示：

```go
// 两个值以不同时区显示同一个瞬间。
utc := time.Date(2026, 7, 15, 6, 0, 0, 0, time.UTC)
shanghai := time.Date(
    2026,
    7,
    15,
    14,
    0,
    0,
    0,
    time.FixedZone("UTC+8", 8*60*60),
)

fmt.Println(utc.Equal(shanghai)) // true
fmt.Println(utc == shanghai)     // 通常为 false
```

业务逻辑中通常使用 `Equal`、`Before` 或 `After`，不要用 `==` 代替时间点比较。

## 14.2.6 时区与 `Location`

```go
// UTC 只改变显示位置，不改变 now 代表的瞬间。
now := time.Now()

fmt.Println("本地时间：", now)
fmt.Println("UTC 时间：", now.UTC())
fmt.Println("Location：", now.Location())
```

使用 `time.LoadLocation` 加载 IANA 时区：

```go
// 分别加载上海和纽约的 IANA 时区规则。
shanghai, err := time.LoadLocation("Asia/Shanghai")
if err != nil {
    panic(err)
}

newYork, err := time.LoadLocation("America/New_York")
if err != nil {
    panic(err)
}

now := time.Now()
fmt.Println("上海：", now.In(shanghai))
fmt.Println("纽约：", now.In(newYork))
```

`In` 只改变时间的显示时区，不会改变它代表的瞬间。

某些精简系统或容器可能没有完整的时区数据库，主程序可以按需内置：

```go
// 空白导入把时区数据库编入可执行文件，供精简容器环境使用。
import _ "time/tzdata"
```

## 14.2.7 时间格式化

Go 不使用 `YYYY-MM-DD` 这样的占位符，而是使用一个固定的参考时间：

```text
Mon Jan 2 15:04:05 MST 2006
```

常用的完整参考格式为：

```text
2006-01-02 15:04:05 -0700 MST
```

这里的参考时间只是格式模板，并不是 Go 语言的“诞生时间”。

```go
// Layout 中的数字来自固定参考时间，不能写成 YYYY-MM-DD。
now := time.Now()

fmt.Println(now.Format("2006-01-02 15:04:05"))
fmt.Println(now.Format("2006/01/02 15:04"))
fmt.Println(now.Format("15:04 2006/01/02"))
fmt.Println(now.Format("2006-01-02 03:04:05 PM"))
fmt.Println(now.Format("2006-01-02 15:04:05.000"))
```

- `15` 表示 24 小时制；
- `03` 表示 12 小时制，通常配合 `PM` 使用；
- `.000` 表示固定保留三位小数秒；
- `.999` 会省略末尾多余的零。

标准库提供了常用布局常量：

| 常量               | 典型格式                    |
| ------------------ | --------------------------- |
| `time.DateOnly`    | `2006-01-02`                |
| `time.TimeOnly`    | `15:04:05`                  |
| `time.DateTime`    | `2006-01-02 15:04:05`       |
| `time.RFC3339`     | `2006-01-02T15:04:05Z07:00` |
| `time.RFC3339Nano` | 带纳秒精度的 RFC 3339       |
| `time.RFC822`      | RFC 822 格式                |
| `time.UnixDate`    | Unix 风格日期               |

程序之间交换时间时，通常优先使用带时区信息的 `time.RFC3339` 或 `time.RFC3339Nano`。

## 14.2.8 解析字符串时间

格式化使用 `Time.Format`，解析使用 `time.Parse` 或 `time.ParseInLocation`。布局必须与输入字符串的结构一致。

### 1. 使用 `time.Parse`

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // input 与 layout 的字段顺序、分隔符必须一致。
    input := "2026-07-15 14:35"
    layout := "2006-01-02 15:04"

    // Parse 对不含时区的输入按 UTC 解释。
    t, err := time.Parse(layout, input)
    if err != nil {
        fmt.Println("解析失败：", err)
        return
    }

    fmt.Println("解析结果：", t)
    fmt.Println("重新格式化：", t.Format(time.RFC822))
    fmt.Println("仅日期：", t.Format(time.DateOnly))
}
```

输入字符串不包含时区信息时，`time.Parse` 会将其解释为 UTC，而不是本地时间。

### 2. 使用 `time.ParseInLocation`

如果无时区字符串表示某个指定地区的本地时间，应使用 `ParseInLocation`：

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // 先加载无时区输入实际所属的业务时区。
    loc, err := time.LoadLocation("Asia/Shanghai")
    if err != nil {
        fmt.Println("加载时区失败：", err)
        return
    }

    input := "2026/07/15 14:35:20"
    layout := "2006/01/02 15:04:05"

    // ParseInLocation 把输入按 loc 的本地时间解析。
    t, err := time.ParseInLocation(layout, input, loc)
    if err != nil {
        fmt.Println("解析失败：", err)
        return
    }

    fmt.Println("上海时间：", t)
    fmt.Println("UTC 时间：", t.UTC())
}
```

输入已经包含时区偏移时，可以直接使用标准布局：

```go
// RFC3339 文本自身带有 +08:00 偏移，因此无需额外 Location。
input := "2026-07-15T14:35:20+08:00"
t, err := time.Parse(time.RFC3339, input)
```

## 14.2.9 休眠、定时器与周期任务

### 1. `time.Sleep`

```go
// Sleep 只挂起当前 goroutine，不会阻塞其他 goroutine。
fmt.Println("开始")
time.Sleep(2 * time.Second)
fmt.Println("两秒后继续")
```

`Sleep` 只会暂停当前 goroutine，不会阻塞整个 Go 运行时中的其他 goroutine。

### 2. 一次性定时器 `Timer`

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // NewTimer 创建一次性定时器，其触发时间会发送到 C。
    timer := time.NewTimer(2 * time.Second)
    // 如果提前返回，Stop 可释放尚未触发的定时器资源。
    defer timer.Stop()

    fmt.Println("等待定时器触发")
    // 接收 C 会阻塞，直到定时器到期。
    t := <-timer.C
    fmt.Println("触发时间：", t)
}
```

只需要等待一次结果时，也可以使用 `time.After`：

```go
// After 返回在指定时长后发送一次值的只读通道。
select {
case <-time.After(2 * time.Second):
    fmt.Println("超时")
}
```

### 3. 周期任务 `Ticker`

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // NewTicker 按固定周期向 C 发送时间值。
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()

    // done 在五秒后触发，用作停止整个周期任务的信号。
    done := time.After(5 * time.Second)

    for {
        select {
        case t := <-ticker.C:
            // 每次收到 tick 时执行周期工作。
            fmt.Println("执行周期任务：", t)
        case <-done:
            // 停止 ticker 后退出循环，避免后台持续发送 tick。
            fmt.Println("任务结束")
            return
        }
    }
}
```

`ticker.C` 是只读通道。接收方处理过慢时，`Ticker` 可能调整或丢弃部分 tick，因此它并不保证所有周期都被完整积压。

只需要周期通道时也可以使用 `time.Tick`：

```go
// Tick 不能主动停止，适用于与程序同寿命的极简场景。
ticks := time.Tick(time.Second)
for t := range ticks {
    fmt.Println(t)
}
```

需要主动停止、重置周期或明确管理生命周期时，应使用 `time.NewTicker`。

## 14.2.10 时间处理建议

1. **明确时间单位。** 变量名中可以包含 `Seconds`、`Millis` 等单位，避免秒、毫秒和纳秒混用。
2. **明确时区。** 解析不带时区的输入时，应确定它代表本地时间、UTC 还是某个业务时区。
3. **跨系统传输优先使用 RFC 3339。** 它包含明确的日期、时间和时区偏移。
4. **数据库中统一时间基准。** 常见做法是存储 UTC 时间或 Unix 时间戳，展示时再转换为用户时区。
5. **日历计算使用 `AddDate`。** “一个月后”不能简单等价为 `30 * 24 * time.Hour`。
6. **判断时间点是否相同使用 `Equal`。** 不要使用 `==` 替代业务意义上的时间比较。
7. **需要取消和超时时结合 `context.Context`。**
8. **始终检查解析错误。** 用户输入、配置和外部接口中的时间格式都可能不符合预期。



## 总结

使用 `time` 时要明确单位和时区：固定时长使用 `Duration` 与 `Add`，日历计算使用 `AddDate`；比较时间点使用 `Equal`、`Before`、`After`；跨系统交换时间优先使用 RFC 3339。创建可停止的定时任务时，记得停止 `Timer` 或 `Ticker`。
