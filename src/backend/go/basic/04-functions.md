---
permalink: /backend/go/basic/04-functions/
title: 04. 函数
shortTitle: 04. 函数
order: 4
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 函数
  - 多返回值
  - 命名返回值
  - 匿名函数
  - 闭包
  - 可变参数
  - defer
---

# 04. 函数

## 前言

随着程序规模不断增大，将所有代码都写在 `main` 函数中会使程序难以阅读、测试和维护。函数可以把一段完成特定任务的代码封装起来，并在需要时重复调用。

合理使用函数可以：

- 减少重复代码；
- 将复杂问题拆分为较小的子问题；
- 明确代码的输入、输出和职责；
- 提高代码的可测试性和复用性；
- 隐藏不需要暴露的实现细节。

Go 中的函数具有以下特点：

- 使用 `func` 关键字定义；
- 可以没有参数，也可以接收多个参数；
- 可以没有返回值，也可以返回一个或多个值；
- 支持命名返回值；
- 支持可变参数；
- 函数本身也是一种值；
- 函数可以赋值给变量；
- 函数可以作为参数或返回值；
- 支持匿名函数和闭包；
- 不支持函数重载；
- 不支持默认参数；
- 具名函数不能定义在另一个函数内部，但函数内部可以声明匿名函数。



## 4.1 函数的定义与调用

### 4.1.1 函数的基本结构

Go 使用 `func` 关键字定义函数，基本语法如下：

```go
func 函数名(参数列表) 返回值列表 {
    函数体
}
```

例如，定义一个计算两个整数之和的函数：

```go
package main

import "fmt"

func add(a int, b int) int {
    return a + b
}

func main() {
    result := add(10, 20)
    fmt.Println(result)
}
```

运行结果：

```text
30
```

在这个函数中：

- `func` 是定义函数的关键字；
- `add` 是函数名；
- `a int, b int` 是参数列表；
- 参数列表后面的 `int` 是返回值类型；
- `return a + b` 将计算结果返回给调用方。

调用函数时，需要在函数名后面写圆括号：

```go
add(10, 20)
```

函数可以定义在调用它的代码之后。只要函数位于当前包的作用域中，源文件中的书写顺序不会影响调用。

---

### 4.1.2 没有参数的函数

函数可以不接收参数，但函数名后的圆括号不能省略：

```go
package main

import "fmt"

func sayHello() {
    fmt.Println("Hello, Go!")
}

func main() {
    sayHello()
}
```

运行结果：

```text
Hello, Go!
```

---

### 4.1.3 没有返回值的函数

如果函数不需要向调用方返回数据，可以省略返回值列表：

```go
func printMessage(message string) {
    fmt.Println(message)
}
```

调用：

```go
printMessage("正在学习 Go")
```

没有返回值的函数执行到函数体末尾时会自动结束。

也可以使用不带返回值的 `return` 提前结束函数：

```go
func printAge(age int) {
    if age < 0 {
        fmt.Println("年龄不能小于 0")
        return
    }

    fmt.Println("年龄：", age)
}
```

这里的 `return` 只表示结束函数，不返回任何数据。

---

### 4.1.4 简写相同类型的参数

如果多个相邻参数的类型相同，可以只在最后一个参数后面写类型：

```go
func add(a, b int) int {
    return a + b
}
```

它等价于：

```go
func add(a int, b int) int {
    return a + b
}
```

多个参数组也可以组合：

```go
func formatUser(name, city string, age int) string {
    return fmt.Sprintf(
        "%s，%d 岁，来自%s",
        name,
        age,
        city,
    )
}
```

其中：

- `name` 和 `city` 都是 `string`；
- `age` 是 `int`。

参数较少时，这种简写能够让函数签名更加紧凑。参数过多时，应考虑使用结构体封装相关数据。

---

### 4.1.5 函数的作用域

函数参数只在当前函数内部有效：

```go
func add(a, b int) int {
    result := a + b
    return result
}
```

这里的 `a`、`b` 和 `result` 都是局部变量。

在函数外部不能直接访问：

```go
func main() {
    // 无法直接使用 add 函数中的 a、b 和 result
}
```

不同函数可以定义同名的局部变量，它们彼此独立：

```go
func first() {
    value := 10
    fmt.Println(value)
}

func second() {
    value := 20
    fmt.Println(value)
}
```

---

### 4.1.6 函数命名

函数名应当清楚描述函数完成的任务。

推荐的名称：

```go
func calculateTotal() {}
func findUserByID() {}
func validatePassword() {}
func saveConfig() {}
```

含义不明确的名称：

```go
func do() {}
func handle() {}
func test1() {}
func processSomething() {}
```

Go 根据函数名首字母的大小写决定函数能否被其他包访问。

小写字母开头的函数只能在当前包内使用：

```go
func calculateTotal() {
}
```

大写字母开头的函数是已导出函数，可以被其他包访问：

```go
func CalculateTotal() {
}
```

已导出函数通常还应编写说明其用途的文档注释：

```go
// CalculateTotal 返回所有价格之和。
func CalculateTotal(prices []float64) float64 {
    var total float64

    for _, price := range prices {
        total += price
    }

    return total
}
```

