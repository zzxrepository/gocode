---
permalink: /backend/go/frameworks-and-ecosystem/04-common-libraries/01-viper-config/
title: 01. 使用 Viper 读取配置文件
shortTitle: 01. Viper 配置读取
order: 1
category:
  - Go
  - Golang 框架与生态
  - 常用库
  - 配置管理
tag:
  - Go
  - Viper
  - 配置管理
  - 第三方库
  - 源码解读
---

# 01. 使用 Viper 读取配置文件

## 前言

后端服务跑起来之前，通常先要知道这些信息：

- 服务监听哪个端口。
- 日志级别是什么。
- MySQL、Redis、MQ、下游服务地址分别是什么。
- 当前环境是本地、测试、预发还是生产。
- 敏感信息应该从哪里读取。

这时候如果还把配置写死在代码里，就会很难维护。因为同一套代码要部署到不同环境，配置会经常变化，而代码不应该因为数据库地址、日志级别或超时时间改变就重新编译。

Go 标准库当然能读配置，比如 `os.Getenv` 读环境变量，`encoding/json` 解析 JSON 文件。但真实项目里常见的需求往往不止这些：

1. 本地开发用 YAML 文件。
2. 生产环境用环境变量覆盖敏感配置。
3. 代码里要有默认值兜底。
4. 最后还要转成结构体，方便后续初始化 DB、Redis、HTTP Server。

**Viper 解决的就是这类问题。它不是 Go 标准库，而是 Go 生态里很常见的第三方配置管理库，模块路径是**：

```text
github.com/spf13/viper
```

## Viper 适合解决什么问题

Viper 可以把多种配置来源统一成一套读取方式：

- 默认值：代码里兜底。
- 配置文件：例如 YAML、JSON、TOML。
- 环境变量：适合容器和生产环境。
- 命令行参数：适合 CLI 程序。
- 远程配置中心：更复杂的场景可以接入。

在 Web 服务里，最常见的是：

```text
默认值 + YAML 配置文件 + 环境变量覆盖
```

例如本地开发时使用 `config/config.yaml`，生产环境里用 Kubernetes Secret 或发布平台注入环境变量覆盖数据库密码、Redis 地址等敏感配置。

## 服务项目中的配置分层

以订单服务 `order-service` 为例，它在线上通常会运行在 Kubernetes 或发布平台上。常见的配置分层是：

```text
代码默认值
  ↓
配置文件 config.yaml
  ↓
环境变量覆盖
```

为什么要这样设计？

- 默认值保证服务在本地能快速启动。
- 配置文件保存非敏感配置，例如端口、日志级别、超时时间。
- 环境变量覆盖敏感或环境相关配置，例如数据库 DSN、Redis 地址、外部服务地址。

生产环境里尤其不要把密码、Token、数据库连接串直接提交进 Git 仓库。它们通常来自 Secret、环境变量或配置中心。

## Demo：订单服务读取配置

这个 Demo 模拟一个订单服务，启动时读取配置，并把配置映射到结构体中。

目录结构：

```text
order-service/
├── config/
│   └── config.yaml
├── go.mod
└── main.go
```

### 初始化项目

```bash
mkdir order-service
cd order-service
go mod init example.com/order-service
go get github.com/spf13/viper
```

写完下面的 `main.go` 后执行：

```bash
# 将 main.go 直接导入的 fsnotify 一并写入 go.mod，并清理依赖。
go mod tidy
```

### 编写配置文件

`config/config.yaml`：

```yaml
# 可提交的应用默认配置；敏感信息由环境变量在部署时覆盖。
app:
  name: order-service
  env: local

# HTTP 服务的监听地址和超时设置。
server:
  addr: ":8080"
  read_timeout: 3s
  write_timeout: 3s

mysql:
  # 本地开发 DSN；生产环境使用 ORDER_MYSQL_DSN 覆盖。
  dsn: "root:root@tcp(127.0.0.1:3306)/order?parseTime=true&loc=Local"
  max_open_conns: 50
  max_idle_conns: 10

redis:
  addr: "127.0.0.1:6379"
  db: 0

log:
  level: info
```

这份配置可以提交到仓库，因为它只保存本地开发默认值。生产环境里的 MySQL DSN、Redis 地址和日志级别可以通过环境变量覆盖。

### 编写 Go 代码

`main.go`：

