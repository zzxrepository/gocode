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

Go 没有唯一标准的项目目录。Go 语言和工具链真正规定的是包、模块与可见性规则：同一目录下的 Go 文件通常属于同一个包；`go.mod` 所在目录是模块根目录；导入的是包路径；`internal` 下的包只能在指定范围内被导入。

项目结构的目标不是生成复杂目录树，而是让代码更容易定位、依赖更容易理解、修改范围更容易控制。目录应服务于代码，而不是让代码迁就目录。

选择结构前，先回答几个问题：程序有几个可执行入口；哪些代码只是当前项目的私有实现；HTTP、业务规则和数据访问是否已经复杂到需要拆包；当前代码库是否已有稳定约定。功能较少时保持简单，职责和依赖变复杂后再拆分，通常是更稳妥的演进方式。

## 一、Go 的包、目录与模块

### 1. 同一目录通常就是同一个包

```text
blog/
├── go.mod
├── main.go
├── handler.go
└── service.go
```

如果三个文件都声明为 `package main`，它们属于同一个包，可以直接互相调用，无需导入：

```go
// service.go
package main

func createPost(title string) string {
	return "created: " + title
}
```

```go
// handler.go
package main

func createPostHandler() string {
	return createPost("Go 项目结构")
}
```

文件名帮助阅读者理解职责；对编译器而言，目录和 `package` 声明才决定代码是否属于同一个包。

### 2. `go.mod` 定义模块边界

```go
module github.com/example/blog

go 1.26.0
```

模块负责声明依赖版本，也决定项目内包的导入路径。例如 `github.com/example/blog/internal/service` 对应模块根目录下的 `internal/service`。

### 3. 目录不是越多越好

每增加一个目录，通常就增加一个 Go 包。包之间需要维护导入路径、命名和依赖关系。没有明确边界时，过早拆出大量目录只会增加阅读成本：

```text
internal/
├── dto/
├── vo/
├── po/
├── bo/
├── entity/
├── manager/
├── helper/
└── util/
```

尤其是 `common`、`utils`、`helper`，很容易变成任何代码都能放进去的杂物间。更合理的原则是：先让相关代码放近；当职责、依赖、复用范围或测试边界变复杂时，再拆成包。

## 二、小项目：先保持简单

功能较少、只有一个可执行程序的项目，可以先使用扁平结构：

```text
blog/
├── go.mod
├── go.sum
├── main.go
├── handler.go
├── middleware.go
├── service.go
├── repository.go
├── model.go
└── main_test.go
```

所有代码可以先放在 `package main` 中，通过文件名表达职责。

| 文件 | 主要职责 |
| --- | --- |
| `main.go` | 程序入口、依赖创建、路由注册、服务启动 |
| `handler.go` | HTTP 参数读取、输入校验、调用业务逻辑、写响应 |
| `middleware.go` | 日志、认证、请求 ID、CORS、panic 恢复 |
| `service.go` | 业务规则和用例编排 |
| `repository.go` | 数据库、缓存、第三方数据读取和写入 |
| `model.go` | 当前项目共享的数据结构 |
| `*_test.go` | 单元测试与集成测试 |

一个简单服务可以这样启动：

```go
package main

import (
	"log"
	"net/http"
)

func main() {
	repo := NewPostRepository()
	service := NewPostService(repo)
	handler := NewPostHandler(service)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /posts", handler.Create)

	server := &http.Server{Addr: ":8080", Handler: mux}
	log.Fatal(server.ListenAndServe())
}
```

它已经具有清晰的职责分层：

```text
HTTP 请求
  -> Handler
  -> Service
  -> Repository
  -> 数据库
```

代码量不大时，不需要因为存在 Handler、Service 与 Repository 就立刻建立多个目录。相关代码位于同一个包中，通常比过早拆包更容易阅读和修改。

## 三、Java 经典分层与 Go 的对应关系

Java Web 项目常见 Controller / Service / DAO 三层。Go 中职责相同，只是常用名称不同。

| Java 分层 | Go 常见命名 | 核心职责 |
| --- | --- | --- |
| Controller | `handler`、`controller` | 接收 HTTP/RPC 请求，解析参数，调用业务逻辑，返回协议响应 |
| Service | `service`、`logic`、`usecase` | 业务规则、用例编排、事务协调 |
| DAO | `repository`、`dao`、`store` | 数据库存取、缓存访问、外部服务读取 |
| Entity / POJO | `model`、`entity`、`domain` | 数据结构和领域对象 |
| Filter / Interceptor | `middleware` | 日志、认证、限流、追踪等横切逻辑 |
| 启动类 | `main.go`、`cmd/api/main.go` | 创建依赖、组装应用、启动服务 |

可以概括为：

```text
Java Controller  ≈ Go Handler / Controller
Java Service     ≈ Go Service / Logic / Usecase
Java DAO         ≈ Go Repository / DAO
```

