---
title: 03. encoding：JSON 与 XML
shortTitle: 03. encoding：JSON 与 XML
order: 3
dir:
  link: true
  collapsible: true
  order: 3
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - encoding
  - JSON
  - XML
  - 序列化
  - 反序列化
---

# 03. encoding：JSON 与 XML

## 前言

![Go encoding JSON 与 XML 封面](/assets/image/go-encoding-cover.png)

写后端服务时，我们几乎每天都在和“数据格式”打交道。

当前端提交一个创建用户的请求，通常是 JSON；服务 A 调用服务 B，传过去的请求体也常常是 JSON；程序启动时读取配置文件，可能是 JSON、XML、YAML 或 TOML；对接一些历史系统、支付渠道、行业平台时，还可能遇到 XML。

也就是说，后端服务经常需要和前端、其他服务、配置文件交换数据。**JSON 是现代 Web 后端里的主角**，它简单、通用、生态成熟。不过在一些旧系统、SOAP 接口、行业协议和配置文件中，仍然可能遇到 XML，所以这一部分对 XML 做基本了解即可。

这一节我们重点学习 Go 标准库里的 `encoding/json`，顺带把 `encoding/xml` 的基本用法串起来。学完以后，你应该能写出可靠的 JSON 请求解析、JSON 响应输出，也能看懂 XML 的结构体映射方式。为了不只停留在“会调 API”，这一节还会穿插看一点标准库源码主线，理解 `json` tag、字段匹配、`UseNumber`、`DisallowUnknownFields` 这些行为为什么会这样。

本文源码解读基于 **Go 1.26.5**，你可以对照官方源码阅读：[encoding/json](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/json/) 和 [encoding/xml](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/xml/)。

## encoding 包族是什么

Go 标准库里有一组和编码、解码相关的包，很多都放在 `encoding` 目录下。

常见的有：

| 包 | 作用 |
| --- | --- |
| `encoding/json` | JSON 编码和解码 |
| `encoding/xml` | XML 编码和解码 |
| `encoding/csv` | CSV 读写 |
| `encoding/base64` | Base64 编码和解码 |
| `encoding/hex` | 十六进制编码和解码 |
| `encoding/binary` | 二进制数据和数字之间的转换 |
| `encoding/gob` | Go 自带的二进制序列化格式 |

这里的“编码”可以先理解成：**把 Go 里的值转换成某种外部格式**。而“解码”则反过来：**把外部格式转换成 Go 里的值**。

### 为什么需要编码和解码

为什么需要这一步？因为程序内部和外部世界使用的“数据形态”并不一样。

在 Go 程序内部，我们更愿意使用结构体、切片、map、整数、布尔值这些强类型数据。它们有明确的字段和类型，写业务逻辑时更安全，也更容易被 IDE 和编译器检查。

但是 HTTP 请求、HTTP 响应、配置文件、消息队列、日志文件、网络连接里传输的内容，本质上都是字节。前端不会直接把一个 Go 结构体传给后端，后端也不能直接把内存里的 `User` 结构体原样发给浏览器。双方需要约定一种中间格式，比如 JSON 或 XML。

所以编解码解决的是这个转换问题：

```text
Go 内存里的结构体、map、切片
  -> 编码
  -> JSON / XML / CSV 等外部格式
  -> 网络、文件、消息队列传输

JSON / XML / CSV 等外部格式
  -> 解码
  -> Go 内存里的结构体、map、切片
  -> 继续写业务逻辑
```

比如：

```go
user := User{Name: "张三", Age: 18}

// 编码：Go 结构体 -> JSON 字节
data, err := json.Marshal(user)

// 解码：JSON 字节 -> Go 结构体
err = json.Unmarshal(data, &user)
```

这一节先不展开所有 encoding 包。做后端开发时，最先要掌握的是 `encoding/json`，因为绝大多数 HTTP API 都会用 JSON 作为请求和响应格式。

## JSON 基础

在介绍 `encoding/json` 之前，我们先了解一下 JSON。JSON 是一种文本数据格式，全称是 JavaScript Object Notation。

它常见的数据类型包括：

| JSON 类型 | 示例 |
| --- | --- |
| 对象 | `{"name":"张三"}` |
| 数组 | `["Go","MySQL"]` |
| 字符串 | `"hello"` |
| 数字 | `18`、`3.14` |
| 布尔值 | `true`、`false` |
| 空值 | `null` |

一个常见的 JSON 请求长这样：

```json
{
  "name": "张三",
  "age": 18,
  "active": true,
  "skills": ["Go", "MySQL"]
}
```

在 Go 里，我们一般会用结构体表示这类有固定字段的数据：

```go
type User struct {
	ID     int64    `json:"id"`
	Name   string   `json:"name"`
	Age    int      `json:"age"`
	Active bool     `json:"active"`
	Skills []string `json:"skills"`
}
```

结构体字段后面的 `` `json:"name"` `` 叫做 struct tag。它用来告诉 `encoding/json`：这个 Go 字段和 JSON 里的哪个字段对应。

不过，在正式使用 `Marshal` 和 `Unmarshal` 之前，需要先补一个非常重要的前提：`encoding/json` 并不是结构体里所有字段都能访问，它只能处理导出字段。

## 导出字段规则

`encoding/json` 只能访问结构体里的导出字段。

在 Go 里，字段名首字母大写表示导出，首字母小写表示不导出。这个规则我们在结构体章节已经见过，这里要把它和 JSON 映射联系起来看。

```go
type User struct {
	Name string `json:"name"` // 导出字段，可以被编码和解码
	age  int    `json:"age"`  // 未导出字段，encoding/json 会忽略
}
```

即使给未导出字段写了 tag，`encoding/json` 也不能访问它。

```go
user := User{Name: "张三", age: 18}

data, _ := json.Marshal(user)
fmt.Println(string(data))
```

输出里只有 `name`：

```json
{"name":"张三"}
```

这里不是 `json:"age"` 写错了，而是 `age` 本身没有导出。`encoding/json` 的底层依赖反射，反射也必须遵守 Go 的导出规则，所以小写字段不会被它当作可读写的 JSON 字段。

所以，想让 JSON 包处理某个结构体字段，字段名必须导出。确认了这个前提后，我们再看最常见的两件事：把 Go 值编码成 JSON，以及把 JSON 解码回 Go 值。

## 使用 Marshal 编码 JSON