---

### 4.1.7 Go 不支持函数重载

函数重载是指在同一个作用域内定义多个同名函数，并通过参数类型或参数数量区分它们。

Go 不支持函数重载，因此下面的代码不能通过编译：

```go
func add(a, b int) int {
    return a + b
}

func add(a, b float64) float64 {
    return a + b
}
```

同一个包中不能定义两个同名函数。

可以使用不同的函数名表达不同的功能：

```go
func addInt(a, b int) int {
    return a + b
}

func addFloat(a, b float64) float64 {
    return a + b
}
```

在学习泛型后，也可以根据实际需求使用类型参数实现适用于多种类型的函数。

---

### 4.1.8 Go 不支持默认参数

Go 不支持在函数声明中为参数指定默认值。

下面的写法是错误的：

```go
// Go 不支持这种写法
func connect(host string, port int = 8080) {
}
```

调用方需要明确传入所有参数：

```go
func connect(host string, port int) {
    fmt.Println("连接地址：", host, port)
}
```

调用：

```go
connect("localhost", 8080)
```

如果确实需要提供默认行为，可以额外定义一个辅助函数：

```go
func connect(host string, port int) {
    fmt.Println("连接地址：", host, port)
}

func connectDefault(host string) {
    connect(host, 8080)
}
```

---

## 4.2 参数与值传递

### 4.2.1 形参与实参

定义函数时声明的变量称为形式参数，简称形参：

```go
func add(a, b int) int {
    return a + b
}
```

其中，`a` 和 `b` 是形参。

调用函数时传入的值称为实际参数，简称实参：

```go
result := add(10, 20)
```

其中，`10` 和 `20` 是实参。

调用函数时，实参的数量、顺序和类型需要与函数参数匹配。

---

### 4.2.2 Go 的参数始终按值传递

Go 中的函数参数始终按值传递。

调用函数时，实参的值会被复制一份，函数参数接收的是这个副本。

```go
package main

import "fmt"

func change(number int) {
    number = 100
}

func main() {
    number := 10

    change(number)

    fmt.Println(number)
}
```

运行结果：

```text
10
```

函数中的 `number` 是原变量值的副本。修改副本不会影响调用方的变量。

因此，不应将 Go 的函数参数简单区分为“值传递”和“引用传递”。

更准确的表述是：

> Go 的所有函数参数都是按值传递的。传入指针、切片、Map 或 Channel 时，复制的仍然是对应的值，只是复制后的值可能继续引用同一份数据。

---

### 4.2.3 使用指针参数修改原变量

如果函数需要修改调用方的变量，可以传入变量的地址：

```go
package main

import "fmt"

func change(number *int) {
    *number = 100
}

func main() {
    number := 10

    change(&number)

    fmt.Println(number)
}
```

运行结果：

```text
100
```

这里：

```go
&number
```

取得变量 `number` 的地址。

函数参数：

```go
number *int
```

接收一个指向 `int` 的指针。

函数中的：

```go
*number = 100
```

修改指针所指向的变量。

即使传递的是指针，Go 仍然执行值传递。函数得到的是指针值的一份副本，但这个副本和调用方传入的指针指向同一个变量。

---

### 4.2.4 使用指针交换变量

可以使用指针参数交换两个变量的值：

```go
package main

import "fmt"

func swap(a, b *int) {
    *a, *b = *b, *a
}

func main() {
    x := 10
    y := 20

    swap(&x, &y)

    fmt.Println(x, y)
}
```

运行结果：

```text
20 10
```

不过，在函数内部或同一个作用域中交换变量时，可以直接使用多重赋值：

```go
x, y = y, x
```

不需要专门定义交换函数。

---

### 4.2.5 切片作为参数

切片作为参数传入函数时，切片值会被复制，但复制后的切片通常仍然指向同一个底层数组。

因此，在函数中修改已有元素，调用方可以观察到变化：

```go
package main

import "fmt"

func changeFirst(numbers []int) {
    numbers[0] = 100
}

func main() {
    numbers := []int{1, 2, 3}

    changeFirst(numbers)

    fmt.Println(numbers)
}
```

运行结果：

```text
[100 2 3]
```

这并不是“切片按引用传递”，而是因为两个切片值共享同一个底层数组。

如果函数中执行 `append`，切片参数本身的长度变化不会自动更新到调用方变量：

```go
func appendWrong(numbers []int) {
    numbers = append(numbers, 4)
}
```

调用：

```go
numbers := []int{1, 2, 3}

appendWrong(numbers)

fmt.Println(numbers) // [1 2 3]
```

如果函数需要追加元素，应返回新的切片：

```go
func appendNumber(
    numbers []int,
    number int,
) []int {
    return append(numbers, number)
}
```

调用方接收返回值：

```go
numbers = appendNumber(numbers, 4)
```

---

### 4.2.6 Map 作为参数

Map 作为参数传递时，Map 值同样会被复制，但复制后的 Map 仍然引用同一份底层数据。

