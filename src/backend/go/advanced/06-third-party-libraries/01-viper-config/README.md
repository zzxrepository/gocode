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
  - 第三方库
tag:
  - Go
  - Viper
  - 配置管理
  - 第三方库
  - 源码解读
---

# 01. 使用 Viper 读取配置文件

## 前言

写后端服务时，配置这件事很容易被低估。

刚开始写 demo，端口、数据库地址、日志级别都可以直接写在代码里。代码跑起来了，心里还挺踏实。但服务一旦要分本地、测试、预发、生产环境，问题就来了：

```text
本地数据库地址是一套
测试环境数据库地址是一套
生产环境数据库地址又是一套
日志级别不同
Redis 地址不同
外部服务地址不同
密码和 Token 还不能提交到 Git 仓库
```

这时候如果还把配置写死在代码里，就会很难维护。同一份业务代码应该在不同环境里复用，变化的部分交给配置。

Go 标准库当然能读配置，比如 `os.Getenv` 读环境变量，`encoding/json` 解析 JSON 文件。但真实项目里常见的需求往往不止这些：

1. 本地开发用 YAML 文件。
2. 生产环境用环境变量覆盖敏感配置。
3. 代码里要有默认值兜底。
4. 最后还要转成结构体，方便后续初始化 DB、Redis、HTTP Server。

Viper 解决的就是这类问题。它不是 Go 标准库，而是 Go 生态里很常见的第三方配置管理库，模块路径是：

```text
github.com/spf13/viper
```

包、模块和依赖管理的基础可以先看 [包与 Go Modules](/backend/go/basic/12-packages-and-modules/)。

## Viper 到底帮我们做了什么

先不要急着记 API。可以先把 Viper 理解成一个“配置汇总器”。

它把不同来源的配置收进来，然后按照优先级给业务代码一个统一的读取入口。

常见来源有这些：

```text
默认值
配置文件
环境变量
命令行参数
远程配置中心
```

Web 服务里最常见的一套组合是：

```text
默认值 + YAML 配置文件 + 环境变量覆盖
```

比如本地开发时用 `config/config.yaml`。到了生产环境，数据库 DSN、Redis 地址、日志级别这类配置由发布平台、Kubernetes Secret 或环境变量注入。

这一层关系大概是：

```text
代码默认值
  ↓
config.yaml
  ↓
环境变量覆盖
```

这样做有一个很朴素的好处：配置怎么变，代码都不用重新编译。

## 一个订单服务的配置例子

下面用一个很小的 `order-service` 来串一下。这个 demo 不追求复杂，重点看清楚三件事：

1. 怎么读 YAML。
2. 怎么让环境变量覆盖 YAML。
3. 怎么把配置映射到 Go 结构体。

目录结构：

```text
order-service/
├── config/
│   └── config.yaml
├── go.mod
└── main.go
```

初始化项目：

```bash
mkdir order-service
cd order-service
go mod init example.com/order-service
go get github.com/spf13/viper
```

后面的代码里会直接使用 `fsnotify`，写完 `main.go` 后执行：

```bash
go mod tidy
```

## 配置文件

先写一份本地开发用的配置。

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

这份文件里放的是本地默认值。真实生产环境里的密码、Token、AK/SK 不应该提交到 Git 仓库，它们更适合通过环境变量、Secret 或配置中心注入。

