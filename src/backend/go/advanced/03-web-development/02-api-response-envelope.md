---
permalink: /backend/go/advanced/03-web-development/02-api-response-envelope/
title: 02. API 响应统一封装（Response Envelope）
shortTitle: 02. API 响应统一封装
order: 2
category:
  - Go
  - Golang 进阶知识
  - Web 编程
tag:
  - Go
  - HTTP
  - API 设计
  - Response Envelope
  - 错误处理
  - 业务错误码
---

# 02. API 响应统一封装（Response Envelope）

## 前言

写 Web 接口时，除了业务逻辑本身，还有一件几乎每个项目都要面对的事：**响应长什么样**。是直接把业务数据序列化返回，还是包一层统一的结构？错误信息放在 HTTP 状态码里，还是放在响应体里？这一篇讨论的就是这个问题——**统一响应封装**，也写作 API 响应封装规范，英文常见叫法是 Response Envelope（响应信封）或 API Envelope，也有人称其为 Unified Response Wrapper（统一响应包装器）。下文这些说法指的都是同一件事。

学完本篇你应当能够：

1. 理解为什么需要统一响应封装，以及它和 HTTP 状态码各自的角色；
2. 用 Go 标准库 `net/http` 从零实现一套完整的响应封装（含业务错误码、panic 兜底、404 兜底）；
3. 会用泛型写类型安全的响应结构（Go 1.18+），并写出对应的类型安全客户端；
4. 掌握一套适合内部管理系统、BFF、运营后台的**生产级封装**：成功失败共用顶层结构、结构化错误字段、分页规范、错误码分段、trace_id；
5. 了解 RFC 9457（Problem Details）这一业界标准方案，知道它与自定义封装的取舍；
6. 理解"响应结构就是接口契约"，知道什么改动是兼容的、什么改动是破坏性的，以及如何在新老项目中落地。

本篇所有示例只依赖 Go 标准库。示例使用的方法路由（`"GET /api/books/{id}"`）需要 **Go 1.22**，泛型写法需要 **Go 1.18**：

| 功能 | 最低 Go 版本 |
| --- | --- |
| `net/http` 基础服务端能力 | Go 1.0 |
| `interface{}` 别名 `any` | Go 1.18 |
| 泛型结构体与泛型函数 | Go 1.18 |
| `ServeMux` 的方法模式、`{id}` 路径参数、`PathValue` | Go 1.22 |

在更早版本中，可以用 `r.Method` 判断方法、手动解析路径，思路完全相同。

---

## 为什么需要统一响应封装

先看一个没有统一封装时常见的场景。同一个服务里的三个接口，返回了三种形状：

```json
// GET /api/books        —— 直接返回数组
[{"id": 1, "title": "The Go Programming Language"}]

// GET /api/books/999    —— 出错时是一段纯文本
book not found

// POST /api/books       —— 另一个开发者写的，用了另一种 JSON
{"ok": true, "result": {"id": 2}}
```

对调用方来说，这是一组灾难：

- 前端或下游服务要为**每个接口单独写解析逻辑**：这个接口成功时是数组，那个接口是对象，出错了又变成纯文本；
- 无法写一个通用的请求库来统一处理"业务错误"，因为错误出现的位置、字段名都不一样；
- 接口之间**形态漂移**：新来一位同事，又发明第四种返回格式，项目里同时存在好几套约定。

统一响应封装就是针对这些问题的工程约定：**全站所有 JSON 接口，无论成功还是失败，响应体最外层都是同一个结构**。调用方只需要一套解析逻辑：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "...业务数据..." }
}
```

这样做的好处：

| 好处 | 说明 |
| --- | --- |
| 调用方解析逻辑统一 | 先解外壳，看 `code`，再取 `data`，所有接口一个套路 |
| 业务错误可携带结构化信息 | 业务错误码 + 面向用户的提示文案，比裸 HTTP 状态码表达力强 |
| 便于横切处理 | 网关、监控、日志可以基于统一结构做聚合与告警 |
| 约束团队一致性 | 新人照着现有封装写即可，不需要每个接口做设计决策 |

::: tip

统一封装不是"唯一正确"的答案。以 GitHub REST API 为代表的另一派选择**直接返回资源本身**、只用 HTTP 状态码表达成败。两种方式各有拥趸，本篇讨论的是选择"封装派"之后，如何把它做得规范、一致、可维护。

:::

---

## 响应封装的解剖

一个典型的封装结构由三部分组成：

| 字段 | 类型 | 职责 |
| --- | --- | --- |
| `code` | 数字 | 业务状态码。`0`（或某个约定值）表示成功，其他值表示具体业务错误 |
| `message` | 字符串 | 面向调用方/用户的提示信息。成功时通常是 `"ok"`，失败时是可展示的错误文案 |
| `data` | 任意 | 业务数据。成功时是对象或数组；失败时按约定为 `null` 或省略 |

字段名本身没有标准答案——`code`/`msg`/`data`、`status`/`message`/`payload` 都很常见——**重要的是全站只用一种命名，并且写进团队文档**。

### 业务错误码 vs HTTP 状态码

一个常见疑问：既然 HTTP 已经有状态码了，为什么还要业务错误码？因为两者粒度不同：

- HTTP 状态码面向**协议层**：400 表示请求有问题、404 表示资源不存在、500 表示服务端故障。它只有几十种，表达不了"余额不足""手机号已注册"这类业务语义；
- 业务错误码面向**业务层**：可以自由编号，客户端可以据此做精确分支（例如"库存不足"时弹补货提示）。

推荐做法是**两者对齐而不是二选一**：业务错误的 HTTP 状态码反映它的性质（参数错误用 400、资源不存在用 404、内部故障用 500），响应体里的 `code` 再给出细粒度分类。这样 HTTP 语义、监控告警、缓存行为都保持正常，调用方还能拿业务码做精细处理。

::: warning 反模式：永远返回 200

有些团队选择"HTTP 状态码永远返回 200，成败全看 body 里的 code"。这种写法确实存在（早期的一些知名 API 就是这么做的），但它会让反向代理、CDN、监控系统和 HTTP 客户端的既有语义全部失效——错误响应会被当成成功缓存、5xx 告警抓不到真实故障。除非有明确的历史包袱，不建议新项目采用。

:::

### 成败判断的唯一依据是 code

规范封装时，要给调用方立一条铁律：**前端/客户端只根据 `code` 做逻辑分支，永远不要解析 `message` 文案**。`message` 是给人看的提示，随时可能为了体验被改写、做多语言翻译；用它做 `if message == "xxx"` 式的判断，等于把逻辑建立在随时会变的字符串上。

围绕这条铁律，还有一组"不要混用"清单，项目里字段命名和形态必须全站唯一：

- 不要 `errno`、`code` 两种成败字段混用；
- 不要 `errmsg`、`message` 两种文案字段混用；
- 不要有时 `data: {}`、有时 `data: null`；
- 不要有的接口带 `err_details` 之类的附加字段、有的接口不带；
- 不要让前端通过匹配错误文案来处理逻辑。

### 约定好"空"的形态

`data` 在边界情况下的形态，是封装规范里最容易"翻车"的地方，因为它直接决定了客户端要不要写一堆判空分支。下面这些差异看似琐碎，却都是真实项目里踩过的坑：

| 场景 | 差的约定（形态漂移） | 好的约定（形态稳定） |
| --- | --- | --- |
| 列表为空 | 有时 `null`，有时 `[]` | 永远是 `[]`（Go 里初始化切片即可） |
| 失败时的 `data` | 有时没有该字段，有时 `{}`，有时 `null` | 全站统一为一种，例如统一 `null` |
| 可选字段缺省 | 有时省略字段，有时输出 `null` | 统一选择一种，写进规范 |

原则只有一条：**同一种情况，全站只允许一种形态**。选哪种不是最重要的，一致才重要。

---

## 完整 Demo：一个迷你书店服务

下面用纯标准库实现一个书店 API，把封装落地。接口只有三个：

| 接口 | 说明 |
| --- | --- |
| `GET /api/books` | 列出全部图书 |
| `GET /api/books/{id}` | 查询单本图书 |
| `POST /api/books` | 新增图书 |

### 第一步：定义统一响应结构与错误码

```go
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"sync"
)

