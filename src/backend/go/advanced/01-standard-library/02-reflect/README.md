---
title: 02. reflect：反射
shortTitle: 02. reflect：反射
order: 2
dir:
  link: true
  collapsible: true
  order: 2
icon: mirror
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - reflect
  - 反射
  - Type
  - Value
  - StructTag
---

# 02. reflect：反射

![Go reflect 反射详解封面](/assets/image/go-reflect-cover.png)

刚开始学 Go 的时候，很多同学一听到“反射”就觉得它有点神秘。

它不像 `if`、`for`、`struct` 那样每天直接写在业务代码里，也不像接口和泛型那样有清晰的编译期约束。反射更像是一种“运行时观察能力”：程序运行起来以后，再去看一个值到底是什么类型、有哪些字段、字段上写了什么 tag，甚至在条件允许时修改它、调用它的方法。

神秘归神秘，反射并不罕见。你平时用的很多库背后都离不开它：

- `encoding/json` 根据结构体字段和 `json` tag 做序列化、反序列化；
- ORM 根据结构体字段和 `db` tag 映射数据库列；
- 配置绑定库把 YAML、TOML、INI、环境变量写入结构体；
- Web 框架把请求参数、路径参数、表单参数绑定到 handler 入参或结构体；
- 校验器读取 `validate` tag，决定字段是否必填、长度是否合法。

所以，学习反射不是为了在业务代码里到处“炫技”，而是为了理解这些框架为什么能做到“传一个结构体就自动工作”，以及在确实需要写通用工具时，知道该检查什么、避开什么坑。

## 反射适合什么，也会付出什么代价

反射适合处理**编译期无法完全确定类型**的问题。

比如写一个 JSON 库时，库作者不可能提前知道用户会定义哪些结构体：

```go
// 结构体字段上的 tag 会被 JSON、ORM 等库在运行时读取。
type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}
```

库只能在运行时拿到 `User`，再通过反射遍历字段、读取 tag、取出字段值。

但是反射也有代价：

- **类型检查变晚**：很多错误无法在编译期发现，只会在运行时 panic 或返回错误；
- **代码更复杂**：每一步都要检查 `Kind`、`IsValid`、`CanSet`、`CanInterface`；
- **性能通常更差**：反射调用和字段访问比普通代码慢，也可能带来额外分配；
- **可读性下降**：过度通用会让代码意图变模糊。

一句话：**能用普通类型、接口、泛型解决的问题，优先不用反射；反射更适合框架、工具、序列化、绑定、校验这类“处理未知类型”的场景。**

## 静态类型和动态类型

Go 是静态类型语言。普通变量在编译期就有确定类型：

```go
package main

import "fmt"

func main() {
	// age 的静态类型是 int。
	var age int = 18

	// 值可以变化，但类型不会从 int 变成 string。
	age = 20

	fmt.Println(age)
}
```

接口值稍微特殊一些。接口变量本身也有静态类型，但它里面可以保存不同的具体值：

```go
package main

import "fmt"

func main() {
	// any 是 interface{} 的别名，静态类型始终是 any。
	var value any

	// 每次赋值后，接口里保存的动态类型不同。
	value = 100
	fmt.Printf("值：%v，动态类型：%T\n", value, value)

	value = "hello"
	fmt.Printf("值：%v，动态类型：%T\n", value, value)

	value = true
	fmt.Printf("值：%v，动态类型：%T\n", value, value)
}
```

这里要分清两个概念：

- **静态类型**：变量在源码和编译期看到的类型，比如 `any`；
- **动态类型**：接口值在运行时实际保存的具体类型，比如 `int`、`string`、`bool`。

`reflect.TypeOf` 和 `reflect.ValueOf` 观察到的，正是接口里保存的动态类型和动态值。

## 底层直觉

理解反射，先记住一个简单直觉：**Go 的反射建立在 interface 的运行时信息之上。**

当我们写：

```go
func Inspect(v any) {
	// 这里的 v 是一个接口值。
}
```

调用者传入一个 `User`、`int` 或 `string` 时，这个具体值会被装进接口值里。一个非空接口值可以粗略理解成两部分：