```go
package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
)

type Config struct {
	// Config 是服务启动后传递给各组件的完整配置。
	// mapstructure 标签把 YAML 的顶层键映射到对应字段。
	App    AppConfig    `mapstructure:"app"`
	Server ServerConfig `mapstructure:"server"`
	MySQL  MySQLConfig  `mapstructure:"mysql"`
	Redis  RedisConfig  `mapstructure:"redis"`
	Log    LogConfig    `mapstructure:"log"`
}

type AppConfig struct {
	// Name 和 Env 对应 app.name、app.env。
	Name string `mapstructure:"name"`
	Env  string `mapstructure:"env"`
}

type ServerConfig struct {
	// Duration 字段接收 YAML 中的 "3s" 这类字符串。
	// Viper 在 Unmarshal 时会借助 mapstructure 的解码钩子完成转换。
	Addr         string        `mapstructure:"addr"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

type MySQLConfig struct {
	// DSN 通常由生产环境变量覆盖，避免把凭据写进配置文件。
	DSN          string `mapstructure:"dsn"`
	MaxOpenConns int    `mapstructure:"max_open_conns"`
	MaxIdleConns int    `mapstructure:"max_idle_conns"`
}

type RedisConfig struct {
	// Redis 的地址和逻辑库编号对应 redis.* 配置。
	Addr string `mapstructure:"addr"`
	DB   int    `mapstructure:"db"`
}

type LogConfig struct {
	// Level 对应 log.level，可作为适合热更新的配置示例。
	Level string `mapstructure:"level"`
}

func main() {
	// 应用启动阶段集中读取、转换并校验配置；失败时直接退出，
	// 避免服务启动后才因错误配置处理到一半的请求。
	cfg, err := LoadConfig("./config")
	if err != nil {
		log.Fatalf("load config failed: %v", err)
	}

	// 将已校验的配置注入 HTTP 服务，而不是让处理函数直接读取 Viper。
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		// 健康检查只暴露应用身份和运行环境，不返回任何连接凭据。
		fmt.Fprintf(w, "service=%s env=%s\n", cfg.App.Name, cfg.App.Env)
	})

	// 超时来自配置，服务进程会持续运行，因此文件监听可以收到后续变更。
	server := &http.Server{
		Addr:         cfg.Server.Addr,
		Handler:      mux,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	log.Printf("starting service addr=%s log=%s", cfg.Server.Addr, cfg.Log.Level)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("http server stopped unexpectedly: %v", err)
	}
}

func LoadConfig(configPath string) (*Config, error) {
	// 使用独立实例，避免 viper 全局实例被其他包或测试相互污染。
	v := viper.New()

	// config + yaml + ./config 会让 Viper 查找 ./config/config.yaml。
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(configPath)

	// 先注册低优先级默认值，再注册可覆盖它们的环境变量。
	setDefaults(v)
	bindEnvs(v)

	// 读取并解析 YAML，解析结果先保存到 Viper 的内部配置映射中。
	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("read config file: %w", err)
	}

	var cfg Config
	// Unmarshal 按 Viper 的优先级合并各来源，再映射为强类型结构体。
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	if err := validateConfig(&cfg); err != nil {
		return nil, err
	}

	// 这里只演示监听和记录变更；返回的 cfg 不会自动被修改。
	watchConfig(v)

	return &cfg, nil
}

func setDefaults(v *viper.Viper) {
	// 默认值只在其他来源没有提供同名键时生效。
	v.SetDefault("app.env", "local")
	v.SetDefault("server.addr", ":8080")
	v.SetDefault("server.read_timeout", "3s")
	v.SetDefault("server.write_timeout", "3s")
	v.SetDefault("mysql.max_open_conns", 50)
	v.SetDefault("mysql.max_idle_conns", 10)
	v.SetDefault("redis.db", 0)
	v.SetDefault("log.level", "info")
}

func bindEnvs(v *viper.Viper) {
	// app.env 会映射为 ORDER_APP_ENV；点号转换为下划线。
	v.SetEnvPrefix("ORDER")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	// 开启按需查询环境变量，而不是在启动时复制整个系统环境。
	v.AutomaticEnv()

	// 对需要 Unmarshal 到结构体的关键键显式绑定，
	// 这样 Viper 能把这些环境变量纳入结构体解码的键集合。
	mustBindEnv(v, "app.env")
	mustBindEnv(v, "mysql.dsn")
	mustBindEnv(v, "redis.addr")
	mustBindEnv(v, "log.level")
}

func mustBindEnv(v *viper.Viper, key string) {
	// key 是固定的代码常量；绑定失败意味着程序配置写错，直接终止更合适。
	if err := v.BindEnv(key); err != nil {
		panic(fmt.Sprintf("bind env %s: %v", key, err))
	}
}

func validateConfig(cfg *Config) error {
	// 在启动期校验连接所需的关键配置，避免运行期才暴露错误。
	if cfg.App.Name == "" {
		return fmt.Errorf("app.name is required")
	}
	if cfg.Server.Addr == "" {
		return fmt.Errorf("server.addr is required")
	}
	if cfg.MySQL.DSN == "" {
		return fmt.Errorf("mysql.dsn is required")
	}
	if cfg.Redis.Addr == "" {
		return fmt.Errorf("redis.addr is required")
	}
	return nil
}

