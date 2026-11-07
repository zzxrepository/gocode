---
permalink: /backend/go/basic/02-variables-and-types/
title: 03. 基本数据类型与字符串
shortTitle: 03. 基本数据类型与字符串
order: 3
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 基本类型
  - 字符串
  - byte
  - rune
  - 类型转换
---

# 03. 基本数据类型与字符串

## 前言

Go 是一种静态类型语言。变量在声明后会具有明确的类型，不同类型决定了变量能够保存的数据、可以参与的运算以及所占用的存储空间。

Go 语言中的数据类型可以分为以下 5 类 13 种：

**基本类型**

- 布尔类型
- 整数类型
- 浮点类型
- 复数类型
- 字符串类型

**聚合类型**

- 数组
- 结构体

**指针类型**

**引用型类型**

- 切片
- 映射
- 通道

**抽象与可调用类型**

- 接口
- 函数

| 大类             | 包含的类型                       | 主要特点                               |
| ---------------- | -------------------------------- | -------------------------------------- |
| 基本类型         | 布尔、整数、浮点数、复数、字符串 | Go 语言内置的基础数据表示形式          |
| 聚合类型         | `array`、`struct`                | 由多个值组合而成，整体具有值语义       |
| 指针类型         | `pointer`                        | 保存变量的内存地址                     |
| 引用型类型       | `slice`、`map`、`channel`        | 内部引用底层数据结构，零值通常为 `nil` |
| 抽象与可调用类型 | `interface`、`function`          | 分别用于行为抽象和保存函数值           |

## 3.1 基本类型概述

Go 语言的基本类型可以进一步分为以下几类：

- 布尔类型；
- 整数类型；
- 浮点类型；
- 复数类型；
- 字符串类型。

其中，整数、浮点数和复数统称为数值类型。`byte` 是 `uint8` 的别名，`rune` 是 `int32` 的别名，并不是两种独立的新类型。

| 分类       | 类型              | 位宽或大小     | 零值    | 说明                                             |
| ---------- | ----------------- | -------------- | ------- | ------------------------------------------------ |
| 布尔类型   | `bool`            | 未规定固定大小 | `false` | 只能取 `true` 或 `false`                         |
| 整数类型   | `int`、`uint`     | 32 位或 64 位  | `0`     | 大小与具体实现和目标平台有关                     |
| 整数类型   | `int8`、`uint8`   | 8 位           | `0`     | 8 位有符号整数和无符号整数                       |
| 整数类型   | `int16`、`uint16` | 16 位          | `0`     | 16 位有符号整数和无符号整数                      |
| 整数类型   | `int32`、`uint32` | 32 位          | `0`     | 32 位有符号整数和无符号整数                      |
| 整数类型   | `int64`、`uint64` | 64 位          | `0`     | 64 位有符号整数和无符号整数                      |
| 整数类型   | `byte`            | 8 位           | `0`     | `uint8` 的别名，通常用于表示一个字节             |
| 整数类型   | `rune`            | 32 位          | `0`     | `int32` 的别名，通常用于表示一个 Unicode 码点    |
| 整数类型   | `uintptr`         | 32 位或 64 位  | `0`     | 能够保存指针位模式的无符号整数，主要用于底层编程 |
| 浮点类型   | `float32`         | 32 位          | `0`     | 单精度浮点数                                     |
| 浮点类型   | `float64`         | 64 位          | `0`     | 双精度浮点数                                     |
| 复数类型   | `complex64`       | 64 位          | `0+0i`  | 实部和虚部均为 `float32`                         |
| 复数类型   | `complex128`      | 128 位         | `0+0i`  | 实部和虚部均为 `float64`                         |
| 字符串类型 | `string`          | 长度不固定     | `""`    | 不可变的字节序列                                 |

需要注意，Go 语言规范只对数值类型的大小作出了明确保证，并没有规定 `bool` 必须占用一个字节。因此，不应依赖布尔变量的具体内存大小。

基本类型的零值可以概括为：