```text
接口值 = 动态类型信息 + 动态值
```

例如：

```go
// 接口值里保存了 main.User 这个动态类型和对应的动态值。
var v any = User{Name: "张三"}
```

此时接口值里保存的信息可以直观理解为：

```text
动态类型：main.User
动态值：User{Name: "张三"}
```

`reflect` 包就是把这些运行时信息抽象成两个核心对象：

```go
// Type 和 Value 是 reflect 包最核心的两个抽象。
reflect.Type
reflect.Value
```

它们的关系大致是：

```text
interface{} 里的动态类型  -> reflect.Type
interface{} 里的动态值    -> reflect.Value
```

所以：

```go
// TypeOf 看动态类型，ValueOf 看动态值。
t := reflect.TypeOf(v)
val := reflect.ValueOf(v)
```

不是凭空“变魔法”，而是从接口值携带的运行时信息里抽象出类型视图和值视图。

这也解释了一个重要现象：反射函数通常接收 `any`。当普通值传给 `reflect.TypeOf` 或 `reflect.ValueOf` 时，它会先被放进接口，再从接口里取出动态类型和动态值。

## Type 和 Value

`reflect` 最核心的两个类型是：

| 类型 | 作用 |
| --- | --- |
| `reflect.Type` | 描述类型信息，比如类型名、Kind、字段、方法 |
| `reflect.Value` | 表示运行时值，比如取值、设置值、调用方法 |

最常用的入口函数是：

```go
// 这两个函数通常是进入反射世界的入口。
reflect.TypeOf(value)
reflect.ValueOf(value)
```

示例：

```go
package main

import (
	"fmt"
	"reflect"
)

func main() {
	value := 3.14

	// TypeOf 获取动态类型。
	t := reflect.TypeOf(value)

	// ValueOf 获取运行时值。
	v := reflect.ValueOf(value)

	fmt.Println("Type:", t)
	fmt.Println("Value:", v)
	fmt.Println("Value 的类型:", v.Type())
	fmt.Println("Value 的 Kind:", v.Kind())
}
```

输出类似：

```text
Type: float64
Value: 3.14
Value 的类型: float64
Value 的 Kind: float64
```

## Type、Name 和 Kind

反射里经常同时看到 `Type`、`Name`、`Kind`。它们不是一回事。

- `Type`：完整的具体类型；
- `Name`：已定义类型在包内的名字；
- `Kind`：底层分类，比如 `int64`、`struct`、`slice`、`pointer`。

看一个例子：

```go
package main

import (
	"fmt"
	"reflect"
)

// UserID 是一个有名字的自定义类型。
type UserID int64

func main() {
	var id UserID = 100

	t := reflect.TypeOf(id)

	fmt.Println("Type:", t)
	fmt.Println("Name:", t.Name())
	fmt.Println("Kind:", t.Kind())
}
```

输出类似：

```text
Type: main.UserID
Name: UserID
Kind: int64
```

`UserID` 和 `int64` 不是同一个类型，但它们的底层种类相同。所以在写通用逻辑时，我们经常用 `Kind` 判断“这是不是某类整数”，而用 `Type` 判断“它到底是不是某个具体类型”。

常见的 `Kind` 包括：

```text
Invalid
Bool
Int Int8 Int16 Int32 Int64
Uint Uint8 Uint16 Uint32 Uint64 Uintptr
Float32 Float64
Complex64 Complex128
Array Slice Map Struct
String
Chan Func Interface Pointer UnsafePointer
```

较新的 Go 文档使用 `reflect.Pointer` 表示指针种类；`reflect.Ptr` 是旧名称，很多老代码里仍然能看到。

## ValueOf、Interface 和 IsValid

`reflect.ValueOf` 会把普通值转换成 `reflect.Value`：

