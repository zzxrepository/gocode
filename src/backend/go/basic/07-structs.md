---
permalink: /backend/go/basic/07-structs/
title: 07. 结构体
shortTitle: 07. 结构体
order: 7
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 结构体
  - struct
  - 类型系统
  - 组合
  - struct tag
---

# 07. 结构体

![Go struct 结构体详解封面](/assets/image/go-struct-cover.png)

很多同学上一次接触“结构体”，可能还是在 C 语言里。

到了 Go 里，`struct` 仍然用于把多个相关字段组合成一个整体，但它不是类，也不负责承载传统面向对象语言里的继承体系。Go 的结构体最朴素、也最重要的作用就是：**组织数据**。

比如一个用户有编号、姓名、年龄、地址。如果把这些信息拆成几个变量，变量之间的关系会变得松散；如果使用结构体，就可以把它们作为一个完整的值来声明、传递、复制和保存。

```go
type User struct {
    ID   int
    Name string
    Age  int
}
```

这一节我们先把结构体本身讲扎实。方法、接收者以及结构体如何绑定行为，会放到后续章节中展开。

## 为什么需要结构体

没有结构体时，我们可能会这样保存一个用户：

```go
package main

import "fmt"

func main() {
    id := 1
    name := "Alice"
    age := 20

    // 三个变量描述的是同一个用户，但这种关系只存在于人的理解中。
    fmt.Println(id, name, age)
}
```

代码一多，问题就会出现：

- 相关数据分散在多个变量中；
- 函数参数容易越来越长；
- 传递和返回一组数据不方便；
- 字段含义依赖变量名，缺少统一的类型约束；
- 切片、map 中保存一组对象时不够清晰。

结构体可以把这些字段组合成一个明确的类型：

```go
type User struct {
    ID   int
    Name string
    Age  int
}
```

然后就可以把 `User` 当成一个普通类型使用：

```go
func printUser(user User) {
    // user 是一个完整的结构体值。
    fmt.Printf("ID=%d Name=%s Age=%d\n", user.ID, user.Name, user.Age)
}
```

结构体适合描述“字段固定、含义明确”的数据。比如用户、订单、图书、配置、请求参数、数据库记录，都很适合使用结构体。

## 定义结构体

结构体类型通常使用 `type` 和 `struct` 定义：

```go
type 类型名 struct {
    字段名 字段类型
    字段名 字段类型
}
```

例如：

```go
type Person struct {
    Name string
    City string
    Age  int
}
```

这里：

- `Person` 是结构体类型名；
- `Name`、`City`、`Age` 是字段名；
- 每个字段都有自己的类型；
- 所有字段共同组成一个完整的 `Person` 值。

如果相邻字段类型相同，可以写在同一行：

```go
type Person struct {
    Name, City string
    Age        int
}
```

不过在业务代码中，我更推荐把不同含义的字段分开写。这样更利于阅读，也方便后续给字段添加注释或结构体标签：

```go
type Person struct {
    Name string
    City string
    Age  int
}
```

同一个结构体中字段名不能重复：

```go
type Person struct {
    Name string
    // Name int // 编译错误：字段名重复
}
```

## 声明、零值与字段访问

结构体是普通类型，可以像 `int`、`string` 一样声明变量：

```go
var person Person
```

没有显式初始化时，结构体的每个字段都会得到对应类型的零值：

```go
package main

import "fmt"

type Account struct {
    Name     string
    Age      int
    Enabled  bool
    Tags     []string
    Metadata map[string]string
}

func main() {
    var account Account

    // 每个字段都会使用自己的零值。
    fmt.Println(account.Name)            // ""
    fmt.Println(account.Age)             // 0
    fmt.Println(account.Enabled)         // false
    fmt.Println(account.Tags == nil)     // true
    fmt.Println(account.Metadata == nil) // true
}
```

访问或修改字段时，使用点号选择器：

```go
package main

import "fmt"

type Person struct {
    Name string
    City string
    Age  int
}

func main() {
    var person Person

    // 结构体变量声明后已经可用，不需要特殊的实例化语法。
    person.Name = "Alice"
    person.City = "北京"
    person.Age = 20

    fmt.Println(person.Name)
    fmt.Println(person.City)
    fmt.Println(person.Age)
}
```