- 布尔类型的零值是 `false`；
- 数值类型的零值是 `0`；
- 字符串类型的零值是空字符串 `""`。

`nil` 不是基本类型的零值。它主要用于指针、切片、映射、通道、接口和函数等类型。

------

## 3.2 布尔类型

Go 使用 `bool` 表示布尔类型。布尔类型只有两个值：

```go
true
false
```

声明布尔变量时，如果没有显式赋值，其零值为 `false`：

```go
var enabled bool

fmt.Println(enabled) // false
```

布尔值通常用于条件判断：

```go
age := 20

if age >= 18 {
    fmt.Println("已成年")
}
```

使用布尔类型时需要注意：

1. Go 不允许使用整数代替布尔值；
2. 布尔值不能参与加、减、乘、除等数值运算；
3. 布尔值不能直接与整数、浮点数等数值类型相互转换。

下面的写法是错误的：

```go
var n int = 1

if n { // 编译错误：条件表达式必须是 bool
    fmt.Println("true")
}
```

必须显式写出判断条件：

```go
if n != 0 {
    fmt.Println("true")
}
```

------

## 3.3 整数类型

整数类型用于表示没有小数部分的数值，可以分为有符号整数和无符号整数。

### 3.3.1 有符号整数

有符号整数既可以表示正数，也可以表示负数。

| 类型    | 位数          | 取值范围                                      |
| ------- | ------------- | --------------------------------------------- |
| `int8`  | 8 位          | `-128`～`127`                                 |
| `int16` | 16 位         | `-32768`～`32767`                             |
| `int32` | 32 位         | `-2147483648`～`2147483647`                   |
| `int64` | 64 位         | `-9223372036854775808`～`9223372036854775807` |
| `int`   | 32 位或 64 位 | 由目标平台和具体实现决定                      |

### 3.3.2 无符号整数

无符号整数只能表示零和正数。

| 类型     | 位数          | 取值范围                    |
| -------- | ------------- | --------------------------- |
| `uint8`  | 8 位          | `0`～`255`                  |
| `uint16` | 16 位         | `0`～`65535`                |
| `uint32` | 32 位         | `0`～`4294967295`           |
| `uint64` | 64 位         | `0`～`18446744073709551615` |
| `uint`   | 32 位或 64 位 | 由目标平台和具体实现决定    |

标准库的 `math` 包定义了整数类型的边界常量，例如：

```go
math.MinInt8
math.MaxInt8
math.MinInt16
math.MaxInt16
math.MinInt32
math.MaxInt32
math.MinInt64
math.MaxInt64
math.MaxUint8
math.MaxUint16
math.MaxUint32
math.MaxUint64
```

例如：

```go
package main

import (
    "fmt"
    "math"
)

func main() {
    fmt.Println(math.MinInt16) // -32768
    fmt.Println(math.MaxInt16) // 32767
}
```

这些整数类型的范围和对应边界常量由 Go 规范与标准库明确规定。

### 3.3.3 `int` 和 `uint`

`int` 和 `uint` 的大小不是固定的：

- 在常见的 32 位目标平台上，它们通常是 32 位；
- 在常见的 64 位目标平台上，它们通常是 64 位。

在不需要固定整数宽度时，通常优先使用 `int`。例如，数组下标、切片长度以及循环计数通常使用 `int`：

```go
count := 10

for i := 0; i < count; i++ {
    fmt.Println(i)
}
```

当数据格式、网络协议、文件格式或数据库字段明确要求固定宽度时，再选择 `int32`、`uint32`、`int64` 等类型。

即使 `int` 和 `int32` 在某个平台上具有相同的大小，它们仍然是不同的类型，不能直接混合使用：

```go
var a int = 10
var b int32 = 20

// fmt.Println(a + b) // 编译错误：类型不同

fmt.Println(a + int(b))
```

### 3.3.4 `byte`

`byte` 是 `uint8` 的别名：

```go
type byte = uint8
```

它通常用于表示原始字节数据，例如：