// Response 是全站所有 JSON 接口的顶层结构。
// 三个字段永远同时出现，客户端可以无条件依赖这个形状。
type Response struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

// 业务错误码：集中定义，禁止散落在各个包里随手写魔法数字。
// （这里的编号仅为演示，实际项目的分段规划见后文"业务码分段"一节。）
const (
	CodeOK            = 0
	CodeBadRequest    = 40001 // 参数非法
	CodeNotFound      = 40401 // 资源不存在
	CodeInternalError = 50001 // 服务端内部错误
)
```

### 第二步：定义业务错误类型

错误封装的核心思路是：**让业务层用 `error` 表达错误，用类型断言区分"可预期的业务错误"和"未预期的内部错误"**。

```go
// AppError 表示一个"可预期的业务错误"，
// 它同时携带 HTTP 状态码、业务错误码和面向用户的文案。
type AppError struct {
	HTTPStatus int    // 对应的 HTTP 状态码
	Code       int    // 响应封装中的业务错误码
	Message    string // 给用户看的提示，不要包含内部实现细节
}

func (e *AppError) Error() string { return e.Message }

// 构造器让业务代码写起来更短。
func errBadRequest(msg string) *AppError {
	return &AppError{HTTPStatus: http.StatusBadRequest, Code: CodeBadRequest, Message: msg}
}

func errNotFound(msg string) *AppError {
	return &AppError{HTTPStatus: http.StatusNotFound, Code: CodeNotFound, Message: msg}
}
```

### 第三步：写响应出口

全站只允许通过下面这几个函数写 JSON 响应。这是封装能被"强制"执行的关键：业务 handler 不直接碰 `ResponseWriter` 的序列化细节。

```go
// writeJSON 是唯一的 JSON 序列化出口。
func writeJSON(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(v)
}

// OK 写成功响应：HTTP 200 + code=0。
func OK(w http.ResponseWriter, data any) {
	_ = writeJSON(w, http.StatusOK, Response{
		Code:    CodeOK,
		Message: "ok",
		Data:    data,
	})
}

// Created 写创建成功的响应：HTTP 201 + code=0。
func Created(w http.ResponseWriter, data any) {
	_ = writeJSON(w, http.StatusCreated, Response{
		Code:    CodeOK,
		Message: "ok",
		Data:    data,
	})
}

// Fail 写错误响应。
func Fail(w http.ResponseWriter, err error) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		// 可预期的业务错误：按它携带的状态码和文案返回。
		_ = writeJSON(w, appErr.HTTPStatus, Response{
			Code:    appErr.Code,
			Message: appErr.Message,
			Data:    nil, // 约定：失败时 data 恒为 null
		})
		return
	}
	// 未预期的错误：记录详细日志，但对客户端只给笼统提示，
	// 绝不把堆栈、SQL、内部路径泄露出去。
	log.Printf("unexpected error: %+v", err)
	_ = writeJSON(w, http.StatusInternalServerError, Response{
		Code:    CodeInternalError,
		Message: "服务内部错误，请稍后重试",
		Data:    nil,
	})
}
```

::: tip

`encoding/json` 默认会把 `&`、`<`、`>` 转义成 `\u0026`、`\u003c`、`\u003e` 这类 Unicode 转义序列（为了防止 JSON 被嵌入 HTML 时出问题）。如果接口数据里常出现这些字符、又不希望转义，可以在 `writeJSON` 里对 encoder 调用 `SetEscapeHTML(false)`。

:::

### 第四步：业务层与 handler

```go
// ---------- 数据模型与内存存储 ----------

type Book struct {
	ID     int     `json:"id"`
	Title  string  `json:"title"`
	Author string  `json:"author"`
	Price  float64 `json:"price"`
}

type BookStore struct {
	mu     sync.RWMutex
	books  map[int]Book
	nextID int
}

func NewBookStore() *BookStore {
	return &BookStore{books: make(map[int]Book), nextID: 1}
}