这一点和很多面向对象语言不太一样：Go 结构体不要求必须先调用构造函数才能使用。至于零值是否具有业务意义，要看结构体本身的设计。

比如计数器的零值通常可用：

```go
type Counter struct {
    Value int
}
```

但用户名称为空可能就是非法状态：

```go
type User struct {
    Name string
}
```

这种业务约束通常由校验逻辑或构造函数式函数来保证。

## 使用 fmt 输出结构体

调试结构体时，`fmt.Printf` 很常用。

```go
package main

import "fmt"

type Person struct {
    Name string
    Age  int
}

func main() {
    person := Person{
        Name: "Alice",
        Age:  20,
    }

    // %v 输出字段值。
    fmt.Printf("%v\n", person)

    // %+v 输出字段名和字段值，调试时更常用。
    fmt.Printf("%+v\n", person)

    // %#v 输出更接近 Go 语法形式的表示。
    fmt.Printf("%#v\n", person)
}
```

输出类似：

```text
{Alice 20}
{Name:Alice Age:20}
main.Person{Name:"Alice", Age:20}
```

实际开发中，如果只是临时调试，`%+v` 往往最顺手。

## 结构体字面量初始化

结构体字面量可以在创建结构体值时直接给字段赋值。

最推荐的是按字段名初始化：

```go
person := Person{
    Name: "Alice",
    City: "北京",
    Age:  20,
}
```

字段顺序不需要和结构体定义顺序一致：

```go
person := Person{
    Age:  20,
    Name: "Alice",
    City: "北京",
}
```

也可以只初始化部分字段，没写到的字段使用零值：

```go
person := Person{
    Name: "Alice",
}

fmt.Println(person.City) // ""
fmt.Println(person.Age)  // 0
```

结构体字面量也支持省略字段名：

```go
person := Person{
    "Alice",
    "北京",
    20,
}
```

这种写法依赖字段声明顺序，字段多了以后很难读，也容易因为调整字段顺序产生问题。除非是非常小、非常稳定的结构体，否则业务代码里优先使用字段名初始化。

## 结构体是值类型

结构体是值类型。把一个结构体赋值给另一个变量，会复制整个结构体值。

```go
package main

import "fmt"

type Person struct {
    Name string
    Age  int
}

func main() {
    first := Person{
        Name: "Alice",
        Age:  20,
    }

    // second 得到的是 first 的一份副本。
    second := first
    second.Name = "Bob"

    fmt.Println(first.Name)  // Alice
    fmt.Println(second.Name) // Bob
}
```

结构体作为函数参数时也会复制：

```go
package main

import "fmt"

type Person struct {
    Name string
}

func rename(person Person) {
    // 修改的是参数副本，不会影响调用方。
    person.Name = "Bob"
}

func main() {
    person := Person{
        Name: "Alice",
    }

    rename(person)

    fmt.Println(person.Name) // Alice
}
```

### 浅复制不是深复制

结构体赋值会复制每个字段的值，但如果字段本身是切片、map、指针等类型，复制后仍然可能共享底层数据。

```go
package main

import "fmt"

type Team struct {
    Members []string
}

func main() {
    first := Team{
        Members: []string{"Alice", "Bob"},
    }

    // 切片字段被复制，但两个切片值指向同一个底层数组。
    second := first
    second.Members[0] = "Carol"

    fmt.Println(first.Members)  // [Carol Bob]
    fmt.Println(second.Members) // [Carol Bob]
}
```

包含指针字段时也一样：

```go
package main

import "fmt"

type Profile struct {
    Age int
}

type User struct {
    Profile *Profile
}

func main() {
    first := User{
        Profile: &Profile{
            Age: 20,
        },
    }

    // 复制的是指针值，两个 User 指向同一个 Profile。
    second := first
    second.Profile.Age = 21

    fmt.Println(first.Profile.Age) // 21
}
```

所以记住一句话：**结构体赋值会复制字段本身，但不会自动把字段指向的数据也深度复制一份。**

## 结构体指针

如果希望函数修改原结构体，或者结构体较大、不想频繁复制，可以使用结构体指针。

