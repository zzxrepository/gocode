---
permalink: /backend/go/basic/05-arrays-and-slices/
title: 06. 数组与切片（Array and Slice）
shortTitle: 06. 数组与切片（Array and Slice）
order: 6
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 数组
  - 切片
  - append
  - cap
  - range
---

# 06. 数组与切片（Array and Slice）

## 前言

数组和切片都用于保存相同类型的一组元素。数组适合长度固定的数据，切片适合长度可能变化的序列。理解它们的区别，关键在于数组的值语义，以及切片的长度、容量和底层数组之间的关系。

## 6.1 数组（Array）

数组是一组具有相同元素类型、长度固定的数据集合。

数组中的元素按照顺序连续排列，可以通过下标访问。数组适合表示长度在编译阶段已经确定的数据，例如一周七天的温度、固定长度的坐标、颜色通道或者矩阵中的一行数据。

Go 数组具有以下几个重要特点：

- 数组中的所有元素必须具有相同的类型；
- 数组长度在定义后不能改变；
- 数组长度是数组类型的一部分；
- 数组中的元素都有确定的零值；
- 数组赋值和函数传参会复制整个数组；
- 当元素类型可比较时，数组也可以比较。

### 6.1.1 数组的概念与类型特征

Go 数组类型的基本形式如下：

```go
[长度]元素类型
```

例如：

```go
[5]int
[3]string
[4]bool
```

其中：

- `[5]int` 表示包含 5 个 `int` 元素的数组；
- `[3]string` 表示包含 3 个 `string` 元素的数组；
- `[4]bool` 表示包含 4 个 `bool` 元素的数组。

#### 6.1.1.1 数组长度是类型的一部分

在 Go 中，数组长度不仅表示元素数量，同时也是数组类型的一部分。

因此：

```go
[3]int
```

和：

```go
[5]int
```

是两种不同的类型。

例如：

```go
package main

import "fmt"

func main() {
    var a [3]int
    var b [5]int

    fmt.Printf("a 的类型：%T\n", a)
    fmt.Printf("b 的类型：%T\n", b)
}
```

运行结果：

```text
a 的类型：[3]int
b 的类型：[5]int
```

由于数组类型不同，不能直接进行赋值：

```go
var a [3]int
var b [5]int

// 编译错误：[3]int 和 [5]int 是不同类型
// a = b
```

函数参数中的数组长度同样属于类型的一部分：

```go
func printArray(array [3]int) {
    // ...
}
```

该函数只能接收 `[3]int`，不能直接接收 `[4]int`。

#### 6.1.1.2 数组长度必须在编译阶段确定

数组长度必须是非负的整数常量。

正确写法：

```go
const size = 5

var a [size]int
var b [3 + 2]int
```

下面的写法不正确：

```go
size := 5

// 编译错误：size 不是常量
// var a [size]int
```

如果数据长度需要在程序运行过程中动态变化，通常应使用切片。

#### 6.1.1.3 数组元素类型

数组元素可以是任意有效类型，包括：

```go
[5]int        // 整数数组
[3]string     // 字符串数组
[2]bool       // 布尔数组
[4]MyStruct   // 结构体数组
[3][2]int     // 数组的元素仍然是数组
```

------

### 6.1.2 数组的声明与零值

数组可以使用 `var` 关键字声明：

```go
var 数组名 [长度]元素类型
```

例如：

```go
package main

import "fmt"

func main() {
    var numbers [5]int
    var names [3]string
    var flags [2]bool

    fmt.Println(numbers)
    fmt.Printf("%q\n", names)
    fmt.Println(flags)
}
```

运行结果：

```text
[0 0 0 0 0]
["" "" ""]
[false false]
```

声明数组但没有显式初始化时，数组中的每个元素都会被初始化为对应类型的零值。

常见类型的零值如下：

| 元素类型 | 零值    |
| -------- | ------- |
| 整数类型 | `0`     |
| 浮点类型 | `0`     |
| 布尔类型 | `false` |
| 字符串   | `""`    |
| 指针     | `nil`   |

#### 6.1.2.1 获取数组长度和容量

内置函数 `len` 可以获得数组中的元素数量：

```go
numbers := [5]int{10, 20, 30, 40, 50}

fmt.Println(len(numbers))
```

运行结果：

```text
5
```

对数组使用 `cap`，返回值也等于数组长度：

```go
package main

import "fmt"

func main() {
    numbers := [5]int{}

    fmt.Println("长度：", len(numbers))
    fmt.Println("容量：", cap(numbers))
}
```

运行结果：

```text
长度：5
容量：5
```

对于数组来说，长度和容量始终相等。容量这个概念在切片中更加重要。

#### 6.1.2.2 数组的比较

当数组的元素类型可比较时，两个相同类型的数组可以使用 `==` 和 `!=` 进行比较。

```go
package main

import "fmt"

func main() {
    a := [3]int{1, 2, 3}
    b := [3]int{1, 2, 3}
    c := [3]int{1, 2, 4}

    fmt.Println(a == b)
    fmt.Println(a == c)
    fmt.Println(a != c)
}
```

