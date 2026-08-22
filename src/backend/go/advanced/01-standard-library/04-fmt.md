---
title: 04. fmt：格式化输入与输出
shortTitle: 04. fmt
order: 4
permalink: /backend/go/advanced/01-standard-library/04-fmt/
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - 标准库
---

# 04. fmt：格式化输入与输出

## 前言

`fmt` 负责把 Go 值与文本相互转换：向终端显示、向文件写入、拼接错误信息、读取简单输入，都会遇到它。它解决的是“如何表示和读写文本”的问题，而不是“如何管理数据目的地”的问题。

与 `io` 的关系尤其重要：`fmt.Fprint` 接收 `io.Writer`，因此同一套格式化逻辑可以写到终端、文件、网络连接或内存缓冲区；`fmt.Fscan` 接收 `io.Reader`，可以从这些来源读取数据。`strconv` 更适合基本类型的严格转换，`fmt` 则适合包含多个值、格式模板和可读文本的场景。理解这条边界，才能自然地选对 API。

## `fmt` 包概述

`fmt` 包实现了格式化输入与输出，常用函数可以分为以下几组：

| 函数组        | 主要作用                  | 典型函数                        |
| ------------- | ------------------------- | ------------------------------- |
| `Print` 系列  | 输出到标准输出            | `Print`、`Printf`、`Println`    |
| `Fprint` 系列 | 输出到指定的 `io.Writer`  | `Fprint`、`Fprintf`、`Fprintln` |
| `Sprint` 系列 | 格式化并返回字符串        | `Sprint`、`Sprintf`、`Sprintln` |
| `Errorf`      | 构造格式化错误            | `Errorf`                        |
| `Scan` 系列   | 从标准输入读取            | `Scan`、`Scanf`、`Scanln`       |
| `Fscan` 系列  | 从指定的 `io.Reader` 读取 | `Fscan`、`Fscanf`、`Fscanln`    |
| `Sscan` 系列  | 从字符串读取              | `Sscan`、`Sscanf`、`Sscanln`    |

函数名中的字母通常具有以下含义：

- `F`：操作对象由调用者提供，例如 `io.Writer` 或 `io.Reader`；
- `S`：返回字符串，或者从字符串中读取；
- `f`：使用格式字符串；
- `ln`：输出时追加换行，或者扫描时以换行为边界。

## `Print`、`Printf` 与 `Println`

这三个函数都将内容写入标准输出 `os.Stdout`：

```go
func Print(a ...any) (n int, err error)
func Printf(format string, a ...any) (n int, err error)
func Println(a ...any) (n int, err error)
```

它们的区别如下：

- `Print` 使用默认格式输出，不会自动换行；
- `Printf` 根据格式字符串输出，不会自动换行；
- `Println` 使用默认格式输出，在参数之间添加空格，并在末尾追加换行。

```go
package main

import "fmt"

func main() {
    // 示例数据分别用于字符串和整数占位符。
    name := "张三"
    age := 20

    // Print 不追加换行，因此把换行符作为普通参数传入。
    fmt.Print("姓名：", name, "，年龄：", age, "\n")
    // Printf 按 %s、%d 精确控制输出格式。
    fmt.Printf("姓名：%s，年龄：%d\n", name, age)
    // Println 自动在参数之间加空格，并在末尾追加换行。
    fmt.Println("姓名：", name, "年龄：", age)
}
```

输出结果：

```text
姓名：张三，年龄：20
姓名：张三，年龄：20
姓名： 张三 年龄： 20
```

对于结构固定、需要精确控制格式的输出，通常使用 `Printf`；只需要简单打印一行内容时，可以使用 `Println`。

## `Fprint`：写入指定的 `io.Writer`

`Fprint` 系列函数将内容写入调用者提供的 `io.Writer`：

```go
func Fprint(w io.Writer, a ...any) (n int, err error)
func Fprintf(w io.Writer, format string, a ...any) (n int, err error)
func Fprintln(w io.Writer, a ...any) (n int, err error)
```

文件、标准输出、标准错误、网络连接和内存缓冲区等类型都可以实现 `io.Writer`。

```go
package main

import (
    "fmt"
    "os"
)

func main() {
    // 目标可以是任意 io.Writer；这里先写到标准输出。
    fmt.Fprintln(os.Stdout, "写入标准输出")

    // 以创建、只写、追加方式打开，避免覆盖旧文件内容。
    file, err := os.OpenFile(
        "example.txt",
        os.O_CREATE|os.O_WRONLY|os.O_APPEND,
        0o644,
    )
    if err != nil {
        fmt.Fprintln(os.Stderr, "打开文件失败：", err)
        return
    }
    // 成功打开后延迟关闭文件，释放文件描述符。
    defer file.Close()

    // Fprintf 的返回错误反映写入目标是否成功。
    if _, err := fmt.Fprintf(file, "用户名：%s\n", "张三"); err != nil {
        fmt.Fprintln(os.Stderr, "写入文件失败：", err)
    }
}
```