```go
package main

import (
	"fmt"
	"reflect"
)

func PrintValue(value any) {
	v := reflect.ValueOf(value)

	// ValueOf(nil) 会得到无效 Value，必须先检查。
	if !v.IsValid() {
		fmt.Println("无效值")
		return
	}

	// 先判断 Kind，再调用对应的取值方法。
	switch v.Kind() {
	case reflect.String:
		fmt.Println("字符串:", v.String())
	case reflect.Bool:
		fmt.Println("布尔值:", v.Bool())
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		fmt.Println("有符号整数:", v.Int())
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		fmt.Println("无符号整数:", v.Uint())
	case reflect.Float32, reflect.Float64:
		fmt.Println("浮点数:", v.Float())
	default:
		fmt.Println("暂不处理:", v.Type())
	}
}

func main() {
	PrintValue("Go")
	PrintValue(100)
	PrintValue(nil)
}
```

调用 `String()`、`Int()`、`Float()` 这类方法前，一定要先判断 `Kind`。比如对字符串调用 `Int()` 会 panic。

`Interface()` 可以把 `reflect.Value` 转回普通接口值：

```go
package main

import (
	"fmt"
	"reflect"
)

func main() {
	v := reflect.ValueOf(100)

	// Interface 将 reflect.Value 还原为 any。
	raw := v.Interface()

	// 再通过类型断言恢复为具体类型。
	number, ok := raw.(int)
	if !ok {
		fmt.Println("不是 int")
		return
	}

	fmt.Println(number + 1)
}
```

但是 `Interface()` 也不是永远安全。对于从未导出字段得到的值，调用 `Interface()` 可能 panic，所以通用代码要先检查：

```go
if v.CanInterface() {
	// 只有 CanInterface 为 true 时，才安全调用 Interface。
	value := v.Interface()
	fmt.Println(value)
}
```

## Elem：解开指针和接口

`Elem()` 用来“解开一层”指针或接口。

```go
package main

import (
	"fmt"
	"reflect"
)

func main() {
	number := 100

	// 这里拿到的是 *int 的 Value。
	v := reflect.ValueOf(&number)

	fmt.Println(v.Kind()) // pointer

	// Elem 取得指针指向的 int 值。
	elem := v.Elem()

	fmt.Println(elem.Kind()) // int
	fmt.Println(elem.Int())  // 100
}
```

`Elem()` 只能用于 `Pointer` 或 `Interface`。如果对 `int`、`string`、`struct` 直接调用 `Elem()`，会 panic。

处理通用参数时，可以写一个安全解引用函数：

```go
package main

import "reflect"

func indirect(v reflect.Value) reflect.Value {
	for v.IsValid() {
		switch v.Kind() {
		case reflect.Pointer, reflect.Interface:
			// IsNil 只能用于指针、接口、map、slice、chan、func 等 Kind。
			if v.IsNil() {
				return reflect.Value{}
			}

			// 每次只解开一层。
			v = v.Elem()
		default:
			return v
		}
	}

	return reflect.Value{}
}
```

## 通过反射修改值

反射可以读值，也可以改值。但能改的前提很严格：

- 必须操作原变量，而不是副本；
- 目标值必须可寻址；
- `CanSet()` 必须为 `true`；
- 如果是结构体字段，通常必须是导出字段。

直接传值不能修改原变量：

```go
package main

import (
	"fmt"
	"reflect"
)

func main() {
	number := 100

	// ValueOf(number) 得到的是 number 的副本。
	v := reflect.ValueOf(number)

	fmt.Println(v.CanSet()) // false

	// v.SetInt(200) 会 panic，因为 v 不可设置。
}
```

要修改原变量，需要传指针，再用 `Elem()` 找到指针指向的值：

```go
package main

import (
	"fmt"
	"reflect"
)

func main() {
	number := 100

	// 传入地址，反射值才能定位到原变量。
	v := reflect.ValueOf(&number)

	// Elem 取得原变量对应的 Value。
	elem := v.Elem()

	if elem.CanSet() && elem.Kind() == reflect.Int {
		// SetInt 根据 Kind 设置整数值。
		elem.SetInt(200)
	}

	fmt.Println(number) // 200
}
```

写一个稍微稳一点的通用设置函数：

