---
permalink: /backend/go/frameworks-and-ecosystem/03-microservice-frameworks/01-kratos/
title: 01. Kratos：用传输层建立 Go 微服务
shortTitle: 01. Kratos
order: 1
category:
  - Go
  - Golang 框架与生态
  - 微服务框架
tag:
  - Go
  - Kratos
  - 微服务
  - gRPC
  - HTTP
---

# Kratos：用传输层建立 Go 微服务

## 前言

Kratos 是面向 Go 微服务场景的框架。它并不要求应用放弃标准库的 `context.Context`、`net/http` 或 gRPC，而是在这些基础能力之上提供 Application 生命周期、HTTP/gRPC Transport、中间件、错误模型、日志和配置等统一抽象。

学习 Kratos 的第一目标不是记住脚手架目录，而是建立一条清晰的请求链：外部 HTTP 网关接收请求，调用内部 gRPC 服务，服务在自己的边界内完成用例。本文对应的示例会保持业务很小，避免数据库、注册中心和可观测性配置掩盖传输层的关键关系。

配套代码：[gocode-examples/go/01-kratos-demo](https://github.com/zzxrepository/gocode-examples/tree/5a896c35107f31961ddad1b343cd3db2cc3c805a/go/01-kratos-demo)。

## 一、Kratos 在服务中的位置

~~~mermaid
flowchart LR
    A[REST Client] --> G[Gateway HTTP Transport]
    G --> U[User gRPC Transport]
    G --> P[Post gRPC Transport]
    U --> US[User Service]
    P --> PS[Post Service]
~~~

HTTP 与 gRPC 是两种传输协议，而不是两套业务规则。业务用例应接收 Go 的 `context.Context` 和明确的输入类型；HTTP 解码、状态码和 gRPC Status 映射留在协议边缘。

## 二、最小三服务示例应该讲什么

示例有三项服务：Gateway 对外暴露注册、登录和文章 CRUD；User RPC 管理注册、登录与令牌校验；Post RPC 管理文章。Gateway 不直接读 User 或 Post 的存储，而是通过各自的 Protobuf 契约调用 RPC。

| 服务 | 端口 | 对外职责 | 内部职责 |
| --- | ---: | --- | --- |
| Gateway | 8080 | REST API、认证入口、响应转换 | 调用 User/Post RPC |
| User | 9081 | 不直接对浏览器公开 | 注册、登录、令牌校验 |
| Post | 9082 | 不直接对浏览器公开 | 文章 CRUD、作者权限 |

第一版使用 YAML 配置直连地址，不引入 etcd。服务发现是生产部署的重要主题，但不应妨碍第一次理解 gRPC Client 与 Server 的连接关系。

## 三、Kratos 的 Application 与 Transport

`kratos.New` 创建应用容器，`kratos.Server` 将 HTTP 或 gRPC Server 交给它管理。应用启动与关闭时会依次调用各 Server 的生命周期方法；业务代码无需自行散落地处理每个传输层的 Run。

~~~go
grpcServer := grpc.NewServer(grpc.Address(":9081"))
pb.RegisterUserServer(grpcServer, userHandler)

app := kratos.New(
    kratos.Name("blog.user"),
    kratos.Server(grpcServer),
)
app.Run()
~~~

这里的 `grpc.NewServer` 指 Kratos 的 `transport/grpc` 包，而不是 `google.golang.org/grpc` 的同名构造函数。前者仍建立在标准 gRPC 之上，并增加了 Kratos Transport、日志和中间件接入点。

## 四、Protobuf 是内部契约

User 服务可用以下契约表达其能力：

~~~proto
service User {
  rpc Register(RegisterRequest) returns (UserReply);
  rpc Login(LoginRequest) returns (TokenReply);
  rpc ValidateToken(TokenRequest) returns (UserReply);
}
~~~

`protoc` 根据该文件生成客户端与服务端接口。Gateway 依赖生成的 Client，而不是依赖 User 服务的内部 Service 或 Repository；这就是服务边界真正生效的地方。

## 五、中间件与错误

Kratos Middleware 适合日志、恢复、追踪、鉴权、限流等横切行为。它包裹 Handler，因此能在调用前建立请求上下文、在调用后记录耗时或转换错误。业务 Service 仍应返回可识别的领域错误，而不是直接写 HTTP 状态码。

HTTP 网关负责将领域或 RPC 错误转换为 HTTP 响应；RPC Server 则将其转换为 gRPC status。一个“文章不存在”的业务概念可以在两种协议中有不同外观，但不应在两个服务里复制两遍判断。

## 六、如何阅读配套代码

1. 从 Gateway 的 `cmd` 入口看配置如何构造 HTTP Server 与 RPC Client。
2. 阅读 `proto`，确认 Gateway 能调用的只是契约公开的方法。
3. 进入 User/Post 的 Transport 注册处，观察生成的 Server 接口如何转到业务 Service。
4. 最后查看业务 Service；它不应依赖 Gateway 或 HTTP 请求对象。

## 总结

Kratos 的核心价值是让应用生命周期、HTTP/gRPC Transport 与中间件有一致的组织方式。微服务示例的重点应放在服务边界和协议契约：Gateway 通过 gRPC Client 调用 User/Post，内部服务只暴露 Protobuf 定义的能力。先使用直连配置理解调用链，再逐步引入数据库、缓存、注册中心和可观测性，学习路径会更清晰。
