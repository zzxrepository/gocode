---
title: 01. 使用 Viper 读取配置文件
shortTitle: 01. Viper 配置读取
order: 1
dir:
  link: true
  collapsible: true
  order: 1
icon: sliders
category:
  - Go
  - Golang 进阶知识
  - 工程实践
tag:
  - Go
  - Viper
  - 配置管理
  - 第三方模块
  - 工程实践
---

# 01. 使用 Viper 读取配置文件

## 前言

后端服务跑起来之前，通常先要知道这些信息：

- 服务监听哪个端口。
- 日志级别是什么。
- MySQL、Redis、MQ、下游服务地址分别是什么。
- 当前环境是本地、测试、预发还是生产。
- 敏感信息应该从哪里读取。

小项目可以把这些值写死在代码里，但真实公司项目不会这么做。因为同一套代码要部署到不同环境，配置会经常变化，而代码不应该因为数据库地址、日志级别或超时时间改变就重新编译。

Go 标准库可以用 `os.Getenv`、`encoding/json`、`encoding/xml` 等能力读取配置，但如果项目需要同时支持配置文件、环境变量、默认值、结构体映射和配置热加载，通常会引入外部模块提供的包。**Viper 就是 Go 生态里很常见的配置管理库**，它来自模块 `github.com/spf13/viper`，不是 Go 标准库。

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

## Viper 是第三方模块提供的包

Viper 的导入路径是：

```go
import "github.com/spf13/viper"
```

从代码角度看，`github.com/spf13/viper` 是被 `import` 的包；从 Go Modules 角度看，`github.com/spf13/viper` 也是提供这个包的模块路径。项目使用它时，需要通过 Go Modules 记录模块依赖：

```bash
go get github.com/spf13/viper
```

如果示例里使用配置热加载，还会直接导入 `github.com/fsnotify/fsnotify`，执行 `go mod tidy` 后会自动整理依赖。

## 大厂里常见的配置分层

以一个订单服务 `order-service` 为例，它在线上通常会运行在 Kubernetes 或公司内部发布平台上。一个更接近真实项目的配置分层是：

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

这个 Demo 模拟一个公司内部订单服务，启动时读取配置，并把配置映射到结构体中。

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

如果使用下面的热加载代码，再执行：

```bash
go mod tidy
```

### 编写配置文件

`config/config.yaml`：

```yaml
app:
  name: order-service
  env: local

server:
  addr: ":8080"
  read_timeout: 3s
  write_timeout: 3s

mysql:
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
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
)

type Config struct {
	App    AppConfig    `mapstructure:"app"`
	Server ServerConfig `mapstructure:"server"`
	MySQL  MySQLConfig  `mapstructure:"mysql"`
	Redis  RedisConfig  `mapstructure:"redis"`
	Log    LogConfig    `mapstructure:"log"`
}

type AppConfig struct {
	Name string `mapstructure:"name"`
	Env  string `mapstructure:"env"`
}

type ServerConfig struct {
	Addr         string        `mapstructure:"addr"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

type MySQLConfig struct {
	DSN          string `mapstructure:"dsn"`
	MaxOpenConns int    `mapstructure:"max_open_conns"`
	MaxIdleConns int    `mapstructure:"max_idle_conns"`
}

type RedisConfig struct {
	Addr string `mapstructure:"addr"`
	DB   int    `mapstructure:"db"`
}

type LogConfig struct {
	Level string `mapstructure:"level"`
}

func main() {
	cfg, err := LoadConfig("./config")
	if err != nil {
		log.Fatalf("load config failed: %v", err)
	}

	fmt.Printf("service=%s env=%s addr=%s log=%s\n",
		cfg.App.Name,
		cfg.App.Env,
		cfg.Server.Addr,
		cfg.Log.Level,
	)

	fmt.Printf("mysql max_open=%d redis=%s db=%d\n",
		cfg.MySQL.MaxOpenConns,
		cfg.Redis.Addr,
		cfg.Redis.DB,
	)
}

func LoadConfig(configPath string) (*Config, error) {
	v := viper.New()

	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(configPath)

	setDefaults(v)
	bindEnvs(v)

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("read config file: %w", err)
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	if err := validateConfig(&cfg); err != nil {
		return nil, err
	}

	watchConfig(v)

	return &cfg, nil
}

func setDefaults(v *viper.Viper) {
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
	v.SetEnvPrefix("ORDER")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	mustBindEnv(v, "app.env")
	mustBindEnv(v, "mysql.dsn")
	mustBindEnv(v, "redis.addr")
	mustBindEnv(v, "log.level")
}

func mustBindEnv(v *viper.Viper, key string) {
	if err := v.BindEnv(key); err != nil {
		panic(fmt.Sprintf("bind env %s: %v", key, err))
	}
}

func validateConfig(cfg *Config) error {
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
	v.WatchConfig()
	v.OnConfigChange(func(e fsnotify.Event) {
		log.Printf("config file changed: %s", e.Name)
	})
}
```

### 启动服务

直接使用配置文件：

```bash
go run .
```

输出类似：

```text
service=order-service env=local addr=:8080 log=info
mysql max_open=50 redis=127.0.0.1:6379 db=0
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
v.SetEnvPrefix("ORDER")
v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
```

所以：

```text
app.env     -> ORDER_APP_ENV
mysql.dsn   -> ORDER_MYSQL_DSN
redis.addr  -> ORDER_REDIS_ADDR
log.level   -> ORDER_LOG_LEVEL
```

## 为什么这个 Demo 更接近真实项目

真实项目里，配置读取通常不是随手 `viper.GetString("mysql.dsn")` 到处写，而是启动时统一读取，再转换成强类型结构体：

```go
type Config struct {
	App    AppConfig
	Server ServerConfig
	MySQL  MySQLConfig
	Redis  RedisConfig
	Log    LogConfig
}
```

这样做有几个好处：

- 配置字段集中管理，便于代码审查。
- 编译器能帮忙检查字段类型。
- 服务启动时可以统一校验必填项。
- 后续初始化 DB、Redis、HTTP Server 时，只需要传结构体。

在大厂项目中，配置通常会继续拆分到 `internal/config` 包里，然后由 `main` 负责加载：

```text
cmd/order-service/main.go
internal/config/config.go
internal/server/server.go
internal/repository/mysql.go
```

`main` 像一个装配入口，负责加载配置、初始化日志、连接数据库、启动 HTTP 服务。业务代码不应该直接依赖 Viper，否则配置读取逻辑会散落在各处。

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
viper.GetString("mysql.dsn")
```

更推荐启动时读取一次，转成 `Config` 结构体，然后传给需要的模块。

### 配置必须校验

配置错误应该在服务启动时直接失败，而不是等到请求进来以后才报错。

例如数据库 DSN 为空时，启动阶段就应该返回错误：

```go
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