```go
var b byte = 65

fmt.Println(b)      // 65
fmt.Printf("%c\n", b) // A
```

下面两个变量的类型实际上相同：

```go
var a byte = 10
var b uint8 = 20

fmt.Println(a + b) // 30
```

### 3.3.5 `rune`

`rune` 是 `int32` 的别名：

```go
type rune = int32
```

它通常用于表示一个 Unicode 码点：

```go
var r rune = '中'

fmt.Println(r)       // 20013
fmt.Printf("%c\n", r) // 中
```

需要注意，`rune` 表示的是 Unicode 码点，而不是 UTF-8 编码后的某一个字节。

### 3.3.6 `uintptr`

`uintptr` 是一种无符号整数类型，其大小足以保存一个指针的位模式。它主要与 `unsafe` 包配合，用于底层内存操作。

普通业务代码一般不应使用 `uintptr` 保存地址，也不能将它当作普通指针使用。垃圾回收器不会将 `uintptr` 识别为对某个对象的有效引用。

------

## 3.4 整数字面量

Go 支持多种进制的整数字面量：

| 进制     | 前缀                      | 示例        |
| -------- | ------------------------- | ----------- |
| 十进制   | 无前缀                    | `71`        |
| 二进制   | `0b` 或 `0B`              | `0b1000111` |
| 八进制   | `0o`、`0O` 或传统前缀 `0` | `0o107`     |
| 十六进制 | `0x` 或 `0X`              | `0x47`      |

下面几个变量的值都是 `71`：

```go
decimal := 71
binary := 0b1000111
octal := 0o107
hexadecimal := 0x47

fmt.Println(decimal, binary, octal, hexadecimal)
```

为了提高较长数字的可读性，可以在数字之间添加下划线：

```go
population := 1_400_000_000
mask := 0b1111_0000
color := 0xFF_FF_FF
```

下划线只用于提高代码可读性，不会影响数值本身。Go 支持二进制、八进制、十六进制前缀以及数字分隔符。

------

## 3.5 浮点类型

Go 提供两种浮点类型：

| 类型      | 位数  | 大致最大值   | 零值 |
| --------- | ----- | ------------ | ---- |
| `float32` | 32 位 | 约 `3.4e38`  | `0`  |
| `float64` | 64 位 | 约 `1.8e308` | `0`  |

这两种类型都遵循 IEEE 754 浮点数标准。`float32` 精度相对较低，`float64` 能够表示更大的范围，并具有更高的精度。

声明浮点变量：

```go
var a float32 = 3.14
var b float64 = 3.141592653589793

fmt.Println(a)
fmt.Println(b)
```

使用短变量声明时，包含小数点的数值通常会被推断为 `float64`：

```go
value := 3.14

fmt.Printf("%T\n", value) // float64
```

除非需要减少内存占用，或者外部数据格式明确要求使用 `float32`，否则一般优先使用 `float64`。

标准库的 `math` 包提供了浮点类型的边界常量：

```go
math.MaxFloat32
math.MaxFloat64
math.SmallestNonzeroFloat32
math.SmallestNonzeroFloat64
```

例如：

```go
package main

import (
    "fmt"
    "math"
)

func main() {
    fmt.Println(math.MaxFloat32)
    fmt.Println(math.MaxFloat64)
}
```

`math.MaxFloat32` 和 `math.MaxFloat64` 分别表示两种浮点类型能够表示的最大有限值。

### 3.5.1 科学记数法

浮点数字面量可以使用科学记数法：

```go
a := 1e3     // 1000
b := 1.5e2   // 150
c := 2.5e-3  // 0.0025

fmt.Println(a, b, c)
```

### 3.5.2 浮点数的精度问题

浮点数使用二进制形式保存数值，许多十进制小数无法被精确表示。因此，浮点数运算可能产生微小误差：

```go
a := 0.1
b := 0.2

fmt.Println(a + b) // 可能输出 0.30000000000000004
```

