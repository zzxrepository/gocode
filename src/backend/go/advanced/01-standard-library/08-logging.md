---
title: 08. 日志记录：log、log/slog 与 Zap
shortTitle: 08. 日志
order: 8
permalink: /backend/go/advanced/01-standard-library/08-logging/
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - 标准库
---

# 08. 日志记录：log、log/slog 与 Zap

## 前言

日志不是简单地打印一行文字，而是为运行中的系统留下可查询、可定位、可运营的事实记录。一条有价值的日志至少要回答：发生了什么、何时发生、发生在何处，以及与哪个请求、用户或错误有关。

三套 API 的分工并不冲突：`log` 面向简单文本日志，直接把内容写到 `io.Writer`；`log/slog` 在标准库中提供级别、属性和 Handler，适合新项目的结构化日志；Zap 通过 `Logger`、`Encoder` 和 `zapcore.Core` 提供更强的性能与输出控制。Lumberjack 不负责生成日志，而是作为底层 Writer 解决文件轮转问题。

## 日志系统需要解决的问题

日志用于记录程序运行状态、错误和诊断信息。一个完整的项目日志方案通常需要考虑：

- 将日志写入终端、文件或日志收集系统；
- 支持 `DEBUG`、`INFO`、`WARN`、`ERROR` 等级别；
- 记录时间、调用文件、函数名和行号；
- 使用结构化字段保存请求 ID、用户 ID、错误等上下文；
- 根据文件大小或保留时间进行日志切割、归档和压缩。

Go 标准库提供 `log` 和 `log/slog`。此外，Zap 是 Go 项目中常用的第三方高性能结构化日志库。

## 标准库 `log` 的基本使用

`log` 包提供一个预定义的标准 logger。默认日志写入 `os.Stderr`，并包含日期和时间：

```go
package main

import "log"

func main() {
    // Println 写入默认 logger；默认目标为 os.Stderr。
    log.Println("服务启动")

    // Printf 按格式化字符串记录一条普通日志。
    port := 8080
    log.Printf("监听端口：%d", port)
}
```

可能输出：

```text
2026/07/15 16:30:00 服务启动
2026/07/15 16:30:00 监听端口：8080
```

标准 logger 提供三组方法：

- `Print`、`Printf`、`Println`：记录普通日志；
- `Fatal`、`Fatalf`、`Fatalln`：记录后调用 `os.Exit(1)`；
- `Panic`、`Panicf`、`Panicln`：记录后触发 `panic`。

## 配置标准 logger

```go
// Prefix 会出现在每条日志消息前面，便于区分模块。
log.SetPrefix("[user-api] ")
// Flags 决定附带的时间精度和调用位置。
log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds | log.Lshortfile)
// 显式指定全局标准 logger 的输出位置。
log.SetOutput(os.Stderr)
```

常用标志：

| 标志                | 作用                        |
| ------------------- | --------------------------- |
| `log.Ldate`         | 输出日期                    |
| `log.Ltime`         | 输出时间                    |
| `log.Lmicroseconds` | 输出微秒级时间              |
| `log.Llongfile`     | 输出完整文件路径和行号      |
| `log.Lshortfile`    | 输出文件名和行号            |
| `log.LUTC`          | 使用 UTC 时间               |
| `log.LstdFlags`     | `Ldate | Ltime`，即默认设置 |

完整示例：

```go
package main

import (
    "log"
    "os"
)

func main() {
    // 修改的是进程级的标准 logger，会影响后续所有 log.Print* 调用。
    log.SetOutput(os.Stderr)
    log.SetPrefix("[user-api] ")
    log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds | log.Lshortfile)

    log.Println("服务启动")
}
```

## 将标准日志写入文件

```go
package main

import (
    "fmt"
    "log"
    "os"
)

func main() {
    // 以“创建、只写、追加”方式打开，避免重启服务时清空旧日志。
    logFile, err := os.OpenFile(
        "app.log",
        os.O_CREATE|os.O_WRONLY|os.O_APPEND,
        0o644,
    )
    if err != nil {
        fmt.Fprintln(os.Stderr, "打开日志文件失败：", err)
        return
    }
    // 文件成功打开后，在 main 返回时关闭文件描述符。
    defer logFile.Close()

    // 后续标准日志都会写进 logFile。
    log.SetOutput(logFile)
    log.SetPrefix("[user-api] ")
    log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds | log.Lshortfile)

    log.Println("服务启动")
}
```