```go
package main

import "fmt"

func updateScore(scores map[string]int) {
    scores["Alice"] = 100
}

func main() {
    scores := map[string]int{
        "Alice": 90,
    }

    updateScore(scores)

    fmt.Println(scores["Alice"])
}
```

运行结果：

```text
100
```

如果函数只需要添加、修改或删除 Map 中的元素，通常不需要传递 `*map[K]V`。

---

### 4.2.7 是否应该使用指针参数

适合使用指针参数的情况包括：

- 函数需要修改调用方的变量；
- 参数是较大的结构体；
- 需要使用 `nil` 表示对象不存在；
- 多个位置需要操作同一个对象。

对于整数、布尔值、字符串以及较小的只读结构体，直接传值通常更加简单。

例如，下面的函数没有必要使用指针：

```go
func add(a, b int) int {
    return a + b
}
```

不推荐为了“减少复制”写成：

```go
func add(a, b *int) int {
    return *a + *b
}
```

指针会引入共享状态和 `nil` 检查，应当根据函数语义决定是否使用。

---

## 4.3 返回值

### 4.3.1 返回一个值

返回值类型写在参数列表之后：

```go
func add(a, b int) int {
    return a + b
}
```

调用方可以使用变量接收结果：

```go
result := add(10, 20)
```

如果函数声明了返回值，那么所有可能正常结束函数的执行路径都必须返回对应的数据。

错误示例：

```go
func check(number int) int {
    if number > 0 {
        return number
    }

    // number <= 0 时没有返回值
}
```

正确写法：

```go
func check(number int) int {
    if number > 0 {
        return number
    }

    return 0
}
```

---

### 4.3.2 返回多个值

Go 函数可以返回多个值。

多个返回值的类型需要使用圆括号包围：

```go
func calculate(a, b int) (int, int) {
    sum := a + b
    difference := a - b

    return sum, difference
}
```

调用时使用多个变量接收：

```go
sum, difference := calculate(10, 3)

fmt.Println(sum)
fmt.Println(difference)
```

运行结果：

```text
13
7
```

多返回值适合同时返回：

- 计算结果和状态；
- 数据和错误；
- 查找结果和是否存在；
- 多个相互关联的计算结果。

---

### 4.3.3 返回结果和错误

Go 函数经常同时返回结果和 `error`：

```go
package main

import (
    "errors"
    "fmt"
)

func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("除数不能为 0")
    }

    return a / b, nil
}

func main() {
    result, err := divide(10, 2)
    if err != nil {
        fmt.Println("计算失败：", err)
        return
    }

    fmt.Println(result)
}
```

运行结果：

```text
5
```

按照 Go 的常见约定，`error` 通常位于返回值列表的最后：

```go
func readConfig(path string) (*Config, error)
func findUser(id int) (User, error)
func parseNumber(text string) (int, error)
```

调用返回错误的函数后，应及时检查错误：

```go
result, err := doSomething()
if err != nil {
    return err
}
```

---

### 4.3.4 使用空白标识符忽略返回值

如果不需要使用某个返回值，可以使用空白标识符 `_`：

```go
sum, _ := calculate(10, 3)

fmt.Println(sum)
```

如果只需要第二个结果：

```go
_, difference := calculate(10, 3)

fmt.Println(difference)
```

不应无理由忽略错误：

```go
result, _ := doSomething()
```

更合适的写法是检查并处理：

```go
result, err := doSomething()
if err != nil {
    return err
}
```

---

### 4.3.5 命名返回值

可以在函数签名中为返回值命名：

```go
func calculate(a, b int) (sum int, difference int) {
    sum = a + b
    difference = a - b

    return sum, difference
}
```

相同类型的命名返回值可以简写：

```go
func calculate(a, b int) (sum, difference int) {
    sum = a + b
    difference = a - b

    return sum, difference
}
```

命名返回值进入函数时，会被初始化为对应类型的零值，并且可以像局部变量一样使用。

命名返回值适合以下情况：

- 多个返回值类型相同，难以区分含义；
- 返回值名称能够说明结果的语义；
- 需要在延迟函数中访问或修改最终返回值。

如果返回值含义已经很清楚，则不必为了少写变量声明而命名。

---

### 4.3.6 裸 return

当函数使用命名返回值时，可以使用不带表达式的 `return`：

```go
func calculate(a, b int) (
    sum, difference int,
) {
    sum = a + b
    difference = a - b

    return
}
```

这种写法称为裸返回。

裸返回会返回所有命名返回变量的当前值。

虽然裸返回合法，但它可能使读者需要向上查找返回变量当前保存的内容。因此，只建议在非常短小的函数中使用。

较长函数中，更推荐显式返回：

```go
return sum, difference
```

---

### 4.3.7 避免遮蔽命名返回值

命名返回值是函数作用域中的局部变量。如果在内部代码块中使用 `:=` 声明同名变量，就可能发生变量遮蔽。

```go
func calculate(a, b int) (result int) {
    if a > b {
        result := a - b
        return result
    }

    result = a + b
    return result
}
```

在 `if` 代码块中：

```go
result := a - b
```

创建了一个新的局部变量，并没有给外层的命名返回值赋值。

更清晰的写法是：

