---
permalink: /backend/go/basic/03-control-flow/
title: 03. 流程控制
shortTitle: 03. 流程控制
order: 3
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 流程控制
  - if
  - for
  - switch
  - select
  - range
---

# 03. 流程控制

## 前言

流程控制决定程序在什么条件下执行分支、如何重复处理数据，以及何时结束或跳过当前操作。Go 通过 `if`、`switch`、`select`、`for` 和流程跳转语句表达这些逻辑。

## 3.1 条件分支：if 语句

程序在运行过程中，经常需要根据不同的条件执行不同的代码。例如，根据用户年龄判断是否成年，根据考试成绩输出等级，或者根据函数执行结果决定是否继续处理。

Go 使用 `if` 语句实现条件分支。当条件表达式的结果为 `true` 时，程序执行对应的代码块；当结果为 `false` 时，程序跳过该代码块，或者继续执行后面的 `else` 分支。

### 3.1.1 基本的 if 语句

`if` 语句最基本的语法如下：

```go
if 条件表达式 {
    条件成立时执行的代码
}
```

例如：

```go
package main

import "fmt"

func main() {
    age := 20

    if age >= 18 {
        fmt.Println("已经成年")
    }
}
```

运行结果：

```text
已经成年
```

当 `age >= 18` 的结果为 `true` 时，`if` 后面的代码块会被执行；如果条件为 `false`，程序将直接跳过该代码块。

使用 `if` 时需要注意以下几点：

1. 条件表达式的结果必须是布尔值，即 `true` 或 `false`。
2. 条件表达式通常不需要使用圆括号包围。
3. 即使代码块中只有一条语句，也必须保留花括号。
4. 左花括号 `{` 应当写在条件表达式所在行的末尾。

正确写法：

```go
if age >= 18 {
    fmt.Println("已经成年")
}
```

不推荐或错误的写法：

```go
// 不符合 Go 的常规代码风格
if (age >= 18) {
    fmt.Println("已经成年")
}

// 编译错误：左花括号不能另起一行
if age >= 18
{
    fmt.Println("已经成年")
}
```

与某些语言不同，Go 不会自动把整数转换成布尔值，因此下面的代码不能通过编译：

```go
count := 10

// 错误：count 是 int 类型，不是 bool 类型
if count {
    fmt.Println("count 不为 0")
}
```

应当明确写出判断条件：

```go
if count != 0 {
    fmt.Println("count 不为 0")
}
```

### 3.1.2 if...else 双分支

当程序需要在条件成立和不成立时分别执行不同的代码，可以使用 `if...else`：

```go
if 条件表达式 {
    条件成立时执行的代码
} else {
    条件不成立时执行的代码
}
```

例如，判断一个整数是奇数还是偶数：

```go
package main

import "fmt"

func main() {
    number := 7

    if number%2 == 0 {
        fmt.Println("number 是偶数")
    } else {
        fmt.Println("number 是奇数")
    }
}
```

运行结果：

```text
number 是奇数
```

`if` 和 `else` 对应的两个代码块只会执行其中一个：

- 条件为 `true` 时，执行 `if` 分支；
- 条件为 `false` 时，执行 `else` 分支。

在 Go 中，`else` 必须与前一个右花括号写在同一行：

```go
if number%2 == 0 {
    fmt.Println("偶数")
} else {
    fmt.Println("奇数")
}
```

不能写成：

```go
if number%2 == 0 {
    fmt.Println("偶数")
}
else {
    fmt.Println("奇数")
}
```

### 3.1.3 else if 多分支

当程序需要判断多个互斥条件时，可以在 `if` 和 `else` 之间添加一个或多个 `else if` 分支：

```go
if 条件表达式1 {
    条件1成立时执行
} else if 条件表达式2 {
    条件2成立时执行
} else {
    前面条件都不成立时执行
}
```

例如，根据成绩划分等级：

```go
package main

import "fmt"

func main() {
    score := 86

    if score >= 90 {
        fmt.Println("等级：优秀")
    } else if score >= 80 {
        fmt.Println("等级：良好")
    } else if score >= 60 {
        fmt.Println("等级：及格")
    } else {
        fmt.Println("等级：不及格")
    }
}
```

运行结果：

```text
等级：良好
```

多个条件会按照从上到下的顺序依次判断。一旦找到第一个结果为 `true` 的条件，程序就会执行对应代码块，并跳过后面的其他分支。

因此，多分支判断时需要注意条件的排列顺序。例如：

```go
score := 95

if score >= 60 {
    fmt.Println("及格")
} else if score >= 90 {
    fmt.Println("优秀")
}
```

虽然 `score` 为 `95`，但程序会输出：

```text
及格
```

这是因为 `score >= 60` 已经成立，后面的 `score >= 90` 不会再被判断。正确的做法是将范围更小、要求更高的条件放在前面：

```go
if score >= 90 {
    fmt.Println("优秀")
} else if score >= 60 {
    fmt.Println("及格")
}
```

### 3.1.4 在 if 中声明临时变量

Go 的 `if` 语句可以在条件表达式之前添加一条初始化语句，两者之间使用分号分隔：

```go
if 初始化语句; 条件表达式 {
    条件成立时执行的代码
}
```

例如，根据用户名长度进行判断：

```go
package main

import "fmt"

func main() {
    username := "gopher"

    if length := len(username); length < 6 {
        fmt.Println("用户名长度不能少于 6 个字符")
    } else {
        fmt.Printf("用户名长度为 %d\n", length)
    }
}
```

运行结果：

```text
用户名长度为 6
```

程序首先执行：

```go
length := len(username)
```

然后再判断：

```go
length < 6
```