Go 不要求每个 Service 都定义“接口 + 实现”两套类型。接口是否存在，应由替换需求和测试边界决定。例如，文章仓储有 MySQL 实现与内存测试实现时，可以定义接口：

```go
type PostRepository interface {
	Create(ctx context.Context, post Post) (Post, error)
	FindByID(ctx context.Context, id int64) (Post, error)
}
```

若只有一个简单实现，也可以直接使用具体类型：

```go
type PostRepository struct { db *sql.DB }
```

接口更适合由使用方定义，而不是机械地为每个结构体都创建一套接口和实现。

## 四、中大型服务：`cmd` 与 `internal`

当项目包含多个入口、配置、数据库连接、路由装配、多个业务模块和明确测试边界后，可以采用下面的结构：

```text
blog/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── server/
│   │   └── server.go
│   ├── handler/
│   │   ├── auth_handler.go
│   │   └── post_handler.go
│   ├── middleware/
│   │   └── auth.go
│   ├── service/
│   │   ├── auth_service.go
│   │   └── post_service.go
│   ├── repository/
│   │   ├── user_repository.go
│   │   └── post_repository.go
│   └── model/
│       ├── user.go
│       └── post.go
├── api/
│   ├── openapi.yaml
│   └── post.proto
├── migrations/
│   └── 001_init.sql
├── scripts/
│   ├── lint.sh
│   └── deploy.sh
├── configs/
│   └── local.yaml
├── Makefile
├── go.mod
└── README.md
```

### 1. `cmd`：可执行程序入口

`cmd` 下通常按可执行程序拆分：

```text
cmd/
├── api/
│   └── main.go
├── worker/
│   └── main.go
└── migrate/
    └── main.go
```

它们会构建为不同程序，例如 `blog-api`、`blog-worker` 和 `blog-migrate`。

`cmd/api/main.go` 的职责是依赖装配，而不是承载业务逻辑：

```go
func main() {
	cfg := config.MustLoad()

	db := repository.MustNewMySQL(cfg.MySQL)
	postRepo := repository.NewPostRepository(db)
	postService := service.NewPostService(postRepo)
	postHandler := handler.NewPostHandler(postService)

	server := server.New(cfg.HTTP, postHandler)
	server.Run()
}
```

这个位置通常称为 composition root，即依赖组合的根。数据库、缓存、Repository、Service、Handler 和 HTTP Server 都在这里创建并连接。

### 2. `internal`：项目私有实现

```text
internal/
├── handler/
├── service/
├── repository/
└── model/
```

`internal` 不只是命名建议，而是 Go 工具链识别的访问限制。例如 `github.com/example/blog/internal/service` 只能被 `github.com/example/blog` 目录树中的代码导入；模块外部代码不能直接导入。

因此，`internal` 适合放当前服务的业务实现、HTTP/RPC 适配器、数据库访问实现，以及不希望被其他模块直接依赖的配置和工具代码。

### 3. 常见目录职责

| 目录 | 职责 |
| --- | --- |
| `cmd/api` | 程序入口、配置读取、依赖装配、启动和退出 |
| `internal/config` | 配置结构、加载、默认值、校验 |
| `internal/server` | 创建 Engine、注册中间件、注册路由、启动 HTTP/RPC 服务 |
| `internal/handler` | HTTP/RPC 协议适配、参数绑定、响应编码 |
| `internal/middleware` | 认证、日志、恢复、限流、追踪、请求 ID |
| `internal/service` | 业务用例、规则、事务边界、多个 Repository 协调 |
| `internal/repository` | MySQL、Redis、消息队列、外部服务访问 |
| `internal/model` | 项目内共享的数据结构 |
| `api` | OpenAPI、Protobuf 等接口契约；不等同于 `cmd/api` |
| `migrations` | 数据库 schema 迁移 |
| `scripts` | 构建、检查、部署、数据导入等脚本 |

### 4. 请求与依赖方向

请求从外向内流动：

```text
Client
  -> Middleware
  -> Router
  -> Handler
  -> Service
  -> Repository
  -> Database / Cache / Remote Service
```

代码依赖也应保持单向：

```text
Handler -> Service -> Repository
```

因此，Handler 可以依赖 Service，Service 可以依赖 Repository；Repository 不应依赖 Handler；Service 不应依赖 `gin.Context`；Repository 不应决定 HTTP 状态码；Router 不应堆积具体业务规则。目录名称可以变化，依赖方向不应混乱。

## 五、传统分层布局

许多长期维护的 Go 服务会采用“根目录入口 + 按技术层分包”的布局：