```go
func calculate(a, b int) (result int) {
    if a > b {
        result = a - b
        return result
    }

    result = a + b
    return result
}
```

如果命名返回值使变量关系变得复杂，可以直接改用普通返回值：

```go
func calculate(a, b int) int {
    if a > b {
        return a - b
    }

    return a + b
}
```

---

### 4.3.8 将多返回值传给另一个函数

如果一个函数返回多个值，并且返回值的数量和类型与另一个函数的参数完全匹配，可以直接传入：

```go
package main

import "fmt"

func pair() (int, int) {
    return 10, 20
}

func add(a, b int) int {
    return a + b
}

func main() {
    result := add(pair())

    fmt.Println(result)
}
```

运行结果：

```text
30
```

这种调用要求多返回值函数是目标函数参数列表中的唯一调用表达式。

不能和其他实参混合：

```go
// 错误
// fmt.Println("结果：", pair())
```

应当先接收：

```go
a, b := pair()
fmt.Println("结果：", a, b)
```

---

## 4.4 可变参数

### 4.4.1 定义可变参数函数

当函数需要接收数量不固定的同类型参数时，可以使用可变参数。

语法如下：

```go
func 函数名(参数名 ...元素类型) {
}
```

例如，定义一个求和函数：

```go
package main

import "fmt"

func sum(numbers ...int) int {
    total := 0

    for _, number := range numbers {
        total += number
    }

    return total
}

func main() {
    fmt.Println(sum())
    fmt.Println(sum(10))
    fmt.Println(sum(1, 2, 3, 4))
}
```

运行结果：

```text
0
10
10
```

可变参数允许传入零个或多个对应类型的值。

---

### 4.4.2 可变参数在函数内部是切片

在函数内部，可变参数按照切片处理：

```go
func printNumbers(numbers ...int) {
    fmt.Printf("类型：%T\n", numbers)
    fmt.Println("长度：", len(numbers))

    for index, number := range numbers {
        fmt.Println(index, number)
    }
}
```

`numbers` 的类型是：

```go
[]int
```

因此，可以对其使用：

- `len`；
- 索引；
- `range`；
- 其他切片操作。

---

### 4.4.3 可变参数必须位于最后

一个函数最多只能声明一个可变参数，并且必须位于参数列表的最后。

正确：

```go
func printResult(
    prefix string,
    numbers ...int,
) {
}
```

错误：

```go
// 可变参数后面不能继续声明其他参数
func printResult(
    numbers ...int,
    prefix string,
) {
}
```

---

### 4.4.4 将切片展开为可变参数

如果已经有一个切片，可以在切片后添加 `...`，将元素展开后传入函数：

```go
package main

import "fmt"

func sum(numbers ...int) int {
    total := 0

    for _, number := range numbers {
        total += number
    }

    return total
}

func main() {
    numbers := []int{1, 2, 3, 4}

    result := sum(numbers...)

    fmt.Println(result)
}
```

运行结果：

```text
10
```

下面的写法不正确：

```go
// sum 需要若干个 int，而不是一个 []int
// result := sum(numbers)
```

必须使用：

```go
result := sum(numbers...)
```

---

### 4.4.5 使用 any 接收不同类型

如果参数的数量和类型都不固定，可以使用 `...any`：

```go
func printValues(values ...any) {
    for _, value := range values {
        fmt.Println(value)
    }
}
```

调用：

```go
printValues(
    100,
    "Go",
    true,
    3.14,
)
```

`any` 是 `interface{}` 的别名，下面两种写法等价：

```go
func printValues(values ...any) {
}
```

```go
func printValues(values ...interface{}) {
}
```

虽然 `...any` 很灵活，但它无法通过函数签名说明每个参数应当是什么类型。

因此，除格式化、日志和通用工具等场景外，应优先使用明确的参数类型。

---

## 4.5 函数值与高阶函数

### 4.5.1 函数也是一种值

在 Go 中，函数可以像其他值一样赋给变量：

```go
package main

import "fmt"

func add(a, b int) int {
    return a + b
}

func main() {
    operation := add

    result := operation(10, 20)

    fmt.Println(result)
}
```

运行结果：

```text
30
```

变量 `operation` 的类型为：

```go
func(int, int) int
```

可以使用 `%T` 查看：

```go
fmt.Printf("%T\n", operation)
```

---

### 4.5.2 函数类型

当某种函数签名需要反复使用时，可以定义函数类型：

```go
type Operation func(int, int) int
```

例如：

```go
package main

import "fmt"

type Operation func(int, int) int

func add(a, b int) int {
    return a + b
}

func subtract(a, b int) int {
    return a - b
}

func calculate(
    a int,
    b int,
    operation Operation,
) int {
    return operation(a, b)
}

func main() {
    fmt.Println(calculate(10, 5, add))
    fmt.Println(calculate(10, 5, subtract))
}
```

运行结果：

```text
15
5
```

定义函数类型可以：

- 简化复杂的函数签名；
- 表达一组函数具有相同用途；
- 提高高阶函数的可读性；
- 为函数类型声明方法。

---

### 4.5.3 函数作为参数

接收函数参数的函数通常称为高阶函数。

