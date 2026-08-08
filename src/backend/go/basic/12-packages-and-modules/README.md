---
title: 12. 包与 Go Modules
shortTitle: 12. 包与 Go Modules
order: 12
dir:
  link: true
  collapsible: true
  order: 12
icon: boxes-stacked
category:
  - Go
  - Golang 基础知识
  - 工程实践
tag:
  - Go
  - package
  - Go Modules
  - go mod
  - 依赖管理
  - go 命令
---

# 12. 包与 Go Modules

这里会整理包管理、模块初始化、依赖版本和常用 `go` 命令。

## 包、模块、依赖和库

学习 Go 依赖管理时，容易遇到几个相近的词：包、模块、依赖、库。它们经常一起出现，但含义并不在同一个层级。

### package：代码的组织和导入单位

`package` 通常翻译成“包”。Go 代码通过 `import` 引入的是包：

```go
import (
	"fmt"
	"net/http"

	"github.com/spf13/viper"
)
```

这里的 `fmt`、`net/http`、`github.com/spf13/viper` 都是包的导入路径。

从来源看，一个 Go 项目里常见的包大致可以分成三类：

| 类型 | 示例 | 说明 |
| --- | --- | --- |
| 标准库包 | `fmt`、`net/http`、`encoding/json`、`os` | Go 标准库提供的包，随 Go 工具链一起发布 |
| 当前模块内的包 | `example.com/order-service/internal/config` | 当前项目自己维护的业务代码或基础代码 |
| 其他模块提供的包 | `github.com/spf13/viper`、`git.example.com/platform/logger` | 来自当前模块之外，需要通过模块依赖引入 |

第三类“其他模块提供的包”在工程里还会继续细分：公开开源模块里的包，通常会被叫作第三方包或第三方库；组织内部私有模块里的包，通常会被叫作内部库、私有模块或公共组件。

这些叫法主要服务于工程沟通和依赖治理。对 Go 编译器来说，真正重要的是包的导入路径，以及这个包能否在当前模块的依赖关系里被找到。

### module：Go Modules 管理的版本单位

`module` 通常翻译成“模块”。一个模块是一组 Go 包的集合，根目录下有 `go.mod` 文件。

例如一个订单服务可以是一个模块：

```text
example.com/order-service
├── go.mod
├── cmd/order-service
├── internal/config
└── internal/repository
```

这个模块里可以有多个包：

```text
example.com/order-service/cmd/order-service
example.com/order-service/internal/config
example.com/order-service/internal/repository
```

Go Modules 管理的是模块及其版本。也就是说，`go.mod` 里的 `require` 记录的是模块依赖，而不是“某个包文件”。

### dependency：当前模块需要的其他模块

`dependency` 通常翻译成“依赖”。当当前模块需要使用另一个模块提供的包时，那个模块就会成为当前模块的依赖。

依赖信息主要体现在两个文件里：

```text
go.mod  记录当前模块信息、Go 版本、依赖模块和版本
go.sum  记录依赖模块版本的校验信息
```

例如代码里导入了 Viper：

```go
import "github.com/spf13/viper"
```

执行：

```bash
go get github.com/spf13/viper
```

`go.mod` 里会出现类似记录：

```go
require github.com/spf13/viper v1.x.x
```

这里可以分清两个角度：

```text
代码 import 的是包：github.com/spf13/viper
go.mod require 的是模块：github.com/spf13/viper v1.x.x
```

刚好 Viper 的模块路径和它最常用的包导入路径一样，所以看起来像是一回事。很多模块内部会提供多个包，导入路径就会更细。

### library：日常说法里的“库”

`library` 一般翻译成“库”。Go 官方和很多教程都会说“标准库”，也就是 Standard library。标准库里包含很多标准库包，例如 `fmt`、`net/http`、`encoding/json`。

但在 Go 的工程结构里，“库”不是一个像 `package`、`module` 那样精确的结构单位。它更像一种日常说法，用来描述“一组可以复用的能力”。

例如可以说：

```text
Go 标准库提供了 fmt、net/http、encoding/json 等包。
Viper 是一个配置读取库。
Gin 是一个 Web 框架库。
团队内部也可能维护统一日志库、鉴权库、配置库。
```

写代码和管理版本时，可以把这些词放到更准确的位置：

```text
import 引入的是包。
go.mod 管理的是模块依赖。
标准库是 Go 官方随工具链提供的一组包。
内部库通常是私有模块提供的一个或多个包。
第三方库通常是公开开源模块提供的一个或多个包。
```

所以后面工程实践里的 Viper，可以这样理解：

```text
Viper 是一个第三方配置库。
它所在的模块是 github.com/spf13/viper。
代码里导入的包也是 github.com/spf13/viper。
项目使用它以后，go.mod 会记录 github.com/spf13/viper 这个模块依赖。
```

需要注意，不推荐把标准库叫作“标准依赖”。更常见、更准确的说法是“标准库”或“标准库包”。标准库随 Go 一起发布，不需要 `go get`，也不会作为依赖写进当前项目的 `go.mod`。

参考资料：

- [Managing dependencies](https://go.dev/doc/modules/managing-dependencies)
- [Go Modules Reference](https://go.dev/ref/mod)
- [go.mod file reference](https://go.dev/doc/modules/gomod-ref)