```go
package main

import (
	"errors"
	"fmt"
	"reflect"
)

func SetString(target any, value string) error {
	v := reflect.ValueOf(target)

	// 通用反射函数要先检查值是否有效。
	if !v.IsValid() {
		return errors.New("目标值无效")
	}

	if v.Kind() != reflect.Pointer || v.IsNil() {
		return errors.New("目标必须是非 nil 指针")
	}

	elem := v.Elem()
	if !elem.CanSet() {
		return errors.New("目标不可修改")
	}

	if elem.Kind() != reflect.String {
		return fmt.Errorf("目标必须是 string，实际是 %s", elem.Type())
	}

	elem.SetString(value)
	return nil
}

func main() {
	name := "Go"

	if err := SetString(&name, "Go reflect"); err != nil {
		fmt.Println(err)
		return
	}

	fmt.Println(name)
}
```

除了 `SetString`，常见设置方法还有 `Set`、`SetBool`、`SetInt`、`SetUint`、`SetFloat`、`SetMapIndex`、`SetZero` 等。

使用通用的 `Set` 时，要检查类型能否赋值：

```go
func SetValue(target reflect.Value, newValue any) error {
	value := reflect.ValueOf(newValue)

	// Set 要求新值类型可以赋值给目标类型。
	if !value.Type().AssignableTo(target.Type()) {
		return fmt.Errorf("%s 不能赋值给 %s", value.Type(), target.Type())
	}

	target.Set(value)
	return nil
}
```

## 遍历结构体字段

结构体是反射最常见的应用对象。我们可以通过 `Type.Field(i)` 拿字段元信息，通过 `Value.Field(i)` 拿字段值。

```go
package main

import (
	"fmt"
	"reflect"
)

type User struct {
	ID   int
	Name string
	Age  int
}

func InspectStruct(value any) {
	t := reflect.TypeOf(value)
	v := reflect.ValueOf(value)

	if t == nil || t.Kind() != reflect.Struct {
		fmt.Println("传入值不是结构体")
		return
	}

	for i := 0; i < t.NumField(); i++ {
		// StructField 描述字段的元信息。
		fieldInfo := t.Field(i)

		// Field(i) 得到字段对应的运行时值。
		fieldValue := v.Field(i)

		fmt.Printf("字段名=%s 类型=%s Kind=%s", fieldInfo.Name, fieldInfo.Type, fieldInfo.Type.Kind())

		// 未导出字段可能不能 Interface。
		if fieldValue.CanInterface() {
			fmt.Printf(" 值=%v", fieldValue.Interface())
		}

		fmt.Println()
	}
}

func main() {
	user := User{ID: 1, Name: "张三", Age: 20}
	InspectStruct(user)
}
```

`reflect.StructField` 常用信息包括：

| 字段 | 含义 |
| --- | --- |
| `Name` | 字段名 |
| `Type` | 字段类型 |
| `Tag` | 结构体标签 |
| `Anonymous` | 是否为嵌入字段 |
| `Index` | 字段索引路径 |
| `Offset` | 字段在结构体中的字节偏移 |
| `PkgPath` | 未导出字段所属包路径 |

按名称查找字段也很常见：

```go
package main

import (
	"fmt"
	"reflect"
)

type User struct {
	Name string
}

func main() {
	user := User{Name: "张三"}
	v := reflect.ValueOf(user)

	// 字段不存在时，FieldByName 返回无效 Value。
	field := v.FieldByName("Name")
	if !field.IsValid() {
		fmt.Println("字段不存在")
		return
	}

	if field.CanInterface() {
		fmt.Println(field.Interface())
	}
}
```

## 读取结构体 tag

结构体 tag 是写在字段类型后面的元数据：

```go
// tag 是字段类型后面的字符串元数据。
type User struct {
	ID   int    `json:"id" db:"id"`
	Name string `json:"name,omitempty" db:"name"`
}
```

tag 本身不会自动改变字段行为。真正读取并解释 tag 的，是 `encoding/json`、ORM、配置库、校验库或者我们自己写的反射代码。

读取 tag：

