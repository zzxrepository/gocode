---
permalink: /backend/go/advanced/03-web-development/01-http-server/
title: 01. net/http：构建 HTTP 服务
shortTitle: 01. net/http
order: 1
category:
  - Go
  - Golang 进阶知识
  - Web 编程
tag:
  - Go
  - net/http
  - HTTP
  - Web 编程
  - HTTP 服务
---

# 01. net/http：构建 HTTP 服务

## 前言

写一个 Go HTTP 服务，最短只要一行：

```go
http.ListenAndServe(":8080", handler)
```

但线上服务真正要处理的不是“监听一个端口”这么简单：连接会复用，请求头和请求体都可能被恶意拖慢；同一个处理器会被并发调用；路由不匹配时应区分 `404` 与 `405`；响应一旦写出就不能反悔；进程收到停止信号时还要让正在执行的请求有机会收尾。

`net/http` 把这些工作拆成了很小的抽象：`Server` 管连接和协议，`ServeMux` 做路由，`Handler` 执行应用代码，`Request` 带入请求数据与取消信号，`ResponseWriter` 输出响应。Gin、chi、Echo 等框架也都以 `http.Handler` 为边界。理解这条链路后，换框架时看到的就是不同的路由和中间件实现，而不是一套陌生的运行模型。

文中涉及的源码片段均核对自本机 Go **1.22.10** 的标准库 `src/net/http`；`ServeMux` 的方法路由和路径参数也要求 Go 1.22 或更高版本。

## 一次请求如何抵达业务代码

以 HTTP/1.x 为例，一条 keep-alive 连接上的请求大致经历下面的路径：

```mermaid
flowchart LR
    client[客户端] --> listener[net.Listener]
    listener --> server[http.Server.Serve]
    server --> conn[每条连接的 conn.serve]
    conn --> parse[解析 HTTP 请求]
    parse --> mux[ServeMux 匹配路由]
    mux --> handler[Handler.ServeHTTP]
    handler --> writer[ResponseWriter]
    writer --> response[状态行、响应头、响应体]
    response --> client
```

`Server.Serve` 在接收到连接后会启动一个 goroutine：

```go
// Go 1.22.10：src/net/http/server.go（省略错误处理）
for {
	// Accept 阻塞等待新的 TCP 连接。
	rw, err := l.Accept()
	// ...
	c := srv.newConn(rw)
	c.setState(c.rwc, StateNew, runHooks)
	go c.serve(connCtx) // 每条 HTTP/1.x 连接由一个服务 goroutine 接管。
}
```

这解释了两个容易混淆的事实：不同连接上的处理器天然可以并发运行，所以处理器及其依赖必须并发安全；而同一条 HTTP/1.x 连接上，标准库会按顺序处理请求。源码还明确说明没有实现 HTTP/1.1 pipelining 的并发处理。HTTP/2 则允许同一连接上的多个流并发，业务代码更不能依赖“同连接请求串行”这样的偶然现象。

`conn.serve` 读取并解析完请求后，最终调用的是：

```go
// Go 1.22.10：src/net/http/server.go
inFlightResponse = w
serverHandler{c.server}.ServeHTTP(w, w.req)
inFlightResponse = nil
w.cancelCtx()       // 请求处理结束，取消该请求的 Context。
w.finishRequest()   // 补全默认响应、刷新缓冲区并收尾。
```

所以 Handler 不需要也不应该自己关闭服务端的 `r.Body`；标准库会在请求结束时收尾。Handler 需要做的是：读完业务所需的数据、把请求的 `Context` 往下游传，并在返回前完成响应写入。相反，**服务端传入的 `ResponseWriter` 在 `ServeHTTP` 返回后绝不能再使用**。如果要异步处理，只把必要的、与请求生命周期脱钩的数据交给后台任务。

## Handler：服务端唯一的应用层入口

`net/http` 的核心接口只有一个方法：

```go
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}
```

一个实现了它的结构体适合保存长期依赖，例如仓储、日志器、配置和其他客户端：

```go
type TaskHandler struct {
	store *taskStore // 这是进程级依赖，不是“当前请求”的可变状态。
}

func (h *TaskHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 每个请求自己的数据放在局部变量或 r.Context() 中。
	// 不要写入 h.currentUser 之类的普通字段，否则并发请求会互相覆盖。
}
```

更常见的处理函数也能成为 Handler，因为 `HandlerFunc` 是一个函数适配器。标准库实现没有额外魔法：

```go
// Go 1.22.10：src/net/http/server.go
type HandlerFunc func(ResponseWriter, *Request)

func (f HandlerFunc) ServeHTTP(w ResponseWriter, r *Request) {
	f(w, r)
}
```

因此下面两种注册方式的边界完全一致：

```go
mux.Handle("GET /tasks/{id}", handler)       // handler 已实现 http.Handler
mux.HandleFunc("POST /tasks", createTask)    // 普通函数经 HandlerFunc 适配
```

`http.HandleFunc` 会把路由注册到全局 `http.DefaultServeMux`。小程序中很方便，但应用、测试和多个服务共用进程时，全局状态会相互污染；生产代码通常显式创建 `http.NewServeMux()`，再把它传给 `http.Server`。

## ServeMux：模式、优先级与 404/405

Go 1.22 的路由模式语法是：

```text
[METHOD ][HOST]/PATH
```

其中每个路径段可以是字面量、单段通配符 `{name}`、末尾多段通配符 `{name...}`，或只匹配末尾斜杠的 `{$}`。例如：

