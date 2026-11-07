---
permalink: /backend/go/basic/10-interfaces/
title: 12. 接口（Interface）
shortTitle: 12. 接口（Interface）
order: 12
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 接口
  - interface
  - 隐式实现
  - 空接口
  - 类型断言
---

# 12. 接口（Interface）

## 前言

接口用方法集合描述行为，使调用方可以处理不同的具体类型。理解接口需要掌握隐式实现、方法集、接口值与 `nil` 的关系，以及类型断言和类型选择。

## 12.1 接口基础

接口是一种描述行为的类型。

结构体通常描述一个值包含哪些数据，而接口描述一个值能够完成哪些操作。

例如：

- 文件、网络连接和缓冲区都可能具有读取能力；
- 猫、狗和人都可能具有发出声音的能力；
- 不同数据库实现都可能具有查询能力。

调用方通常不需要知道对象内部有哪些字段，只需要确认它提供了所需方法。

这里讨论可以作为普通值使用的基本接口。泛型约束中包含类型项的非基本接口只能用作类型约束，不能作为普通变量的类型。

### 12.1.1 为什么需要接口

假设有猫和狗两个类型：

```go
type Cat struct{}

func (Cat) Speak() string {
    return "喵喵喵"
}

type Dog struct{}

func (Dog) Speak() string {
    return "汪汪汪"
}
```

它们的数据结构不同，但都具有：

```go
Speak() string
```

可以定义接口描述这一共同能力：

```go
type Speaker interface {
    Speak() string
}
```

然后编写只依赖行为的函数：

```go
func PrintSound(speaker Speaker) {
    fmt.Println(speaker.Speak())
}
```

调用：

```go
PrintSound(Cat{})
PrintSound(Dog{})
```

`PrintSound` 不需要判断参数到底是猫还是狗，只要求它具有 `Speak` 方法。

接口让调用方依赖行为，而不是依赖具体实现。

---

### 12.1.2 定义接口

接口的基本语法如下：

```go
type 接口名 interface {
    方法名(参数列表) 返回值列表
}
```

例如：

```go
type Writer interface {
    Write(data []byte) (int, error)
}
```

接口中的方法只有签名，没有方法体。

参数名称可以省略：

```go
type Writer interface {
    Write([]byte) (int, error)
}
```

下面的接口表示一个能够关闭资源的值：

```go
type Closer interface {
    Close() error
}
```

基本接口只包含方法或嵌入的其他基本接口，不包含普通数据字段。

---

### 12.1.3 接口命名

只有一个主要方法的接口，通常根据方法名使用 `-er` 形式命名：

```go
Reader
Writer
Closer
Stringer
Scanner
Formatter
```

例如：

```go
type Reader interface {
    Read([]byte) (int, error)
}
```

接口名称首先应准确表达行为，而不是机械地给所有名称添加 `er`。

例如，下面名称也可能是合理的：

```go
type Storage interface {
    Save(data []byte) error
    Load(id string) ([]byte, error)
}
```

---

### 12.1.4 接口是隐式实现的

Go 不要求类型显式声明

```text
implements Speaker
```

只要某个类型的方法集包含接口要求的全部方法，它就实现了该接口。

```go
type Speaker interface {
    Speak() string
}

type Dog struct{}

func (Dog) Speak() string {
    return "汪汪汪"
}
```

`Dog` 自动实现了 `Speaker`：

```go
var speaker Speaker = Dog{}
```

接口方法匹配要求：

- 方法名一致；
- 参数数量一致；
- 参数类型和顺序一致；
- 返回值数量一致；
- 返回值类型和顺序一致。

参数名称不参与接口匹配：

```go
type Writer interface {
    Write(data []byte) (int, error)
}
```

与：

```go
func (f File) Write(content []byte) (int, error) {
}
```

参数名 `data` 和 `content` 不同，并不影响匹配。

---

### 12.1.5 接口变量

接口类型的变量可以保存任何实现了该接口的具体值：

```go
var speaker Speaker
```

可以先保存猫：

```go
speaker = Cat{}
fmt.Println(speaker.Speak())
```

