---
permalink: /backend/go/basic/08-pointers/
title: 10. 指针（Pointer）
shortTitle: 10. 指针（Pointer）
order: 10
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 指针
  - 值传递
  - 内存地址
  - new
---

# 10. 指针（Pointer）

## 前言

程序中的变量不仅保存数据，还会占用一定的内存空间。变量所在的内存位置可以用地址表示，而用于保存某个变量地址的值称为**指针**。

通常情况下，我们直接通过变量名读取或修改数据：

```go
number := 10
number = 20
```

有时，程序需要将某个变量的位置交给其他代码，使不同位置能够访问或修改同一个变量。这时就可以使用指针。

Go 中的普通指针比 C、C++ 中的指针受到更多限制：

- 普通指针不能进行加减运算；
- 不能通过指针随意访问相邻内存；
- 指针具有明确的目标类型；
- 指针的零值是 `nil`；
- Go 自动管理对象的生命周期，不需要手动释放普通指针指向的内存。

这些限制减少了越界访问、悬空指针等常见内存问题。

本节介绍的是 Go 的普通指针。`unsafe.Pointer` 可以绕过部分类型与内存安全限制，不属于普通指针操作。

## 10.1 指针的概念与类型

假设程序中声明了一个整数变量：

```go
number := 10
```

变量 `number` 包含两个重要信息：

- 它保存的值是 `10`；
- 它在内存中有一个对应地址。

使用取地址运算符 `&` 可以取得变量的地址：

```go
pointer := &number
```

此时：

- `number` 的类型是 `int`；
- `&number` 表示 `number` 的地址；
- `pointer` 的类型是 `*int`；
- `pointer` 保存了 `number` 的地址。

如果一个值的类型是 `T`，那么指向该类型值的指针类型写作：

```go
*T
```

例如：

```go
var intPointer *int
var stringPointer *string
var boolPointer *bool
var userPointer *User
```

其中：

- `*int` 表示指向 `int` 值的指针；
- `*string` 表示指向 `string` 值的指针；
- `*bool` 表示指向 `bool` 值的指针；
- `*User` 表示指向 `User` 结构体值的指针。

指针的目标类型属于指针类型的一部分，因此不同目标类型的指针是不同类型：

```go
number := 10
text := "Go"

numberPointer := &number // *int
textPointer := &text     // *string

// 编译错误：不能将 *string 赋给 *int
// numberPointer = textPointer
```

指针类型使编译器能够知道指针指向什么类型的数据，从而在编译阶段检查不正确的指针操作。

------

## 10.2 取地址与解引用

学习 Go 指针，主要需要理解两个运算符：

| 运算符 | 作用                           |
| ------ | ------------------------------ |
| `&`    | 取得变量的地址                 |
| `*`    | 访问指针指向的值，也称为解引用 |

### 10.2.1 取地址运算符 `&`

使用 `&变量` 可以取得变量的地址：

```go
number := 10
pointer := &number
```

这里的 `pointer` 保存了 `number` 的地址。

可以使用 `%p` 输出地址，使用 `%T` 输出类型：

```go
package main

import "fmt"

func main() {
    number := 10
    pointer := &number

    fmt.Printf("number 的值：%d\n", number)
    fmt.Printf("number 的地址：%p\n", &number)
    fmt.Printf("pointer 保存的地址：%p\n", pointer)
    fmt.Printf("pointer 的类型：%T\n", pointer)
}
```

一次运行可能得到：

```text
number 的值：10
number 的地址：0xc0000120d0
pointer 保存的地址：0xc0000120d0
pointer 的类型：*int
```

具体的内存地址由程序运行环境决定，每次运行时都可能不同，因此程序不应依赖具体的地址数值。

变量与指针的关系可以简单表示为：

```text
变量 number
┌─────────────┐
│ 值：10      │
└─────────────┘
       ▲
       │ pointer 保存 number 的地址
       │
┌─────────────┐
│ pointer     │
└─────────────┘
```

### 10.2.2 解引用运算符 `*`

取得变量地址后，可以使用 `*` 访问该地址指向的值：

```go
value := *pointer
```

这一操作称为**解引用**。

