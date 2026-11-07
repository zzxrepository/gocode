---
permalink: /backend/go/basic/06-map/
title: 07. 映射（Map）
shortTitle: 07. 映射（Map）
order: 7
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - Map
  - map
  - 键值对
  - 遍历
  - 增删改查
---

# 07. 映射（Map）

## 前言

映射 `map` 用于保存键值对。每个键对应一个值，可以通过键快速查找、更新或删除相应数据。

Map 常用于：

- 保存用户信息；
- 统计元素出现次数；
- 建立名称与对象之间的对应关系；
- 实现缓存；
- 对数据进行分组。

## 7.1 Map 类型

Map 类型的语法如下：

```go
map[键类型]值类型
```

例如：

```go
map[string]int
map[int]string
map[string]bool
map[string][]int
```

下面定义了一个从姓名到成绩的映射：

```go
var scores map[string]int
```

其中：

- `string` 是键类型；
- `int` 是值类型。

Map 的键和值可以使用不同类型，但同一个 Map 中所有键的类型必须相同，所有值的类型也必须相同。

------

## 7.2 Map 键类型的要求

Map 的键必须是可以使用 `==` 和 `!=` 比较的类型。

常见的合法键类型包括：

- 布尔类型；
- 整数；
- 浮点数；
- 字符串；
- 指针；
- Channel；
- 数组；
- 字段均可比较的结构体。

例如：

```go
map[string]int
map[int]string
map[[2]int]string
```

切片、Map 和函数不能直接作为 Map 的键：

```go
// 错误：切片不能作为 Map 的键
var m map[[]int]string
```

如果需要使用多个字段共同作为键，可以定义结构体：

```go
type Coordinate struct {
    X int
    Y int
}

locations := map[Coordinate]string{
    {X: 1, Y: 2}: "入口",
    {X: 3, Y: 4}: "出口",
}
```

------

## 7.3 创建和初始化 Map

### 7.3.1 声明 Map

```go
var scores map[string]int
```

此时 `scores` 的值为 `nil`。

```go
fmt.Println(scores == nil) // true
fmt.Println(len(scores))   // 0
```

可以从 `nil` Map 中读取数据：

```go
fmt.Println(scores["Alice"]) // 0
```

也可以执行遍历和删除操作，但不能直接写入：

```go
scores["Alice"] = 90
```

上面的代码会在运行时产生错误：

```text
assignment to entry in nil map
```

因此，写入前必须初始化 Map。

### 7.3.2 使用 make 创建 Map

```go
scores := make(map[string]int)
```

也可以提供一个预计元素数量：

```go
scores := make(map[string]int, 100)
```

这里的 `100` 只是容量提示，用于帮助运行时提前分配空间：

- 它不是最大容量；
- Map 可以继续添加更多元素；
- 不能使用 `cap(scores)` 查询容量。

### 7.3.3 使用 Map 字面量

```go
scores := map[string]int{
    "Alice": 90,
    "Bob":   85,
    "Carol": 96,
}
```

创建空 Map 也可以写成：

```go
scores := map[string]int{}
```

它与 `nil` Map 不同，可以直接写入：

```go
scores["Alice"] = 90
```

------

## 7.4 添加和修改键值对

向 Map 中写入数据：

```go
map变量[键] = 值
```

例如：

```go
scores := make(map[string]int)

scores["Alice"] = 90
scores["Bob"] = 85
```

如果键不存在，会添加新的键值对：

```go
scores["Carol"] = 96
```

如果键已经存在，会覆盖原来的值：

```go
scores["Alice"] = 100
```

Map 中不能存在两个相同的键。再次为同一个键赋值，会更新该键对应的值。

------

## 7.5 读取数据和判断键是否存在

可以通过键读取对应的值：

```go
score := scores["Alice"]
```

当键不存在时，Map 会返回值类型的零值：

```go
scores := map[string]int{
    "Alice": 90,
}

fmt.Println(scores["Bob"]) // 0
```

仅通过返回值无法区分以下两种情况：

1. `"Bob"` 不存在；
2. `"Bob"` 存在，但对应的成绩确实为 `0`。

因此，Go 提供了双返回值写法：

```go
value, ok := scores[key]
```

其中：

- `value` 是对应的值；
- `ok` 表示键是否存在。

例如：

```go
score, ok := scores["Bob"]

if ok {
    fmt.Println("Bob 的成绩是", score)
} else {
    fmt.Println("没有 Bob 的成绩")
}
```

也可以将变量声明写入 `if`：