```go
package main

import "fmt"

type Person struct {
    Name string
    Age  int
}

func birthday(person *Person) {
    // Go 允许通过结构体指针直接访问字段。
    person.Age++
}

func main() {
    person := Person{
        Name: "Alice",
        Age:  20,
    }

    birthday(&person)

    fmt.Println(person.Age) // 21
}
```

理论上，通过指针访问字段可以写成：

```go
(*pointer).Age = 21
```

但 Go 会自动解引用，所以通常直接写：

```go
pointer.Age = 21
```

也可以直接创建结构体指针：

```go
person := &Person{
    Name: "Alice",
    Age:  20,
}
```

`new` 也可以创建结构体零值并返回指针：

```go
person := new(Person)
```

它接近于：

```go
person := &Person{}
```

实际代码中，`&Person{...}` 更常见，因为它既能得到指针，又能清楚地初始化字段。

## 匿名结构体

如果某个结构只在局部使用一次，不一定要单独定义命名类型，可以使用匿名结构体。

```go
package main

import "fmt"

func main() {
    user := struct {
        Name string
        Age  int
    }{
        Name: "Alice",
        Age:  20,
    }

    // 匿名结构体适合一次性、小范围的数据组织。
    fmt.Printf("%+v\n", user)
}
```

匿名结构体常见于表驱动测试：

```go
tests := []struct {
    Name     string
    Input    int
    Expected int
}{
    {
        Name:     "正数",
        Input:    2,
        Expected: 4,
    },
    {
        Name:     "零",
        Input:    0,
        Expected: 0,
    },
}
```

这里不必急着为测试用例定义一个 `TestCase` 类型，因为它只在当前测试里使用。

## 构造函数式函数

Go 没有语言级构造函数，但可以使用普通函数封装结构体创建过程。

```go
package main

import (
    "errors"
    "fmt"
)

type User struct {
    ID   int
    Name string
    Age  int
}

func NewUser(id int, name string, age int) (*User, error) {
    if id <= 0 {
        return nil, errors.New("用户 ID 必须大于 0")
    }

    if name == "" {
        return nil, errors.New("用户名不能为空")
    }

    if age < 0 {
        return nil, errors.New("年龄不能小于 0")
    }

    // NewUser 只是普通函数，不是 Go 自动调用的特殊语法。
    return &User{
        ID:   id,
        Name: name,
        Age:  age,
    }, nil
}

func main() {
    user, err := NewUser(1, "Alice", 20)
    if err != nil {
        fmt.Println("创建用户失败：", err)
        return
    }

    fmt.Printf("%+v\n", user)
}
```

构造函数式函数适合这些场景：

- 创建时需要校验参数；
- 某些字段必须初始化；
- 初始化步骤比较复杂；
- 需要隐藏未导出字段；
- 希望返回接口或指针；
- 结构体零值不能直接代表有效对象。

但不要把它理解成规则：结构体不是必须通过 `NewXxx` 创建。很多结构体直接用字面量初始化更简单。

## 嵌套结构体

结构体字段本身也可以是另一个结构体。

```go
package main

import "fmt"

type Address struct {
    Province string
    City     string
}

type User struct {
    Name    string
    Address Address
}

func main() {
    user := User{
        Name: "Alice",
        Address: Address{
            Province: "黑龙江",
            City:     "哈尔滨",
        },
    }

    // 命名字段嵌套有清晰的层级关系。
    fmt.Println(user.Address.Province)
    fmt.Println(user.Address.City)
}
```

这种写法表达的是：`User` 有一个名为 `Address` 的字段。层次清楚，适合大多数业务场景。

## 嵌入字段

结构体字段也可以只写类型，不显式写字段名。这种字段叫嵌入字段。

```go
package main

import "fmt"

type Address struct {
    Province string
    City     string
}

type User struct {
    Name string
    Address
}

func main() {
    user := User{
        Name: "Alice",
        Address: Address{
            Province: "黑龙江",
            City:     "哈尔滨",
        },
    }

    // 完整路径依然可用。
    fmt.Println(user.Address.City)

    // 嵌入字段的字段会被提升，因此可以简写。
    fmt.Println(user.City)
}
```

注意，初始化时不能直接写被提升的字段：

