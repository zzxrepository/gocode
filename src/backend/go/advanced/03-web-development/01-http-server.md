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
- [net/http 包文档](https://pkg.go.dev/net/http)
- [net/http：ServeMux 模式](https://pkg.go.dev/net/http#ServeMux)
