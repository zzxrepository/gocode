---
permalink: /backend/go/basic/02-program-structure-and-syntax/
title: 02. Go 程序结构与基础语法
shortTitle: 02. Go 程序结构与基础语法
order: 2
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 基础语法
  - 变量
  - 常量
  - 运算符
  - init
---

# 02. Go 程序结构与基础语法

## 前言

Go 源文件通过包声明、导入和各类声明组织程序。变量、常量、运算符、内置函数以及初始化规则共同构成编写 Go 程序的语法基础。

## 2.1 Go 源文件的基本结构

Go 源代码文件使用 `.go` 作为扩展名。

一个普通 Go 源文件通常由以下部分组成：

```go
package 包名

import (
	"需要导入的包"
)

const 常量名 = 常量值

var 变量名 变量类型

type 类型名 类型定义

func 函数名() {
	// 函数体
}
```

源文件的基本排列顺序是：

1. 包声明；
2. 导入声明；
3. 常量、变量、类型、函数和方法等顶层声明。

并不是每个文件都必须包含所有这些部分。

Go 程序由包组成；同一目录中的一组源文件通常共同构成一个包，并一起编译。同一个包中的函数、变量、常量和类型可以被该包的其他文件使用。

## 2.2 包与可执行程序

### 2.2.1 普通包

普通包用于组织和复用代码：

```go
package greeting

func Hello() string {
	return "Hello"
}
```

其他包可以在导入后使用其中导出的标识符。

### 2.2.2 main 包

可以直接运行的程序必须包含 `main` 包，并在其中定义：

```go
func main()
```

完整形式如下：

```go
package main

func main() {
	// 程序入口
}
```

`main` 函数：

- 不能声明参数；
- 不能声明返回值；
- 由 Go 运行时自动调用；
- 只能作为 `main` 包中的程序入口。

## 2.3 import 声明

导入一个包：

```go
import "fmt"
```

导入多个包：

```go
import (
	"fmt"
	"strings"
)
```

导入后，通过包名访问其中导出的标识符：

```go
fmt.Println(strings.ToUpper("go"))
```

导入声明的作用域是当前源文件。即使同一个包中的其他文件已经导入了 `fmt`，当前文件需要使用 `fmt` 时仍然必须自己导入。

Go 不允许导入后完全不使用普通导入的包。

## 2.4 标识符与命名规则

标识符用于命名变量、常量、类型、函数、方法、包等程序实体。

Go 标识符需要遵守以下规则：

- 第一个字符必须是 Unicode 字母或者下划线 `_`；
- 后续字符可以是 Unicode 字母、数字或者下划线；
- 标识符区分大小写；
- 不能使用 Go 关键字作为标识符。

合法示例：

```go
name
userName
user2
_count
年龄
```

不合法示例：

```go
2user
user-name
user name
func
```

虽然 Go 允许使用中文等 Unicode 字符作为标识符，但实际项目中通常建议使用清晰、简洁的英文名称。

## 2.5 关键字

Go 共有 25 个关键字：

```text
break        default      func         interface    select
case         defer        go           map          struct
chan         else         goto         package      switch
const        fallthrough  if           range        type
continue     for          import       return       var
```

这些关键字属于语法的一部分，不能用作变量名、函数名或者其他普通标识符。

## 2.6 预声明标识符

除了关键字，Go 还提供了一些预声明标识符，例如：

```text
int string bool byte rune any error
true false nil iota
len cap append make new delete close
panic recover
```

它们与关键字不同：预声明标识符可以在局部作用域中被重新声明，但这样会遮蔽原有含义，通常不建议这么做。

例如，下面的代码在语法上合法，但会遮蔽内置函数 `len`：

```go
func main() {
	len := 10
	_ = len
}
```

应避免使用内置类型、内置函数或者预声明常量的名称作为普通变量名。

## 2.7 标识符的导出规则