```go
user := User{
    Name: "Alice",
    Address: Address{
        City: "哈尔滨",
    },
}
```

不能写成：

```go
// 编译错误：City 不是 User 直接声明的字段。
// user := User{
//     Name: "Alice",
//     City: "哈尔滨",
// }
```

字段提升只是选择器语法上的便利，不是真的把 `Address.City` 复制成了 `User.City`。

嵌入字段也可以是指针：

```go
type User struct {
    Name string
    *Address
}
```

使用指针嵌入时要特别注意 `nil`：

```go
var user User

// user.Address 还是 nil，直接访问 user.City 会发生运行时错误。
if user.Address != nil {
    fmt.Println(user.City)
}
```

## 字段提升与冲突

字段提升让代码更短，但也会带来名称冲突问题。

先看外层字段优先：

```go
package main

import "fmt"

type Person struct {
    Name string
}

type Student struct {
    Person
    Name string
}

func main() {
    student := Student{
        Person: Person{
            Name: "内层姓名",
        },
        Name: "外层姓名",
    }

    // 外层字段优先。
    fmt.Println(student.Name)        // 外层姓名
    fmt.Println(student.Person.Name) // 内层姓名
}
```

再看同一层级冲突：

```go
type Address struct {
    CreateTime string
}

type Email struct {
    CreateTime string
}

type User struct {
    Address
    Email
}

func main() {
    var user User

    // 编译错误：CreateTime 来自两个同层嵌入字段，选择器有歧义。
    // user.CreateTime = "2026-01-01"

    // 正确做法是明确写出完整路径。
    user.Address.CreateTime = "2026-01-01"
    user.Email.CreateTime = "2026-02-01"
}
```

遇到冲突时，不要靠猜，直接写完整路径。

## 组合不是继承

结构体嵌入看起来有点像继承，但 Go 更强调组合。

```go
package main

import "fmt"

type Animal struct {
    Name string
}

type Dog struct {
    Animal
    Feet int
}

func printAnimal(animal Animal) {
    fmt.Println(animal.Name)
}

func main() {
    dog := Dog{
        Animal: Animal{
            Name: "旺财",
        },
        Feet: 4,
    }

    // 字段提升让 dog.Name 可用。
    fmt.Println(dog.Name)

    // Dog 不是 Animal，不能直接当成 Animal 传入。
    // printAnimal(dog)

    // 需要显式传入其中的 Animal 字段。
    printAnimal(dog.Animal)
}
```

更准确的理解是：`Dog` 包含一个 `Animal`，不是 `Dog` 继承了 `Animal`。

这个区别很重要。Go 的代码通常通过组合复用字段和行为，通过接口表达能力，而不是通过类继承组织类型层次。

## 字段可见性

Go 的可见性由标识符首字母决定：

- 首字母大写：已导出，包外可访问；
- 首字母小写：未导出，只能在当前包内访问。

结构体字段也遵守这个规则。

```go
package user

type User struct {
    ID   int
    Name string

    // password 只能在 user 包内部访问。
    password string
}
```

在其他包中：

```go
package main

import "example.com/project/user"

func main() {
    u := user.User{
        ID:   1,
        Name: "Alice",

        // 编译错误：不能在包外设置未导出字段。
        // password: "secret",
    }

    // 编译错误：不能在包外访问未导出字段。
    // fmt.Println(u.password)

    _ = u
}
```

这里不要简单套用“公有字段”和“私有字段”的说法，因为 Go 的边界是包，不是类。

## struct tag 的声明语法

结构体字段后面可以跟结构体标签，也就是 struct tag。

```go
type User struct {
    ID       int    `json:"id"`
    Name     string `json:"name"`
    Email    string `json:"email,omitempty"`
    Password string `json:"-"`
}
```

标签使用反引号包围，通常由反射或相关库读取。标签本身不会自动产生效果。

以 JSON 标签为例：

- `json:"id"` 表示 JSON 字段名为 `id`；
- `json:"email,omitempty"` 表示字段为零值时可以省略；
- `json:"-"` 表示编码和解码时忽略该字段。

完整示例：

