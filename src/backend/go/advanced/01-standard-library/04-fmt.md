---
permalink: /backend/go/advanced/01-standard-library/04-fmt/
title: 04. fmt：格式化、错误包装与文本输入
shortTitle: 04. fmt
order: 4
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - fmt
  - 格式化
  - 错误处理
  - io.Writer
---

# 04. fmt：格式化、错误包装与文本输入

## 前言

fmt 是写 Go 时最早接触的包之一：打印日志、构造错误消息、输出调试对象都会用到它。但 fmt 的价值不止是 println。它负责把 Go 值格式化为文本，并将文本发送到终端、文件、网络连接或内存缓冲区，也能从简单文本中扫描值。

下面以“生成订单结算单”为例。结算单不直接写死到终端，而是接收 io.Writer：生产代码可传 HTTP 响应或文件，测试可传内存缓冲区。这种写法能让格式化逻辑复用且可验证。

## 输出目的地决定使用哪组函数

| 函数族 | 输出目的地 | 常用函数 | 场景 |
| --- | --- | --- | --- |
| Print | 标准输出 | Println、Printf | 临时命令行提示 |
| Fprint | 指定 io.Writer | Fprintln、Fprintf | 文件、HTTP、标准错误、缓冲区 |
| Sprint | 返回 string | Sprintf | 构造文本或错误信息 |
| Append | 追加到 []byte | Appendf | 已有字节缓冲区 |

名称最后的 f 表示使用格式字符串；ln 表示添加换行。不同函数族的格式规则相同，差别只是结果被送到哪里。

## 一个可复用的结算单

~~~go
package main

import (
	`bytes`
	`fmt`
	`io`
	`os`
)

type Order struct {
	ID          int64
	Customer    string
	AmountCents int64
	Paid        bool
}

// WriteReceipt 将结算单写入 w，不依赖具体文件、终端或 HTTP 实现。
// io.Writer 是“可写入字节”的接口；os.Stdout、*os.File、bytes.Buffer 都实现它。
func WriteReceipt(w io.Writer, order Order) error {
	// Fprintf 返回写入字节数和错误。写入文件或网络时必须检查错误，
	// 因为磁盘空间不足、客户端断开等情况都会使写入失败。
	if _, err := fmt.Fprintf(w, `订单号：%06d\n`, order.ID); err != nil {
		return fmt.Errorf(`write order ID: %w`, err)
	}
	if _, err := fmt.Fprintf(w, `客户：%s\n`, order.Customer); err != nil {
		return fmt.Errorf(`write customer: %w`, err)
	}
	if _, err := fmt.Fprintf(w, `金额：%.2f 元\n`, float64(order.AmountCents)/100); err != nil {
		return fmt.Errorf(`write amount: %w`, err)
	}
	if _, err := fmt.Fprintf(w, `状态：%t\n`, order.Paid); err != nil {
		return fmt.Errorf(`write status: %w`, err)
	}
	return nil
}

func main() {
	order := Order{ID: 42, Customer: `李雷`, AmountCents: 1299, Paid: true}

	// 终端也是 io.Writer。
	if err := WriteReceipt(os.Stdout, order); err != nil {
		fmt.Fprintln(os.Stderr, `输出结算单失败：`, err)
	}

	// 测试或构造 HTTP 响应时，使用内存缓冲区而不是捕获终端输出。
	var buffer bytes.Buffer
	if err := WriteReceipt(&buffer, order); err != nil {
		panic(err)
	}
	fmt.Printf(`内存中的结算单：%q\n`, buffer.String())
}
~~~

%06d 表示最小宽度为 6 的整数，并在左边补 0；%.2f 表示保留两位小数；%t 输出 true 或 false。金额在领域模型中保存为整数分，只有显示时才换算为元，避免浮点计算精度问题。

## Print、Printf 与 Println

~~~go
name, count := `Go`, 3

fmt.Print(`语言：`, name, `\n`)                 // 默认格式；不自动换行。
fmt.Println(`语言：`, name, `数量：`, count)     // 参数间加空格，末尾换行。
fmt.Printf(`语言：%s，数量：%d\n`, name, count) // 完全由格式字符串控制。
~~~

格式固定时优先使用 Printf 或 Fprintf，格式在代码里一目了然。调试复合对象时，先掌握下列动词即可：

| 目的 | 动词 | 说明 |
| --- | --- | --- |
| 默认显示 | %v | 使用值的默认格式 |
| 调试结构体 | %+v、%#v | 前者输出字段名，后者接近 Go 语法 |
| 查看类型 | %T | 输出动态类型 |
| 字符串 | %s、%q | %q 带引号并转义，适合排查空格和换行 |
| 数字 | %d、%x、%08d | 十进制、十六进制、左补零 |
| 浮点 | %f、%.2f、%g | 固定小数位或紧凑格式 |
| 字节 | %x、% X | 后者在字节之间添加空格 |