```go
package main

import (
	"fmt"
	"reflect"
)

type User struct {
	ID   int    `json:"id" db:"id"`
	Name string `json:"name,omitempty" db:"name"`
}

func main() {
	t := reflect.TypeOf(User{})

	field, ok := t.FieldByName("Name")
	if !ok {
		fmt.Println("字段不存在")
		return
	}

	// Get 读取指定 key 的 tag 值。
	fmt.Println("json:", field.Tag.Get("json"))
	fmt.Println("db:", field.Tag.Get("db"))

	// Lookup 可以区分“没有这个 tag”和“tag 值为空字符串”。
	value, exists := field.Tag.Lookup("validate")
	fmt.Println("validate:", value, "exists:", exists)
}
```

`Get` 和 `Lookup` 的区别：

- `Get("json")`：没有 tag 或 tag 值为空时，都返回 `""`；
- `Lookup("json")`：返回 `(value, true)` 或 `("", false)`，能判断 tag 是否存在。

如果 tag 带选项，比如：

```go
// json tag 里逗号前通常是字段名，逗号后通常是选项。
Name string `json:"name,omitempty"`
```

读取到的是完整字符串：

```text
name,omitempty
```

可以自己拆：

```go
package main

import (
	"fmt"
	"strings"
)

func main() {
	tag := "name,omitempty"

	// 常见约定是逗号前为字段名，逗号后为选项。
	parts := strings.Split(tag, ",")

	fmt.Println("字段名:", parts[0])
	fmt.Println("选项:", parts[1:])
}
```

## 通过反射修改结构体字段

修改结构体字段时，通常要传入结构体指针：

```go
package main

import (
	"errors"
	"fmt"
	"reflect"
)

type User struct {
	Name string
	Age  int
}

func SetField(target any, fieldName string, newValue any) error {
	v := reflect.ValueOf(target)

	if !v.IsValid() {
		return errors.New("目标值无效")
	}

	if v.Kind() != reflect.Pointer || v.IsNil() {
		return errors.New("目标必须是非 nil 指针")
	}

	v = v.Elem()
	if v.Kind() != reflect.Struct {
		return errors.New("目标必须指向结构体")
	}

	field := v.FieldByName(fieldName)
	if !field.IsValid() {
		return fmt.Errorf("字段 %q 不存在", fieldName)
	}

	if !field.CanSet() {
		return fmt.Errorf("字段 %q 不可修改", fieldName)
	}

	value := reflect.ValueOf(newValue)
	if !value.IsValid() {
		return errors.New("新值无效")
	}

	if !value.Type().AssignableTo(field.Type()) {
		return fmt.Errorf("不能把 %s 赋值给 %s", value.Type(), field.Type())
	}

	field.Set(value)
	return nil
}

func main() {
	user := User{Name: "张三", Age: 20}

	// 传入 &user，才能修改原结构体。
	if err := SetField(&user, "Name", "李四"); err != nil {
		fmt.Println(err)
		return
	}

	fmt.Printf("%+v\n", user)
}
```

注意：未导出字段通常不能通过普通反射修改。

```go
type User struct {
	name string // 小写字段是未导出字段，CanSet 通常为 false。
}
```

实际业务代码里不要用 `unsafe` 强行绕过这个限制。封装边界一旦被破坏，后续维护会非常痛苦。

## 反射调用方法

反射可以通过方法名查找方法，并用 `Call` 调用。

```go
package main

import (
	"fmt"
	"reflect"
)

type User struct {
	Name string
}

func (u User) Hello(to string) string {
	return u.Name + " 对 " + to + " 说 hello"
}

func main() {
	user := User{Name: "张三"}
	v := reflect.ValueOf(user)

	// MethodByName 找不到方法时返回无效 Value。
	method := v.MethodByName("Hello")
	if !method.IsValid() {
		fmt.Println("方法不存在")
		return
	}

	// Call 的参数和返回值都是 []reflect.Value。
	args := []reflect.Value{
		reflect.ValueOf("李四"),
	}

	results := method.Call(args)

	// 先检查返回值数量，再读取结果。
	if len(results) > 0 && results[0].CanInterface() {
		fmt.Println(results[0].Interface())
	}
}
```