```go
package main

import "fmt"

func main() {
    number := 10
    pointer := &number
    value := *pointer

    fmt.Printf("pointer 的类型：%T\n", pointer)
    fmt.Printf("value 的类型：%T\n", value)
    fmt.Printf("value 的值：%d\n", value)
}
```

运行结果：

```text
pointer 的类型：*int
value 的类型：int
value 的值：10
```

星号 `*` 在不同位置有两种含义。

在类型中：

```go
var pointer *int
```

`*int` 表示“指向 `int` 的指针类型”。

在表达式中：

```go
value := *pointer
```

`*pointer` 表示“取得该指针指向的值”。

可以将相关表达式区分如下：

```go
number     // 普通变量
&number    // number 的地址
pointer    // 保存 number 地址的指针
*pointer   // pointer 指向的值，也就是 number
```

需要注意，指针变量本身也是一个变量，因此它也有自己的地址：

```go
number := 10
pointer := &number

fmt.Printf("number 的地址：%p\n", &number)
fmt.Printf("pointer 保存的地址：%p\n", pointer)
fmt.Printf("pointer 自己的地址：%p\n", &pointer)
```

其中：

- `pointer` 保存的是 `number` 的地址；
- `&pointer` 表示指针变量 `pointer` 自己的地址。

------

## 10.3 通过指针读取和修改变量

解引用表达式不仅可以读取目标值，还可以作为赋值目标，修改指针指向的变量。

```go
package main

import "fmt"

func main() {
    number := 10
    pointer := &number

    *pointer = 100

    fmt.Println(number)
}
```

运行结果：

```text
100
```

执行：

```go
*pointer = 100
```

相当于根据 `pointer` 中保存的地址找到 `number`，然后将 `number` 修改为 `100`。

还可以在原值基础上进行运算：

```go
number := 10
pointer := &number

*pointer += 5

fmt.Println(number) // 15
```

也可以对指针指向的整数执行自增操作：

```go
number := 10
pointer := &number

(*pointer)++

fmt.Println(number) // 11
```

这里使用括号是为了清楚地表达：自增的是 `pointer` 指向的整数，而不是指针本身。

多个指针可以指向同一个变量：

```go
number := 10

a := &number
b := &number

*a = 20
fmt.Println(*b)    // 20
fmt.Println(number) // 20
```

由于 `a` 和 `b` 指向同一个变量，通过其中任意一个指针修改数据，其他位置都能观察到变化。

------

## 10.4 指针的零值：nil

指针类型的零值是 `nil`。

```go
var pointer *int
```

此时，`pointer` 没有指向任何有效的 `int` 值：

```go
fmt.Println(pointer == nil) // true
```

可以在使用指针前判断它是否为 `nil`：

```go
if pointer == nil {
    fmt.Println("pointer 没有指向有效数据")
}
```

完整示例：

```go
package main

import "fmt"

func main() {
    var pointer *string

    fmt.Printf("pointer 的值：%p\n", pointer)

    if pointer == nil {
        fmt.Println("pointer 是 nil")
    } else {
        fmt.Println("pointer 不是 nil")
    }
}
```

运行结果：

```text
pointer 的值：0x0
pointer 是 nil
```

`nil` 表示指针当前没有指向有效对象，但 `nil` 本身并不是一个可以被读取或修改的对象。

### 10.4.1 不能解引用 nil 指针

不能对 `nil` 指针执行解引用：

```go
var pointer *int

fmt.Println(*pointer)
```

程序运行时会发生恐慌：

```text
panic: runtime error: invalid memory address or nil pointer dereference
```

同样，也不能通过 `nil` 指针写入数据：

```go
var pointer *int

*pointer = 100
```

正确做法是先让指针指向一个有效变量：

```go
number := 0
pointer := &number

*pointer = 100
```

也可以使用 `new` 创建一个相应类型的零值：

```go
pointer := new(int)

*pointer = 100
```

当一个指针可能为 `nil` 时，应根据程序语义决定是否先进行检查：

```go
if pointer == nil {
    return
}

fmt.Println(*pointer)
```