再保存狗：

```go
speaker = Dog{}
fmt.Println(speaker.Speak())
```

接口变量的静态类型始终是：

```go
Speaker
```

但它在运行时保存的具体类型可以变化。

调用：

```go
speaker.Speak()
```

会执行当前具体类型对应的方法。

这种行为让同一段调用代码能够处理多个不同实现。

---

## 12.2 接收者、方法集与接口实现

类型是否实现接口，不是根据“能否写出某个方法调用”判断，而是根据类型的方法集判断。

值接收者和指针接收者会产生不同的方法集，因此也会影响接口实现关系。

---

### 12.2.1 值接收者实现接口

定义接口：

```go
type Mover interface {
    Move()
}
```

如果 `Dog` 使用值接收者实现 `Move`：

```go
type Dog struct{}

func (Dog) Move() {
    fmt.Println("狗在移动")
}
```

那么：

- `Dog` 的方法集包含 `Move`；
- `*Dog` 的方法集也包含 `Move`；
- `Dog` 和 `*Dog` 都实现 `Mover`。

```go
var first Mover = Dog{}
var second Mover = &Dog{}

first.Move()
second.Move()
```

值接收者方法会同时进入 `T` 和 `*T` 可用的方法集合，因此值和指针通常都能赋给相应接口。

---

### 12.2.2 指针接收者实现接口

如果 `Move` 使用指针接收者：

```go
type Dog struct{}

func (*Dog) Move() {
    fmt.Println("狗在移动")
}
```

那么：

- `Dog` 的方法集不包含 `Move`；
- `*Dog` 的方法集包含 `Move`；
- 只有 `*Dog` 实现 `Mover`。

正确：

```go
var mover Mover = &Dog{}
```

错误：

```go
// Dog 的方法集不包含 Move
// var mover Mover = Dog{}
```

下面的方法调用仍可能成功：

```go
dog := Dog{}
dog.Move()
```

这是因为 `dog` 可以取得地址，编译器自动转换为：

```go
(&dog).Move()
```

但接口赋值不会为了满足接口而自动取地址。

---

### 12.2.3 编译期检查接口实现

可以使用空白标识符在编译期检查某个类型是否实现接口：

```go
var _ Speaker = Dog{}
```

如果只有指针类型实现接口：

```go
var _ Speaker = (*Dog)(nil)
```

这种声明的作用是：

- 明确表达实现关系；
- 在方法签名变化时尽早发现问题；
- 不需要创建实际使用的变量；
- 不会产生额外业务逻辑。

如果类型没有实现接口，代码会在编译阶段报错。

---

### 12.2.4 通过嵌入组合接口实现

接口要求的方法可以由外层类型自己声明，也可以来自嵌入字段的方法提升。

例如：

```go
type WashingMachine interface {
    Wash()
    Dry()
}
```

定义甩干能力：

```go
type Dryer struct{}

func (Dryer) Dry() {
    fmt.Println("正在甩干")
}
```

外层结构体嵌入 `Dryer`，并自己提供 `Wash`：

```go
type Washer struct {
    Dryer
}

func (Washer) Wash() {
    fmt.Println("正在清洗")
}
```

`Washer` 的方法集中包含：

```go
Wash()
Dry()
```

因此它实现了：

```go
WashingMachine
```

可以赋值：

```go
var machine WashingMachine = Washer{}
```

需要注意，是否真正实现接口，仍然取决于外层类型的方法集，而不是仅仅看代码中是否能通过自动取地址调用某个方法。

---

## 12.3 接口组合与多态

接口可以通过嵌入其他接口，组合出更完整的行为要求。

结构体嵌入用于组合数据和方法，接口嵌入用于组合行为约束。

---

### 12.3.1 嵌入接口

定义两个小接口：

```go
type Speaker interface {
    Speak() string
}

type Mover interface {
    Move()
}
```

可以组合为一个更大的接口：

```go
type Animal interface {
    Speaker
    Mover
}
```

实现 `Animal` 的类型必须同时具有：

```go
Speak() string
Move()
```

