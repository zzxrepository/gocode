---
title: 09. 方法
shortTitle: 方法
order: 9
dir:
  link: true
  collapsible: true
  order: 9
icon: shapes
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 方法
  - 接收者
  - 方法集
  - 指针接收者
  - 接口
---

# 09. 方法

![Go methods 方法详解封面](/assets/image/go-methods-cover.png)

前面学习结构体时，我们已经知道：结构体负责把一组相关数据组织成一个清晰的类型。比如 `User` 保存用户信息，`Account` 保存账户余额，`Point` 保存二维坐标。

但真实程序里，数据通常不是静静躺在那里。用户需要改名，账户需要存款和取款，坐标需要计算距离。也就是说，程序还需要把“行为”绑定到某个类型上。Go 用 **方法** 做这件事。

这一节我们就来系统学习方法：它是什么，和普通函数有什么区别，值接收者与指针接收者怎么选，为什么有些方法调用能自动取地址，有些却不行，以及方法集如何影响接口实现。

## 方法是什么

方法本质上是一个带有 **接收者** 的函数。

普通函数写成这样：

```go
package main

import "fmt"

type User struct {
	Name  string
	Email string
}

// Notify 是普通函数，User 只是它的一个普通参数。
func Notify(u User) {
	fmt.Printf("%s <%s>\n", u.Name, u.Email)
}

func main() {
	// 创建一个普通的 User 值。
	u := User{Name: "Alice", Email: "alice@example.com"}

	// 调用普通函数时，需要把 User 当作参数传进去。
	Notify(u)
}
```

方法写成这样：

```go
package main

import "fmt"

type User struct {
	Name  string
	Email string
}

// Notify 是 User 类型的方法，(u User) 叫接收者。
func (u User) Notify() {
	fmt.Printf("%s <%s>\n", u.Name, u.Email)
}

func main() {
	// 创建一个 User 值。
	u := User{Name: "Alice", Email: "alice@example.com"}

	// 调用方法时，接收者写在方法名前面。
	u.Notify()
}
```

语法形式可以概括为：

```text
// 接收者写在 func 和方法名之间。
func (接收者变量 接收者类型) 方法名(参数列表) 返回值列表 {
	// 方法体中可以像使用普通参数一样使用接收者变量。
}
```

这里的 `u User` 就是接收者。它告诉 Go：`Notify` 这个行为属于 `User` 类型。

## 方法和普通函数的区别

方法和普通函数都可以封装一段逻辑，但表达的关系不同。

```go
package main

import "fmt"

type User struct {
	Name string
}

// 普通函数：强调“有一个函数处理 User”。
func PrintUser(u User) {
	fmt.Println(u.Name)
}

// 方法：强调“User 自己具备 Print 行为”。
func (u User) Print() {
	fmt.Println(u.Name)
}

func main() {
	u := User{Name: "Alice"}

	// 普通函数调用。
	PrintUser(u)

	// 方法调用。
	u.Print()
}
```

简单说：

- 普通函数不属于某个具体类型；
- 方法属于接收者类型；
- 方法调用使用 `对象.方法()` 的形式；
- 方法会参与方法集，进而影响接口实现；
- 方法调用时，接收者可能发生自动取地址或自动解引用。

普通函数更适合表达通用操作；方法更适合表达某个类型天然具备的行为。

## 接收者语法

接收者看起来像一个普通参数，但它有自己的位置：

```go
package main

import "fmt"

type Account struct {
	Balance int
}

// Deposit 方法有一个接收者 a，以及一个普通参数 amount。
func (a Account) Deposit(amount int) {
	// 这里暂时使用值接收者，后面会看到它不能修改原账户。
	a.Balance += amount
	fmt.Println("方法内部余额：", a.Balance)
}

func main() {
	// 创建账户。
	a := Account{Balance: 100}

	// 调用方法时只传普通参数，接收者写在点号前。
	a.Deposit(50)

	// 值接收者修改的是副本，所以这里仍然是 100。
	fmt.Println("方法外部余额：", a.Balance)
}
```