运行结果：

```text
true
false
true
```

比较数组时，程序会依次比较两个数组中相同位置的元素。只有所有对应元素都相等，两个数组才相等。

数组能够比较，并不是因为数组内存已经初始化，而是因为其元素类型支持比较。

如果数组的元素类型不可比较，那么数组也不能比较。例如，切片不支持普通的相等比较，因此切片数组也不能比较：

```go
var a [2][]int
var b [2][]int

// 编译错误：[]int 不可比较
// fmt.Println(a == b)
```

------

### 6.1.3 数组的初始化

除了先声明数组再逐个赋值，还可以在创建数组时直接指定元素值。

#### 6.1.3.1 指定长度初始化

```go
numbers := [5]int{10, 20, 30}
```

数组长度为 5，但只提供了 3 个初始值。没有指定的元素会使用零值。

完整示例：

```go
package main

import "fmt"

func main() {
    numbers := [5]int{10, 20, 30}

    fmt.Println(numbers)
}
```

运行结果：

```text
[10 20 30 0 0]
```

#### 6.1.3.2 由编译器推断数组长度

在数组字面量中，可以使用 `...` 让编译器根据初始值数量推断数组长度：

```go
numbers := [...]int{10, 20, 30, 40}
```

等价于：

```go
numbers := [4]int{10, 20, 30, 40}
```

例如：

```go
package main

import "fmt"

func main() {
    numbers := [...]int{10, 20, 30, 40}

    fmt.Println(numbers)
    fmt.Println("数组长度：", len(numbers))
    fmt.Printf("数组类型：%T\n", numbers)
}
```

运行结果：

```text
[10 20 30 40]
数组长度：4
数组类型：[4]int
```

需要注意，`...` 只能用于数组复合字面量中：

```go
numbers := [...]int{1, 2, 3}
```

不能用于普通数组变量的类型声明：

```go
// 编译错误
// var numbers [...]int
```

#### 6.1.3.3 按索引初始化

可以通过 `索引: 值` 的形式，只初始化数组中的指定位置：

```go
numbers := [5]int{
    1: 100,
    4: 200,
}
```

其中：

- 索引 `1` 的元素被初始化为 `100`；
- 索引 `4` 的元素被初始化为 `200`；
- 其他元素保持零值。

完整示例：

```go
package main

import "fmt"

func main() {
    numbers := [5]int{
        1: 100,
        4: 200,
    }

    fmt.Println(numbers)
}
```

运行结果：

```text
[0 100 0 0 200]
```

也可以同时使用普通初始化和按索引初始化：

```go
numbers := [...]int{
    10,
    20,
    5: 60,
}
```

此时数组长度由最大索引决定。

#### 6.1.3.4 初始化结构体数组

数组的元素也可以是结构体：

```go
package main

import "fmt"

func main() {
    users := [...]struct {
        name string
        age  uint8
    }{
        {
            name: "user1",
            age:  18,
        },
        {
            name: "user2",
            age:  20,
        },
    }

    fmt.Println(users)
}
```

运行结果：

```text
[{user1 18} {user2 20}]
```

在数组字面量中，元素类型已经由数组类型确定，因此初始化每个结构体元素时，不需要重复填写完整的结构体类型。

综合示例：

```go
package main

import "fmt"

func main() {
    a := [3]int{1, 2}
    b := [...]int{1, 2, 3, 4}
    c := [5]int{2: 100, 4: 200}

    users := [...]struct {
        name string
        age  uint8
    }{
        {name: "user1", age: 18},
        {name: "user2", age: 20},
    }

    fmt.Println(a)
    fmt.Println(b)
    fmt.Println(c)
    fmt.Println(users)
}
```

运行结果：

```text
[1 2 0]
[1 2 3 4]
[0 0 100 0 200]
[{user1 18} {user2 20}]
```

------

### 6.1.4 数组元素的访问与修改

数组中的元素可以通过下标访问：

```go
数组名[下标]
```

数组下标从 `0` 开始。

对于长度为 `n` 的数组：

- 第一个元素下标是 `0`；
- 第二个元素下标是 `1`；
- 最后一个元素下标是 `n-1`。

例如：

```go
package main

import "fmt"

func main() {
    numbers := [4]int{10, 20, 30, 40}

    fmt.Println(numbers[0])
    fmt.Println(numbers[1])
    fmt.Println(numbers[len(numbers)-1])
}
```

运行结果：

```text
10
20
40
```

#### 6.1.4.1 修改数组元素

数组元素可以通过下标重新赋值：

```go
package main

import "fmt"

func main() {
    numbers := [3]int{10, 20, 30}

    numbers[1] = 200

    fmt.Println(numbers)
}
```

运行结果：

```text
[10 200 30]
```

#### 6.1.4.2 数组下标越界

访问数组时，下标必须在合法范围内：

```text
0 <= 下标 < len(array)
```

如果使用常量下标访问不存在的位置，编译器通常可以直接发现错误：

```go
numbers := [3]int{10, 20, 30}

// 编译错误：数组下标越界
// fmt.Println(numbers[3])
```