```go
mux := http.NewServeMux()

// GET 模式也会匹配 HEAD；HEAD 响应不应有响应体。
mux.HandleFunc("GET /tasks", listTasks)

// {id} 只匹配一个非空路径段，例如 /tasks/42。
mux.HandleFunc("GET /tasks/{id}", getTask)

// /assets/ 隐含一个末尾的多段通配符，适合前缀路由。
mux.Handle("GET /assets/", http.StripPrefix("/assets/", fileServer))

// /{$} 只匹配根路径 /，而不会吞掉 /tasks 等其他路径。
mux.HandleFunc("GET /{$}", home)
```

在处理函数中用 `r.PathValue("id")` 取得路径参数。它只是字符串，不代表已经合法：数字 ID 仍要转换并校验，租户 ID、文件名等更不能直接用于 SQL 或文件路径。

### 匹配不是按注册顺序，而是“更具体优先”

标准库 1.22 的路由树恰好把这个规则写在源码注释和实现里。注册时的层次是 `Host -> Method -> Path segments`：

```go
// Go 1.22.10：src/net/http/routing_tree.go
func (root *routingNode) addPattern(p *pattern, h Handler) {
	n := root.addChild(p.host)   // 第一层：Host
	n = n.addChild(p.method)     // 第二层：HTTP 方法
	n.addSegments(p.segments, p, h) // 后续层：逐段路径
}
```

路径匹配优先尝试字面量，再尝试单段通配符，最后才尝试多段通配符：

```go
// Go 1.22.10：src/net/http/routing_tree.go（节选）
if n, m := n.findChild(seg).matchPath(rest, matches); n != nil {
	return n, m // /tasks/latest 比 /tasks/{id} 更具体，先命中字面量。
}
if seg != "/" {
	if n, m := n.emptyChild.matchPath(rest, append(matches, seg)); n != nil {
		return n, m // 字面量不匹配时才考虑 {id}。
	}
}
// 最后才考虑 {path...} 或以 / 结尾的前缀模式。
```

因此以下路由可以共存，`GET /tasks/latest` 会选择第一条，而不是把 `latest` 当成 `id`：

```go
mux.HandleFunc("GET /tasks/latest", latestTasks)
mux.HandleFunc("GET /tasks/{id}", getTask)
```

反过来，语义上等价且相互重叠、又没有任何一方更具体的模式会在注册阶段 `panic`，这能避免“到底走哪条路由”的静默歧义。

### 自动 301、404 与 405

`ServeMux.findHandler` 会先清理普通请求路径中的 `.`、`..` 和重复斜杠，必要时返回重定向 Handler；若路径存在但方法不匹配，则计算允许的方法并返回 `405`：

```go
// Go 1.22.10：src/net/http/server.go（节选）
if n == nil {
	allowedMethods := mux.matchingMethods(host, path)
	if len(allowedMethods) > 0 {
		return HandlerFunc(func(w ResponseWriter, r *Request) {
			w.Header().Set("Allow", strings.Join(allowedMethods, ", "))
			Error(w, StatusText(StatusMethodNotAllowed), StatusMethodNotAllowed)
		}), "", nil, nil
	}
	return NotFoundHandler(), "", nil, nil
}
```

也就是说，注册 `GET /tasks/{id}` 后，`POST /tasks/1` 是带 `Allow: GET, HEAD` 的 `405 Method Not Allowed`，而 `/unknown` 是 `404 Not Found`。这比在每个 Handler 手写 `r.Method` 判断更准确，也让接口语义集中在路由表中。若项目还在 Go 1.21 或更早版本，不能使用这种方法模式、`{id}` 和 `PathValue`。

## ResponseWriter：响应何时真正提交

`ResponseWriter` 看起来只有 `Header`、`WriteHeader`、`Write` 三个常用方法，但它实际代表一份有状态的 HTTP 响应：

```text
尚未提交
  ├─ Header().Set(...)：仍可修改响应头
  ├─ WriteHeader(201)：提交状态行和响应头
  └─ Write(body)：隐式提交 200，然后写响应体
已提交
  └─ 后续普通响应头和状态码不再生效
```

标准库对第一次写状态码有明确的保护：

```go
// Go 1.22.10：src/net/http/server.go（节选）
func (w *response) WriteHeader(code int) {
	if w.wroteHeader {
		// 第二次调用只记录 "superfluous response.WriteHeader" 日志，
		// 不会覆盖已经发给客户端的第一个状态码。
		return
	}
	w.wroteHeader = true
	w.status = code
}

func (w *response) write(...) (n int, err error) {
	if !w.wroteHeader {
		w.WriteHeader(StatusOK) // 第一次 Write 隐式提交 200。
	}
	// 再写入 body。
}
```

所以要遵循“**头、状态码、响应体**”的顺序。特别是 `json.NewEncoder(w).Encode(v)` 会调用 `Write`，把默认 `200` 提交出去；如果随后再写 `400` 或 `201`，客户端仍会收到 `200`。

```go
func writeJSON(w http.ResponseWriter, status int, value any) {
	// Header 必须在 WriteHeader / Encode 之前设置。
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)

	// 编码失败时响应可能已经部分写出，只能记录错误，
	// 不能再试图改成一份新的 500 JSON 响应。
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("encode JSON response: %v", err)
	}
}
```

若没有设置 `Content-Type`，标准库会根据最初最多 512 字节尝试推断；小响应没有显式 `Content-Length` 时也可能被缓冲后自动补上。这是便利而不是接口契约：JSON、下载文件、缓存和安全相关响应头都应由应用明确设置。

还有一个不容易注意的边界：HTTP/1.x 中，一旦响应头被刷出，继续读 `r.Body` 可能不可用。最稳妥的普通请求写法是先完整读取、限制并校验请求体，再开始写响应；流式双工交互需要针对协议和客户端单独设计。

## 一个可运行的任务服务

下面的程序把路由、JSON、请求体限制、中间件、请求 Context、超时配置和优雅关闭放进一个可直接运行的例子。存储层故意使用带 `sync.RWMutex` 的内存实现，重点在 HTTP 边界；实际项目可以把 `taskStore` 换成使用 `database/sql` 或 GORM 的仓储。