标准 logger 是进程级全局对象。可复用组件或需要多套日志配置时，应创建独立的 `*log.Logger`。

## 创建独立的 `Logger`

```go
package main

import (
    "log"
    "os"
)

func main() {
    // New 创建独立 logger，不会修改全局标准 logger。
    logger := log.New(
        // 任意 io.Writer 都可作为输出目标。
        os.Stderr,
        "[worker] ",
        log.Ldate|log.Ltime|log.Lshortfile,
    )

    logger.Println("任务开始")
}
```

`log.New` 的第一个参数是任意 `io.Writer`，因此日志可以写入标准错误、文件、内存缓冲区或其他目标。

以下方法也可以读取或修改 logger 配置：

```go
// 读取当前日志标志。
logger.Flags()
logger.SetFlags(log.LstdFlags | log.Lshortfile)
// 读取或更新每行消息的前缀。
logger.Prefix()
logger.SetPrefix("[worker] ")
// 2 表示额外跳过两层调用栈，用于让 caller 指向业务调用位置。
logger.Output(2, "一条日志信息")
```

`Output` 的第一个参数表示需要跳过的调用栈层数。普通业务代码通常直接调用 `Println`、`Printf` 等方法，不需要手动使用 `Output`。

## 标准 `log` 的优点与局限

### 优点

- API 简单，标准库直接可用；
- 可以把任意 `io.Writer` 作为输出目标；
- 可以配置时间、文件名、行号和日志前缀；
- 适合小型程序、脚本和简单工具。

### 局限

- 没有完整的 `DEBUG`、`INFO`、`WARN`、`ERROR` 分级模型；
- 缺少原生结构化字段；
- 不提供 JSON Handler；
- 不负责日志切割、压缩和归档；
- `Fatal` 会调用 `os.Exit(1)`，`Panic` 会触发 `panic`，不适合代替普通错误日志。

`Fatal` 通常只应出现在 `main` 等进程入口。库函数、业务函数和 HTTP 处理函数应返回错误，由上层决定记录、重试或退出。

## 使用 `log/slog` 记录结构化日志

`log/slog` 将一条日志表示为时间、级别、消息和一组键值属性：

```go
package main

import "log/slog"

func main() {
    // 键和值按相邻参数配对，适合机器解析的结构化日志。
    slog.Info(
        "用户登录",
        "user_id", 1001,
        "ip", "192.0.2.10",
    )
}
```

常用级别包括：

- `Debug`：调试细节；
- `Info`：正常运行信息；
- `Warn`：值得关注，但程序仍可继续；
- `Error`：操作失败或异常情况。

`slog` 内置文本和 JSON Handler：

```go
package main

import (
    "log/slog"
    "os"
)

func main() {
    // JSON Handler 决定编码格式和输出位置。
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        // 低于 Info 的日志不会写出。
        Level:     slog.LevelInfo,
        // 记录源码位置，便于定位日志来源。
        AddSource: true,
    })

    // Logger 组合 Handler 后提供 Info、Warn、Error 等方法。
    logger := slog.New(handler)
    // 将其设为包级默认 logger，使 slog.Info 使用该配置。
    slog.SetDefault(logger)

    slog.Info(
        "服务启动",
        "service", "user-api",
        "port", 8080,
    )
}
```

使用 `Logger.With` 可以为后续日志添加公共字段：

```go
// With 返回带公共字段的新 logger；原 logger 不会被修改。
serviceLogger := logger.With(
    "service", "user-api",
    "version", "1.2.0",
)

serviceLogger.Info("服务启动", "port", 8080)
```

新项目需要普通结构化日志时，可以优先评估 `log/slog` 是否已经满足需求；需要 Zap 的性能特征、生态或既有工程集成时，可以继续使用 Zap。

