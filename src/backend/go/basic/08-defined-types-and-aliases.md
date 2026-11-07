---
permalink: /backend/go/basic/08-defined-types-and-aliases/
title: 08. 定义类型与类型别名
shortTitle: 08. 定义类型与类型别名
order: 8
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 定义类型
  - 类型别名
  - type
  - 类型转换
---

# 08. 定义类型与类型别名

## 前言

Go 允许程序基于已有类型建立新的类型，也允许为已有类型提供另一个名称。

这两种声明都使用 `type` 关键字，但语义不同：

```go
type NewType ExistingType
type Alias = ExistingType
```

没有等号的形式会建立新的定义类型；带等号的形式只是声明类型别名。

正确理解两者的区别，是学习结构体、方法和接口的基础。

---

## 8.1 定义新的类型

定义类型的基本语法如下：

```go
type 新类型名 已有类型
```

例如：

```go
type UserID int64
type OrderID int64
type Celsius float64
type Username string
```

执行：

```go
type UserID int64
```

后，`UserID` 成为一个新的类型。

它的底层类型是 `int64`，因此可以使用适用于整数的许多运算：

```go
var first UserID = 100
var second UserID = 200

total := first + second
```

但是，`UserID` 与 `int64` 具有不同的类型身份：

```go
var id UserID = 100
var number int64 = 200

// 编译错误：UserID 和 int64 是不同类型
// number = id
```

需要显式转换：

```go
number = int64(id)
```

---

## 8.2 定义类型的用途

定义新类型不仅是为了更换名称，更重要的是表达数据的业务含义。

例如：

```go
type UserID int64
type OrderID int64
```

虽然二者的底层类型都是 `int64`，但它们代表不同概念：

```go
func findUser(id UserID) {
}

func findOrder(id OrderID) {
}
```

下面的错误可以在编译阶段被发现：

```go
var orderID OrderID = 100

// 编译错误：不能把 OrderID 当作 UserID 使用
// findUser(orderID)
```

如果直接使用 `int64` 表示所有编号，编译器无法判断某个编号到底代表用户还是订单。

因此，定义类型可以：

- 提升代码语义；
- 减少不同业务数据之间的误用；
- 为数据建立独立的方法；
- 对外暴露更清晰的 API；
- 隐藏底层表示方式。

例如，温度类型可以基于 `float64` 定义：

```go
type Celsius float64
```

以后即使内部表示方式发生变化，使用方仍然可以围绕 `Celsius` 这一语义编写代码。

---

## 8.3 类型转换

不同定义类型之间通常不能直接赋值，但可以在允许的情况下进行显式转换。

语法如下：

```go
目标类型(表达式)
```

例如：

```go
type UserID int64

var id UserID = 100

number := int64(id)
anotherID := UserID(number)
```

类型转换会明确告诉编译器：

> 程序员知道两个类型不同，并希望将当前值转换为目标类型。

显式转换与自动赋值不同。转换是否会改变数值，要根据源类型和目标类型判断：

```go
number := 3.9
integer := int(number)

fmt.Println(integer) // 3
```

从浮点数转换为整数时，小数部分会被舍弃。

类型转换也不同于接口类型断言：

- 类型转换用于编译期已知的可转换类型；
- 类型断言用于检查接口值的动态类型。

类型断言需要操作接口值，并不用于替代一般类型转换。

---

## 8.4 类型别名

类型别名不会创建新类型，它只是为已有类型提供另一个名称。

语法如下：

```go
type 别名 = 已有类型
```

例如：

```go
type MyInt = int
```

`MyInt` 与 `int` 表示同一个类型：

```go
var a MyInt = 10
var b int = a

fmt.Printf("%T\n", a) // int
fmt.Printf("%T\n", b) // int
```

Go 中常见的预声明别名包括：

```go
type byte = uint8
type rune = int32
```

因此：

- `byte` 与 `uint8` 是同一类型；
- `rune` 与 `int32` 是同一类型。

类型别名常用于：

- 包或类型迁移；
- 兼容旧 API；
- 为已有类型提供更符合上下文的名称；
- 在重构过程中保持源代码兼容性。

不应把类型别名描述为一个独立的新类型。

---

## 8.5 定义类型与类型别名的区别

下面两个声明只相差一个等号：

```go
type UserID int64
type Number = int64
```

但它们的语义完全不同。

| 对比项                 | 定义类型                 | 类型别名                 |
| ---------------------- | ------------------------ | ------------------------ |
| 语法                   | `type A B`               | `type A = B`             |
| 是否创建新类型         | 是                       | 否                       |
| 是否具有独立类型身份   | 是                       | 否                       |
| 与原类型是否相同       | 否                       | 是                       |
| 是否通常需要显式转换   | 是                       | 否                       |
| 能否建立自己的方法集合 | 可以                     | 不建立新的类型身份       |
| 主要用途               | 业务建模、封装、定义方法 | 兼容、迁移、提供另一名称 |

示例：

```go
package main

import "fmt"

type UserID int64
type Number = int64

func main() {
    var id UserID
    var number Number

    fmt.Printf("%T\n", id)
    fmt.Printf("%T\n", number)
}
```

运行结果：

```text
main.UserID
int64
```

`UserID` 是当前包中定义的新类型，而 `Number` 仍然只是 `int64` 的另一个名称。

---

## 8.6 定义类型与方法

定义类型可以拥有方法。

例如：

```go
type Celsius float64
```

可以为其定义格式化方法：

```go
func (c Celsius) String() string {
    return fmt.Sprintf("%.1f°C", c)
}
```

调用：

```go
temperature := Celsius(23.5)

fmt.Println(temperature.String())
```

方法不只能够定义在结构体上，也可以定义在整数、字符串等已有类型派生出的定义类型上。

方法声明中的接收者决定方法属于哪个定义类型，方法集决定该类型能否实现相应接口。

## 总结

- `type A B` 声明新的定义类型，`A` 与 `B` 具有不同的类型身份。
- `type A = B` 声明类型别名，两个名称表示同一个类型。
- 定义类型可以表达业务含义并声明自己的方法；类型别名常用于兼容与迁移。
- 不同类型之间是否能转换或赋值，需要遵循对应的类型规则。
