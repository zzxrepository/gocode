---
title: 06. flag：解析命令行参数
shortTitle: 06. flag
order: 6
permalink: /backend/go/advanced/01-standard-library/06-flag/
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - 标准库
---

# 06. flag：解析命令行参数

## 前言

命令行参数是程序启动时最直接的配置入口。操作系统只提供原始的 `os.Args` 字符串切片；`flag` 在它之上补齐选项名、默认值、类型转换和帮助信息，让脚本、开发工具和服务可以用一致的方式接收启动配置。

`flag` 只负责把启动文本解析成 Go 值，并不替代配置设计：`flag.Duration` 依赖 `time.Duration` 表示超时，解析结果通常汇入配置结构体，再交给服务初始化逻辑；端口范围、参数组合、配置文件路径是否存在等业务约束，仍必须由程序明确验证。

## 命令行参数与 `os.Args`

程序启动时，操作系统会把命令行参数传递给进程。Go 使用 `os.Args` 保存这些参数，其类型为 `[]string`：

- `os.Args[0]` 通常是程序的执行路径或名称；
- `os.Args[1:]` 是用户传入的参数。

```go
package main

import (
    "fmt"
    "os"
)

func main() {
    // os.Args[0] 是程序路径，后续元素才是用户给出的文本参数。
    for i, arg := range os.Args {
        fmt.Printf("os.Args[%d] = %q\n", i, arg)
    }
}
```

执行：

```bash
go run . hello world
```

可能得到：

```text
os.Args[0] = "/tmp/go-build.../exe/example"
os.Args[1] = "hello"
os.Args[2] = "world"
```

`os.Args` 适合参数很少、无需名称和默认值的场景。需要处理 `-port`、`-debug` 等选项时，应使用 `flag` 包。

## 定义并解析选项

### 返回指针的定义函数

```go
// 每个定义函数依次接收：选项名、默认值、帮助文本，并返回结果指针。
name := flag.String("name", "guest", "用户名")
age := flag.Int("age", 18, "年龄")
debug := flag.Bool("debug", false, "是否开启调试模式")
timeout := flag.Duration("timeout", 5*time.Second, "超时时间")
```

这些函数返回对应类型的指针。调用 `flag.Parse()` 后，通过解引用取得结果：

```go
// Parse 读取当前命令行并把结果写入上面的指针。
flag.Parse()
fmt.Println(*name, *age, *debug, *timeout)
```

### 将结果写入已有变量

```go
// 用已有变量接收参数，便于集中保存到后续的配置结构体。
var (
    name    string
    age     int
    debug   bool
    timeout time.Duration
)

// Var 形式的第一个参数是结果写入位置。
flag.StringVar(&name, "name", "guest", "用户名")
flag.IntVar(&age, "age", 18, "年龄")
flag.BoolVar(&debug, "debug", false, "是否开启调试模式")
flag.DurationVar(&timeout, "timeout", 5*time.Second, "超时时间")

// 所有选项定义完成后只解析一次。
flag.Parse()
```

配置项较多时，`TypeVar` 形式通常更便于将结果集中存入配置结构体。

## 常用参数类型

| 参数类型 | 常用函数                  | 示例                            |
| -------- | ------------------------- | ------------------------------- |
| 字符串   | `String`、`StringVar`     | `-name=alice`                   |
| 整数     | `Int`、`IntVar`           | `-port=8080`                    |
| 布尔值   | `Bool`、`BoolVar`         | `-debug`、`-debug=false`        |
| 浮点数   | `Float64`、`Float64Var`   | `-ratio=0.75`                   |
| 时间间隔 | `Duration`、`DurationVar` | `-timeout=3s`、`-timeout=1m30s` |

`Duration` 参数使用与 `time.ParseDuration` 相同的格式。

## 参数写法与解析规则

标准库 `flag` 支持以下形式：

```text
-flag
--flag
-flag=value
--flag=value
-flag value    # 仅适用于非布尔参数
```

对于布尔参数：

- `-debug` 表示设置为 `true`；
- 明确设置为 `false` 时应写成 `-debug=false`；
- 不应写成 `-debug false`，因为 `false` 会被当成普通位置参数。

`flag` 遇到第一个非选项参数后会停止解析，也可以使用 `--` 显式结束选项部分。

## 获取位置参数

