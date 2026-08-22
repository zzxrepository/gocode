---
title: 09. strconv：基本类型与字符串转换
shortTitle: 09. strconv
order: 9
permalink: /backend/go/advanced/01-standard-library/09-strconv/
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - 标准库
---

# 09. strconv：基本类型与字符串转换

## 前言

配置、环境变量、命令行参数和 HTTP 请求传入的几乎都是字符串，而程序真正需要的是有边界、有类型的值。`strconv` 位于这条边界上：它把文本转换为整数、浮点数和布尔值，并把格式不合法、数值越界等问题明确地交给调用方处理。

它与 `fmt` 的职责不同：`fmt` 擅长把多个值组织成可读文本，并通过 `Fprint` 与 I/O 目标协作；`strconv` 专注于单个基本类型的精确解析和格式化。`flag`、环境变量和 HTTP 参数处理往往都需要这层转换，转换成功后还要继续做业务范围校验。

## `string` 与 `int` 之间的转换

### 字符串转换为整数

`strconv.Atoi` 将十进制整数字符串转换为 `int`：

```go
package main

import (
    "fmt"
    "strconv"
)

func main() {
    // 模拟从配置、请求参数等外部来源得到的文本。
    ageText := "20"

    // Atoi 只接受十进制整数字符串，失败时必须处理 err。
    age, err := strconv.Atoi(ageText)
    if err != nil {
        fmt.Println("年龄格式不正确：", err)
        return
    }

    // 验证转换后的 Go 类型和值。
    fmt.Printf("类型：%T，值：%d\n", age, age)
}
```

输出结果：

```text
类型：int，值：20
```

`Atoi` 只能解析合法的十进制整数。下面这些字符串都会转换失败：

```text
"12.5"
"20岁"
""
```

外部输入的格式不受程序控制，因此必须检查返回的 `error`。

### 整数转换为字符串

`strconv.Itoa` 将 `int` 转换为十进制字符串：

```go
// count 是普通 int；Itoa 将其编码为十进制文本。
count := 200
text := strconv.Itoa(count)

fmt.Printf("类型：%T，值：%q\n", text, text)
```

输出结果：

```text
类型：string，值："200"
```

不要使用 `string(n)` 将整数转换为数字文本：

```go
// 这里是反例：整数转 string 会被解释为 Unicode 码点。
text := string(65)
fmt.Println(text) // A
```

`string(65)` 会把 65 当作 Unicode 码点，得到字符 `A`，而不是字符串 `"65"`。数字转十进制字符串应使用 `strconv.Itoa`。

## 解析其他基本类型

当目标类型不是 `int` 时，可以使用 `Parse` 系列函数：

```go
package main

import (
    "fmt"
    "strconv"
)

func main() {
    // ParseBool 解析允许的布尔文本，例如 true、false、1、0。
    enabled, err := strconv.ParseBool("true")
    if err != nil {
        fmt.Println("解析布尔值失败：", err)
        return
    }

    // bitSize=64 表示按 float64 的精度范围解析。
    price, err := strconv.ParseFloat("19.95", 64)
    if err != nil {
        fmt.Println("解析浮点数失败：", err)
        return
    }

    // 10 是十进制，64 用于检查 int64 的取值范围。
    id, err := strconv.ParseInt("922337203685477580", 10, 64)
    if err != nil {
        fmt.Println("解析整数失败：", err)
        return
    }

    fmt.Printf("enabled=%t price=%.2f id=%d\n", enabled, price, id)
}
```

这几个函数都遵循相同的调用方式：

```go
// Parse 系列都返回“转换后的值 + 转换错误”。
value, err := strconv.ParseXxx(...)
if err != nil {
    // 输入格式错误或数值超出范围
}
```

### `ParseBool`

`ParseBool` 用于解析布尔值，常见输入包括：

```text
true、false、1、0、t、f
```