```go
package main

import (
    "encoding/json"
    "fmt"
)

type User struct {
    ID       int    `json:"id"`
    Name     string `json:"name"`
    Email    string `json:"email,omitempty"`
    Password string `json:"-"`
    age      int
}

func main() {
    user := User{
        ID:       1,
        Name:     "Alice",
        Password: "secret",
        age:      20,
    }

    data, err := json.Marshal(user)
    if err != nil {
        fmt.Println("JSON 编码失败：", err)
        return
    }

    // Password 被 json:"-" 忽略，age 未导出，也不会被 JSON 包直接处理。
    fmt.Println(string(data))
}
```

输出：

```json
{"id":1,"name":"Alice"}
```

标签写错不一定导致编译错误，但库可能读不到你想表达的元信息。写标签时要注意反引号、冒号、双引号和逗号的位置。

## 结构体比较

如果结构体的所有字段都可以比较，那么结构体也可以使用 `==` 和 `!=` 比较。

```go
package main

import "fmt"

type Point struct {
    X int
    Y int
}

func main() {
    first := Point{
        X: 10,
        Y: 20,
    }

    second := Point{
        X: 10,
        Y: 20,
    }

    // 所有字段都相等，因此两个结构体值相等。
    fmt.Println(first == second) // true
}
```

如果结构体包含切片、map、函数等不可比较字段，整个结构体就不能直接比较：

```go
type Team struct {
    Members []string
}

func main() {
    first := Team{
        Members: []string{"Alice"},
    }

    second := Team{
        Members: []string{"Alice"},
    }

    // 编译错误：Team 包含不可比较的切片字段。
    // fmt.Println(first == second)

    _, _ = first, second
}
```

可比较的结构体还可以作为 map 的键：

```go
type Coordinate struct {
    X int
    Y int
}

visited := map[Coordinate]bool{
    {X: 1, Y: 2}: true,
}
```

如果要比较包含切片、map 的复杂结构体，通常需要写明确的比较逻辑，或者使用测试场景中的辅助工具。

## 内存布局一笔带过

结构体字段通常按照声明顺序排列，但字段之间可能为了内存对齐插入填充空间。

```go
type LayoutA struct {
    Flag  bool
    Count int64
    Code  byte
}

type LayoutB struct {
    Count int64
    Flag  bool
    Code  byte
}
```

这两个结构体字段相同，但顺序不同，在某些平台上占用空间可能不同。可以用 `unsafe.Sizeof` 查看：

```go
package main

import (
    "fmt"
    "unsafe"
)

type LayoutA struct {
    Flag  bool
    Count int64
    Code  byte
}

type LayoutB struct {
    Count int64
    Flag  bool
    Code  byte
}

func main() {
    // 输出结果和平台、类型大小、对齐规则有关。
    fmt.Println(unsafe.Sizeof(LayoutA{}))
    fmt.Println(unsafe.Sizeof(LayoutB{}))
}
```

基础阶段不用过度纠结内存布局。除非你正在处理大量对象、二进制协议或极端性能问题，否则优先让字段顺序表达清楚的业务含义。

## 结构体切片

切片的元素可以是结构体。

```go
package main

import "fmt"

type Student struct {
    ID   int
    Name string
    Age  int
}

func birthday(students []Student) {
    // 切片按值传递，但副本仍然指向同一个底层数组。
    students[0].Age++
}

func main() {
    students := []Student{
        {
            ID:   1,
            Name: "Alice",
            Age:  20,
        },
        {
            ID:   2,
            Name: "Bob",
            Age:  21,
        },
    }

    fmt.Println(students[0].Name)

    // 可以通过索引直接修改切片中的结构体元素。
    students[1].Age = 22

    birthday(students)

    fmt.Println(students[0].Age) // 21
    fmt.Println(students[1].Age) // 22
}
```

如果函数里需要追加元素，通常返回新的切片：

```go
func addStudent(students []Student, student Student) []Student {
    // append 可能分配新的底层数组，因此把结果返回给调用方。
    return append(students, student)
}
```

调用：

```go
students = addStudent(students, Student{
    ID:   3,
    Name: "Carol",
    Age:  22,
})
```

## map 中保存结构体

map 的值可以是结构体。

```go
type Student struct {
    ID   int
    Name string
    Age  int
}

students := map[int]Student{
    1: {
        ID:   1,
        Name: "Alice",
        Age:  20,
    },
}
```