在真实项目中，向文件、网络连接等目标写入数据时，应检查函数返回的错误。

## `Sprint`：生成格式化字符串

`Sprint` 系列函数不会直接输出，而是返回生成后的字符串：

```go
func Sprint(a ...any) string
func Sprintf(format string, a ...any) string
func Sprintln(a ...any) string
```

```go
package main

import "fmt"

func main() {
    // Sprint 系列只构造字符串，不会直接输出。
    name := "张三"
    age := 20

    // 分别比较默认拼接、格式化拼接和自动换行的结果。
    s1 := fmt.Sprint("姓名：", name)
    s2 := fmt.Sprintf("姓名：%s，年龄：%d", name, age)
    s3 := fmt.Sprintln("姓名：", name, "年龄：", age)

    // %q 用引号和转义符显示字符串，便于观察末尾换行。
    fmt.Printf("%q\n", s1)
    fmt.Printf("%q\n", s2)
    fmt.Printf("%q\n", s3)
}
```

输出结果：

```text
"姓名：张三"
"姓名：张三，年龄：20"
"姓名： 张三 年龄： 20\n"
```

`Sprintln` 返回的字符串末尾包含换行符。需要构造包含多个字段的提示信息、错误信息或文件内容时，通常使用 `Sprintf`。

如果只是连续拼接大量普通字符串，应优先考虑 `strings.Builder`，避免反复创建临时字符串。

## 使用 `Errorf` 构造和包装错误

`fmt.Errorf` 根据格式字符串构造一个满足 `error` 接口的值：

```go
func Errorf(format string, a ...any) error
```

```go
// Errorf 按格式构造一个实现 error 接口的值。
err := fmt.Errorf("用户 %q 不存在", "张三")
fmt.Println(err)
```

使用 `%w` 可以包装底层错误，使调用者能够通过 `errors.Is` 和 `errors.As` 检查错误链：

```go
package main

import (
    "errors"
    "fmt"
    "os"
)

func readConfig() error {
    // Open 返回底层文件错误，例如文件不存在。
    _, err := os.Open("config.yaml")
    if err != nil {
        // %w 保留底层错误，使调用者能用 errors.Is 识别它。
        return fmt.Errorf("读取配置文件失败：%w", err)
    }
    return nil
}

func main() {
    // 通过错误链判断，而不是比较错误文本。
    err := readConfig()
    if errors.Is(err, os.ErrNotExist) {
        fmt.Println("配置文件不存在")
    }
}
```

只有在调用者需要识别底层错误时才使用 `%w`；如果底层实现属于不希望暴露的内部细节，可以使用 `%v` 只保留错误文本。

## 常用格式化占位符

### 通用占位符

| 占位符 | 说明                                 |
| ------ | ------------------------------------ |
| `%v`   | 使用值的默认格式                     |
| `%+v`  | 与 `%v` 类似；输出结构体时包含字段名 |
| `%#v`  | 输出值的 Go 语法表示                 |
| `%T`   | 输出值的具体类型                     |
| `%%`   | 输出百分号 `%`                       |

```go
package main

import "fmt"

type User struct {
    Name string
    Age  int
}

func main() {
    // 结构体实例用于观察不同通用占位符的输出。
    user := User{Name: "张三", Age: 20}

    // 依次输出默认格式、带字段名、Go 语法、类型和字面量百分号。
    fmt.Printf("%v\n", user)
    fmt.Printf("%+v\n", user)
    fmt.Printf("%#v\n", user)
    fmt.Printf("%T\n", user)
    fmt.Printf("完成度：100%%\n")
}
```

### 布尔值

| 占位符 | 说明                   |
| ------ | ---------------------- |
| `%t`   | 输出 `true` 或 `false` |

### 整数与字符

| 占位符 | 说明                                 |
| ------ | ------------------------------------ |
| `%b`   | 二进制                               |
| `%c`   | 对应 Unicode 码点表示的字符          |
| `%d`   | 十进制                               |
| `%o`   | 八进制                               |
| `%O`   | 带 `0o` 前缀的八进制                 |
| `%x`   | 十六进制，使用 `a-f`                 |
| `%X`   | 十六进制，使用 `A-F`                 |
| `%U`   | Unicode 格式，例如 `U+0041`          |
| `%q`   | 使用单引号包围并按 Go 字符字面量转义 |

```go
// 65 对应 ASCII/Unicode 字符 A，便于观察不同进制和字符格式。
n := 65
fmt.Printf("%b\n", n)
fmt.Printf("%c\n", n)
fmt.Printf("%d\n", n)
fmt.Printf("%o\n", n)
fmt.Printf("%O\n", n)
fmt.Printf("%x\n", n)
fmt.Printf("%X\n", n)
fmt.Printf("%U\n", n)
fmt.Printf("%q\n", n)
```

