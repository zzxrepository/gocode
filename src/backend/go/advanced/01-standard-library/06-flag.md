---
permalink: /backend/go/advanced/01-standard-library/06-flag/
title: 06. flag：命令行参数、帮助与子命令
shortTitle: 06. flag
order: 6
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - flag
  - CLI
  - 命令行参数
  - FlagSet
---

# 06. flag：命令行参数、帮助与子命令

## 前言

服务端程序和脚本都需要从启动命令接收配置：端口、超时、日志级别、输入文件。flag 是 Go 标准库中处理这类简单、明确选项的工具。

这里实现 campaignctl 命令行工具：

~~~text
campaignctl create -name "夏季活动" -start "2026-08-22 09:00" -duration 9h
campaignctl show 42
~~~

create 是子命令，后面带自己的选项；show 接收一个位置参数。这个结构覆盖了服务和脚本最常见的参数组织方式。

## os.Args 与最小 flag 示例

操作系统会将命令拆成字符串放在 os.Args：os.Args[0] 是程序路径，os.Args[1:] 才是用户输入。少量无名称参数可以直接读取切片；有默认值、帮助、类型转换时交给 flag。

~~~go
package main

import (
	`flag`
	`fmt`
	`time`
)

func main() {
	// 返回指针的定义方式适合选项较少的程序。
	port := flag.Int(`port`, 8080, `HTTP 监听端口`)
	debug := flag.Bool(`debug`, false, `启用调试日志`)
	timeout := flag.Duration(`timeout`, 3*time.Second, `请求超时，例如 500ms 或 3s`)

	// 所有选项定义完再 Parse；此前变量仍是默认值。
	flag.Parse()

	fmt.Printf(`port=%d debug=%t timeout=%s\n`, *port, *debug, *timeout)
	fmt.Printf(`positionals=%q\n`, flag.Args()) // 未被解析为选项的剩余参数。
}
~~~

~~~bash
go run . -port=9000 -debug -timeout=800ms config.yaml
# port=9000 debug=true timeout=800ms
# positionals=["config.yaml"]
~~~

标准 flag 支持 -port=9000、--port=9000 和非布尔参数的 -port 9000。布尔参数 -debug 即为 true；写 false 时使用 -debug=false，不要写 -debug false，后者会把 false 作为位置参数。

flag 在第一个位置参数处停止解析。因此 app input.txt -port=9000 中的 port 不会生效；应把选项放在位置参数之前，或为子命令使用独立 FlagSet。

## 用 FlagSet 实现可测试的子命令

包级 flag.CommandLine 出错会直接输出并退出。子命令用 flag.NewFlagSet，选择 ContinueOnError，让调用方决定错误如何显示；解析函数也因此能被单元测试。

~~~go
package main

import (
	`bytes`
	`flag`
	`fmt`
	`io`
	`os`
	`time`
)

type CreateConfig struct {
	Name     string
	Start    string
	Duration time.Duration
}

// parseCreate 只解析和校验参数，不创建活动，也不调用 os.Exit。
// out 由调用者传入，测试可以使用 bytes.Buffer 捕获帮助文本。
func parseCreate(args []string, out io.Writer) (CreateConfig, error) {
	fs := flag.NewFlagSet(`create`, flag.ContinueOnError)
	fs.SetOutput(out)

	var cfg CreateConfig
	fs.StringVar(&cfg.Name, `name`, ``, `活动名称（必填）`)
	fs.StringVar(&cfg.Start, `start`, ``, `开始时间，格式：2006-01-02 15:04`)
	fs.DurationVar(&cfg.Duration, `duration`, time.Hour, `活动时长，例如 30m、9h`)

	fs.Usage = func() {
		fmt.Fprintln(out, `用法：campaignctl create -name NAME -start TIME [-duration 1h]`)
		fs.PrintDefaults()
	}

	if err := fs.Parse(args); err != nil {
		return CreateConfig{}, fmt.Errorf(`parse create flags: %w`, err)
	}
	if fs.NArg() != 0 {
		return CreateConfig{}, fmt.Errorf(`create does not accept positionals: %q`, fs.Args())
	}
	if cfg.Name == `` || cfg.Start == `` {
		fs.Usage()
		return CreateConfig{}, fmt.Errorf(`name and start are required`)
	}
	if cfg.Duration <= 0 {
		return CreateConfig{}, fmt.Errorf(`duration must be positive`)
	}
	return cfg, nil
}