`json.Marshal` 用来把 Go 值编码成 JSON。它最常见的用途是生成 HTTP 响应、写 JSON 配置文件，或者把数据发给其他服务。

函数签名是：

```go
func Marshal(v any) ([]byte, error)
```

它接收任意 Go 值，返回 JSON 字节切片和错误。

示例：

```go
package main

import (
	"encoding/json"
	"fmt"
)

type User struct {
	ID     int64    `json:"id"`
	Name   string   `json:"name"`
	Age    int      `json:"age"`
	Skills []string `json:"skills"`
}

func main() {
	user := User{
		ID:     1001,
		Name:   "张三",
		Age:    18,
		Skills: []string{"Go", "MySQL"},
	}

	// Marshal 会把 Go 结构体编码成紧凑的 JSON。
	data, err := json.Marshal(user)
	if err != nil {
		fmt.Println("marshal user:", err)
		return
	}

	// data 是 []byte，打印前通常转成 string。
	fmt.Println(string(data))
}
```

输出结果类似：

```json
{"id":1001,"name":"张三","age":18,"skills":["Go","MySQL"]}
```

注意，`json.Marshal` 返回的是 `[]byte`，不是 `string`。因为在网络、文件和 HTTP 响应里，数据本质上都是字节流。

### 使用 MarshalIndent 输出格式化 JSON

`json.Marshal` 生成的是紧凑 JSON，适合网络传输。

如果想在日志、调试信息、配置文件里输出更容易阅读的 JSON，可以用 `json.MarshalIndent`。

```go
package main

import (
	"encoding/json"
	"fmt"
)

type User struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Age  int    `json:"age"`
}

func main() {
	user := User{ID: 1001, Name: "张三", Age: 18}

	// 第二个参数是每一行前缀，第三个参数是缩进内容。
	data, err := json.MarshalIndent(user, "", "  ")
	if err != nil {
		fmt.Println("marshal indent:", err)
		return
	}

	fmt.Println(string(data))
}
```

输出：

```json
{
  "id": 1001,
  "name": "张三",
  "age": 18
}
```

后端接口返回给前端时，一般不需要格式化；命令行工具、配置生成器、调试输出里更适合用 `MarshalIndent`。

### Marshal 源码主线

从使用者视角看，`json.Marshal(user)` 好像只是把一个结构体变成 JSON 字符串。但在标准库内部，它做的是一件更底层的事情：**拿到任意 Go 值以后，通过反射识别它的真实类型，再选择对应的编码器把它写入缓冲区**。

下面的源码解读参考的是 Go 1.26.5 稳定版官方源码中的 [`src/encoding/json/encode.go`](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/json/encode.go)。为了方便理解，代码片段会保留主线逻辑，省略一部分错误包装和边界处理，并加上中文注释：

```go
func Marshal(v any) ([]byte, error) {
	// 取一个编码状态对象。它内部有缓冲区，用来逐步拼出 JSON。
	e := newEncodeState()

	// 用完以后放回池里，减少高频 Marshal 时的内存分配。
	defer encodeStatePool.Put(e)

	// 真正编码入口。escapeHTML 为 true 表示默认会转义 <、>、&。
	err := e.marshal(v, encOpts{escapeHTML: true})
	if err != nil {
		return nil, err
	}

	// 返回前复制一份结果，避免调用者引用到池化对象里的底层数组。
	return append([]byte(nil), e.Bytes()...), nil
}
```

这里有几个点值得注意：

- `newEncodeState()` 会拿到一个编码状态对象，它内部维护着用于拼 JSON 的缓冲区；
- `encodeStatePool` 是一个 `sync.Pool`，用来复用编码状态，减少频繁分配内存；
- `encOpts{escapeHTML: true}` 表示默认会把 `<`、`>`、`&` 做 HTML 转义，这也是为什么某些字符串经过 `Marshal` 后看起来会出现 `\u003c` 这类结果；
- 最后 `append([]byte(nil), e.Bytes()...)` 会复制一份结果返回，避免调用者拿到的切片还引用着池化对象里的底层数组。

继续往下看，真正决定“这个值应该怎么编码”的地方，会进入反射：

```go
func (e *encodeState) reflectValue(v reflect.Value, opts encOpts) {
	// 先根据值的类型找到对应的编码函数，再把值写入缓冲区。
	valueEncoder(v)(e, v, opts)
}
```

`valueEncoder` 会根据 `reflect.Value` 找到它的 `reflect.Type`，再为这个类型选择一个 `encoderFunc`。如果是字符串，就用字符串编码器；如果是整数，就用整数编码器；如果是结构体，就会进入结构体编码器。

结构体这一支大致会走到：

```go
func newStructEncoder(t reflect.Type) encoderFunc {
	// 分析结构体字段，并缓存字段名、tag、omitempty 等信息。
	se := structEncoder{fields: cachedTypeFields(t)}

	// 返回一个真正执行结构体编码的函数。
	return se.encode
}
```

这行代码很关键：`cachedTypeFields(t)` 会分析结构体有哪些可导出字段、字段名是什么、有没有 `json` tag、是否有 `omitempty` 等选项，并把结果缓存起来。也就是说，`encoding/json` 不是每次编码都从零开始解析结构体字段，它会把某个结构体类型的字段信息缓存下来，后续重复使用。

所以可以把 `Marshal` 的源码主线记成：

```text
任意 Go 值
  -> reflect.Value / reflect.Type
  -> 根据类型选择 encoderFunc
  -> 如果是 struct，读取并缓存字段信息
  -> 把字段和值写入 encodeState 缓冲区
  -> 返回 []byte
```

这也解释了一个现象：`encoding/json` 很方便，但它不是零成本的。它依赖反射和字段规则判断，所以在极端高性能场景里，有些项目会使用代码生成或第三方 JSON 库来减少反射成本。不过对绝大多数后端接口来说，标准库已经足够稳定可靠。

## 使用 Unmarshal 解码 JSON

服务端不只会输出 JSON，也经常要接收 JSON。比如前端提交表单、客户端创建订单、其他服务调用你的接口时，请求体通常就是一段 JSON 文本。这时就需要用 `json.Unmarshal` 把 JSON 解码到 Go 变量里。

函数签名是：

```go
func Unmarshal(data []byte, v any) error
```

示例：

