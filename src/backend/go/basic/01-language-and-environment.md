---
permalink: /backend/go/basic/01-project-structure/
title: 01. Go 语言概述与开发环境
shortTitle: 01. Go 语言概述与开发环境
order: 1
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 开发环境
  - 安装
  - 工具链
  - Go Modules
---

# 01. Go 语言概述与开发环境

## 前言

Go 的开发从安装工具链、理解程序入口和建立模块开始。掌握项目结构与常用命令后，就能完成编写、运行、测试、构建和依赖管理。

## 1.1 Go 语言简介

Go 是由 Google 开发并开源的一门编译型、静态类型编程语言，通常直接称为 **Go**；“Golang”主要用于搜索和域名等场景，并不是语言的正式名称。

Go 的设计工作始于 2007 年，最初由 Robert Griesemer、Rob Pike 和 Ken Thompson 主导。Go 于 2009 年 11 月作为开源项目发布，并于 2012 年发布 Go 1，语言由此进入强调兼容性和稳定性的阶段。

Go 的设计并不是为了堆叠尽可能多的语言特性，而是希望通过简洁的语法、快速的编译、清晰的依赖关系以及内置的并发机制，提高大型软件项目的开发效率和可维护性。


## 1.2 Go 语言的主要特点

### 1.2.1 语法简洁

Go 的语法受到 C 语言的影响，但删除或简化了许多复杂特性。例如：

- 条件表达式通常不需要使用圆括号；
- 循环统一使用 `for`；
- 不提供传统的类继承体系；
- 通过组合和接口实现代码复用与多态；
- 编译器会检查未使用的导入和局部变量。

Go 的语法规则相对少，代码通常具有较强的可读性。

### 1.2.2 代码风格统一

Go 提供了标准格式化工具 `gofmt`。在项目中也可以通过以下命令格式化代码：

```bash
go fmt ./...
```

许多编辑器会在保存文件时自动调用格式化工具，因此不同开发者编写的 Go 代码通常具有相近的排版风格。

### 1.2.3 编译速度较快

Go 在语言设计和依赖管理方面强调快速编译。编译器能够根据包之间的依赖关系进行构建，并利用构建缓存减少重复编译。

Go 程序通常可以编译成本机可执行文件。对于不依赖特殊动态库的纯 Go 项目，部署时一般不需要额外安装语言运行环境。

### 1.2.4 自动内存管理

Go 具有垃圾回收机制，程序员通常不需要手动释放普通对象所占用的内存。

垃圾回收并不意味着程序不会出现内存问题。无效引用长期存在、缓存没有清理或者 goroutine 没有正常退出，仍然可能导致内存占用持续增长。

### 1.2.5 原生支持并发编程

Go 在语言和运行时层面提供了并发支持，核心机制包括：

- `goroutine`：由 Go 运行时调度的轻量级并发执行单元；
- `channel`：用于在 goroutine 之间传递数据和协调执行；
- `sync` 包：提供互斥锁、读写锁、等待组等同步工具，`sync/atomic` 包提供原子操作；
- `context` 包：用于控制请求范围内的取消、超时和数据传递。

启动 goroutine 的成本通常低于直接创建操作系统线程，其栈空间也可以根据运行需要动态调整。

需要注意，channel 并不能完全取代互斥锁。当多个 goroutine 直接访问共享数据时，仍然可能需要使用 `sync.Mutex`、原子操作或者其他同步机制。

### 1.2.6 标准工具链完善

安装 Go 后会同时获得一套完整的开发工具，包括：

- 编译和运行程序；
- 管理模块与依赖；
- 格式化代码；
- 执行测试和基准测试；
- 静态检查；
- 生成文档；
- 分析程序性能；
- 进行交叉编译。

这些工具统一通过 `go` 命令使用。

## 1.3 Go 语言的常见应用场景

Go 是一门通用编程语言，尤其适合以下场景：

- Web 服务和 API 服务；
- 微服务与分布式系统；
- 云计算和云原生基础设施；
- 网络服务器与代理程序；
- 命令行工具；
- DevOps 和自动化工具；
- 数据库、消息队列和存储系统；
- 高并发 I/O 密集型程序。

Go 也可以用于桌面程序、数据处理和其他领域，但是否适合仍然需要结合项目生态、开发团队和具体需求判断。

## 1.4 安装 Go

应优先从 Go 官方网站下载与操作系统和处理器架构对应的安装包。

### 1.4.1 Windows

下载与处理器架构匹配的 MSI 安装包，按向导完成安装。安装结束后重新打开终端，再执行 `go version` 验证。