```go
if score, ok := scores["Alice"]; ok {
    fmt.Println("Alice 的成绩是", score)
}
```

当不需要值，只需要判断键是否存在时：

```go
if _, ok := scores["Alice"]; ok {
    fmt.Println("Alice 存在")
}
```

------

## 7.6 删除和清空 Map

使用内置函数 `delete` 删除键值对：

```go
delete(map变量, 键)
```

例如：

```go
scores := map[string]int{
    "Alice": 90,
    "Bob":   85,
}

delete(scores, "Bob")

fmt.Println(len(scores)) // 1
```

如果键不存在，`delete` 不会产生错误：

```go
delete(scores, "Unknown")
```

对 `nil` Map 执行 `delete` 也是安全的。

### 7.6.1 清空 Map

可以使用内置函数 `clear` 删除 Map 中的全部键值对：

```go
clear(scores)

fmt.Println(len(scores)) // 0
```

也可以重新创建一个 Map：

```go
scores = make(map[string]int)
```

二者的语义略有不同：

- `clear(scores)` 清除当前 Map 中的元素；
- 重新赋值会让变量指向一个新的 Map。

如果还有其他变量引用原 Map，重新赋值不会清除其他变量看到的内容。

------

## 7.7 遍历 Map

使用 `for range` 遍历 Map：

```go
scores := map[string]int{
    "Alice": 90,
    "Bob":   85,
    "Carol": 96,
}

for name, score := range scores {
    fmt.Println(name, score)
}
```

只遍历键：

```go
for name := range scores {
    fmt.Println(name)
}
```

只使用值时：

```go
for _, score := range scores {
    fmt.Println(score)
}
```

### 7.7.1 Map 的遍历顺序

Map 的遍历顺序没有定义，不能依赖元素的插入顺序。

下面的输出顺序可能在不同运行过程中发生变化：

```go
for name, score := range scores {
    fmt.Println(name, score)
}
```

如果需要按照键排序，应先提取键：

```go
package main

import (
    "fmt"
    "sort"
)

func main() {
    scores := map[string]int{
        "Carol": 96,
        "Alice": 90,
        "Bob":   85,
    }

    names := make([]string, 0, len(scores))

    for name := range scores {
        names = append(names, name)
    }

    sort.Strings(names)

    for _, name := range names {
        fmt.Println(name, scores[name])
    }
}
```

运行结果：

```text
Alice 90
Bob 85
Carol 96
```

------

## 7.8 Map 的赋值和函数传递

Map 变量赋值后，两个变量会共享同一组底层数据：

```go
scores1 := map[string]int{
    "Alice": 90,
}

scores2 := scores1
scores2["Alice"] = 100

fmt.Println(scores1["Alice"]) // 100
fmt.Println(scores2["Alice"]) // 100
```

Map 作为函数参数传递时，也可以在函数中修改其中的键值对：

```go
package main

import "fmt"

func update(scores map[string]int) {
    scores["Alice"] = 100
}

func main() {
    scores := map[string]int{
        "Alice": 90,
    }

    update(scores)

    fmt.Println(scores["Alice"]) // 100
}
```

通常不需要传递 `*map[K]V` 指针。

只有当函数需要让调用方的 Map 变量本身指向另一个 Map 时，才可能考虑返回新的 Map 或使用指针。

------

## 7.9 Map 的值是结构体时

Map 元素不能直接取得地址，因此当值类型是结构体时，不能直接修改其中的字段。

例如：

```go
type User struct {
    Name string
    Age  int
}

users := map[string]User{
    "001": {
        Name: "Alice",
        Age:  20,
    },
}

// 错误
users["001"].Age = 21
```

正确方式之一是先取出值，修改后再放回 Map：

```go
user := users["001"]
user.Age = 21
users["001"] = user
```

另一种方式是让 Map 保存结构体指针：

```go
users := map[string]*User{
    "001": {
        Name: "Alice",
        Age:  20,
    },
}

users["001"].Age = 21
```

使用指针值时，需要注意可能出现 `nil` 指针。

------

## 7.10 复合数据结构

Map 和切片可以相互组合，构造更复杂的数据结构。

### 7.10.1 值为切片的 Map

```go
cities := make(map[string][]string)

cities["中国"] = append(
    cities["中国"],
    "北京",
    "上海",
)

cities["日本"] = append(
    cities["日本"],
    "东京",
    "大阪",
)
```

读取不存在的键时会得到 `nil` 切片，而 `append` 可以直接处理 `nil` 切片，因此无需预先判断：