例如：

```go
type Cat struct {
    Name string
}

func (c Cat) Speak() string {
    return "喵喵喵"
}

func (c Cat) Move() {
    fmt.Println(c.Name, "正在移动")
}
```

赋值：

```go
var animal Animal = Cat{
    Name: "花花",
}

fmt.Println(animal.Speak())
animal.Move()
```

---

### 12.3.2 多个类型实现同一接口

接口允许不同类型以统一方式被调用。

```go
type Mover interface {
    Move()
}
```

狗实现 `Mover`：

```go
type Dog struct {
    Name string
}

func (d Dog) Move() {
    fmt.Println(d.Name, "正在跑")
}
```

汽车也实现 `Mover`：

```go
type Car struct {
    Brand string
}

func (c Car) Move() {
    fmt.Println(c.Brand, "正在行驶")
}
```

统一处理：

```go
func Start(mover Mover) {
    mover.Move()
}
```

调用：

```go
Start(Dog{Name: "旺财"})
Start(Car{Brand: "汽车"})
```

`Start` 只依赖 `Move` 行为，不需要知道参数的具体类型。

这体现了接口多态：

> 不同具体类型可以通过同一个接口被统一使用。

---

### 12.3.3 一个类型实现多个接口

一个类型也可以同时实现多个接口。

```go
type Speaker interface {
    Speak() string
}

type Mover interface {
    Move()
}
```

定义 `Dog`：

```go
type Dog struct {
    Name string
}

func (d Dog) Speak() string {
    return d.Name + "：汪汪汪"
}

func (d Dog) Move() {
    fmt.Println(d.Name, "正在跑")
}
```

`Dog` 同时实现：

```go
Speaker
Mover
```

可以分别赋值：

```go
dog := Dog{
    Name: "旺财",
}

var speaker Speaker = dog
var mover Mover = dog

fmt.Println(speaker.Speak())
mover.Move()
```

类型不需要提前声明自己会被哪些接口使用。

---

### 12.3.4 优先定义小接口

接口方法越少，通常越容易实现和复用。

例如标准库常使用职责单一的小接口：

```go
type Reader interface {
    Read([]byte) (int, error)
}

type Writer interface {
    Write([]byte) (int, error)
}
```

需要同时读写时，可以组合：

```go
type ReadWriter interface {
    Reader
    Writer
}
```

小接口具有以下优点：

- 实现成本较低；
- 更容易在不同场景复用；
- 更容易编写测试替身；
- 对调用方和实现方的耦合更少；
- 可以按需组合出更大接口。

不应在没有实际需求时，预先定义包含大量方法的“大而全”接口。

---

### 12.3.5 接口通常由使用方定义

接口描述的是调用方真正需要的行为。

假设一个函数只需要输出对象的字符串表示：

```go
type Stringer interface {
    String() string
}

func PrintValue(value Stringer) {
    fmt.Println(value.String())
}
```

调用方只需要对象实现 `String`，不需要了解对象的其他能力。

如果接口由实现方提前定义得过大，使用方可能被迫依赖许多并不需要的方法。

因此，Go 中常见的设计方式是：

> 在使用行为的位置，根据实际需要定义最小接口。

---

## 12.4 接口值与 nil

接口变量并不只保存一个普通值。

可以从概念上把接口值理解为两部分：

```text
动态类型 + 动态值
```

理解这两部分，有助于解释接口赋值、类型断言以及接口和 `nil` 比较时的行为。

---

### 12.4.1 接口值的动态类型和动态值

例如：

```go
var value any
```

此时接口还没有保存具体值。

赋值：

```go
value = 100
```

可以理解为：

```text
静态类型：any
动态类型：int
动态值：100
```

再赋值：

```go
value = "Go"
```

此时：

```text
静态类型：any
动态类型：string
动态值："Go"
```

静态类型由变量声明决定，而动态类型和动态值由当前赋给接口的具体值决定。

---

### 12.4.2 nil 接口

没有保存任何动态类型和动态值的接口变量等于 `nil`：

