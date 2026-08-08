---
permalink: /backend/go/advanced/03-web-development/01-http-server/
title: 01. HTTP 服务与 net/http
shortTitle: 01. HTTP 服务
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
  - 服务端开发
---

# 01. HTTP 服务与 net/http

## 前言

Gin 等 Web 框架能提高开发效率，但它们最终仍建立在 Go 的 `net/http` 之上。理解 `net/http`，才能看清 HTTP 请求如何进入处理函数、`context` 如何随请求传播、为什么一个共享变量会在高并发下出错，以及优雅关闭服务真正关闭了什么。

`net/http` 是标准库包，但这里把它放在“Web 编程基础”，因为学习目标不是枚举 API，而是建立一个可用于真实服务的 HTTP 入口。后续学习 Gin 时，路由、中间件、请求绑定和响应处理都会有对应关系。

## 核心模型

HTTP 服务最小的抽象是 `http.Handler`：

```go
type Handler interface {
	ServeHTTP(http.ResponseWriter, *http.Request)
}
```

- `*http.Request` 保存方法、路径、请求头、请求体，以及本次请求的 `Context`。
- `http.ResponseWriter` 用于设置响应头、状态码和响应体。
- `http.ServeMux` 把路径匹配到 `Handler`。
- `http.Server` 管理监听、超时和关闭。

同一个 handler 会被多个请求并发调用。handler 应把请求相关数据放在局部变量中；共享缓存、计数器、连接等状态必须由同步机制或专门组件管理。

## 真实场景：订单创建接口

下面实现一个简化的订单入口。重点不在业务本身，而在 HTTP 边界应该完成的工作：限制请求体、校验输入、传递请求 context、写出一致的 JSON 响应，并在进程退出时停止接收新请求。

```go
package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

type CreateOrderRequest struct {
	ProductID int64 `json:"product_id"`
	Quantity  int   `json:"quantity"`
}

type OrderService interface {
	// CreateOrder 接收请求 context，使客户端取消和服务关闭能传到数据库或 RPC 调用。
	CreateOrder(ctx context.Context, productID int64, quantity int) (int64, error)
}

// ErrInsufficientStock 是业务层暴露给 HTTP 层的稳定错误语义。
// HTTP 层据此决定返回 409，而不需要理解库存扣减的数据库细节。
var ErrInsufficientStock = errors.New("insufficient stock")

func createOrderHandler(service OrderService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}

		// 先限制 Body，再解码，避免异常大的 JSON 占用过多内存。
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		defer r.Body.Close()

		var input CreateOrderRequest
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields() // 及早发现客户端拼错字段，而不是静默忽略。
		if err := decoder.Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
			return
		}
		if input.ProductID <= 0 || input.Quantity <= 0 || input.Quantity > 100 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid product_id or quantity"})
			return
		}

		orderID, err := service.CreateOrder(r.Context(), input.ProductID, input.Quantity)
		if err != nil {
			// 示例只区分业务错误和内部错误；真实项目应有统一错误码和日志字段。
			if errors.Is(err, ErrInsufficientStock) {
				writeJSON(w, http.StatusConflict, map[string]string{"error": "insufficient stock"})
				return
			}
			log.Printf("create order failed: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
			return
		}

		writeJSON(w, http.StatusCreated, map[string]any{"order_id": orderID})
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	// 状态码和 Header 必须在首次写入响应体之前设置。
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write response failed: %v", err)
	}
}

func logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		next.ServeHTTP(w, r) // 中间件通过包装 Handler 在调用前后附加横切逻辑。
		log.Printf("method=%s path=%s duration=%s", r.Method, r.URL.Path, time.Since(started))
	})
}

// NewServer 只负责 HTTP 装配，具体的 OrderService 由应用启动代码注入。
func NewServer(service OrderService) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.Handle("/v1/orders", createOrderHandler(service))

	return &http.Server{
		Addr:              ":8080",
		Handler:           logging(mux),
		ReadHeaderTimeout: 5 * time.Second, // 限制读取请求头，降低慢速连接占用风险。
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
}

// Run 在收到终止信号后执行优雅关闭；业务代码不应在 handler 中直接调用 os.Exit。
func Run(server *http.Server) error {
	serverErr := make(chan error, 1)
	go func() {
		// 通过 channel 把监听失败传回调用方，不能只在 goroutine 中打印后继续运行。
		serverErr <- server.ListenAndServe()
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(stop)

	select {
	case err := <-serverErr:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-stop:
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if err := <-serverErr; err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
```

应用入口可以在初始化数据库等依赖后调用 `Run(NewServer(orderService))`。`Shutdown` 会先停止接收新连接，再等待正在处理的请求结束，直到 context 到期。它不会替业务代码取消任意后台 goroutine；后台任务仍需要自己的生命周期管理。

## 请求、响应与中间件

响应头和状态码在第一次写入响应体后就不能可靠修改。因此应先完成参数校验和业务判断，再调用 `WriteHeader` 或写 JSON。对于大文件上传和 JSON 接口，都要限制 body 大小；只依赖反向代理限制并不足以覆盖服务内部的错误调用路径。

中间件本质上是 `Handler -> Handler` 的高阶函数。日志、恢复、认证、限流和追踪都可以通过包装 handler 实现。中间件不要把用户身份、数据库事务等请求状态放进全局变量；应使用局部变量，必要时通过 `context` 传递小而明确的请求元数据。

## `http.Client` 也要复用

调用下游服务时，`http.Client` 与其底层 `Transport` 应在应用启动时创建并复用。它们可被多个 goroutine 并发使用，并会复用空闲连接；每个请求新建 client 会失去连接池收益。

```go
var paymentClient = &http.Client{
	Timeout: 800 * time.Millisecond, // 为单次下游调用设置明确上限。
}

func callPayment(ctx context.Context, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	return paymentClient.Do(req)
}
```

调用成功后必须关闭 `resp.Body`。否则连接可能无法回收到连接池，最终耗尽可用连接。

## `net/http` 的执行路径

从源码结构看，`http.Server` 接受连接后把连接交给内部服务逻辑；请求会被解析为 `Request`，再通过 `ServeMux` 选出 handler，最终调用 `ServeHTTP`。框架做的事情大多是在这条路径上增加路由匹配、上下文、绑定、校验和中间件组合。

这解释了两个实践规则：一是 handler 必须支持并发调用；二是不要使用包级 `DefaultServeMux` 管理大型服务。显式创建 `ServeMux`，能让路由归属、测试和多服务进程中的隔离更清楚。

## 总结

`net/http` 提供了足够构建生产级服务的基本件：`Handler`、`ServeMux`、`Server`、`Request`、`ResponseWriter` 和 `Client`。可靠的 HTTP 入口需要在边界完成输入限制与校验，向下传递 `context`，配置服务超时，并在退出时调用 `Shutdown`。这些原则迁移到 Gin 等框架后依然成立。

## 参考资料

- [net/http 包文档](https://pkg.go.dev/net/http)
- [http.Server.Shutdown 文档](https://pkg.go.dev/net/http#Server.Shutdown)
- [net/http 源码](https://go.dev/src/net/http/server.go)