因此，不应直接使用 `==` 判断两个经过计算的浮点数是否完全相等。对于金额等要求十进制精确计算的场景，也不宜直接使用普通浮点数保存最终金额。

------

## 3.6 复数类型

Go 原生支持复数，并提供两种复数类型：

| 类型         | 总位数 | 实部类型  | 虚部类型  | 零值   |
| ------------ | ------ | --------- | --------- | ------ |
| `complex64`  | 64 位  | `float32` | `float32` | `0+0i` |
| `complex128` | 128 位 | `float64` | `float64` | `0+0i` |

可以直接使用虚数单位 `i` 创建复数：

```go
var z1 complex64 = 1 + 2i
var z2 complex128 = 3 + 4i

fmt.Println(z1)
fmt.Println(z2)
```

也可以使用内置函数 `complex` 创建复数：

```go
z := complex(3.0, 4.0)

fmt.Println(z) // (3+4i)
```

使用 `real` 和 `imag` 可以分别取得复数的实部和虚部：

```go
z := complex(3.0, 4.0)

fmt.Println(real(z)) // 3
fmt.Println(imag(z)) // 4
```

`complex64` 的实部和虚部均为 `float32`，`complex128` 的实部和虚部均为 `float64`。

------

## 3.7 字符串类型

### 3.7.1 字符串的本质

Go 使用 `string` 表示字符串。字符串本质上是一个不可变的字节序列：

```go
s1 := "hello"
s2 := "你好"

fmt.Println(s1)
fmt.Println(s2)
```

字符串的零值是空字符串：

```go
var s string

fmt.Println(s == "") // true
```

需要特别注意：

- 字符串保存的是字节序列；
- 字符串中的内容不能直接修改；
- `len` 返回的是字符串的字节数；
- 字符串可以保存 UTF-8 文本，但字符串本身也可以包含任意字节。

因此，将字符串简单描述为“UTF-8 字符串”并不完全准确。更准确的说法是：**Go 字符串是不可变的字节序列，Go 源代码中的非 ASCII 文本通常使用 UTF-8 编码。**

### 3.7.2 字符串字面量

Go 提供两种字符串字面量：

1. 解释型字符串字面量；
2. 原始字符串字面量。

#### 3.7.2.1 解释型字符串

解释型字符串使用双引号包围，其中的转义字符会被解析：

```go
message := "hello\nworld"

fmt.Println(message)
```

输出：

```text
hello
world
```

#### 3.7.2.2 原始字符串

原始字符串使用反引号包围，其中的换行和反斜杠通常会被原样保留：

```go
message := `第一行
第二行
第三行`

fmt.Println(message)
```

原始字符串特别适合表示多行文本、正则表达式和文件路径：

```go
path := `C:\pprof\main.exe`

fmt.Println(path)
```

反引号中的反斜杠不会被当作转义符处理，但原始字符串内部不能直接包含反引号本身。

### 3.7.3 字符串转义符

双引号字符串中的常用转义符如下：

| 转义符       | 含义                                  |
| ------------ | ------------------------------------- |
| `\n`         | 换行                                  |
| `\r`         | 回车                                  |
| `\t`         | 水平制表符                            |
| `\\`         | 反斜杠                                |
| `\"`         | 双引号                                |
| `\a`         | 响铃符                                |
| `\b`         | 退格符                                |
| `\f`         | 换页符                                |
| `\v`         | 垂直制表符                            |
| `\xNN`       | 使用两个十六进制数字表示一个字节      |
| `\uNNNN`     | 使用四个十六进制数字表示 Unicode 码点 |
| `\UNNNNNNNN` | 使用八个十六进制数字表示 Unicode 码点 |

例如，要在字符串中表示 Windows 文件路径，需要对反斜杠进行转义：

```go
path := "C:\\pprof\\main.exe"

fmt.Println(path)
```

要在字符串中包含双引号：

```go
text := "他说：\"你好\""

fmt.Println(text)
```