不过，并不是所有指针参数都必须机械地判断 `nil`。如果函数约定参数一定不能为空，也可以让错误尽早暴露。是否检查应由函数的接口约定决定。

------

## 10.5 指针参数与值传递

Go 中所有函数参数都是按值传递的。

所谓按值传递，是指调用函数时，函数会得到实参值的一份副本。

### 10.5.1 普通值参数

将整数传给函数时，函数得到整数值的副本：

```go
package main

import "fmt"

func modifyValue(number int) {
    number = 100
}

func main() {
    number := 10

    modifyValue(number)

    fmt.Println(number) // 10
}
```

函数中的 `number` 是调用方变量值的副本。修改这个副本，不会影响调用方的变量。

### 10.5.2 指针参数

如果函数需要修改调用方的变量，可以传入该变量的指针：

```go
package main

import "fmt"

func modifyPointer(number *int) {
    *number = 100
}

func main() {
    number := 10

    modifyPointer(&number)

    fmt.Println(number) // 100
}
```

执行过程如下：

1. `&number` 取得调用方变量的地址；
2. 函数参数接收到这个地址的一份副本；
3. 副本仍然指向调用方的 `number`；
4. `*number = 100` 修改了该地址指向的变量。

应当准确理解：

> Go 仍然是在按值传递参数，只不过这次传递的值是一个指针。

普通参数和指针参数的区别如下：

```go
func modifyValue(number int) {
    number = 100
}

func modifyPointer(number *int) {
    *number = 100
}
```

调用：

```go
number := 10

modifyValue(number)
fmt.Println(number) // 10

modifyPointer(&number)
fmt.Println(number) // 100
```

### 10.5.3 修改目标值与修改指针副本

在函数中修改 `*pointer`，会修改指针指向的目标值：

```go
func reset(pointer *int) {
    *pointer = 0
}
```

但如果只是重新给参数 `pointer` 赋值，修改的只是函数内部的指针副本：

```go
func clearPointer(pointer *int) {
    pointer = nil
}

func main() {
    number := 10
    pointer := &number

    clearPointer(pointer)

    fmt.Println(pointer == nil) // false
    fmt.Println(*pointer)       // 10
}
```

这是因为函数参数 `pointer` 本身也是按值传递的。将函数内部的指针副本改为 `nil`，不会改变调用方保存的指针。

------

## 10.6 指针与结构体

指针经常与结构体一起使用。

```go
type User struct {
    Name string
    Age  int
}
```

可以先创建结构体值，再取得它的地址：

```go
user := User{
    Name: "Alice",
    Age:  20,
}

pointer := &user
```

此时，`pointer` 的类型是：

```go
*User
```

理论上，通过结构体指针访问字段可以写成：

```go
(*pointer).Age = 21
```

Go 允许将它简写为：

```go
pointer.Age = 21
```

完整示例：

```go
package main

import "fmt"

type User struct {
    Name string
    Age  int
}

func main() {
    user := User{
        Name: "Alice",
        Age:  20,
    }

    pointer := &user
    pointer.Age = 21

    fmt.Println(user.Age) // 21
}
```

下面两种写法效果相同：

```go
(*pointer).Age = 21
pointer.Age = 21
```

实际开发中通常使用第二种写法。

也可以直接取得结构体字面量的地址：

```go
user := &User{
    Name: "Alice",
    Age:  20,
}
```

此时，`user` 的类型是 `*User`，而不是 `User`。

结构体指针作为函数参数时，可以直接修改原结构体：

```go
func birthday(user *User) {
    if user == nil {
        return
    }

    user.Age++
}
```

调用：

```go
user := User{
    Name: "Alice",
    Age:  20,
}

birthday(&user)

fmt.Println(user.Age) // 21
```

------

## 10.7 何时使用指针

指针并不是越多越好。是否使用指针，应根据数据语义和函数职责决定。

### 10.7.1 函数需要修改调用方的数据

```go
func reset(number *int) {
    if number == nil {
        return
    }

    *number = 0
}
```

调用：

```go
number := 10
reset(&number)

fmt.Println(number) // 0
```

### 10.7.2 避免复制较大的值

结构体按值传递时，会复制整个结构体：