接收者不是关键字，也不是 `this` 或 `self`。它就是一个普通变量名，只不过由方法调用语法自动传入。

## 接收者命名

Go 通常不使用 `this`、`self` 作为接收者名称，而是使用类型名的简短缩写。

```go
package main

type User struct {
	Name  string
	Email string
}

// u 是 User 的简短缩写。
func (u User) DisplayName() string {
	return u.Name
}

// 同一个类型的方法，尽量保持接收者名称一致。
func (u User) Contact() string {
	return u.Email
}
```

几个常见习惯：

- `User` 用 `u`；
- `Account` 用 `a`；
- `Client` 用 `c`；
- `Server` 用 `s`；
- `Config` 用 `cfg`；
- 接收者名称要短，但不能短到看不懂。

如果方法很短，`u`、`a` 这种单字母接收者很自然。如果方法较长，可以用更明确的名字，但仍然不建议机械套用 `this`。

## 哪些类型能定义方法

方法不只属于结构体。只要是 **当前包中定义的类型**，通常都可以为它定义方法。

### 结构体类型

```go
package main

type User struct {
	Name string
}

// String 返回用户的字符串表示。
func (u User) String() string {
	return u.Name
}
```

### 基于基本类型定义的新类型

```go
package main

import "fmt"

// Celsius 是当前包定义的新类型，底层类型是 float64。
type Celsius float64

// String 为 Celsius 定义格式化行为。
func (c Celsius) String() string {
	return fmt.Sprintf("%.1f°C", c)
}

func main() {
	// 使用自定义类型表达温度。
	t := Celsius(36.5)

	// 调用 Celsius 的方法。
	fmt.Println(t.String())
}
```

### 基于函数定义的新类型

```go
package main

import "fmt"

// Handler 是当前包定义的函数类型。
type Handler func(string)

// Serve 给函数类型增加一个方法。
func (h Handler) Serve(name string) {
	// 调用函数值本身。
	h(name)
}

func main() {
	// 把匿名函数转换为 Handler。
	h := Handler(func(name string) {
		fmt.Println("hello,", name)
	})

	// 函数类型也可以调用自己的方法。
	h.Serve("Alice")
}
```

但有两个限制一定要记住。

不能直接给内置类型添加方法：

```go
package main

// 下面这种写法不能通过编译，因为 int 不是当前包定义的类型。
// func (n int) Double() int {
// 	return n * 2
// }

// 正确做法：先定义自己的类型。
type MyInt int

// Double 是 MyInt 的方法。
func (n MyInt) Double() MyInt {
	return n * 2
}
```

也不能给其他包里的类型添加方法：

```go
package main

import "time"

// 下面这种写法不能通过编译，因为 time.Time 定义在 time 包中。
// func (t time.Time) IsMorning() bool {
// 	return t.Hour() < 12
// }

// 可以定义自己的包装类型。
type MyTime struct {
	time.Time
}

// IsMorning 是当前包类型 MyTime 的方法。
func (t MyTime) IsMorning() bool {
	return t.Hour() < 12
}
```

这里的规则叫：接收者的基础类型必须定义在当前包中。

## 值接收者

接收者类型为 `T` 的方法，叫值接收者方法。

```go
package main

import "fmt"

type User struct {
	Name string
}

// Rename 使用值接收者，因此 u 是调用者的一份副本。
func (u User) Rename(name string) {
	u.Name = name
}

func main() {
	// 原始用户。
	u := User{Name: "Alice"}

	// Rename 修改的是副本。
	u.Rename("Bob")

	// 原始值不会变。
	fmt.Println(u.Name)
}
```

输出是：

```text
Alice
```

值接收者的关键点是：调用方法时，接收者值会被复制一份。方法内部读写的是这份副本。

因此，值接收者适合：

- 方法只读取数据；
- 类型比较小；
- 类型本身具有值语义，比如坐标、金额、时间点；
- 复制不会造成共享状态上的误解。

看一个更自然的例子：

