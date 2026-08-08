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

## 包、模块、依赖和库怎么区分

学习 Go 依赖管理时，最容易混在一起的几个词是：包、模块、依赖、库。它们相关，但不是同一个层级。

### package：代码里的导入单位

`package` 通常翻译成“包”。Go 代码通过 `import` 引入的是包：

```go
import (
	"fmt"
	"net/http"

	"github.com/spf13/viper"
)
```

这里的 `fmt`、`net/http`、`github.com/spf13/viper` 都是包的导入路径。

从来源和所有权看，Go 项目里常见的包通常可以这样分：

| 类型 | 示例 | 说明 |
| --- | --- | --- |
| 标准库包 | `fmt`、`net/http`、`encoding/json`、`os` | Go 官方标准库里的包，随 Go 工具链一起提供 |
| 项目内部包 | `example.com/order-service/internal/config` | 当前项目自己写的包 |
| 公司内部公共包 | `git.example.com/platform/logger`、`git.example.com/middleware/auth` | 公司或团队内部维护的公共代码，通常来自私有模块 |
| 第三方包 | `github.com/spf13/viper`、`github.com/gin-gonic/gin` | 公司外部的开源社区或其他组织提供的包 |

这里的分类不是 Go 编译器强制规定的分类，而是工程里最常见的说法。Go 官方文档会明确使用“标准库”这个概念；“公司内部公共包”和“第三方包”更多是团队协作和依赖治理里的分类。

公司内部公共包要单独看待。它们不是当前项目内部代码，因为代码通常在另一个仓库或另一个模块里；但它们也不是严格意义上的第三方代码，因为所有权还在公司或团队内部。真实公司项目里常会把它们叫作：

```text
内部包
内部公共库
公司内部库
私有模块
基础库
```

在写文章时，推荐这样表达：

```text
标准库包：Go 官方标准库提供的包。
项目内部包：当前项目当前模块内自己写的包。
公司内部公共包：公司私有模块提供的包。
第三方包：外部开源模块提供的包。
```

如果只想粗略区分，也可以说：

```text
标准库
项目内代码
外部依赖
```

其中“外部依赖”可以继续拆成公司内部私有依赖和开源第三方依赖。

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

### dependency：当前模块构建时需要的其他模块

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

### library：常见说法里的“库”

`library` 一般翻译成“库”。Go 官方和很多教程都会说“标准库”，也就是 Standard library。标准库里包含很多标准库包，例如 `fmt`、`net/http`、`encoding/json`。

但在 Go 的工程结构里，“库”不如 `package`、`module` 这两个词精确。它更像一种日常分类或产品分类。

例如可以说：

```text
Go 标准库提供了 fmt、net/http、encoding/json 等包。
Viper 是一个配置读取库。
Gin 是一个 Web 框架库。
公司内部可能有统一日志库、鉴权库、配置库。
```

但写代码和管理版本时，最好用更精确的说法：

```text
import 引入的是包。
go.mod 管理的是模块依赖。
标准库是 Go 官方随工具链提供的一组库和包。
公司内部库通常是公司私有模块提供的一个或多个包。
第三方库通常是外部开源模块提供的一个或多个包。
```

所以后面工程实践里的 Viper，可以更准确地说：

```text
Viper 是一个第三方配置库。
它所在的模块是 github.com/spf13/viper。
代码里导入的包也是 github.com/spf13/viper。
项目使用它以后，go.mod 会记录 github.com/spf13/viper 这个模块依赖。
```

不要说“标准依赖”。更常见、更准确的说法是“标准库”或“标准库包”。标准库随 Go 一起发布，不需要 `go get`，也不会作为依赖写进当前项目的 `go.mod`。

参考资料：

- [Managing dependencies](https://go.dev/doc/modules/managing-dependencies)
- [Go Modules Reference](https://go.dev/ref/mod)
- [go.mod file reference](https://go.dev/doc/modules/gomod-ref)