如果下标在程序运行时才能确定，则越界访问会引发 `panic`：

```go
package main

import "fmt"

func main() {
    numbers := [3]int{10, 20, 30}
    index := 3

    fmt.Println(numbers[index])
}
```

运行时会出现类似错误：

```text
panic: runtime error: index out of range [3] with length 3
```

因此，在使用动态下标访问数组前，应当确保下标处于合法范围。

```go
if index >= 0 && index < len(numbers) {
    fmt.Println(numbers[index])
}
```

------

### 6.1.5 数组的遍历

遍历数组通常有两种方式：

- 使用普通 `for` 循环；
- 使用 `for range` 循环。

#### 6.1.5.1 使用普通 for 循环

```go
package main

import "fmt"

func main() {
    numbers := [4]int{10, 20, 30, 40}

    for i := 0; i < len(numbers); i++ {
        fmt.Printf(
            "numbers[%d] = %d\n",
            i,
            numbers[i],
        )
    }
}
```

运行结果：

```text
numbers[0] = 10
numbers[1] = 20
numbers[2] = 30
numbers[3] = 40
```

普通 `for` 循环适合需要精确控制下标、遍历顺序或者步长的情况。

例如，倒序遍历数组：

```go
for i := len(numbers) - 1; i >= 0; i-- {
    fmt.Println(numbers[i])
}
```

#### 6.1.5.2 使用 for range 遍历

`range` 可以同时获得当前元素的下标和值：

```go
package main

import "fmt"

func main() {
    numbers := [4]int{10, 20, 30, 40}

    for index, value := range numbers {
        fmt.Printf(
            "下标：%d，元素：%d\n",
            index,
            value,
        )
    }
}
```

运行结果：

```text
下标：0，元素：10
下标：1，元素：20
下标：2，元素：30
下标：3，元素：40
```

只需要下标时，可以省略第二个变量：

```go
for index := range numbers {
    fmt.Println(index)
}
```

只需要元素值时，可以使用空白标识符 `_` 忽略下标：

```go
for _, value := range numbers {
    fmt.Println(value)
}
```

#### 6.1.5.3 range 中的元素值是副本

在下面的循环中，`value` 是当前数组元素的副本：

```go
package main

import "fmt"

func main() {
    numbers := [3]int{10, 20, 30}

    for _, value := range numbers {
        value = 0
        _ = value // 使用修改后的副本，避免未使用变量的编译错误
    }

    fmt.Println(numbers)
}
```

运行结果：

```text
[10 20 30]
```

修改 `value` 不会修改原数组。

如果需要修改数组中的元素，应当通过下标操作：

```go
package main

import "fmt"

func main() {
    numbers := [3]int{10, 20, 30}

    for index := range numbers {
        numbers[index] = 0
    }

    fmt.Println(numbers)
}
```

运行结果：

```text
[0 0 0]
```

------

### 6.1.6 多维数组

如果数组的元素本身也是数组，就形成了多维数组。

二维数组的基本形式如下：

```go
[行数][列数]元素类型
```

例如：

```go
[2][3]int
```

表示一个两行三列的整数数组。

从类型角度看，`[2][3]int` 可以理解为：

> 一个长度为 2 的数组，其中每个元素都是 `[3]int`。

#### 6.1.6.1 声明二维数组

```go
var matrix [2][3]int
```

没有显式初始化时，所有元素都是零值：

```go
package main

import "fmt"

func main() {
    var matrix [2][3]int

    fmt.Println(matrix)
}
```

运行结果：

```text
[[0 0 0] [0 0 0]]
```

#### 6.1.6.2 初始化二维数组

```go
package main

import "fmt"

func main() {
    matrix := [2][3]int{
        {1, 2, 3},
        {4, 5, 6},
    }

    fmt.Println(matrix)
}
```

运行结果：

```text
[[1 2 3] [4 5 6]]
```

也可以使用 `...` 推断最外层数组的长度：

```go
matrix := [...][2]int{
    {1, 1},
    {2, 2},
    {3, 3},
}
```

等价于：

```go
matrix := [3][2]int{
    {1, 1},
    {2, 2},
    {3, 3},
}
```

需要注意，在多维数组字面量中，只有最外层数组的长度可以使用 `...` 推断，内层数组的长度必须明确指定。

正确写法：

```go
matrix := [...][2]int{
    {1, 1},
    {2, 2},
}
```

错误写法：

```go
// 编译错误：内层数组不能使用 ...
// matrix := [2][...]int{
//     {1, 1},
//     {2, 2},
// }
```

#### 6.1.6.3 访问和修改多维数组元素

二维数组需要使用两个下标访问元素：

```go
matrix[行下标][列下标]
```

例如：

```go
package main

import "fmt"

func main() {
    matrix := [2][3]int{
        {1, 2, 3},
        {4, 5, 6},
    }

    fmt.Println(matrix[0][1])
    fmt.Println(matrix[1][2])

    matrix[1][0] = 100

    fmt.Println(matrix)
}
```

运行结果：