```go
package main

import (
	"fmt"
	"math"
)

type Point struct {
	X float64
	Y float64
}

// DistanceFromOrigin 只读取坐标，不修改 Point。
func (p Point) DistanceFromOrigin() float64 {
	return math.Sqrt(p.X*p.X + p.Y*p.Y)
}

func main() {
	// 一个二维坐标点。
	p := Point{X: 3, Y: 4}

	// 距离计算不需要改变 p。
	fmt.Println(p.DistanceFromOrigin())
}
```

## 指针接收者

接收者类型为 `*T` 的方法，叫指针接收者方法。

```go
package main

import "fmt"

type User struct {
	Name string
}

// Rename 使用指针接收者，因此可以修改原始 User。
func (u *User) Rename(name string) {
	// 如果 API 允许 nil 接收者，可以在这里主动处理。
	if u == nil {
		return
	}

	u.Name = name
}

func main() {
	// 原始用户。
	u := User{Name: "Alice"}

	// 方法会修改原始对象。
	u.Rename("Bob")

	// 输出 Bob。
	fmt.Println(u.Name)
}
```

指针接收者适合：

- 方法需要修改接收者；
- 类型较大，不想每次调用都复制；
- 类型包含 `sync.Mutex` 等不应该复制的字段；
- 类型表示共享对象或有身份的对象；
- 需要用 `nil` 表示对象不存在；
- 同一类型的大多数方法已经使用指针接收者。

如果一个类型代表“实体”，比如用户、账户、连接、缓存，通常更常见的是指针接收者。如果一个类型代表“值”，比如坐标、温度、金额，值接收者往往更自然。

## 自动取地址

Go 为方法调用提供了一些语法便利。第一个便利是：当变量可以取地址时，可以用值直接调用指针接收者方法。

```go
package main

import "fmt"

type User struct {
	Name string
}

// Rename 是指针接收者方法。
func (u *User) Rename(name string) {
	u.Name = name
}

func main() {
	// u 是一个可取地址的变量。
	u := User{Name: "Alice"}

	// 编译器会把它理解成 (&u).Rename("Bob")。
	u.Rename("Bob")

	// 原始值已经被修改。
	fmt.Println(u.Name)
}
```

也就是说：

```go
package main

type User struct {
	Name string
}

// Rename 是指针接收者方法。
func (u *User) Rename(name string) {
	u.Name = name
}

func main() {
	// u 是可寻址变量。
	u := User{Name: "Alice"}

	// 这两种写法效果相同。
	u.Rename("Bob")
	(&u).Rename("Charlie")
}
```

这个规则让方法调用更顺手，但它不是魔法。前提是接收者表达式必须能取地址。

## 自动解引用

第二个便利是：指针可以直接调用值接收者方法。

```go
package main

import "fmt"

type User struct {
	Name string
}

// Print 是值接收者方法。
func (u User) Print() {
	fmt.Println(u.Name)
}

func main() {
	// u 是 *User。
	u := &User{Name: "Alice"}

	// 编译器会把它理解成 (*u).Print()。
	u.Print()
}
```

不过要注意：值接收者方法需要先得到一个值。如果指针是 `nil`，自动解引用就可能触发 panic。

```go
package main

type User struct {
	Name string
}

// Print 是值接收者方法。
func (u User) Print() string {
	return u.Name
}

func main() {
	// u 是 nil 指针。
	var u *User

	// 避免独立运行示例时出现未使用变量错误。
	_ = u

	// 这一行会在运行时 panic，因为需要先解引用 nil 指针。
	// _ = u.Print()
}
```

如果方法本身是指针接收者，并且方法内部主动处理 `nil`，那么可以设计出允许 nil 接收者调用的 API。

```go
package main

import "fmt"

type User struct {
	Name string
}

// NameOrGuest 是指针接收者方法，它允许 nil 接收者。
func (u *User) NameOrGuest() string {
	if u == nil {
		return "guest"
	}

	return u.Name
}

func main() {
	// u 是 nil 指针。
	var u *User

	// 方法内部处理了 nil，所以这里不会 panic。
	fmt.Println(u.NameOrGuest())
}
```

是否支持 nil 接收者是一种 API 设计选择，不是所有指针接收者方法都必须支持。

## 不能自动取地址的场景