在初始化语句中声明的变量，其作用域只限于当前 `if` 语句及其关联的 `else if`、`else` 分支。因此，变量 `length` 可以在 `if` 和 `else` 中使用，但不能在整个分支结束后继续使用。

```go
if length := len(username); length < 6 {
    fmt.Println(length)
} else {
    fmt.Println(length)
}

// 错误：这里已经超出了 length 的作用域
fmt.Println(length)
```

这种写法适合保存只在条件判断中使用的临时结果，可以缩小变量的作用域，避免临时变量影响后面的代码。

实际开发中，经常可以看到下面这种写法：

```go
if err := doSomething(); err != nil {
    fmt.Println("操作失败：", err)
}
```

其中，`err` 只用于检查当前操作是否发生错误，因此没有必要在 `if` 语句外单独声明。

### 3.1.5 嵌套 if 语句

`if`、`else if` 或 `else` 的代码块中还可以继续编写 `if` 语句，这种结构称为嵌套 `if`。

例如，只有用户已经登录后，才继续判断其是否具有管理员权限：

```go
package main

import "fmt"

func main() {
    loggedIn := true
    isAdmin := true

    if loggedIn {
        if isAdmin {
            fmt.Println("进入管理后台")
        } else {
            fmt.Println("当前用户没有管理员权限")
        }
    } else {
        fmt.Println("请先登录")
    }
}
```

嵌套 `if` 适合表达存在先后依赖关系的条件：只有外层条件成立后，内层条件才有判断的必要。

不过，嵌套层级过多会降低代码的可读性。对于可以提前结束的情况，通常可以使用提前返回来减少嵌套：

```go
func enterAdmin(loggedIn, isAdmin bool) {
    if !loggedIn {
        fmt.Println("请先登录")
        return
    }

    if !isAdmin {
        fmt.Println("当前用户没有管理员权限")
        return
    }

    fmt.Println("进入管理后台")
}
```

这种写法将异常情况提前处理，使主要逻辑更加清晰。

### 3.1.6 if 语句的常见问题

#### 3.1.6.1 在条件后面误写分号

错误写法：

```go
if age >= 18; {
    fmt.Println("已经成年")
}
```

只有在条件前存在初始化语句时，才需要使用分号：

```go
if age := 20; age >= 18 {
    fmt.Println("已经成年")
}
```

#### 3.1.6.2 将赋值和比较混淆

赋值使用 `=`，比较相等使用 `==`：

```go
age = 18      // 将 18 赋值给 age
age == 18     // 判断 age 是否等于 18
```

条件判断中通常需要使用比较运算：

```go
if age == 18 {
    fmt.Println("年龄等于 18")
}
```

#### 3.1.6.3 忽略条件的判断顺序

在多个 `else if` 分支中，程序只执行第一个满足条件的分支，因此应当将更具体的条件放在前面，将更宽泛的条件放在后面。

#### 3.1.6.4 编写过深的嵌套

嵌套层级过深时，可以考虑使用提前返回、拆分函数或者使用 `switch` 语句简化代码。

#### 3.1.6.5 使用三元运算符

Go 不支持下面这种三元条件表达式：

```go
// Go 不支持这种写法
max := a > b ? a : b
```

需要使用普通的 `if` 语句：

```go
max := b

if a > b {
    max = a
}
```

### 3.1.7 小结

Go 的条件分支主要包括以下几种形式：

```go
// 单分支
if condition {
}

// 双分支
if condition {
} else {
}

// 多分支
if condition1 {
} else if condition2 {
} else {
}

// 带初始化语句的条件分支
if value := expression; condition {
}
```

学习 `if` 语句时，需要重点掌握以下内容：

- 判断条件必须是布尔表达式；
- 花括号不能省略；
- 多个条件按照从上到下的顺序判断；
- `if` 可以包含初始化语句；
- 初始化语句中声明的变量只在当前分支结构中有效；
- 应避免过深的条件嵌套。



## 3.2 多分支选择：switch 语句

当程序需要根据一个值或一组条件选择不同的执行路径时，可以使用 `switch` 语句。

与连续编写多个 `if...else if` 相比，`switch` 通常具有更清晰的结构，适合处理枚举值、状态码、命令类型以及多个互斥条件。

Go 的 `switch` 分为两种形式：

- 表达式 `switch`：根据值或条件选择分支；
- 类型 `switch`：根据接口值中保存的实际类型选择分支。

### 3.2.1 基本的 switch 语句

基本语法如下：

```go
switch 表达式 {
case 值1:
    表达式等于值1时执行
case 值2:
    表达式等于值2时执行
default:
    没有任何 case 匹配时执行
}
```

例如，根据星期编号输出对应名称：

```go
package main

import "fmt"

func main() {
    day := 3

    switch day {
    case 1:
        fmt.Println("星期一")
    case 2:
        fmt.Println("星期二")
    case 3:
        fmt.Println("星期三")
    case 4:
        fmt.Println("星期四")
    case 5:
        fmt.Println("星期五")
    default:
        fmt.Println("不是有效的工作日编号")
    }
}
```

运行结果：

```text
星期三
```

程序会依次检查各个 `case`，并执行第一个匹配的分支。匹配成功后，其他分支会被跳过。`default` 是可选的，用于处理没有任何 `case` 匹配的情况。

Go 的 `switch` 默认不会继续执行下一个 `case`，因此一般不需要在每个分支末尾编写 `break`。

### 3.2.2 一个 case 匹配多个值

一个 `case` 可以包含多个值，值之间使用逗号分隔：

```go
package main

import "fmt"

func main() {
    day := 6

    switch day {
    case 1, 2, 3, 4, 5:
        fmt.Println("工作日")
    case 6, 7:
        fmt.Println("休息日")
    default:
        fmt.Println("无效的星期编号")
    }
}
```