保存为 `main.go` 后运行 `go run .`：

```go
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"
)

// task 是 API 对外暴露的资源。字段使用 JSON tag，避免把 Go 字段名当作协议细节。
type task struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
}

type createTaskInput struct {
	Title string `json:"title"`
}

// taskStore 是并发安全的进程级依赖。所有跨请求共享的可变状态都要有同步策略。
type taskStore struct {
	mu     sync.RWMutex
	nextID int64
	tasks  map[int64]task
}

func newTaskStore() *taskStore {
	return &taskStore{nextID: 1, tasks: make(map[int64]task)}
}

func (s *taskStore) create(ctx context.Context, title string) (task, error) {
	// 数据库、RPC 等慢操作应使用 ctx；这里也先检查取消，保留相同的调用约定。
	if err := ctx.Err(); err != nil {
		return task{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	t := task{ID: s.nextID, Title: title}
	s.nextID++
	s.tasks[t.ID] = t
	return t, nil
}

func (s *taskStore) get(ctx context.Context, id int64) (task, bool, error) {
	if err := ctx.Err(); err != nil {
		return task{}, false, err
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	t, ok := s.tasks[id]
	return t, ok, nil
}

// api 只保存长期依赖。请求级数据必须放在局部变量或 Request Context 里。
type api struct {
	store *taskStore
}

func newHandler(store *taskStore) http.Handler {
	a := &api{store: store}
	mux := http.NewServeMux()

	// 方法写在模式里，让 ServeMux 为“路径存在、方法不对”的情况自动生成 405 与 Allow。
	mux.HandleFunc("GET /healthz", a.healthz)
	mux.HandleFunc("POST /tasks", a.createTask)
	mux.HandleFunc("GET /tasks/{id}", a.getTask)

	// 中间件从外到内执行：先记录整次调用，再生成 request ID，最后在业务边界恢复 panic。
	// 这样 recoverPanic 能看到 accessLog 创建的 statusRecorder，避免在响应已提交后再次写 500。
	return accessLog(requestID(recoverPanic(mux)))
}

func (a *api) healthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *api) createTask(w http.ResponseWriter, r *http.Request) {
	// MaxBytesReader 在读取时强制 1 MiB 上限，避免超大 body 被 Decode 进内存。
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	var input createTaskInput
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields() // 拼错字段不能悄悄被忽略。
	if err := decoder.Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	// Decode 一次成功不代表 body 只有一个 JSON 值；拒绝后面追加的第二段 JSON。
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "request body must contain one JSON value")
		return
	}
	if input.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	// 绝不改用 context.Background()；客户端取消和服务停止的信息要继续传给下游。
	t, err := a.store.create(r.Context(), input.Title)
	if err != nil {
		writeContextError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (a *api) getTask(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "task id must be a positive integer")
		return
	}

	t, found, err := a.store.get(r.Context(), id)
	if err != nil {
		writeContextError(w, err)
		return
	}
	if !found {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status) // 一定先提交状态码，再让 Encoder 触发 Write。
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("encode response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeContextError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, context.Canceled):
		// 客户端通常已经离开；这里只停止工作，不应把内部错误细节返回给它。
		return
	case errors.Is(err, context.DeadlineExceeded):
		writeError(w, http.StatusGatewayTimeout, "request timed out")
	default:
		log.Printf("unexpected request error: %v", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

// statusRecorder 包装 ResponseWriter，用于日志；它保留基础接口，
// 但不自动保留 Flusher、Hijacker 等可选接口，流式场景应显式实现并转发这些接口。
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	if r.status == 0 {
		r.status = status // 与 net/http 一样，只记录第一个最终状态码。
	}
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(p []byte) (int, error) {
	if r.status == 0 {
		r.WriteHeader(http.StatusOK) // 模拟 ResponseWriter.Write 的隐式 200 语义。
	}
	return r.ResponseWriter.Write(p)
}

func accessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recorder := &statusRecorder{ResponseWriter: w}
		started := time.Now()
		next.ServeHTTP(recorder, r)
		if recorder.status == 0 {
			recorder.status = http.StatusOK // Handler 什么都不写时，标准库结束时补 200。
		}
		log.Printf("request_id=%s method=%s path=%s status=%d duration=%s",
			r.Header.Get("X-Request-ID"), r.Method, r.URL.Path, recorder.status, time.Since(started))
	})
}

func requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 示例直接采用可信入口传来的 ID；公网服务还应校验长度和字符集，或自己生成。
		id := r.Header.Get("X-Request-ID")
		if id == "" {
			id = fmt.Sprintf("req-%d", time.Now().UnixNano())
		}
		w.Header().Set("X-Request-ID", id)
		next.ServeHTTP(w, r)
	})
}

func recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				log.Printf("panic in handler: %v", recovered)
				// 只能在响应尚未提交时安全返回 JSON；提交过的响应只能让连接按既有状态结束。
				if recorder, ok := w.(*statusRecorder); !ok || recorder.status == 0 {
					writeError(w, http.StatusInternalServerError, "internal server error")
				}
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func main() {
	server := &http.Server{
		Addr:              ":8080",
		Handler:           newHandler(newTaskStore()),
		ReadHeaderTimeout: 5 * time.Second,  // 限制慢速请求头，防止连接长期占用资源。
		ReadTimeout:       15 * time.Second, // 限制读取完整请求（上传接口要按业务调整）。
		WriteTimeout:      15 * time.Second, // 限制向慢客户端写普通响应的时间。
		IdleTimeout:       60 * time.Second, // keep-alive 连接等待下一请求的时间。
		MaxHeaderBytes:    1 << 20,          // 1 MiB；应与网关和业务需要一起评估。
	}

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("listening on http://127.0.0.1%s", server.Addr)
		serverErr <- server.ListenAndServe()
	}()

	// signal.NotifyContext 统一处理 Ctrl+C 和容器常见的 SIGTERM。
	stopContext, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	select {
	case <-stopContext.Done():
		log.Println("shutdown signal received")
	case err := <-serverErr:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("HTTP server failed: %v", err)
		}
		return
	}

	// Shutdown 停止接收新连接并等待存量请求；到时间仍未完成才返回 deadline error。
	shutdownContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}
```