---

## Zap 概述

[Zap](https://github.com/uber-go/zap) 是 Uber 开源的高性能、结构化、分级日志库。

Zap 的主要特点包括：

- 支持 `Debug`、`Info`、`Warn`、`Error`、`DPanic`、`Panic`、`Fatal` 等日志级别；
- 支持强类型结构化字段；
- 提供 `SugaredLogger`，支持键值对和 `printf` 风格 API；
- 支持 JSON 和控制台编码；
- 可以通过 `zapcore.Core` 自定义编码器、输出位置和最低日志级别；
- 可以与 Lumberjack 组合实现日志切割和归档。

## 为什么选择 Zap

Zap 同时提供两种使用方式：

- `Logger`：使用强类型字段，性能和类型安全性更高；
- `SugaredLogger`：API 更灵活，支持键值对和 `printf` 风格输出。

Zap 通过专用编码器减少反射、序列化和小对象分配带来的开销，适合日志量大、日志位于高频路径或对性能比较敏感的服务。

Zap 官方仓库提供了基准测试。原教程中的两张性能图保留如下：

记录一条消息和 10 个字段：

![Zap 记录消息和 10 个字段的性能对比](https://www.topgoer.com/static/10.3/1.png)

记录一个静态字符串，不包含上下文字段或 `printf` 模板：

![Zap 记录静态字符串的性能对比](https://www.topgoer.com/static/10.3/2.png)

需要注意，基准测试结果会受到测试代码、依赖版本、硬件和日志配置影响。它适合作为选型参考，但不应替代针对自身业务场景的压测。

## 安装 Zap

在已经初始化 Go Module 的项目中执行：

```bash
go get go.uber.org/zap
```

然后在代码中导入：

```go
import "go.uber.org/zap"
```

## 创建 Zap Logger

Zap 提供了三个常用预设：

| 函数                   | 主要用途                                      |
| ---------------------- | --------------------------------------------- |
| `zap.NewDevelopment()` | 开发环境，输出更易读，默认启用 Debug 日志     |
| `zap.NewProduction()`  | 生产环境，默认输出 JSON，并启用采样等生产配置 |
| `zap.NewExample()`     | 示例和测试代码，配置简单且输出稳定            |

`NewProduction` 和 `NewDevelopment` 都可能返回错误，因此应检查：

```go
// NewProduction 创建面向生产环境的 JSON logger。
logger, err := zap.NewProduction()
if err != nil {
    return err
}
// Sync 尝试把编码器或底层 Writer 中的缓冲日志刷新出去。
defer logger.Sync()
```

`Sync` 用于刷新可能存在的缓冲日志。部分终端环境中对标准输出或标准错误执行 `Sync` 可能返回不需要处理的底层错误；写文件等场景仍应重视刷新失败。

### 使用强类型 `Logger`

`Logger` 的日志方法形式如下：

```go
func (log *Logger) Info(msg string, fields ...zap.Field)
```

常用字段构造函数包括：

```go
zap.String("url", url)
zap.Int("port", 8080)
zap.Bool("debug", true)
zap.Duration("timeout", time.Second)
zap.Error(err)
```

完整示例：

```go
package main

import (
    "fmt"
    "net/http"
    "time"

    "go.uber.org/zap"
)

func main() {
    // 创建生产配置的强类型 Zap Logger。
    logger, err := zap.NewProduction()
    if err != nil {
        panic(fmt.Errorf("初始化 Zap 失败：%w", err))
    }
    defer logger.Sync()

    // 为 HTTP 请求设置超时，避免请求无限等待。
    client := &http.Client{Timeout: 5 * time.Second}

    simpleHTTPGet(client, logger, "www.example.com")
    simpleHTTPGet(client, logger, "https://example.com")
}

func simpleHTTPGet(client *http.Client, logger *zap.Logger, url string) {
    // 使用传入的 client 发起请求，便于复用连接和超时配置。
    resp, err := client.Get(url)
    if err != nil {
        // zap.String 和 zap.Error 生成强类型结构化字段。
        logger.Error(
            "请求 URL 失败",
            zap.String("url", url),
            zap.Error(err),
        )
        return
    }
    // 成功获得响应后必须关闭 Body，归还底层连接。
    defer resp.Body.Close()

    // 记录成功事件及状态字段，便于后续筛选和聚合。
    logger.Info(
        "请求 URL 成功",
        zap.String("url", url),
        zap.String("status", resp.Status),
        zap.Int("status_code", resp.StatusCode),
    )
}
```

第一个 URL 缺少协议，通常会记录错误日志；第二个 URL 是合法的 HTTPS 地址。

生产 logger 默认输出 JSON，形式类似：

```json
{"level":"error","ts":1721044200.123,"caller":"main.go:34","msg":"请求 URL 失败","url":"www.example.com","error":"unsupported protocol scheme \"\""}
{"level":"info","ts":1721044200.456,"caller":"main.go:44","msg":"请求 URL 成功","url":"https://example.com","status":"200 OK","status_code":200}
```

## 使用 `SugaredLogger`

通过 `Logger.Sugar()` 可以获得 `SugaredLogger`：

```go
// 创建底层 Logger；SugaredLogger 基于它包装而来。
logger, err := zap.NewProduction()
if err != nil {
    return err
}
// Sugar 返回支持 Infof、Infow 等便捷 API 的包装器。
sugar := logger.Sugar()
```

`SugaredLogger` 支持三类常用 API：

```go
sugar.Info("服务启动")
sugar.Infof("监听端口：%d", 8080)
sugar.Infow("服务启动", "port", 8080, "debug", false)
```

- `Info`：类似普通打印；
- `Infof`：使用 `printf` 风格格式化；
- `Infow`：使用消息和键值对记录结构化字段。

使用键值对 API 时，键应为字符串，并且参数应成对出现。

完整示例：

```go
package main

import (
    "fmt"
    "net/http"
    "time"

    "go.uber.org/zap"
)

func main() {
    // 强类型 Logger 与 Sugar 可以在同一程序中并存。
    logger, err := zap.NewProduction()
    if err != nil {
        panic(fmt.Errorf("初始化 Zap 失败：%w", err))
    }
    defer logger.Sync()

    // 将底层 Logger 转为 SugaredLogger。
    sugar := logger.Sugar()
    client := &http.Client{Timeout: 5 * time.Second}

    simpleHTTPGetWithSugar(client, sugar, "www.example.com")
    simpleHTTPGetWithSugar(client, sugar, "https://example.com")
}

func simpleHTTPGetWithSugar(
    client *http.Client,
    logger *zap.SugaredLogger,
    url string,
) {
    // Debugf 使用 printf 风格格式化；生产环境默认可能过滤 Debug。
    logger.Debugf("准备发送 GET 请求：%s", url)

    resp, err := client.Get(url)
    if err != nil {
        // Errorw 的后续参数必须按“键、值”成对传入。
        logger.Errorw(
            "请求 URL 失败",
            "url", url,
            "err", err,
        )
        return
    }
    defer resp.Body.Close()

    logger.Infow(
        "请求 URL 成功",
        "url", url,
        "status", resp.Status,
        "status_code", resp.StatusCode,
    )
}
```

`Logger` 和 `SugaredLogger` 可以相互转换：

```go
// 在便捷 API 与强类型字段 API 之间可以相互转换。
sugar := logger.Sugar()
plain := sugar.Desugar()
```

是否使用 `SugaredLogger` 不必成为整个项目的全局决定。性能敏感的高频路径可以使用 `Logger`，其他位置可以使用 `SugaredLogger`。

## 使用 `zapcore` 自定义 Logger

Zap 的高级配置通常由三个核心部分组成：

1. **Encoder**：决定日志如何编码；
2. **WriteSyncer**：决定日志写到哪里；
3. **LevelEnabler**：决定哪些级别的日志被写入。

`zapcore.NewCore` 的基本形式如下：

```go
// Core 连接编码器、输出目标和最低允许级别。
core := zapcore.NewCore(encoder, writeSyncer, zapcore.DebugLevel)
// Logger 在 Core 之上提供日志记录 API。
logger := zap.New(core)
```

对于普通项目，应优先使用 `zap.Config` 或预设配置；只有需要拆分多个输出、组合多个 Core 或深度控制编码行为时，才需要直接使用 `zapcore`。

### 将日志写入文件

```go
package main

import (
    "fmt"
    "os"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func newFileLogger(path string) (*zap.Logger, func() error, error) {
    // 以追加方式打开文件，保留之前已写入的日志。
    file, err := os.OpenFile(
        path,
        os.O_CREATE|os.O_WRONLY|os.O_APPEND,
        0o644,
    )
    if err != nil {
        return nil, nil, fmt.Errorf("打开日志文件失败：%w", err)
    }

    // JSON Encoder 决定每条日志的序列化格式。
    encoder := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
    // AddSync 将 *os.File 适配为 Zap 需要的 WriteSyncer。
    writeSyncer := zapcore.AddSync(file)
    core := zapcore.NewCore(encoder, writeSyncer, zapcore.DebugLevel)
    logger := zap.New(core)

    // 调用方通过返回的关闭函数同时处理日志刷新和文件关闭。
    closeLogger := func() error {
        syncErr := logger.Sync()
        closeErr := file.Close()
        if syncErr != nil {
            return syncErr
        }
        return closeErr
    }

    return logger, closeLogger, nil
}

func main() {
    // 初始化文件 logger，并获得需要在退出时执行的清理函数。
    logger, closeLogger, err := newFileLogger("app.log")
    if err != nil {
        panic(err)
    }
    defer closeLogger()

    logger.Debug("调试日志")
    logger.Info("服务启动", zap.Int("port", 8080))
}
```

与原教程直接使用 `os.Create` 不同，这里使用 `O_APPEND` 追加写入，避免程序每次启动都清空旧日志。

### JSON Encoder 与 Console Encoder

JSON 编码器：

```go
func getJSONEncoder() zapcore.Encoder {
    // 生产配置默认符合 JSON 日志采集场景。
    return zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
}
```

控制台编码器：

```go
func getConsoleEncoder() zapcore.Encoder {
    // Console Encoder 更适合人在终端直接阅读。
    return zapcore.NewConsoleEncoder(zap.NewProductionEncoderConfig())
}
```

- JSON 适合日志采集系统进行解析和检索；
- Console 格式适合开发环境或需要直接阅读文本日志的场景。

### 修改时间和日志级别编码

默认生产配置中的时间可能以 Unix 秒表示。可以修改编码器配置，使日志更易读：

```go
func getEncoder() zapcore.Encoder {
    // 先复制生产编码器配置，再按需要覆盖字段编码规则。
    encoderConfig := zap.NewProductionEncoderConfig()
    // 把 Unix 时间改为易读的 ISO 8601 时间。
    encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
    // 把 info/error 改为 INFO/ERROR。
    encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder

    return zapcore.NewConsoleEncoder(encoderConfig)
}
```

常见时间编码器：

- `zapcore.EpochTimeEncoder`：Unix 秒；
- `zapcore.ISO8601TimeEncoder`：ISO 8601 可读时间；
- `zapcore.RFC3339TimeEncoder`：RFC 3339 时间；
- `zapcore.RFC3339NanoTimeEncoder`：带纳秒精度的 RFC 3339 时间。

常见级别编码器：

- `zapcore.LowercaseLevelEncoder`：`info`、`error`；
- `zapcore.CapitalLevelEncoder`：`INFO`、`ERROR`；
- `zapcore.LowercaseColorLevelEncoder`：小写彩色级别；
- `zapcore.CapitalColorLevelEncoder`：大写彩色级别。

### 添加调用者信息

使用 `zap.AddCaller()` 可以记录调用文件和行号：

```go
// AddCaller 让日志带上实际调用的源码文件和行号。
logger := zap.New(core, zap.AddCaller())
```

封装日志函数后，如果显示的调用位置落在封装层中，可以配合 `zap.AddCallerSkip` 调整跳过的调用栈层数：

```go
// AddCallerSkip 用于跳过封装日志函数所在的调用层。
logger := zap.New(core, zap.AddCaller(), zap.AddCallerSkip(1))
```

## 使用 Lumberjack 进行日志切割归档

Zap 负责生成和编码日志，但本身不负责按文件大小切割、保留备份和压缩历史文件。可以使用 [Lumberjack](https://github.com/natefinch/lumberjack) 作为底层 `io.Writer`。

本节使用仍然广泛采用的 Lumberjack v2 API：

```bash
go get gopkg.in/natefinch/lumberjack.v2
```

导入：

```go
import "gopkg.in/natefinch/lumberjack.v2"
```

### Lumberjack 配置

```go
// Lumberjack 实现 io.Writer，并在达到阈值时轮转文件。
lumberjackLogger := &lumberjack.Logger{
    Filename:   "./app.log",
    MaxSize:    10,
    MaxBackups: 5,
    MaxAge:     30,
    Compress:   false,
}
```

主要字段：

| 字段         | 说明                                         |
| ------------ | -------------------------------------------- |
| `Filename`   | 当前日志文件路径                             |
| `MaxSize`    | 单个日志文件达到多大后切割，单位为 MB        |
| `MaxBackups` | 最多保留多少个旧日志文件                     |
| `MaxAge`     | 旧日志最多保留多少天                         |
| `LocalTime`  | 备份文件时间戳是否使用本地时间，默认使用 UTC |
| `Compress`   | 是否使用 gzip 压缩切割后的日志文件           |

Lumberjack 假设同一个日志文件只由一个进程写入。多个进程同时使用相同配置写入同一文件可能产生异常行为。

### 将 Lumberjack 转换为 Zap WriteSyncer

```go
func getLogWriter() zapcore.WriteSyncer {
    // 配置轮转文件的路径、大小、备份数量和保留天数。
    lumberjackLogger := &lumberjack.Logger{
        Filename:   "./app.log",
        MaxSize:    10,
        MaxBackups: 5,
        MaxAge:     30,
        Compress:   false,
    }

    // 适配为 Zap Core 能直接使用的输出目标。
    return zapcore.AddSync(lumberjackLogger)
}
```

`lumberjack.Logger` 实现了 `io.Writer`，因此可以通过 `zapcore.AddSync` 适配为 Zap 使用的 `WriteSyncer`。

## Zap 与 Lumberjack 完整示例

下面将以下功能组合在一起：

- `SugaredLogger`；
- 自定义 Console Encoder；
- ISO 8601 时间；
- 大写日志级别；
- 调用者文件和行号；
- Debug 及以上日志；
- Lumberjack 按大小切割、保留备份和归档。

```go
package main

import (
    "fmt"
    "net/http"
    "time"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
    "gopkg.in/natefinch/lumberjack.v2"
)

func main() {
    // 初始化带轮转输出的 Logger。
    logger := initLogger()
    defer logger.Sync()

    // 使用 SugaredLogger 记录键值对字段。
    sugar := logger.Sugar()
    client := &http.Client{Timeout: 5 * time.Second}

    simpleHTTPGet(client, sugar, "www.example.com")
    simpleHTTPGet(client, sugar, "https://example.com")
}

func initLogger() *zap.Logger {
    // 组合编码规则、轮转输出和最低日志级别。
    encoder := getEncoder()
    writeSyncer := getLogWriter()
    core := zapcore.NewCore(
        encoder,
        writeSyncer,
        zapcore.DebugLevel,
    )

    // AddCaller 将业务调用位置加入日志。
    return zap.New(core, zap.AddCaller())
}

func getEncoder() zapcore.Encoder {
    encoderConfig := zap.NewProductionEncoderConfig()
    encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
    encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder

    return zapcore.NewConsoleEncoder(encoderConfig)
}

func getLogWriter() zapcore.WriteSyncer {
    // 每个字段直接对应 Lumberjack 的轮转策略。
    lumberjackLogger := &lumberjack.Logger{
        Filename:   "./app.log",
        MaxSize:    10,
        MaxBackups: 5,
        MaxAge:     30,
        LocalTime:  true,
        Compress:   true,
    }

    return zapcore.AddSync(lumberjackLogger)
}

func simpleHTTPGet(
    client *http.Client,
    logger *zap.SugaredLogger,
    url string,
) {
    // Debugw 将 URL 作为独立字段，而不是拼进消息文本。
    logger.Debugw("准备发送 GET 请求", "url", url)

    resp, err := client.Get(url)
    if err != nil {
        logger.Errorw(
            "请求 URL 失败",
            "url", url,
            "err", err,
        )
        return
    }
    // 关闭响应体的错误也要记录，避免连接泄漏难以定位。
    defer func() {
        if err := resp.Body.Close(); err != nil {
            logger.Warnw(
                "关闭响应体失败",
                "url", url,
                "err", err,
            )
        }
    }()

    logger.Infow(
        "请求 URL 成功",
        "url", url,
        "status", resp.Status,
        "status_code", resp.StatusCode,
    )
}

func reportSyncError(err error) {
    if err != nil {
        fmt.Println("刷新日志失败：", err)
    }
}
```

上面的 `reportSyncError` 展示了需要显式报告 `Sync` 错误时的处理方式。也可以在 `main` 中写成：

```go
if err := logger.Sync(); err != nil {
    fmt.Println("刷新日志失败：", err)
}
```

如果使用 `defer`，可以使用闭包检查错误：

```go
defer func() {
    if err := logger.Sync(); err != nil {
        fmt.Println("刷新日志失败：", err)
    }
}()
```

## 多输出和不同级别的 Core

原教程主要介绍单一文件输出。在实际项目中，`zapcore.NewTee` 还可以组合多个 Core，例如：

- `INFO` 及以上写入普通日志文件；
- `ERROR` 及以上同时写入错误日志文件；
- 开发环境同时输出到终端。

```go
// Tee 将同一条日志分发给多个独立的 Core。
core := zapcore.NewTee(
    infoCore,
    errorCore,
    consoleCore,
)
logger := zap.New(core, zap.AddCaller())
```

这是 `zapcore` 的常见高级用途，但完整配置需要结合项目的日志规范、部署环境和采集系统设计。

## 日志库选型建议

| 场景                         | 建议                                          |
| ---------------------------- | --------------------------------------------- |
| 小型脚本、简单工具           | 标准库 `log`                                  |
| 新项目的一般结构化日志       | 优先评估 `log/slog`                           |
| 已有项目正在使用 Zap         | 继续使用，无需仅因 `slog` 出现而重写          |
| 高频日志路径、重视分配和性能 | Zap `Logger`                                  |
| 希望兼顾易用性与结构化日志   | Zap `SugaredLogger`                           |
| 需要日志文件轮转             | Zap 或 `slog` 配合部署环境、Lumberjack 等组件 |

无论使用哪一种日志方案，都应遵循以下原则：

1. 日志字段使用稳定的键名，例如 `request_id`、`user_id` 和 `err`。
2. 错误应作为独立字段记录，不要只拼接进难以解析的长字符串。
3. 不记录密码、访问令牌和敏感个人信息。
4. 避免在多个调用层重复记录同一个错误。
5. 谨慎使用 `Fatal` 和 `Panic`，普通错误应返回给调用者。
6. 日志生成、日志切割、集中采集和长期存储应分层设计。
7. 性能选择应以自身业务压测为准，不应只依据第三方基准测试。



## 总结

日志系统可以按层理解：调用代码提供消息和上下文，`log`、`slog` 或 Zap 负责级别与编码，`io.Writer`、Handler 或 `zapcore.Core` 决定输出位置，Lumberjack 或部署平台负责轮转与保留，日志平台负责长期采集与检索。把这些职责分开，才能在更换输出方式时不改业务日志调用。

小型工具使用 `log` 已足够；一般的结构化日志可优先评估 `log/slog`；高频路径或已有工程集成可以使用 Zap。无论采用哪种实现，都应使用稳定字段名、将错误作为独立字段、避免记录敏感信息，并避免在多个调用层重复记录同一个错误。