Go 不使用 `public`、`private` 或 `protected` 关键字控制可见性，而是根据标识符首字母的大小写决定能否被其他包访问。

首字母大写的包级标识符可以被其他包访问：

```go
func PrintMessage() {
}
```

首字母小写的包级标识符只能在当前包内访问：

```go
func printMessage() {
}
```

这种规则同样适用于：

- 包级变量；
- 包级常量；
- 类型；
- 函数；
- 结构体字段；
- 方法。

需要注意，函数内部声明的局部变量始终只在对应作用域中可见，不存在“首字母大写就能跨包访问”的情况。

## 2.8 Go 的主要声明

Go 中常见的顶层声明包括：

```go
var
const
type
func
```

分别用于声明：

- `var`：变量；
- `const`：常量；
- `type`：类型；
- `func`：函数或方法。

示例：

```go
package example

const Version = "1.0"

var Name = "demo"

type User struct {
	ID int
}

func Hello() string {
	return "hello"
}
```

## 2.9 变量

变量用于保存程序运行过程中需要读取或修改的数据。

Go 是静态类型语言，每个变量都有确定的类型。变量可以显式声明类型，也可以由编译器根据初始值推导类型。

### 2.9.1 标准声明

```go
var 变量名 变量类型
```

例如：

```go
var name string
var age int
var enabled bool
```

### 2.9.2 声明并初始化

```go
var name string = "Go"
var age int = 18
```

当初始值足以确定类型时，可以省略显式类型：

```go
var name = "Go"
var age = 18
```

编译器会根据右侧表达式推导变量类型。

### 2.9.3 批量声明

```go
var (
	name    string
	age     int
	enabled bool
)
```

也可以同时初始化：

```go
var (
	name    = "Go"
	age     = 18
	enabled = true
)
```

### 2.9.4 同时声明多个变量

```go
var name, language = "张三", "Go"
var width, height int = 1920, 1080
```

### 2.9.5 短变量声明

函数内部可以使用 `:=` 声明并初始化变量：

```go
func main() {
	name := "Go"
	age := 18
}
```

短变量声明只能在函数内部使用，不能用于包级声明。

下面的写法不合法：

```go
package main

name := "Go"
```

使用 `:=` 时，同一声明中至少要有一个当前作用域内的新变量：

```go
name := "Go"

name, age := "Golang", 18
```

第二行是合法的，因为 `age` 是新变量；`name` 则被重新赋值。

如果没有任何新变量，会产生编译错误：

```go
name := "Go"
name := "Golang"
```

应改为普通赋值：

```go
name := "Go"
name = "Golang"
```

### 2.9.6 变量的零值

变量声明后即使没有显式初始化，也会获得对应类型的零值。

常见零值如下：

| 类型   | 零值    |
| ------ | ------- |
| 整数   | `0`     |
| 浮点数 | `0`     |
| 复数   | `0`     |
| 布尔值 | `false` |
| 字符串 | `""`    |
| 指针   | `nil`   |
| 切片   | `nil`   |
| 映射   | `nil`   |
| 通道   | `nil`   |
| 函数   | `nil`   |
| 接口   | `nil`   |

数组和结构体的每个元素或字段会分别初始化为其类型的零值。

### 2.9.7 变量的作用域与遮蔽

在内部作用域中，可以声明与外部作用域同名的变量：

```go
package main

import "fmt"

var value = 100

func main() {
	value := 200
	fmt.Println(value)
}
```

函数内部的 `value` 会遮蔽包级变量，因此输出：

```text
200
```

变量遮蔽虽然合法，但可能降低代码可读性，应谨慎使用。

### 2.9.8 未使用的变量

Go 编译器会拒绝未使用的局部变量：

```go
func main() {
	name := "Go"
}
```

如果 `name` 没有在后续代码中使用，程序无法通过编译。

未使用的导入同样会导致编译错误。包级变量、函数或类型则允许暂时未被使用。

## 2.10 常量