```text
2
6
[[1 2 3] [100 5 6]]
```

#### 6.1.6.4 遍历多维数组

多维数组通常使用嵌套循环遍历：

```go
package main

import "fmt"

func main() {
    matrix := [2][3]int{
        {1, 2, 3},
        {7, 8, 9},
    }

    for rowIndex, row := range matrix {
        for columnIndex, value := range row {
            fmt.Printf(
                "(%d,%d)=%d ",
                rowIndex,
                columnIndex,
                value,
            )
        }

        fmt.Println()
    }
}
```

运行结果：

```text
(0,0)=1 (0,1)=2 (0,2)=3
(1,0)=7 (1,1)=8 (1,2)=9
```

外层循环依次获得每一行，内层循环再依次遍历当前行中的元素。

------

### 6.1.7 数组的赋值与函数传参

Go 数组具有值语义。

将一个数组赋值给另一个数组，或者将数组作为函数参数传递时，会复制数组中的全部元素。修改副本不会影响原数组。

#### 6.1.7.1 数组赋值

```go
package main

import "fmt"

func main() {
    a := [3]int{1, 2, 3}
    b := a

    b[0] = 100

    fmt.Println("a：", a)
    fmt.Println("b：", b)
}
```

运行结果：

```text
a：[1 2 3]
b：[100 2 3]
```

执行：

```go
b := a
```

之后，`a` 和 `b` 是两个独立的数组。

修改 `b` 中的元素不会影响 `a`。

#### 6.1.7.2 数组作为函数参数

数组作为函数参数时，同样会复制整个数组：

```go
package main

import "fmt"

func changeArray(numbers [3]int) {
    numbers[0] = 100
    fmt.Println("函数内部：", numbers)
}

func main() {
    numbers := [3]int{1, 2, 3}

    changeArray(numbers)

    fmt.Println("函数外部：", numbers)
}
```

运行结果：

```text
函数内部：[100 2 3]
函数外部：[1 2 3]
```

函数中的 `numbers` 是原数组的副本，因此函数内部的修改不会影响外部数组。

#### 6.1.7.3 传递数组指针

如果函数确实需要修改原数组，可以传入数组的地址：

```go
package main

import "fmt"

func changeArray(numbers *[3]int) {
    numbers[0] = 100
}

func main() {
    numbers := [3]int{1, 2, 3}

    changeArray(&numbers)

    fmt.Println(numbers)
}
```

运行结果：

```text
[100 2 3]
```

这里的：

```go
*[3]int
```

表示指向 `[3]int` 数组的指针。

通过数组指针可以访问并修改原数组。在大多数需要处理可变长度数据的场景中，函数参数通常更适合使用切片。

#### 6.1.7.4 数组复制是否一定存在性能问题

数组赋值和传参确实会复制数组中的全部元素，但不能简单地认为所有数组复制都会产生严重性能问题。

对于较小的数组，复制开销通常并不明显，而且值语义能够减少共享数据带来的副作用。

对于较大的数组，如果频繁进行赋值或函数传参，可以考虑：

- 使用数组指针；
- 使用切片；
- 根据实际性能测试结果决定是否优化。

不要在缺少性能测试的情况下，仅凭数组存在复制行为就过早优化代码。

------

### 6.1.8 数组练习

#### 6.1.8.1 练习一：计算数组所有元素之和

给定一个整数数组，计算数组中所有元素的总和。

```go
package main

import "fmt"

func sumArray(numbers [5]int) int {
    total := 0

    for _, value := range numbers {
        total += value
    }

    return total
}

func main() {
    numbers := [5]int{3, 5, 7, 9, 11}

    result := sumArray(numbers)

    fmt.Println("数组元素之和：", result)
}
```

运行结果：

```text
数组元素之和：35
```

这个练习主要考查：

- 数组作为函数参数；
- 使用 `range` 遍历数组；
- 使用变量累加元素值。

需要注意，`sumArray` 接收的是 `[5]int`，因此只能直接接收长度为 5 的整数数组。

#### 6.1.8.2 练习二：查找和为目标值的两个元素

给定数组：

```text
[1, 3, 5, 8, 7]
```

以及目标值：

```text
8
```

找出所有满足两个元素之和等于目标值的下标组合。

```go
package main

import "fmt"

func findPairs(numbers [5]int, target int) {
    for i := 0; i < len(numbers); i++ {
        for j := i + 1; j < len(numbers); j++ {
            if numbers[i]+numbers[j] == target {
                fmt.Printf(
                    "(%d, %d)：%d + %d = %d\n",
                    i,
                    j,
                    numbers[i],
                    numbers[j],
                    target,
                )
            }
        }
    }
}

func main() {
    numbers := [5]int{1, 3, 5, 8, 7}

    findPairs(numbers, 8)
}
```

运行结果：

```text
(0, 4)：1 + 7 = 8
(1, 2)：3 + 5 = 8
```

内层循环从：

```go
j := i + 1
```

开始，而不是从 `0` 开始，可以避免：

- 同一个元素与自身组合；
- 重复输出 `(0, 4)` 和 `(4, 0)`。

