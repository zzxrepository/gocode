---
permalink: /backend/go/advanced/04-engineering-practice/01-go-project-structure-and-layered-architecture/
title: 01. Go 项目结构与 Web 服务分层
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
  - 软件工程
---

# Go 项目结构与 Web 服务分层：从 package 到可维护服务

## 前言

Go 没有唯一正确的项目目录模板。语言和工具链只规定了模块、包和导入规则；一个目录怎样划分、HTTP 代码放在哪里、业务如何测试，取决于项目规模和边界。因而，目录树不是架构本身：它应当让职责清楚、依赖单向、修改范围可预期，而不是为了模仿某个模板而增加层级。

本文先建立 Go 的 module、package 与目录边界，再从一个很小的 HTTP 服务逐步演进到可维护的 Web 服务。文中所说的 Router、Handler（或 Controller）、Service、Repository 是框架无关的工程分层；Gin、标准库 `net/http`、Kratos 和 go-zero 都可以采用这一方式。

配套可运行代码：

- [标准库 HTTP 示例](https://github.com/zzxrepository/gocode-examples/tree/5a896c35107f31961ddad1b343cd3db2cc3c805a/go/01-http-demo)
- [Gin 单体服务示例](https://github.com/zzxrepository/gocode-examples/tree/5a896c35107f31961ddad1b343cd3db2cc3c805a/go/01-gin-demo)
- [Kratos 微服务示例](https://github.com/zzxrepository/gocode-examples/tree/5a896c35107f31961ddad1b343cd3db2cc3c805a/go/01-kratos-demo)
- [go-zero 微服务示例](https://github.com/zzxrepository/gocode-examples/tree/5a896c35107f31961ddad1b343cd3db2cc3c805a/go/01-go-zero-demo)

这些链接固定到具体提交；正文关注稳定的职责关系，而不依赖某个框架的内部实现。

## 阅读路线

~~~mermaid
flowchart LR
    A[module 与 package] --> B[小项目最小结构]
    B --> C[HTTP 分层边界]
    C --> D[组合根与依赖注入]
    D --> E[目录演进]
    E --> F[测试边界与常见误区]
~~~

## 一、三个不同层次：module、package 与目录

### 1. module 是依赖版本边界

`go.mod` 所在目录通常是一个 module 根目录。它声明模块导入路径和最低 Go 语言版本，例如：

~~~go
module github.com/example/blog

go 1.26

toolchain go1.26.5
~~~

module 决定本项目如何被其他项目导入，也决定依赖版本由哪一个 `go.mod` 管理。一个大型系统可以有一个 module，也可以把每个可独立发布的服务放入不同 module；后者带来更明确的发布边界，也提高依赖管理成本。

### 2. package 是编译和可见性的直接边界

同一个目录中的非测试 Go 文件属于同一个 package。一个 package 通过首字母大小写控制导出符号：`NewService` 可被其他包使用，`newService` 只能在本包使用。目录通常对应 package，但目录不是“Java 类文件夹”的简单翻版：Go 以包为复用单元，不以类型为复用单元。

~~~text
blog/
├── go.mod                 # module 边界
├── cmd/api/main.go        # package main，生成可执行程序
└── internal/article/
    ├── service.go         # package article
    └── repository.go      # package article
~~~

不应为了让每个结构体各有一个目录而拆包。若两个文件总是一起修改、共享未导出类型并服务同一职责，它们放在同一个包通常更自然。

### 3. `cmd` 与 `internal` 解决的是发布与访问范围

`cmd/<程序名>/main.go` 是可执行程序入口。一个仓库可以有 `cmd/api`、`cmd/worker`、`cmd/migrate`，每个目录都生成一个独立二进制文件。

`internal` 是 Go 工具链支持的导入限制：位于 `a/internal/b` 的包只能被 `a` 目录树内的代码导入。它不是运行时权限控制，却能在编译时防止业务实现被仓库外项目意外依赖。

~~~text
blog/
├── cmd/api/main.go
├── internal/
│   ├── server/
│   ├── article/
│   └── platform/
└── pkg/                  # 仅放确实需要被仓库外复用的稳定库
~~~

不要把所有公共代码都塞进 `pkg`。一个包是否应公开，取决于是否愿意长期维护其 API，而非它是否“看起来通用”。

## 二、从最小可用项目开始

项目刚开始时，目录越浅越容易理解。一个只有少量接口、尚未出现重复逻辑的服务，可以先使用一个 package：

~~~text
todo/
├── go.mod
├── main.go
├── handler.go
├── service.go
└── store.go
~~~

此时文件名表达职责即可。过早建立 `controller/service/repository/model/dto/vo/utils` 六七个包，会让每一次修改跨越更多目录，还可能造成 import cycle。

当出现下列信号时再拆包：

| 信号 | 合理演进 |
| --- | --- |
| HTTP 处理与业务规则混杂 | 将 HTTP 适配代码移到 `internal/handler` 或业务域 Handler |
| 多个用例共享业务规则 | 建立业务域 package 或 Service |
| 存储实现需要替换、需要独立测试 | 抽出 Repository 的消费者接口和实现 |
| 有多个可执行程序 | 引入 `cmd` |
| 有明确不可对外暴露的实现 | 引入 `internal` |

目录演进应该是重构的结果，而不是项目创建时的仪式。

## 三、Web 服务的职责边界

### 1. 请求流向与代码依赖方向

典型 HTTP 请求从边缘向内流动：

~~~mermaid
flowchart LR
    C[客户端] --> M[Middleware]
    M --> R[Router / Server]
    R --> H[Handler / Controller]
    H --> S[Service]
    S --> P[Repository]
    P --> D[(数据库、缓存、外部 API)]
~~~

请求的运行流向可以从 Router 进入 Repository；代码依赖则应尽量从外向内。业务 Service 不应反向依赖 Gin 的 `Context`、HTTP 状态码或数据库驱动的具体细节。这样，替换 Gin 或数据库不会迫使业务规则一起改写。

### 2. Router / Server：协议入口与装配

Router 把 HTTP 方法和路径映射到 Handler；Server 负责创建框架对象、安装中间件、注册路由并启动监听。它表达 API 形状，不承载“注册用户时如何写库、如何生成令牌”之类的业务规则。

~~~go
func NewServer(auth *AuthHandler, posts *PostHandler) *gin.Engine {
    engine := gin.New()
    engine.Use(gin.Logger(), gin.Recovery())
    api := engine.Group("/api/v1")
    api.POST("/auth/login", auth.Login)
    api.GET("/posts", posts.List)
    return engine
}
~~~

这段代码属于 HTTP 边缘层。Gin 的 `Engine`、`RouterGroup` 与中间件链的实现，参见[《Gin 框架：从第一个接口到路由引擎》](/backend/go/frameworks-and-ecosystem/01-web-frameworks/01-gin/)。

### 3. Handler / Controller：HTTP 与用例之间的适配器

Handler 的职责是读取 HTTP 输入，调用用例，再将结果转换为 HTTP 响应。它可以绑定 JSON、读取路径参数、选择状态码；它不应编写复杂 SQL，也不应把领域规则复制到多个接口。

~~~go
func (h *PostHandler) Create(c *gin.Context) {
    var input CreatePostInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
        return
    }
    post, err := h.service.Create(c.Request.Context(), input)
    if err != nil {
        writeError(c, err)
        return
    }
    c.JSON(http.StatusCreated, post)
}
~~~

这里传给 Service 的是 `context.Context`，不是 `*gin.Context`。前者是 Go 的通用取消、超时和值传递协议；后者属于 Gin 的请求实现，超出请求生命周期后还会被对象池复用。

### 4. Service：用例、规则与事务边界

Service 表达“用户注册”“创建文章”“完成支付”这类用例。它协调多个 Repository、校验业务不变量、确定事务边界，并返回领域结果或可分类的错误。它不必因为有一个 Service 层就为每个 CRUD 动作创建接口和实现类。

~~~go
type PostService struct { repo PostRepository }

func (s *PostService) Create(ctx context.Context, input CreatePostInput) (Post, error) {
    if strings.TrimSpace(input.Title) == "" {
        return Post{}, ErrInvalidTitle
    }
    return s.repo.Create(ctx, Post{Title: input.Title, Content: input.Content})
}
~~~

### 5. Repository：持久化与外部资源访问

Repository 将领域需要的数据操作抽象为业务语言，例如 `FindByEmail`、`Save`、`ListPublished`。实现可以使用 `database/sql`、ORM、Redis 或外部 HTTP/gRPC 客户端。Repository 不知道 HTTP 状态码，也不应接收 Gin Context。

~~~go
type PostRepository interface {
    Create(context.Context, Post) (Post, error)
    FindByID(context.Context, int64) (Post, error)
}
~~~

接口通常定义在消费者一侧。`PostService` 需要什么能力，就在业务包定义一个小接口；MySQL 实现只需满足它。这样避免为了“分层整齐”而预先制造宽大的 `Repository` 接口。

### 6. Middleware：横切关注点

日志、请求 ID、认证、跨域、限流和追踪需要包裹许多请求，适合 Middleware。它们可以在认证成功后向请求 Context 写入身份信息，但不应成为隐藏的业务 Service。

| 层 | 输入和输出 | 应避免的耦合 |
| --- | --- | --- |
| Router / Server | URL、Handler、框架对象 | 业务规则 |
| Handler | HTTP 请求和响应 | SQL、存储细节 |
| Service | 领域输入、领域输出 | Gin Context、HTTP 状态码 |
| Repository | 查询和持久化模型 | HTTP 语义 |
| Middleware | 请求前后横切行为 | 取代业务用例 |

## 四、组合根：对象在哪里创建

### 1. 什么是组合根

组合根（composition root）是应用把配置、数据库、缓存、Repository、Service、Handler 和 Server 连接起来的地方，常见位置是 `cmd/api/main.go`。它是具体实现彼此相遇的边缘，不应把构造细节散落在 Handler 内部。

~~~go
func main() {
    cfg := mustLoadConfig()
    db := mustOpenDB(cfg.MySQLDSN)
    postRepo := mysqlpost.New(db)
    postService := post.NewService(postRepo)
    postHandler := httpapi.NewPostHandler(postService)
    server := httpapi.NewServer(postHandler)
    log.Fatal(server.Run(cfg.HTTPAddr))
}
~~~

这也是 Go 常见的“构造函数注入”。对象通过参数接受依赖；测试时传入内存实现或 stub 即可。它与 Java 中由 Spring 容器自动装配的结果相似，但依赖关系直接写在 Go 代码中，编译器能看见全部连接。

### 2. 不要让底层包创建上层对象

错误方向往往表现为 Repository 内部创建 Service，或 Service 内部直接创建数据库连接。它会隐藏配置、难以替换测试实现，也容易形成循环依赖。应由组合根向内传递已构造的依赖：

~~~text
main -> mysql repository -> service -> handler -> server
          实现             消费接口      HTTP 适配
~~~

## 五、目录如何随着规模演进

### 1. 按技术层组织

一个中等规模服务可以这样组织：

~~~text
blog/
├── cmd/api/main.go
├── internal/
│   ├── server/            # 路由和中间件
│   ├── handler/           # HTTP 适配
│   ├── service/           # 用例
│   ├── repository/        # MySQL、Redis 实现
│   └── platform/          # 配置、日志、数据库连接
└── migrations/
~~~

优点是初学者容易按技术角色定位代码；缺点是一个“文章”功能会分散到多个目录。

### 2. 按业务域组织

当业务域足够稳定、每个域代码较多时，按域聚合通常更利于修改：

~~~text
blog/
├── cmd/api/main.go
├── internal/
│   ├── auth/
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── repository_mysql.go
│   ├── post/
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── repository_mysql.go
│   └── platform/
└── migrations/
~~~

两种组织没有绝对优劣。关键是一个变化能在少量、语义明确的包内完成。不要在同一项目里一半按技术层、一半按业务域，除非有清晰的迁移边界。

### 3. 微服务的目录边界

服务拆分后，每个可独立部署服务应拥有自己的配置、main、内部实现和 module。网关的 REST 协议与内部 gRPC 协议是不同边界：

~~~text
example/
├── gateway/               # 对外 HTTP、鉴权、聚合
├── user-service/          # 用户 RPC 与自己的数据
├── post-service/          # 文章 RPC 与自己的数据
├── api/                   # 对外 REST 文档
└── proto/                 # 内部服务契约或各服务 proto
~~~

可运行的 Kratos 与 go-zero 对照示例采用该结构；框架教程会分别解释传输层、代码生成和 Service Context。

## 六、测试边界

分层的价值之一是把测试放在合适的位置：

| 测试对象 | 替身或依赖 | 重点 |
| --- | --- | --- |
| Service | fake Repository、stub 时钟 | 业务规则和错误分支 |
| Repository | 测试数据库或容器 | SQL、迁移、事务 |
| Handler | `httptest`、fake Service | 绑定、状态码、响应 JSON |
| Router / Server | `httptest.NewRecorder` | 路由、中间件顺序、认证边界 |
| 端到端 | Docker 依赖与真实 HTTP | 配置和服务协作 |

不必把所有测试都写成 HTTP 集成测试。业务规则用快而稳定的 Service 单元测试覆盖，少量端到端测试验证“连接是否正确”即可。

## 七、与 Java 常见分层的对应

| Java 术语 | Go 中常见表达 | 说明 |
| --- | --- | --- |
| Controller | Handler / Controller | Go 更强调其 HTTP 适配职责 |
| Service + ServiceImpl | 一个具体 Service，必要时面向小接口 | 不为形式预建接口 |
| DAO | Repository | 可以包含数据库、缓存、远端访问实现 |
| IoC 容器 | `main` 中的构造函数注入 | 依赖关系显式、静态可检查 |
| DTO / VO | request、response、input 等明确类型 | 命名服务于边界而非缩写本身 |

Go 的接口是隐式实现的。最常见的做法是先写具体实现；当调用方需要替换依赖或测试替身时，再在调用方包定义最小接口。这样可以避免 `IUserService`、`UserServiceImpl` 之类没有额外语义的样板。

## 八、常见误区

1. **把 Controller 当成业务层。** Handler 里堆积 SQL、事务和业务判断，会使 HTTP 测试成为唯一测试路径。
2. **让 Service 依赖 `*gin.Context`。** 这会把业务锁定在 Gin，并误用对象池化的请求对象。
3. **让 Repository 决定 HTTP 响应。** 数据不存在是存储或领域错误；404 还是 500 应由边缘层映射。
4. **把 `utils`、`common` 当作杂物箱。** 找不到归属的代码应先澄清职责，而不是藏进泛化目录。
5. **为了分层强行创建接口。** 接口应该表达消费者需要的能力，不是目录结构的装饰。
6. **为了“微服务化”先拆仓库。** 服务边界应来自独立部署、数据所有权和演进节奏，不能只来自目录拆分。

## 总结

Go 项目结构的目标不是遵守某一张目录图，而是让边界可见：module 管理依赖版本，package 管理编译与可见性，`internal` 限制实现被意外导入，`cmd` 管理可执行程序。

Web 服务的请求通常从 Router/Server 进入 Handler，再到 Service 和 Repository；代码依赖应保持从协议边缘向业务核心和基础设施单向流动。由 `main` 作为组合根显式构造依赖，能让测试、替换框架和服务演进更可控。随着规模增长再选择按技术层或按业务域组织，才能让目录真正服务于代码，而不是让代码服务于目录。