~~~go
type Config struct {
	Port  int
	Debug bool
}

cfg := Config{Port: 8080, Debug: true}
fmt.Printf(`%v\n`, cfg)  // {8080 true}
fmt.Printf(`%+v\n`, cfg) // {Port:8080 Debug:true}
fmt.Printf(`%#v\n`, cfg) // main.Config{Port:8080, Debug:true}
fmt.Printf(`%T\n`, cfg)  // main.Config

fmt.Printf(`|%-8s|\n`, `Go`)      // 左对齐：|Go      |
fmt.Printf(`|%08d|\n`, 123)       // 补零：|00000123|
fmt.Printf(`|%.3s|\n`, `Gopher`)  // 字符串按 rune 截断：|Gop|
fmt.Printf(`|%8.2f|\n`, 12.3456) // |   12.35|
fmt.Printf(`完成度：100%%\n`)      // %% 输出字面量百分号。
~~~

宽度是最小输出宽度，内容更长时不会被截断。若出现 %!d(string=...)、%!(EXTRA ...) 或 %!s(MISSING)，说明动词和参数的类型或数量不匹配。运行 go vet ./... 能发现很多此类错误。

## Sprintf、Appendf 和 Stringer

Sprintf 返回字符串；需要追加到已有字节缓冲区时使用 Appendf，避免先产生临时字符串再复制。

~~~go
requestID := `req-42`
message := fmt.Sprintf(`request_id=%s status=%d`, requestID, 200)

buf := make([]byte, 0, 64)
buf = fmt.Appendf(buf, `user=%q `, `alice`)
buf = fmt.Appendf(buf, `attempt=%d`, 3)
fmt.Println(message, string(buf))
~~~

若类型实现 String() string，fmt 在适用格式下会调用它。该方法应无副作用，并避免泄漏敏感数据。

~~~go
type Money int64 // 单位：分

func (m Money) String() string {
	// 转为基础类型，防止在 String 内再次格式化 Money 而递归调用 String。
	return fmt.Sprintf(`%.2f 元`, float64(m)/100)
}

var price Money = 1299
fmt.Println(price) // 12.99 元
~~~

## Errorf：增加上下文，同时保留错误判断

~~~go
package main

import (
	`errors`
	`fmt`
	`os`
)

func readConfig(path string) error {
	_, err := os.ReadFile(path)
	if err != nil {
		// %w 将原始错误放入错误链，调用者仍可用 errors.Is 判断它。
		return fmt.Errorf(`read config %q: %w`, path, err)
	}
	return nil
}

func main() {
	err := readConfig(`missing.yaml`)
	if errors.Is(err, os.ErrNotExist) {
		fmt.Println(`配置文件不存在：`, err)
	}
}
~~~

只有调用方需要识别底层错误时才使用 %w；若不应暴露内部细节，使用 %v。错误消息要提供操作和对象，例如 read config "app.yaml"，不要只重复一层 failed。

## 文本输入：Scan 的适用边界

Scan、Fscan、Sscan 都按空白字符分隔字段，目标必须传指针：

~~~go
reader := strings.NewReader(`alice 18 true`)
var name string
var age int
var active bool

// Fscan 从指定 Reader 读取，而 &name 等指针允许函数写入变量。
n, err := fmt.Fscan(reader, &name, &age, &active)
if err != nil {
	// 此处只演示扫描；真实函数应将错误返回给调用者。
	panic(fmt.Errorf(`scan input: %w`, err))
}
fmt.Printf(`读取 %d 项：name=%q age=%d active=%t\n`, n, name, age, active)
~~~

Scan 从标准输入读，Sscan 从字符串读，Scanf 用严格格式匹配。若要读取包含空格的一整行，应使用 bufio.Reader 或 bufio.Scanner：

~~~go
reader := bufio.NewReader(os.Stdin)
fmt.Print(`请输入备注：`)
line, err := reader.ReadString('\n') // 读到换行，保留用户输入中的空格。
if err != nil && !errors.Is(err, io.EOF) {
	panic(fmt.Errorf(`read note: %w`, err))
}
note := strings.TrimSpace(line) // 去掉行尾换行和两端空白。
~~~

## 总结

fmt 的关键是将“格式化”与“输出目的地”分开。固定文本用 Fprintf，构造字符串用 Sprintf 或 Appendf，错误上下文用 Errorf 的 %w，简单的空白分隔文本才使用 Scan 系列。让格式化函数接收 io.Writer，能显著提高复用性和可测试性。

## 参考资料

- [Go 官方 fmt 包文档](https://pkg.go.dev/fmt)
- [Go 官方 errors 包文档](https://pkg.go.dev/errors)
- [Go 官方 io 包文档](https://pkg.go.dev/io)