func watchConfig(v *viper.Viper) {
	// 先注册回调，再开始监听，避免监听刚启动时遗漏处理逻辑。
	v.OnConfigChange(func(e fsnotify.Event) {
		// Viper 已重新读取文件；业务组件若要动态生效，
		// 还需要在这里安全地更新日志器、开关或连接池。
		log.Printf("config file changed: %s", e.Name)
	})

	// Viper 通过 fsnotify 监听配置文件所在目录，以兼容原子替换文件的写入方式。
	v.WatchConfig()
}
```

这段代码里有几个写法是刻意的。

第一，启动阶段就把配置读成 `Config` 结构体。业务代码后面依赖的是结构体，而不是到处写 `viper.GetString("mysql.dsn")`。

第二，读取配置失败就直接退出。配置错了还把服务启动起来，后面往往会变成更隐蔽的问题。

第三，`watchConfig` 这里只打印变更，不假装热加载已经生效。Viper 能监听文件变化，但业务组件要不要动态更新，是另外一回事。

### 启动服务

直接使用配置文件：

```bash
go run .
```

输出类似：

```text
starting service addr=:8080 log=info
```

服务保持运行后，在另一个终端验证健康检查：

```bash
curl http://127.0.0.1:8080/healthz
```

```text
service=order-service env=local
```

用环境变量覆盖配置：

```bash
ORDER_APP_ENV=prod \
ORDER_LOG_LEVEL=warn \
ORDER_REDIS_ADDR=redis.prod.svc.cluster.local:6379 \
ORDER_MYSQL_DSN='order_app:secret@tcp(mysql.prod.svc.cluster.local:3306)/order?parseTime=true&loc=Local' \
go run .
```

这里的环境变量命名规则来自这段配置：

```go
// 设置环境变量前缀，所有变量以 ORDER_ 开头。
v.SetEnvPrefix("ORDER")
// 将配置键中的点号转换为环境变量常用的下划线。
v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
```

所以：

```text
app.env     -> ORDER_APP_ENV
mysql.dsn   -> ORDER_MYSQL_DSN
redis.addr  -> ORDER_REDIS_ADDR
log.level   -> ORDER_LOG_LEVEL
```

## 配置加载的工程化设计

真实项目里，配置读取通常不是随手 `viper.GetString("mysql.dsn")` 到处写，而是启动时统一读取，再转换成强类型结构体：

这样做有几个好处：

- 配置字段集中管理，便于代码审查。
- 编译器能帮忙检查字段类型。
- 服务启动时可以统一校验必填项。
- 后续初始化 DB、Redis、HTTP Server 时，只需要传结构体。

在服务项目中，配置通常会继续拆分到 `internal/config` 包里，然后由 `main` 负责加载：

```text
cmd/order-service/main.go
internal/config/config.go
internal/server/server.go
internal/repository/mysql.go
```

`main` 是装配入口，负责加载配置、初始化日志、连接数据库、启动 HTTP 服务。业务代码不应该直接依赖 Viper，否则配置读取逻辑会散落在各处。

## Viper 的读取机制

理解 Viper 的源码结构后，就能知道前面这些调用分别在做什么。Viper 并不是“把 YAML 直接填进结构体”的单一解析器；一个 `*viper.Viper` 实例同时保存配置文件、默认值、显式覆盖值、环境变量绑定、命令行参数等多个来源。

### 配置先进入不同的来源层

`viper.New()` 会初始化多组内部映射。可以把它抽象为：

```text
defaults   代码默认值
config     配置文件解析后的值
env        配置键到环境变量名的绑定关系
pflags     命令行参数
override   调用 Set 写入的显式覆盖值
```

例如 `SetDefault("log.level", "info")` 写入 `defaults`；`ReadInConfig()` 找到 `config.yaml` 后，按 YAML 解析并写入 `config`；`BindEnv("log.level")` 则记录 `log.level` 应查询哪个环境变量。

### 读取时按优先级查找

当 Viper 读取一个键时，内部会按优先级逐层查找。简化后的逻辑如下，代码中的注释对应每一层的目的：

```go
func find(key string) any {
	// 业务代码显式 Set 的值拥有最高优先级。
	if value := override[key]; value != nil {
		return value
	}

	// 已被修改过的命令行参数覆盖后续来源。
	if value := changedFlagValue(key); value != nil {
		return value
	}

	// 环境变量通常承载部署环境差异和敏感信息。
	if value := lookupEnv(key); value != nil {
		return value
	}

	// 配置文件保存可版本管理的基础配置。
	if value := configFileValue(key); value != nil {
		return value
	}

	// 远程键值存储适合由配置中心提供动态配置。
	if value := remoteStoreValue(key); value != nil {
		return value
	}

	// 代码默认值是最后的后备来源。
	return defaultValue(key)
}
```

因此本文 Demo 中 `ORDER_LOG_LEVEL=warn` 会覆盖 YAML 里的 `log.level: info`。完整优先级还包括远程键值存储；本文只使用默认值、配置文件和环境变量三层。

### `Unmarshal` 为什么能得到强类型配置

`Unmarshal(&cfg)` 不是只读取 YAML。Viper 会先收集已知键，再按上述优先级得到一份合并后的设置，最后交给 `mapstructure` 解码到 `Config`。`mapstructure:"read_timeout"` 这类标签负责字段名匹配，Viper 默认的解码钩子还能把 `"3s"` 转成 `time.Duration`。

这里显式调用 `BindEnv` 很重要：`AutomaticEnv()` 只是在每次读取键时尝试查询匹配的环境变量，并不会把整个系统环境预先复制进配置映射。对需要直接 `Unmarshal` 的关键键进行绑定，能让它们稳定进入结构体解码流程。

### 热加载实际做了什么

`WatchConfig()` 使用 `fsnotify` 监听配置文件所在目录。检测到写入、创建或原子替换后，Viper 会再次执行 `ReadInConfig()` 更新自己的 `config` 映射，再调用 `OnConfigChange` 注册的回调。

这解释了前面代码里的限制：回调发生时，Viper 的内部数据已经更新，但 `LoadConfig` 返回的 `cfg` 仍是原来的 Go 结构体。要让日志级别或功能开关真正热更新，应用还需要重新解码并以线程安全的方式把新配置交给对应组件。

## Viper 的配置覆盖顺序

Viper 支持多种配置来源。常见情况下，环境变量会覆盖配置文件，配置文件会覆盖默认值。

在这个 Demo 里可以理解为：

```text
环境变量 > config.yaml > 默认值
```

例如 `config.yaml` 里写的是：

```yaml
log:
  level: info