需要注意，`\'` 只用于单引号包围的 rune 字面量；在双引号字符串中，单引号不需要转义。

### 3.7.4 字符串长度

内置函数 `len` 返回字符串占用的字节数，而不是字符数量：

```go
s1 := "hello"
s2 := "你好"

fmt.Println(len(s1)) // 5
fmt.Println(len(s2)) // 6
```

`"你好"` 包含两个 Unicode 码点，但在 UTF-8 编码中，每个常用汉字占用三个字节，因此字符串长度为六个字节。

如果需要统计 Unicode 码点的数量，可以使用 `unicode/utf8` 包：

```go
package main

import (
    "fmt"
    "unicode/utf8"
)

func main() {
    s := "你好"

    fmt.Println(len(s))                    // 6
    fmt.Println(utf8.RuneCountInString(s)) // 2
}
```

也可以先将字符串转换成 `[]rune`：

```go
s := "你好"

fmt.Println(len([]rune(s))) // 2
```

这里统计的是 Unicode 码点数量。某些视觉上看起来只有一个字符的内容，例如组合字符或部分 emoji，仍然可能由多个 Unicode 码点组成。

------

## 3.8 `byte`、`rune` 与字符

Go 没有单独命名为 `char` 的字符类型。程序通常使用 `byte` 或 `rune` 表示字符。

单引号包围的内容称为 rune 字面量：

```go
a := 'A'
b := '中'

fmt.Printf("%T %d %c\n", a, a, a)
fmt.Printf("%T %d %c\n", b, b, b)
```

输出类似：

```text
int32 65 A
int32 20013 中
```

rune 字面量表示一个 Unicode 码点，其默认类型是 `rune`，也就是 `int32`。

### 3.8.1 `byte` 与 `rune` 的区别

| 类型   | 实际类型 | 表示内容          |
| ------ | -------- | ----------------- |
| `byte` | `uint8`  | 一个字节          |
| `rune` | `int32`  | 一个 Unicode 码点 |

ASCII 字符只占用一个字节，因此既可以使用 `byte` 表示，也可以使用 `rune` 表示：

```go
var b byte = 'A'
var r rune = 'A'

fmt.Println(b) // 65
fmt.Println(r) // 65
```

中文、日文以及大多数非 ASCII 字符，在 UTF-8 编码中通常需要多个字节，因此应使用 `rune` 进行字符级处理：

```go
var r rune = '中'

fmt.Println(r)        // 20013
fmt.Printf("%c\n", r) // 中
```

不能使用 `byte` 直接保存 `'中'`：

```go
// var b byte = '中'
// 编译错误：字符的码点值超出了 byte 的取值范围
```

------

### 3.8.2 遍历字符串

字符串可以按照字节遍历，也可以按照 Unicode 码点遍历。

#### 3.8.2.1 按字节遍历

使用普通下标或传统 `for` 循环时，得到的是字符串中的字节：

```go
package main

import "fmt"

func main() {
    s := "Go语言"

    for i := 0; i < len(s); i++ {
        fmt.Printf("%d:%x ", i, s[i])
    }
}
```

其中：

- `s[i]` 的类型是 `byte`；
- `i` 表示字节下标；
- 非 ASCII 字符会被拆分成多个字节。

字符串下标返回的是字节，不能通过字符串下标直接得到完整的 Unicode 字符。

#### 3.8.2.2 按 rune 遍历

使用 `for range` 遍历字符串时，Go 会按照 UTF-8 解码出 Unicode 码点：

```go
package main

import "fmt"

func main() {
    s := "Go语言"

    for index, r := range s {
        fmt.Printf("字节位置：%d，字符：%c，码点：%U\n", index, r, r)
    }
}
```

输出类似：

```text
字节位置：0，字符：G，码点：U+0047
字节位置：1，字符：o，码点：U+006F
字节位置：2，字符：语，码点：U+8BED
字节位置：5，字符：言，码点：U+8A00
```

需要注意，`range` 返回的 `index` 仍然是当前 rune 在字符串中的**字节起始位置**，不是第几个字符。