运行结果：

```text
休息日
```

这种写法适合多个值需要执行相同逻辑的情况，可以避免重复编写代码。

### 3.2.3 不带表达式的 switch

`switch` 后面的表达式可以省略。省略后，相当于编写：

```go
switch true {
}
```

此时，每个 `case` 中可以直接填写布尔表达式，因此这种形式可以代替较长的 `if...else if` 结构。

例如，根据成绩划分等级：

```go
package main

import "fmt"

func main() {
    score := 86

    switch {
    case score < 0 || score > 100:
        fmt.Println("成绩无效")
    case score >= 90:
        fmt.Println("等级：优秀")
    case score >= 80:
        fmt.Println("等级：良好")
    case score >= 60:
        fmt.Println("等级：及格")
    default:
        fmt.Println("等级：不及格")
    }
}
```

运行结果：

```text
等级：良好
```

条件仍然按照从上到下的顺序判断，程序只执行第一个条件成立的分支。因此，应当将更具体、范围更小的条件放在前面。

下面的顺序是不正确的：

```go
switch {
case score >= 60:
    fmt.Println("及格")
case score >= 90:
    fmt.Println("优秀")
}
```

当 `score` 为 `95` 时，第一个条件已经成立，程序会输出“及格”，第二个分支不会再被判断。

### 3.2.4 在 switch 中使用初始化语句

与 `if` 类似，`switch` 也可以在判断表达式前执行一条初始化语句：

```go
switch 初始化语句; 表达式 {
case 值1:
    // ...
case 值2:
    // ...
}
```

例如：

```go
package main

import "fmt"

func main() {
    username := "gopher"

    switch length := len(username); {
    case length == 0:
        fmt.Println("用户名不能为空")
    case length < 6:
        fmt.Println("用户名长度不能少于 6 个字符")
    case length > 20:
        fmt.Println("用户名长度不能超过 20 个字符")
    default:
        fmt.Println("用户名长度符合要求")
    }
}
```

运行结果：

```text
用户名长度符合要求
```

变量 `length` 的作用域只限于当前 `switch` 语句，包括其中所有的 `case` 和 `default` 分支。

初始化语句适合保存仅在当前判断过程中使用的临时结果。

### 3.2.5 switch 表达式和 case 的要求

普通表达式 `switch` 本质上是在比较：

```go
case表达式 == switch表达式
```

因此，`switch` 表达式必须是可比较类型，`case` 中的表达式也必须能够与其进行比较。

常见的可比较类型包括：

- 整数；
- 浮点数；
- 字符串；
- 布尔值；
- 指针；
- Channel；
- 数组；
- 字段均可比较的结构体。

切片、映射和函数不能直接作为普通 `switch` 的比较表达式。

`case` 中不一定只能填写常量，也可以填写能够正常求值和比较的表达式。程序会从上到下检查，并选择第一个匹配项。

例如：

```go
package main

import "fmt"

func main() {
    a := 10
    b := 20
    value := 20

    switch value {
    case a:
        fmt.Println("value 等于 a")
    case b:
        fmt.Println("value 等于 b")
    default:
        fmt.Println("没有匹配项")
    }
}
```

### 3.2.6 fallthrough：继续执行下一个 case

默认情况下，一个 `case` 执行结束后，程序会退出整个 `switch`。

如果确实需要继续执行下一个 `case`，可以使用 `fallthrough`：

```go
package main

import "fmt"

func main() {
    number := 1

    switch number {
    case 1:
        fmt.Println("匹配 case 1")
        fallthrough
    case 2:
        fmt.Println("继续执行 case 2")
    default:
        fmt.Println("默认分支")
    }
}
```

运行结果：

```text
匹配 case 1
继续执行 case 2
```

需要特别注意：`fallthrough` 不会判断下一个 `case` 的条件，而是直接执行下一个分支的代码。

例如，虽然 `number` 不等于 `2`，上面的 `case 2` 仍然会被执行。

`fallthrough` 只能作为普通表达式 `switch` 中某个分支的最后一条非空语句，并且不能出现在最后一个分支中。

实际开发中很少需要使用 `fallthrough`。如果多个分支执行相同逻辑，通常应当优先将多个值写在同一个 `case` 中：

```go
switch number {
case 1, 2:
    fmt.Println("number 是 1 或 2")
}
```

### 3.2.7 类型 switch

类型 `switch` 用于判断接口值中实际保存的数据类型。

基本语法如下：

```go
switch value := x.(type) {
case 类型1:
    // value 在这里是类型1
case 类型2:
    // value 在这里是类型2
default:
    // 其他类型
}
```

例如：

```go
package main

import "fmt"

func printValueType(value any) {
    switch v := value.(type) {
    case nil:
        fmt.Println("value 是 nil")
    case int:
        fmt.Printf("value 是 int，值为 %d\n", v)
    case float64:
        fmt.Printf("value 是 float64，值为 %.2f\n", v)
    case string:
        fmt.Printf("value 是 string，值为 %q\n", v)
    case bool:
        fmt.Printf("value 是 bool，值为 %t\n", v)
    default:
        fmt.Printf("未处理的类型：%T\n", v)
    }
}

func main() {
    printValueType(100)
    printValueType("Go")
    printValueType(true)
}
```

运行结果：

```text
value 是 int，值为 100
value 是 string，值为 "Go"
value 是 bool，值为 true
```

类型 `switch` 比较的是接口值的动态类型，而不是普通数值。`x.(type)` 只能出现在类型 `switch` 中，不能单独作为普通表达式使用。类型 `switch` 不允许使用 `fallthrough`。

如果教程尚未讲解接口和类型断言，可以将本小节移动到接口章节。

### 3.2.8 switch 的常见问题