```go
type Report struct {
    Title   string
    Content [4096]byte
}

func printReport(report Report) {
    fmt.Println(report.Title)
}
```

使用指针参数时，只需要复制一个指针值：

```go
func printReport(report *Report) {
    if report == nil {
        return
    }

    fmt.Println(report.Title)
}
```

不过，是否使用指针不应只根据字段数量机械决定。还需要考虑：

- 函数是否需要修改对象；
- 值复制是否符合该类型的语义；
- 对象是否需要被多个位置共享；
- 是否需要使用 `nil` 表示对象不存在；
- 指针是否会引入不必要的共享状态。

### 10.7.3 需要表示对象不存在

指针可以使用 `nil` 表示“没有对象”：

```go
type User struct {
    ID   int
    Name string
}

func findUser(id int) *User {
    if id <= 0 {
        return nil
    }

    return &User{
        ID:   id,
        Name: "Alice",
    }
}
```

调用方可以判断返回值：

```go
user := findUser(0)

if user == nil {
    fmt.Println("没有找到用户")
}
```

### 10.7.4 需要表达对象身份或共享状态

即使两个结构体的字段值相同，它们仍然可能是两个独立对象。使用指针可以明确表示多个位置操作的是同一个对象。

```go
type Counter struct {
    Value int
}

func increase(counter *Counter) {
    counter.Value++
}
```

### 10.7.5 不需要使用指针的情况

对于整数、布尔值以及其他较小且只读的数据，直接传值通常更加简单：

```go
func add(a, b int) int {
    return a + b
}
```

没有必要写成：

```go
func add(a, b *int) int {
    return *a + *b
}
```

不必要地使用指针可能带来以下问题：

- 需要额外处理 `nil`；
- 增加状态共享；
- 降低代码可读性；
- 使函数是否修改数据变得不够直观；
- 不一定能够提高性能。

------

## 10.8 返回局部变量的指针

Go 函数可以安全地返回局部变量的地址：

```go
package main

import "fmt"

func createNumber() *int {
    number := 10
    return &number
}

func main() {
    pointer := createNumber()

    fmt.Println(*pointer) // 10
}
```

虽然 `number` 是函数内部的局部变量，但函数返回后，它并不会因为离开作用域而立即失效。

Go 编译器会进行逃逸分析，根据变量的实际使用情况决定将其放在合适的位置。只要仍然存在能够访问该对象的指针，对象就会继续存在。

当对象不再被程序引用时，垃圾回收器会在合适的时机回收相应内存。

因此，在 Go 中：

- 可以安全返回局部变量的指针；
- 不需要手动调用 `free` 或 `delete`；
- 不应依赖变量究竟分配在栈上还是堆上；
- 应关注变量的语义和生命周期，而不是手动管理普通对象的内存。

------

## 10.9 new 函数

`new` 是 Go 的内置函数，用于创建某种类型的零值，并返回指向该值的指针。

可以将其理解为：

```go
new(T) -> *T
```

例如：

```go
package main

import "fmt"

func main() {
    number := new(int)
    enabled := new(bool)
    text := new(string)

    fmt.Printf("number 的类型：%T\n", number)
    fmt.Printf("enabled 的类型：%T\n", enabled)
    fmt.Printf("text 的类型：%T\n", text)

    fmt.Println(*number)
    fmt.Println(*enabled)
    fmt.Println(*text)
}
```

运行结果：

```text
number 的类型：*int
enabled 的类型：*bool
text 的类型：*string
0
false
```

其中：

- `new(int)` 返回 `*int`，指向的初始值是 `0`；
- `new(bool)` 返回 `*bool`，指向的初始值是 `false`；
- `new(string)` 返回 `*string`，指向的初始值是 `""`。

可以通过解引用修改它指向的值：

```go
number := new(int)

*number = 100

fmt.Println(*number) // 100
```

下面两种写法的效果接近：

```go
number := new(int)
value := 0
number := &value
```

对于普通变量，直接声明变量并取得地址通常更加直观：

```go
number := 10
pointer := &number
```

`new` 可以用于任意类型：

```go
type User struct {
    Name string
    Age  int
}

user := new(User)
```