用 `curl` 验证：

```bash
curl -i http://127.0.0.1:8080/healthz

curl -i -X POST http://127.0.0.1:8080/tasks \
  -H 'Content-Type: application/json' \
  -H 'X-Request-ID: demo-001' \
  -d '{"title":"理解 net/http"}'

curl -i http://127.0.0.1:8080/tasks/1
curl -i -X DELETE http://127.0.0.1:8080/tasks/1  # 路径存在但方法不允许，得到 405 和 Allow。
```

### 中间件为什么就是“包装 Handler”

`accessLog`、`requestID`、`recoverPanic` 都返回新的 `http.Handler`。它们在调用 `next.ServeHTTP` 前做准备、后做收尾；如果不调用 `next.ServeHTTP`，请求链就在此处被短路，例如认证失败直接返回 `401`。这比让业务函数感知日志、追踪等横切逻辑更清晰。

包装 `ResponseWriter` 时尤其要谨慎。`ResponseWriter` 的运行时实现通常还满足 `http.Flusher`、`http.Hijacker`、`io.ReaderFrom` 等可选接口；简单包装会隐藏这些能力。普通 JSON API 可以像示例一样只记录状态；SSE、WebSocket 或代理等流式场景，要么显式转发所需接口，要么使用经过充分测试的中间件实现。

## 从 Request 读取输入：先定边界，再解析

`Request` 把一条 HTTP 请求的协议字段带到 Handler 中。最常用的字段如下：

| 字段或方法 | 它表示什么 | 容易误用的地方 |
| --- | --- | --- |
| `Method` | 请求方法 | 不应只凭方法名推断权限或幂等性 |
| `URL` | 已解析的 URL | `Path` 已解码，`RawPath` 才保留可选原始转义 |
| `Header` | 请求头 | 字段名不区分大小写；值可能有多个 |
| `Body` | 流式请求体 | 只能按需读一次，且必须设大小边界 |
| `Host` | 请求的 Host 头 | 不是经过认证的租户或域名信息 |
| `RemoteAddr` | 直接对端地址 | 在反向代理后通常是代理地址，不是用户 IP |
| `Context()` | 请求生命周期 | 下游调用必须继续传递，不能替换成后台 Context |

HTTP 是无状态协议。`GET /search?q=go&page=2` 的查询参数属于 URL，`POST` 的 JSON、表单和文件属于请求体；两者可以同时存在。所有这些内容都来自客户端，必须当作不可信输入校验，而不是仅仅“解析成功”就直接使用。

### 查询参数与路径参数

`URL.Query()` 返回 `url.Values`，即 `map[string][]string`。使用 `Get` 会取第一个值；有重复键时要根据接口契约决定是拒绝、取一个，还是保留所有值。

```go
package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	keyword := strings.TrimSpace(query.Get("q"))
	if keyword == "" {
		http.Error(w, "q is required", http.StatusBadRequest)
		return
	}

	// strconv 只负责转换；范围仍由 API 自己定义。
	page := 1
	if raw := query.Get("page"); raw != "" {
		var err error
		page, err = strconv.Atoi(raw)
		if err != nil || page < 1 || page > 1000 {
			http.Error(w, "page must be between 1 and 1000", http.StatusBadRequest)
			return
		}
	}

	// /search?q=go&tag=http&tag=source 中的重复 tag 保留为切片。
	tags := query["tag"]
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"q": keyword, "page": page, "tags": tags,
	})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /search", search)
	_ = http.ListenAndServe(":8080", mux)
}
```

调用 `r.FormValue("q")` 看似更短，但它会触发解析并**忽略解析错误**，还混合查询参数与表单值。在有输入限制、签名校验或严格错误响应的接口里，显式调用 `ParseForm` 或 `ParseMultipartForm` 再读取对应字段更可控。

Go 1.22 的路径参数从 `PathValue` 取出：

```go
// GET /projects/{projectID}/tasks/{taskID}
projectID := r.PathValue("projectID")
taskID := r.PathValue("taskID")
```

这两个值仍只是字符串。即使路由已经保证 `{taskID}` 不跨越斜杠，也没有保证它是正整数、属于当前登录用户，或能安全地作为文件名、SQL 标识符和下游 URL 使用。

### 表单：`ParseForm`、`PostForm` 与优先级

浏览器常见的普通表单类型是 `application/x-www-form-urlencoded`。`ParseForm` 会解析 URL 查询串和该类型的 body；`PostForm` 只保存 body 中的表单值。下面是一个可以直接运行的注册接口：

```go
package main

import (
	"fmt"
	"net/http"
	"strings"
)

func signup(w http.ResponseWriter, r *http.Request) {
	// 限制必须在 ParseForm 之前设置；否则解析器可能已经读取了过大的 body。
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1 MiB

	if err := r.ParseForm(); err != nil {
		// MaxBytesReader 超限和编码错误都会走到这里；生产接口可按错误类型细分日志。
		http.Error(w, "invalid or oversized form", http.StatusBadRequest)
		return
	}

	// PostForm 明确表示“只从 POST body 取值”，不会意外接受 ?email=...。
	name := strings.TrimSpace(r.PostForm.Get("name"))
	email := strings.TrimSpace(r.PostForm.Get("email"))
	if name == "" || email == "" {
		http.Error(w, "name and email are required", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = fmt.Fprintf(w, "registered: %s <%s>\n", name, email)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /signup", signup)
	_ = http.ListenAndServe(":8080", mux)
}
```