`Call` 很容易 panic，常见原因是：

- 调用对象不是函数或方法；
- 参数数量不对；
- 参数类型不能赋值给形参类型；
- 方法不存在，却直接对无效 `Value` 调用 `Call`。

通用框架通常还会读取方法签名：

```go
methodType := method.Type()

// NumIn 是参数个数，NumOut 是返回值个数。
fmt.Println(methodType.NumIn())
fmt.Println(methodType.NumOut())
```

还要注意值接收者和指针接收者：

```go
// 值接收者和指针接收者会影响反射能找到的方法集。
type Counter struct {
	N int
}

func (c Counter) ValueMethod() {}

func (c *Counter) PointerMethod() {
	c.N++
}
```

如果只拿到 `reflect.ValueOf(Counter{})`，通常只能找到值接收者方法。要调用指针接收者方法，应传入指针：

```go
counter := Counter{}

// 指针接收者方法属于 *Counter 的方法集。
method := reflect.ValueOf(&counter).MethodByName("PointerMethod")
if method.IsValid() {
	method.Call(nil)
}
```

## 常见 panic 清单

反射的错误很多都发生在运行时。写通用代码时，下面这些检查要变成肌肉记忆：

| 场景 | 错误写法 | 应该先检查 |
| --- | --- | --- |
| `TypeOf(nil)` | `reflect.TypeOf(v).Kind()` | `t == nil` |
| `ValueOf(nil)` | `reflect.ValueOf(nil).Type()` | `v.IsValid()` |
| 取值方法不匹配 | `reflect.ValueOf("x").Int()` | `v.Kind()` |
| 修改副本 | `reflect.ValueOf(n).SetInt(1)` | 传指针，检查 `CanSet()` |
| 错误调用 `Elem` | `reflect.ValueOf(1).Elem()` | `Kind` 是否为 `Pointer` 或 `Interface` |
| 空指针 `Elem` | `reflect.ValueOf(p).Elem()` | `v.IsNil()` |
| 读取未导出字段 | `field.Interface()` | `field.CanInterface()` |
| 修改不存在字段 | `v.FieldByName("X").Set(...)` | `field.IsValid()` |
| 方法调用参数错误 | `method.Call(args)` | `method.Type()`、参数数量和类型 |

一个非常实用的反射检查顺序是：

```text
值有效吗？
类型或 Kind 对吗？
指针是不是 nil？
字段或方法存在吗？
这个值能 Interface 吗？
这个值能 Set 吗？
新值类型能赋过去吗？
```

## 什么时候不用反射

反射不是“更高级的写法”，它只是解决特殊问题的工具。

如果类型确定，直接写普通代码：

```go
func PrintUser(user User) {
	// 类型明确时，直接访问字段最清楚。
	fmt.Println(user.Name)
}
```

如果只需要统一调用行为，用接口：

```go
type Printer interface {
	Print()
}

func PrintAll(values []Printer) {
	for _, value := range values {
		// 接口调用有编译期约束，比反射查方法安全。
		value.Print()
	}
}
```

如果是同一种算法处理多种类型，优先考虑泛型：

```go
func Contains[T comparable](values []T, target T) bool {
	for _, value := range values {
		// 泛型保留了编译期类型检查。
		if value == target {
			return true
		}
	}

	return false
}
```

反射更适合这些问题：

- 写序列化或反序列化库；
- 根据结构体 tag 做配置绑定；
- 根据结构体字段生成 SQL；
- 写校验器、依赖注入容器、测试工具；
- 框架需要接收用户定义的任意结构体或函数。

## 综合示例：一个迷你配置绑定器

下面写一个很小的配置绑定函数，把 `map[string]string` 里的值写入结构体字段。它支持 `string`、整数、浮点数、布尔值，并读取字段上的 `config` tag。