#### 3.2.8.1 不需要在每个 case 后添加 break

下面的 `break` 通常是多余的：

```go
switch status {
case 200:
    fmt.Println("请求成功")
    break
case 404:
    fmt.Println("资源不存在")
    break
}
```

直接写成：

```go
switch status {
case 200:
    fmt.Println("请求成功")
case 404:
    fmt.Println("资源不存在")
}
```

#### 3.2.8.2 无表达式 switch 需要注意条件顺序

多个条件按照从上到下的顺序判断，只有第一个成立的分支会被执行。

#### 3.2.8.3 不要滥用 fallthrough

`fallthrough` 会无条件执行下一个分支，容易使程序逻辑变得难以理解。

#### 3.2.8.4 不要遗漏 default 中的异常处理

虽然 `default` 不是必需的，但在处理输入状态、命令类型或协议状态码时，通常应当使用 `default` 处理未知情况。

------

## 3.3 并发通信选择：select 语句

`select` 用于在多个 Channel 发送或接收操作之间进行选择。

虽然它的语法与 `switch` 相似，但两者用途不同：

- `switch` 根据值或条件选择分支；
- `select` 根据哪一个 Channel 通信操作当前可以执行来选择分支。

因此，`select` 属于 Go 并发编程内容，而不是普通条件判断。每个非 `default` 的 `case` 都必须包含 Channel 发送或接收操作。

### 3.3.1 select 的基本语法

```go
select {
case value := <-ch1:
    // 从 ch1 接收到数据
case ch2 <- value:
    // 成功向 ch2 发送数据
default:
    // 当前没有通信操作可以执行
}
```

`select` 中常见的通信操作包括：

```go
case value := <-ch:
    // 接收数据

case value, ok := <-ch:
    // 接收数据并判断 Channel 是否已经关闭

case ch <- value:
    // 发送数据
```

### 3.3.2 select 的执行规则

进入 `select` 后，程序会检查所有 `case` 中的 Channel 通信操作：

1. 如果只有一个通信操作可以立即执行，就执行对应分支；
2. 如果有多个通信操作都可以立即执行，程序会从中伪随机选择一个；
3. 如果没有通信操作可以执行，但存在 `default`，就执行 `default`；
4. 如果没有通信操作可以执行，也没有 `default`，当前 Goroutine 会阻塞，直到至少一个通信操作可以执行。

一次 `select` 只会选择并执行一个分支。Go 规范使用的是“均匀伪随机选择”，不应将其理解为严格的任务调度公平性保证。

### 3.3.3 从多个 Channel 中接收数据

下面的程序等待两个 Channel 中最先到达的数据：

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() {
        time.Sleep(100 * time.Millisecond)
        ch1 <- "任务一完成"
    }()

    go func() {
        time.Sleep(200 * time.Millisecond)
        ch2 <- "任务二完成"
    }()

    select {
    case message := <-ch1:
        fmt.Println(message)
    case message := <-ch2:
        fmt.Println(message)
    }
}
```

运行结果通常为：

```text
任务一完成
```

由于第一个 Goroutine 更早向 `ch1` 发送数据，`ch1` 对应的接收操作会先变为可执行状态。

### 3.3.4 使用 select 实现超时控制

`select` 经常与定时器配合，用于限制等待某个操作的最长时间：

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    resultCh := make(chan string)

    go func() {
        time.Sleep(2 * time.Second)
        resultCh <- "请求完成"
    }()

    select {
    case result := <-resultCh:
        fmt.Println(result)
    case <-time.After(1 * time.Second):
        fmt.Println("请求超时")
    }
}
```

运行结果：

```text
请求超时
```

程序最多等待一秒。如果一秒内 `resultCh` 没有数据，`time.After` 返回的 Channel 会产生一个值，从而执行超时分支。

在循环中频繁进行超时控制时，可以使用 `time.NewTimer`，以便更加明确地管理和停止定时器：

```go
timer := time.NewTimer(time.Second)
defer timer.Stop()

select {
case result := <-resultCh:
    fmt.Println(result)
case <-timer.C:
    fmt.Println("请求超时")
}
```

### 3.3.5 使用 default 实现非阻塞通信

普通的 Channel 发送或接收可能阻塞。通过在 `select` 中加入 `default`，可以尝试执行一次非阻塞通信。

#### 3.3.5.1 非阻塞接收

```go
select {
case value := <-ch:
    fmt.Println("接收到：", value)
default:
    fmt.Println("当前没有数据")
}
```

#### 3.3.5.2 非阻塞发送

```go
select {
case ch <- value:
    fmt.Println("发送成功")
default:
    fmt.Println("Channel 暂时无法接收数据")
}
```

例如，当缓冲 Channel 已满时，可以选择丢弃当前数据：

```go
package main

import "fmt"

func main() {
    ch := make(chan int, 1)

    ch <- 10

    select {
    case ch <- 20:
        fmt.Println("发送成功")
    default:
        fmt.Println("Channel 已满，丢弃数据")
    }
}
```

运行结果：

```text
Channel 已满，丢弃数据
```

是否应该丢弃数据取决于具体业务需求。不能仅为了避免阻塞就在所有 `select` 中添加 `default`。

### 3.3.6 使用 select 接收退出信号

Channel 可以用于通知 Goroutine 停止执行：

```go
package main

import (
    "fmt"
    "time"
)

func worker(done <-chan struct{}) {
    for {
        select {
        case <-done:
            fmt.Println("收到退出信号")
            return
        default:
            fmt.Println("正在工作")
            time.Sleep(200 * time.Millisecond)
        }
    }
}

func main() {
    done := make(chan struct{})

    go worker(done)

    time.Sleep(500 * time.Millisecond)
    close(done)

    time.Sleep(100 * time.Millisecond)
}
```