它不接受 `yes`、`no`、`on`、`off` 等写法。业务需要支持这些值时，应自行增加转换规则。

### `ParseInt`

`ParseInt` 用于解析有符号整数：

```go
// 将十进制文本解析为允许负数的 int64。
n, err := strconv.ParseInt("-128", 10, 64)
```

三个参数分别表示：

```go
strconv.ParseInt(字符串, 进制, 位数)
```

- **进制**：普通业务数据通常使用 `10`；
- **位数**：常用 `32` 或 `64`，用于检查结果是否超出对应整数类型的范围；
- **返回值**：始终是 `int64`，需要较小类型时，在解析成功后再转换。

例如，将字符串安全地解析为 `int32`：

```go
// bitSize=32 先保证文本落在 int32 可表示的范围内。
n64, err := strconv.ParseInt("2147483647", 10, 32)
if err != nil {
    fmt.Println("解析失败：", err)
    return
}

// 只有解析和范围检查成功后才缩窄为 int32。
n := int32(n64)
fmt.Println(n)
```

需要解析无符号整数时，可使用用法相同的 `ParseUint`，其返回值为 `uint64`，并且不接受负数。

当进制参数为 `0` 时，函数会根据前缀自动判断进制：

```go
// 进制为 0 时根据 0b、0x 等前缀自动识别；示例为简洁省略错误处理。
binary, _ := strconv.ParseInt("0b1010", 0, 64)
hex, _ := strconv.ParseInt("0xff", 0, 64)

fmt.Println(binary, hex) // 10 255
```

除非业务明确允许二进制、八进制或十六进制输入，否则建议直接传入 `10`，代码意图更加清晰。

### `ParseFloat`

`ParseFloat` 用于解析浮点数：

```go
// 返回值始终是 float64；第二个参数控制解析精度和范围。
price, err := strconv.ParseFloat("19.95", 64)
```

第二个参数表示解析精度：

- `32`：按照 `float32` 的精度解析；
- `64`：按照 `float64` 的精度解析。

返回值始终为 `float64`。需要 `float32` 时，应在成功解析后转换：

```go
// bitSize=32 后仍返回 float64，需要时再显式转换。
value64, err := strconv.ParseFloat("3.14", 32)
if err != nil {
    fmt.Println(err)
    return
}

// 已验证范围后转换为目标的 float32 类型。
value := float32(value64)
```

## 将基本类型格式化为字符串

对于普通 `int`，使用 `Itoa` 即可。需要控制进制或浮点数精度时，再使用 `Format` 系列函数：

```go
// FormatBool 将布尔值转换为 "true" 或 "false"。
enabledText := strconv.FormatBool(true)
// 16 指定输出为十六进制文本。
hexText := strconv.FormatInt(255, 16)
// 'f' 是普通小数形式，2 表示保留两位小数，64 对应 float64。
priceText := strconv.FormatFloat(19.956, 'f', 2, 64)

fmt.Println(enabledText) // true
fmt.Println(hexText)     // ff
fmt.Println(priceText)   // 19.96
```

`FormatInt` 的第二个参数表示进制：

```go
strconv.FormatInt(255, 2)  // "11111111"
strconv.FormatInt(255, 10) // "255"
strconv.FormatInt(255, 16) // "ff"
```

`FormatFloat` 的常见写法如下：

```go
// 固定保留两位小数
s1 := strconv.FormatFloat(19.956, 'f', 2, 64)

// 使用能够准确表示该值的必要位数
s2 := strconv.FormatFloat(19.956, 'f', -1, 64)
```

它的参数依次表示：

```go
strconv.FormatFloat(数值, 格式, 精度, 位数)
```

实际开发通常只需要了解三种格式：

| 格式  | 作用                     |
| ----- | ------------------------ |
| `'f'` | 普通小数形式，最常用     |
| `'e'` | 科学计数法               |
| `'g'` | 自动选择较紧凑的表示形式 |