```go
package main

import (
	"encoding/json"
	"fmt"
)

type CreateUserRequest struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}

func main() {
	data := []byte(`{"name":"张三","age":18}`)

	var req CreateUserRequest

	// 注意这里传的是 &req。
	// Unmarshal 需要修改 req，所以必须拿到它的地址。
	if err := json.Unmarshal(data, &req); err != nil {
		fmt.Println("unmarshal request:", err)
		return
	}

	fmt.Printf("%+v\n", req)
}
```

输出：

```text
{Name:张三 Age:18}
```

### 为什么 Unmarshal 要传指针

`Unmarshal` 的目标参数必须传指针：

```go
json.Unmarshal(data, &req)
```

原因很简单：解码的过程需要把 JSON 里的字段写入 `req`。

如果你这样写：

```go
// 错误示例：req 是值拷贝，Unmarshal 没法修改原变量。
err := json.Unmarshal(data, req)
```

`Unmarshal` 拿到的是一个普通值，不知道应该把解析结果写回哪里。实际运行时会返回类似这样的错误：

```text
json: Unmarshal(non-pointer main.CreateUserRequest)
```

把 `&req` 传进去，`encoding/json` 才能通过指针修改原变量。

切片、map 这些类型也通常传指针：

```go
var names []string

// 解码数组时，也要把目标变量地址传进去。
if err := json.Unmarshal([]byte(`["Go","MySQL"]`), &names); err != nil {
	return
}
```

### Unmarshal 源码主线

再看 `Unmarshal`。在 Go 1.26.5 稳定版官方源码 [`src/encoding/json/decode.go`](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/json/decode.go) 中，它不是一上来就直接把字段塞进结构体，而是先做一遍 JSON 语法检查：

```go
func Unmarshal(data []byte, v any) error {
	// decodeState 保存本次解码过程中的扫描器、原始数据和错误状态。
	var d decodeState

	// 先检查 JSON 整体是否合法，避免写入一半后才发现语法错误。
	if err := checkValid(data, &d.scan); err != nil {
		return err
	}

	// 初始化解码状态，然后把 JSON 内容写入目标值 v。
	d.init(data)
	return d.unmarshal(v)
}
```

这段代码可以拆成两步理解：

1. `checkValid` 先扫描整段 JSON，确认它是合法 JSON。
2. `d.unmarshal(v)` 再把 JSON 内容解码到目标变量里。

源码注释里提到，先校验 JSON 是为了避免“解析到一半才发现语法错误，结果目标结构体已经被填了一半”。这也是标准库比较稳的地方：它会尽量避免把半成品状态留给你。

进入 `d.unmarshal(v)` 后，标准库会用反射检查目标值。因为它需要把解析出来的字段写回原变量，所以目标必须是指针。如果传的是普通值，反射只能看到这个值本身，不能修改调用者手里的那个变量，于是就会返回 `json: Unmarshal(non-pointer ...)` 这样的错误。

所以“为什么要传指针”从源码角度看，本质是：**解码器最终要通过反射 Set 字段，只有拿到可设置的目标地址，才能把 JSON 值写回去**。

## json struct tag

导出字段解决的是“`encoding/json` 能不能访问这个字段”的问题，但还没有解决“JSON 字段名应该叫什么”的问题。后端接口里通常不会直接把 `UserName`、`EmailAddress` 这种 Go 字段名暴露出去，而是会使用 `user_name`、`email_address` 这类更常见的 JSON 字段名。

这就需要 struct tag。struct tag 是 Go 里非常常见的一种元信息写法。`encoding/json` 会读取字段上的 `json` tag，决定 Go 结构体字段和 JSON 字段之间如何映射。

先看一个最常见的后端接口场景：前端调用创建用户接口，请求体是 JSON。

```http
POST /users HTTP/1.1
Content-Type: application/json

{
  "user_name": "maomao",
  "email_address": "maomao@example.com",
  "age": 18
}
```

这个 JSON 里有两个典型特征：

- 字段名是小写；
- 多个单词之间用下划线连接，也就是常说的 snake_case，例如 `user_name`、`email_address`。

但是 Go 结构体字段通常写成大驼峰，因为字段必须导出，`encoding/json` 才能读写它：

```go
type CreateUserRequest struct {
	UserName     string
	EmailAddress string
	Age          int
}
```

这就引出了 struct tag 的核心问题：**Go 字段名和 JSON 字段名经常不是同一种命名风格**。Go 里是 `UserName`，JSON 里却往往是 `user_name`。这时就需要通过 `json` tag 明确告诉标准库二者的对应关系。

### 指定字段名

```go
type CreateUserRequest struct {
	UserName     string `json:"user_name"`
	EmailAddress string `json:"email_address"`
	Age          int    `json:"age"`
}
```

`json:"user_name"` 的意思是：这个字段在 Go 里叫 `UserName`，但是在 JSON 里叫 `user_name`。

`json:"email_address"` 的意思也是一样：这个字段在 Go 里叫 `EmailAddress`，但是在 JSON 里叫 `email_address`。

### 不加 tag 会怎么样

先看编码，也就是 Go 结构体转 JSON。

```go
package main

import (
	"encoding/json"
	"fmt"
)

type UserResponse struct {
	ID           int64
	UserName     string
	EmailAddress string
}

func main() {
	resp := UserResponse{
		ID:           1001,
		UserName:     "maomao",
		EmailAddress: "maomao@example.com",
	}

	data, err := json.Marshal(resp)
	if err != nil {
		fmt.Println("marshal response:", err)
		return
	}

	fmt.Println(string(data))
}
```

输出结果是：

```json
{"ID":1001,"UserName":"maomao","EmailAddress":"maomao@example.com"}
```

这不是前端接口里常见的字段风格。前端一般更希望收到：

```json
{"id":1001,"user_name":"maomao","email_address":"maomao@example.com"}
```

所以响应结构体通常要写 tag：

```go
type UserResponse struct {
	ID           int64  `json:"id"`
	UserName     string `json:"user_name"`
	EmailAddress string `json:"email_address"`
}
```

加上 tag 以后，`Marshal` 输出的字段名就会按 tag 来：

```json
{"id":1001,"user_name":"maomao","email_address":"maomao@example.com"}
```

再看解码，也就是 JSON 请求体转 Go 结构体。