## Go 代码

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

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprintf(w, "service=%s env=%s\n", cfg.App.Name, cfg.App.Env)
	})

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
	// 不直接使用 viper 全局实例，是为了避免测试或多个配置模块互相影响。
	v := viper.New()

	// 这三行组合起来，表示去 ./config 目录下找 config.yaml。
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

	// 这里只演示监听配置变更。注意：已经返回出去的 cfg 不会自动变化。
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
	v.OnConfigChange(func(e fsnotify.Event) {
		log.Printf("config file changed: %s", e.Name)
	})

	v.WatchConfig()
}
```

这段代码里有几个写法是刻意的。

第一，启动阶段就把配置读成 `Config` 结构体。业务代码后面依赖的是结构体，而不是到处写 `viper.GetString("mysql.dsn")`。

第二，读取配置失败就直接退出。配置错了还把服务启动起来，后面往往会变成更隐蔽的问题。

第三，`watchConfig` 这里只打印变更，不假装热加载已经生效。Viper 能监听文件变化，但业务组件要不要动态更新，是另外一回事。

## 运行一下

直接使用配置文件启动：

```bash
go run .
```

输出类似：

```text
starting service addr=:8080 log=info
```

另开一个终端访问健康检查：

```bash
curl http://127.0.0.1:8080/healthz
```

```text
service=order-service env=local
```

如果想模拟生产环境，可以用环境变量覆盖配置：

```bash
ORDER_APP_ENV=prod \
ORDER_LOG_LEVEL=warn \
ORDER_REDIS_ADDR=redis.prod.svc.cluster.local:6379 \
ORDER_MYSQL_DSN='order_app:secret@tcp(mysql.prod.svc.cluster.local:3306)/order?parseTime=true&loc=Local' \
go run .
```

环境变量为什么是这些名字？来自这三行：

```go
v.SetEnvPrefix("ORDER")
v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
v.AutomaticEnv()
```

`ORDER` 是统一前缀，点号会被替换成下划线，所以映射关系是：

```text
app.env     -> ORDER_APP_ENV
mysql.dsn   -> ORDER_MYSQL_DSN
redis.addr  -> ORDER_REDIS_ADDR
log.level   -> ORDER_LOG_LEVEL
```

这样生产环境就可以在不改配置文件、不重新编译代码的情况下，把敏感配置注入进来。

## 顺着 Viper 的源码思路看一遍

只会用 API 还不太够。Viper 有几个行为刚开始容易迷糊，比如环境变量为什么能覆盖配置文件、`Unmarshal` 为什么有时读不到环境变量、热加载为什么没有自动改掉已经返回的结构体。

这些问题顺着它的设计看就清楚很多。

一个 `*viper.Viper` 实例内部会维护多类配置来源。可以先抽象成这样：

```text
defaults   SetDefault 写入的默认值
config     ReadInConfig 解析出来的配置文件内容
env        BindEnv 记录的环境变量绑定关系
pflags     命令行参数
override   Set 显式写入的覆盖值
```

比如：

```go
v.SetDefault("log.level", "info")
```

写入的是默认值层。

```go
v.ReadInConfig()
```

会找到 `config.yaml`，解析后写入配置文件层。

```go
v.BindEnv("log.level")
```

不是立刻读取环境变量，而是记录：以后读取 `log.level` 时，记得去环境变量里找一找。

## 配置读取的优先级

Viper 读取某个 key 时，会按优先级一层层找。简化一下，大概是：

```go
func find(key string) any {
	if value := override[key]; value != nil {
		return value
	}

	if value := changedFlagValue(key); value != nil {
		return value
	}

	if value := lookupEnv(key); value != nil {
		return value
	}

	if value := configFileValue(key); value != nil {
		return value
	}

	if value := remoteStoreValue(key); value != nil {
		return value
	}

	return defaultValue(key)
}
```

本文 demo 里只用了三层，所以可以先记成：

```text
环境变量 > config.yaml > 默认值
```

例如配置文件里是：

```yaml
log:
  level: info