当前实现使用两层循环，时间复杂度为：

```text
O(n²)
```

学习 `map` 后，可以尝试使用映射将查找过程优化为接近 `O(n)`。

------

### 6.1.9 数组小结

Go 数组的核心特征如下：

```go
// 声明数组
var numbers [5]int

// 初始化数组
a := [3]int{1, 2, 3}

// 推断数组长度
b := [...]int{1, 2, 3, 4}

// 按索引初始化
c := [5]int{1: 100, 4: 200}

// 访问数组元素
value := a[0]

// 修改数组元素
a[1] = 20

// 普通 for 遍历
for i := 0; i < len(a); i++ {
    fmt.Println(a[i])
}

// range 遍历
for index, value := range a {
    fmt.Println(index, value)
}

// 二维数组
matrix := [2][3]int{
    {1, 2, 3},
    {4, 5, 6},
}
```

学习数组时，需要重点掌握以下内容：

- 数组长度是数组类型的一部分；
- 数组长度在定义后不能改变；
- 数组元素下标从 `0` 开始；
- 下标越界可能造成编译错误或运行时 `panic`；
- 数组赋值和函数传参会复制全部元素；
- `range` 返回的元素值是副本；
- 当元素类型可比较时，数组可以使用 `==` 和 `!=`；
- 多维数组本质上是元素类型仍然为数组的数组；
- 动态长度数据通常更适合使用切片。


## 6.2 切片：可变长度的序列

数组的长度是其类型的一部分，一旦创建便不能改变。例如，`[3]int` 和 `[5]int` 是两种不同的类型。

实际开发中，程序经常需要处理长度动态变化的数据。Go 为此提供了切片 `slice`。

切片可以表示数组或其他切片中的一段连续区域，也可以通过切片字面量或 `make` 动态创建。与数组相比，切片具有更加灵活的长度管理能力，是 Go 中最常用的序列类型之一。

### 6.2.1 切片的基本概念

切片类型的定义格式如下：

```go
[]元素类型
```

例如：

```go
var numbers []int
var names []string
var users []User
```

切片类型不包含长度，因此下面两个变量属于相同类型：

```go
var a []int
var b []int
```

可以从概念上将一个切片值理解为由三部分组成：

1. 指向底层数组相应位置的引用；
2. 切片长度 `len`；
3. 切片容量 `cap`。

```text
切片
┌──────────────────┐
│ 底层数组起始位置  │
│ 长度 len         │
│ 容量 cap         │
└──────────────────┘
          │
          ▼
底层数组：[10][20][30][40][50]
```

切片本身不是数组，也不是数组指针。切片变量在赋值和函数传递时会复制切片描述信息，但多个切片仍然可能引用同一个底层数组。

#### 6.2.1.1 数组与切片的主要区别

数组和切片都可以保存一组相同类型的数据，但二者的类型特征和使用方式不同。

| 对比项                 | 数组                                 | 切片              |
| ---------------------- | ------------------------------------ | ----------------- |
| 类型形式               | `[n]T`                               | `[]T`             |
| 长度                   | 固定                                 | 可以变化          |
| 长度是否属于类型       | 是                                   | 否                |
| 赋值效果               | 复制全部元素                         | 复制切片描述信息  |
| 函数传参               | 复制整个数组                         | 复制切片描述信息  |
| 底层数据               | 数组本身保存元素                     | 通常引用底层数组  |
| 是否可以与同类型值比较 | 取决于元素类型，元素可比较时可以比较 | 只能与 `nil` 比较 |
| 灵活性                 | 较低                                 | 较高              |
| 常见用途               | 固定长度数据                         | 动态数据集合      |

例如：

```go
array := [3]int{1, 2, 3}
slice := []int{1, 2, 3}
```

虽然二者包含相同的数据，但类型不同：

```go
fmt.Printf("%T\n", array)
fmt.Printf("%T\n", slice)
```

运行结果：

```text
[3]int
[]int
```

数组长度属于类型：

```go
[3]int
[4]int
```

是两种不同类型。

切片类型中不包含长度：

```go
[]int
```

不同长度的整数切片具有相同的类型。

数组适合表达数量固定、类型边界明确的数据。切片则更加灵活，是实际 Go 开发中处理序列数据时更常用的数据结构。

### 6.2.2 创建和初始化切片

创建切片主要有以下几种方式：

#### 6.2.2.1 声明切片变量

```go
var numbers []int
```

此时 `numbers` 是一个 `nil` 切片：

```go
fmt.Println(numbers == nil) // true
fmt.Println(len(numbers))   // 0
fmt.Println(cap(numbers))   // 0
```

虽然 `nil` 切片没有底层数组，但仍然可以安全地执行：

- `len`；
- `cap`；
- `range` 遍历；
- `append`；
- `copy`。

例如：

```go
var numbers []int

numbers = append(numbers, 10, 20)

fmt.Println(numbers) // [10 20]
```

#### 6.2.2.2 使用切片字面量

```go
numbers := []int{10, 20, 30}
```

切片字面量会创建一个底层数组，并返回引用该数组的切片。