```text
service-name/
├── main.go
├── conf/
│   ├── config.go
│   ├── dev.yaml
│   ├── test.yaml
│   └── prod.yaml
├── router/
│   └── router.go
├── controller/
│   ├── user_controller.go
│   └── post_controller.go
├── service/
│   ├── user_service.go
│   └── post_service.go
├── dao/
│   ├── user_dao.go
│   └── post_dao.go
├── model/
│   ├── user.go
│   └── post.go
├── middleware/
│   ├── auth.go
│   └── request_log.go
├── common/
│   ├── response/
│   ├── errors/
│   └── constants/
├── pkg/
│   ├── redis/
│   └── httpclient/
├── docs/
│   └── openapi.yaml
├── tests/
├── build.sh
├── Dockerfile
├── go.mod
└── go.sum
```

它的典型请求链如下：

```text
main.go
  -> 初始化 conf、log、database、cache、client
  -> router 注册 URL 与 controller
  -> controller 接收 HTTP 请求
  -> service 执行业务用例
  -> dao 访问数据库或缓存
  -> model 承载数据
```

### 1. 传统布局中的目录职责

| 目录 | 常见职责 |
| --- | --- |
| `main.go` | 服务入口、基础设施初始化、依赖装配、启动路由 |
| `conf` | 多环境配置、配置加载、默认值、校验 |
| `router` / `route` | URL、HTTP Method 与 Controller 的绑定 |
| `controller` | 请求参数、Header、上下文、状态码、响应体 |
| `service` / `logic` | 业务规则、用例编排、事务协调 |
| `dao` / `repository` / `persistent` | 数据库、缓存、存储访问 |
| `model` | 数据库对象、请求响应对象、领域对象等 struct |
| `middleware` | 日志、恢复、认证、限流、CORS、追踪 |
| `common` | 有明确共享语义的错误码、响应格式、常量等 |
| `pkg` | 可被多个模块复用且 API 相对稳定的通用包 |
| `docs` | OpenAPI、接口说明、架构说明 |
| `tests` | 端到端或集成测试；单元测试通常仍放在被测包旁边 |

这类结构同样符合 Go 的组织方式。Go 并不要求所有服务都采用 `cmd/internal`；两者只是不同的工程约定。

真正需要警惕的是职责混乱，例如：

```text
controller/
├── user_controller.go
├── user_service.go
├── user_sql.go
└── redis_helper.go
```

目录名称虽然是 `controller`，实际却混合了 HTTP、业务和数据访问。相比目录是否新颖，职责边界是否清楚更重要。

### 2. `controller`、`handler` 与 `logic` 的含义可能不同

不同项目对目录名的使用并不完全一致：

| 名称 | 常见职责 |
| --- | --- |
| `controller` | HTTP/RPC 入口，接收参数、返回响应 |
| `handler` | 有时等同于 Controller；有时表示某类事件处理器 |
| `logic` | 有时等同于 Service；有时是某个框架生成的用例层 |
| `service` | 业务规则、业务编排、领域用例 |
| `dao` | 数据库访问层 |
| `repository` | 更强调面向业务的数据访问抽象，可封装数据库、缓存和远程数据 |

阅读陌生项目时，不应只根据目录名判断职责，而应顺着一次请求追踪：

```text
路由注册在哪里？
  -> 请求首先进入哪个函数？
  -> 谁读取 JSON、Header、Path 参数？
  -> 谁决定业务规则？
  -> 谁访问数据库？
  -> 谁把错误转换为 HTTP 响应？
```

这条链比目录名称更可靠。

## 六、如何选择结构

| 项目状态 | 合适结构 |
| --- | --- |
| 学习项目、脚本、功能很少的服务 | 单包 + 按文件分职责 |
| 一个中小型 HTTP API 服务 | `cmd/api` + `internal` + 技术分层 |
| 多个可执行程序，例如 API、Worker、迁移工具 | `cmd/api`、`cmd/worker`、`cmd/migrate` |
| 长期维护的单体服务 | 根目录 `main.go` + router/controller/service/dao/model |
| 多个独立部署服务 | 每个服务独立模块或独立仓库，各自管理入口、私有实现和配置 |

选择前可以先问：是否真的有多个可执行程序；是否需要阻止外部模块导入内部实现；当前最大问题是代码量还是职责混乱；当前代码库是否已有稳定约定；新目录能否说清楚“谁依赖它、它不依赖谁”。如果无法回答最后一个问题，通常还不应该创建该目录。

## 总结

Go 项目结构没有唯一模板。功能较少的项目可以在一个包中通过文件名区分 Handler、Service 与 Repository；中大型服务可以采用 `cmd` 与 `internal`，明确入口和私有实现；长期维护的服务也常使用根目录 `main.go` 加 `router/controller/service/dao/model` 的传统分层布局。

真正决定项目是否可维护的，不是目录名称，而是以下关系是否清楚：

```text
HTTP / RPC 入口
  -> 业务用例
  -> 数据访问
  -> 基础设施
```

以及代码依赖是否保持单向：

```text
Handler / Controller
  -> Service / Logic
  -> Repository / DAO
```

只要职责边界、依赖方向和数据所有权清晰，`handler` 或 `controller`、`repository` 或 `dao`、`cmd/internal` 或传统分层，都可以成为合理的 Go 工程结构。
