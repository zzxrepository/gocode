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

`net/http` 是 Go 标准库中处理 HTTP 的包，同时提供服务端和客户端能力。一个 HTTP 服务要把请求接进程序，完成路由、解析、业务调用、响应和优雅退出；这些环节构成了服务端开发最核心的运行路径。

Gin 等 Web 框架最终也要把请求交给 `net/http`。先把这层看明白，之后理解框架中的路由、中间件、请求上下文和优雅停机就不会只是在背 API。

## 一个 HTTP 服务到底在做什么

一次请求大致经过下面这条路径：

```text
客户端连接
  -> http.Server 接收并解析 HTTP 报文
  -> ServeMux 根据路径和方法找到 Handler
  -> Handler 读取 Request、调用业务代码
  -> ResponseWriter 写入状态码、响应头和响应体
```

核心接口只有一个：

```go
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}
```

普通函数也可以通过 `http.HandlerFunc` 适配为 `Handler`，所以最常见的写法是：

```go
mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
	// r 保存请求方法、路径、请求头、请求体和请求上下文。
	// w 用于写回状态码、响应头和响应体。
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok\n"))
})
```

`ResponseWriter` 一旦开始写入响应体，默认状态码就会变成 `200 OK`。因此应先设置响应头和状态码，再写响应体。

## 从一个完整的小服务开始

下面用“创建订单”接口串起最小但完整的服务端流程。业务实现通过接口注入，HTTP 层只负责协议处理，不直接写 SQL。

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
	"os"
	"os/signal"
	"syscall"
	"time"
)

type OrderService interface {
	Create(ctx context.Context, productID int64, quantity int) (int64, error)
}

type Server struct {
	orders OrderService
}

type createOrderRequest struct {
	ProductID int64 `json:"productId"`
	Quantity  int   `json:"quantity"`
}

type createOrderResponse struct {
	ID int64 `json:"id"`
}

func NewHandler(orders OrderService) http.Handler {
	server := &Server{orders: orders}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", server.healthz)
	mux.HandleFunc("/orders", server.ordersHandler)
	return mux
}

func (s *Server) healthz(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) ordersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	// 限制请求体大小，避免客户端用超大 JSON 占满服务内存。
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	defer r.Body.Close()

	var input createOrderRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields() // 拼错字段应尽早暴露，而不是悄悄被忽略。
	if err := decoder.Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	// 一个请求体只能包含一个 JSON 值，拒绝后面偷偷追加的第二段内容。
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "request body must contain one JSON value")
		return
	}
	if input.ProductID <= 0 || input.Quantity <= 0 {
		writeError(w, http.StatusBadRequest, "productId and quantity must be positive")
		return
	}

	// r.Context 会在客户端断开或服务关闭时被取消，应继续传给业务和下游调用。
	orderID, err := s.orders.Create(r.Context(), input.ProductID, input.Quantity)
	if err != nil {
		log.Printf("create order: %v", err) // 服务端记录细节，响应不泄露内部错误。
		writeError(w, http.StatusInternalServerError, "create order failed")
		return
	}
	writeJSON(w, http.StatusCreated, createOrderResponse{ID: orderID})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status) // 必须在 Encode 前写入，避免被默认的 200 覆盖。
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write JSON response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func main() {
	orders := newOrderService() // 业务层可以使用 database/sql、GORM 或远程服务。

	httpServer := &http.Server{
		Addr:              ":8080",
		Handler:           NewHandler(orders),
		ReadHeaderTimeout: 5 * time.Second,  // 防止慢速请求长期占用连接。
		IdleTimeout:       60 * time.Second, // 空闲 keep-alive 连接的最大等待时间。
	}

	go func() {
		log.Printf("HTTP server listening on %s", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("HTTP server failed: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop // 等待容器或本地终端发出的停止信号。

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}
```

启动后可用下面的命令验证路由和 JSON 响应：

```bash
curl -i http://localhost:8080/healthz
curl -i -X POST http://localhost:8080/orders \
  -H 'Content-Type: application/json' \
  -d '{"productId": 1001, "quantity": 2}'
```

## 请求数据应从哪里读取

`*http.Request` 里包含 HTTP 请求的全部信息。常用入口如下：

| 需求 | 常用位置 |
| --- | --- |
| 请求方法 | `r.Method` |
| 路径 | `r.URL.Path` |
| 查询参数 | `r.URL.Query().Get("page")` |
| 请求头 | `r.Header.Get("Authorization")` |
| Cookie | `r.Cookie("session")` |
| JSON 或表单主体 | `r.Body`、`r.ParseForm()` |
| 取消与截止时间 | `r.Context()` |

参数存在不等于参数合法。分页大小、订单数量、枚举值、身份信息都要在 HTTP 层或业务层按各自职责校验。不要把用户输入直接拼进 SQL、文件路径或下游 URL。

## 路由和中间件是怎样组合的

标准库的 `ServeMux` 负责把路径映射到 Handler。跨请求的通用逻辑，例如访问日志、恢复 panic、认证和链路追踪，适合用“包装 Handler”的方式实现。

```go
func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		next.ServeHTTP(w, r) // 调用下一层；不调用就等于中断请求链。
		log.Printf("method=%s path=%s cost=%s", r.Method, r.URL.Path, time.Since(started))
	})
}

handler := logging(NewHandler(orders))
```

中间件不是越多越好。认证、日志、超时和恢复等应有明确位置；把业务规则塞进多层匿名包装后，排查请求路径会非常困难。

## 为什么 Handler 必须按并发环境设计

`http.Server` 会并发处理请求。同一个 Handler 可能同时被多个 goroutine 调用，所以不能把“当前用户”“当前订单”等可变请求状态存到 `Server` 的普通字段中。

```go
// 错误示例：并发请求会争抢 currentUser。
type Server struct {
	currentUser string
}
```

请求状态应该存在局部变量、`r.Context()` 或专门的并发安全组件中。共享缓存、连接池和统计信息则需要明确的同步策略。

## 优雅关闭关闭的是什么

`ListenAndServe` 返回前，服务器会持续接受新连接。收到 `SIGTERM` 后直接退出，会中断正在处理的请求。`Shutdown` 的行为是：停止接受新连接，关闭空闲连接，并等待正在处理的请求结束，直到传入的 context 到期。

因此每个下游调用都应使用请求 context，并设置合理的超时。否则 handler 卡在不可取消的数据库调用或网络调用上，优雅关闭也只能等到超时。

## 总结

`net/http` 的服务端核心是 `Handler`、`Request`、`ResponseWriter` 和 `Server`。一个可靠的 HTTP 服务应明确路由和方法，限制并校验输入，先写状态码再写响应体，把 `r.Context()` 传入业务调用，并在进程退出时通过 `Shutdown` 收尾。

理解这套基础后，再使用 Gin 等框架时，看到的只是更高效的路由和中间件表达，而不是另一套完全不同的 HTTP 模型。

## 参考资料

- [net/http 包文档](https://pkg.go.dev/net/http)
- [net/http：Server.Shutdown](https://pkg.go.dev/net/http#Server.Shutdown)
- [encoding/json 包文档](https://pkg.go.dev/encoding/json)
