---
permalink: /backend/go/advanced/04-engineering-practice/01-go-project-structure-and-layered-architecture/
title: 01. Go Web 服务的项目结构与分层
shortTitle: 01. 项目结构与分层
order: 1
category:
  - Go
  - Golang 进阶知识
  - 工程实践
tag:
  - Go
  - 项目结构
  - 分层架构
  - Web 服务
---

# Go Web 服务的项目结构与分层

## 前言

Web 框架负责接收 HTTP 请求、匹配路由和执行处理函数，但通常不规定业务代码应如何组织。Router、Controller、Service、Repository 与 Middleware 的划分，属于服务端项目结构与分层架构的知识，而不是某一个框架的专属机制。

因此，这套组织方式既可以用于 Gin，也可以用于标准库 `net/http`、Echo 或其他 Web 框架。它的目的不是增加目录数量，而是让每一层只处理自己负责的问题。

## 一、一个 Web 服务的分层关系

一次请求通常沿着下面的方向进入系统：

~~~mermaid
flowchart LR
    Client[客户端] --> Middleware[Middleware]
    Middleware --> Server[Server / Router]
    Server --> Controller[Controller]
    Controller --> Service[Service]
    Service --> Repository[Repository]
    Repository --> Resource[(数据库或外部服务)]
~~~

这张图有两层含义：

1. **请求流向**：请求从 HTTP 入口进入，经过业务处理，最后访问数据或外部服务。
2. **职责边界**：每一层只处理本层的问题，不把 HTTP、业务规则和数据访问混在一起。

Middleware 不属于传统三层。它位于请求处理链的外围，负责鉴权、日志、限流、追踪等多个接口都会使用的横切能力。

## 二、各层分别负责什么

| 层 | 核心责任 | 不应承担的职责 |
| --- | --- | --- |
| Server / Router | 创建 Web 引擎、安装中间件、注册 URL 和处理函数 | 编写具体业务规则 |
| Controller | 读取 HTTP 输入、调用 Service、转换 HTTP 响应 | 直接拼接复杂 SQL |
| Service | 表达业务用例、执行业务规则、协调多个操作 | 依赖框架专有的 Context |
| Repository | 查询和保存数据，访问数据库、缓存或外部服务 | 决定 HTTP 状态码 |
| Middleware | 鉴权、日志、恢复、限流、追踪等横切逻辑 | 取代具体业务用例 |

### 1. Server / Router

Server 是 HTTP 层的装配位置。它创建引擎，注册全局中间件，并把不同的 URL 交给对应 Controller。

例如，`POST /api/v1/posts` 对应“创建文章”这个入口；Router 只负责把这个入口交给正确的处理函数，不负责决定文章如何保存。

### 2. Controller

Controller 处于 HTTP 与业务之间，主要完成三件事：

1. 读取路径参数、查询参数、请求头和 JSON 请求体；
2. 调用对应的 Service；
3. 将结果转换为 JSON、状态码或错误响应。

Controller 应保持较薄。它需要理解 HTTP，但不应直接承担复杂业务判断或数据库访问。

### 3. Service

Service 表达系统提供的业务用例，例如“用户注册”“用户登录”“创建文章”“删除文章”。

业务规则应放在这一层。例如，创建文章前是否需要验证标题、删除文章时是否需要判断作者身份、一次操作是否需要同时更新多份数据，都是 Service 需要协调的问题。

Service 不应依赖 `gin.Context` 之类的框架对象。这样业务规则就不会被某个 HTTP 框架绑定。

### 4. Repository

Repository 负责数据访问。它把数据库、缓存或外部服务的操作封装为业务需要的数据操作，例如“按用户名查找用户”“保存文章”“查询文章列表”。

Repository 关心的是数据能否被正确读取和保存；资源不存在、SQL 执行失败等结果可以向上返回，但最终应由 Controller 决定返回 404、400 还是 500。

### 5. Middleware

Middleware 在 Controller 之前或之后执行，适合处理与多个接口共同相关的逻辑：

- 访问日志；
- panic 恢复；
- 身份认证；
- 请求 ID；
- 限流；
- 跨域处理。

认证 Middleware 成功后，可以将当前用户身份写入当前请求的上下文；Controller 再从上下文取得用户 ID 并调用 Service。Middleware 不应直接实现“创建文章”这类具体业务。

## 三、推荐的目录结构

对于一个中小型 Go Web 服务，可以采用下面的结构：

~~~text
blog/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── server/
│   │   └── server.go
│   ├── controller/
│   │   ├── auth_controller.go
│   │   └── post_controller.go
│   ├── service/
│   │   ├── auth_service.go
│   │   └── post_service.go
│   ├── repository/
│   │   ├── user_repository.go
│   │   └── post_repository.go
│   ├── middleware/
│   │   └── auth.go
│   └── model/
│       ├── user.go
│       └── post.go
├── configs/
│   └── local.yaml
└── go.mod
~~~

各目录的作用如下：

| 目录 | 作用 |
| --- | --- |
| `cmd/api` | 程序入口，负责读取配置、创建依赖并启动服务 |
| `internal/server` | 创建引擎、注册中间件和路由 |
| `internal/controller` | HTTP 请求和响应处理 |
| `internal/service` | 业务用例和业务规则 |
| `internal/repository` | MySQL、Redis 等数据访问实现 |
| `internal/middleware` | 鉴权、日志、恢复等请求链逻辑 |
| `internal/model` | 用户、文章等业务数据结构 |
| `configs` | 本地或不同环境的配置文件 |

`internal` 表示这些实现只服务于当前项目，不应被仓库外的项目直接导入。`cmd/api` 则明确指出该目录会构建一个 API 服务可执行程序。

## 四、对象的组装顺序

启动服务时，依赖通常从底层向上创建：

~~~text
配置、数据库、缓存
        ↓
Repository
        ↓
Service
        ↓
Controller
        ↓
Server / Router
        ↓
启动 HTTP 服务
~~~

也就是说，`main.go` 负责把对象连接起来：

1. 读取配置并建立数据库、Redis 等基础设施连接；
2. 根据基础设施创建 Repository；
3. 根据 Repository 创建 Service；
4. 根据 Service 创建 Controller；
5. 将 Controller 注册到 Server 的路由上；
6. 启动 HTTP 服务。

这种顺序使每一层只依赖它需要的下一层。Controller 不需要自己创建数据库连接，Service 也不需要自己创建 HTTP 引擎。

## 五、依赖方向

目录分层的关键不只是“从上到下调用”，还包括代码不要反向依赖：

~~~text
Controller -> Service -> Repository
~~~

因此：

- Service 不应导入 Controller 或 Router；
- Repository 不应导入 Service 或 Controller；
- Service 不应依赖 `gin.Context`；
- Repository 不应直接写 HTTP 响应；
- Router 不应堆积具体业务规则。

保持这个方向后，HTTP 框架的变化主要停留在 Server、Controller 和 Middleware；数据库实现的变化主要停留在 Repository。业务规则不会因为这些边缘技术变化而大范围移动。

## 总结

Router、Controller、Service、Repository 和 Middleware 是 Go Web 服务的一种常见项目组织方式，而不是 Gin 的强制规则。

其中，Server/Router 负责装配 HTTP 入口，Controller 负责 HTTP 适配，Service 负责业务用例，Repository 负责数据访问，Middleware 负责横切逻辑。通过清楚的目录划分和单向依赖关系，服务会更容易定位代码、维护功能和扩展实现。