调用 `flag.Parse()` 后，可以读取未被解析为选项的参数：

| 函数           | 作用                                      |
| -------------- | ----------------------------------------- |
| `flag.Args()`  | 返回全部位置参数                          |
| `flag.Arg(i)`  | 返回第 `i` 个位置参数，越界时返回空字符串 |
| `flag.NArg()`  | 返回位置参数数量                          |
| `flag.NFlag()` | 返回用户实际设置的选项数量                |

```go
// Parse 之后，未被识别为选项的内容成为位置参数。
flag.Parse()

// Args、NArg、NFlag 分别读取全部位置参数、数量和已设置选项数。
fmt.Println("位置参数：", flag.Args())
fmt.Println("位置参数数量：", flag.NArg())
fmt.Println("已设置选项数量：", flag.NFlag())
```

## 完整示例

```go
package main

import (
    "flag"
    "fmt"
    "time"
)

type config struct {
    name    string
    port    int
    debug   bool
    timeout time.Duration
}

func main() {
    // cfg 统一承载经过解析的启动配置。
    var cfg config

    // 将每个命令行选项绑定到 cfg 的对应字段。
    flag.StringVar(&cfg.name, "name", "server", "服务名称")
    flag.IntVar(&cfg.port, "port", 8080, "监听端口")
    flag.BoolVar(&cfg.debug, "debug", false, "开启调试模式")
    flag.DurationVar(&cfg.timeout, "timeout", 5*time.Second, "请求超时时间")
    // 必须在读取 cfg 字段前完成解析。
    flag.Parse()

    fmt.Printf(
        "name=%s port=%d debug=%t timeout=%s\n",
        cfg.name,
        cfg.port,
        cfg.debug,
        cfg.timeout,
    )
    // 例如 config.yaml 这类不带 - 前缀的参数会保留在 Args 中。
    fmt.Println("位置参数：", flag.Args())
}
```

运行：

```bash
go run . -name=user-api -port=9000 -debug -timeout=3s config.yaml
```

使用 `-h` 或 `--help` 可以查看自动生成的帮助信息。

## 使用 `FlagSet` 处理子命令

当程序需要 `serve`、`version` 等子命令时，可以为不同子命令创建独立的 `FlagSet`：

```go
package main

import (
    "flag"
    "fmt"
    "os"
)

func main() {
    // 至少需要一个子命令；没有时给出用法并以错误码退出。
    if len(os.Args) < 2 {
        fmt.Fprintln(os.Stderr, "用法：app <serve|version>")
        os.Exit(2)
    }

    // 第一个用户参数决定应该使用哪套 FlagSet。
    switch os.Args[1] {
    case "serve":
        // serve 拥有独立的选项集合，不会与其他子命令混淆。
        serveFlags := flag.NewFlagSet("serve", flag.ExitOnError)
        port := serveFlags.Int("port", 8080, "监听端口")
        // 子命令名之后的参数才属于 serve 的选项。
        serveFlags.Parse(os.Args[2:])

        fmt.Println("启动服务，端口：", *port)

    case "version":
        fmt.Println("v1.0.0")

    default:
        fmt.Fprintf(os.Stderr, "未知子命令：%s\n", os.Args[1])
        os.Exit(2)
    }
}
```

命令层级很深、需要自动补全或复杂帮助页面时，再考虑专门的第三方 CLI 框架。

## 使用建议

1. 小型工具、脚本和服务启动参数可以直接使用 `flag`。
2. 参数较多时，将结果写入配置结构体。
3. 帮助文本应说明用途、默认值和单位。
4. 端口、并发数等参数仍需进行业务范围校验。
5. 注意标准 `flag` 在第一个位置参数处停止解析的规则。



## 总结

`flag` 的位置在启动链路中很明确：`os.Args` 提供原始文本，`flag` 解析选项和位置参数，配置结构体承接结果，业务代码完成最终校验。少量参数可以使用返回指针的定义函数；参数较多时，使用 `*Var` 形式直接写入配置结构体会更易维护。

调用 `Parse` 后再读取值和位置参数，并牢记布尔参数与第一个位置参数会影响解析行为。`flag` 保证的是语法和基本类型的正确性；端口范围、路径可用性、参数之间的依赖关系仍属于业务校验，不能因为解析成功就省略。