读取没问题：

```go
student := students[1]
fmt.Println(student.Name)
```

但是不能直接修改 map 元素里的结构体字段：

```go
// 编译错误：map 元素不可寻址。
// students[1].Age = 21
```

正确做法是先取出，修改后再写回：

```go
student := students[1]
student.Age = 21
students[1] = student
```

另一种方式是让 map 保存结构体指针：

```go
students := map[int]*Student{
    1: {
        ID:   1,
        Name: "Alice",
        Age:  20,
    },
}

// 此时修改的是指针指向的结构体。
students[1].Age = 21
```

保存指针时要注意键不存在和 `nil` 指针：

```go
student, ok := students[1]
if !ok || student == nil {
    fmt.Println("学生不存在")
    return
}

student.Age++
```

## range 取地址常见坑

遍历结构体切片时，很多同学会想顺手建立一个索引：

```go
type Student struct {
    ID   int
    Name string
    Age  int
}

students := []Student{
    {
        ID:   1,
        Name: "Alice",
        Age:  20,
    },
    {
        ID:   2,
        Name: "Bob",
        Age:  21,
    },
}
```

容易写出这样的代码：

```go
index := make(map[string]*Student)

for _, student := range students {
    // student 是循环变量，它是切片元素的一份副本。
    index[student.Name] = &student
}
```

从 Go 1.22 开始，使用 `:=` 声明的 range 循环变量每次迭代会创建新的变量，旧版本里“所有地址都指向同一个循环变量”的问题已经缓解。

但这段代码仍然不是我们想要的效果：`&student` 指向的是副本，不是原切片元素。你修改 `index["Alice"]` 指向的结构体，不一定会改到 `students[0]`。

如果目标是保存原切片元素地址，应该用索引：

```go
index := make(map[string]*Student)

for i := range students {
    // &students[i] 才是原切片元素的地址。
    index[students[i].Name] = &students[i]
}

index["Alice"].Age = 30

fmt.Println(students[0].Age) // 30
```

这条规则很实用：**要拿切片元素本身的地址，就通过索引拿。**

## 结构体与方法的关系

结构体主要负责组织数据。Go 还允许我们为自定义类型定义方法，让某个类型拥有相关行为。

```go
type Person struct {
    Name string
    Age  int
}

func (person Person) Introduce() {
    fmt.Printf("我叫 %s，今年 %d 岁\n", person.Name, person.Age)
}
```

不过方法会引出接收者、值接收者、指针接收者、方法集、接口实现、嵌入后的方法提升等内容。这些知识最好放在一起讲，否则很容易零散。

所以本节只需要先记住：

> 结构体用于组织数据，方法可以为结构体类型定义相关行为。

方法本身我们会在后续章节单独展开。

## 综合示例

下面这个例子把本节常用知识串起来：结构体定义、字段标签、嵌套与嵌入、构造函数式函数、结构体切片、map 索引、JSON 输出。

```go
package main

import (
    "encoding/json"
    "errors"
    "fmt"
)

type Address struct {
    Province string `json:"province"`
    City     string `json:"city"`
}

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email,omitempty"`

    // Address 是嵌入字段，Province 和 City 可以被提升访问。
    Address
}

func NewUser(id int, name string, email string, address Address) (*User, error) {
    if id <= 0 {
        return nil, errors.New("用户 ID 必须大于 0")
    }

    if name == "" {
        return nil, errors.New("用户名不能为空")
    }

    return &User{
        ID:      id,
        Name:    name,
        Email:   email,
        Address: address,
    }, nil
}