关闭 `done` 后，从该 Channel 接收数据的操作会立即完成，因此工作 Goroutine 可以收到退出信号。

在较完整的工程中，取消任务通常还可以使用标准库提供的 `context.Context`。

### 3.3.7 检查 Channel 是否关闭

从 Channel 接收数据时，可以同时获取第二个布尔值：

```go
value, ok := <-ch
```

其中：

- `ok == true`：成功接收到正常发送的数据；
- `ok == false`：Channel 已关闭，并且其中已没有剩余数据。

在 `select` 中同样可以使用：

```go
select {
case value, ok := <-ch:
    if !ok {
        fmt.Println("Channel 已关闭")
        return
    }

    fmt.Println("接收到：", value)
}
```

关闭后的 Channel 接收操作会立即完成。如果没有检查 `ok`，程序可能不断接收到元素类型的零值。

### 3.3.8 nil Channel 与 select

对 `nil` Channel 进行发送或接收永远无法完成。

因此，如果 `select` 中所有通信操作使用的都是 `nil` Channel，并且没有 `default`，程序将永久阻塞。

```go
var ch chan int

select {
case value := <-ch:
    fmt.Println(value)
}
```

在并发程序中，也可以主动将某个 Channel 变量设置为 `nil`，临时禁用对应的 `select case`。这是较高级的控制方式，应当在理解 Channel 状态管理后再使用。

### 3.3.9 select 的常见问题

#### 3.3.9.1 将 select 当作普通 switch 使用

下面的写法是错误的：

```go
select {
case score >= 60:
    fmt.Println("及格")
}
```

`select case` 必须是 Channel 发送或接收操作。

#### 3.3.9.2 在循环中使用空转 default

下面的代码可能持续占用 CPU：

```go
for {
    select {
    case value := <-ch:
        fmt.Println(value)
    default:
    }
}
```

当 Channel 没有数据时，循环会不断执行 `default`。

如果没有必须进行的其他工作，通常应删除 `default`，让当前 Goroutine 阻塞等待：

```go
for {
    select {
    case value := <-ch:
        fmt.Println(value)
    }
}
```

#### 3.3.9.3 误以为多个可执行 case 会全部执行

一次 `select` 只选择一个分支。执行结束后，只有再次进入 `select`，才会重新进行选择。

------

## 3.4 循环控制：for 语句

循环用于重复执行一段代码。

Go 只有一个循环关键字：`for`。它既可以表示传统的计数循环，也可以代替其他语言中的 `while`，还可以用于无限循环和数据遍历。

从语法上看，Go 的 `for` 主要有以下形式：

```go
for 初始化语句; 条件表达式; 后置语句 {
}

for 条件表达式 {
}

for {
}

for 变量 := range 数据 {
}
```

Go 规范将 `for` 分为单条件形式、三段式形式和 `range` 形式。

### 3.4.1 三段式 for 循环

三段式 `for` 循环的语法如下：

```go
for 初始化语句; 条件表达式; 后置语句 {
    循环体
}
```

三个组成部分的作用分别是：

- 初始化语句：循环开始前执行一次；
- 条件表达式：每次循环开始前判断；
- 后置语句：每轮循环体执行结束后执行。

例如：

```go
package main

import "fmt"

func main() {
    for i := 0; i < 5; i++ {
        fmt.Println(i)
    }
}
```

运行结果：

```text
0
1
2
3
4
```

执行过程如下：

1. 执行 `i := 0`；
2. 判断 `i < 5`；
3. 条件成立，执行循环体；
4. 执行 `i++`；
5. 再次判断 `i < 5`；
6. 条件不成立时结束循环。

初始化语句中声明的变量，其作用域仅限于当前 `for` 循环。

```go
for i := 0; i < 5; i++ {
    fmt.Println(i)
}

// 错误：i 已超出作用域
fmt.Println(i)
```

### 3.4.2 省略部分表达式

三段式 `for` 中，初始化语句、条件表达式和后置语句都可以省略，但分号仍然需要保留。

例如：

```go
i := 0

for ; i < 5; {
    fmt.Println(i)
    i++
}
```

不过，当只保留条件表达式时，应当省略分号，使用更加简洁的写法：

```go
i := 0

for i < 5 {
    fmt.Println(i)
    i++
}
```

### 3.4.3 使用 for 代替 while

Go 没有单独的 `while` 关键字。

其他语言中的：

```text
while condition {
}
```

在 Go 中写成：

```go
for condition {
}
```

例如：

```go
package main

import "fmt"

func main() {
    number := 1

    for number <= 16 {
        fmt.Println(number)
        number *= 2
    }
}
```

运行结果：

```text
1
2
4
8
16
```

只要条件结果为 `true`，循环就会继续执行。

### 3.4.4 无限循环

省略循环条件，可以创建无限循环：

```go
for {
    // 重复执行
}
```

例如：

```go
package main

import "fmt"

func main() {
    count := 0

    for {
        fmt.Println(count)
        count++

        if count == 3 {
            break
        }
    }
}
```

运行结果：

```text
0
1
2
```

虽然下面的代码也能形成无限循环：

```go
for true {
}
```

但更符合 Go 代码风格的写法是：

```go
for {
}
```

无限循环通常用于：

- 服务端持续接收请求；
- 消费 Channel 数据；
- 事件循环；
- 持续执行后台任务。

编写无限循环时，应当明确设计退出条件，否则程序将无法正常结束。

### 3.4.5 在初始化语句中保存循环状态

初始化部分可以声明多个仅供循环使用的变量：

```go
package main

import "fmt"

func main() {
    text := "hello"

    for i, length := 0, len(text); i < length; i++ {
        fmt.Printf("text[%d] = %c\n", i, text[i])
    }
}
```