可以用下面命令验证：

```bash
curl -i -X POST http://127.0.0.1:8080/signup \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'name=毛毛张' \
  --data-urlencode 'email=maomao@example.com'
```

`ParseForm` 的 body 大小限制还需要仔细区分：未使用 `MaxBytesReader` 时，服务端会为 URL 编码表单保留默认的读取上限；这不是上传接口的安全策略，也不替代根据业务设置的明确上限。无论 `Content-Length` 声称多小，都要在实际读取的 `Body` 上实施限制。

### JSON：拒绝未知字段与第二个值

JSON API 的两个常见漏洞不是“解码报错”，而是默认悄悄忽略错拼的字段，以及只解码第一个 JSON 值后忽略尾随内容。前面的任务服务已经演示了这两个防线。下面抽出判断顺序，方便复用：

```go
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	// 调用方负责决定每个接口的容量；不要把所有接口统一设成无限大。
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields() // 把客户端字段拼写错误变成明确的 400。
	if err := decoder.Decode(dst); err != nil {
		return err
	}

	// Decode 成功一次不表示整个 body 合法。
	// `{} {}` 的第二个对象必须被拒绝，避免不同组件理解不一致。
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("request body must contain exactly one JSON value")
	}
	return nil
}
```

这是一个**代码片段**，依赖 `encoding/json`、`errors`、`io` 与 `net/http` 的导入。`Content-Type` 也应检查，但不能只做精确字符串比较；常见值含有 `; charset=utf-8` 参数，适合用 `mime.ParseMediaType` 解析后再比较主类型。对外 API 还应明确空字符串、零值、最大长度、枚举和业务权限的规则，JSON 解码器无法替代这些校验。

### 文件上传：控制总量、内存和文件名

`multipart/form-data` 会包含字段和文件。`ParseMultipartForm(maxMemory)` 中的 `maxMemory` 只是“尽量留在内存的文件部分”阈值，超过部分会落到临时文件；它**不是请求总大小上限**。先用 `MaxBytesReader` 限制总量，再调用 `ParseMultipartForm`。

```go
package main

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const (
	maxUploadBytes = 10 << 20 // 整个 multipart 请求最多 10 MiB。
	maxMemoryBytes = 1 << 20  // 最多 1 MiB 文件内容驻留内存，其余可使用临时文件。
)

func upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	if err := r.ParseMultipartForm(maxMemoryBytes); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			http.Error(w, "upload is too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "invalid multipart body", http.StatusBadRequest)
		return
	}
	defer r.MultipartForm.RemoveAll() // 删除标准库为超出内存阈值创建的临时文件。

	file, header, err := r.FormFile("avatar")
	if err != nil {
		http.Error(w, "avatar is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 客户端 filename 只能用于展示，绝不能直接拼到服务器路径。
	// 此处只保留扩展名并由服务器生成新名称；真实系统通常还做内容类型、魔数和病毒扫描。
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
		http.Error(w, "only PNG and JPEG are accepted", http.StatusBadRequest)
		return
	}

	if err := os.MkdirAll("./uploads", 0o750); err != nil {
		http.Error(w, "cannot prepare upload directory", http.StatusInternalServerError)
		return
	}
	destination, err := os.CreateTemp("./uploads", "avatar-*"+ext)
	if err != nil {
		http.Error(w, "cannot create upload", http.StatusInternalServerError)
		return
	}
	defer destination.Close()

	// Copy 仍受 MaxBytesReader 约束；不要把上传内容一次性 ReadAll 到内存。
	if _, err := io.Copy(destination, file); err != nil {
		http.Error(w, "cannot save upload", http.StatusInternalServerError)
		return
	}
	fmt.Fprintf(w, "saved as %s\n", filepath.Base(destination.Name()))
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /upload", upload)
	_ = http.ListenAndServe(":8080", mux)
}
```

本例的 `./uploads` 目录不应该同时作为 `FileServer` 的根目录，否则未审核、未授权的上传内容会立刻成为公开文件。上传系统通常还需要对象存储、随机且不可猜的键、扫描与审核、下载授权和独立的内容分发域名。

## 静态文件与缓存：文件服务不是目录暴露

`http.FileServer` 会将一个 `fs.FS` 暴露为只读 HTTP 文件系统；配合 `http.StripPrefix` 可以把 URL 前缀和磁盘目录对应起来。它会处理目录索引和重定向等 HTTP 细节，但不会替应用判断“这个文件是否适合公开”。

```go
package main

import (
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	// os.DirFS 将文件系统能力限制在 ./public 之下；不要传入项目根目录、家目录或上传临时目录。
	public, err := fs.Sub(os.DirFS("."), "public")
	if err != nil {
		log.Fatal(err)
	}

	files := http.FileServer(http.FS(public))
	mux := http.NewServeMux()
	mux.Handle("GET /assets/", http.StripPrefix("/assets/", cacheAssets(files)))

	server := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	log.Fatal(server.ListenAndServe())
}

func cacheAssets(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 只对构建产物中的带内容指纹文件使用长期 immutable 缓存。
		// 如果 /assets/app.js 会被覆盖，这个策略会让用户长期拿到旧版本。
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		next.ServeHTTP(w, r)
	})
}
```

若 URL 是 `/assets/app.8c21.js`，`StripPrefix` 先把 `/assets/` 删除，`FileServer` 便在 `public` 中查找 `app.8c21.js`。它不能替代鉴权下载：需要权限的文件应由业务 Handler 校验身份后使用 `http.ServeContent`、受控重定向或对象存储签名 URL 提供。