例如：

```go
func calculate(
    a int,
    b int,
    operation func(int, int) int,
) int {
    return operation(a, b)
}
```

调用时可以传入具名函数：

```go
func multiply(a, b int) int {
    return a * b
}

result := calculate(10, 20, multiply)
```

也可以直接传入匿名函数：

```go
result := calculate(
    10,
    20,
    func(a, b int) int {
        return a * b
    },
)
```

函数参数常见于：

- 数据过滤；
- 数据转换；
- 自定义排序；
- 回调处理；
- 中间件；
- 任务调度；
- 策略选择。

---

### 4.5.4 函数作为返回值

函数也可以返回另一个函数：

```go
package main

import "fmt"

func selectOperation(
    operator string,
) func(int, int) int {
    switch operator {
    case "+":
        return func(a, b int) int {
            return a + b
        }
    case "-":
        return func(a, b int) int {
            return a - b
        }
    default:
        return nil
    }
}

func main() {
    operation := selectOperation("+")

    if operation == nil {
        fmt.Println("不支持的运算")
        return
    }

    fmt.Println(operation(10, 20))
}
```

运行结果：

```text
30
```

---

### 4.5.5 函数类型的零值

函数类型的零值是 `nil`：

```go
var operation func(int, int) int
```

判断：

```go
fmt.Println(operation == nil) // true
```

不能调用值为 `nil` 的函数：

```go
// 会引发运行时错误
// operation(10, 20)
```

调用可能为 `nil` 的函数前应先判断：

```go
if operation != nil {
    result := operation(10, 20)
    fmt.Println(result)
}
```

函数值只能与 `nil` 比较，不能直接比较两个函数值是否相等。

---

## 4.6 匿名函数与闭包

### 4.6.1 匿名函数

匿名函数是没有函数名的函数，也称为函数字面量。

基本语法如下：

```go
func(参数列表) 返回值列表 {
    函数体
}
```

可以将匿名函数赋值给变量：

```go
package main

import "fmt"

func main() {
    square := func(number int) int {
        return number * number
    }

    fmt.Println(square(5))
}
```

运行结果：

```text
25
```

这里的 `square` 是一个保存函数值的变量。

---

### 4.6.2 立即调用匿名函数

匿名函数定义后可以立即调用：

```go
package main

import "fmt"

func main() {
    result := func(a, b int) int {
        return a + b
    }(10, 20)

    fmt.Println(result)
}
```

运行结果：

```text
30
```

末尾的：

```go
(10, 20)
```

表示立即调用刚刚定义的匿名函数。

立即调用匿名函数可以用于：

- 创建一个临时作用域；
- 执行一次性的初始化逻辑；
- 控制 `defer` 的作用范围；
- 启动 Goroutine；
- 封装循环中的单次资源处理。

---

### 4.6.3 匿名函数作为参数

匿名函数常被直接传给另一个函数：

```go
package main

import "fmt"

func transform(numbers []int, operation func(int) int) []int {
    result := make([]int, len(numbers))

    for index, number := range numbers {
        result[index] = operation(number)
    }

    return result
}

func main() {
    numbers := []int{1, 2, 3}

    result := transform(
        numbers,
        func(number int) int {
            return number * 2
        },
    )

    fmt.Println(result)
}
```

运行结果：

```text
[2 4 6]
```

---

### 4.6.4 什么是闭包

闭包是引用了外层作用域变量的函数值。

例如：

```go
package main

import "fmt"

func createCounter() func() int {
    count := 0

    return func() int {
        count++
        return count
    }
}

func main() {
    next := createCounter()

    fmt.Println(next())
    fmt.Println(next())
    fmt.Println(next())
}
```

运行结果：

```text
1
2
3
```

返回的匿名函数引用了外层函数中的变量 `count`。

即使 `createCounter` 已经执行结束，只要返回的函数仍然存在，`count` 就会继续存在。

---

### 4.6.5 每个闭包可以拥有独立状态

每次调用创建闭包的函数，都会创建新的变量环境：

```go
package main

import "fmt"

func createCounter(start int) func() int {
    count := start

    return func() int {
        count++
        return count
    }
}

func main() {
    counterA := createCounter(0)
    counterB := createCounter(100)

    fmt.Println(counterA())
    fmt.Println(counterA())

    fmt.Println(counterB())
    fmt.Println(counterB())
}
```

运行结果：

```text
1
2
101
102
```

`counterA` 和 `counterB` 引用的是两个不同的 `count` 变量。

---

### 4.6.6 多个闭包可以共享状态

同一次外层函数调用中创建的多个闭包，可以引用同一个变量：

```go
package main

import "fmt"

func createCalculator(initial int) (func(int) int, func(int) int) {
    value := initial

    add := func(number int) int {
        value += number
        return value
    }

    subtract := func(number int) int {
        value -= number
        return value
    }

    return add, subtract
}

func main() {
    add, subtract := createCalculator(10)

    fmt.Println(add(5))
    fmt.Println(subtract(3))
    fmt.Println(add(2))
}
```

运行结果：

```text
15
12
14
```

`add` 和 `subtract` 引用了同一个 `value`。