```

启动时传入：

```bash
ORDER_LOG_LEVEL=warn go run .
```

最终读到的就是 `warn`。

这也是 Viper 最实用的地方：基础配置可以放文件，环境差异和敏感信息交给部署系统。

## 为什么要 BindEnv

这里有个容易踩的点：`AutomaticEnv()` 和 `Unmarshal()` 的关系。

`AutomaticEnv()` 的意思是：当你读取某个 key 时，Viper 会尝试去系统环境变量里找对应的值。

但它不会在启动时把整个系统环境变量都复制进 Viper 的配置映射里。也就是说，如果你希望环境变量稳定参与结构体解码，最好对关键 key 显式 `BindEnv`：

```go
mustBindEnv(v, "app.env")
mustBindEnv(v, "mysql.dsn")
mustBindEnv(v, "redis.addr")
mustBindEnv(v, "log.level")
```

这就是为什么 demo 里既写了 `AutomaticEnv()`，又写了 `BindEnv()`。前者负责按需查环境变量，后者让这些 key 在结构体映射时更稳定。

## Unmarshal 做了什么

`Unmarshal(&cfg)` 不是简单地把 YAML 填进结构体。

更接近真实情况的是：

```text
先收集已知配置 key
按优先级合并不同来源的值
再交给 mapstructure 解码到结构体
```

结构体字段上的标签：

```go
Server ServerConfig `mapstructure:"server"`
ReadTimeout time.Duration `mapstructure:"read_timeout"`
```

是给 `mapstructure` 用的。它负责把 YAML 里的 `server.read_timeout` 映射到 Go 结构体字段上。

像 `3s` 这种字符串能转成 `time.Duration`，也是 Viper 配合 `mapstructure` 解码钩子完成的。

所以，如果项目配置越来越多，不建议到处 `GetString`、`GetInt`。统一 `Unmarshal` 成结构体，后续读起来更清楚，也方便校验。

## 热加载不是自动生效

`WatchConfig()` 背后使用 `fsnotify` 监听配置文件变化。文件变了以后，Viper 会重新读取配置，并触发 `OnConfigChange` 注册的回调。

但有个关键点：Viper 内部配置更新了，不代表你已经返回出去的 `cfg` 结构体也自动更新了。

前面代码里：

```go
cfg, err := LoadConfig("./config")
```

`cfg` 是一个普通 Go 结构体指针。`WatchConfig()` 后面监听到文件变化，并不会自动改这个结构体。

所以热加载要分情况看：

1. 日志级别、功能开关这类配置，可以在回调里重新解码并安全更新。
2. 数据库连接池、Redis 客户端这类资源型配置，通常不能只改字段，往往需要重新初始化。
3. HTTP 监听端口这类配置，一般更适合重启服务生效。

Viper 负责发现配置变了，真正让配置安全生效，是应用自己要处理的工程问题。

## 真实项目里怎么放

真实服务里，不建议让业务层直接依赖 Viper。更常见的目录是：

```text
cmd/order-service/main.go
internal/config/config.go
internal/server/server.go
internal/repository/mysql.go
```

`internal/config` 负责读取、解析、校验配置。`main` 负责把配置传给日志、数据库、HTTP Server 等组件。

业务代码最好依赖已经解析好的结构体：

```go
type Repository struct {
	dsn string
}
```

而不是在业务函数里写：

```go
viper.GetString("mysql.dsn")
```

原因也很简单：配置读取一旦散落在业务代码里，测试不好写，依赖关系也不清楚。启动时集中读取，后面显式传递，项目会更稳。

## 常见坑

### 不要把密码提交进仓库

`config.yaml` 可以放本地默认值，但生产密码、Token、AK/SK 不要写进 Git 仓库。

更推荐：

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

日志级别、功能开关可以考虑动态调整。数据库连接池、服务监听端口这类配置，通常要重新初始化资源，甚至直接重启服务更稳。

## 什么时候不用 Viper

Viper 很方便，但不是所有项目都需要它。

如果只是一个很小的命令行工具，只读两三个环境变量，用标准库就够了：

```go
dsn := os.Getenv("MYSQL_DSN")
```

如果是 Web 服务、后台任务、微服务项目，并且需要同时支持配置文件、环境变量、默认值和结构体映射，Viper 会更省心。

## 总结

Viper 的价值不是“帮你读取 YAML”这么简单。

它真正适合解决的是：一个服务在不同环境下，如何把默认值、配置文件、环境变量等来源合并起来，再交给业务代码使用。

这篇文章里可以先记住这条线：

1. 默认值负责兜底。
2. YAML 负责保存可提交的基础配置。
3. 环境变量负责覆盖环境差异和敏感信息。
4. `Unmarshal` 负责把配置转成结构体。
5. 业务代码尽量依赖结构体，而不是直接依赖 Viper。

最后再记一句话：Viper 负责把配置读进来，真正让配置可维护、可校验、可部署，靠的是项目里的工程约束。

## 参考资料

- [Viper GitHub README](https://github.com/spf13/viper)
- [Viper pkg.go.dev](https://pkg.go.dev/github.com/spf13/viper)
- [Viper 核心实现 viper.go](https://github.com/spf13/viper/blob/master/viper.go)
