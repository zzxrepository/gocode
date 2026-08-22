---
permalink: /backend/go/advanced/01-standard-library/05-time/
title: 05. time：时间点、时区、解析与定时任务
shortTitle: 05. time
order: 5
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - time
  - 时区
  - 定时器
  - Ticker
  - 时间解析
---

# 05. time：时间点、时区、解析与定时任务

## 前言

时间代码的难点不是调用 time.Now，而是先定义语义：用户输入的“2026-08-22 09:00”是 UTC、服务器本地时间还是上海时间？一个月后能不能当作 30 天？周期任务会不会漏执行？

这里用“限时活动窗口”贯穿示例：管理员输入上海本地开始和结束时间；服务端将它们转为可比较的时间点；接口以 RFC 3339 返回；后台周期任务清理已结束活动。

## 三个核心类型

| 类型 | 含义 | 示例 |
| --- | --- | --- |
| time.Time | 一个具体瞬间 | 2026-08-22 09:00 +08:00 |
| time.Duration | 固定时长，底层单位纳秒 | 500ms、3s、2h |
| time.Location | 时区规则，用于解释和显示 | UTC、Asia/Shanghai |

Time 回答“什么时候”，Duration 回答“多久”，Location 决定同一瞬间显示为当地哪一天和几点。三者不能混用。

## 先实现活动窗口

~~~go
package main

import (
	`fmt`
	`time`
)

const adminLayout = `2006-01-02 15:04`

type Campaign struct {
	Name     string
	StartsAt time.Time
	EndsAt   time.Time
}

// NewCampaign 将管理员输入的“上海墙上时间”解析为带时区的时间点。
func NewCampaign(name, startText, endText string) (Campaign, error) {
	shanghai, err := time.LoadLocation(`Asia/Shanghai`)
	if err != nil {
		return Campaign{}, fmt.Errorf(`load Shanghai location: %w`, err)
	}

	// 输入没有偏移量；ParseInLocation 明确它应按上海时间解释。
	start, err := time.ParseInLocation(adminLayout, startText, shanghai)
	if err != nil {
		return Campaign{}, fmt.Errorf(`parse start %q: %w`, startText, err)
	}
	end, err := time.ParseInLocation(adminLayout, endText, shanghai)
	if err != nil {
		return Campaign{}, fmt.Errorf(`parse end %q: %w`, endText, err)
	}
	if !end.After(start) {
		return Campaign{}, fmt.Errorf(`end time must be after start time`)
	}
	return Campaign{Name: name, StartsAt: start, EndsAt: end}, nil
}

// 让 now 成为参数，边界清晰且无需等待真实时钟就能测试。
func (c Campaign) IsActive(now time.Time) bool {
	return !now.Before(c.StartsAt) && now.Before(c.EndsAt)
}

func main() {
	campaign, err := NewCampaign(`夏季活动`, `2026-08-22 09:00`, `2026-08-23 18:00`)
	if err != nil {
		panic(err)
	}
	// RFC3339 带时区偏移，适合 API、日志和跨系统交换。
	fmt.Println(campaign.StartsAt.Format(time.RFC3339))
	fmt.Println(campaign.IsActive(time.Now()))
}
~~~

若用 time.Parse(adminLayout, text)，没有时区的输入会被当作 UTC；对“上海 09:00”是错误语义。无时区文本而业务时区明确时，应使用 ParseInLocation。

## 创建、转换与比较

~~~go
shanghai, _ := time.LoadLocation(`Asia/Shanghai`)

// 构造业务时间时显式指定 Location，避免依赖部署机器的本地时区。
t := time.Date(2026, time.August, 22, 9, 0, 0, 0, shanghai)
fmt.Println(t.Format(time.RFC3339))       // 2026-08-22T09:00:00+08:00
fmt.Println(t.UTC().Format(time.RFC3339)) // 2026-08-22T01:00:00Z

millis := t.UnixMilli()         // 时间戳必须在变量名和协议中明确单位。
restored := time.UnixMilli(millis)
fmt.Println(restored.Equal(t)) // true：同一瞬间。
~~~

比较时间点使用 Equal、Before、After，不要把 == 当作业务上的“同一瞬间”：

~~~go
utc := time.Date(2026, 8, 22, 1, 0, 0, 0, time.UTC)
cn := time.Date(2026, 8, 22, 9, 0, 0, 0, time.FixedZone(`UTC+8`, 8*60*60))

fmt.Println(utc.Equal(cn)) // true
fmt.Println(utc == cn)     // 不应用作时间点业务比较。
~~~