```go
package main

import (
	"encoding/json"
	"fmt"
)

type CreateUserRequest struct {
	UserName     string
	EmailAddress string
	Age          int
}

func main() {
	body := []byte(`{
		"user_name": "maomao",
		"email_address": "maomao@example.com",
		"age": 18
	}`)

	var req CreateUserRequest
	if err := json.Unmarshal(body, &req); err != nil {
		fmt.Println("unmarshal request:", err)
		return
	}

	fmt.Printf("%+v\n", req)
}
```

输出结果会类似：

```text
{UserName: EmailAddress: Age:18}
```

`Age` 被填上了，因为 JSON 里的 `age` 可以和 Go 字段 `Age` 做大小写不敏感匹配。

但是 `user_name` 不会自动匹配 `UserName`，`email_address` 也不会自动匹配 `EmailAddress`。下划线不是简单的大小写差异，`encoding/json` 不会自动把 snake_case 转成大驼峰。

所以如果接口请求体用了下划线字段名，就应该写 tag：

```go
type CreateUserRequest struct {
	UserName     string `json:"user_name"`
	EmailAddress string `json:"email_address"`
	Age          int    `json:"age"`
}
```

同样的请求体再解码，结果就是：

```text
{UserName:maomao EmailAddress:maomao@example.com Age:18}
```

### 放到 HTTP handler 里看

实际项目里，很少直接拿一段字符串调用 `json.Unmarshal`。更常见的是在 HTTP handler 里从请求体读取 JSON。

```go
package main

import (
	"encoding/json"
	"net/http"
)

type CreateUserRequest struct {
	UserName     string `json:"user_name"`
	EmailAddress string `json:"email_address"`
	Age          int    `json:"age"`
}

type UserResponse struct {
	ID           int64  `json:"id"`
	UserName     string `json:"user_name"`
	EmailAddress string `json:"email_address"`
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req CreateUserRequest

	// Decode 会根据 json tag，把 user_name 写入 req.UserName，
	// 把 email_address 写入 req.EmailAddress。
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "请求 JSON 格式错误", http.StatusBadRequest)
		return
	}

	// json tag 只负责字段映射，不负责业务校验。
	if req.UserName == "" || req.EmailAddress == "" || req.Age < 0 {
		http.Error(w, "请求参数不合法", http.StatusBadRequest)
		return
	}

	resp := UserResponse{
		ID:           1001,
		UserName:     req.UserName,
		EmailAddress: req.EmailAddress,
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	// Encode 会根据 json tag，把 resp.UserName 输出成 user_name，
	// 把 resp.EmailAddress 输出成 email_address。
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "JSON 编码失败", http.StatusInternalServerError)
		return
	}
}
```

这个例子里，tag 同时影响两个方向：

| 方向 | 没有 tag 时 | 有 tag 时 |
| --- | --- | --- |
| 请求解码 | `user_name` 无法自动写入 `UserName` | `user_name` 写入 `UserName` |
| 响应编码 | `UserName` 输出成 `"UserName"` | `UserName` 输出成 `"user_name"` |

所以后端 API 的 request / response 结构体，通常都应该显式写 `json` tag。这样接口字段名稳定，前端、移动端、其他服务也不用依赖 Go 的字段命名。

### tag 的基本格式

`json` tag 的基本格式是：

```go
字段名 类型 `json:"JSON字段名,选项"`
```

常见写法有：

| 写法 | 含义 |
| --- | --- |
| `json:"user_name"` | JSON 字段名叫 `user_name` |
| `json:"user_name,omitempty"` | JSON 字段名叫 `user_name`，空值时省略 |
| `json:",omitempty"` | 字段名仍用默认 Go 字段名，但空值时省略 |
| `json:"-"` | 编码和解码时都忽略这个字段 |

注意，tag 不是给 Go 编译器看的，而是给 `encoding/json` 这类库在运行时通过反射读取的。Go 语言本身不会理解 `json:"user_name"` 的业务含义。

### 源码里 tag 是怎么被读出来的

这一点特别适合和“反射”那一节连起来理解。结构体 tag 写在字段声明上，但真正读取它的是标准库。`encoding/json` 在分析结构体字段时，会拿到 `reflect.StructField`，然后读取字段上的 `json` tag。

在 Go 1.26.5 稳定版官方源码 [`src/encoding/json/encode.go`](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/json/encode.go) 的 `typeFields` 逻辑里，可以看到类似这样的代码：

```go
// sf 是 reflect.StructField，代表结构体里的一个字段。
tag := sf.Tag.Get("json")

// json:"-" 表示这个字段编码和解码时都跳过。
if tag == "-" {
	continue
}

// 拆出 tag 里的字段名和选项，例如 user_name 与 omitempty。
name, opts := parseTag(tag)
```

这里的 `sf` 是一个结构体字段信息，类型是 `reflect.StructField`。`sf.Tag.Get("json")` 这一步，就是通过反射读取字段后面的 tag。

`parseTag` 在 [`src/encoding/json/tags.go`](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/json/tags.go) 里，它的逻辑并不复杂：

```go
func parseTag(tag string) (string, tagOptions) {
	// 以第一个逗号切开：逗号前是 JSON 字段名，逗号后是选项。
	tag, opt, _ := strings.Cut(tag, ",")
	return tag, tagOptions(opt)
}
```

也就是说：

- `json:"user_name"` 会被拆成字段名 `user_name`，选项为空；
- `json:"user_name,omitempty"` 会被拆成字段名 `user_name`，选项 `omitempty`；
- `json:",omitempty"` 字段名为空，表示继续使用默认字段名，但启用 `omitempty`；
- `json:"-"` 在前面就被跳过，表示这个字段完全不参与 JSON 编码和解码。

字段名匹配也不是随便猜的。`encoding/json` 会为结构体字段建立两张索引表：

```go
// 精确字段名索引：优先按完全相同的字段名查找。
exactNameIndex[field.name] = &fields[i]

// 折叠大小写后的索引：用于 age 匹配 Age 这类情况。
foldedNameIndex[string(foldName(field.nameBytes))] = &fields[i]
```

解码对象字段时，会先做精确匹配，再做大小写折叠后的匹配：

```go
// 先查精确匹配，例如 "user_name" 对 json:"user_name"。
f := fields.byExactName[string(key)]
if f == nil {
	// 再查大小写不敏感匹配，例如 "age" 对 Age。
	f = fields.byFoldedName[string(foldName(key))]
}
```