### 浮点数与复数

| 占位符     | 说明                                   |
| ---------- | -------------------------------------- |
| `%b`       | 无小数部分、使用二进制指数的科学计数法 |
| `%e`       | 科学计数法，使用小写 `e`               |
| `%E`       | 科学计数法，使用大写 `E`               |
| `%f`、`%F` | 十进制小数形式                         |
| `%g`       | 自动选择 `%e` 或 `%f`，输出更紧凑      |
| `%G`       | 自动选择 `%E` 或 `%F`                  |
| `%x`、`%X` | 十六进制浮点表示                       |

```go
// 同一个浮点数使用不同动词会得到不同的文本形式。
f := 12.34
fmt.Printf("%e\n", f)
fmt.Printf("%E\n", f)
fmt.Printf("%f\n", f)
fmt.Printf("%g\n", f)
```

复数会分别格式化实部和虚部：

```go
fmt.Printf("%f\n", complex(1.2, 3.4))
// 输出：(1.200000+3.400000i)
```

### 字符串与字节切片

| 占位符 | 说明                                   |
| ------ | -------------------------------------- |
| `%s`   | 按原始字节输出字符串或 `[]byte`        |
| `%q`   | 使用双引号包围并按 Go 字符串字面量转义 |
| `%x`   | 每个字节使用两个小写十六进制字符表示   |
| `%X`   | 每个字节使用两个大写十六进制字符表示   |

```go
// 字符串含有非 ASCII 字符，可观察 %x 输出的是 UTF-8 字节。
s := "Go语言"
fmt.Printf("%s\n", s)
fmt.Printf("%q\n", s)
fmt.Printf("%x\n", s)
fmt.Printf("%X\n", s)
```

`%x` 和 `%X` 会按字符串的 UTF-8 字节编码输出。

### 指针

| 占位符 | 说明                                 |
| ------ | ------------------------------------ |
| `%p`   | 以带 `0x` 前缀的十六进制形式输出地址 |
| `%#p`  | 输出地址但省略 `0x` 前缀             |

```go
// 取地址后再用 %p 输出指针值；地址每次运行都可能变化。
a := 18
fmt.Printf("%p\n", &a)
fmt.Printf("%#p\n", &a)
```

实际地址每次运行都可能不同。

## 宽度、精度与标志

完整的格式化指令可以同时包含标志、宽度和精度：

```text
%[标志][宽度][.精度]动词
```

### 宽度与精度

| 格式    | 说明                        |
| ------- | --------------------------- |
| `%f`    | 默认宽度，默认精度为 6      |
| `%9f`   | 最小宽度为 9，默认精度      |
| `%.2f`  | 默认宽度，保留 2 位小数     |
| `%9.2f` | 最小宽度为 9，保留 2 位小数 |
| `%9.f`  | 最小宽度为 9，精度为 0      |

```go
// 宽度不足不会截断数据，只会在需要时填充空格。
n := 88.88
fmt.Printf("|%f|\n", n)
fmt.Printf("|%9f|\n", n)
fmt.Printf("|%.2f|\n", n)
fmt.Printf("|%9.2f|\n", n)
fmt.Printf("|%9.f|\n", n)
```

宽度表示输出至少占用的宽度，不会截断超过宽度的内容。

### 常用标志

| 标志 | 作用                                                   |
| ---- | ------------------------------------------------------ |
| `+`  | 数值始终显示正负号；与 `%q` 配合时将非 ASCII 字符转义  |
| 空格 | 正数前添加空格；与 `%x`、`%X` 配合时在字节之间添加空格 |
| `-`  | 左对齐，右侧填充空格                                   |
| `#`  | 使用替代格式，例如十六进制增加 `0x` 前缀               |
| `0`  | 使用 `0` 进行左侧填充                                  |

```go
// 分别演示强制符号、空格、左对齐、替代格式和零填充。
fmt.Printf("|%+d|\n", 12)
fmt.Printf("|% d|\n", 12)
fmt.Printf("|%-8s|\n", "Go")
fmt.Printf("|%#x|\n", 255)
fmt.Printf("|%08d|\n", 123)
```

## 从标准输入读取数据

`fmt` 包提供 `Scan`、`Scanf` 和 `Scanln` 从标准输入中读取数据：

```go
func Scan(a ...any) (n int, err error)
func Scanf(format string, a ...any) (n int, err error)
func Scanln(a ...any) (n int, err error)
```

接收输入的参数必须传入指针，否则函数无法修改变量中的值。

### `fmt.Scan`

`Scan` 按空白字符分隔输入，换行也会被视为空白字符。