如果只需要字符，不需要字节位置，可以忽略索引：

```go
for _, r := range s {
    fmt.Printf("%c ", r)
}
```

对于包含中文等 Unicode 文本的字符串，通常应使用 `for range` 遍历。

------

### 3.8.3 修改字符串

Go 字符串是不可变的，不能直接修改字符串中的某个字节：

```go
s := "hello"

// s[0] = 'H' // 编译错误：不能修改字符串内容
```

如果需要修改字符串，应先将其转换为 `[]byte` 或 `[]rune`，修改后再转换回 `string`。

#### 3.8.3.1 使用 `[]byte` 修改

当字符串主要由 ASCII 字符组成，或者需要处理原始字节时，可以转换成 `[]byte`：

```go
package main

import "fmt"

func main() {
    s := "hello"

    data := []byte(s)
    data[0] = 'H'

    s = string(data)

    fmt.Println(s) // Hello
}
```

#### 3.8.3.2 使用 `[]rune` 修改

处理中文、日文或其他 Unicode 字符时，通常应转换成 `[]rune`：

```go
package main

import "fmt"

func main() {
    s := "博客"

    characters := []rune(s)
    characters[0] = '狗'

    s = string(characters)

    fmt.Println(s) // 狗客
}
```

使用哪一种转换取决于处理目标：

- 按字节处理时，使用 `[]byte`；
- 按 Unicode 码点处理时，使用 `[]rune`。

从字符串转换成 `[]byte` 或 `[]rune` 后得到的是可以修改的新切片，不应依赖它与原字符串共享底层存储。字符串与字节切片、rune 切片之间的转换规则由 Go 规范明确规定。

------

## 3.9 字符串的常用操作

Go 的字符串操作主要由内置函数、运算符、`fmt` 包和 `strings` 包提供。

| 操作           | 示例                              | 说明                           |
| -------------- | --------------------------------- | ------------------------------ |
| 获取字节长度   | `len(s)`                          | 返回字符串的字节数             |
| 拼接字符串     | `s1 + s2`                         | 使用 `+` 拼接少量字符串        |
| 格式化字符串   | `fmt.Sprintf(...)`                | 按照指定格式生成字符串         |
| 分割字符串     | `strings.Split(s, sep)`           | 按分隔符拆分字符串             |
| 判断是否包含   | `strings.Contains(s, substr)`     | 判断是否包含指定子串           |
| 判断前缀       | `strings.HasPrefix(s, prefix)`    | 判断是否以指定内容开头         |
| 判断后缀       | `strings.HasSuffix(s, suffix)`    | 判断是否以指定内容结尾         |
| 查找子串       | `strings.Index(s, substr)`        | 返回子串第一次出现的字节位置   |
| 反向查找       | `strings.LastIndex(s, substr)`    | 返回子串最后一次出现的字节位置 |
| 拼接字符串切片 | `strings.Join(items, sep)`        | 使用指定分隔符连接多个字符串   |
| 替换字符串     | `strings.ReplaceAll(s, old, new)` | 替换所有匹配的子串             |
| 去除两端字符   | `strings.TrimSpace(s)`            | 去除字符串两端的空白字符       |

例如，判断字符串是否具有指定前缀：

```go
package main

import (
    "fmt"
    "strings"
)

func main() {
    site := "www.example.com"

    if strings.HasPrefix(site, "www.") {
        fmt.Println("该字符串以 www. 开头")
    }
}
```

`strings.HasPrefix` 返回一个布尔值，用于报告字符串是否以指定前缀开头。

字符串分割和连接示例：

```go
package main

import (
    "fmt"
    "strings"
)

func main() {
    text := "Go,Java,Python"

    languages := strings.Split(text, ",")
    fmt.Println(languages)

    result := strings.Join(languages, " | ")
    fmt.Println(result)
}
```

输出：

```text
[Go Java Python]
Go | Java | Python
```

------

## 3.10 类型转换