```go
package main

import (
	"errors"
	"fmt"
	"reflect"
	"strconv"
)

type AppConfig struct {
	Host  string  `config:"host"`
	Port  int     `config:"port"`
	Debug bool    `config:"debug"`
	Ratio float64 `config:"ratio"`
}

func BindConfig(data map[string]string, target any) error {
	v := reflect.ValueOf(target)
	if !v.IsValid() {
		return errors.New("目标值无效")
	}

	if v.Kind() != reflect.Pointer || v.IsNil() {
		return errors.New("目标必须是非 nil 指针")
	}

	v = v.Elem()
	if v.Kind() != reflect.Struct {
		return errors.New("目标必须指向结构体")
	}

	t := v.Type()

	for i := 0; i < t.NumField(); i++ {
		fieldInfo := t.Field(i)
		fieldValue := v.Field(i)

		// 没有 config tag 的字段跳过。
		key, ok := fieldInfo.Tag.Lookup("config")
		if !ok || key == "" {
			continue
		}

		text, ok := data[key]
		if !ok {
			continue
		}

		if !fieldValue.CanSet() {
			return fmt.Errorf("字段 %s 不可修改", fieldInfo.Name)
		}

		if err := setFromString(fieldValue, text); err != nil {
			return fmt.Errorf("设置字段 %s 失败: %w", fieldInfo.Name, err)
		}
	}

	return nil
}

func setFromString(field reflect.Value, text string) error {
	switch field.Kind() {
	case reflect.String:
		field.SetString(text)
		return nil

	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		// Bits 返回目标整数类型的位数，比如 int32 是 32。
		number, err := strconv.ParseInt(text, 10, field.Type().Bits())
		if err != nil {
			return err
		}

		field.SetInt(number)
		return nil

	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		number, err := strconv.ParseUint(text, 10, field.Type().Bits())
		if err != nil {
			return err
		}

		field.SetUint(number)
		return nil

	case reflect.Float32, reflect.Float64:
		number, err := strconv.ParseFloat(text, field.Type().Bits())
		if err != nil {
			return err
		}

		field.SetFloat(number)
		return nil

	case reflect.Bool:
		value, err := strconv.ParseBool(text)
		if err != nil {
			return err
		}

		field.SetBool(value)
		return nil

	default:
		return fmt.Errorf("不支持的字段类型: %s", field.Type())
	}
}

func main() {
	data := map[string]string{
		"host":  "127.0.0.1",
		"port":  "8080",
		"debug": "true",
		"ratio": "0.75",
	}

	var config AppConfig

	if err := BindConfig(data, &config); err != nil {
		fmt.Println("绑定失败:", err)
		return
	}

	fmt.Printf("%+v\n", config)
}
```

这个例子把前面的知识串起来了：

- `ValueOf` 获取目标值；
- `Kind` 判断是不是结构体指针；
- `Elem` 解开指针；
- `Type` 和 `Value` 配合遍历字段；
- `StructField.Tag.Lookup` 读取 tag；
- `CanSet` 判断字段能否修改；
- 根据字段 `Kind` 做字符串转换；
- 使用 `SetString`、`SetInt`、`SetFloat`、`SetBool` 写回结构体。

练习时可以继续扩展：

- 支持 `time.Duration`；
- 支持必填字段，比如 `config:"host,required"`；
- 支持默认值 tag，比如 `default:"8080"`；
- 报错时带上字段名、tag 名和值；
- 支持嵌套结构体。

## 总结

`reflect` 的核心是两件事：

- `reflect.Type`：从运行时信息里抽象出的类型视图；
- `reflect.Value`：从运行时信息里抽象出的值视图。

反射建立在接口值携带的动态类型和动态值之上。`TypeOf` 观察动态类型，`ValueOf` 观察动态值；`Kind` 看底层分类；`Interface` 把反射值还原成普通接口；`Elem` 解开指针或接口；`CanInterface`、`CanSet`、`IsValid` 则是避免 panic 的关键检查。

写反射代码最重要的不是背 API，而是养成谨慎的运行时检查习惯：先确认有效，再确认 Kind，再确认可读、可改、可调用。普通业务代码里优先选择明确类型、接口和泛型；当你真的要写 JSON、ORM、配置绑定、参数绑定、校验器这类通用工具时，反射才是那把合适的钥匙。