这就解释了前面的例子：`age` 能匹配 `Age`，因为大小写折叠后可以对上；`user_name` 不能匹配 `UserName`，因为下划线不是大小写差异，折叠大小写也不会把它变成同一个名字。

所以你可以把 `json struct tag` 理解成一句话：**它是写在结构体字段上的元信息，声明时属于结构体语法，使用时由 `encoding/json` 通过反射读取，并参与字段索引和匹配规则**。

### omitempty：空值时省略

`omitempty` 表示字段是空值时，就不要输出到 JSON。

```go
type User struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Nickname string `json:"nickname,omitempty"`
	Email    string `json:"email,omitempty"`
}
```

示例：

```go
user := User{
	ID:   1001,
	Name: "张三",
	// Nickname 和 Email 都是空字符串，会被 omitempty 省略。
}

data, _ := json.Marshal(user)
fmt.Println(string(data))
```

输出：

```json
{"id":1001,"name":"张三"}
```

常见空值包括：

| Go 类型 | 空值 |
| --- | --- |
| `string` | `""` |
| 数字类型 | `0` |
| `bool` | `false` |
| 指针 | `nil` |
| 切片、map | `nil` 或长度为 0 |
| 接口 | `nil` |

有一个地方要特别小心：`omitempty` 会把 `false` 和 `0` 也当成空值。

```go
type UpdateUserRequest struct {
	Age    int  `json:"age,omitempty"`
	Active bool `json:"active,omitempty"`
}
```

如果前端传来 `{"age":0,"active":false}`，你在重新编码这个结构体时，这两个字段可能会被省略。对于“更新接口”来说，这有时不是你想要的结果。

如果要区分“没有传”和“传了零值”，可以使用指针字段：

```go
type UpdateUserRequest struct {
	// nil 表示没传；非 nil 表示传了，即使值是 0。
	Age *int `json:"age,omitempty"`

	// nil 表示没传；非 nil 表示传了，即使值是 false。
	Active *bool `json:"active,omitempty"`
}
```

### `-`：忽略字段

`json:"-"` 表示完全忽略这个字段。

```go
type User struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Password string `json:"-"`
}
```

示例：

```go
user := User{
	ID:       1001,
	Name:     "张三",
	Password: "secret",
}

// Password 不会出现在 JSON 里。
data, _ := json.Marshal(user)
fmt.Println(string(data))
```

输出：

```json
{"id":1001,"name":"张三"}
```

不过，敏感字段最好不要只靠 `json:"-"` 防守。实际项目里更推荐把数据库模型和 API 响应模型分开：

```go
type UserModel struct {
	ID           int64
	Name         string
	PasswordHash string
}

type UserResponse struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}
```

这样就算以后有人给 `UserModel` 补字段，也不容易误把敏感信息返回给前端。

## Encoder 和 Decoder

到这里，我们已经分别看过 `Marshal` 和 `Unmarshal`。它们适合教学示例，也适合处理已经在内存里的 JSON 字节。但真实后端接口通常不是先手动准备一段 `[]byte`，而是直接面对 HTTP 请求体和响应流。这时可以使用 `json.Encoder` 和 `json.Decoder`。

### 用 Encoder 写 JSON 响应

```go
package main

import (
	"encoding/json"
	"net/http"
)

type UserResponse struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

func getUserHandler(w http.ResponseWriter, r *http.Request) {
	user := UserResponse{
		ID:   1001,
		Name: "张三",
	}

	// 返回 JSON 时，记得设置 Content-Type。
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	// Encoder 会直接把 JSON 写入 ResponseWriter。
	if err := json.NewEncoder(w).Encode(user); err != nil {
		http.Error(w, "JSON 编码失败", http.StatusInternalServerError)
		return
	}
}
```

`Encode` 会在输出末尾追加一个换行符。HTTP 响应里这通常没问题。

### 用 Decoder 读 JSON 请求

```go
package main

import (
	"encoding/json"
	"net/http"
)

type CreateUserRequest struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req CreateUserRequest

	// Decoder 可以直接从请求体中读取 JSON。
	decoder := json.NewDecoder(r.Body)

	if err := decoder.Decode(&req); err != nil {
		http.Error(w, "请求 JSON 格式错误", http.StatusBadRequest)
		return
	}

	// JSON 解码成功，不代表业务参数一定合法。
	if req.Name == "" || req.Age < 0 {
		http.Error(w, "请求参数不合法", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
```

注意：**解码成功只表示 JSON 格式和类型大体能对上，不表示业务规则一定正确**。

比如 `name` 为空字符串、`age` 是负数，JSON 包都不会替你拦住。业务校验仍然要自己写，或者交给专门的校验库。

### Decoder 源码主线

`json.Decoder` 的源码入口在 Go 1.26.5 稳定版官方源码 [`src/encoding/json/stream.go`](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/json/stream.go)。它适合 HTTP 请求体、文件、网络连接这类 `io.Reader` 场景，因为它可以从流里读取 JSON，而不要求你先把整个内容手动读成 `[]byte`。

`Decode` 的核心逻辑可以简化成这样：

```go
func (dec *Decoder) Decode(v any) error {
	// 从 io.Reader 读取一个完整 JSON 值，放进 Decoder 内部缓冲区。
	n, err := dec.readValue()
	if err != nil {
		return err
	}

	// 用刚读到的这段 JSON 初始化 decodeState。
	dec.d.init(dec.buf[dec.scanp : dec.scanp+n])
	dec.scanp += n

	// 真正的解码仍然交给 decodeState，通过反射写入 v。
	return dec.d.unmarshal(v)
}
```

这里可以看到，`Decoder` 会先从 `io.Reader` 读出一个完整 JSON 值，放进内部缓冲区 `dec.buf`，然后仍然交给 `decodeState.unmarshal` 去做真正的解码。

所以 `Unmarshal` 和 `Decoder.Decode` 的关系可以这样理解：

```text
json.Unmarshal(data, &v)
  -> 你已经有 []byte
  -> 直接初始化 decodeState
  -> 反射写入目标值

json.NewDecoder(r.Body).Decode(&v)
  -> 数据来自 io.Reader
  -> Decoder 先读出一个 JSON 值
  -> 再初始化 decodeState
  -> 反射写入目标值
```

写 HTTP 接口时，`Decoder` 更顺手；处理已经在内存里的 JSON 字节时，`Unmarshal` 更直接。

## DisallowUnknownFields：拒绝未知字段