常量表示在编译期间即可确定并且不能在运行过程中重新赋值的值。

使用 `const` 声明常量：

```go
const Pi = 3.1415926
const AppName = "demo"
```

常量声明时必须提供能够在编译期求值的表达式。

下面的写法不合法：

```go
const value
```

常量不能被重新赋值：

```go
const Pi = 3.14
Pi = 3.1415
```

### 2.10.1 批量声明常量

```go
const (
	Pi      = 3.1415926
	AppName = "demo"
	MaxSize = 100
)
```

### 2.10.2 省略重复表达式

在同一个 `const` 声明组中，如果某一行省略类型和表达式，会重复使用前一个非空常量声明的表达式：

```go
const (
	A = 100
	B
	C
)
```

这里 `A`、`B` 和 `C` 的值都是 `100`。

### 2.10.3 有类型常量与无类型常量

未显式指定类型的常量通常是无类型常量：

```go
const Count = 10
```

显式指定类型：

```go
const Count int64 = 10
```

无类型常量可以在不溢出的前提下参与不同类型的常量转换和赋值，因此使用起来更加灵活。

## 2.11 iota 常量计数器

`iota` 是预声明的常量标识符，只能在常量声明中使用。

每进入一个新的 `const` 声明组，`iota` 从 `0` 开始；每出现一个新的常量声明项，`iota` 增加 `1`。

```go
const (
	StatusPending = iota
	StatusRunning
	StatusFinished
)
```

对应的值为：

```text
StatusPending  = 0
StatusRunning  = 1
StatusFinished = 2
```

### 2.11.1 跳过某个值

```go
const (
	A = iota
	_
	C
)
```

对应结果：

```text
A = 0
C = 2
```

下划线虽然忽略了该常量名称，但这一行仍然会使 `iota` 递增。

### 2.11.2 从 1 开始计数

```go
const (
	StatusPending = iota + 1
	StatusRunning
	StatusFinished
)
```

结果为：

```text
StatusPending  = 1
StatusRunning  = 2
StatusFinished = 3
```

### 2.11.3 定义二进制容量单位

```go
const (
	_   = iota
	KiB = 1 << (10 * iota)
	MiB
	GiB
	TiB
)
```

对应关系：

```text
KiB = 1 << 10
MiB = 1 << 20
GiB = 1 << 30
TiB = 1 << 40
```

由于这里使用的是 1024 的倍数，使用 `KiB`、`MiB` 和 `GiB` 比使用 `KB`、`MB` 和 `GB` 更准确。

### 2.11.4 同一行使用多个 iota

```go
const (
	A, B = iota + 1, iota + 2
	C, D
	E, F
)
```

结果为：

```text
A = 1, B = 2
C = 2, D = 3
E = 3, F = 4
```

## 2.12 空白标识符

下划线 `_` 称为空白标识符，用于接收并丢弃不需要的值。

空白标识符不是普通变量，不会建立一个可以在后续代码中读取的变量绑定。

### 2.12.1 忽略返回值

```go
func divMod(a, b int) (int, int) {
	return a / b, a % b
}

func main() {
	quotient, _ := divMod(10, 3)
	println(quotient)
}
```

这里忽略了余数。

对于可能返回错误的函数，不应为了省事而直接忽略错误：

```go
file, _ := os.Open("data.txt")
```

如果打开失败，`file` 可能为 `nil`，后续操作可能引发错误。更合理的写法是：

```go
file, err := os.Open("data.txt")
if err != nil {
	return err
}
defer file.Close()
```

### 2.12.2 避免未使用变量错误

有时可以临时使用空白标识符避免未使用变量错误：

```go
value := calculate()
_ = value
```

这种写法适合临时调试，不应代替正常的程序设计。

### 2.12.3 仅为初始化副作用而导入包

某些包通过 `init` 函数完成驱动注册等初始化操作。只需要执行包的初始化逻辑、不需要直接使用包中标识符时，可以写成：