---

### 4.6.7 闭包捕获的是变量

闭包引用的是外层变量，而不是简单保存变量在闭包创建时的值：

```go
package main

import "fmt"

func main() {
    number := 10

    printNumber := func() {
        fmt.Println(number)
    }

    number = 20

    printNumber()
}
```

运行结果：

```text
20
```

如果希望保存某一时刻的值，可以显式复制：

```go
number := 10
saved := number

printNumber := func() {
    fmt.Println(saved)
}

number = 20

printNumber() // 10
```

也可以通过匿名函数参数保存：

```go
number := 10

printNumber := func(value int) func() {
    return func() {
        fmt.Println(value)
    }
}(number)

number = 20

printNumber() // 10
```

---

### 4.6.8 闭包的使用场景

闭包常用于：

- 保存函数调用之间的状态；
- 封装局部数据；
- 创建回调函数；
- 生成具有特定配置的函数；
- 实现中间件；
- 延迟执行代码；
- 为函数绑定部分参数。

闭包会延长其引用变量的生命周期。

如果闭包长期持有很大的切片、Map 或其他对象，这些对象可能无法及时被垃圾回收。因此，闭包应只引用真正需要的数据。

---

## 4.7 延迟调用：defer

### 4.7.1 defer 的基本作用

`defer` 用于将一个函数或方法调用推迟到当前函数结束前执行。

基本语法如下：

```go
defer 函数调用
```

例如：

```go
package main

import "fmt"

func example() {
    defer fmt.Println("函数即将结束")

    fmt.Println("函数正在执行")
}

func main() {
    example()
}
```

运行结果：

```text
函数正在执行
函数即将结束
```

`defer` 后面必须是一个函数或方法调用：

```go
defer fmt.Println("结束")
```

不能只写函数名：

```go
// 错误
// defer fmt.Println
```

---

### 4.7.2 defer 的执行时机

延迟调用会在当前函数返回之前执行。

以下情况都会触发已经注册的延迟调用：

- 函数正常执行到末尾；
- 函数执行显式 `return`；
- 函数发生 `panic` 并开始退出调用栈。

需要注意，直接使用 `os.Exit` 结束进程时，不会执行已经注册的 `defer`。

---

### 4.7.3 多个 defer 的执行顺序

同一个函数中可以注册多个延迟调用。

它们按照后进先出的顺序执行：

```go
package main

import "fmt"

func main() {
    defer fmt.Println("第一个 defer")
    defer fmt.Println("第二个 defer")
    defer fmt.Println("第三个 defer")

    fmt.Println("函数主体")
}
```

运行结果：

```text
函数主体
第三个 defer
第二个 defer
第一个 defer
```

可以将其理解为一个栈：

```text
注册顺序：第一个 → 第二个 → 第三个
执行顺序：第三个 → 第二个 → 第一个
```

这适合按照与获取资源相反的顺序释放资源。

---

### 4.7.4 defer 的参数会立即求值

程序执行到 `defer` 语句时，函数值和调用参数会立即求值并保存，只是函数调用本身会延迟执行。

```go
package main

import "fmt"

func main() {
    number := 10

    defer fmt.Println(number)

    number = 20

    fmt.Println("当前值：", number)
}
```

运行结果：

```text
当前值： 20
10
```

执行：

```go
defer fmt.Println(number)
```

时，参数 `number` 已经被求值并保存为 `10`。

---

### 4.7.5 使用闭包延迟读取变量

如果延迟调用使用闭包，闭包可以在真正执行时读取变量的当前值：

```go
package main

import "fmt"

func main() {
    number := 10

    defer func() {
        fmt.Println(number)
    }()

    number = 20
}
```

运行结果：

```text
20
```

下面两种写法的行为不同。

注册时保存值：

```go
defer fmt.Println(number)
```

延迟执行时读取变量：

```go
defer func() {
    fmt.Println(number)
}()
```

---

### 4.7.6 defer 与返回值

函数执行 `return` 时，可以大致理解为以下步骤：

1. 计算 `return` 后面的表达式；
2. 将结果赋给返回值；
3. 执行已经注册的延迟调用；
4. 将最终结果返回给调用方。

例如：

```go
package main

import "fmt"

func result() (number int) {
    defer func() {
        number++
    }()

    return 10
}

func main() {
    fmt.Println(result())
}
```

运行结果：

```text
11
```

执行：

```go
return 10
```

时，先将 `10` 赋给命名返回值 `number`，随后延迟函数将 `number` 修改为 `11`。

虽然可以使用 `defer` 修改命名返回值，但这种写法会增加理解成本。除错误处理等必要场景外，不建议频繁使用。

---

### 4.7.7 使用 defer 释放资源

`defer` 最常见的用途是释放资源。

例如，打开文件后关闭文件：

```go
package main

import (
    "fmt"
    "io"
    "os"
)

func readFile(path string) ([]byte, error) {
    file, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer file.Close()

    return io.ReadAll(file)
}

func main() {
    data, err := readFile("example.txt")
    if err != nil {
        fmt.Println("读取失败：", err)
        return
    }

    fmt.Println(string(data))
}
```