能把请求体解码出来，只是接口处理的第一步。接下来要考虑的是：客户端多传字段时，我们要不要接受？

默认情况下，`encoding/json` 解码结构体时会忽略未知字段。

比如结构体只有 `name` 和 `age`：

```go
type CreateUserRequest struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}
```

客户端传了多余字段：

```json
{"name":"张三","age":18,"role":"admin"}
```

默认 `Decode` 不会报错，`role` 会被忽略。

如果你的接口希望严格一点，可以开启 `DisallowUnknownFields`：

```go
func createUserHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req CreateUserRequest

	decoder := json.NewDecoder(r.Body)

	// 开启后，JSON 中出现结构体未定义字段会报错。
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		http.Error(w, "请求 JSON 字段不符合约定", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
```

它很适合对外 API、管理后台接口、需要强约束的请求格式。

不过也要根据场景判断：如果你希望接口向前兼容，让新客户端多传一些字段但老服务仍能处理，就不一定要开启它。

从 Go 1.26.5 稳定版官方源码 [`src/encoding/json/stream.go`](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/json/stream.go) 看，`DisallowUnknownFields` 本身只是设置了一个布尔开关：

```go
func (dec *Decoder) DisallowUnknownFields() {
	// 这里只是打开一个开关。
	dec.d.disallowUnknownFields = true
}
```

真正起作用是在结构体字段匹配时。解码器读到 JSON 对象里的 key 后，会先查这个 key 对应的结构体字段；如果没找到，并且这个开关是 `true`，就保存一个未知字段错误：

```go
if f != nil {
	// 找到了字段，继续往对应字段里解码。
} else if d.disallowUnknownFields {
	// 没找到字段，并且开启了严格模式，就记录 unknown field 错误。
	d.saveError(fmt.Errorf("json: unknown field %q", key))
}
```

这也说明它只管“字段有没有定义”，不管字段值是否符合业务规则。比如 `age` 字段存在但值是 `-1`，`DisallowUnknownFields` 不会报错，业务校验还是要自己写。

## 限制请求体大小

字段严格性解决的是“内容是否符合约定”，但公开接口还要关心另一个问题：请求体本身能不能无限大。

解析 JSON 请求时，不要让客户端无限制地往请求体里塞数据。

公开接口尤其要注意这一点。一个很大的请求体可能占用大量内存和 CPU，甚至把服务拖慢。

Go 的 `net/http` 提供了 `http.MaxBytesReader`，可以限制请求体大小：

```go
func createUserHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	// 限制请求体最大为 1 MiB。
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var req CreateUserRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		http.Error(w, "请求 JSON 格式错误或体积过大", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
```

实际项目里，请求体大小要按业务设置。创建用户可能几十 KB 都嫌大，上传配置文件可能需要几 MB。不要一刀切，也不要完全不设。

还可以进一步检查是否只有一个 JSON 值，避免请求体后面拼接额外内容：

```go
func decodeJSONBody(w http.ResponseWriter, r *http.Request, dst any) error {
	// 限制请求体最大为 1 MiB。
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dst); err != nil {
		return err
	}

	// 再解一次。如果还能解出内容，说明请求体里不止一个 JSON 值。
	if decoder.Decode(&struct{}{}) != io.EOF {
		return fmt.Errorf("body must contain a single JSON value")
	}

	return nil
}
```

这段代码需要导入：

```go
import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)
```

## 动态 JSON：map[string]any

前面的例子都假设 JSON 结构比较稳定，所以用结构体最合适。但不是所有 JSON 都有固定结构，有些场景需要先接住一段“形状不确定”的数据。

如果 JSON 结构很明确，优先用结构体。

但有些场景结构并不固定，比如：

- 用户自定义扩展字段；
- 第三方 webhook，字段随事件类型变化；
- 调试工具，需要直接展示任意 JSON；
- 配置里有一段自由格式的参数。

这时可以解码到 `map[string]any`。

```go
package main

import (
	"encoding/json"
	"fmt"
)

func main() {
	data := []byte(`{
		"name": "张三",
		"age": 18,
		"active": true,
		"tags": ["go", "backend"]
	}`)

	var value map[string]any

	// JSON 对象会被解码成 map[string]any。
	if err := json.Unmarshal(data, &value); err != nil {
		fmt.Println("unmarshal dynamic json:", err)
		return
	}

	// 从 any 中取值时，需要做类型断言。
	name, ok := value["name"].(string)
	if !ok {
		fmt.Println("name is not a string")
		return
	}

	fmt.Println(name)
}
```

默认情况下，JSON 解码到 `any` 时的类型映射是：

| JSON 类型 | Go 默认类型 |
| --- | --- |
| 对象 | `map[string]any` |
| 数组 | `[]any` |
| 字符串 | `string` |
| 数字 | `float64` |
| 布尔值 | `bool` |
| `null` | `nil` |

所以这段代码通常会失败：

```go
age, ok := value["age"].(int) // ok 通常是 false
```

因为默认数字类型是 `float64`，不是 `int`。

正确处理方式可以是：

```go
ageFloat, ok := value["age"].(float64)
if !ok {
	fmt.Println("age is not a number")
	return
}

age := int(ageFloat)
fmt.Println(age)
```

不过要小心精度问题。JSON 的“数字”没有区分 `int64`、`uint64`、`float64`，而 Go 需要区分。

## UseNumber：保留数字文本

动态 JSON 还有一个容易踩坑的地方：数字类型。结构体字段可以明确写 `int64`，但 `map[string]any` 里没有这么明确的类型信息。

如果动态 JSON 里有很大的整数，例如订单 ID、用户 ID、雪花 ID，默认解码成 `float64` 可能丢精度。

例如：

```json
{"id":9007199254740993}
```

这个数字已经超过 JavaScript 安全整数范围，转成 `float64` 时可能不再精确。

Go 的 `json.Decoder` 提供了 `UseNumber`，可以让动态 JSON 里的数字先解码成 `json.Number`。

```go
package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

func main() {
	reader := strings.NewReader(`{"id":9007199254740993}`)

	decoder := json.NewDecoder(reader)

	// UseNumber 会让数字进入 any 时保持为 json.Number。
	decoder.UseNumber()

	var value map[string]any
	if err := decoder.Decode(&value); err != nil {
		fmt.Println("decode json:", err)
		return
	}

	idNumber, ok := value["id"].(json.Number)
	if !ok {
		fmt.Println("id is not a json.Number")
		return
	}

	// 按需要转换成 int64、float64，或者直接使用字符串。
	id, err := idNumber.Int64()
	if err != nil {
		fmt.Println("id is not int64:", err)
		return
	}

	fmt.Println(id)
}
```