```go
fmt.Println(numbers)      // [10 20 30]
fmt.Println(len(numbers)) // 3
fmt.Println(cap(numbers)) // 3
```

也可以创建非 `nil` 的空切片：

```go
numbers := []int{}

fmt.Println(numbers == nil) // false
fmt.Println(len(numbers))   // 0
fmt.Println(cap(numbers))   // 0
```

`nil` 切片和空切片的长度都为 `0`，大部分情况下可以采用相同方式处理，但二者与 `nil` 比较时结果不同。

#### 6.2.2.3 使用 make 创建切片

语法如下：

```go
make([]元素类型, 长度)
make([]元素类型, 长度, 容量)
```

例如：

```go
a := make([]int, 3)
b := make([]int, 3, 5)

fmt.Println(a, len(a), cap(a))
fmt.Println(b, len(b), cap(b))
```

运行结果：

```text
[0 0 0] 3 3
[0 0 0] 3 5
```

使用 `make` 创建切片时，元素会被初始化为对应类型的零值。

长度和容量必须满足：

```text
0 <= len(slice) <= cap(slice)
```

下面的写法不能通过编译或会在运行时产生错误：

```go
make([]int, 5, 3)
```

因为长度不能大于容量。

#### 6.2.2.4 从数组或切片中截取

```go
array := [5]int{10, 20, 30, 40, 50}

slice := array[1:4]

fmt.Println(slice) // [20 30 40]
```

切片表达式使用“左闭右开”区间：

```text
[开始位置:结束位置)
```

因此，`array[1:4]` 包含索引 `1`、`2`、`3`，但不包含索引 `4`。

------

### 6.2.3 切片表达式

基本切片表达式如下：

```go
data[low:high]
```

得到的元素范围是：

```text
low <= index < high
```

例如：

```go
data := []int{0, 1, 2, 3, 4, 5}

fmt.Println(data[1:4]) // [1 2 3]
fmt.Println(data[:3])  // [0 1 2]
fmt.Println(data[3:])  // [3 4 5]
fmt.Println(data[:])   // [0 1 2 3 4 5]
```

省略规则如下：

```go
data[:high] // 等价于 data[0:high]
data[low:]  // 等价于 data[low:len(data)]
data[:]     // 等价于 data[0:len(data)]
```

#### 6.2.3.1 切片的长度和容量

对于：

```go
slice := data[low:high]
```

切片长度为：

```text
len(slice) = high - low
```

切片容量通常表示从 `low` 位置到底层数组末尾的可用空间：

```text
cap(slice) = cap(data) - low
```

例如：

```go
data := []int{0, 1, 2, 3, 4, 5}
slice := data[2:4]

fmt.Println(slice)      // [2 3]
fmt.Println(len(slice)) // 2
fmt.Println(cap(slice)) // 4
```

虽然当前长度只有 `2`，但容量为 `4`，因此可以在容量范围内重新切片：

```go
slice = slice[:4]

fmt.Println(slice) // [2 3 4 5]
```

索引访问始终受到长度限制，而不是容量限制：

```go
data := make([]int, 2, 5)

// 错误：索引 2 已经超出当前长度
fmt.Println(data[2])
```

即使容量为 `5`，当前合法索引仍然只有 `0` 和 `1`。

------

### 6.2.4 完整切片表达式

完整切片表达式可以同时限制切片的容量：

```go
data[low:high:max]
```

计算规则如下：

```text
长度 = high - low
容量 = max - low
```

例如：

```go
data := []int{0, 1, 2, 3, 4, 5}

slice := data[1:3:4]

fmt.Println(slice)      // [1 2]
fmt.Println(len(slice)) // 2
fmt.Println(cap(slice)) // 3
```

完整切片表达式常用于限制后续 `append` 可以使用的底层数组范围。

例如：

```go
data := []int{1, 2, 3, 4, 5}

left := data[:2:2]
left = append(left, 100)

fmt.Println(left) // [1 2 100]
fmt.Println(data) // [1 2 3 4 5]
```

由于 `left` 的容量被限制为 `2`，追加元素时必须分配新的底层数组，因此不会覆盖原切片后面的元素。

------

### 6.2.5 切片共享底层数组

从同一个数组或切片中截取出的多个切片，可能共享同一个底层数组。

```go
package main

import "fmt"

func main() {
    data := [5]int{10, 20, 30, 40, 50}

    slice := data[1:4]
    slice[0] = 200

    fmt.Println(slice)
    fmt.Println(data)
}
```

运行结果：

```text
[200 30 40]
[10 200 30 40 50]
```

修改 `slice[0]`，实际修改的是底层数组中的 `data[1]`。

多个切片之间也可能相互影响：

```go
data := []int{10, 20, 30, 40}

a := data[:2]
b := data[1:3]

b[0] = 200

fmt.Println(a)    // [10 200]
fmt.Println(b)    // [200 30]
fmt.Println(data) // [10 200 30 40]
```

因此，切片赋值并不会复制其中的全部元素：