此时：

- `user` 的类型是 `*User`；
- `user` 指向一个字段均为零值的 `User`；
- `user.Name` 的初始值是 `""`；
- `user.Age` 的初始值是 `0`。

对于结构体，下面两种写法效果相近：

```go
user := new(User)
user := &User{}
```

如果需要在创建结构体时初始化字段，通常使用结构体字面量：

```go
user := &User{
    Name: "Alice",
    Age:  20,
}
```

需要注意，`new(T)` 的语义是创建一个 `T` 类型的零值并返回其地址，并不表示程序员必须关心该对象最终位于栈还是堆。具体的内存分配位置由编译器决定。

------

## 10.10 new 与 make 的区别

`new` 和 `make` 都是 Go 的内置函数，但它们解决的问题不同。

`new` 可以用于任意类型，它返回指向类型零值的指针：

```go
pointer := new(T)
```

其返回类型是：

```go
*T
```

`make` 只用于初始化以下三种类型：

- 切片；
- 映射；
- 通道。

`make` 返回的是初始化后的类型本身，而不是指向该类型的指针。

| 对比项                     | `new`              | `make`                 |
| -------------------------- | ------------------ | ---------------------- |
| 适用类型                   | 任意类型           | 仅切片、映射和通道     |
| 返回类型                   | `*T`               | `T`                    |
| 返回内容                   | 指向类型零值的指针 | 已完成运行时初始化的值 |
| 是否完成映射初始化         | 否                 | 是                     |
| 是否完成通道初始化         | 否                 | 是                     |
| 是否可以指定切片长度和容量 | 否                 | 是                     |

例如：

```go
number := new(int)
```

`number` 的类型是：

```go
*int
```

而：

```go
numbers := make([]int, 3)
```

`numbers` 的类型是：

```go
[]int
```

不是：

```go
*[]int
```

### 10.10.1 new 与 make 创建映射的区别

```go
mapPointer := new(map[string]int)
scores := make(map[string]int)
```

它们的类型分别是：

```go
fmt.Printf("%T\n", mapPointer) // *map[string]int
fmt.Printf("%T\n", scores)     // map[string]int
```

`new(map[string]int)` 创建的是一个指向映射零值的指针，而映射的零值是 `nil`：

```go
fmt.Println(*mapPointer == nil) // true
```

因此，下面的代码会发生运行时错误：

```go
mapPointer := new(map[string]int)

// *mapPointer 仍然是 nil 映射
(*mapPointer)["Alice"] = 90
```

要使它能够写入，还需要额外初始化：

```go
mapPointer := new(map[string]int)
*mapPointer = make(map[string]int)

(*mapPointer)["Alice"] = 90
```

但这种写法通常没有必要。更直接的方式是：

```go
scores := make(map[string]int)
scores["Alice"] = 90
```

### 10.10.2 相关类型的零值行为

为了理解 `new` 与 `make` 的区别，需要知道：

- `nil` 切片可以执行 `len`、`cap`、`range` 和 `append`；
- `nil` 映射可以读取，但不能写入；
- 对 `nil` 通道发送或接收数据会永久阻塞。

需要区分：

> `new` 返回指向零值的指针，`make` 返回已经完成必要初始化的切片、映射或通道。

------

## 10.11 指针与切片、映射的共享行为

切片和映射作为函数参数时，修改其中的数据通常可以被调用方观察到，因此容易被误认为是“引用传递”。

例如：

```go
func change(numbers []int) {
    numbers[0] = 100
}
```

调用：

```go
numbers := []int{1, 2, 3}

change(numbers)

fmt.Println(numbers) // [100 2 3]
```

这并不是因为 Go 将切片按引用传递，而是因为：

1. 切片参数仍然按值复制；
2. 复制后的切片值仍然引用同一个底层数组；
3. 修改切片元素时，修改的是共享的底层数组。

映射也类似：

```go
func update(scores map[string]int) {
    scores["Alice"] = 100
}
```

调用：

```go
scores := map[string]int{
    "Alice": 90,
}

update(scores)

fmt.Println(scores["Alice"]) // 100
```