如果字段结构稳定，最推荐的方式还是定义结构体：

```go
type Order struct {
	ID int64 `json:"id"`
}
```

结构体能让类型在编译期就固定下来，后面业务代码会清爽很多。

从 Go 1.26.5 稳定版官方源码 [`src/encoding/json/stream.go`](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/json/stream.go) 看，`UseNumber` 也只是给解码状态设置一个开关：

```go
func (dec *Decoder) UseNumber() {
	// 这里只是打开一个开关，影响数字进入 any 时的目标类型。
	dec.d.useNumber = true
}
```

当 JSON 数字要进入 `interface{}` / `any` 时，解码器会调用 [`src/encoding/json/decode.go`](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/json/decode.go) 里的 `convertNumber`：

```go
func (d *decodeState) convertNumber(s string) (any, error) {
	if d.useNumber {
		// 开启 UseNumber 后，先把数字文本保存成 json.Number。
		return Number(s), nil
	}

	// 默认行为：动态 JSON 数字进入 any 时转成 float64。
	return strconv.ParseFloat(s, 64)
}
```

这段源码把 `UseNumber` 的行为讲得很清楚：不开启时，动态 JSON 里的数字默认转成 `float64`；开启后，不急着转成浮点数，而是先保留成 `json.Number`，本质上保存的是数字的文本形式。后面你可以按业务需要调用 `Int64()`、`Float64()`，或者直接拿字符串继续处理。

## XML 编码与解码

讲完 JSON 以后，再回头看 XML 就容易很多。两者都是文本数据格式，都能和 Go 结构体做映射；区别是 XML 的表达能力更复杂，也更冗长。

XML 也是一种文本数据格式。它用标签组织数据，能表达元素、属性、文本内容、嵌套结构和命名空间。

一个 XML 示例：

```xml
<servers version="1">
  <server>
    <name>Shanghai</name>
    <ip>127.0.0.1</ip>
  </server>
  <server>
    <name>Beijing</name>
    <ip>127.0.0.2</ip>
  </server>
</servers>
```

在 Go 里，可以用 `encoding/xml` 处理 XML。

### XML struct tag

先定义结构体：

```go
package main

import "encoding/xml"

type Server struct {
	Name string `xml:"name"`
	IP   string `xml:"ip"`
}

type Servers struct {
	// XMLName 可以指定根元素名称。
	XMLName xml.Name `xml:"servers"`

	// version,attr 表示映射 XML 属性。
	Version int `xml:"version,attr"`

	// server 表示多个 <server> 子元素。
	Items []Server `xml:"server"`
}
```

常见 XML tag 写法：

| 标签 | 作用 |
| --- | --- |
| `xml:"server"` | 映射 XML 元素 |
| `xml:"version,attr"` | 映射 XML 属性 |
| `xml:",chardata"` | 映射元素中的文本内容 |
| `xml:",cdata"` | 映射 CDATA 内容 |
| `xml:"-"` | 忽略字段 |

### XML 源码主线

`encoding/xml` 的整体思路和 `encoding/json` 有相似之处：它也会通过反射分析结构体字段，也会读取 struct tag，也会缓存类型信息。但 XML 比 JSON 多了元素、属性、文本内容、命名空间等概念，所以它的字段信息更复杂。