```go
import _ "github.com/go-sql-driver/mysql"
```

这种写法称为空白导入或副作用导入。

空白导入会加载并初始化目标包，但当前文件无法通过包名访问其成员。Go 语言规范明确使用这种形式表示“仅为了初始化副作用而导入包”。

应避免使用旧教程中的相对导入：

```go
import _ "./hello"
```

在现代模块项目中，应使用基于模块路径的完整导入路径。

## 2.13 运算符

### 2.13.1 算术运算符

| 运算符 | 含义 |
| ------ | ---- |
| `+`    | 加法 |
| `-`    | 减法 |
| `*`    | 乘法 |
| `/`    | 除法 |
| `%`    | 取余 |

示例：

```go
a := 10
b := 3

fmt.Println(a + b) // 13
fmt.Println(a - b) // 7
fmt.Println(a * b) // 30
fmt.Println(a / b) // 3
fmt.Println(a % b) // 1
```

当两个操作数都是整数时，除法结果也是整数，小数部分会被舍弃：

```go
fmt.Println(5 / 2) // 2
```

需要浮点结果时，应使用浮点数：

```go
fmt.Println(5.0 / 2.0) // 2.5
```

字符串之间也可以使用 `+` 连接：

```go
message := "Hello, " + "Go"
```

### 2.13.2 关系运算符

| 运算符 | 含义       |
| ------ | ---------- |
| `==`   | 等于       |
| `!=`   | 不等于     |
| `>`    | 大于       |
| `>=`   | 大于或等于 |
| `<`    | 小于       |
| `<=`   | 小于或等于 |

关系运算的结果为 `bool`：

```go
age := 18

fmt.Println(age >= 18) // true
fmt.Println(age == 20) // false
```

并不是所有类型都支持 `==` 和 `!=`。例如，切片、映射和函数不能直接进行普通的相等比较，只能与 `nil` 比较。

### 2.13.3 逻辑运算符

| 运算符 | 含义   |
| ------ | ------ |
| `&&`   | 逻辑与 |
| `\|\|` | 逻辑或 |
| `!`    | 逻辑非 |

示例：

```go
age := 20
hasTicket := true

canEnter := age >= 18 && hasTicket
fmt.Println(canEnter)
```

`&&` 和 `||` 具有短路求值特性：

- `a && b` 中，如果 `a` 为 `false`，不会继续计算 `b`；
- `a || b` 中，如果 `a` 为 `true`，不会继续计算 `b`。

### 2.13.4 位运算符

位运算符主要用于整数类型。

| 运算符 | 含义     |
| ------ | -------- |
| `&`    | 按位与   |
| `\|` | 按位或 |
| `^`    | 按位异或 |
| `&^`   | 按位清除 |
| `<<`   | 左移     |
| `>>`   | 右移     |

示例：

```go
a := 0b1100
b := 0b1010

fmt.Printf("%04b\n", a&b)  // 1000
fmt.Printf("%04b\n", a|b)  // 1110
fmt.Printf("%04b\n", a^b)  // 0110
fmt.Printf("%04b\n", a&^b) // 0100
```

左移：

```go
value := 1 << 3
fmt.Println(value) // 8
```

对于非负整数，左移一位通常相当于乘以 2，但应注意类型范围和溢出问题。

### 2.13.5 赋值运算符

| 运算符 | 含义           |
| ------ | -------------- |
| `=`    | 赋值           |
| `+=`   | 加后赋值       |
| `-=`   | 减后赋值       |
| `*=`   | 乘后赋值       |
| `/=`   | 除后赋值       |
| `%=`   | 取余后赋值     |
| `&=`   | 按位与后赋值   |
| `\|=` | 按位或后赋值 |
| `^=`   | 按位异或后赋值 |
| `&^=`  | 按位清除后赋值 |
| `<<=`  | 左移后赋值     |
| `>>=`  | 右移后赋值     |

示例：