自动取地址只适用于可寻址的值。变量通常可寻址，但很多表达式的结果不可寻址。

### 函数返回值不可自动取地址

```go
package main

type User struct {
	Name string
}

// Rename 是指针接收者方法。
func (u *User) Rename(name string) {
	u.Name = name
}

// NewUser 返回一个临时的 User 值。
func NewUser() User {
	return User{Name: "Alice"}
}

func main() {
	// 函数返回的临时值不可取地址，所以不能这样调用指针接收者方法。
	// NewUser().Rename("Bob")

	// 正确做法：先保存到变量中。
	u := NewUser()
	u.Rename("Bob")
}
```

### Map 元素不可自动取地址

```go
package main

type User struct {
	Name string
}

// Rename 是指针接收者方法。
func (u *User) Rename(name string) {
	u.Name = name
}

func main() {
	// Map 中保存的是 User 值。
	users := map[int]User{
		1: {Name: "Alice"},
	}

	// Map 元素不可取地址，所以不能直接调用指针接收者方法。
	// users[1].Rename("Bob")

	// 做法一：取出副本，修改后写回。
	u := users[1]
	u.Rename("Bob")
	users[1] = u
}
```

如果经常需要原地修改，可以让 Map 保存指针：

```go
package main

type User struct {
	Name string
}

// Rename 是指针接收者方法。
func (u *User) Rename(name string) {
	u.Name = name
}

func main() {
	// Map 中保存的是 *User。
	users := map[int]*User{
		1: {Name: "Alice"},
	}

	// users[1] 的结果是一个 *User，可以直接调用指针接收者方法。
	users[1].Rename("Bob")
}
```

### 类型转换结果不可自动取地址

```go
package main

type MyInt int

// Inc 是指针接收者方法。
func (n *MyInt) Inc() {
	// 先解引用，再把结果写回原变量。
	*n = *n + 1
}

func main() {
	// 类型转换 MyInt(1) 的结果是临时值。
	// MyInt(1).Inc()

	// 正确做法：保存到变量中。
	n := MyInt(1)
	n.Inc()
}
```

判断一个表达式能不能自动取地址，可以先问自己：这个表达式背后有没有一个稳定的变量位置？如果只是临时计算结果，就不能依赖自动取地址。

## 普通函数参数不会自动转换

方法调用里的自动取地址、自动解引用，只发生在 **方法接收者** 上。普通函数参数没有这个待遇。

```go
package main

type User struct {
	Name string
}

// PrintValue 需要 User 值。
func PrintValue(u User) {
	_ = u.Name
}

// RenamePointer 需要 *User 指针。
func RenamePointer(u *User, name string) {
	u.Name = name
}

func main() {
	// u 是 User 值。
	u := User{Name: "Alice"}

	// 普通函数参数必须类型匹配。
	PrintValue(u)
	RenamePointer(&u, "Bob")

	// 下面两行都不能通过编译。
	// PrintValue(&u)
	// RenamePointer(u, "Charlie")
}
```

所以，不要把方法调用的便利理解成“Go 会自动把值和指针到处互转”。Go 的普通参数传递仍然非常明确。

## 如何选择接收者

选择值接收者还是指针接收者，可以从三个角度看。

第一，看方法是否需要修改接收者。

```go
package main

type Account struct {
	Balance int
}

// BalanceText 只读取余额，值接收者可以胜任。
func (a Account) BalanceText() int {
	return a.Balance
}

// Deposit 需要修改余额，应该使用指针接收者。
func (a *Account) Deposit(amount int) {
	a.Balance += amount
}
```

第二，看类型复制是否便宜、是否安全。

```go
package main

import "sync"

type Counter struct {
	mu    sync.Mutex
	value int
}

// Add 使用指针接收者，因为包含 Mutex 的类型不应该被随意复制。
func (c *Counter) Add(n int) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.value += n
}

// Value 也使用指针接收者，保持这个类型的方法接收者风格一致。
func (c *Counter) Value() int {
	c.mu.Lock()
	defer c.mu.Unlock()

	return c.value
}
```

第三，看接口实现需要什么方法集。这个点后面会展开。