复制后的映射值仍然引用相同的底层映射数据，因此修改键值对时，调用方能够观察到变化。

但是，在函数中重新给参数赋值，不会直接替换调用方的变量：

```go
func replace(scores map[string]int) {
    scores = map[string]int{
        "Bob": 80,
    }
}
```

调用：

```go
scores := map[string]int{
    "Alice": 90,
}

replace(scores)

fmt.Println(scores) // map[Alice:90]
```

函数中修改的是映射参数的副本。

因此，更准确的表述是：

> Go 中所有函数参数都是按值传递。指针、切片、映射和通道被传递时，复制的是它们各自的值，而这些值可能继续引用共享的数据。

由于切片和映射本身已经包含对底层数据的引用信息，普通情况下没有必要使用 `*[]T` 或 `*map[K]V`。只有在确实需要替换调用方保存的切片值或映射值时，才可能考虑使用相应指针，或者更常见地将新值作为函数返回值。

------

## 10.12 指针的比较

指针可以与 `nil` 比较：

```go
if pointer == nil {
    fmt.Println("空指针")
}
```

相同类型的指针之间也可以比较。

如果两个指针指向同一个变量，比较结果为 `true`：

```go
number := 10

a := &number
b := &number

fmt.Println(a == b) // true
```

如果两个指针指向不同变量，即使变量保存的值相同，指针比较结果通常也是 `false`：

```go
number1 := 10
number2 := 10

a := &number1
b := &number2

fmt.Println(a == b) // false
```

指针比较的是：

> 两个指针是否指向同一个对象。

它比较的不是目标对象中保存的值是否相等。

如果需要比较目标值，应当进行解引用：

```go
fmt.Println(*a == *b) // true
```

------

## 10.13 普通指针不能进行算术运算

Go 的普通指针不能执行加减运算：

```go
number := 10
pointer := &number

// 编译错误
// pointer++
// pointer = pointer + 1
```

这与整数自增不同：

```go
(*pointer)++
```

上面的代码修改的是指针指向的整数值，并不是让指针移动到下一个内存位置。

如果需要访问数组或切片中的不同元素，应当使用索引：

```go
numbers := []int{10, 20, 30}

fmt.Println(numbers[0])
fmt.Println(numbers[1])
fmt.Println(numbers[2])
```

禁止普通指针算术，可以防止程序通过地址偏移随意访问未知内存区域。

标准库中的 `unsafe` 包提供了一些绕过普通指针限制的能力，但它会削弱 Go 的类型与内存安全保证，不应在普通业务代码中随意使用。

------

## 10.14 常见问题

### 10.14.1 对 nil 指针解引用

错误：

```go
var pointer *int

*pointer = 100
```

正确：

```go
number := 0
pointer := &number

*pointer = 100
```

或者：

```go
pointer := new(int)

*pointer = 100
```

### 10.14.2 混淆指针类型与解引用表达式

```go
var pointer *int
```

这里的 `*int` 是指针类型。

```go
value := *pointer
```

这里的 `*pointer` 是解引用表达式。

### 10.14.3 误以为指针参数不是值传递

```go
func change(pointer *int) {
}
```

函数得到的仍然是指针值的副本，只是这个副本与调用方传入的指针指向同一个目标。

### 10.14.4 为所有参数都使用指针

下面的函数直接使用值参数更加自然：

```go
func add(a, b int) int {
    return a + b
}
```

没有必要写成：

```go
func add(a, b *int) int {
    return *a + *b
}
```

### 10.14.5 使用 new 初始化映射

下面的写法不会得到可以直接写入的映射：

```go
scores := new(map[string]int)
```

通常应使用：

```go
scores := make(map[string]int)
```

### 10.14.6 认为 make 返回指针

```go
numbers := make([]int, 3)
```

`numbers` 的类型是 `[]int`，而不是 `*[]int`。

### 10.14.7 依赖具体内存地址

地址可能随着每次运行、编译方式和运行环境发生变化：

```go
fmt.Printf("%p\n", pointer)
```

地址通常只适合调试或判断两个指针是否指向同一对象，不应作为稳定的业务数据使用。

------

## 10.15 综合示例