Go 不会像某些语言那样，在不同的已确定数值类型之间自动进行类型提升。不同类型的值需要混合运算或赋值时，通常必须显式转换。

类型转换的基本语法为：

```go
目标类型(表达式)
```

例如：

```go
var a int = 10
var b int32 = 20

result := int32(a) + b

fmt.Println(result)
```

### 3.10.1 整数转换为浮点数

```go
var age int = 18

value := float64(age)

fmt.Printf("%T %v\n", value, value)
```

### 3.10.2 浮点数转换为整数

浮点数转换成整数时，小数部分会被直接舍弃，而不是四舍五入：

```go
value := 3.99

n := int(value)

fmt.Println(n) // 3
```

负数同样向零截断：

```go
value := -3.99

n := int(value)

fmt.Println(n) // -3
```

### 3.10.3 不同整数类型之间转换

```go
var a int64 = 100

b := int32(a)

fmt.Println(b)
```

当目标类型的范围小于原类型时，结果可能发生截断：

```go
var a uint16 = 256

b := uint8(a)

fmt.Println(b) // 0
```

`uint8` 只能保存低 8 位，因此转换不会自动报告溢出错误。进行窄类型转换前，应先确认原值在目标类型的有效范围内。

### 3.10.4 数值类型转换示例

下面计算直角三角形的斜边长度：

```go
package main

import (
    "fmt"
    "math"
)

func main() {
    a := 3
    b := 4

    fa := float64(a)
    fb := float64(b)

    hypotenuse := math.Sqrt(fa*fa + fb*fb)

    fmt.Println(hypotenuse) // 5
}
```

`math.Sqrt` 接收 `float64` 参数，因此需要先将 `int` 转换为 `float64`。

### 3.10.5 类型转换的注意事项

进行类型转换时，需要注意以下问题：

1. 不同整数类型之间转换时，可能丢失高位数据；
2. 浮点数转换为整数时，小数部分会被舍弃；
3. `float64` 转换为 `float32` 时可能损失精度；
4. 较大的整数转换为浮点数后，可能无法保持精确值；
5. 类型转换只是改变值的表示形式，不等于对数据进行格式解析。

例如，下面的转换不会得到字符串 `"65"`：

```go
n := 65

s := string(n)

fmt.Println(s) // A
```

这是因为将整数转换为字符串时，整数会被解释为 Unicode 码点。要将数字转换为十进制字符串，应使用 `strconv.Itoa` 或 `strconv.FormatInt`：

```go
package main

import (
    "fmt"
    "strconv"
)

func main() {
    n := 65

    s := strconv.Itoa(n)

    fmt.Println(s) // 65
}
```

同样，将字符串 `"65"` 转换为整数时，不能直接写成 `int("65")`，而应使用 `strconv.Atoi`：

```go
package main

import (
    "fmt"
    "strconv"
)

func main() {
    n, err := strconv.Atoi("65")
    if err != nil {
        fmt.Println("转换失败：", err)
        return
    }

    fmt.Println(n) // 65
}
```

整数、浮点数和复数之间的显式转换可能发生截断、舍弃小数或精度舍入，具体转换规则由 Go 语言规范规定。

需要补充的是，未确定类型的常量可以根据赋值上下文获得适当的类型：

```go
var a int = 10
var b float64 = 10
```

这里的字面量 `10` 是未确定类型的常量，可以分别表示为 `int` 和 `float64`。这并不意味着一个已经具有 `int` 类型的变量可以自动转换为 `float64`：

```go
var a int = 10

// var b float64 = a // 编译错误

var b float64 = float64(a)
```

## 总结

- 基本类型包括布尔、整数、浮点数、复数和字符串。
- `byte` 是 `uint8` 的别名，`rune` 是 `int32` 的别名。
- 字符串是不可变的字节序列，`len` 计算字节数；处理 Unicode 码点时可使用 `rune`。
- 类型转换可能发生截断或精度损失；字符串与数字之间的格式转换应使用 `strconv`。