```go
a := []int{1, 2, 3}
b := a

b[0] = 100

fmt.Println(a) // [100 2 3]
fmt.Println(b) // [100 2 3]
```

变量 `a` 和 `b` 是两个不同的切片值，但它们引用同一个底层数组。

------

### 6.2.6 使用 append 追加元素

内置函数 `append` 用于向切片尾部追加元素：

```go
slice = append(slice, element)
```

可以一次追加多个元素：

```go
numbers := []int{1, 2}

numbers = append(numbers, 3)
numbers = append(numbers, 4, 5)

fmt.Println(numbers) // [1 2 3 4 5]
```

也可以追加另一个切片中的全部元素：

```go
a := []int{1, 2, 3}
b := []int{4, 5, 6}

a = append(a, b...)

fmt.Println(a) // [1 2 3 4 5 6]
```

其中的 `...` 表示将切片中的元素展开后传给 `append`。

#### 6.2.6.1 必须接收 append 的返回值

`append` 返回一个新的切片值，因此通常需要写成：

```go
slice = append(slice, value)
```

不能只写：

```go
append(slice, value)
```

#### 6.2.6.2 append 是否重新分配底层数组

如果原切片剩余容量足够，`append` 通常会继续使用原来的底层数组：

```go
data := make([]int, 2, 4)
data[0] = 10
data[1] = 20

data = append(data, 30)

fmt.Println(data) // [10 20 30]
```

如果容量不足，运行时会分配新的底层数组，并将原有元素复制过去：

```go
data := make([]int, 2, 2)
data[0] = 10
data[1] = 20

data = append(data, 30)
```

此时，追加后的切片可能已经不再引用原来的底层数组。

需要注意：**切片扩容比例属于 Go 运行时的实现细节，不应依赖固定的两倍扩容规律。**

程序只能依赖 `append` 的结果，不能依赖具体扩容算法。

#### 6.2.6.3 预分配容量

如果能够提前估计元素数量，可以预先设置容量：

```go
numbers := make([]int, 0, 100)

for i := 0; i < 100; i++ {
    numbers = append(numbers, i)
}
```

这样可以减少重复扩容和数据复制。

------

### 6.2.7 使用 copy 复制切片

切片赋值只复制切片描述信息，不会复制全部元素。

如果需要复制元素，应当使用内置函数 `copy`：

```go
copy(destination, source)
```

例如：

```go
source := []int{1, 2, 3}

destination := make([]int, len(source))
count := copy(destination, source)

fmt.Println(destination) // [1 2 3]
fmt.Println(count)       // 3
```

`copy` 返回实际复制的元素数量：

```text
复制数量 = min(len(destination), len(source))
```

例如：

```go
source := []int{1, 2, 3, 4}
destination := make([]int, 2)

count := copy(destination, source)

fmt.Println(destination) // [1 2]
fmt.Println(count)       // 2
```

复制完成后，两个切片具有独立的底层数据：

```go
source := []int{1, 2, 3}
destination := make([]int, len(source))

copy(destination, source)

destination[0] = 100

fmt.Println(source)      // [1 2 3]
fmt.Println(destination) // [100 2 3]
```

也可以使用 `append` 快速复制：

```go
clone := append([]int(nil), source...)
```

#### 6.2.7.1 重叠区域复制

`copy` 允许源区域和目标区域重叠，因此可以用于移动切片中的元素：

```go
numbers := []int{1, 2, 3, 4, 5}

copy(numbers[1:], numbers[:4])

fmt.Println(numbers) // [1 1 2 3 4]
```

------

### 6.2.8 遍历和修改切片

可以使用普通 `for` 循环遍历切片：

```go
numbers := []int{10, 20, 30}

for i := 0; i < len(numbers); i++ {
    fmt.Println(i, numbers[i])
}
```

也可以使用 `for range`：

```go
for index, value := range numbers {
    fmt.Println(index, value)
}
```

需要注意，`range` 中的 `value` 是当前元素值的副本。

下面的代码不会修改原切片：

```go
numbers := []int{1, 2, 3}

for _, value := range numbers {
    value *= 10
}

fmt.Println(numbers) // [1 2 3]
```

如果需要修改原切片，应使用索引：

```go
for index := range numbers {
    numbers[index] *= 10
}

fmt.Println(numbers) // [10 20 30]
```

------

### 6.2.9 删除和插入元素

Go 没有为切片提供专门的删除方法。删除操作通常通过重新组合切片实现。

#### 6.2.9.1 删除指定位置的元素

保持原有顺序：

```go
numbers := []int{10, 20, 30, 40}
index := 1

numbers = append(numbers[:index], numbers[index+1:]...)

fmt.Println(numbers) // [10 30 40]
```

对于保存指针、切片、Map 等引用数据的切片，还应考虑清除尾部残留引用：

```go
items := []*User{user1, user2, user3}
index := 1

copy(items[index:], items[index+1:])
items[len(items)-1] = nil
items = items[:len(items)-1]
```

这样有助于不再使用的对象被垃圾回收。

#### 6.2.9.2 在指定位置插入元素