[Windows 官方安装说明](https://go.dev/doc/install)

### 1.4.2 macOS

下载与 Intel 或 Apple Silicon 处理器对应的 `.pkg` 安装包，按安装向导操作。安装完成后重新打开终端，执行 `go version`。

[macOS 官方安装说明](https://go.dev/doc/install)

### 1.4.3 Linux

下载对应架构的压缩包，按官方说明安装到 `/usr/local/go`，并将 `/usr/local/go/bin` 加入 `PATH`。升级时应按官方步骤替换旧目录，避免直接覆盖解压。

[Linux 官方安装说明](https://go.dev/doc/install)

## 1.5 验证安装结果

安装完成后，执行：

```bash
go version
```

该命令会显示当前安装的 Go 版本以及操作系统和处理器架构。

还可以使用：

```bash
go env
```

查看 Go 工具链当前使用的环境配置。

只查看某个配置项时，可以在命令后指定名称：

```bash
go env GOPATH
go env GOROOT
go env GOMOD
go env GOOS
go env GOARCH
```

通常不需要手动设置 `GOROOT`。Go 安装程序和 `go` 命令能够根据安装位置确定它。

## 1.6 GOPATH 与 Go Modules

### 1.6.1 现在还需要配置 GOPATH 吗

对于新项目，**不需要把项目放进 `GOPATH`，也不需要手动创建 `src`、`pkg` 和 `bin` 目录**。

早期版本的 Go 使用 GOPATH 工作区组织代码，项目通常必须放在：

```text
$GOPATH/src
```

从 Go Modules 成为默认依赖管理方式后，项目可以保存在任意合适的位置，例如：

```text
~/Projects/hello
~/Code/go-study
D:\Projects\hello
```

项目根目录通过 `go.mod` 文件声明自己属于哪个模块。

### 1.6.2 GOPATH 是否已经被废弃

`GOPATH` 并没有完全消失，但它已经不再承担“所有 Go 项目必须放在这里”的职责。

在模块模式下，`GOPATH` 主要影响：

- 下载模块的本地缓存位置；
- 通过 `go install` 安装命令时的默认位置；
- 少数兼容旧项目的行为。

默认的 `GOPATH` 通常是：

```text
Linux、macOS：$HOME/go
Windows：%USERPROFILE%\go
```

可以通过下面的命令查看：

```bash
go env GOPATH
```

通过 `go install` 安装的命令通常位于：

```text
$(go env GOPATH)/bin
```

为了直接运行这些命令，可以将该目录添加到 `PATH`：

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

Windows 中则应将 `%USERPROFILE%\go\bin` 加入 `Path`。

### 1.6.3 GOPATH 旧模式与 Modules 模式的区别

| 旧版 GOPATH 模式                    | 现代 Go Modules 模式            |
| ----------------------------------- | ------------------------------- |
| 项目通常必须位于 `$GOPATH/src`      | 项目可以位于任意目录            |
| 使用 `src`、`pkg`、`bin` 组织工作区 | 每个项目使用普通目录和 `go.mod` |
| 导入路径依赖 GOPATH 中的目录结构    | 导入路径以模块路径为前缀        |
| 依赖版本管理能力有限                | 可以记录和选择具体依赖版本      |
| `go get` 曾用于下载并安装程序       | `go get` 主要用于调整项目依赖   |
| 经常需要手动配置 `GOPATH`           | 通常使用默认值即可              |

新项目也不需要设置 `GO111MODULE`。按照当前的 Go 开发方式，直接创建 `go.mod` 即可。

## 1.7 创建第一个 Go 项目

### 1.7.1 创建项目目录

```bash
mkdir hello
cd hello
```

### 1.7.2 初始化模块

```bash
go mod init example.com/hello
```

执行后，项目根目录会生成一个 `go.mod` 文件：

```go
module example.com/hello

go 1.xx
```

其中：

- `module` 后面是当前模块的路径；
- `go` 后面是模块声明使用的 Go 语言版本。

`example.com/hello` 可以用于本地学习。准备将项目发布到 GitHub 时，通常应使用与代码仓库对应的路径，例如：

```bash
go mod init github.com/zhangsan/hello
```

模块路径不仅是项目名称，也是模块内部包的导入路径前缀。Go 官方目前以模块作为组织和构建代码的基本单位。

### 1.7.3 编写程序

在项目根目录创建 `main.go`：

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, Go!")
}
```

代码说明：

```go
package main
```

表示当前文件属于 `main` 包。可以直接运行的 Go 程序必须包含 `main` 包。

```go
import "fmt"
```

导入标准库中的 `fmt` 包，用于格式化输入和输出。

```go
func main()
```

定义程序入口函数。运行一个可执行 Go 程序时，会在完成所有包的初始化后调用 `main` 函数。

### 1.7.4 运行程序

在项目根目录执行：

```bash
go run .
```

输出结果：

```text
Hello, Go!
```

`.` 表示当前目录中的包。

也可以直接指定文件：

```bash
go run main.go
```

对于具有多个源文件的项目，通常优先使用：

```bash
go run .
```

### 1.7.5 编译程序

执行：

```bash
go build
```

编译成功后，当前目录中会生成可执行文件。

Linux 和 macOS 中可以运行：

```bash
./hello
```

Windows 中可以运行：

```powershell
.\hello.exe
```

可以通过 `-o` 指定输出文件名称：

```bash
go build -o app
```

Windows 中可以写为：

```powershell
go build -o app.exe
```

不使用 `-o` 时，`go build` 通常会根据包或项目目录确定可执行文件名称。

## 1.8 Go 项目的基本目录结构

Go 并不要求每个项目都包含 `src`、`pkg` 和 `bin` 目录。

一个简单项目可以只有：

```text
hello/
├── go.mod
└── main.go
```

当项目中包含多个包时，可以按照功能创建子目录：

```text
hello/
├── go.mod
├── main.go
└── greeting/
    └── greeting.go
```

规模较大的项目可能会使用以下约定：

```text
project/
├── go.mod
├── go.sum
├── cmd/
├── internal/
├── api/
├── configs/
└── README.md
```

其中：

- `cmd`：通常用于放置一个或多个可执行程序的入口；
- `internal`：存放不允许被模块外部直接导入的内部包；
- `go.mod`：声明模块路径和依赖；
- `go.sum`：记录依赖模块内容的校验信息。

这些目录中，除 `internal` 具有 Go 工具链定义的特殊导入限制外，其余大多属于社区约定，而不是语言强制要求。

## 1.9 Go 工具链与依赖管理

Go 不仅提供了编译器，还提供了一套以 `go` 命令为入口的完整工具链。通过这些命令，可以完成环境查看、模块初始化、依赖管理、代码运行、项目构建、测试、格式化、静态检查以及命令行工具安装等工作。

在终端中执行下面的命令，可以查看所有可用的 Go 命令：

```bash
go help
```

查看某个命令的详细说明：

```bash
go help 命令名称
```

例如：

```bash
go help build
go help test
go help mod
```

### 1.9.1 常用 Go 命令概览

| 命令              | 作用                                     |
| ----------------- | ---------------------------------------- |
| `go version`      | 查看当前安装的 Go 版本                   |
| `go env`          | 查看 Go 的环境配置                       |
| `go help`         | 查看 Go 命令的帮助信息                   |
| `go doc`          | 查看包、类型、函数或其他标识符的文档     |
| `go mod init`     | 初始化模块并创建 `go.mod`                |
| `go mod tidy`     | 添加缺失依赖并删除无用依赖               |
| `go mod download` | 将依赖下载到本地模块缓存                 |
| `go get`          | 添加、升级、降级或移除当前项目的模块依赖 |
| `go run .`        | 编译并运行当前目录中的 `main` 包         |
| `go build`        | 编译当前包                               |
| `go build ./...`  | 编译当前模块中的所有包                   |
| `go install`      | 编译并安装命令                           |
| `go test ./...`   | 测试当前模块中的所有包                   |
| `go fmt ./...`    | 格式化当前模块中的 Go 代码               |
| `go vet ./...`    | 检查代码中常见的可疑写法                 |
| `go list ./...`   | 列出当前模块中的所有包                   |
| `go clean`        | 清理指定的构建缓存或生成结果             |

日常开发中最常用的命令通常包括：

```bash
go run .
go build ./...
go test ./...
go fmt ./...
go vet ./...
go mod tidy
```

---

### 1.9.2 查看 Go 版本和环境配置

#### 1.9.2.1 查看 Go 版本

```bash
go version
```

输出结果类似于：

```text
go version go1.xx.x darwin/arm64
```

输出内容通常包括：

- Go 的版本号；
- 当前操作系统；
- 当前 CPU 架构。

#### 1.9.2.2 查看 Go 环境配置

```bash
go env
```

该命令会输出 Go 使用的全部环境变量。

查看某个指定配置：

```bash
go env GOPATH
go env GOROOT
go env GOPROXY
go env GOMOD
go env GOMODCACHE
go env GOBIN
```

常见环境变量如下：

| 环境变量     | 作用                         |
| ------------ | ---------------------------- |
| `GOROOT`     | Go SDK 的安装目录            |
| `GOPATH`     | Go 的工作目录                |
| `GOBIN`      | Go 命令的安装目录            |
| `GOMOD`      | 当前使用的 `go.mod` 文件位置 |
| `GOMODCACHE` | 模块依赖的缓存目录           |
| `GOPROXY`    | 下载模块时使用的代理         |
| `GOPRIVATE`  | 指定私有模块路径             |
| `GOOS`       | 目标操作系统                 |
| `GOARCH`     | 目标处理器架构               |

使用 `go env -w` 可以持久化修改某项配置：

```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

删除之前通过 `go env -w` 保存的配置：

```bash
go env -u GOPROXY
```

---

### 1.9.3 查看包和标识符文档

`go doc` 可以直接在终端中查看包、类型、函数和方法的文档。

查看整个 `fmt` 包的文档：

```bash
go doc fmt
```

查看 `fmt.Println` 函数的文档：

```bash
go doc fmt.Println
```

查看 `http.Server` 类型的文档：

```bash
go doc net/http.Server
```

查看某个类型的指定方法：

```bash
go doc net/http.Server.ListenAndServe
```

`go doc` 适合在编码过程中快速确认标准库或第三方库的 API 用法。

---

### 1.9.4 运行和编译 Go 程序

#### 1.9.4.1 使用 go run 运行程序

运行当前目录中的 `main` 包：

```bash
go run .
```

运行指定的 Go 文件：

```bash
go run main.go
```

运行多个文件：

```bash
go run main.go config.go server.go
```

`go run` 会先将代码编译成临时可执行文件，再运行该文件。程序退出后，临时构建结果通常会被清理。

它适合：

- 学习阶段运行示例；
- 快速验证代码；
- 执行一次性脚本；
- 开发期间临时启动程序。

正式部署时，通常应先使用 `go build` 生成可执行文件。

#### 1.9.4.2 使用 go build 编译程序

编译当前包：

```bash
go build
```

如果当前包是 `main` 包，会在当前目录中生成可执行文件。

指定输出文件名：

```bash
go build -o app .
```

编译当前模块中的所有包：

```bash
go build ./...
```

其中，`./...` 表示当前目录及其所有子目录中的包。

需要注意：

- 对普通库包执行 `go build`，只检查并编译代码，不会生成可直接运行的程序；
- 对 `main` 包执行 `go build`，会生成可执行文件；
- `go build ./...` 适合检查整个项目是否可以正常编译。

#### 1.9.4.3 交叉编译

Go 可以通过设置 `GOOS` 和 `GOARCH` 为其他平台编译程序。

例如，在 macOS 或 Linux 中编译 Windows 64 位程序：

```bash
GOOS=windows GOARCH=amd64 go build -o app.exe .
```

编译 Linux 64 位程序：

```bash
GOOS=linux GOARCH=amd64 go build -o app .
```

查看 Go 支持的目标平台：

```bash
go tool dist list
```

---

### 1.9.5 测试、格式化和静态检查

#### 1.9.5.1 运行测试

测试当前包：

```bash
go test
```

测试当前模块中的所有包：

```bash
go test ./...
```

显示详细的测试过程：

```bash
go test -v ./...
```

只执行名称符合指定正则表达式的测试：

```bash
go test -run TestName ./...
```

执行基准测试：

```bash
go test -bench=. ./...
```

检测数据竞争：

```bash
go test -race ./...
```

`go test ./...` 是项目提交前最常执行的命令之一。

#### 1.9.5.2 格式化代码

格式化当前模块中的所有 Go 代码：

```bash
go fmt ./...
```

格式化当前包：

```bash
go fmt
```

Go 官方规定了统一的代码格式，因此通常不需要由开发者自行决定缩进、换行等格式。

编辑器一般会在保存文件时自动调用 `gofmt` 或 `goimports`，但在提交代码前仍可以执行：

```bash
go fmt ./...
```

#### 1.9.5.3 静态检查

```bash
go vet ./...
```

`go vet` 会检查能够通过编译、但可能存在问题的代码，例如：

- `Printf` 格式化参数不匹配；
- 不可达代码；
- 错误复制包含锁的结构体；
- 无效的结构体标签；
- 某些容易引起误解的代码写法。

`go vet` 不是编译器，也不是完整的代码质量工具，但它可以发现一些常见错误。

#### 1.9.5.4 列出项目中的包

```bash
go list ./...
```

只列出当前包：

```bash
go list
```

查看当前模块的模块路径：

```bash
go list -m
```

查看当前模块及其所有依赖模块：

```bash
go list -m all
```

---

### 1.9.6 为什么需要依赖管理

实际项目通常会使用大量第三方库，例如：

- Web 框架；
- 数据库驱动；
- 日志库；
- 配置管理库；
- 序列化工具；
- 命令行参数解析工具。

在 Go Module 出现之前，Go 项目主要通过 `GOPATH` 管理源代码和第三方依赖。第三方代码通常会放在：

```text
$GOPATH/src
```

这种方式存在一个明显问题：同一个导入路径通常只能保存一份代码。

例如：

```text
项目 A 依赖 example.com/lib v1.2.0
项目 B 依赖 example.com/lib v1.5.0
```

如果两个项目共用同一个 `GOPATH`，就很难同时保存和使用该依赖的两个不同版本。

传统的 `GOPATH` 模式还存在以下问题：

- 项目通常需要放在 `$GOPATH/src` 中；
- 项目本身没有文件准确记录依赖版本；
- 不同开发环境可能获得不同版本的依赖；
- 依赖升级、降级和回退不够方便；
- 构建结果不容易复现。

为了解决这些问题，Go 官方推出了 Go Module。

---

### 1.9.7 Go Module

Go Module 是 Go 官方提供的模块和依赖管理机制。

使用 Go Module 后：

- 项目可以放在任意目录中；
- 每个项目可以使用不同版本的依赖；
- 项目通过 `go.mod` 记录模块路径和依赖版本；
- 依赖内容通过 `go.sum` 进行完整性校验；
- Go 工具可以自动下载和管理依赖；
- 项目的构建过程更容易复现。

需要区分 Module 和 Package。

#### 1.9.7.1 Package

Package 是同一个目录下的一组 Go 源文件，是代码组织和编译的基本单位。

例如：

```text
myproject/
├── main.go
├── config/
│   └── config.go
└── service/
    └── user.go
```

其中可能包含三个 Package：

```text
main
config
service
```

#### 1.9.7.2 Module

Module 是依赖管理和版本发布的基本单位，可以包含一个或多个 Package。

一个目录是否为模块根目录，主要由该目录中是否存在 `go.mod` 文件决定。

例如：

```text
myproject/
├── go.mod
├── go.sum
├── main.go
├── config/
│   └── config.go
└── service/
    └── user.go
```

整个 `myproject` 是一个 Module，而其中可以包含多个 Package。

---

### 1.9.8 初始化模块

创建项目目录：

```bash
mkdir myproject
cd myproject
```

初始化模块：

```bash
go mod init 模块路径
```

例如，项目准备托管在 GitHub 上，可以使用仓库地址作为模块路径：

```bash
go mod init github.com/username/myproject
```

执行后，当前目录下会生成 `go.mod`：

```go
module github.com/username/myproject

go 1.24.0
```

其中：

- `module` 声明当前模块的模块路径；
- `go` 声明当前模块使用的 Go 语言版本基线。

实际的 `go` 版本值通常会由本地 Go 工具链自动填写。

对于仅用于本地学习的项目，也可以使用示例路径：

```bash
go mod init example/myproject
```

虽然某些情况下可以不为 `go mod init` 显式提供模块路径，但实际项目中建议明确指定。

---

### 1.9.9 go.mod 和 go.sum

使用 Go Module 后，项目根目录下通常会出现：

```text
go.mod
go.sum
```

#### 1.9.9.1 go.mod

`go.mod` 用于描述当前模块和模块依赖。

示例：

```go
module github.com/username/myproject

go 1.24.0

require (
    github.com/example/library v1.2.3
    golang.org/x/text v0.30.0
)
```

常见指令如下：

| 指令        | 作用                                   |
| ----------- | -------------------------------------- |
| `module`    | 声明当前模块的路径                     |
| `go`        | 声明模块使用的 Go 版本基线             |
| `toolchain` | 建议或指定使用的 Go 工具链版本         |
| `require`   | 声明依赖模块及版本                     |
| `replace`   | 将模块替换为其他版本、模块或本地目录   |
| `exclude`   | 排除某个模块版本                       |
| `retract`   | 标记当前模块已经发布但不建议使用的版本 |

依赖后面有时会出现：

```go
require example.com/dependency v1.2.3 // indirect
```

`// indirect` 通常表示当前模块没有直接导入该模块中的包，但其他依赖需要它。

需要注意，`go.mod` 记录的是模块依赖，而不是项目中每一个被导入的 Package。

#### 1.9.9.2 go.sum

`go.sum` 保存依赖模块内容及其 `go.mod` 文件的校验信息。

示例：

```text
example.com/dependency v1.2.3 h1:xxxxxxxxxxxxxxxx
example.com/dependency v1.2.3/go.mod h1:yyyyyyyyyyyyyyyy
```

它用于验证下载到本地的依赖是否与之前记录的内容一致，防止依赖内容被意外修改。

`go.sum` 不是传统意义上的依赖锁文件，但它是模块完整性校验的重要组成部分。

在普通项目中，下面两个文件通常都应提交到 Git 仓库：

```text
go.mod
go.sum
```

不要随意删除 `go.sum`。如果删除，Go 可能在下次构建或整理依赖时重新生成，但这样会丢失已有的校验记录。

---

### 1.9.10 GO111MODULE

`GO111MODULE` 是 Go Module 推广初期，用于切换模块模式和传统 `GOPATH` 模式的环境变量。

它曾经支持三个值：

| 值     | 作用                                   |
| ------ | -------------------------------------- |
| `off`  | 禁用模块模式，使用传统的 `GOPATH` 模式 |
| `on`   | 强制启用模块模式                       |
| `auto` | 根据当前目录和 `go.mod` 自动决定       |

早期教程中经常要求执行：

```bash
go env -w GO111MODULE=on
```

但是在现代 Go 项目中，模块模式已经成为默认工作方式，通常不再需要手动设置 `GO111MODULE=on`。

查看当前配置：

```bash
go env GO111MODULE
```

如果以前通过 `go env -w` 保存过该配置，可以删除：

```bash
go env -u GO111MODULE
```

因此，旧版教程中的流程：

```text
1. 设置 GO111MODULE=on
2. 将项目放到 GOPATH 以外
3. 执行 go mod init
```

在现代 Go 中可以简化为：

```text
1. 创建项目目录
2. 执行 go mod init
3. 编写代码并管理依赖
```

虽然项目源码不再必须放在 `GOPATH` 中，但 `GOPATH` 仍然有其他用途，例如：

```text
$GOPATH/pkg/mod    保存模块缓存
$GOPATH/bin        保存安装的命令行程序
```

---

### 1.9.11 配置 GOPROXY

`GOPROXY` 用于设置 Go 下载模块时使用的代理服务器。

查看当前配置：

```bash
go env GOPROXY
```

一种常见的配置形式如下：

```text
https://proxy.golang.org,direct
```

其中：

- 代理地址表示优先通过模块代理下载；
- `direct` 表示代理无法提供模块时，直接访问代码仓库。

在部分网络环境中，可以配置其他可访问的模块代理：

```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

`go env -w` 适用于 Windows、macOS 和 Linux，会将配置持久化。

如果只希望配置在当前终端会话中生效，可以设置 Shell 环境变量。

macOS 或 Linux：

```bash
export GOPROXY=https://goproxy.cn,direct
```

Windows PowerShell：

```powershell
$env:GOPROXY = "https://goproxy.cn,direct"
```

第三方模块代理属于外部服务，实际项目应根据网络环境、团队规范和安全要求进行选择。

#### 1.9.11.1 私有模块

如果项目需要访问公司内部的私有模块，可以配置 `GOPRIVATE`：

```bash
go env -w GOPRIVATE=*.corp.example.com
```

也可以指定多个路径，使用逗号分隔：

```bash
go env -w GOPRIVATE=github.com/mycompany/*,git.example.com/*
```

`GOPRIVATE` 告诉 Go 工具，这些模块属于私有模块，不应通过公共代理或公共校验数据库查询。

---

### 1.9.12 添加和调整依赖

现代 Go 中，`go get` 主要用于调整当前模块的依赖，并更新：

```text
go.mod
go.sum
```

#### 1.9.12.1 添加依赖

```bash
go get example.com/theirmodule
```

也可以先在代码中导入某个 Package，然后执行：

```bash
go mod tidy
```

Go 会根据 `import` 自动查找并添加缺少的模块依赖。

#### 1.9.12.2 指定版本

```bash
go get example.com/theirmodule@v1.2.3
```

该命令既可以将依赖升级到指定版本，也可以将依赖降级到指定版本。

#### 1.9.12.3 升级到最新版本

```bash
go get example.com/theirmodule@latest
```

也可以省略 `@latest`：

```bash
go get example.com/theirmodule
```

显式写出 `@latest` 可以让操作意图更加清楚。

#### 1.9.12.4 更新到较新的次版本或修订版本

```bash
go get -u example.com/theirmodule
```

仅更新到较新的修订版本：

```bash
go get -u=patch example.com/theirmodule
```

假设当前版本为：

```text
v1.2.3
```

那么：

- 修订版本升级可能是 `v1.2.4`；
- 次版本升级可能是 `v1.3.0`；
- 主版本升级可能是 `v2.0.0`。

#### 1.9.12.5 v2 及以上主版本

Go Module 遵循语义化版本规则。对于 `v2` 及以上的主版本，模块路径通常需要包含主版本号。

例如：

```go
import "example.com/theirmodule/v2"
```

安装对应版本：

```bash
go get example.com/theirmodule/v2@v2.1.0
```

`v0` 和 `v1` 通常不需要在模块路径中添加主版本后缀。

#### 1.9.12.6 删除依赖

当代码已经不再使用某个依赖时，可以删除相关 `import`，然后执行：

```bash
go mod tidy
```

也可以显式移除指定模块：

```bash
go get example.com/theirmodule@none
```

删除某个模块时，Go 可能同时调整依赖图中其他相关模块的版本。

#### 1.9.12.7 查看可用版本

查看某个模块发布过的所有版本：

```bash
go list -m -versions example.com/theirmodule
```

查看指定模块是否存在可升级版本：

```bash
go list -m -u example.com/theirmodule
```

查看当前项目的所有依赖及其可升级版本：

```bash
go list -m -u all
```

---

### 1.9.13 整理依赖

```bash
go mod tidy
```

`go mod tidy` 会根据当前模块中的代码和测试代码整理依赖，主要包括：

- 添加代码实际需要但 `go.mod` 中缺少的依赖；
- 删除代码已经不再使用的模块要求；
- 调整直接依赖和间接依赖；
- 补充 `go.sum` 中缺少的校验信息；
- 删除 `go.sum` 中不再需要的部分记录。

在以下操作之后，通常应执行 `go mod tidy`：

- 增加新的 `import`；
- 删除不再使用的 `import`；
- 调整项目目录；
- 删除某些功能代码；
- 升级或降级依赖；
- 合并其他分支中的依赖修改。

提交代码之前，通常可以执行：

```bash
go fmt ./...
go vet ./...
go test ./...
go mod tidy
```

执行后，应检查并提交发生变化的：

```text
go.mod
go.sum
```

---

### 1.9.14 下载依赖

```bash
go mod download
```

该命令会将项目需要的模块下载到本地模块缓存。

模块缓存目录通常可以通过下面的命令查看：

```bash
go env GOMODCACHE
```

其默认位置一般类似于：

```text
$GOPATH/pkg/mod
```

普通情况下，下面这些命令会在需要时自动下载缺少的依赖：

```bash
go build
go run
go test
go mod tidy
```

因此，日常开发不一定需要主动执行 `go mod download`。

该命令常用于：

- CI 环境预先下载依赖；
- Docker 构建时利用缓存；
- 为离线构建准备依赖；
- 单独验证依赖是否能够正常下载。

例如，在 Dockerfile 中可以先复制模块文件并下载依赖：

```dockerfile
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o app .
```

这样，只有 `go.mod` 或 `go.sum` 发生变化时，依赖下载层才需要重新执行。

---

### 1.9.15 常用 go mod 命令

| 命令              | 作用                                 |
| ----------------- | ------------------------------------ |
| `go mod init`     | 初始化当前目录并创建 `go.mod`        |
| `go mod tidy`     | 添加缺失依赖并删除无用依赖           |
| `go mod download` | 将依赖下载到本地模块缓存             |
| `go mod graph`    | 输出模块依赖图                       |
| `go mod why`      | 解释为什么需要某个 Package 或 Module |
| `go mod edit`     | 通过命令行编辑 `go.mod`              |
| `go mod vendor`   | 将构建需要的依赖复制到 `vendor`      |
| `go mod verify`   | 校验模块缓存中的依赖内容             |

#### 1.9.15.1 查看模块依赖图

```bash
go mod graph
```

输出格式大致如下：

```text
当前模块 依赖模块
```

每一行表示一个模块依赖另一个模块。

#### 1.9.15.2 查看为什么需要某个 Package

```bash
go mod why example.com/theirmodule/package
```

查看为什么需要某个 Module：

```bash
go mod why -m example.com/theirmodule
```

该命令会输出从当前模块到目标依赖之间的引用路径。

#### 1.9.15.3 校验模块缓存

```bash
go mod verify
```

该命令会检查本地模块缓存中的依赖内容是否与下载时保持一致。

如果模块缓存中的文件被手动修改，校验可能失败。

#### 1.9.15.4 编辑 go.mod

`go mod edit` 适合脚本或工具自动修改 `go.mod`。

例如，添加本地替换规则：

```bash
go mod edit -replace=example.com/theirmodule=../theirmodule
```

生成的 `go.mod` 内容类似于：

```go
replace example.com/theirmodule => ../theirmodule
```

删除替换规则：

```bash
go mod edit -dropreplace=example.com/theirmodule
```

普通开发中，添加、升级、降级或删除依赖，应优先使用：

```bash
go get
go mod tidy
```

而不是直接手动修改 `go.mod` 中的版本号。

---

### 1.9.16 使用 replace 调试本地模块

假设当前存在两个并列的本地项目：

```text
workspace/
├── app/
│   └── go.mod
└── library/
    └── go.mod
```

`app` 原本依赖：

```text
example.com/library
```

开发期间希望让 `app` 临时使用本地的 `library`，可以在 `app/go.mod` 中添加：

```go
replace example.com/library => ../library
```

也可以使用命令：

```bash
go mod edit -replace=example.com/library=../library
```

此后，Go 会直接读取本地目录中的代码，而不是从网络下载该模块。

本地调试结束后，应根据项目情况删除该规则：

```bash
go mod edit -dropreplace=example.com/library
```

需要注意，发布公共模块时，不能假设使用者的计算机上存在相同的本地目录。因此，本地路径形式的 `replace` 一般只适用于开发和调试。

---

### 1.9.17 使用 vendor 保存依赖

如果项目需要将依赖源码复制到项目内部，可以执行：

```bash
go mod vendor
```

执行后，项目根目录中会生成：

```text
vendor/
```

该目录保存当前模块构建和测试所需要的依赖 Package。

需要区分模块缓存与 `vendor`：

```text
$GOPATH/pkg/mod    Go 全局共享的模块缓存
项目/vendor        当前项目内部保存的依赖副本
```

必要时可以显式要求构建命令使用 `vendor`：

```bash
go build -mod=vendor
go test -mod=vendor ./...
```

`vendor` 常用于以下场景：

- 构建环境无法访问外部网络；
- 团队要求依赖源码随项目保存；
- 需要对依赖源码进行严格审计；
- 某些构建系统要求使用 `vendor`；
- 希望减少构建过程对外部服务的依赖。

是否将 `vendor` 提交到 Git，应根据团队规范决定。

需要注意，依赖版本发生变化后，应该重新执行：

```bash
go mod tidy
go mod vendor
```

否则 `vendor` 中的代码可能与 `go.mod` 不一致。

---

### 1.9.18 安装命令行工具

安装使用 Go 编写的命令行工具，应使用：

```bash
go install 命令包路径@版本
```

例如：

```bash
go install example.com/tool/cmd/tool@latest
```

安装指定版本：

```bash
go install example.com/tool/cmd/tool@v1.2.3
```

这里指定的路径必须对应一个可以生成可执行文件的 `main` Package。

安装后的可执行文件优先写入 `GOBIN`：

```bash
go env GOBIN
```

如果没有设置 `GOBIN`，通常会安装到：

```text
$(go env GOPATH)/bin
```

查看 `GOPATH`：

```bash
go env GOPATH
```

在 macOS 和 Linux 中，可以将该目录加入 `PATH`：

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

如果需要永久生效，可以将该配置写入：

```text
~/.zshrc
```

或者：

```text
~/.bashrc
```

然后重新加载配置：

```bash
source ~/.zshrc
```

需要明确区分 `go get` 和 `go install`：

```text
go get      管理当前项目的模块依赖
go install  编译并安装命令行工具
```

安装带版本号的命令行工具时：

```bash
go install example.com/tool/cmd/tool@latest
```

通常不会修改当前项目的：

```text
go.mod
go.sum
```

因此，不应再使用 `go get` 安装普通的命令行工具。

#### 1.9.18.1 安装当前模块中的命令

如果当前项目中存在一个 `main` 包，可以在模块目录中执行：

```bash
go install .
```

如果命令位于子目录：

```text
myproject/
├── go.mod
└── cmd/
    └── server/
        └── main.go
```

可以执行：

```bash
go install ./cmd/server
```

这种写法会使用当前模块 `go.mod` 中记录的依赖版本。

---

### 1.9.19 清理构建缓存

执行：

```bash
go clean
```

可以清理当前包生成的部分构建结果。

常用参数如下：

#### 1.9.19.1 清理构建缓存

```bash
go clean -cache
```

#### 1.9.19.2 清理测试结果缓存

```bash
go clean -testcache
```

当测试结果因为缓存未重新执行时，可以使用：

```bash
go clean -testcache
go test ./...
```

也可以直接在测试时禁用结果缓存：

```bash
go test -count=1 ./...
```

#### 1.9.19.3 清理模块缓存

```bash
go clean -modcache
```

该命令会删除本地下载的全部模块缓存。

执行后，下一次构建项目时，依赖需要重新下载，因此不应频繁使用。

#### 1.9.19.4 清理模糊测试缓存

```bash
go clean -fuzzcache
```

清理命令应根据实际问题使用，不建议为了“保持干净”而频繁删除全部缓存，因为缓存可以显著加快构建和测试速度。

---

### 1.9.20 Go Module 的基本使用流程

一个新项目可以按照下面的流程进行初始化和开发。

#### 1.9.20.1 第一步：创建项目目录

```bash
mkdir myproject
cd myproject
```

#### 1.9.20.2 第二步：初始化模块

```bash
go mod init github.com/username/myproject
```

#### 1.9.20.3 第三步：编写代码

例如：

```go
package main

import (
    "fmt"

    "example.com/theirmodule"
)

func main() {
    fmt.Println(theirmodule.Version())
}
```

#### 1.9.20.4 第四步：添加或整理依赖

可以显式添加依赖：

```bash
go get example.com/theirmodule@latest
```

也可以根据代码中的 `import` 自动整理：

```bash
go mod tidy
```

#### 1.9.20.5 第五步：运行程序

```bash
go run .
```

#### 1.9.20.6 第六步：格式化和检查代码

```bash
go fmt ./...
go vet ./...
```

#### 1.9.20.7 第七步：运行测试

```bash
go test ./...
```

如果项目中包含并发代码，可以根据需要执行：

```bash
go test -race ./...
```

#### 1.9.20.8 第八步：编译项目

```bash
go build ./...
```

如果需要生成可执行文件：

```bash
go build -o app .
```

#### 1.9.20.9 第九步：提交依赖描述文件

通常需要提交：

```text
go.mod
go.sum
```

如果团队使用 `vendor`，还应根据项目规范决定是否提交：

```text
vendor/
```

---

### 1.9.21 日常开发推荐流程

在日常开发中，可以按照下面的顺序检查项目：

```bash
# 格式化代码
go fmt ./...

# 整理依赖
go mod tidy

# 进行静态检查
go vet ./...

# 运行全部测试
go test ./...

# 编译全部包
go build ./...
```

对于包含并发逻辑的项目，还可以增加：

```bash
go test -race ./...
```

提交代码前，一个较完整的检查流程可以写成：

```bash
go fmt ./...
go mod tidy
go vet ./...
go test ./...
go build ./...
```

运行服务类项目时：

```bash
go run .
```

生成部署程序时：

```bash
go build -o app .
```

安装第三方命令行工具时：

```bash
go install 模块路径/命令包@版本
```

调整当前项目的依赖时：

```bash
go get 模块路径@版本
go mod tidy
```

不要将现代 Go Module 的使用方式简单理解为“手动修改 `go.mod`，然后执行 `go mod download`”。

更推荐使用 Go 官方工具维护依赖：

```text
go get          调整依赖版本
go mod tidy     根据源代码整理依赖
go mod download 下载模块依赖
go mod verify   校验模块缓存
go mod vendor   生成项目内的依赖副本
```

这样可以让 `go.mod`、`go.sum`、项目源码和实际依赖关系保持一致。


## 1.10 Uber Go 语言编码规范

- [Uber Go 语言编码规范（中文翻译）](https://github.com/xxjwxc/uber_go_guide_cn)

## 总结

- 使用 Go 官方安装说明配置与操作系统、处理器架构匹配的工具链。
- 新项目使用 Go Modules 管理依赖，可以放在普通工作目录中。
- 通过 `go run`、`go test` 和 `go build` 完成运行、测试与构建。
- 使用 `go get`、`go mod tidy` 等命令维护模块依赖，并保存 `go.mod` 与 `go.sum`。

## 参考资料

- [Go 官方安装说明](https://go.dev/doc/install)