func main() {
    first, err := NewUser(
        1,
        "Alice",
        "alice@example.com",
        Address{
            Province: "黑龙江",
            City:     "哈尔滨",
        },
    )
    if err != nil {
        fmt.Println("创建用户失败：", err)
        return
    }

    second := User{
        ID:   2,
        Name: "Bob",
        Address: Address{
            Province: "广东",
            City:     "深圳",
        },
    }

    users := []User{
        *first,
        second,
    }

    // 通过索引修改结构体切片中的元素。
    users[1].City = "广州"

    index := make(map[int]*User)
    for i := range users {
        // 保存原切片元素地址，而不是 range 变量副本的地址。
        index[users[i].ID] = &users[i]
    }

    if user, ok := index[1]; ok {
        user.City = "北京"
    }

    data, err := json.MarshalIndent(users, "", "  ")
    if err != nil {
        fmt.Println("JSON 编码失败：", err)
        return
    }

    fmt.Println(string(data))
}
```

输出类似：

```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "province": "黑龙江",
    "city": "北京"
  },
  {
    "id": 2,
    "name": "Bob",
    "province": "广东",
    "city": "广州"
  }
]
```

这个例子里要留意几件事：

- `User` 嵌入了 `Address`，所以可以写 `users[1].City`；
- 初始化嵌入字段时仍然要写 `Address: Address{...}`；
- `NewUser` 是普通函数，用于封装校验和创建过程；
- `users` 是结构体切片，可以通过索引修改元素；
- `index` 保存的是切片元素地址；
- JSON 包会读取已导出字段和 `json` 标签。

## 练习

### 练习一：定义图书结构体

定义一个 `Book` 结构体，包含：

- 编号；
- 书名；
- 作者；
- 价格。

参考：

```go
type Book struct {
    ID     int
    Title  string
    Author string
    Price  float64
}
```

使用字段名形式创建一个 `Book` 值，并用 `%+v` 输出。

### 练习二：观察结构体复制

创建一个 `Person` 结构体，将它赋值给另一个变量，然后修改副本的姓名，观察原变量是否变化。

再给结构体加一个 `[]string` 字段，观察切片字段在复制后是否共享底层数据。

### 练习三：嵌套结构体

定义：

```go
type Address struct {
    Province string
    City     string
}

type Company struct {
    Name    string
    Address Address
}
```

创建一个 `Company` 值，并输出它所在的城市。

### 练习四：结构体嵌入

把上一个练习中的 `Company` 改成嵌入字段：

```go
type Company struct {
    Name string
    Address
}
```

分别用下面两种形式访问城市：

```go
company.Address.City
company.City
```

### 练习五：map 中修改结构体

创建一个 `map[int]Student`，添加两个学生，然后修改其中一个学生的年龄。

要求分别实现两种写法：

- 取出结构体，修改后写回；
- 把 map 的值改成 `*Student`，直接修改指针指向的结构体。

### 练习六：建立学生索引

已知：

```go
students := []Student{
    {
        ID:   1,
        Name: "Alice",
        Age:  20,
    },
    {
        ID:   2,
        Name: "Bob",
        Age:  21,
    },
}
```

创建一个 `map[string]*Student`，以姓名作为键，保存原切片元素的地址。要求修改索引中的学生年龄后，原切片中的年龄也发生变化。

参考思路：

```go
index := make(map[string]*Student)

for i := range students {
    index[students[i].Name] = &students[i]
}
```

## 总结

这一节我们集中学习了 Go 的结构体。

结构体最核心的作用是把多个相关字段组织成一个完整的数据值。它不是类，也不提供传统继承。Go 更偏向使用结构体组织数据，用嵌入实现组合，用接口表达能力。

学习结构体时，重点记住这些规则：

- 结构体字段可以有不同类型；
- 声明结构体变量后，每个字段都会获得对应类型的零值；
- 字段通过 `.` 访问，结构体指针也可以直接用 `pointer.Field`；
- 推荐使用字段名形式的结构体字面量初始化；
- 结构体是值类型，赋值和传参会复制结构体；
- 结构体复制是浅复制，切片、map、指针字段可能共享底层数据；
- 匿名结构体适合一次性、小范围的数据组织；
- 构造函数式函数只是普通函数，适合封装校验和复杂初始化；
- 嵌套字段强调清晰层级，嵌入字段强调组合和字段提升；
- 字段提升遇到冲突时，要明确写完整路径；
- 结构体嵌入不是继承；
- 字段首字母大小写决定包级可见性；
- struct tag 是字段元信息，需要由相关库读取；
- 只有所有字段都可比较时，结构体才可比较；
- map 中保存结构体值时，不能直接修改字段；
- range 中要取得原切片元素地址，应使用索引。

下一节我们学习指针。理解指针之后，再回头看结构体指针、map 保存结构体指针、指针接收者，就会顺很多。