func main() {
	if len(os.Args) < 2 {
		printRootUsage(os.Stderr)
		os.Exit(2) // 2 通常表示命令行用法错误。
	}

	switch os.Args[1] {
	case `create`:
		cfg, err := parseCreate(os.Args[2:], os.Stderr)
		if err != nil {
			fmt.Fprintln(os.Stderr, `错误：`, err)
			os.Exit(2)
		}
		fmt.Printf(`创建活动：name=%q start=%q duration=%s\n`, cfg.Name, cfg.Start, cfg.Duration)

	case `show`:
		if err := runShow(os.Args[2:], os.Stdout); err != nil {
			fmt.Fprintln(os.Stderr, `错误：`, err)
			os.Exit(2)
		}

	default:
		fmt.Fprintf(os.Stderr, `未知子命令：%q\n`, os.Args[1])
		printRootUsage(os.Stderr)
		os.Exit(2)
	}
}

func runShow(args []string, out io.Writer) error {
	if len(args) != 1 {
		return fmt.Errorf(`用法：campaignctl show ID`)
	}
	// 省略数据库查询，只展示位置参数的校验与输出边界。
	_, err := fmt.Fprintf(out, `显示活动 ID=%s\n`, args[0])
	return err
}

func printRootUsage(out io.Writer) {
	fmt.Fprintln(out, `用法：campaignctl <create|show> [选项]`)
}

func ExampleParseCreate() {
	var output bytes.Buffer
	cfg, err := parseCreate(
		[]string{`-name`, `夏季活动`, `-start`, `2026-08-22 09:00`, `-duration`, `9h`},
		&output,
	)
	fmt.Println(err == nil, cfg.Name, cfg.Duration)
	// Output: true 夏季活动 9h0m0s
}
~~~

上例将“解析”与“执行”分开：parseCreate 直接接收 []string 和 io.Writer，main 只负责调度与退出码。这比把 flag.Parse、os.Exit、业务调用堆在一起更容易维护和测试。

## 位置参数、帮助和显式选项

| 方法 | 含义 |
| --- | --- |
| Args() | 所有位置参数 |
| Arg(i) | 第 i 个位置参数，越界为空字符串 |
| NArg() | 位置参数数量 |
| NFlag() | 用户显式设置的选项数量 |
| Visit(fn) | 遍历用户显式设置的选项 |

~~~go
fs := flag.NewFlagSet(`inspect`, flag.ContinueOnError)
level := fs.String(`level`, `info`, `日志级别`)
_ = fs.Parse([]string{`-level=debug`, `config.yaml`})

fmt.Println(*level)    // debug
fmt.Println(fs.NArg()) // 1
fmt.Println(fs.Args()) // [config.yaml]

fs.Visit(func(f *flag.Flag) {
	// 默认值不会出现在 Visit 中，只有用户明确传入的选项才会出现。
	fmt.Printf(`%s=%s\n`, f.Name, f.Value.String())
})
~~~

-h 或 -help 是 flag 的约定帮助选项。自定义 Usage 时应说明命令结构、必填项、参数单位和典型示例；帮助文本就是 CLI 的公开接口。

## 自定义参数类型

内置类型无法覆盖所有校验规则。例如日志级别必须是固定集合。实现 flag.Value 后，可在解析阶段完成转换和校验：

~~~go
type logLevel string

func (l *logLevel) String() string {
	return string(*l) // PrintDefaults 输出默认值时会调用 String。
}

func (l *logLevel) Set(value string) error {
	switch value {
	case `debug`, `info`, `warn`, `error`:
		*l = logLevel(value) // 仅验证成功后修改目标变量。
		return nil
	default:
		return fmt.Errorf(`invalid log level %q`, value)
	}
}

func parseLevel(args []string) (logLevel, error) {
	fs := flag.NewFlagSet(`app`, flag.ContinueOnError)
	level := logLevel(`info`)
	fs.Var(&level, `log-level`, `日志级别：debug|info|warn|error`)
	if err := fs.Parse(args); err != nil {
		return ``, err
	}
	return level, nil
}
~~~

复杂层级命令、Shell 自动补全和大量交叉校验可考虑第三方 CLI 框架；简单服务启动参数、脚本和内部工具优先使用标准 flag，依赖更少，行为也更透明。

## 总结

flag 处理的是启动时的文本输入，而不是最终业务配置。定义选项后调用 Parse，再对端口、路径、时间、枚举值做业务校验；位置参数和选项边界必须明确。有子命令或需要测试时，使用 FlagSet 加 ContinueOnError，将 os.Exit 留在 main。

将解析函数设计为接收 []string 和 io.Writer，可以保留标准库的简洁，同时得到可靠的帮助、错误处理和测试能力。

## 参考资料

- [Go 官方 flag 包文档](https://pkg.go.dev/flag)
- [Go 官方 os 包文档](https://pkg.go.dev/os)
- [Go 官方 time 包文档](https://pkg.go.dev/time)