```go
count := 10
count += 5
fmt.Println(count) // 15
```

### 2.13.6 自增和自减语句

Go 支持：

```go
count++
count--
```

但 `++` 和 `--` 在 Go 中属于语句，而不是可以嵌入表达式的运算符。

因此下面的写法不合法：

```go
result := count++
```

Go 也不支持：

```go
++count
--count
```

## 2.14 常用内置函数

Go 提供了一些无需导入包即可使用的内置函数。

### 2.14.1 len

`len` 用于取得长度，常用于：

- 字符串；
- 数组；
- 切片；
- 映射；
- 通道。

```go
fmt.Println(len("Go"))          // 2
fmt.Println(len([]int{1, 2}))   // 2
fmt.Println(len(map[string]int{"a": 1})) // 1
```

字符串的 `len` 返回字节数，不一定等于 Unicode 字符数量。

### 2.14.2 cap

`cap` 用于取得容量，主要用于：

- 数组；
- 指向数组的指针；
- 切片；
- 通道。

```go
numbers := make([]int, 2, 10)

fmt.Println(len(numbers)) // 2
fmt.Println(cap(numbers)) // 10
```

`cap` 不能用于映射。

### 2.14.3 append

`append` 用于向切片追加元素，并返回新的切片：

```go
numbers := []int{1, 2}
numbers = append(numbers, 3, 4)
```

`append` 的操作对象是切片，而不是数组。

由于追加操作可能分配新的底层数组，通常必须接收其返回值：

```go
numbers = append(numbers, 5)
```

### 2.14.4 copy

`copy` 用于复制切片元素，并返回实际复制的元素数量：

```go
src := []int{1, 2, 3}
dst := make([]int, len(src))

n := copy(dst, src)
fmt.Println(n)
fmt.Println(dst)
```

### 2.14.5 make

`make` 只能用于创建：

- 切片；
- 映射；
- 通道。

```go
numbers := make([]int, 0, 10)
scores := make(map[string]int)
messages := make(chan string)
```

`make` 返回初始化后的指定类型本身，而不是指针。

### 2.14.6 new

`new` 可以为任意类型分配一块已经清零的存储空间，并返回指向该值的指针：

```go
number := new(int)

fmt.Println(*number) // 0
*number = 10
```

`new(T)` 的返回类型是 `*T`。

### 2.14.7 delete 和 clear

`delete` 用于从映射中删除指定键：

```go
scores := map[string]int{
	"Alice": 90,
	"Bob":   85,
}

delete(scores, "Bob")
```

`clear` 可以清空映射或者将切片中的元素重置为零值：

```go
clear(scores)

numbers := []int{1, 2, 3}
clear(numbers)
```

执行后，`numbers` 的长度不会改变，但元素会变为零值。

### 2.14.8 close

`close` 用于关闭通道：

```go
messages := make(chan string)
close(messages)
```

通常由发送方在确认不会继续发送数据时关闭通道。关闭已经关闭的通道，或者向已关闭的通道发送数据，都会引发 panic。

### 2.14.9 complex、real 和 imag

`complex` 用于创建复数：

```go
value := complex(3, 4)
```

`real` 返回实部：

```go
fmt.Println(real(value)) // 3
```

`imag` 返回虚部：

```go
fmt.Println(imag(value)) // 4
```

### 2.14.10 panic 和 recover

`panic` 用于中止当前函数的正常执行，并沿调用栈向上传播异常状态。

`recover` 可以在延迟调用的函数中捕获当前 goroutine 的 panic。

它们通常用于处理程序无法继续执行的异常状态，不应代替普通的 `error` 错误处理。

### 2.14.11 print 和 println

Go 提供了内置的 `print` 和 `println`，但它们主要用于底层调试和引导阶段，不适合作为正式程序的常规输出方式。

普通程序应优先使用：

```go
fmt.Print()
fmt.Println()
fmt.Printf()
```

## 2.15 error 接口