经验上可以这样选：

| 情况 | 推荐 |
| --- | --- |
| 方法要修改接收者 | 指针接收者 |
| 类型较大 | 指针接收者 |
| 类型包含锁、连接、缓冲区等状态 | 指针接收者 |
| 类型代表共享对象或实体 | 指针接收者 |
| 类型较小且只读 | 值接收者 |
| 类型代表独立值，比如坐标、温度、金额 | 值接收者 |
| 同一类型多数方法已经用了指针接收者 | 倾向继续使用指针接收者 |

最后补一句：同一个类型的方法不应该毫无规律地混用值接收者和指针接收者。但“一旦有一个方法用了指针接收者，所有方法就必须都用指针接收者”不是语法规则。真正需要考虑的是类型语义、复制成本、并发安全和接口实现。

## 方法不能重载

Go 不支持方法重载。同一个接收者基础类型上，不能有两个同名方法。

```go
package main

type User struct {
	Name string
}

// Print 打印用户。
func (u User) Print() {
	// 这里省略具体打印逻辑。
}

// 下面这个方法不能声明，因为 User 已经有 Print 方法。
// func (u User) Print(prefix string) {
// 	// Go 不根据参数列表区分同名方法。
// }
```

如果语义不同，就使用不同名字：

```go
package main

type User struct {
	Name string
}

// Print 打印用户。
func (u User) Print() {
	// 这里省略具体打印逻辑。
}

// PrintWithPrefix 使用前缀打印用户。
func (u User) PrintWithPrefix(prefix string) {
	// 这里省略具体打印逻辑。
}
```

不同类型可以拥有同名方法：

```go
package main

type User struct {
	Name string
}

type Product struct {
	Name string
}

// String 是 User 的方法。
func (u User) String() string {
	return u.Name
}

// String 是 Product 的方法。
func (p Product) String() string {
	return p.Name
}
```

## 方法值

方法也可以像函数一样保存到变量中。表达式 `对象.方法` 叫方法值。

```go
package main

import "fmt"

type User struct {
	Name string
}

// Print 接收一个普通参数 prefix。
func (u User) Print(prefix string) {
	fmt.Println(prefix, u.Name)
}

func main() {
	// 创建用户。
	u := User{Name: "Alice"}

	// printUser 是方法值，它已经绑定了接收者 u。
	printUser := u.Print

	// 调用时只需要传入普通参数。
	printUser("用户：")
}
```

`printUser` 的类型是 `func(string)`，因为接收者已经被绑定了。

值接收者的方法值会保存创建那一刻的副本：

```go
package main

import "fmt"

type User struct {
	Name string
}

// Print 使用值接收者。
func (u User) Print() {
	fmt.Println(u.Name)
}

func main() {
	// 原始用户。
	u := User{Name: "Alice"}

	// 方法值保存了此刻的 u 副本。
	printUser := u.Print

	// 修改原始变量。
	u.Name = "Bob"

	// 直接调用方法会看到新值。
	u.Print()

	// 方法值调用会看到旧副本。
	printUser()
}
```

输出：

```text
Bob
Alice
```

指针接收者的方法值保存的是指针：

```go
package main

import "fmt"

type User struct {
	Name string
}

// Print 使用指针接收者。
func (u *User) Print() {
	fmt.Println(u.Name)
}

func main() {
	// 原始用户。
	u := User{Name: "Alice"}

	// 方法值绑定的是指向 u 的指针。
	printUser := u.Print

	// 修改原始对象。
	u.Name = "Bob"

	// 方法值能看到修改后的内容。
	printUser()
}
```

输出：

```text
Bob
```

方法值很适合做回调、延迟执行、任务注册等。

## 方法表达式

方法表达式不会绑定具体对象，而是把接收者变成第一个显式参数。

```go
package main

import "fmt"

type User struct {
	Name string
}

// Print 使用值接收者。
func (u User) Print(prefix string) {
	fmt.Println(prefix, u.Name)
}

func main() {
	// User.Print 是方法表达式。
	print := User.Print

	// print 的类型相当于 func(User, string)。
	u := User{Name: "Alice"}
	print(u, "用户：")
}
```