```go
var value any

fmt.Println(value == nil) // true
```

此时可以理解为：

```text
动态类型：无
动态值：无
```

只有这两部分都不存在时，接口才等于 `nil`。

---

### 12.4.3 保存 nil 指针的接口不等于 nil

定义接口：

```go
type Runner interface {
    Run()
}
```

定义一个类型：

```go
type Worker struct{}
```

使用指针接收者实现方法：

```go
func (w *Worker) Run() {
    if w == nil {
        fmt.Println("没有可用的 Worker")
        return
    }

    fmt.Println("开始工作")
}
```

现在创建一个 `nil` 指针：

```go
var worker *Worker
```

把它赋给接口：

```go
var runner Runner = worker
```

比较：

```go
fmt.Println(worker == nil) // true
fmt.Println(runner == nil) // false
```

此时 `runner` 内部可以理解为：

```text
动态类型：*Worker
动态值：nil
```

虽然动态值是 `nil`，但动态类型 `*Worker` 已经存在，所以整个接口值不等于 `nil`。

这是 Go 接口中非常常见的错误来源。

---

### 12.4.4 nil 接收者的方法调用

上面的 `Run` 方法主动处理了 `nil` 接收者：

```go
func (w *Worker) Run() {
    if w == nil {
        fmt.Println("没有可用的 Worker")
        return
    }

    fmt.Println("开始工作")
}
```

因此：

```go
runner.Run()
```

可以正常执行。

但是，如果方法直接访问接收者字段：

```go
type Worker struct {
    Name string
}

func (w *Worker) Run() {
    fmt.Println(w.Name)
}
```

当 `w` 为 `nil` 时，访问：

```go
w.Name
```

会产生运行时错误。

接口本身是否为 `nil` 与接口中保存的具体指针是否为 `nil`，必须分别判断。

---

### 12.4.5 接口赋值与数据复制

把一个具体值赋给接口时，接口会保存该值和对应的动态类型。

如果赋入的是值类型：

```go
user := User{
    Name: "Alice",
}

var value any = user
```

接口保存的是赋值时的 `User` 值。

之后修改原变量：

```go
user.Name = "Bob"
```

不会修改接口中已经保存的结构体值：

```go
fmt.Println(value) // 仍然保存 Alice 对应的值
```

如果赋入的是指针：

```go
user := &User{
    Name: "Alice",
}

var value any = user
```

接口保存的是指针值。修改指针指向的对象：

```go
user.Name = "Bob"
```

通过接口取得的对象也会反映相同修改。

因此，不应简单描述为：

- 接口总是引用传递；
- 接口总是保存对象指针。

具体共享行为取决于赋给接口的具体值是什么。

---

## 12.5 any、类型断言与类型选择

### 12.5.1 空接口与 any

没有声明任何方法的接口称为空接口：

```go
interface{}
```

预声明标识符 `any` 是 `interface{}` 的别名：

```go
type any = interface{}
```

因此：

```go
var value any
```

等价于：

```go
var value interface{}
```

由于空接口不要求任何方法，任何具体类型都满足它。

```go
var value any

value = "Go"
fmt.Printf("%T %v\n", value, value)

value = 100
fmt.Printf("%T %v\n", value, value)

value = true
fmt.Printf("%T %v\n", value, value)
```

---

### 12.5.2 any 作为函数参数

使用 `any` 可以接收不同类型的参数：

```go
func PrintValue(value any) {
    fmt.Printf(
        "类型：%T，值：%v\n",
        value,
        value,
    )
}
```

调用：

```go
PrintValue(100)
PrintValue("Go")
PrintValue(true)
```

这种写法很灵活，但函数签名无法准确说明调用方应该传入什么类型。

因此，能够使用具体类型或具有明确行为的接口时，应优先使用更具体的类型：

```go
func PrintName(name string) {
}
```

通常比：

```go
func PrintName(name any) {
}
```

更加清晰和安全。

---

### 12.5.3 any 作为 Map 的值

如果一个 Map 确实需要保存不同类型的数据，可以使用：