对于金额等要求精确的小数计算，不应直接依赖 `float64`。常见做法是使用整数保存最小货币单位，例如用“分”而不是“元”存储金额。

## 转换错误的处理

字符串来自用户输入、环境变量、配置文件或外部接口时，都不能假设它一定合法：

```go
// 模拟非法的外部端口参数。
portText := "abc"

// 失败时不能继续把 port 当作有效业务数据使用。
port, err := strconv.Atoi(portText)
if err != nil {
    fmt.Printf("端口号 %q 格式不正确：%v\n", portText, err)
    return
}

fmt.Println(port)
```

转换失败主要有两类原因：

- **格式错误**：字符串不是目标类型的合法表示，例如将 `"12.5"` 转换为整数；
- **范围错误**：字符串是合法数字，但超出了目标类型能够表示的范围。

大多数业务代码只需要检查 `err != nil`，并补充清晰的上下文信息：

```go
// %w 保留底层转换错误，调用方仍可沿错误链判断原因。
count, err := strconv.Atoi(input)
if err != nil {
    return fmt.Errorf("解析商品数量 %q 失败：%w", input, err)
}
```

只有业务确实需要区分格式错误和范围错误时，才需要进一步判断 `strconv.ErrSyntax` 和 `strconv.ErrRange`，没有必要在基础代码中直接操作 `strconv.NumError`。

## 实际示例：解析分页参数

下面的函数将字符串转换为正整数；参数为空、格式错误或小于等于 0 时，返回默认值：

```go
package main

import (
    "fmt"
    "strconv"
)

func parsePositiveInt(text string, defaultValue int) int {
    // 空参数按业务约定使用默认值。
    if text == "" {
        return defaultValue
    }

    // Atoi 只负责语法转换；正数约束仍需业务代码检查。
    value, err := strconv.Atoi(text)
    if err != nil || value <= 0 {
        return defaultValue
    }

    // 只有合法的正整数才作为最终结果返回。
    return value
}

func main() {
    // 合法文本保留其值；非法文本回退到默认分页大小。
    page := parsePositiveInt("2", 1)
    pageSize := parsePositiveInt("invalid", 20)

    fmt.Printf("page=%d pageSize=%d\n", page, pageSize)
}
```

输出结果：

```text
page=2 pageSize=20
```

在真实项目中，还应限制 `pageSize` 的最大值，防止客户端传入过大的分页参数。

## 使用建议

1. 十进制 `string` 与 `int` 互转，优先使用 `Atoi` 和 `Itoa`。
2. 解析布尔值、浮点数、`int64` 或其他进制时，使用对应的 `Parse` 函数。
3. 只有需要控制进制或浮点数精度时，才使用对应的 `Format` 函数。
4. 外部输入的转换错误必须处理，不能随意使用 `_` 丢弃。
5. `bitSize` 用于限制和检查数值范围，不代表函数的实际返回类型。
6. 不要使用 `string(intValue)` 将整数转换为十进制文本。
7. `Append`、`Quote`、`Unquote`、`IsPrint`、`CanBackquote` 等低频 API 不需要在基础教程中逐个学习，用到时查阅官方文档即可。

更多功能可查看 [`strconv` 官方文档](https://pkg.go.dev/strconv)。



## 总结

`strconv` 是文本边界上的类型守门人：十进制 `string` 与 `int` 的常见互转使用 `Atoi` 与 `Itoa`；其他类型、进制或精度要求使用 `Parse` 和 `Format` 系列。它解决基本类型的语法与范围问题，`fmt` 解决复杂文本的组织，二者不应混用。

外部文本转换后不能只看 `err == nil`，还要继续验证业务范围，例如端口是否有效、分页大小是否过大。尤其不要用 `string(intValue)` 生成十进制数字文本，它表达的是 Unicode 码点转换；需要数字文本时使用 `Itoa` 或对应的 `Format` 函数。
