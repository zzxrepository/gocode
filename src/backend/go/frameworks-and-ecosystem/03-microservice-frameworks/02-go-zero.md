---
permalink: /backend/go/frameworks-and-ecosystem/03-microservice-frameworks/02-go-zero/
title: 02. go-zero：从 API DSL 到 zRPC 服务
shortTitle: 02. go-zero
order: 2
category:
  - Go
  - Golang 框架与生态
  - 微服务框架
tag:
  - Go
  - go-zero
  - 微服务
  - zRPC
  - 代码生成
---

# go-zero：从 API DSL 到 zRPC 服务

## 前言

go-zero 是 Go 微服务框架，强调通过 `goctl` 生成 API 与 RPC 的重复骨架。生成并不替代设计：`.api` 和 `.proto` 是服务边界的声明，生成的 Handler、Logic、ServiceContext 则把“HTTP 入口、业务用例、依赖对象”放到可预期的位置。

本文使用一个小型三服务示例。它保留 Gateway REST、User zRPC、Post zRPC 三个边界，并使用 MySQL 保存用户和文章、Redis 保存登录会话；教程不展开存储的基础用法，而将重点放在框架调用链。

配套代码：[gocode-examples/go/01-go-zero-demo](https://github.com/zzxrepository/gocode-examples/tree/5a896c35107f31961ddad1b343cd3db2cc3c805a/go/01-go-zero-demo)。

## 一、目标架构

~~~mermaid
flowchart LR
    C[REST Client] --> G[Gateway :8180]
    G -->|zRPC direct| U[User :9181]
    G -->|zRPC direct| P[Post :9182]
    U --> UM[(MySQL + Redis)]
    P --> PM[(MySQL)]
~~~

端口与 Kratos 示例刻意不同，因此两套 Demo 可以同时启动。第一版的 `Endpoints` 是 YAML 内的直连地址；没有配置 etcd，也没有隐藏的服务发现行为。

## 二、先从契约开始

### 1. `gateway.api`：外部 REST 契约

~~~text
post /api/v1/auth/register
post /api/v1/auth/login
get  /api/v1/posts
get  /api/v1/posts/:id
post /api/v1/posts
put  /api/v1/posts/:id
delete /api/v1/posts/:id
~~~

`goctl api go -api gateway.api -dir gateway` 根据 API DSL 生成 `types`、`handler`、`logic` 和路由注册。Handler 负责解析请求，Logic 是填写用例代码的位置。

### 2. `user.proto` 与 `post.proto`：内部 RPC 契约

~~~proto
service User {
  rpc Register(RegisterRequest) returns (UserReply);
  rpc Login(LoginRequest) returns (TokenReply);
  rpc ValidateToken(TokenRequest) returns (UserReply);
}
~~~

`goctl rpc protoc` 在 Protobuf 的 Go 代码之外生成 Server、Logic、ServiceContext 和 RPC Client 包。Gateway 只依赖客户端生成包，因此不会导入 User/Post 的内部实现。

## 三、生成目录如何协作

~~~text
gateway/
├── gateway.api
├── internal/handler/       # 解析 HTTP、调用 Logic、写回 JSON
├── internal/logic/         # REST 用例，调用 RPC Client
├── internal/svc/           # 创建 User/Post RPC Client
└── internal/types/         # API DSL 生成的输入输出类型

user/ 和 post/
├── *.proto
├── internal/server/        # 将 gRPC 方法分派给 Logic
├── internal/logic/         # RPC 用例实现
└── internal/svc/           # 该服务拥有的状态和依赖
~~~

`ServiceContext` 不是全局变量容器。它是服务启动时构造一次、被 Logic 注入的依赖集合：Gateway 放 RPC Client；User/Post 放属于各自服务的 MySQL、Redis 等存储依赖。

## 四、直连 RPC 配置

~~~yaml
Name: gateway
Host: 0.0.0.0
Port: 8180
UserRpc:
  Endpoints:
    - 127.0.0.1:9181
PostRpc:
  Endpoints:
    - 127.0.0.1:9182
~~~

`Endpoints` 会创建 direct RPC Client。生产环境可将此配置替换为 etcd 等发现机制；Gateway 的 Logic 仍面向同一个 Client 接口，因此用例本身无需改变。

## 五、一次写请求的完整链路

~~~mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant U as User RPC
    participant P as Post RPC
    C->>G: POST /posts + Bearer token
    G->>U: ValidateToken(token)
    U-->>G: userID
    G->>P: Create(userID, title, content)
    P-->>G: PostReply
    G-->>C: JSON 201/200 response
~~~

这里的关键不是“网关转发了请求”，而是网关把 HTTP 的 Authorization Header 转为 RPC 所需的结构化输入。Post 服务只接收已经确定的 `userID`，不需要理解浏览器 Header。

## 六、运行与重新生成

~~~bash
make test
make run-user
make run-post
make run-gateway
make generate
~~~

Makefile 显式选择本机 Go 1.26.5 并覆盖继承的 `GOROOT`；这样不会改变终端的全局 Go 1.22 配置。执行 `make generate` 后应审阅差异：生成文件提供结构，Logic 中的业务实现需要有意识地保留或重写。

## 七、下一步如何扩展

在不改变 REST 或 Proto 契约的前提下，可以依次增加：

1. 将 `ServiceContext` 中直接使用的存储连接抽为小型 Repository；
2. 给 Gateway 加统一错误编码、认证 Middleware 与限流；
3. 用 etcd 或其他注册中心替换 direct `Endpoints`；
4. 增加链路追踪、指标与端到端测试。

每一步都应该只扩展一个概念；不要在第一次运行示例时同时引入数据库、缓存、服务发现和容器编排。

## 总结

go-zero 的代码生成以契约为起点：`.api` 定义外部 HTTP 边界，`.proto` 定义内部 RPC 边界，`goctl` 生成稳定的传输层骨架，开发者在 Logic 和 ServiceContext 中填写用例与依赖。用直连三服务 Demo 先理解这些关系，再扩展存储和治理能力，能避免把框架学习变成环境配置学习。