必须在资源获取成功后注册清理操作。

正确：

```go
file, err := os.Open(path)
if err != nil {
    return err
}

defer file.Close()
```

错误：

```go
file, err := os.Open(path)
defer file.Close()

if err != nil {
    return err
}
```

如果文件打开失败，`file` 可能没有可用值。延迟调用 `file.Close()` 时可能发生运行时错误。

---

### 4.7.8 使用 defer 释放锁

`defer` 也经常用于释放互斥锁：

```go
func update() {
    mutex.Lock()
    defer mutex.Unlock()

    // 修改受保护的数据
}
```

这样即使函数中途执行 `return`，锁也能够被释放。

但是，`defer` 会在整个函数结束时才执行。

如果锁只需要保护一小段代码，可以使用独立函数缩小作用范围：

```go
func update() {
    func() {
        mutex.Lock()
        defer mutex.Unlock()

        // 只保护这一段代码
    }()

    // 后续不需要持有锁的代码
}
```

---

### 4.7.9 不要在循环中无意积累 defer

`defer` 在当前函数结束时执行，而不是在当前循环迭代结束时执行。

下面的代码会等到 `processFiles` 整体返回时，才关闭所有文件：

```go
func processFiles(paths []string) error {
    for _, path := range paths {
        file, err := os.Open(path)
        if err != nil {
            return err
        }

        defer file.Close()

        // 处理文件
    }

    return nil
}
```

如果文件数量很多，可能同时占用大量资源。

可以将单次处理拆分成独立函数：

```go
func processFile(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return err
    }
    defer file.Close()

    // 处理当前文件

    return nil
}

func processFiles(paths []string) error {
    for _, path := range paths {
        if err := processFile(path); err != nil {
            return err
        }
    }

    return nil
}
```

每次 `processFile` 返回时，当前文件都会被关闭。

如果清理操作非常简单，也可以在循环体末尾显式关闭，但必须确保所有分支都能正确执行清理。

---

### 4.7.10 处理 Close 返回的错误

某些资源的 `Close` 方法会返回错误。

在写文件等对数据完整性要求较高的场景中，关闭时的错误也应当处理：

```go
package main

import "os"

func writeFile(
    path string,
    data []byte,
) (err error) {
    file, err := os.Create(path)
    if err != nil {
        return err
    }

    defer func() {
        closeErr := file.Close()

        if err == nil {
            err = closeErr
        }
    }()

    _, err = file.Write(data)
    return err
}
```

这里的处理规则是：

- 如果写入已经失败，优先返回写入错误；
- 如果写入成功但关闭失败，返回关闭错误。

在普通的只读示例中，可以简单使用：

```go
defer file.Close()
```

---

### 4.7.11 延迟调用 nil 函数

函数类型的零值是 `nil`。

下面的代码能够注册 `defer`，但在延迟调用真正执行时会发生运行时错误：

```go
func example() {
    var run func()

    defer run()

    fmt.Println("函数主体执行完成")
}
```

因此，在注册前应当判断：

```go
if run != nil {
    defer run()
}
```

---

### 4.7.12 使用 defer 记录执行时间

`defer` 和闭包可以配合记录函数执行时间：

```go
package main

import (
    "fmt"
    "time"
)

func trackTime(name string) func() {
    start := time.Now()

    return func() {
        fmt.Printf("%s 耗时：%s\n", name, time.Since(start))
    }
}

func task() {
    defer trackTime("task")()

    time.Sleep(100 * time.Millisecond)
}

func main() {
    task()
}
```

表达式：

```go
defer trackTime("task")()
```

可以拆分为：

```go
finish := trackTime("task")
defer finish()
```

其中：

1. `trackTime("task")` 立即执行，记录开始时间；
2. 它返回一个函数；
3. 返回的函数被注册为延迟调用；
4. `task` 结束时计算并输出执行时间。

---

## 4.8 函数设计建议

### 4.8.1 一个函数只负责一个明确任务

函数应具有清晰、单一的职责。

不推荐：

```go
func loadValidateSaveAndNotify() {
}
```

更合理的拆分：

```go
func loadData() {}
func validateData() {}
func saveData() {}
func sendNotification() {}
```

职责清晰的函数更容易：

- 阅读；
- 测试；
- 修改；
- 复用；
- 定位问题。

函数并不是越短越好。关键是函数是否表达了一个完整、明确的任务。

---

### 4.8.2 避免过长的参数列表

参数过多会降低函数调用的可读性：

```go
func createUser(
    name string,
    age int,
    city string,
    email string,
    phone string,
    enabled bool,
) {
}
```

可以使用结构体封装相关参数：

```go
type CreateUserRequest struct {
    Name    string
    Age     int
    City    string
    Email   string
    Phone   string
    Enabled bool
}

func createUser(request CreateUserRequest) {
}
```

调用时更加清楚：

```go
createUser(CreateUserRequest{
    Name:    "Alice",
    Age:     20,
    City:    "北京",
    Email:   "alice@example.com",
    Enabled: true,
})
```

---

### 4.8.3 优先使用明确的参数类型

除非确实需要处理任意类型，否则应避免大量使用：