在 Go 1.26.5 稳定版官方源码 [`src/encoding/xml/typeinfo.go`](https://go.googlesource.com/go/+/refs/tags/go1.26.5/src/encoding/xml/typeinfo.go) 中，XML 会为结构体类型维护 `typeInfo`：

```go
type typeInfo struct {
	// XMLName 字段对应的 XML 元信息。
	xmlname *fieldInfo

	// 普通字段对应的 XML 元信息。
	fields  []fieldInfo
}
```

每个字段会被整理成 `fieldInfo`：

```go
type fieldInfo struct {
	// 字段在结构体中的索引路径，用于反射定位字段。
	idx     []int

	// XML 元素名或属性名。
	name    string

	// XML 命名空间。
	xmlns   string

	// 字段模式，例如元素、属性、CDATA、chardata、omitempty。
	flags   fieldFlags

	// 父级元素路径，用于 a>b>c 这类嵌套 tag。
	parents []string
}
```

这里的 `flags` 就是在记录这个字段到底是普通元素、属性、字符数据，还是 CDATA 等模式。比如 `xml:"version,attr"` 会带上属性标记，`xml:",chardata"` 会带上文本内容标记。

分析字段时，源码会读取字段上的 `xml` tag：

```go
// 读取字段上的 xml tag。
tag := f.Tag.Get("xml")

// 按逗号拆分字段名和选项，例如 version,attr。
tokens := strings.Split(tag, ",")
```

然后根据逗号后的选项设置不同标记。比如 `attr` 表示属性，`chardata` 表示元素内的纯文本，`omitempty` 表示空值省略。

所以 XML tag 也可以按这个思路理解：**声明写在结构体字段上，真正解释它的是 `encoding/xml`，解释过程同样依赖反射，只是 XML 的映射维度比 JSON 更多**。

### XML Marshal

`xml.Marshal` 和 `xml.MarshalIndent` 的思路与 JSON 很像。

```go
package main

import (
	"encoding/xml"
	"fmt"
)

type Server struct {
	Name string `xml:"name"`
	IP   string `xml:"ip"`
}

type Servers struct {
	XMLName xml.Name `xml:"servers"`
	Version int      `xml:"version,attr"`
	Items   []Server `xml:"server"`
}

func main() {
	servers := Servers{
		Version: 1,
		Items: []Server{
			{Name: "Shanghai", IP: "127.0.0.1"},
			{Name: "Beijing", IP: "127.0.0.2"},
		},
	}

	// MarshalIndent 会生成更适合人阅读的 XML。
	data, err := xml.MarshalIndent(servers, "", "  ")
	if err != nil {
		fmt.Println("marshal xml:", err)
		return
	}

	// XML 文档通常会带上 xml.Header。
	fmt.Println(xml.Header + string(data))
}
```

### XML Unmarshal

解码 XML 也需要把目标变量地址传进去：

```go
package main

import (
	"encoding/xml"
	"fmt"
)

type Server struct {
	Name string `xml:"name"`
	IP   string `xml:"ip"`
}

type Servers struct {
	XMLName xml.Name `xml:"servers"`
	Version int      `xml:"version,attr"`
	Items   []Server `xml:"server"`
}

func main() {
	data := []byte(`
<servers version="1">
  <server>
    <name>Shanghai</name>
    <ip>127.0.0.1</ip>
  </server>
  <server>
    <name>Beijing</name>
    <ip>127.0.0.2</ip>
  </server>
</servers>`)

	var servers Servers

	// 和 json.Unmarshal 一样，目标变量要传指针。
	if err := xml.Unmarshal(data, &servers); err != nil {
		fmt.Println("unmarshal xml:", err)
		return
	}

	fmt.Printf("%+v\n", servers)
}
```

如果 XML 文件很大，或者你只想逐段读取，可以使用 `xml.Decoder` 读取 token。不过大多数后端业务里，先掌握 `Marshal`、`MarshalIndent`、`Unmarshal` 和 XML tag 就够用了。

## JSON 和 XML 怎么选

学完两套标准库用法以后，最后要回到工程选择上：什么时候用 JSON，什么时候用 XML？

日常后端开发里，可以按这个原则判断：

| 格式 | 推荐场景 | 特点 |
| --- | --- | --- |
| JSON | Web API、前后端通信、服务间通信、Webhook、轻量配置 | 简洁、易读、浏览器和后端生态都很好 |
| XML | SOAP、旧系统、行业协议、复杂文档、需要属性或命名空间的场景 | 表达能力强，但更冗长，解析规则也更复杂 |

一般建议：

1. 新项目对外 HTTP API，优先选 JSON。
2. 前端、移动端、小程序调用后端，优先选 JSON。
3. 对接已有协议时，对方要求 XML 就用 XML。
4. 配置文件如果给人手写，JSON 不支持注释，可能不如 YAML、TOML 友好。
5. 性能和强类型协议要求很高时，可以考虑 Protocol Buffers，但那是另一条技术线。

这一节的重点不是“JSON 比 XML 高级”，而是：**选择数据格式要看生态、协议约束和维护成本**。只是在现代 Web 后端里，JSON 的出现频率最高。

## 常见坑

### 1. 忘了传指针

```go
var req CreateUserRequest

// 错误：Unmarshal 不能修改 req。
err := json.Unmarshal(data, req)
```

应该写成：

```go
var req CreateUserRequest

// 正确：传入目标变量地址。
err := json.Unmarshal(data, &req)
```

### 2. 字段没有导出

```go
type User struct {
	name string `json:"name"` // 小写字段会被忽略
}
```

应该写成：

```go
type User struct {
	Name string `json:"name"`
}
```

### 3. 以为 tag 能做校验

```go
type CreateUserRequest struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}
```

`json:"age"` 只负责字段映射，不会检查年龄是否合理。

```go
if req.Name == "" || req.Age < 0 {
	return fmt.Errorf("invalid user")
}
```

### 4. omitempty 把零值也省略了

```go
type Response struct {
	Count int `json:"count,omitempty"`
}
```

当 `Count` 是 `0` 时，字段不会输出。如果 `0` 本身有业务意义，就不要随便加 `omitempty`。

### 5. 动态 JSON 数字默认是 float64

```go
var value map[string]any
json.Unmarshal([]byte(`{"id":1001}`), &value)

// 错误理解：id 默认不是 int。
_, ok := value["id"].(int)
fmt.Println(ok) // false
```

需要按 `float64`、`json.Number` 或明确结构体字段处理。

### 6. 直接把数据库模型返回给前端

```go
type UserModel struct {
	ID           int64
	Name         string
	PasswordHash string
}
```

即使暂时加了 `json:"-"`，也容易在后续维护中出错。更稳妥的做法是定义响应结构体：

```go
type UserResponse struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}
```

### 7. 不限制请求体大小

```go
// 不建议：公开接口直接从 r.Body 解码，没有大小限制。
decoder := json.NewDecoder(r.Body)
```

更推荐：

```go
// 限制请求体大小，避免超大请求拖垮服务。
r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
decoder := json.NewDecoder(r.Body)
```

## 总结

`encoding` 包族负责 Go 值和外部数据格式之间的转换。做后端开发时，最常用的是 `encoding/json`。

JSON 编码用 `json.Marshal` 或 `json.NewEncoder(w).Encode`，解码用 `json.Unmarshal` 或 `json.NewDecoder(r.Body).Decode`。解码目标要传指针，结构体字段必须导出，字段名和编码选项通过 `json` struct tag 控制。`omitempty`、`json:"-"`、`DisallowUnknownFields`、`http.MaxBytesReader`、`map[string]any`、`UseNumber` 都是实际项目里很常见的细节。

从 Go 1.26.5 的源码主线看，`encoding/json` 的核心是反射、字段信息缓存、编码状态和解码状态。`Marshal` 会根据 `reflect.Type` 选择编码器，结构体字段会经过 `cachedTypeFields` 分析和缓存；`Unmarshal` 会先校验 JSON，再通过反射把值写入目标变量；`json` tag 会被 `StructTag.Get("json")` 读出，再由 `parseTag` 拆成字段名和选项。

XML 在普通 Web API 里出现频率低一些，这一节做基本了解即可。它的处理思路和 JSON 类似：用 `encoding/xml` 完成 `Marshal`、`MarshalIndent` 和 `Unmarshal`，再通过 `xml` tag 映射元素、属性和文本内容。

除了标准库，Go 生态里还有一些高性能 JSON 编解码库，例如字节开源的 [Sonic](https://pkg.go.dev/github.com/bytedance/sonic)。这类库通常会围绕性能做更多优化，比如减少反射开销、利用 SIMD 或 JIT 思路提升吞吐；但它们和标准库在兼容性、部署环境、维护成本上也会有取舍。后面如果单独讲 JSON 性能优化，可以再把 Sonic、jsoniter、easyjson 这类方案放在一起比较。

如果是普通 Web API，优先掌握 JSON；如果对接旧系统、SOAP 接口或行业协议，再根据协议要求处理 XML。把这两套标准库用熟，后端服务和外部世界交换数据这件事，就有了很稳的基本功。