func (s *BookStore) List() []Book {
	s.mu.RLock()
	defer s.mu.RUnlock()
	// 初始化为空切片而不是 nil，保证空列表序列化为 [] 而不是 null。
	list := make([]Book, 0, len(s.books))
	for _, b := range s.books {
		list = append(list, b)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].ID < list[j].ID })
	return list
}

func (s *BookStore) Get(id int) (Book, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, ok := s.books[id]
	return b, ok
}

func (s *BookStore) Add(b Book) Book {
	s.mu.Lock()
	defer s.mu.Unlock()
	b.ID = s.nextID
	s.nextID++
	s.books[b.ID] = b
	return b
}

// ---------- HTTP handlers ----------

func (s *BookStore) listBooks(w http.ResponseWriter, r *http.Request) {
	OK(w, s.List())
}

func (s *BookStore) getBook(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		Fail(w, errBadRequest("图书 ID 必须是整数"))
		return
	}
	book, ok := s.Get(id)
	if !ok {
		Fail(w, errNotFound(fmt.Sprintf("图书 %d 不存在", id)))
		return
	}
	OK(w, book)
}

func (s *BookStore) createBook(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Title  string  `json:"title"`
		Author string  `json:"author"`
		Price  float64 `json:"price"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		Fail(w, errBadRequest("请求体必须是合法 JSON"))
		return
	}
	if input.Title == "" {
		Fail(w, errBadRequest("title 不能为空"))
		return
	}
	if input.Price < 0 {
		Fail(w, errBadRequest("price 不能为负数"))
		return
	}
	book := s.Add(Book{
		Title:  input.Title,
		Author: input.Author,
		Price:  input.Price,
	})
	Created(w, book)
}
```

### 第五步：兜底与装配

还有两个容易被遗忘的出口，它们也必须落在同一个封装里，否则封装就"漏"了：

1. **404 兜底**：访问不存在的路径时，`ServeMux` 默认返回纯文本 `404 page not found`，要替换成统一结构；
2. **panic 兜底**：handler 里 panic 时，默认行为是断开连接，要用中间件接住并返回统一结构。

```go
// notFound 替换 ServeMux 默认的纯文本 404。
func notFound(w http.ResponseWriter, r *http.Request) {
	Fail(w, errNotFound("接口不存在"))
}

// recoverMiddleware 捕获 handler 中的 panic，返回统一的 500 响应。
// 注意：如果 handler 已经写过响应头才 panic，状态码无法再改，
// 这层中间件只能兜住"还没开始写响应"的 panic——但这也正是最常见的场景。
func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if p := recover(); p != nil {
				log.Printf("panic recovered: %v", p)
				Fail(w, &AppError{
					HTTPStatus: http.StatusInternalServerError,
					Code:       CodeInternalError,
					Message:    "服务内部错误，请稍后重试",
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// newRouter 装配路由，单独抽出来方便测试复用。
func newRouter(store *BookStore) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/books", store.listBooks)
	mux.HandleFunc("GET /api/books/{id}", store.getBook)
	mux.HandleFunc("POST /api/books", store.createBook)
	mux.HandleFunc("/", notFound)
	return recoverMiddleware(mux)
}

func main() {
	handler := newRouter(NewBookStore())
	log.Println("bookstore listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
```

### 运行验证

把上面的代码放进一个文件（例如 `main.go`），`go run main.go` 后用 curl 验证：

```bash
# 空列表：data 是 [] 而不是 null
$ curl -s http://localhost:8080/api/books
{"code":0,"message":"ok","data":[]}

# 创建成功：HTTP 201
$ curl -s -X POST http://localhost:8080/api/books \
    -d '{"title":"The Go Programming Language","author":"Alan Donovan","price":59.0}'
{"code":0,"message":"ok","data":{"id":1,"title":"The Go Programming Language","author":"Alan Donovan","price":59}}

# 查询成功
$ curl -s http://localhost:8080/api/books/1
{"code":0,"message":"ok","data":{"id":1,"title":"The Go Programming Language","author":"Alan Donovan","price":59}}

# 业务错误：HTTP 404 + 业务错误码
$ curl -s -w "\nHTTP %{http_code}\n" http://localhost:8080/api/books/999
{"code":40401,"message":"图书 999 不存在","data":null}
HTTP 404

# 参数错误：HTTP 400
$ curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:8080/api/books -d '{"title":""}'
{"code":40001,"message":"title 不能为空","data":null}
HTTP 400

# 不存在的路径：同样落入统一封装
$ curl -s http://localhost:8080/whatever
{"code":40401,"message":"接口不存在","data":null}
```

观察这组响应：**无论成功还是失败，响应体最外层永远是 `code`/`message`/`data` 三个字段**。这就是调用方需要的全部契约。

---

## 进阶：泛型版封装（Go 1.18+）

`Data any` 虽然灵活，但类型信息在编译期就丢了。使用泛型可以让响应结构在代码层面带上类型：

```go
// Envelope 是带类型的响应封装。
type Envelope[T any] struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    T      `json:"data"`
}

// ListResult 是列表类接口的通用 data：永远带 items 和 total。
// items 初始化为空切片，保证空列表输出 [] 而非 null。
type ListResult[T any] struct {
	Items []T `json:"items"`
	Total int `json:"total"`
}

func newListResult[T any](items []T) ListResult[T] {
	if items == nil {
		items = []T{}
	}
	return ListResult[T]{Items: items, Total: len(items)}
}
```

泛型封装最大的受益方其实是**客户端**。下面是一个通用的请求辅助函数：传入目标类型，它负责解外壳、检查业务码、再把 `data` 反序列化成 `T`：

```go
// callAPI 发送请求并把 data 解析为 T。
// 技巧：先用 Envelope[json.RawMessage] 解外壳，
// data 保持原始字节，直到确认要解析时再二次反序列化。
func callAPI[T any](client *http.Client, method, url string, body io.Reader) (T, error) {
	var zero T

	resp, err := client.Do(mustNewRequest(method, url, body))
	if err != nil {
		return zero, err
	}
	defer resp.Body.Close()

	var env Envelope[json.RawMessage]
	if err := json.NewDecoder(resp.Body).Decode(&env); err != nil {
		return zero, fmt.Errorf("响应不是合法的 JSON 封装: %w", err)
	}
	if env.Code != CodeOK {
		return zero, fmt.Errorf("服务端返回错误: code=%d message=%s", env.Code, env.Message)
	}
	if len(env.Data) == 0 || string(env.Data) == "null" {
		return zero, nil
	}
	var out T
	if err := json.Unmarshal(env.Data, &out); err != nil {
		return zero, fmt.Errorf("解析 data 失败: %w", err)
	}
	return out, nil
}

func mustNewRequest(method, url string, body io.Reader) *http.Request {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		panic(err)
	}
	req.Header.Set("Content-Type", "application/json")
	return req
}
```

有了它，调用侧变得非常干净，且全程类型安全（以书店服务为例，此片段额外用到 `log`、`strings` 两个包）：

```go
func main() {
	client := &http.Client{Timeout: 5 * time.Second}
	const base = "http://localhost:8080"

	// 先准备一本书（书店服务是内存存储，重启后数据会丢）
	seed := `{"title":"The Go Programming Language","author":"Alan Donovan","price":59}`
	resp, err := client.Do(mustNewRequest("POST", base+"/api/books", strings.NewReader(seed)))
	if err != nil {
		log.Fatal("需要先启动书店服务: ", err)
	}
	resp.Body.Close()

	// 列表接口：data 是数组，解析为 []Book
	books, err := callAPI[[]Book](client, "GET", base+"/api/books", nil)
	if err != nil {
		log.Fatal(err)
	}
	for _, b := range books {
		fmt.Println("list:", b.ID, b.Title)
	}

	// 详情接口：data 是对象，解析为 Book
	one, err := callAPI[Book](client, "GET", base+"/api/books/1", nil)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("detail:", one.ID, one.Title)

	// 错误也会被转成 error：业务码非 0 时 callAPI 直接返回错误
	if _, err := callAPI[Book](client, "GET", base+"/api/books/999", nil); err != nil {
		fmt.Println("expected error:", err)
	}
}
```

配合前面启动的书店服务运行，输出为：

```text
list: 1 The Go Programming Language
detail: 1 The Go Programming Language
expected error: 服务端返回错误: code=40401 message=图书 999 不存在
```

注意第三行：**业务错误在客户端变成了普通的 `error`**，调用方不再需要到处检查 `code` 字段——这正是统一封装在类型系统层面的回报。

::: tip

"外壳统一"与"data 形态统一"是两件事。外壳统一由 `Response`/`Envelope` 保证；`data` 内部的形态（比如列表接口统一用 `{items, total}` 还是裸数组）同样需要写进团队规范，否则只是把不一致从外壳挪进了 data。后文"生产级封装"一节会给出列表与分页的统一形态。

:::

---

## 进阶：handler 只返回 (data, error)，出口统一写响应

前面的 demo 里，每个 handler 都要记得调 `OK`/`Fail`。在大型项目里，更稳妥的做法是把"写响应"这一步也从业务代码里拿走：**handler 只负责产出 `(data, error)`，由一个适配器统一翻译成 HTTP 响应**。这样就不存在"某个 handler 忘了封装"的可能性。

```go
// apiFunc 是业务 handler 的签名：只返回业务数据和错误。
type apiFunc func(r *http.Request) (any, error)

// handle 把 apiFunc 适配成 http.Handler，统一写响应。
func handle(f apiFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		data, err := f(r)
		if err != nil {
			Fail(w, err)
			return
		}
		OK(w, data)
	})
}
```

于是 handler 变成了纯业务函数，不再接触 `ResponseWriter`：

```go
func (s *BookStore) apiListBooks(r *http.Request) (any, error) {
	return s.List(), nil
}

func (s *BookStore) apiGetBook(r *http.Request) (any, error) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		return nil, errBadRequest("图书 ID 必须是整数")
	}
	book, ok := s.Get(id)
	if !ok {
		return nil, errNotFound(fmt.Sprintf("图书 %d 不存在", id))
	}
	return book, nil
}

// 路由注册
mux.Handle("GET /api/books", handle(store.apiListBooks))
mux.Handle("GET /api/books/{id}", handle(store.apiGetBook))
```

这就是**统一出口原则**，整条链路如下：

```text
Handler
  → 调用 Service
  → Service 返回 data 或 error
  → 统一出口：errors.As(error, *AppError)
  → 写入统一响应结构 + 对应 HTTP 状态码
```

Handler 里**不应该**出现这样的代码：

```go
// 反例：每个 handler 各自手写响应，结构迟早长歪
if err != nil {
	c.JSON(200, map[string]any{
		"code": 10001,
		"msg":  err.Error(),
	})
}
```

错误应当 `return` 出去，由统一出口处理。这样能确保所有接口不会逐渐长出不同结构。Gin、Echo 等框架里常见的"错误中间件 + 统一 `c.JSON` 封装"，本质上也是同一个思路，只是载体换成了框架的 Context。

---

## 生产级封装：结构化错误、分页与链路追踪 ID

前面的三字段封装适合入门和小项目。对于内部管理系统、BFF、运营后台这类典型的 Go 后端，推荐使用下面这套增强方案：**采用 `ApiResponse[T]` 泛型信封，成功与失败完全共用同一种顶层结构，统一由 HTTP 出口处理错误**。

### 设计目标

- 所有 JSON API 都返回同一种顶层结构；
- 成功和失败均可被前端稳定解析；
- 前端只根据 `code` 判断逻辑，不解析 `message` 文案；
- 所有响应返回 `trace_id`，用于排查日志与调用链；
- 服务层只返回业务结果或 `error`；Handler 不手写响应 JSON；
- 统一错误处理器负责把 Go 的 `error` 转为 API 响应。

### ApiResponse[T]：成功失败共用同一种顶层结构

```go
// ApiResponse 全站唯一的响应封装。
type ApiResponse[T any] struct {
	Code    int          `json:"code"`     // 业务码：0 表示成功
	Message string       `json:"message"`  // 面向用户的提示文案
	Data    *T           `json:"data"`     // 成功时为业务数据，失败时固定为 null
	Error   *ErrorDetail `json:"error"`    // 成功时固定为 null，失败时为结构化错误信息
	TraceID string       `json:"trace_id"` // 链路追踪 ID
}

// ErrorDetail 把"错误"从一句文案升级成结构化信息。
type ErrorDetail struct {
	Retryable   bool         `json:"retryable"`    // 前端是否可提示用户重试
	FieldErrors []FieldError `json:"field_errors"` // 参数校验错误；无则 []
}

// FieldError 精确到字段的校验错误，前端可据此在表单上标红。
type FieldError struct {
	Field   string `json:"field"`   // 字段路径，如 price、items[0].date
	Message string `json:"message"` // 该字段的错误提示
}
```

与入门版相比，它多了三样东西，每一样都对应一个真实的工程需求：

| 增强 | 解决的问题 |
| --- | --- |
| `Data *T` 用指针 | 失败时能稳定输出 `null`，与"成功必有 data"形成清晰对比 |
| `Error *ErrorDetail` | 错误不再只有一句文案：是否可重试、哪个字段错了，都能结构化表达 |
| `TraceID` | 用户报错时，凭响应里的 trace_id 直接捞到服务端日志 |

固定约定如下——**五个字段永远同时出现**：

| 字段 | 成功时 | 失败时 |
| --- | --- | --- |
| `code` | `0` | 非 `0` 的业务错误码 |
| `message` | `success` | 用户可见的错误提示 |
| `data` | 业务数据；无数据时 `null` | 固定 `null` |
| `error` | 固定 `null` | `ErrorDetail` 对象 |
| `trace_id` | 必传 | 必传 |

### 成功响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "book_id": 1,
    "shelf_ids": [42]
  },
  "error": null,
  "trace_id": "0ab3a11e6a7bf796a56504df04d7b002"
}
```

配套的 HTTP 状态码建议：**创建成功使用 `201`；查询、修改成功使用 `200`；删除成功且无响应体时使用 `204`**。

### 分页响应规范

分页信息属于业务数据的一部分，放在 `data` 内部，**不要**放到顶层：

```go
// PageData 是列表/分页类接口的通用 data。
type PageData[T any] struct {
	Items []T  `json:"items"`
	Page  Page `json:"page"`
}