对文件名和缓存还有三个实际边界：

- `http.ServeFile` / `FileServer` 会拒绝包含 `..` 的请求路径，但这不意味着把敏感目录作为根目录就是安全的。
- 不要让用户控制 `Content-Type`、`Content-Disposition` 或缓存头；下载 HTML、SVG 等主动内容时，往往需要 `Content-Disposition: attachment` 与 `X-Content-Type-Options: nosniff`。
- HTML 入口页通常不能和带指纹的静态资源采用相同的超长缓存策略，否则新版本的资源引用可能无法及时更新。

## Cookie：浏览器状态的传输规则，不是授权方案本身

Cookie 是服务端通过 `Set-Cookie` 指示浏览器保存、随后浏览器按域名、路径、Secure 和 SameSite 规则自动回送的一小段状态。它适合保存不透明的会话标识，而不适合放入密码、完整用户资料或未经签名的权限字段。

```go
package main

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"time"
)

func newSessionID() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func login(w http.ResponseWriter, r *http.Request) {
	// 示例省略用户名和密码校验；只有认证成功后才能创建服务端会话记录。
	sessionID, err := newSessionID()
	if err != nil {
		http.Error(w, "cannot create session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    sessionID, // 实际系统还要将 ID 映射到服务端的会话与过期时间。
		Path:     "/",
		MaxAge:   int((8 * time.Hour).Seconds()),
		HttpOnly: true, // JavaScript 不能读取，降低 XSS 窃取会话的风险。
		Secure:   true, // 仅 HTTPS 回送；本地 HTTP 调试时需使用独立开发配置。
		SameSite: http.SameSiteLaxMode,
	})
	w.WriteHeader(http.StatusNoContent)
}

func me(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}
	// 这里必须到服务端会话存储验证 session ID，而不是相信它代表谁。
	w.WriteHeader(http.StatusNoContent)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /login", login)
	mux.HandleFunc("GET /me", me)
	_ = http.ListenAndServe(":8080", mux)
}
```

`HttpOnly` 减少脚本读取 Cookie 的机会，却不能阻止浏览器自动附带 Cookie，因此不能替代 CSRF 防护。修改数据的 Cookie 鉴权接口通常需要 SameSite 策略、来源校验和/或 CSRF token；跨站嵌入与第三方登录场景则要特别评估 `SameSite=None; Secure` 的影响。`Secure` 只在 HTTPS 下生效，生产环境不应为“方便测试”关闭它。

## HTTP 客户端：`Client` 是策略，`Transport` 是连接池

`http.Get`、`http.Post` 很适合短脚本，但线上应用应长期复用有明确超时策略的 `http.Client`。`Client.Do` 仅在 DNS、连接、TLS、协议、取消或重定向等传输层失败时返回 Go 错误；服务端返回 `404`、`429`、`500` 时，通常仍会得到 `err == nil` 的 `Response`，业务必须检查状态码。

下面的客户端展示了 URL 编码、请求 Context、请求头、响应体关闭与大小限制：

```go
package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

func main() {
	endpoint, err := url.Parse("https://api.example.com/search")
	if err != nil {
		panic(err)
	}
	values := endpoint.Query()
	values.Set("q", "Go HTTP & source") // Encode 会正确处理空格、&、中文等字符。
	values.Set("page", "1")
	endpoint.RawQuery = values.Encode()

	// Context 是本次调用的预算；Client.Timeout 是兜底的整次交换期限。
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		panic(err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "example-client/1.0")

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close() // 关闭（或读到 EOF）后，连接才有机会回到连接池。

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		fmt.Printf("upstream rejected request: %s\n", resp.Status)
		return
	}

	// 远端响应不可信。即使 Content-Length 不大，也限制实际读取量。
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		panic(err)
	}
	fmt.Printf("status=%s body=%s\n", resp.Status, body)
}
```

`Client.Timeout` 覆盖从开始请求、重定向到读取响应 body 的整个期限。它是全局保护，不能替代一次调用的 Context，也不能表达“拨号 300 ms、等响应头 1 s、总共 2 s”这类分阶段预算。不要每次请求都 `&http.Client{}`：默认或自定义 `Transport` 中的空闲连接池因此无法复用，TLS 握手和端口消耗也会显著增加。

### Transport 如何取连接

`Transport` 是客户端实际实现 `RoundTripper` 的组件，负责代理选择、拨号、TLS、HTTP/1.1 keep-alive、HTTP/2 协商与空闲连接回收。`Client` 调用链可概括为：

```text
Client.Do
  → send
    → Transport.RoundTrip
      → getConn（优先等待/复用空闲 persistConn）
      → persistConn.roundTrip（写请求、等响应、归还或关闭连接）
```

本机 Go 1.22.10 的 `Transport.roundTrip` 会在请求有效性检查后调用 `getConn`，得到 `persistConn` 后再调用它的 `roundTrip`；相关入口分别位于 `src/net/http/transport.go` 的 `517`、`1362` 与 `2603` 行附近。这个分层解释了为什么 **Client 与 Transport 都应长时间复用且可并发使用**：连接池状态就在 Transport 内部。

生产代码不要从 `&http.Transport{}` 空白开始，因为会丢掉默认代理、拨号器和其他合理默认值；克隆默认 Transport 后有针对性地调节：