```go
cities["中国"] = append(cities["中国"], "广州")
```

下面的写法先判断键是否存在，再初始化切片：

```go
value, ok := sliceMap[key]

if !ok {
    value = make([]string, 0, 2)
}

value = append(value, "北京", "上海")
sliceMap[key] = value
```

直接写成：

```go
sliceMap[key] = append(
    sliceMap[key],
    "北京",
    "上海",
)
```

### 7.10.2 元素为 Map 的切片

```go
users := make([]map[string]string, 3)
```

此时只创建了外层切片，其中每个 Map 元素仍然是 `nil`：

```go
fmt.Println(users[0] == nil) // true
```

写入前需要初始化：

```go
users[0] = make(map[string]string)

users[0]["name"] = "Alice"
users[0]["city"] = "Singapore"
```

### 7.10.3 嵌套 Map

```go
scores := map[string]map[string]int{
    "classA": {
        "Alice": 90,
        "Bob":   85,
    },
}
```

动态添加内层数据时，需要先确保内层 Map 已初始化：

```go
if scores["classB"] == nil {
    scores["classB"] = make(map[string]int)
}

scores["classB"]["Carol"] = 96
```

------

## 7.11 复制 Map

Map 赋值不会复制全部键值对：

```go
copyMap := originalMap
```

这样只会让两个变量共享同一个 Map。

如果需要独立副本，应逐项复制：

```go
source := map[string]int{
    "Alice": 90,
    "Bob":   85,
}

destination := make(
    map[string]int,
    len(source),
)

for key, value := range source {
    destination[key] = value
}
```

修改 `destination` 后，不会影响 `source`：

```go
destination["Alice"] = 100

fmt.Println(source["Alice"])      // 90
fmt.Println(destination["Alice"]) // 100
```

如果 Map 的值包含切片、Map、指针等数据，上面的操作仍然只是浅复制。是否需要深复制取决于具体数据结构。

------

## 7.12 Map 的并发访问

普通 Map 不支持无同步的并发读写。

下面的情况是不安全的：

- 一个 Goroutine 写入，另一个 Goroutine 读取；
- 多个 Goroutine 同时写入；
- 遍历 Map 的同时，其他 Goroutine 修改 Map。

例如：

```go
scores := make(map[string]int)

go func() {
    scores["Alice"] = 90
}()

go func() {
    fmt.Println(scores["Alice"])
}()
```

在并发环境中，应使用同步机制，例如：

```go
type SafeScores struct {
    mu     sync.RWMutex
    scores map[string]int
}
```

读取时使用读锁：

```go
s.mu.RLock()
score := s.scores["Alice"]
s.mu.RUnlock()
```

写入时使用写锁：

```go
s.mu.Lock()
s.scores["Alice"] = 90
s.mu.Unlock()
```

标准库还提供了 `sync.Map`，但它更适合特定的并发访问场景，不应作为普通 Map 的默认替代品。

------

## 7.13 Map 的常见问题

### 7.13.1 向 nil Map 写入数据

错误：

```go
var scores map[string]int
scores["Alice"] = 90
```

正确：

```go
scores := make(map[string]int)
scores["Alice"] = 90
```

### 7.13.2 只读取值，不判断键是否存在

```go
score := scores["Alice"]
```

当零值具有实际业务含义时，应使用：

```go
score, ok := scores["Alice"]
```

### 7.13.3 依赖 Map 遍历顺序

Map 遍历顺序没有定义。需要固定顺序时，应提取并排序键。

### 7.13.4 将 Map 的容量参数理解为上限

```go
make(map[string]int, 100)
```

`100` 只是容量提示，不是最大元素数量。

### 7.13.5 直接修改结构体类型的 Map 元素

错误：

```go
users["001"].Age++
```

应当取出、修改并重新赋值，或者保存结构体指针。

### 7.13.6 在多个 Goroutine 中直接修改同一个 Map

并发访问 Map 时需要使用锁、Channel 或其他同步机制。

------

## 总结

Map 的核心是：

```go
var data map[K]V

data := make(map[K]V)

data[key] = value

value, ok := data[key]

delete(data, key)

for key, value := range data {
}
```

学习 Map 时需要重点理解：

- 键必须是可比较类型；
- `nil` Map 可以读取但不能写入；
- 读取不存在的键会得到零值；
- 使用双返回值判断键是否存在；
- 遍历顺序没有定义；
- Map 赋值和函数传递会共享底层数据；
- 普通 Map 不能进行无同步的并发读写。