type Page struct {
	Number int   `json:"number"` // 当前页，从 1 开始
	Size   int   `json:"size"`   // 每页条数
	Total  int64 `json:"total"`  // 总条数
}
```

有数据时：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      { "id": 1, "title": "The Go Programming Language", "price": 59 }
    ],
    "page": { "number": 1, "size": 10, "total": 401 }
  },
  "error": null,
  "trace_id": "0ab3a11e6a7bf796a56504df04d7b002"
}
```

空列表时——注意 `items` 是 `[]` 而不是 `null`，`data` 也不能是 `null`：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [],
    "page": { "number": 1, "size": 10, "total": 0 }
  },
  "error": null,
  "trace_id": "0ab3a11e6a7bf796a56504df04d7b002"
}
```

### 失败响应规范：三类典型错误

**参数校验失败（HTTP `400`）**：`field_errors` 精确到字段，前端直接渲染表单错误。

```json
{
  "code": 40001,
  "message": "请求参数校验失败",
  "data": null,
  "error": {
    "retryable": false,
    "field_errors": [
      { "field": "price", "message": "不能为负数" }
    ]
  },
  "trace_id": "0ab3a11e6a7bf796a56504df04d7b002"
}
```

**业务状态冲突（HTTP `409`）**：例如记录正在审核中，不允许重复提交。

```json
{
  "code": 43001,
  "message": "该记录存在待审核的变更，请勿重复提交",
  "data": null,
  "error": {
    "retryable": false,
    "field_errors": []
  },
  "trace_id": "0ab3a11e6a7bf796a56504df04d7b002"
}
```

**下游依赖失败、可以重试（HTTP `502` 或 `503`）**：`retryable: true` 提示前端可以引导用户重试。

```json
{
  "code": 51001,
  "message": "同步索引服务失败，请稍后重试",
  "data": null,
  "error": {
    "retryable": true,
    "field_errors": []
  },
  "trace_id": "0ab3a11e6a7bf796a56504df04d7b002"
}
```

::: warning

数据库错误详情、下游服务的原始报错、调用栈、SQL 语句等信息**只写日志，绝不返回给前端**。响应里只有面向用户的文案。

:::

### 业务码分段

业务码不要随手编号，按"HTTP 语义前缀 + 段内细分"规划，全站共用一张表：

| 范围 | 类型 | 例子 |
| ---: | --- | --- |
| `0` | 成功 | `OK` |
| `40000-40999` | 参数与格式错误 | `40001 请求参数校验失败` |
| `41000-41999` | 身份与权限错误 | `41001 未登录`、`41002 无权限` |
| `42000-42999` | 资源不存在 | `42001 图书不存在` |
| `43000-43999` | 状态冲突与重复操作 | `43001 记录待审核，请勿重复提交` |
| `44000-44999` | 业务规则不满足 | `44001 上架前必须填写作者` |
| `50000-50999` | 服务内部异常 | `50001 系统繁忙` |
| `51000-51999` | 下游依赖异常 | `51001 索引服务调用失败` |

这种分段让业务码"看前缀知性质"，和 HTTP 状态码的语义保持同构。三者的职责要分清：

- **HTTP 状态码**：给网关、监控、SDK、重试策略理解；
- **`code`**：给前端和业务方做稳定的分支判断；
- **`message`**：给人看的文案，仅此而已。

### HTTP 状态码约定

| 场景 | HTTP 状态码 |
| --- | ---: |
| 参数格式、字段校验失败 | `400` |
| 未登录 | `401` |
| 无权限 | `403` |
| 资源不存在 | `404` |
| 重复提交、当前状态不允许操作 | `409` |
| 业务规则不满足 | `422` |
| 限流 | `429` |
| 服务内部错误 | `500` |
| 下游返回异常 | `502` |
| 下游不可用、可稍后重试 | `503` |

即使响应体里有 `code`，也**不要把所有错误都返回 HTTP `200`**。正确的 HTTP 状态码对网关、告警、客户端重试和可观测性都更友好；RFC 9457 也是按这一思路设计错误响应的。

### Go 实现

**领域错误**：比入门版多了 `Retryable`、`FieldErrors` 和 `Cause`。实现 `Unwrap` 之后，`errors.Is`/`errors.As` 可以穿透它找到底层原因，日志里也能拿到完整错误链。

```go
type AppError struct {
	HTTPStatus  int
	Code        int
	Message     string
	Retryable   bool
	FieldErrors []FieldError
	Cause       error
}