```go
information := map[string]any{
    "name":    "Alice",
    "age":     20,
    "married": false,
}
```

项目代码中也经常能看到下面这种写法：

```go
information := map[string]interface{}{
    "name":    "Alice",
    "age":     20,
    "married": false,
}
```

`interface{}` 和 `any` 完全等价，所以：

```go
map[string]interface{}
```

等价于：

```go
map[string]any
```

它表示：

- Map 的键是 `string`；
- Map 的值可以是任意类型；
- 每个值真正的类型要到运行时才知道。

读取：

```go
name := information["name"]
```

得到的类型是 `any`，不是 `string`。如果需要使用字符串操作，需要检查其动态类型。

对于字段固定的数据，通常优先使用结构体：

```go
type UserInformation struct {
    Name    string
    Age     int
    Married bool
}
```

结构体能够提供更明确的类型约束和代码补全。

---

### 12.5.4 类型断言

类型断言用于检查接口值中保存的动态类型。

基本语法：

```go
value.(T)
```

其中：

- `value` 必须是接口类型；
- `T` 是希望取得的目标类型。

#### 12.5.4.1 单返回值形式

```go
text := value.(string)
```

如果 `value` 的动态类型确实是 `string`，断言成功。

如果不是 `string`，程序会发生运行时恐慌。

因此，在类型不确定时通常不推荐直接使用单返回值形式。

#### 12.5.4.2 双返回值形式

更安全的写法是：

```go
text, ok := value.(string)
```

其中：

- 断言成功时，`text` 是具体值，`ok` 为 `true`；
- 断言失败时，`text` 是 `string` 的零值，`ok` 为 `false`。

示例：

```go
package main

import "fmt"

func main() {
    var value any = "Go"

    text, ok := value.(string)
    if !ok {
        fmt.Println("value 不是 string")
        return
    }

    fmt.Println(text)
}
```

运行结果：

```text
Go
```

项目中常见的组合是先从 `map[string]interface{}` 里取值，再断言为具体类型：

```go
information := map[string]interface{}{
    "name": "Alice",
    "age":  20,
}

name, ok := information["name"].(string)
if !ok {
    fmt.Println("name 不是 string")
    return
}

fmt.Println(name)
```

这里的 `information["name"]` 静态类型是 `interface{}`，`.(string)` 的作用是检查它里面保存的动态值是否真的是 `string`。

需要注意，类型断言不是类型转换：

```go
var value any = 100

text, ok := value.(string)
fmt.Println(text, ok) // "" false
```

`100` 不会被自动转换成 `"100"`。如果需要格式化成字符串，应使用 `fmt.Sprint`、`strconv` 等方式。

---

### 12.5.5 类型断言并不限于 any

类型断言可以用于任何接口类型，不只用于 `any`。

例如：

```go
type Speaker interface {
    Speak() string
}
```

接口变量：

```go
var speaker Speaker = Dog{}
```

可以断言为具体类型：

```go
dog, ok := speaker.(Dog)
```

也可以断言为另一个接口：

```go
type Mover interface {
    Move()
}

mover, ok := speaker.(Mover)
```

这表示检查 `speaker` 中保存的动态类型是否同时实现 `Mover`。

---

### 12.5.6 类型选择

如果需要判断多种可能的动态类型，连续编写多个类型断言会比较繁琐：

```go
if text, ok := value.(string); ok {
    // ...
}

if number, ok := value.(int); ok {
    // ...
}
```

可以使用类型选择：

```go
switch value := input.(type) {
case string:
    fmt.Println("字符串：", value)

case int:
    fmt.Println("整数：", value)

case bool:
    fmt.Println("布尔值：", value)

case nil:
    fmt.Println("nil 接口值")

default:
    fmt.Printf("暂不支持的类型：%T\n", value)
}
```

完整示例：

```go
package main

import "fmt"

func PrintType(input any) {
    switch value := input.(type) {
    case string:
        fmt.Printf("string：%q\n", value)

    case int:
        fmt.Printf("int：%d\n", value)

    case bool:
        fmt.Printf("bool：%t\n", value)

    case nil:
        fmt.Println("nil")

    default:
        fmt.Printf("其他类型：%T\n", value)
    }
}

func main() {
    PrintType("Go")
    PrintType(100)
    PrintType(true)
    PrintType(nil)
}
```