指针接收者的方法表达式要写成 `(*T).Method`：

```go
package main

type User struct {
	Name string
}

// Rename 使用指针接收者。
func (u *User) Rename(name string) {
	u.Name = name
}

func main() {
	// (*User).Rename 是指针接收者的方法表达式。
	rename := (*User).Rename

	// rename 的类型相当于 func(*User, string)。
	u := User{Name: "Alice"}
	rename(&u, "Bob")
}
```

方法值和方法表达式的区别可以这样记：

| 形式 | 示例 | 接收者 |
| --- | --- | --- |
| 方法值 | `u.Print` | 已绑定 |
| 值方法表达式 | `User.Print` | 调用时显式传入 |
| 指针方法表达式 | `(*User).Rename` | 调用时显式传入 |

## 方法集

方法集是 Go 方法系统里非常关键的概念。它决定：

- 一个类型在类型层面拥有哪些方法；
- 一个类型是否实现某个接口；
- 方法表达式是否可用；
- 嵌入字段的方法如何提升。

先看最重要的规则：

| 类型 | 方法集包含 |
| --- | --- |
| `T` | 接收者为 `T` 的方法 |
| `*T` | 接收者为 `T` 和 `*T` 的方法 |

示例：

```go
package main

type Data struct {
	Value int
}

// Read 是值接收者方法。
func (d Data) Read() int {
	return d.Value
}

// Write 是指针接收者方法。
func (d *Data) Write(value int) {
	d.Value = value
}

func main() {
	// Data 的方法集包含 Read。
	var _ = Data.Read

	// *Data 的方法集包含 Read 和 Write。
	var _ = (*Data).Read
	var _ = (*Data).Write
}
```

所以：

- `Data` 的方法集有 `Read()`；
- `*Data` 的方法集有 `Read()` 和 `Write(int)`。

容易混淆的地方在这里：

```go
package main

type Data struct {
	Value int
}

// Write 是指针接收者方法。
func (d *Data) Write(value int) {
	d.Value = value
}

func main() {
	// data 是可取地址变量。
	data := Data{}

	// 这个调用可以成功，因为编译器会自动取地址。
	data.Write(10)
}
```

`data.Write(10)` 可以调用，并不代表 `Write` 属于 `Data` 的方法集。它只是方法调用语法做了自动取地址。

方法调用和方法集是两个概念：

- 方法调用看表达式是否能通过自动取地址、自动解引用完成调用；
- 方法集看类型本身拥有的方法；
- 接口实现只看方法集，不看“某个变量能不能写出这种调用”。

## 嵌入字段的方法提升

结构体嵌入不仅会提升字段，也会提升方法。

先看嵌入值类型：

```go
package main

import "fmt"

type Logger struct{}

// Info 是值接收者方法。
func (Logger) Info(msg string) {
	fmt.Println("info:", msg)
}

// Reset 是指针接收者方法。
func (*Logger) Reset() {
	fmt.Println("reset")
}

type Service struct {
	// 嵌入 Logger 值。
	Logger
}

func main() {
	// s 是可取地址变量。
	s := Service{}

	// Info 被提升到 Service。
	s.Info("start")

	// Reset 可以调用，是因为 s 可取地址，编译器能找到嵌入字段并取地址。
	s.Reset()
}
```

在方法集层面，嵌入 `Logger` 值时：

| 类型 | 提升到方法集的方法 |
| --- | --- |
| `Service` | `Info` |
| `*Service` | `Info`、`Reset` |

再看嵌入指针类型：

```go
package main

import "fmt"

type Logger struct{}

// Info 是值接收者方法。
func (Logger) Info(msg string) {
	fmt.Println("info:", msg)
}

// Reset 是指针接收者方法。
func (*Logger) Reset() {
	fmt.Println("reset")
}

type Service struct {
	// 嵌入 *Logger 指针。
	*Logger
}

func main() {
	// 嵌入指针字段时，通常要初始化这个指针。
	s := Service{Logger: &Logger{}}

	// 值接收者方法和指针接收者方法都可以被提升。
	s.Info("start")
	s.Reset()
}
```