func (e *AppError) Error() string { return e.Message }
func (e *AppError) Unwrap() error { return e.Cause }
```

**成功与失败的构造函数**：

```go
func Success[T any](traceID string, data T) ApiResponse[T] {
	return ApiResponse[T]{
		Code:    0,
		Message: "success",
		Data:    &data,
		Error:   nil,
		TraceID: traceID,
	}
}

func Failure(traceID string, err *AppError) ApiResponse[any] {
	fieldErrors := err.FieldErrors
	if fieldErrors == nil {
		fieldErrors = []FieldError{} // 约定：无字段错误时输出 [] 而不是 null
	}
	return ApiResponse[any]{
		Code:    err.Code,
		Message: err.Message,
		Data:    nil,
		Error: &ErrorDetail{
			Retryable:   err.Retryable,
			FieldErrors: fieldErrors,
		},
		TraceID: traceID,
	}
}
```

**trace_id 中间件**：优先透传上游传来的 trace id，没有则自己生成，同时写入 context 和响应头。真实项目里通常接入公司的链路追踪系统，这里用随机 16 字节演示原理：

```go
type traceIDKey struct{}

func traceIDFrom(ctx context.Context) string {
	if v, ok := ctx.Value(traceIDKey{}).(string); ok {
		return v
	}
	return ""
}