```go
numbers := []int{10, 30, 40}
index := 1

numbers = append(numbers, 0)
copy(numbers[index+1:], numbers[index:])
numbers[index] = 20

fmt.Println(numbers) // [10 20 30 40]
```

对于初学阶段，应先掌握截取、`append` 和 `copy`，再进一步封装通用的插入与删除函数。

------

### 6.2.10 切片作为函数参数

切片作为参数传入函数时，会复制切片描述信息，但底层数组通常仍然共享。

```go
package main

import "fmt"

func change(numbers []int) {
    numbers[0] = 100
}

func main() {
    numbers := []int{1, 2, 3}

    change(numbers)

    fmt.Println(numbers) // [100 2 3]
}
```

函数中修改元素，会影响调用方看到的底层数组。

但是，如果函数内部执行 `append`，切片的长度变化不会自动更新到调用方变量：

```go
func addWrong(numbers []int) {
    numbers = append(numbers, 4)
}
```

调用后：

```go
numbers := []int{1, 2, 3}

addWrong(numbers)

fmt.Println(numbers) // 仍然是 [1 2 3]
```

如果函数需要追加元素，应返回新的切片：

```go
func add(numbers []int, value int) []int {
    return append(numbers, value)
}

func main() {
    numbers := []int{1, 2, 3}

    numbers = add(numbers, 4)

    fmt.Println(numbers) // [1 2 3 4]
}
```

------

### 6.2.11 多维切片

切片的元素本身也可以是切片：

```go
[][]int
```

例如：

```go
matrix := [][]int{
    {1, 2, 3},
    {4, 5},
    {6, 7, 8, 9},
}

fmt.Println(matrix)
```

与二维数组不同，多维切片中每一行的长度可以不同。

也可以动态创建：

```go
rows := 3
matrix := make([][]int, rows)

for i := range matrix {
    matrix[i] = make([]int, i+1)
}
```

需要注意，下面的代码只创建了外层切片：

```go
matrix := make([][]int, 3)
```

此时每个 `matrix[i]` 都是 `nil` 切片。访问元素前需要初始化内层切片，或者直接使用 `append`。

------

### 6.2.12 字符串与切片

Go 字符串是不可变的字节序列，通常使用 UTF-8 编码。

可以对字符串使用切片表达式：

```go
text := "hello world"

fmt.Println(text[:5]) // hello
fmt.Println(text[6:]) // world
```

字符串切片按照字节索引进行，而不是按照字符数量进行。

#### 6.2.12.1 使用 []byte 处理字节

```go
text := "hello"

data := []byte(text)
data[0] = 'H'

text = string(data)

fmt.Println(text) // Hello
```

`[]byte` 适合处理：

- ASCII 文本；
- 文件内容；
- 网络数据；
- 原始字节。

#### 6.2.12.2 使用 []rune 处理 Unicode 码点

对于包含中文等多字节字符的字符串，应使用 `[]rune`：

一个 `rune` 表示单个 Unicode 码点，因此替换值必须是单个码点，不能写成包含两个字符的 `'Go'`：

```go
text := "你好世界"

characters := []rune(text)
characters[2] = '中'

text = string(characters)

fmt.Println(text) // 你好中界
```

需要区分：

```go
len(text)
```

返回的是字符串的字节数，而不是 Unicode 字符数量。

------

### 6.2.13 切片的常见问题

#### 6.2.13.1 将切片称为可变数组

切片不是数组本身，而是对底层数组一段区域的描述。更准确的说法是：

> 切片提供了对动态长度序列的抽象，其元素存储在底层数组中。

#### 6.2.13.2 忘记接收 append 的返回值

错误：

```go
append(numbers, 10)
```

正确：

```go
numbers = append(numbers, 10)
```

#### 6.2.13.3 修改 range 的值变量

错误：

```go
for _, value := range numbers {
    value++
}
```

正确：

```go
for index := range numbers {
    numbers[index]++
}
```

#### 6.2.13.4 误认为容量等于可访问元素数量

元素索引受 `len` 限制，而不是受 `cap` 限制。

#### 6.2.13.5 小切片长期引用大数组

下面的函数虽然只返回少量数据，但返回的切片可能继续引用整个大数组：

```go
func firstTen(data []byte) []byte {
    return data[:10]
}
```

如果希望释放原来的大数组，可以复制需要的数据：

```go
func firstTen(data []byte) []byte {
    result := make([]byte, 10)
    copy(result, data[:10])
    return result
}
```

## 总结

- 数组的长度是类型的一部分，赋值和传参会复制数组中的元素；元素类型可比较时，数组也可以比较。
- 切片描述底层数组的一段区域。赋值和传参复制的是切片值，多个切片可能共享同一个底层数组。
- `len` 决定当前可以通过索引访问的范围，`cap` 决定可以重新切片和追加元素时使用的空间。
- `append` 返回追加后的切片；容量不足时会分配新的底层数组，应接收返回值并避免依赖固定扩容比例。
- 需要独立保存元素时，先分配目标切片，再使用 `copy` 复制；`range` 的值变量是元素副本，修改元素应通过索引。