`error` 是 Go 中预声明的接口类型，其定义可以理解为：

```go
type error interface {
	Error() string
}
```

任何类型只要实现了：

```go
Error() string
```

方法，就实现了 `error` 接口。

示例：

```go
type MyError struct {
	Message string
}

func (e MyError) Error() string {
	return e.Message
}
```

函数通常将错误作为最后一个返回值：

```go
func readData() ([]byte, error) {
	// ...
}
```

调用者通过判断错误是否为 `nil` 决定操作是否成功：

```go
data, err := readData()
if err != nil {
	return err
}

fmt.Println(data)
```

Go 通常使用显式返回的 `error` 处理可预期的失败，而不是使用异常机制处理普通业务错误。

## 2.16 init 函数

`init` 是一种特殊的包初始化函数：

```go
func init() {
	// 初始化代码
}
```

`init` 函数具有以下特点：

- 不能声明参数；
- 不能声明返回值；
- 不能被其他函数直接调用；
- 每个包可以定义多个 `init` 函数；
- 同一个源文件也可以定义多个 `init` 函数；
- 在包完成变量初始化后自动执行。

示例：

```go
package config

var Name = loadName()

func init() {
	validateConfig()
}
```

通常只有在确实需要包级自动初始化时才使用 `init`。能够通过显式函数完成的初始化，往往更容易测试和理解。

## 2.17 包的初始化顺序

一个完整 Go 程序的初始化过程可以概括为：

1. 初始化当前包依赖的其他包；
2. 初始化当前包的包级变量；
3. 按顺序执行当前包的 `init` 函数；
4. 所有相关包初始化完成后，执行 `main.main`。

被导入的包会先于导入它的包完成初始化，并且同一个包只会初始化一次。

- 需要注意的是：包的初始化顺序不是由 import 语句的书写顺序决定。Go 会根据包之间的依赖关系确定初始化顺序，而不是简单地按照 `import` 列表从上到下执行。

- 同一个文件中的多个 `init` 函数按照源代码中的出现顺序执行。对于同一个包内不同文件之间的初始化顺序，不应编写依赖文件名或者文件提交顺序的程序。规范允许构建系统以稳定顺序向编译器提供文件，但程序逻辑不应依赖这种实现细节。

## 2.18 init 与 main 的区别

| 对比项       | `init`             | `main`                                                       |
| ------------ | ------------------ | ------------------------------------------------------------ |
| 所在包       | 任意包             | 只能位于 `main` 包                                           |
| 数量         | 一个包中可以有多个 | 一个 `main` 包只能定义一个                                   |
| 参数         | 不能有             | 不能有                                                       |
| 返回值       | 不能有             | 不能有                                                       |
| 能否主动调用 | 不能               | 可以调用，通常由运行时作为程序入口调用 |
| 调用时间     | 包初始化阶段       | 所有相关包初始化完成后                                       |
| 主要用途     | 包级初始化         | 程序入口                                                     |

示例：

```go
package main

import "fmt"

var message = createMessage()

func createMessage() string {
	fmt.Println("初始化包级变量")
	return "Hello"
}

func init() {
	fmt.Println("执行 init")
}

func main() {
	fmt.Println("执行 main")
	fmt.Println(message)
}
```

输出顺序为：

```text
初始化包级变量
执行 init
执行 main
Hello
```

因此，在同一个包中，包级变量的初始化发生在 `init` 函数之前，而 `main` 函数在最后执行。

## 总结

- 源文件以 `package` 声明所属包，通过 `import` 引入需要的包。
- 使用变量、常量和 `iota` 表达数据与固定值，注意零值、作用域和短变量声明规则。
- 标识符的导出由首字母大小写决定，未使用的局部变量和导入会导致编译错误。
- 包级变量先于 `init` 初始化，所有包初始化完成后再执行 `main`。

## 参考资料

- [Go 语言规范](https://go.dev/ref/spec)