func newTraceID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

// traceMiddleware 为每个请求生成/透传 trace_id。
func traceMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := r.Header.Get("X-Trace-ID")
		if traceID == "" {
			traceID = newTraceID()
		}
		ctx := context.WithValue(r.Context(), traceIDKey{}, traceID)
		w.Header().Set("X-Trace-ID", traceID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

（上面片段需要 `context`、`crypto/rand`、`encoding/hex`、`time` 等导入；Go 会把自定义响应头规范化为 `X-Trace-Id`，客户端读取时大小写不敏感。）

**统一出口**：所有成功走 `WriteSuccess`，所有错误走 `WriteError`，Handler 没有第三条路：

```go
// WriteSuccess 是唯一的成功响应出口。
func WriteSuccess(w http.ResponseWriter, r *http.Request, data any) {
	_ = writeJSON(w, http.StatusOK, Success(traceIDFrom(r.Context()), data))
}

// WriteError 是唯一的错误响应出口：把任意 error 转成 ApiResponse。
func WriteError(w http.ResponseWriter, r *http.Request, err error) {
	traceID := traceIDFrom(r.Context())
	var appErr *AppError
	if !errors.As(err, &appErr) {
		// 未预期错误：带 trace_id 记详细日志，对外只给笼统提示。
		log.Printf("[%s] unexpected error: %+v", traceID, err)
		appErr = &AppError{
			HTTPStatus: http.StatusInternalServerError,
			Code:       50001,
			Message:    "系统繁忙，请稍后重试",
		}
	}
	_ = writeJSON(w, appErr.HTTPStatus, Failure(traceID, appErr))
}
```

于是 handler 变成这样——成功只调 `WriteSuccess`，失败一律 `return err`：

```go
// 空分页：items 为 []，data 不为 null
func listHandler(w http.ResponseWriter, r *http.Request) {
	data := PageData[map[string]any]{
		Items: []map[string]any{},
		Page:  Page{Number: 1, Size: 10, Total: 0},
	}
	WriteSuccess(w, r, data)
}

// 参数校验失败：字段级错误
func validationHandler(w http.ResponseWriter, r *http.Request) {
	WriteError(w, r, &AppError{
		HTTPStatus: http.StatusBadRequest,
		Code:       40001,
		Message:    "请求参数校验失败",
		FieldErrors: []FieldError{
			{Field: "price", Message: "不能为负数"},
		},
	})
}

// 业务冲突
func conflictHandler(w http.ResponseWriter, r *http.Request) {
	WriteError(w, r, &AppError{
		HTTPStatus: http.StatusConflict,
		Code:       43001,
		Message:    "该记录存在待审核的变更，请勿重复提交",
	})
}

// 下游失败、可重试
func downstreamHandler(w http.ResponseWriter, r *http.Request) {
	WriteError(w, r, &AppError{
		HTTPStatus: http.StatusServiceUnavailable,
		Code:       51001,
		Message:    "同步索引服务失败，请稍后重试",
		Retryable:  true,
	})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/page", listHandler)
	mux.HandleFunc("POST /api/validation", validationHandler)
	mux.HandleFunc("POST /api/conflict", conflictHandler)
	mux.HandleFunc("POST /api/downstream", downstreamHandler)
	log.Println("production demo listening on :8081")
	log.Fatal(http.ListenAndServe(":8081", traceMiddleware(mux)))
}
```

装配时把 `traceMiddleware` 套在路由外层即可。运行后验证：

```bash
$ curl -s http://localhost:8081/api/page
{"code":0,"message":"success","data":{"items":[],"page":{"number":1,"size":10,"total":0}},"error":null,"trace_id":"9ec3caeca2dff2dad1971e48580e0069"}

$ curl -s -X POST http://localhost:8081/api/conflict
{"code":43001,"message":"该记录存在待审核的变更，请勿重复提交","data":null,"error":{"retryable":false,"field_errors":[]},"trace_id":"1c0b5e7d91e13fa660ccbe2440215a31"}

$ curl -s -X POST http://localhost:8081/api/downstream
{"code":51001,"message":"同步索引服务失败，请稍后重试","data":null,"error":{"retryable":true,"field_errors":[]},"trace_id":"1f311b80db29a7980b79c55e1db1209b"}
```

---

## 业界标准：RFC 9457 Problem Details

自定义封装之外，业界还有一个正式的"错误响应标准"：**RFC 9457《Problem Details for HTTP APIs》**（它取代了早先的 RFC 7807）。它规定错误响应使用 `application/problem+json` 媒体类型，结构如下：

```json
{
  "type": "https://example.com/problems/book-not-found",
  "title": "Book Not Found",
  "status": 404,
  "detail": "图书 999 不存在",
  "instance": "/api/books/999"
}
```

| 字段 | 含义 |
| --- | --- |
| `type` | 问题类型的 URI，指向该错误的文档 |
| `title` | 简短的、人类可读的问题分类 |
| `status` | HTTP 状态码（与响应行保持一致） |
| `detail` | 本次请求的具体描述 |
| `instance` | 出错请求的 URI |

Go 里实现它只需换一个结构体和 Content-Type：

```go
type ProblemDetail struct {
	Type     string `json:"type"`
	Title    string `json:"title"`
	Status   int    `json:"status"`
	Detail   string `json:"detail,omitempty"`
	Instance string `json:"instance,omitempty"`
}

func writeProblem(w http.ResponseWriter, status int, typ, title, detail, instance string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ProblemDetail{
		Type: typ, Title: title, Status: status, Detail: detail, Instance: instance,
	})
}
```

两种方案如何取舍：

| 维度 | 自定义封装（code/message/data） | RFC 9457 Problem Details |
| --- | --- | --- |
| 标准化程度 | 团队内部约定 | IETF 标准，跨语言通用 |
| 成功响应 | 同一结构覆盖成功与失败 | 只管错误响应，成功响应另行定义 |
| 业务错误码 | `code` 字段天然适合 | 需要用扩展字段表达 |
| 适用场景 | 内部业务系统、前后端一体开发 | 开放平台 API、对外提供 SDK 的服务 |

两者并不互斥：不少团队成功响应走自己的封装，错误响应走 Problem Details；也有团队在自定义封装里借鉴 Problem Details 的字段设计。**关键是选一种并写进规范，而不是混用。**

---

## 响应结构就是接口契约：向后兼容

这一节是本篇最想传达的工程观念。

一个接口一旦上线，它的响应结构就不再是"实现细节"，而是**与所有调用方签订的契约**：前端页面、下游服务、监控脚本、甚至浏览器缓存，都在这份契约上做了假设。改响应结构，就是在改契约。

由此推出几条实践规则：

### 1. 新接口遵循现有封装，不要发明新结构

给一个已有项目加接口时，先看两三个同类现有接口是怎么返回的，然后**照抄它的封装**。哪怕你觉得现有封装不够漂亮——全站只有一套"不够漂亮"的封装，也好过两套"各自漂亮"的封装。这在软件设计里对应**最小惊讶原则**（Principle of Least Surprise）：接口的行为应当符合使用者基于同类接口形成的预期。

### 2. 区分兼容性改动与破坏性改动

| 改动 | 性质 | 说明 |
| --- | --- | --- |
| 在 `data` 里**新增**可选字段 | 通常兼容 | 规范的客户端会忽略不认识的字段 |
| 新增一个接口 | 兼容 | 不影响已有接口 |
| **删除/重命名**字段 | 破坏性 | 依赖该字段的客户端直接出错 |
| 改变字段**类型或语义** | 破坏性 | 例如 `data` 从对象变数组 |
| 改变"空"的形态 | 破坏性 | 例如空列表从 `[]` 变成 `null` |
| 改变错误码含义 | 破坏性 | 客户端分支逻辑会走错 |

### 3. 真的要破坏性变更时：走版本迁移

如果确实必须改已上线接口的结构，正规做法是**接口版本化**：新开 `/v2/xxx`（或通过请求头版本化），让新旧契约并存一段时间，等调用方全部迁移完成，再下线旧版本。直接原地改结构，等于把升级成本一次性转嫁给所有调用方。

### 4. 健壮性原则

经典互联网设计原则（RFC 761 的表述，后世称 robustness principle）说：

> Be conservative in what you send, be liberal in what you accept.
> （发送时保守严格，接收时宽容大度。）

翻译到响应封装上就是两面：

- **作为服务端**：严格按契约输出——字段名、空值形态、错误结构一个字都不要随意变；
- **作为客户端**：对服务端响应保持宽容——用结构体反序列化时，服务端新增的字段会被自动忽略；访问可选字段前做好"不存在"的防御。

::: warning 一句话总结

新增接口：**遵循**现有封装；修改接口：**不破坏**现有契约；确需破坏：**版本化**迁移。

:::

---

## 项目落地清单

规范写得再好，落不了地等于零。下面这份清单可以直接搬进团队文档：

- 新项目从第一天起只允许这一种 `ApiResponse[T]`，不给"特殊情况"开口子；
- 在 OpenAPI/Swagger 里定义统一的成功、失败、分页 schema，让契约可检查；
- 所有 Handler 只调用 `WriteSuccess`，错误统一 `return error`；
- 所有业务码集中定义在一个包里（例如 `pkg/apierror`），禁止散落魔法数字；
- 所有响应都由 trace 中间件写入 `trace_id`，排障时一键关联日志；
- 单元测试至少覆盖六类场景：**成功、参数错误、权限错误、业务冲突、下游失败、空分页**；
- 老项目**不直接修改历史接口**：新模块或 `/v2` 接口采用新规范，老接口通过适配层渐进迁移。

### 跨技术栈的同款思路

"统一出口处理错误"不是 Go 独有的模式，换个技术栈只是换个名字：

- **go-zero**：提供统一错误处理出口（`httpx.SetErrorHandler`），可以在一处集中决定如何把 `error` 转换成 `code`/`msg`/`data` 这类响应结构；
- **Spring**：通常用 `@RestControllerAdvice` + `@ExceptionHandler` 做同类事情——Controller 只管抛异常，全局通知把异常统一翻译成约定好的响应结构。

形式不同，本质一致：**把响应的序列化收敛到唯一出口**，让每个接口的结构一致性不再依赖开发者自觉。

---

## 用 httptest 把契约定下来

响应结构既然是契约，就值得用测试固化。标准库 `net/http/httptest` 可以在不启动真实端口的情况下完整验证 handler。前面把路由装配抽成了 `newRouter`，测试可以直接复用它：

```go
package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestGetBook_NotFound 验证"图书不存在"时的响应契约：
// HTTP 404 + code=40401 + data 为 null。
func TestGetBook_NotFound(t *testing.T) {
	handler := newRouter(NewBookStore())

	req := httptest.NewRequest(http.MethodGet, "/api/books/999", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("期望 HTTP 404，实际 %d", rec.Code)
	}

	var resp Response
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("响应不是合法 JSON 封装: %v", err)
	}
	if resp.Code != CodeNotFound {
		t.Errorf("期望业务码 %d，实际 %d", CodeNotFound, resp.Code)
	}
	if resp.Data != nil {
		t.Errorf("期望 data 为 null，实际 %v", resp.Data)
	}
}

// TestCreateAndList 验证成功路径：创建后列表能查到，且空列表形态是 []。
func TestCreateAndList(t *testing.T) {
	handler := newRouter(NewBookStore())

	// 先验空列表形态：[] 而不是 null
	req := httptest.NewRequest(http.MethodGet, "/api/books", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if !strings.Contains(rec.Body.String(), `"data":[]`) {
		t.Fatalf("空列表应返回 []，实际: %s", rec.Body.String())
	}

	// 创建一本书
	body := `{"title":"Learning Go","author":"Jon Bodner","price":45.5}`
	req = httptest.NewRequest(http.MethodPost, "/api/books", strings.NewReader(body))
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("期望 HTTP 201，实际 %d", rec.Code)
	}
	var created Response
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Code != CodeOK {
		t.Fatalf("期望业务码 0，实际 %d", created.Code)
	}
}
```

运行 `go test ./...` 即可。这类测试的价值在于：当有人无意中改了响应结构（比如给 `Response` 删了个字段、把空列表改成了 `null`），测试会立刻报红，契约在代码评审之前就被守住了。按落地清单的要求，完整项目还应补齐权限错误、业务冲突、下游失败、空分页等场景的同类用例。

---

## 常见反模式清单

最后把本篇反复强调的点整理成一张"不要做"清单，代码评审时可以直接对照：

| # | 反模式 | 问题 |
| --- | --- | --- |
| 1 | 成功返回裸数据、失败返回封装 | 客户端必须先猜响应形状才能解析 |
| 2 | 每个模块自定义一套封装 | 全站形态漂移，通用解析无从谈起 |
| 3 | `code`/`errno`、`message`/`errmsg` 等命名混用 | 同一项目出现多套字段名，客户端要写兼容逻辑 |
| 4 | 把内部错误原文塞进 `message` | 泄露堆栈、SQL、文件路径等敏感信息 |
| 5 | `null`、`{}`、字段缺失混用 | 客户端被迫到处判空，还总有漏网的 |
| 6 | 空列表返回 `null` 而不是 `[]` | 前端 `data.map(...)` 直接崩溃 |
| 7 | HTTP 永远 200，成败只看 body | 监控、缓存、网关的 HTTP 语义全部失效 |
| 8 | 404/panic 路径忘了走封装 | 封装"漏风"，客户端仍要写特判 |
| 9 | 前端靠匹配 `message` 文案做逻辑分支 | 文案一改，逻辑全断；分支只认 `code` |
| 10 | 随手修改已上线接口的响应结构 | 破坏契约，所有调用方一起出事故 |
| 11 | 错误码散落各处、随手写魔法数字 | 码值冲突、含义不可考 |

---

## 小结

- 统一响应封装是一个**全站级约定**：所有 JSON 接口共用同一个顶层结构（常见为 `code`/`message`/`data`），成功与失败形状一致；
- 业务错误码与 HTTP 状态码**分工协作、互相对齐**：状态码管协议语义，业务码管业务分支；不要用"永远 200"取代状态码；成败判断只认 `code`，`message` 只给人看；
- 封装的落地靠**唯一出口**：`writeJSON` + `OK`/`Fail`，或更进一步用 `(data, error)` + 适配器，让业务代码根本没有机会绕开封装；
- 404 兜底、panic 兜底、空列表形态这些**边角出口**也必须纳入封装，否则契约就有洞；
- 生产级方案用 `ApiResponse[T]` 泛型信封：`Data *T` 区分成败形态、`Error` 携带 `retryable` 与 `field_errors`、`trace_id` 打通日志排障；分页用 `PageData[T]` 放进 `data`；业务码按 HTTP 语义分段规划；
- Go 1.18+ 的泛型让客户端也能类型安全地解封装：`callAPI[T]` 把业务错误直接变成 `error`；
- 对外 API 可以参考 **RFC 9457 Problem Details** 标准；它与自定义封装是两个流派，选定一个并保持一致；
- 响应结构是**接口契约**：新增接口遵循现有封装，不破坏已有结构，确需破坏就走版本化迁移；老项目通过适配层渐进迁移。

## 参考资料

- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)（取代 RFC 7807）
- [Google JSON Style Guide](https://google.github.io/styleguide/json/) —— 关于字段命名、空值与一致性的通用建议
- [Google AIP-193: Errors](https://google.aip.dev/193) —— Google API 错误设计指南
- [JSON:API Specification](https://jsonapi.org/format/) —— 另一种成体系的响应规范（顶层 `data`/`errors`/`meta`）
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/Guidelines.md) —— 微软的 REST API 设计规范
- [GitHub REST API: Errors](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#errors) —— "裸资源 + 错误对象"流派的代表性实现
- [go-zero 官方文档](https://go-zero.dev/) —— `httpx.SetErrorHandler` 统一错误出口
- [Spring Framework: @ControllerAdvice](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html) —— Java 生态的全局异常处理同款方案
- [Go `encoding/json` 包文档](https://pkg.go.dev/encoding/json)
- [Go `net/http/httptest` 包文档](https://pkg.go.dev/net/http/httptest)
- [Go 1.22 Release Notes: 增强的 ServeMux 路由](https://go.dev/doc/go1.22)
- [Go 官方博客: Errors are values](https://go.dev/blog/errors-are-values) —— 用类型表达错误的思路来源