## Duration、固定时长与日历计算

Duration 的底层单位是纳秒，因此每一处都要写单位：

~~~go
timeout := 3 * time.Second
retryInterval := 500 * time.Millisecond
cacheTTL := 15 * time.Minute

time.Sleep(3)               // 只休眠 3 纳秒，几乎等于没有等待。
time.Sleep(3 * time.Second) // 单位明确。

d, err := time.ParseDuration(`1h30m`)
if err != nil {
	// 配置加载函数中应将此错误向上返回；这里用 panic 保持片段可直接运行。
	panic(fmt.Errorf(`parse duration: %w`, err))
}
fmt.Println(timeout, retryInterval, cacheTTL, d)
~~~

Add 用于固定时长；AddDate 用于日历概念。一个月不是固定 30 天，夏令时地区的一天也不总是 24 小时。

~~~go
now := time.Now()
afterNinetyMinutes := now.Add(90 * time.Minute) // 固定时长。
nextMonth := now.AddDate(0, 1, 0)                // 日历上的下个月。
fmt.Println(afterNinetyMinutes, nextMonth)
~~~

## 格式化和解析

Go 的布局不是 YYYY-MM-DD，而是参考时间：

~~~text
Mon Jan 2 15:04:05 MST 2006
~~~

~~~go
now := time.Now()
fmt.Println(now.Format(time.DateOnly))
fmt.Println(now.Format(time.DateTime))
fmt.Println(now.Format(time.RFC3339))
fmt.Println(now.Format(`2006/01/02 03:04 PM`)) // 12 小时制用 03 配 PM。
~~~

| 输入 | 解析方法 | 原因 |
| --- | --- | --- |
| 2026-08-22T09:00:00+08:00 | time.Parse | 文本已携带偏移 |
| 2026-08-22 09:00 | ParseInLocation | 程序必须给出业务时区 |
| 无时区且要按 UTC 解释 | time.Parse | Parse 的默认语义 |

跨系统传递优先使用 RFC3339 或 RFC3339Nano；数据库可统一存 UTC，展示时再 In(userLocation)。

## Timer、Ticker 与取消

time.After 适合一次性 select 超时；需要停止或明确生命周期时使用 Timer。

~~~go
func waitRetry(ctx context.Context, delay time.Duration) error {
	timer := time.NewTimer(delay)
	defer timer.Stop() // 提前取消时释放仍未触发的定时器。

	select {
	case <-ctx.Done():
		return ctx.Err() // 调用方不再等待时立即返回。
	case <-timer.C:
		return nil // 等待结束，调用方可继续下一次尝试。
	}
}
~~~

周期任务使用 NewTicker，并始终停止它：

~~~go
func RunCleanup(ctx context.Context, every time.Duration, clean func(time.Time)) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()

	for {
		select {
		case now := <-ticker.C:
			// Ticker 只给出周期信号；处理太慢时 tick 可能被合并或丢弃。
			// 它不是保证每次任务都执行的可靠队列。
			clean(now)
		case <-ctx.Done():
			return
		}
	}
}
~~~

若任务必须补跑，需持久化计划状态并设计幂等补偿；Ticker 不能替代可靠调度系统。

## 测试时间边界

~~~go
func ExampleCampaign_IsActive() {
	campaign, _ := NewCampaign(`夏季活动`, `2026-08-22 09:00`, `2026-08-23 18:00`)
	shanghai, _ := time.LoadLocation(`Asia/Shanghai`)

	before := time.Date(2026, 8, 22, 8, 59, 0, 0, shanghai)
	atStart := time.Date(2026, 8, 22, 9, 0, 0, 0, shanghai)
	atEnd := time.Date(2026, 8, 23, 18, 0, 0, 0, shanghai)

	fmt.Println(campaign.IsActive(before), campaign.IsActive(atStart), campaign.IsActive(atEnd))
	// Output: false true false
}
~~~

## 总结

时间代码先定义语义，再选择 API：Time 表示瞬间，Duration 表示固定时长，Location 解释当地时间。无时区文本使用 ParseInLocation，跨系统使用 RFC3339，日历计算用 AddDate，时间点比较用 Equal、Before、After。

Timer 和 Ticker 只提供时间信号，不能替代取消控制、幂等设计和可靠调度。将 now 作为业务函数参数，能让时间逻辑清晰并可测试。

## 参考资料

- [Go 官方 time 包文档](https://pkg.go.dev/time)
- [Go 官方 time/tzdata 包文档](https://pkg.go.dev/time/tzdata)
- [Go 官方 context 包文档](https://pkg.go.dev/context)