运行结果：

```text
text[0] = h
text[1] = e
text[2] = l
text[3] = l
text[4] = o
```

变量 `i` 和 `length` 都只在循环范围内有效。

是否需要提前保存 `len(text)`，应根据代码可读性和实际计算成本决定。对于数组、切片和字符串，调用内置函数 `len` 通常非常直接，不需要机械地将所有计算都移入初始化语句。

### 3.4.6 嵌套循环

一个 `for` 循环内部可以继续编写另一个 `for` 循环。

例如，输出九九乘法表：

```go
package main

import "fmt"

func main() {
    for row := 1; row <= 9; row++ {
        for column := 1; column <= row; column++ {
            fmt.Printf(
                "%d×%d=%-2d ",
                column,
                row,
                column*row,
            )
        }

        fmt.Println()
    }
}
```

外层循环控制行数，内层循环控制每一行中的内容。

嵌套循环常见于：

- 遍历二维数据；
- 生成组合；
- 矩阵计算；
- 搜索多层结构。

嵌套层级过深会降低可读性，可以考虑拆分函数或重新设计数据处理方式。

### 3.4.7 循环中的常见问题

#### 3.4.7.1 边界条件错误

下面的循环会访问不存在的元素：

```go
numbers := []int{10, 20, 30}

for i := 0; i <= len(numbers); i++ {
    fmt.Println(numbers[i])
}
```

合法索引为 `0` 到 `len(numbers)-1`，因此条件应写成：

```go
for i := 0; i < len(numbers); i++ {
    fmt.Println(numbers[i])
}
```

#### 3.4.7.2 忘记更新循环变量

```go
i := 0

for i < 10 {
    fmt.Println(i)
}
```

由于 `i` 始终不变，循环不会结束。

正确写法：

```go
i := 0

for i < 10 {
    fmt.Println(i)
    i++
}
```

#### 3.4.7.3 在循环体中意外修改计数器

```go
for i := 0; i < 10; i++ {
    i += 2
    fmt.Println(i)
}
```

这种写法同时在循环体和后置语句中修改 `i`，容易造成难以理解的执行结果。应当尽量让计数变量只在循环结构的固定位置更新。

------

## 3.5 使用 range 遍历数据

`range` 与 `for` 配合使用，用于依次遍历数据中的元素。

基本语法如下：

```go
for 索引, 元素 := range 数据 {
    // 使用索引和元素
}
```

不同数据类型产生的迭代值不同。

| 被遍历的数据         | 第一个值           | 第二个值                |
| -------------------- | ------------------ | ----------------------- |
| 数组、数组指针、切片 | 元素索引           | 元素值                  |
| 字符串               | UTF-8 字节起始索引 | Unicode 字符，即 `rune` |
| Map                  | 键                 | 值                      |
| Channel              | 接收到的元素       | 无                      |
| 整数                 | 从 `0` 开始的整数  | 无                      |
| 迭代器函数           | 由函数签名决定     | 由函数签名决定          |

传统的 `range` 可以遍历数组、切片、字符串、Map 和 Channel。Go 1.22 增加了整数遍历，Go 1.23 增加了迭代器函数遍历。

### 3.5.1 遍历数组和切片

例如：

```go
package main

import "fmt"

func main() {
    numbers := []int{10, 20, 30}

    for index, value := range numbers {
        fmt.Printf(
            "索引：%d，元素：%d\n",
            index,
            value,
        )
    }
}
```

运行结果：

```text
索引：0，元素：10
索引：1，元素：20
索引：2，元素：30
```

其中：

- `index` 是当前元素的索引；
- `value` 是当前元素值的副本。

### 3.5.2 忽略不需要的迭代值

只需要索引时，可以省略第二个变量：

```go
for index := range numbers {
    fmt.Println(index)
}
```

只需要元素值时，可以使用空白标识符 `_` 忽略索引：

```go
for _, value := range numbers {
    fmt.Println(value)
}
```

既不需要索引，也不需要值，只需要按照数据长度执行相应次数时，可以写成：

```go
for range numbers {
    fmt.Println("执行一次")
}
```

### 3.5.3 range 中的元素值是副本

在数组或切片遍历中，第二个迭代变量接收到的是元素值的副本。

因此，修改迭代变量不会修改原数据：

```go
package main

import "fmt"

func main() {
    numbers := []int{1, 2, 3}

    for _, value := range numbers {
        value *= 10
    }

    fmt.Println(numbers)
}
```

运行结果：

```text
[1 2 3]
```

如果需要修改切片中的元素，应当使用索引：

```go
package main

import "fmt"

func main() {
    numbers := []int{1, 2, 3}

    for index := range numbers {
        numbers[index] *= 10
    }

    fmt.Println(numbers)
}
```

运行结果：

```text
[10 20 30]
```

不要将“迭代变量是副本”错误理解为“整个切片的底层数据都会被复制”。`range` 保存的是切片描述信息，切片仍然指向原来的底层数组。

### 3.5.4 遍历字符串

字符串的 `range` 遍历按照 Unicode 码点进行，而不是简单地逐字节读取。

第一个返回值是字符在 UTF-8 字符串中的起始字节索引，第二个返回值是 `rune` 类型的 Unicode 码点。

例如：

```go
package main

import "fmt"

func main() {
    text := "Go语言"

    for index, char := range text {
        fmt.Printf(
            "字节索引：%d，字符：%c\n",
            index,
            char,
        )
    }
}
```

运行结果：

```text
字节索引：0，字符：G
字节索引：1，字符：o
字节索引：2，字符：语
字节索引：5，字符：言
```

中文字符在 UTF-8 中通常占用多个字节，因此索引不一定连续递增 `1`。