```go
package main

import (
	"crypto/tls"
	"net"
	"net/http"
	"time"
)

func newAPIClient() *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()

	// 每一阶段都有上限，避免总超时被某个阶段完全耗尽却难以诊断。
	transport.DialContext = (&net.Dialer{Timeout: 500 * time.Millisecond, KeepAlive: 30 * time.Second}).DialContext
	transport.TLSHandshakeTimeout = 500 * time.Millisecond
	transport.ResponseHeaderTimeout = time.Second

	// 连接池容量应与调用并发、上游容量和进程数一起评估，而不是无限加大。
	transport.MaxIdleConns = 100
	transport.MaxIdleConnsPerHost = 20
	transport.MaxConnsPerHost = 50
	transport.IdleConnTimeout = 90 * time.Second
	transport.TLSClientConfig = &tls.Config{MinVersion: tls.VersionTLS12}

	return &http.Client{Transport: transport, Timeout: 2 * time.Second}
}

func main() {
	client := newAPIClient()
	_ = client // 在应用初始化时创建一次，并注入所有需要访问该上游的组件。
}
```

绝不要把 `InsecureSkipVerify: true` 当作“修复证书问题”的方案；它会关闭对服务器证书的验证，使 HTTPS 易受中间人攻击。证书链、主机名、代理根证书或测试环境的 CA 配置才是应修复的对象。

### 重定向与 Cookie Jar

默认 Client 会遵循有限次数的重定向。对下载器、支付回调、SSRF 敏感的服务和需要记录 3xx 的诊断工具，应该明确自己的策略：

```go
client := &http.Client{
	Timeout: 5 * time.Second,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 3 {
			return fmt.Errorf("too many redirects")
		}
		// 只允许预期的 HTTPS 域名，防止重定向把服务带到意外目标。
		if req.URL.Scheme != "https" || req.URL.Host != "api.example.com" {
			return http.ErrUseLastResponse
		}
		return nil
	},
}
```

要模拟浏览器式 Cookie 持久行为，需要显式配置 Jar：

```go
jar, err := cookiejar.New(nil)
if err != nil {
	return err
}
client := &http.Client{Jar: jar, Timeout: 5 * time.Second}
```

以上是代码片段，需要导入 `fmt`、`net/http`、`net/http/cookiejar` 和 `time`。Jar 会处理服务端的 `Set-Cookie` 并在后续符合规则的请求中附带 Cookie；它不等于安全的凭据存储，也不应让服务端拿不可信 URL 触发携带内部 Cookie 的任意请求。

## ReverseProxy：把请求转给上游，但不要转发一切

反向代理位于客户端和上游服务之间。它常见于统一入口、路径迁移、简单网关和开发时的前后端联调；它至少需要定义目标地址、超时、错误转换、身份边界和哪些头可以被信任。

Go 1.22.10 的 `httputil.ReverseProxy.ServeHTTP` 位于 `src/net/http/httputil/reverseproxy.go` 第 332 行附近。实现先复制并清理 hop-by-hop headers，创建出站请求，执行 `Transport.RoundTrip`，再复制响应头和 body。hop-by-hop 头（如 `Connection`、`Keep-Alive`、`Transfer-Encoding`）描述的是一跳连接，不能原样跨代理转发。

`NewSingleHostReverseProxy` 方便入门，但新代码通常应使用 `Rewrite` 明确改写目标和转发头：

```go
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"
)

func main() {
	target, err := url.Parse("http://127.0.0.1:9000")
	if err != nil {
		log.Fatal(err)
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = 2 * time.Second

	proxy := &httputil.ReverseProxy{
		Transport: transport,
		Rewrite: func(pr *httputil.ProxyRequest) {
			// SetURL 修改出站请求的 scheme、host 和基准路径。
			pr.SetURL(target)
			// 只有代理是唯一可信入口、客户端无法绕过代理时，才向上游传递这类转发信息。
			pr.SetXForwarded()
			// 明确追加而不是盲目透传来自客户端的身份头。
			pr.Out.Header.Set("X-Gateway", "example-proxy")
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			if errors.Is(err, context.Canceled) {
				return // 客户端已离开，不再尝试写一份错误响应。
			}
			log.Printf("proxy upstream error: %v", err)
			http.Error(w, "upstream service unavailable", http.StatusBadGateway)
		},
	}

	mux := http.NewServeMux()
	// /api/users 会在交给 proxy 前删除 /api，目标服务看到 /users。
	mux.Handle("/api/", http.StripPrefix("/api", proxy))

	server := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	log.Fatal(server.ListenAndServe())
}
```

代理不能天然解决认证、限流、熔断、重试、服务发现、审计与负载均衡；特别是非幂等请求不能因为“上游看起来没响应”就不加条件重试。还要避免开放代理：目标 URL 不应由外部请求直接控制，否则攻击者可借你的网络访问内部地址。

## 可测试性：Handler 不必先监听端口

显式构造 `ServeMux` 的另一个好处是可用 `httptest` 在进程内测试路由与响应，不需要端口、goroutine 或全局 `DefaultServeMux`。以下完整示例验证了文本响应：

```go
package greeting

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func newHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /hello", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write([]byte("hello\n"))
	})
	return mux
}

func TestHello(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/hello", nil)
	recorder := httptest.NewRecorder()

	newHandler().ServeHTTP(recorder, request)
	response := recorder.Result()
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
	if got := recorder.Body.String(); got != "hello\n" {
		t.Fatalf("body = %q", got)
	}
	if !strings.HasPrefix(response.Header.Get("Content-Type"), "text/plain") {
		t.Fatalf("unexpected content type: %q", response.Header.Get("Content-Type"))
	}
}
```

保存为 `greeting_test.go` 后执行 `go test`。若要测试真实客户端与连接行为，可使用 `httptest.NewServer` 创建临时服务器；若要隔离出站 HTTP 调用，可给 `http.Client.Transport` 注入实现 `RoundTrip(*http.Request)` 的测试替身。测试不应依赖外网、当前时间或共享全局路由状态。

## Request Context、超时与关闭是三件相连的事