表达式：

```go
input.(type)
```

只能出现在类型选择的 `switch` 中，不能作为普通表达式单独使用。

---

## 12.6 接口设计建议

### 12.6.1 不要为了抽象而定义接口

接口用于隔离调用方和具体实现，但接口本身也会增加抽象层次。

只有在以下场景中，接口通常才具有明确价值：

- 多个类型需要以相同方式被处理；
- 调用方不应依赖具体实现；
- 需要在测试中替换实现；
- 一个模块需要暴露最小行为；
- 程序确实存在多个可替换实现。

如果代码目前只使用一个具体类型，而且没有替换或抽象需求，直接使用具体类型往往更简单。

---

### 12.6.2 接口应尽量小

较小的接口更容易实现和复用。

例如：

```go
type Closer interface {
    Close() error
}
```

只有一个方法，任何具备关闭能力的类型都可以实现。

相比之下，一个包含十几个无关方法的接口：

- 实现成本高；
- 难以复用；
- 测试替身复杂；
- 容易让调用方依赖不需要的能力。

优先围绕单一职责定义小接口，再通过接口嵌入进行组合。

---

### 12.6.3 接口通常由使用方定义

接口表达的是调用方需要什么，而不是实现方拥有什么。

如果函数只需要读取数据，可以定义：

```go
type Reader interface {
    Read([]byte) (int, error)
}
```

函数只依赖：

```go
Read
```

就不应该要求参数同时实现写入、关闭、重置等无关方法。

这种设计能减少模块之间的耦合。

---

### 12.6.4 接受接口，谨慎返回接口

函数参数使用接口，可以让调用方传入不同实现：

```go
func CopyData(reader io.Reader) error {
    // ...
}
```

构造函数通常可以返回具体类型：

```go
func NewBuffer() *Buffer {
    return &Buffer{}
}
```

返回具体类型的优点是调用方可以使用该类型的完整能力。

只有在确实需要隐藏实现、提供多个实现或限制调用方能力时，才考虑返回接口。

这不是绝对规则，仍应根据 API 的具体目标决定。

---

### 12.6.5 不要滥用 any

`any` 能够保存任意值，但也会失去具体类型信息。

如果参数应当是字符串，应写成：

```go
func SetName(name string) {
}
```

而不是：

```go
func SetName(name any) {
}
```

如果调用方只需要某种行为，应定义行为接口：

```go
type Stringer interface {
    String() string
}
```

而不是直接使用 `any` 后再进行大量类型判断。

`any` 更适合：

- 通用格式化；
- 日志；
- 反射工具；
- 动态数据；
- 确实无法预先确定类型的边界场景。

---

### 12.6.6 正确理解方法调用与接口实现

需要始终区分三个概念：

1. 方法声明；
2. 方法调用时的自动取地址或解引用；
3. 类型的方法集。

核心规则是：

```text
T 的方法集：
    接收者为 T 的方法

*T 的方法集：
    接收者为 T 或 *T 的方法
```

因此：

- 值接收者方法通常使 `T` 和 `*T` 都实现对应接口；
- 指针接收者方法通常只使 `*T` 实现对应接口；
- 接口赋值不会自动取得地址；
- 某个方法能够通过变量调用，不一定意味着它属于变量类型的方法集。

## 总结

- 接口描述行为，类型的方法集包含接口要求的全部方法时，就隐式实现了接口。
- 值接收者方法属于 `T` 和 `*T` 的方法集，指针接收者方法属于 `*T` 的方法集；接口赋值不会自动取地址。
- 接口值包含动态类型和动态值。保存了 `nil` 指针的接口仍然可能不等于 `nil`。
- `any` 是空接口 `interface{}` 的别名。使用动态值前，可以通过类型断言或类型选择检查其类型。
- 根据调用方实际需要定义小接口，并通过接口嵌入组合能力。