下面的程序综合演示指针、结构体、指针参数、`nil` 检查以及返回局部变量地址：

```go
package main

import "fmt"

type User struct {
    Name string
    Age  int
}

func createUser(name string, age int) *User {
    user := User{
        Name: name,
        Age:  age,
    }

    return &user
}

func birthday(user *User) {
    if user == nil {
        return
    }

    user.Age++
}

func rename(user *User, name string) {
    if user == nil {
        return
    }

    user.Name = name
}

func main() {
    user := createUser("Alice", 20)

    fmt.Printf("user 的类型：%T\n", user)
    fmt.Printf("user 保存的地址：%p\n", user)
    fmt.Printf("修改前：%s，%d\n", user.Name, user.Age)

    birthday(user)
    rename(user, "Bob")

    fmt.Printf("修改后：%s，%d\n", user.Name, user.Age)

    var empty *User
    birthday(empty) // nil 检查后直接返回
}
```

输出类似：

```text
user 的类型：*main.User
user 保存的地址：0xc000010030
修改前：Alice，20
修改后：Bob，21
```

在这个示例中：

1. `createUser` 返回局部结构体变量的地址；
2. 返回值类型为 `*User`；
3. `birthday` 通过结构体指针修改年龄；
4. `rename` 通过结构体指针修改姓名；
5. 两个函数接收到的都是指针值的副本；
6. 这些指针副本仍然指向同一个 `User`；
7. 使用指针前先处理了可能出现的 `nil`。

------

## 10.16 练习

### 10.16.1 练习一：交换两个整数

实现一个函数，通过指针交换两个整数变量的值：

```go
func swap(a, b *int) {
    *a, *b = *b, *a
}
```

调用：

```go
x := 10
y := 20

swap(&x, &y)

fmt.Println(x, y) // 20 10
```

### 10.16.2 练习二：将整数重置为零

```go
func reset(number *int) {
    if number == nil {
        return
    }

    *number = 0
}
```

调用：

```go
number := 100

reset(&number)

fmt.Println(number) // 0
```

### 10.16.3 练习三：安全读取指针

编写一个函数，接收 `*int`：

- 参数为 `nil` 时返回 `0`；
- 参数不为 `nil` 时返回指针指向的值。

```go
func valueOrZero(number *int) int {
    if number == nil {
        return 0
    }

    return *number
}
```

### 10.16.4 练习四：修改结构体

```go
type User struct {
    Name string
    Age  int
}
```

实现一个函数，使用户年龄增加一岁：

```go
func birthday(user *User) {
    if user == nil {
        return
    }

    user.Age++
}
```

------

## 总结

指针类型的基本形式为：

```go
*T
```

取得变量地址：

```go
pointer := &value
```

读取指针指向的值：

```go
result := *pointer
```

修改指针指向的值：

```go
*pointer = newValue
```

通过指针参数修改调用方变量：

```go
func change(value *int) {
    *value = 100
}
```

调用时传入变量地址：

```go
change(&number)
```

指针的零值是：

```go
nil
```

创建指向类型零值的指针：

```go
pointer := new(T)
```

其返回类型为：

```go
*T
```

初始化切片、映射或通道时使用 `make`：

```go
slice := make([]T, length, capacity)
data := make(map[K]V)
channel := make(chan T)
```

学习指针时，需要重点理解：

- 指针变量保存的是目标变量的地址；
- `&` 用于取得地址，`*` 用于解引用；
- 修改 `*pointer` 会修改指针指向的目标值；
- 指针的零值是 `nil`，不能对 `nil` 指针解引用；
- Go 中所有函数参数都是按值传递；
- 指针参数传递的仍然是指针值的副本；
- 结构体指针可以直接使用 `pointer.Field` 访问字段；
- Go 函数可以安全返回局部变量的地址；
- `new(T)` 返回指向 `T` 类型零值的指针；
- `make` 只用于初始化切片、映射和通道；
- 切片、映射的共享行为不等于引用传递；
- 普通指针不能进行算术运算；
- 是否使用指针，应根据修改需求、共享语义和数据规模决定，而不是机械地为所有值使用指针。
