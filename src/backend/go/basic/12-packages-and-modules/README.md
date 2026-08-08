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

## 标准库、第三方包和第三方依赖

Go 里的 `package` 通常翻译成“包”。一个包就是一组放在同一个目录下、使用同一个 `package` 名称的 Go 文件。写代码时通过 `import` 引入其他包。

Go 项目里常见的包可以分成三类：

| 类型 | 示例 | 说明 |
| --- | --- | --- |
| 标准库包 | `fmt`、`net/http`、`encoding/json`、`os` | Go 官方自带，安装 Go 后就能用 |
| 项目内部包 | `example.com/order-service/internal/config` | 当前项目自己写的包 |
| 第三方包 | `github.com/spf13/viper`、`github.com/gin-gonic/gin` | 其他团队或开源社区提供的包 |

第三方包被当前项目使用以后，就会成为当前项目的第三方依赖。依赖版本由 Go Modules 管理，主要体现在两个文件里：

```text
go.mod  记录模块名和直接依赖
go.sum  记录依赖校验信息
```

例如 Viper 是一个常用的配置读取库，它不是 Go 标准库，而是第三方包：

```go
import "github.com/spf13/viper"
```

安装它：

```bash
go get github.com/spf13/viper
```

执行后，`go.mod` 里会出现类似依赖记录：

```go
require github.com/spf13/viper v1.x.x
```

所以可以这样理解：

```text
标准库：Go 官方自带的包
第三方包：别人发布出来给你 import 的包
第三方依赖：你的项目实际依赖了某个第三方包及其版本
```

后面工程实践里的 Viper 配置读取，就是一个典型的第三方依赖使用场景。