```go
package main

import "fmt"

func main() {
    // 扫描目标必须传指针，Scan 才能把解析结果写回变量。
    var name string
    var age int
    var married bool

    fmt.Print("请输入姓名、年龄和婚姻状态：")
    // Scan 按空白分隔读取三个字段，n 是成功赋值的字段数量。
    n, err := fmt.Scan(&name, &age, &married)
    if err != nil {
        fmt.Println("读取失败：", err)
        return
    }

    fmt.Printf(
        "成功读取 %d 项：name=%s age=%d married=%t\n",
        n,
        name,
        age,
        married,
    )
}
```

### `fmt.Scanf`

`Scanf` 根据格式字符串匹配输入，普通字符必须与输入内容对应：

```go
// 普通文本和占位符都必须与输入结构匹配。
n, err := fmt.Scanf(
    "name=%s age=%d married=%t",
    &name,
    &age,
    &married,
)
```

`Scanf` 对格式要求较严格，不适合解析由用户任意输入的复杂文本。

### `fmt.Scanln`

`Scanln` 与 `Scan` 类似，但遇到换行就停止扫描：

```go
// Scanln 在换行处停止，仍按空白分隔每个字段。
n, err := fmt.Scanln(&name, &age)
```

`Scanln` 仍然按照空白字符拆分数据，因此不能直接读取包含空格的完整句子。

## 读取包含空格的整行文本

输入内容可能包含空格时，应使用 `bufio.Reader` 或 `bufio.Scanner`。

```go
package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func main() {
    // Reader 保留输入流状态，适合读取包含空格的一整行。
    reader := bufio.NewReader(os.Stdin)

    fmt.Print("请输入一段文字：")
    // 读到换行符为止；返回的字符串通常包含该换行符。
    text, err := reader.ReadString('\n')
    if err != nil {
        fmt.Println("读取失败：", err)
        return
    }

    // 去除换行和两端空白，再作为最终文本使用。
    text = strings.TrimSpace(text)
    fmt.Printf("读取结果：%q\n", text)
}
```

也可以使用 `bufio.Scanner`：

```go
// Scanner 默认以行为 token，适合简单的逐行交互输入。
scanner := bufio.NewScanner(os.Stdin)
if scanner.Scan() {
    fmt.Println(scanner.Text())
}
if err := scanner.Err(); err != nil {
    fmt.Println("读取失败：", err)
}
```

## 从 `io.Reader` 或字符串中扫描

`Fscan` 系列从指定的 `io.Reader` 读取：

```go
func Fscan(r io.Reader, a ...any) (n int, err error)
func Fscanf(r io.Reader, format string, a ...any) (n int, err error)
func Fscanln(r io.Reader, a ...any) (n int, err error)
```

```go
// strings.NewReader 将内存中的字符串适配为 io.Reader。
reader := strings.NewReader("张三 20 true")

var name string
var age int
var active bool

// 从 reader 中按空白分隔读取，并把结果写入三个指针。
n, err := fmt.Fscan(reader, &name, &age, &active)
fmt.Println(n, err, name, age, active)
```

`Sscan` 系列直接从字符串中读取：

```go
func Sscan(str string, a ...any) (n int, err error)
func Sscanf(str string, format string, a ...any) (n int, err error)
func Sscanln(str string, a ...any) (n int, err error)
```

```go
input := "name=张三 age=20"

var name string
var age int

// Sscanf 直接从 input 解析；格式中的固定文本也必须匹配。
n, err := fmt.Sscanf(input, "name=%s age=%d", &name, &age)
```

## `fmt` 使用建议

1. 简单打印一行内容可使用 `Println`，需要稳定格式时使用 `Printf`。
2. 需要得到字符串时使用 `Sprintf`，不要先输出再截取。
3. 写文件、网络连接或缓冲区时使用 `Fprint` 系列，并检查错误。
4. 包装底层错误时使用 `%w`，仅需要错误文本时使用 `%v`。
5. `Scan` 系列更适合格式简单且明确的输入；交互式程序通常先读取整行，再校验和解析。
6. 格式字符串与参数类型不匹配时，输出中可能出现 `%!` 开头的诊断信息，可使用 `go vet` 检查常见错误。



## 总结

`fmt` 的函数族围绕同一个选择展开：数据写到哪里、是否需要格式模板、是否需要返回字符串。写到标准输出用 `Print`，写到任意 `io.Writer` 用 `Fprint`，仅构造文本用 `Sprint`；`Errorf` 则把格式化与错误链包装结合起来，`%w` 让上层仍能识别底层错误。

把 `fmt` 放在 I/O 边界上理解会更清晰：它负责文本的组织与解析，`io` 负责数据的来源和去向，`strconv` 负责基础类型的严格转换。面对外部输入，扫描目标必须传指针，并检查已读取数量与错误；面对错误信息，优先保留可处理的错误链，而不是只拼接不可判断的字符串。