```

启动时传入：

```bash
ORDER_LOG_LEVEL=warn go run .
```

最终读到的就是：

```text
warn
```

这正是生产环境常用的方式：基础配置放文件，环境差异和敏感信息由发布系统注入。

## 常见坑

### 不要把密码提交进仓库

配置文件可以放默认值，但生产密码、Token、AK/SK 不要写进 Git 仓库。

推荐：

```text
本地默认配置：config.yaml
生产敏感配置：环境变量 / Secret / 配置中心
```

### 不要全局到处读 Viper

不要在业务代码里到处写：

```go
// 业务层直接读取全局配置，会让依赖关系分散且难以测试。
viper.GetString("mysql.dsn")
```

更推荐启动时读取一次，转成 `Config` 结构体，然后传给需要的模块。

### 配置必须校验

配置错误应该在服务启动时直接失败，而不是等到请求进来以后才报错。

例如数据库 DSN 为空时，启动阶段就应该返回错误：

```go
// 启动期发现必填项为空时立即返回，阻止服务带病启动。
if cfg.MySQL.DSN == "" {
	return fmt.Errorf("mysql.dsn is required")
}
```

### 热加载不等于所有配置都能动态生效

Viper 可以监听配置文件变化，但不是所有配置都适合热加载。

例如日志级别可以动态调整，功能开关也可以动态调整；但数据库连接池、服务监听端口这类配置，通常需要重新初始化资源，不能只打印一条“配置变了”就算生效。

## 什么时候不用 Viper

Viper 很方便，但不是所有项目都需要它。

如果只是一个很小的工具程序，只读两三个环境变量，用标准库就够了：

```go
// 小型程序直接读取一个环境变量时，标准库已经足够。
dsn := os.Getenv("MYSQL_DSN")
```

如果是 Web 服务、后台任务、微服务项目，并且需要同时支持配置文件和环境变量，Viper 会更省心。

## 总结

Viper 是 Go 生态中常用的第三方配置管理库。它适合把默认值、配置文件、环境变量等来源整合起来，再映射成强类型结构体。

真实项目里推荐这样使用：

- 配置读取集中放在 `internal/config`。
- 默认值写在代码里兜底。
- 非敏感配置写在 YAML 文件里。
- 敏感配置通过环境变量、Secret 或配置中心注入。
- 启动时统一校验配置。
- 业务代码依赖配置结构体，而不是直接依赖 Viper。

记住一句话：**Viper 负责把配置读进来，工程实践负责让配置可维护、可校验、可部署。**

## 参考资料

- [Viper GitHub README](https://github.com/spf13/viper)
- [Viper pkg.go.dev](https://pkg.go.dev/github.com/spf13/viper)
- [Viper 核心实现 viper.go](https://github.com/spf13/viper/blob/master/viper.go)