需要逐字节处理字符串时，可以使用普通索引循环：

```go
for i := 0; i < len(text); i++ {
    fmt.Println(text[i])
}
```

需要逐个 Unicode 字符处理字符串时，应当使用 `range`。

### 3.5.5 遍历 Map

遍历 Map 时，`range` 返回键和值：

```go
package main

import "fmt"

func main() {
    scores := map[string]int{
        "Alice": 90,
        "Bob":   85,
        "Carol": 96,
    }

    for name, score := range scores {
        fmt.Printf("%s：%d\n", name, score)
    }
}
```

Map 的遍历顺序没有定义，同一个程序多次运行时，输出顺序可能不同。不能依赖 `range` 遍历 Map 时的键顺序。

如果需要固定顺序，应当先提取键并排序：

```go
package main

import (
    "fmt"
    "sort"
)

func main() {
    scores := map[string]int{
        "Alice": 90,
        "Bob":   85,
        "Carol": 96,
    }

    names := make([]string, 0, len(scores))

    for name := range scores {
        names = append(names, name)
    }

    sort.Strings(names)

    for _, name := range names {
        fmt.Printf("%s：%d\n", name, scores[name])
    }
}
```

### 3.5.6 遍历 Channel

对 Channel 使用 `range`，会不断接收其中的数据，直到该 Channel 被关闭。

```go
package main

import "fmt"

func main() {
    ch := make(chan int)

    go func() {
        for i := 1; i <= 3; i++ {
            ch <- i
        }

        close(ch)
    }()

    for value := range ch {
        fmt.Println(value)
    }
}
```

运行结果：

```text
1
2
3
```

如果发送方没有关闭 Channel，接收方在读取完现有数据后仍会继续等待，可能造成程序阻塞。

对 `nil` Channel 使用 `range` 会永久阻塞。

### 3.5.7 遍历整数

从 Go 1.22 开始，可以直接对整数使用 `range`：

```go
package main

import "fmt"

func main() {
    for i := range 5 {
        fmt.Println(i)
    }
}
```

运行结果：

```text
0
1
2
3
4
```

`range n` 会依次产生从 `0` 到 `n-1` 的整数。

如果不需要当前整数，只需要执行固定次数，可以写成：

```go
for range 5 {
    fmt.Println("执行一次")
}
```

当整数小于或等于 `0` 时，循环不会执行。整数 `range` 要求项目使用 Go 1.22 或更高版本。

### 3.5.8 range 表达式的求值规则

通常情况下，`range` 右侧的表达式会在循环开始前求值一次。

例如：

```go
numbers := []int{1, 2, 3, 4, 5}

for index, value := range numbers {
    if index == 0 {
        numbers = numbers[:3]
    }

    fmt.Println(index, value)
}
```

虽然循环体中将 `numbers` 缩短到了三个元素，但本次循环通常仍然按照进入循环时保存的切片长度继续迭代。

对不同数据类型，应当分别理解其行为：

- 遍历数组值时，数组值会作为表达式结果被复制；
- 遍历数组指针时，不会复制整个数组；
- 遍历切片时，复制的是切片描述信息，底层数组仍然共享；
- 第二个迭代变量保存的是当前元素值的副本；
- 遍历 Map 时，顺序没有定义；
- 遍历 Channel 时，会持续接收数据直到 Channel 关闭。

因此，不能简单认为“`range` 会复制对象”，应当根据具体数据类型区分。

### 3.5.9 Go 1.22 之后的循环变量

使用 `:=` 在循环中声明迭代变量时，从 Go 1.22 开始，每一轮迭代都有各自的循环变量。

例如：

```go
functions := make([]func(), 0)

for _, value := range []int{10, 20, 30} {
    functions = append(functions, func() {
        fmt.Println(value)
    })
}

for _, function := range functions {
    function()
}
```

在 Go 1.22 及更高语言版本中，输出为：

```text
10
20
30
```

旧版本中，循环变量可能被多次迭代共享，从而导致闭包最终读取到同一个值。Go 1.22 修改了这一语义，使每轮迭代拥有独立变量。

### 3.5.10 普通 for 和 for range 的选择

两者不是谁替代谁，而是适合不同场景。

使用普通 `for` 的典型情况：

- 需要倒序遍历；
- 需要自定义步长；
- 需要同时控制多个变量；
- 需要精确控制索引变化；
- 不希望遍历所有元素。

例如，倒序遍历：

```go
for i := len(numbers) - 1; i >= 0; i-- {
    fmt.Println(numbers[i])
}
```

使用 `for range` 的典型情况：

- 依次遍历数组或切片；
- 遍历字符串中的 Unicode 字符；
- 遍历 Map 的键和值；
- 持续接收 Channel 数据；
- 不需要复杂控制遍历顺序。

代码中应根据实际语义选择，而不是认为 `for range` 能完全取代普通 `for`。

------

## 3.6 流程跳转：break、continue 与 goto

Go 提供了几种改变正常执行顺序的语句：

- `break`：结束循环、`switch` 或 `select`；
- `continue`：跳过当前循环的剩余部分，开始下一轮循环；
- `goto`：跳转到当前函数中的指定标签；
- `fallthrough`：继续执行普通 `switch` 的下一个分支。

其中，`goto` 并不是循环控制语句，`break` 也不只用于循环。因此，本节标题不应写成“循环控制 Goto、Break、Continue”。

### 3.6.1 break：结束当前控制结构

在循环中，`break` 用于立即结束最内层循环：

```go
package main

import "fmt"

func main() {
    for i := 0; i < 10; i++ {
        if i == 4 {
            break
        }

        fmt.Println(i)
    }

    fmt.Println("循环结束")
}
```

运行结果：

```text
0
1
2
3
循环结束
```