嵌入 `*Logger` 指针时：

| 类型 | 提升到方法集的方法 |
| --- | --- |
| `Service` | `Info`、`Reset` |
| `*Service` | `Info`、`Reset` |

如果外层类型和嵌入类型有同名方法，外层方法会优先。

```go
package main

import "fmt"

type User struct{}

// String 是内层 User 的方法。
func (User) String() string {
	return "User"
}

type Manager struct {
	// 嵌入 User。
	User
}

// String 是外层 Manager 的方法，会遮蔽提升上来的 User.String。
func (Manager) String() string {
	return "Manager"
}

func main() {
	// 创建外层值。
	m := Manager{}

	// 优先调用 Manager.String。
	fmt.Println(m.String())

	// 仍然可以显式调用内层的 User.String。
	fmt.Println(m.User.String())
}
```

这不是继承里的“重写”。Go 没有类继承，嵌入是组合。外层方法只是遮蔽了提升方法，内层方法仍然存在。

## 方法与接口实现关系

接口要求的是一组方法。一个类型是否实现接口，取决于它的方法集是否包含接口要求的全部方法。

```go
package main

type Writer interface {
	Write(string)
}

type File struct {
	Content string
}

// Write 使用指针接收者，因为它要修改 File。
func (f *File) Write(s string) {
	f.Content += s
}

func main() {
	// *File 的方法集包含 Write，所以可以赋给 Writer。
	var w Writer = &File{}
	_ = w

	// File 的方法集不包含 Write，所以这一行不能通过编译。
	// var w2 Writer = File{}
	// _ = w2
}
```

这也是为什么前面说“能调用”和“实现接口”不是一回事：

```go
package main

type Writer interface {
	Write(string)
}

type File struct {
	Content string
}

// Write 使用指针接收者。
func (f *File) Write(s string) {
	f.Content += s
}

func main() {
	// f 是可取地址变量。
	f := File{}

	// 方法调用可以自动取地址，所以这一行合法。
	f.Write("hello")

	// 但接口赋值不会为了满足接口而自动取地址。
	// var w Writer = f

	// 必须显式传入 *File。
	var w Writer = &f
	_ = w
}
```

值接收者方法则同时进入 `T` 和 `*T` 的方法集，因此值和指针通常都能实现对应接口。

```go
package main

type Printer interface {
	Print() string
}

type User struct {
	Name string
}

// Print 使用值接收者。
func (u User) Print() string {
	return u.Name
}

func main() {
	// User 的方法集包含 Print。
	var p1 Printer = User{Name: "Alice"}

	// *User 的方法集也包含 Print。
	var p2 Printer = &User{Name: "Bob"}

	// 避免未使用变量。
	_, _ = p1, p2
}
```

这条规则会在接口章节反复出现。现在先记住一句话：

> 接口实现看方法集；指针接收者方法只属于 `*T` 的方法集。

## 常见坑

### 以为值接收者能修改原对象

```go
package main

import "fmt"

type User struct {
	Name string
}

// Rename 使用值接收者，只会修改副本。
func (u User) Rename(name string) {
	u.Name = name
}

func main() {
	// 原始用户。
	u := User{Name: "Alice"}

	// 修改的是副本。
	u.Rename("Bob")

	// 仍然输出 Alice。
	fmt.Println(u.Name)
}
```

需要修改原对象时，使用指针接收者。

### 在 Map 元素上调用指针接收者方法

```go
package main

type User struct {
	Name string
}

// Rename 使用指针接收者。
func (u *User) Rename(name string) {
	u.Name = name
}

func main() {
	// Map 中保存 User 值。
	users := map[int]User{
		1: {Name: "Alice"},
	}

	// Map 元素不可取地址，不能这样调用。
	// users[1].Rename("Bob")

	// 正确做法：改副本后写回。
	u := users[1]
	u.Rename("Bob")
	users[1] = u
}
```

### 以为方法调用合法就等于实现接口

