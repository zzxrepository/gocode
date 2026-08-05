---
title: 03. encoding：JSON 与 XML
shortTitle: encoding：JSON 与 XML
order: 3
dir:
  link: true
  collapsible: true
  order: 3
icon: code
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

![Go encoding JSON 与 XML 封面](/assets/image/go-encoding-cover.png)

写后端服务时，我们几乎每天都在和“数据格式”打交道。

前端提交一个创建用户的请求，通常是 JSON；服务 A 调用服务 B，传过去的请求体也常常是 JSON；程序启动时读取配置文件，可能是 JSON、XML、YAML 或 TOML；对接一些历史系统、支付渠道、行业平台时，还可能遇到 XML。

也就是说，后端服务经常需要和前端、其他服务、配置文件交换数据。**JSON 是现代 Web 后端里的主角**，它简单、通用、生态成熟；**XML 今天没那么常用，但仍然值得了解**，因为一些旧系统、SOAP 接口、行业协议和配置文件里还会出现它。

这一节我们重点学习 Go 标准库里的 `encoding/json`，顺带把 `encoding/xml` 的基本用法串起来。学完以后，你应该能写出可靠的 JSON 请求解析、JSON 响应输出，也能看懂 XML 的结构体映射方式。

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

这里的“编码”可以先理解成：**把 Go 里的值转换成某种外部格式**。

“解码”则反过来：**把外部格式转换成 Go 里的值**。

比如：

```go
user := User{Name: "张三", Age: 18}

// 编码：Go 结构体 -> JSON 字节
data, err := json.Marshal(user)

// 解码：JSON 字节 -> Go 结构体
err = json.Unmarshal(data, &user)
```

这一节先不展开所有 encoding 包。做后端开发时，最先要掌握的是 `encoding/json`。

## JSON 基础

JSON 是一种文本数据格式，全称是 JavaScript Object Notation。

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

## 使用 Marshal 编码 JSON

`json.Marshal` 用来把 Go 值编码成 JSON。

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

## 使用 MarshalIndent 输出格式化 JSON

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

## 使用 Unmarshal 解码 JSON

`json.Unmarshal` 用来把 JSON 解码到 Go 变量里。

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

## 导出字段规则

`encoding/json` 只能访问结构体里的导出字段。

在 Go 里，字段名首字母大写表示导出，首字母小写表示不导出。

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

所以，想让 JSON 包处理某个结构体字段，字段名必须导出。

## json struct tag

struct tag 是 Go 里非常常见的一种元信息写法。`encoding/json` 会读取字段上的 `json` tag，决定 JSON 字段名和一些编码选项。

### 指定字段名

```go
type User struct {
	ID        int64  `json:"id"`
	UserName  string `json:"user_name"`
	CreatedAt string `json:"created_at"`
}
```

如果不写 tag，默认会使用 Go 字段名：

```go
type User struct {
	Name string
}
```

编码后字段名是：

```json
{"Name":"张三"}
```

后端接口里通常不建议直接暴露大写字段名，所以我们会给 API 结构体补上 tag：

```go
type UserResponse struct {
	Name string `json:"name"`
}
```

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

`json.Marshal` 和 `json.Unmarshal` 适合处理已经在内存里的 `[]byte`。

后端服务里更常见的是：JSON 来自 HTTP 请求体、文件、网络连接，或者要直接写入 HTTP 响应。这时可以使用 `json.Encoder` 和 `json.Decoder`。

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

## DisallowUnknownFields：拒绝未知字段

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

## 限制请求体大小

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

## XML 编码与解码

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

## 练习

1. 定义一个 `Article` 结构体，包含 `id`、`title`、`content`、`tags`、`published` 字段，并使用 `json.MarshalIndent` 输出格式化 JSON。
2. 写一个 `CreateArticleRequest` 结构体，从 JSON 字符串中解码出文章标题和内容，并手动校验标题不能为空。
3. 修改上一题，给 `CreateArticleRequest` 增加 `DisallowUnknownFields`，观察 JSON 中出现多余字段时的错误。
4. 写一个 HTTP handler，限制请求体最大为 `512 KiB`，然后用 `json.Decoder` 解析请求。
5. 把 `{"id":9007199254740993}` 解码到 `map[string]any`，分别观察默认数字类型和开启 `UseNumber` 后的区别。
6. 定义一个 `BookList` XML 结构体，支持根元素 `<books>`，每本书用 `<book id="1"><title>...</title></book>` 表示，并完成 XML 的编码和解码。

## 总结

`encoding` 包族负责 Go 值和外部数据格式之间的转换。做后端开发时，最常用的是 `encoding/json`。

JSON 编码用 `json.Marshal` 或 `json.NewEncoder(w).Encode`，解码用 `json.Unmarshal` 或 `json.NewDecoder(r.Body).Decode`。解码目标要传指针，结构体字段必须导出，字段名和编码选项通过 `json` struct tag 控制。`omitempty`、`json:"-"`、`DisallowUnknownFields`、`http.MaxBytesReader`、`map[string]any`、`UseNumber` 都是实际项目里很常见的细节。

XML 的使用频率低一些，但思路类似：用 `encoding/xml` 完成 `Marshal`、`MarshalIndent` 和 `Unmarshal`，再通过 `xml` tag 映射元素、属性和文本内容。

如果是普通 Web API，优先掌握 JSON；如果对接旧系统或行业协议，再根据协议要求处理 XML。把这两套标准库用熟，后端服务和外部世界交换数据这件事，就有了很稳的基本功。