`break` 不仅可以结束 `for`，还可以结束最内层的 `switch` 或 `select`。

需要注意，在 `switch` 的普通 `case` 末尾通常不需要手动编写 `break`。只有需要提前退出当前分支中的某些代码时，才可能显式使用。

### 3.6.2 continue：进入下一轮循环

`continue` 用于结束当前这一轮循环，直接开始下一轮：

```go
package main

import "fmt"

func main() {
    for i := 0; i < 6; i++ {
        if i%2 == 0 {
            continue
        }

        fmt.Println(i)
    }
}
```

运行结果：

```text
1
3
5
```

当 `i` 为偶数时，程序执行 `continue`，因此本轮循环后面的 `fmt.Println` 不会被执行。

`continue` 只能用于 `for` 循环，不能用于普通的 `switch` 或 `select`。

### 3.6.3 在嵌套循环中使用标签

默认情况下，`break` 和 `continue` 只作用于最内层控制结构。

例如：

```go
for i := 0; i < 3; i++ {
    for j := 0; j < 3; j++ {
        if j == 1 {
            break
        }

        fmt.Println(i, j)
    }
}
```

这里的 `break` 只会结束内层循环。

如果需要直接结束外层循环，可以使用标签：

```go
package main

import "fmt"

func main() {
OuterLoop:
    for i := 0; i < 3; i++ {
        for j := 0; j < 3; j++ {
            if i == 1 && j == 1 {
                break OuterLoop
            }

            fmt.Println(i, j)
        }
    }

    fmt.Println("循环结束")
}
```

运行结果：

```text
0 0
0 1
0 2
1 0
循环结束
```

标签写在目标语句前面：

```go
标签名:
    语句
```

带标签的 `break` 可以结束指定的外层 `for`、`switch` 或 `select`。

### 3.6.4 带标签的 continue

`continue` 也可以配合标签使用，直接开始指定外层循环的下一轮：

```go
package main

import "fmt"

func main() {
    matrix := [][]int{
        {1, 2, 3},
        {4, -1, 6},
        {7, 8, 9},
    }

RowLoop:
    for rowIndex, row := range matrix {
        for _, value := range row {
            if value < 0 {
                fmt.Printf(
                    "第 %d 行包含无效数据\n",
                    rowIndex,
                )
                continue RowLoop
            }
        }

        fmt.Printf("第 %d 行数据有效\n", rowIndex)
    }
}
```

运行结果：

```text
第 0 行数据有效
第 1 行包含无效数据
第 2 行数据有效
```

带标签的 `continue` 所引用的标签必须标记一个外层 `for` 循环。

### 3.6.5 goto：跳转到指定标签

`goto` 可以将程序执行位置跳转到当前函数内的指定标签：

```go
package main

import "fmt"

func main() {
    count := 0

Start:
    fmt.Println(count)
    count++

    if count < 3 {
        goto Start
    }
}
```

运行结果：

```text
0
1
2
```

`goto` 只能跳转到同一个函数中的标签，不能跨函数跳转。

此外，`goto` 不能跳过局部变量声明，使程序直接进入该变量的作用域。例如，下面的代码不能通过编译：

```go
goto End

value := 10

End:
fmt.Println("结束")
```

跳转到 `End` 会越过 `value` 的声明，因此违反 Go 的作用域规则。`goto` 也不能从代码块外部直接跳入代码块内部。

现代 Go 代码很少需要 `goto`。多数情况下可以使用以下方式代替：

- 函数拆分；
- 提前 `return`；
- `break`；
- `continue`；
- `defer` 清理资源。

### 3.6.6 标签的使用规则

标签是区分大小写的标识符：

```go
OuterLoop:
```

与：

```go
outerLoop:
```

是两个不同的标签。

标签的作用域是当前函数体，但不包括嵌套函数。已经声明的标签必须被 `goto`、`break` 或 `continue` 使用，否则会产生编译错误。

不应为了普通单层循环随意添加标签。标签主要用于：

- 退出多层循环；
- 跳过外层循环的当前迭代；
- 少数需要集中处理流程的底层代码。

### 3.6.7 几种流程控制语句的区别

| 语句          | 主要作用               | 可以使用的位置            |
| ------------- | ---------------------- | ------------------------- |
| `break`       | 结束指定控制结构       | `for`、`switch`、`select` |
| `continue`    | 开始下一轮循环         | `for`                     |
| `goto`        | 跳转到当前函数中的标签 | 当前函数内                |
| `fallthrough` | 执行下一个 `case`      | 普通表达式 `switch`       |

使用时应优先选择能够直接表达程序意图的语句：

- 结束循环使用 `break`；
- 跳过本轮循环使用 `continue`；
- 退出函数使用 `return`；
- 只有普通结构难以清晰表达流程时，才考虑 `goto`。

## 总结

Go 中常见的流程控制结构如下：

```go
// 多分支选择
switch value {
case value1:
case value2:
default:
}

// Channel 通信选择
select {
case value := <-ch:
case ch <- value:
default:
}

// 计数循环
for i := 0; i < 10; i++ {
}

// 条件循环
for condition {
}

// 无限循环
for {
}

// 数据遍历
for index, value := range collection {
}

// 结束控制结构
break

// 进入下一轮循环
continue

// 跳转到标签
goto Label
```

编写流程控制代码时，应重点关注以下原则：

- 优先保持控制结构简单；
- 避免过深的条件和循环嵌套；
- 不依赖 Map 的遍历顺序；
- 不在循环中无意义地忙等待；
- 谨慎使用 `fallthrough` 和 `goto`；
- 根据数据类型准确理解 `range` 的迭代结果；
- 将 `select` 用于 Channel 通信，而不是普通条件判断。