```go
package main

type Saver interface {
	Save()
}

type Document struct{}

// Save 使用指针接收者。
func (d *Document) Save() {
	// 这里省略保存逻辑。
}

func main() {
	// doc 是可取地址变量。
	doc := Document{}

	// 方法调用合法，因为编译器能自动取地址。
	doc.Save()

	// 但 Document 的方法集不包含 Save，所以不能赋给 Saver。
	// var s Saver = doc

	// *Document 才实现 Saver。
	var s Saver = &doc
	_ = s
}
```

### 方法值悄悄保存了副本

```go
package main

import "fmt"

type Counter struct {
	N int
}

// Print 使用值接收者。
func (c Counter) Print() {
	fmt.Println(c.N)
}

func main() {
	// 创建计数器。
	c := Counter{N: 1}

	// 方法值保存了 c 的副本。
	print := c.Print

	// 修改原变量。
	c.N = 2

	// 输出 1，而不是 2。
	print()
}
```

如果你希望方法值看到后续变化，通常要使用指针接收者，或者直接绑定指针。

### 嵌入指针字段没有初始化

```go
package main

type Logger struct{}

// Info 访问 Logger。
func (l *Logger) Info(msg string) {
	// 这里省略日志逻辑。
}

type Service struct {
	// 嵌入的是 *Logger。
	*Logger
}

func main() {
	// Logger 字段默认是 nil。
	s := Service{}

	// 如果方法内部访问接收者字段，可能会因为 nil 指针而 panic。
	// s.Info("start")

	// 更安全的做法是初始化嵌入字段。
	s.Logger = &Logger{}
	s.Info("start")
}
```

## 练习

1. 定义一个 `Book` 结构体，包含 `Title` 和 `Author` 字段，为它定义 `String()` 方法，返回 `"书名 - 作者"`。

2. 定义一个 `Counter` 结构体，包含 `N int` 字段，分别用值接收者和指针接收者实现 `Add(int)`，观察哪一种能修改原值。

3. 定义一个 `Account` 结构体，为它实现 `Deposit`、`Withdraw`、`Balance` 三个方法。思考哪些方法应该使用指针接收者，哪些可以使用值接收者。

4. 定义一个 `Temperature` 类型，底层类型为 `float64`，为它实现 `Celsius()` 和 `Fahrenheit()` 方法。

5. 写一个 `Printer` 接口，要求 `Print() string` 方法。分别用值接收者和指针接收者实现它，观察 `T` 和 `*T` 哪些可以赋给接口变量。

6. 定义一个 `Logger` 类型和一个嵌入 `Logger` 的 `Service` 类型，给 `Logger` 添加值接收者方法和指针接收者方法，观察 `Service` 与 `*Service` 的方法集差异。

7. 创建一个方法值，先绑定一个值接收者方法，再修改原变量，观察方法值输出的是旧值还是新值。

8. 使用方法表达式 `T.Method` 或 `(*T).Method`，把同一个方法应用到多个不同对象上。

## 总结

方法让 Go 可以把行为绑定到类型上：结构体负责组织数据，方法负责描述这些数据能做什么。

这一节需要重点掌握这些规则：

- 方法是带接收者的函数；
- 接收者可以是值接收者，也可以是指针接收者；
- 值接收者会复制接收者，适合只读、小对象和值语义类型；
- 指针接收者可以修改原对象，适合大对象、共享状态、不应复制的类型；
- 方法调用时，接收者可能自动取地址或自动解引用；
- 自动取地址要求表达式可寻址，函数返回值、Map 元素、临时转换结果都不行；
- 普通函数参数不会自动进行值和指针之间的转换；
- Go 不支持方法重载；
- 方法值会绑定接收者，方法表达式会把接收者变成第一个参数；
- `T` 的方法集只包含值接收者方法，`*T` 的方法集包含值接收者和指针接收者方法；
- 嵌入字段的方法可以被提升，但外层同名方法会遮蔽提升方法；
- 接口实现看方法集，不看某个变量能不能通过自动取地址调用方法。

学完方法，就已经站在接口的门口了。下一节我们会看到：接口不关心类型内部有什么字段，只关心类型对外提供了哪些方法。