服务端请求的 `r.Context()` 不是 `context.Background()`，它来自服务器的连接与请求生命周期。标准库在 `Request.Context` 的注释中规定：客户端连接关闭、HTTP/2 请求取消，或 `ServeHTTP` 返回时，该 Context 会被取消。

这要求调用链保持同一个 Context：

```go
// 正确：数据库驱动、RPC 客户端有机会因为客户端离开而停止等待。
user, err := repository.FindUser(r.Context(), userID)

// 错误：丢掉请求的取消与截止时间，服务已关闭时下游还可能继续工作。
user, err := repository.FindUser(context.Background(), userID)
```

`http.Server` 的超时和业务 Context 超时解决的问题不同，不能互相替代：

| 机制 | 限制的对象 | 常见用途 |
| --- | --- | --- |
| `ReadHeaderTimeout` | 读取请求头 | 防御慢速请求头，占用连接前尽早释放 |
| `ReadTimeout` | 读取请求（含 body） | 对有限大小的普通请求设置上限 |
| `WriteTimeout` | 写响应的时间 | 避免慢客户端长期占住写资源；流式响应需谨慎设置 |
| `IdleTimeout` | keep-alive 空闲连接 | 限制等待下一请求的时间 |
| `context.WithTimeout` | 一项业务及其下游调用 | 给数据库、RPC、计算任务一个可传递的预算 |

例如，业务调用可以在 Handler 内派生一个更短的预算：

```go
// 这个 800 ms 是“查库存”自己的预算，永远不会延长 r.Context 的生命周期。
ctx, cancel := context.WithTimeout(r.Context(), 800*time.Millisecond)
defer cancel()

stock, err := inventoryClient.Get(ctx, productID)
```

`Shutdown(ctx)` 又是进程级的收尾期限。它会标记服务正在关闭、关闭监听器以阻止新的连接，然后循环关闭空闲连接并等待活跃连接变为可关闭。源码中的核心结构如下：

```go
// Go 1.22.10：src/net/http/server.go（节选）
func (srv *Server) Shutdown(ctx context.Context) error {
	srv.inShutdown.Store(true)

	srv.mu.Lock()
	lnerr := srv.closeListenersLocked() // Accept 随即返回 ErrServerClosed。
	srv.mu.Unlock()

	for {
		if srv.closeIdleConns() { // 空闲连接关闭完，且没有活跃连接时结束。
			return lnerr
		}
		select {
		case <-ctx.Done():
			return ctx.Err() // 到达进程允许的最大等待时间。
		case <-timer.C:
		}
	}
}
```

注意 `Shutdown` **不会主动取消正在运行的 Handler**，它只是等待。因此“调用 `Shutdown` 就能让数据库查询停下来”是误解；每个下游调用都必须接收并尊重自己的 Context。对于 WebSocket、`Hijack` 后的连接或其他升级连接，标准库文档也说明 `Shutdown` 不会替你等待它们，需要用 `RegisterOnShutdown` 发出协议级关闭通知，并自行管理完成等待。

调用 `Shutdown` 后 `ListenAndServe` 会返回 `http.ErrServerClosed`，这是预期结果，不应 `log.Fatal`。并且一个调用过 `Shutdown` 的 `Server` 不能重新使用；重新启动请创建新实例。

## 几个可靠性边界

- 不把客户端输入直接用于 SQL、文件系统或下游 URL。查询参数、路径参数、JSON 和转发头都属于不可信输入。
- 用 `http.MaxBytesReader` 约束 JSON、表单和上传请求体；`Content-Length` 只是客户端声明，不能替代读取时的限制。
- `RemoteAddr` 是与当前进程直接建连的一跳地址。只有服务确定在可信代理之后、代理会清理并重新生成转发头、客户端不能绕过代理时，才考虑 `X-Forwarded-For` 等头。
- `recover` 能避免单个 panic 带倒进程，却不能在响应已经写出后“撤回”半份响应。修复 panic 根因、记录堆栈并准备错误监控才是重点。
- `WriteTimeout` 对 SSE、长轮询、文件下载等长时间响应不是通用安全阀；这些接口应单独设定协议、心跳、上下游超时和资源配额。
- 测试 Handler 时不必监听真实端口，使用 `httptest.NewRequest`、`httptest.NewRecorder` 调用 `handler.ServeHTTP` 即可；这也是避免 `DefaultServeMux` 的一个实际好处。

## 总结

`net/http` 以 `Handler` 为应用边界：`Server` 接受连接并解析请求，`ServeMux` 按 Host、方法和路径选择更具体的 Handler，Handler 从 `Request` 读取输入和 Context，再通过 `ResponseWriter` 提交响应。

可靠的 HTTP 服务不是把 Handler 函数写出来就结束了。它还需要明确的路由语义与输入限制，正确的“头—状态码—响应体”写入顺序，可并发使用的依赖，请求 Context 向下游的持续传递，以及在停止接流量后等待存量请求的优雅关闭。把这些边界守住，再接入框架、数据库、鉴权和可观测性时，服务的运行方式仍然清晰可控。

## 参考资料

- [Go 1.22.10 `net/http` 服务端源码](https://cs.opensource.google/go/go/+/go1.22.10:src/net/http/server.go)
- [Go 1.22.10 `ServeMux` 路由树源码](https://cs.opensource.google/go/go/+/go1.22.10:src/net/http/routing_tree.go)
- [Go 1.22.10 `Transport` 源码](https://cs.opensource.google/go/go/+/go1.22.10:src/net/http/transport.go)
- [Go 1.22.10 `ReverseProxy` 源码](https://cs.opensource.google/go/go/+/go1.22.10:src/net/http/httputil/reverseproxy.go)
- [net/http 包文档](https://pkg.go.dev/net/http)
- [net/http：ServeMux 模式](https://pkg.go.dev/net/http#ServeMux)