```go
func process(values ...any) {
}
```

明确的参数类型可以：

- 提供编译期检查；
- 改善代码补全；
- 说明函数的调用规则；
- 减少运行时类型判断；
- 让函数用途更加明确。

---

### 4.8.4 谨慎使用命名返回值

命名返回值适合：

- 多个返回值类型相同；
- 返回值含义不容易从类型判断；
- 需要在延迟函数中修改最终返回值。

不应仅仅为了使用裸 `return` 而命名返回值。

简单清楚的函数：

```go
func add(a, b int) int {
    return a + b
}
```

没有必要写成：

```go
func add(a, b int) (result int) {
    result = a + b
    return
}
```

---

### 4.8.5 裸 return 只用于短函数

短小函数中可以使用裸返回：

```go
func split(number int) (
    quotient, remainder int,
) {
    quotient = number / 10
    remainder = number % 10
    return
}
```

函数变长后，应显式返回：

```go
return quotient, remainder
```

显式返回可以减少读者追踪变量值的成本。

---

### 4.8.6 不要滥用指针参数

指针参数并不一定比值参数更好。

适合使用指针的情况：

- 需要修改调用方对象；
- 对象较大；
- 需要表示 `nil`；
- 对象不应该被复制。

对于简单数值和小型只读数据，应优先直接传值。

---

### 4.8.7 不要随意忽略错误

不推荐：

```go
result, _ := doSomething()
```

推荐：

```go
result, err := doSomething()
if err != nil {
    return err
}
```

如果确实需要忽略错误，应确保这是经过明确考虑的行为。

---

### 4.8.8 在资源获取成功后注册 defer

正确顺序：

```go
resource, err := acquireResource()
if err != nil {
    return err
}

defer resource.Close()
```

不要在确认资源有效之前注册释放操作。

---

## 4.9 常见问题

### 4.9.1 认为 Go 存在引用传递

Go 的所有函数参数都按值传递。

传入指针时，复制的是指针值；传入切片、Map 或 Channel 时，复制后的值可能继续引用共享数据。

---

### 4.9.2 忘记接收 append 的结果

错误：

```go
func add(numbers []int) {
    append(numbers, 10)
}
```

正确：

```go
func add(numbers []int) []int {
    return append(numbers, 10)
}
```

调用：

```go
numbers = add(numbers)
```

---

### 4.9.3 调用 nil 函数

错误：

```go
var operation func()

operation()
```

正确：

```go
if operation != nil {
    operation()
}
```

---

### 4.9.4 可变参数没有放在最后

错误：

```go
func printValues(values ...int, prefix string) {
}
```

正确：

```go
func printValues(prefix string,values ...int) {
}
```

---

### 4.9.5 在循环中积累大量 defer

`defer` 会在当前函数返回时执行，而不是在一轮循环结束时执行。

循环中反复获取资源时，应当：

- 将单次处理拆成独立函数；
- 或者在合适位置显式释放资源。

---

### 4.9.6 在资源获取失败后仍然调用清理方法

错误：

```go
file, err := os.Open(path)
defer file.Close()

if err != nil {
    return err
}
```

正确：

```go
file, err := os.Open(path)
if err != nil {
    return err
}

defer file.Close()
```

---

### 4.9.7 过度使用 any

下面的函数缺少明确的参数约束：

```go
func process(values ...any) {
}
```

如果参数类型可以确定，应使用具体类型：

```go
func sum(values ...int) int {
    // ...
}
```

---

## 总结

定义普通函数：

```go
func add(a, b int) int {
    return a + b
}
```

定义没有返回值的函数：

```go
func printMessage(message string) {
    fmt.Println(message)
}
```

定义多返回值函数：

```go
func calculate(a, b int) (int, int) {
    return a + b, a - b
}
```

定义结果和错误：

```go
func divide(
    a, b float64,
) (float64, error) {
    if b == 0 {
        return 0, errors.New("除数不能为 0")
    }

    return a / b, nil
}
```

定义可变参数：

```go
func sum(numbers ...int) int {
    total := 0

    for _, number := range numbers {
        total += number
    }

    return total
}
```

定义函数类型：

```go
type Operation func(int, int) int
```

定义匿名函数：

```go
square := func(number int) int {
    return number * number
}
```

定义闭包：

```go
func createCounter() func() int {
    count := 0

    return func() int {
        count++
        return count
    }
}
```

注册延迟调用：

```go
defer resource.Close()
```

使用函数时，需要重点理解：

- Go 的函数参数始终按值传递；
- 指针参数传递的也是指针值的副本；
- 切片和 Map 的副本可能继续引用共享数据；
- 函数可以返回多个值；
- `error` 通常作为最后一个返回值；
- 可变参数在函数内部表现为切片；
- 函数可以赋给变量，也可以作为参数和返回值；
- 匿名函数引用外部变量时会形成闭包；
- 函数类型的零值是 `nil`；
- `defer` 按后进先出的顺序执行；
- `defer` 的函数值和参数在注册时求值；
- 应当在资源获取成功后再注册清理操作；
- 函数设计应优先保证职责清晰和调用方式明确。
