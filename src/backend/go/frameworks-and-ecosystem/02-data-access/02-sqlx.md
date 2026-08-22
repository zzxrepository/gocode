---
permalink: /backend/go/frameworks-and-ecosystem/02-data-access/02-sqlx/
title: 01. Go MySQL 数据访问：database/sql 与 sqlx
shortTitle: 01. database/sql 与 sqlx
order: 1
category:
  - Go
  - Golang 框架与生态
  - 数据访问
tag:
  - Go
  - database/sql
  - sqlx
  - MySQL
  - SQL
  - 连接池
  - 事务
---

# 01. Go MySQL 数据访问：database/sql 与 sqlx

## 前言

Go 程序连上 MySQL、写出一条 `SELECT` 并不难。真正会在生产环境暴露的问题通常在 SQL 之外：把 `sql.DB` 误当成一条连接而在每个请求中新建、忘记关闭 `Rows` 使连接池耗尽、只给 HTTP 请求设置超时却让数据库查询无限等待，或者在事务里误用了事务外的 `db`。

这些问题和是否采用 ORM 没有直接关系。它们都从 Go 的数据访问基础设施开始：`database/sql` 统一 API 并管理连接池，MySQL 驱动负责实现 MySQL 协议，`sqlx` 在不隐藏 SQL 的前提下减少结果映射和参数绑定的重复代码。

阅读并运行示例后，应能独立完成以下工作：

- 初始化一个可复用的 MySQL 连接池，并理解它何时真正建立连接；
- 使用 `database/sql` 编写安全的 CRUD、流式查询、事务和预编译语句；
- 正确处理 `context.Context`、`Rows.Close`、NULL 值与连接池等待；
- 使用 sqlx 的结构体映射、命名参数、`IN` 参数展开；
- 区分问题应由 SQL、标准库、驱动还是 sqlx 解决。

示例基于 MySQL 和 `github.com/go-sql-driver/mysql`。金额使用“分”保存为整数，避免浮点数精度问题。

## 从一条查询看清三层关系

```text
业务代码
   │  QueryContext / ExecContext / BeginTx
   ▼
database/sql                 标准库：统一 API、连接池、事务、通用转换
   │  database/sql/driver 接口
   ▼
go-sql-driver/mysql          驱动：DSN、认证、MySQL 协议、结果解码
   │  TCP 或 Unix Socket
   ▼
MySQL Server

sqlx 位于业务代码与 database/sql 之间：
sqlx.DB 内嵌 *sql.DB，只增加结构体映射、命名参数和 IN 展开。
```

`database/sql` **不是 MySQL 客户端实现**。标准库没有内置具体数据库驱动；它定义 `database/sql/driver` 接口，并管理连接池、事务和参数转换。MySQL 驱动实现这些接口，才真正知道怎样与服务端握手、认证、发送命令和解析结果。

MySQL 驱动会在包初始化时注册 `mysql` 这个名字。下面是驱动的关键源码：

```go
func init() {
	// 将名字和驱动实现放入 database/sql 的注册表。
	// 因此 sql.Open("mysql", dsn) 才能找到 MySQL 驱动。
	sql.Register("mysql", &MySQLDriver{})
}
```

只需触发注册、但不用驱动导出类型时使用空白导入：

```go
import _ "github.com/go-sql-driver/mysql" // 执行 init，不直接引用包名
```

后文会用驱动的 `mysql.Config` 构造 DSN，因此使用普通导入：

```go
import mysql "github.com/go-sql-driver/mysql"
```

sqlx 既不是驱动，也不是 ORM。它的核心结构直接内嵌 `*sql.DB`，这意味着连接池、`ExecContext`、`BeginTx` 的行为仍然来自标准库。以下是 sqlx 源码的关键结构（删去了无关实现）：

```go
type DB struct {
	*sql.DB                 // 提升 database/sql 的方法，不会重建连接池
	driverName string       // 知道 MySQL 使用 ?、PostgreSQL 使用 $1 等
	Mapper     *reflectx.Mapper // 将列名映射到结构体的 db tag
}

func Open(driverName, dsn string) (*DB, error) {
	db, err := sql.Open(driverName, dsn) // 底层仍是标准库
	if err != nil {
		return nil, err
	}
	return &DB{DB: db, driverName: driverName, Mapper: mapper()}, nil
}
```

所以 sqlx 不能替代对连接池、事务、超时和资源释放的理解；它只是让“手写 SQL + Go 结构体”的组合更顺手。

## 准备环境和数据表

```bash
mkdir go-mysql-data-access
cd go-mysql-data-access
go mod init example.com/go-mysql-data-access

# 实现 MySQL 协议的 database/sql 驱动
go get github.com/go-sql-driver/mysql

# 仍建立在 database/sql 之上的扩展库
go get github.com/jmoiron/sqlx
```

本地没有 MySQL 时，可以启动一个临时容器：

```bash
# 将容器的 3306 映射为宿主机 3307，避免占用本地常用端口。
docker run --name go-tutorial-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=go_tutorial \
  -p 3307:3306 \
  -d mysql:8.4
```

连接 MySQL 后执行建表语句。注意 `utf8mb4`、毫秒精度的 `DATETIME(3)` 和 InnoDB 事务引擎：

```sql
CREATE DATABASE IF NOT EXISTS go_tutorial
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE go_tutorial;

CREATE TABLE users (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    email      VARCHAR(255) NOT NULL,
    name       VARCHAR(100) NOT NULL,
    bio        TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
               ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE accounts (
    id            BIGINT PRIMARY KEY,
    balance_cents BIGINT NOT NULL,
    CONSTRAINT chk_accounts_balance_nonnegative CHECK (balance_cents >= 0)
) ENGINE=InnoDB;

INSERT INTO accounts (id, balance_cents) VALUES (1, 10000), (2, 5000);
```

## 建立连接池：`sql.DB` 不是一条连接

`sql.DB` 是并发安全、长期复用的**连接池句柄**，不是某条物理连接。应用通常启动时创建一次，注入 repository 或 service，优雅退出时关闭。不要在每个 HTTP 请求里 `sql.Open`，也不要在每个 repository 方法里 `defer db.Close()`。

下面使用驱动配置对象生成 DSN，避免手拼含特殊字符的账号、密码和时区参数。

```go
package data

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	mysql "github.com/go-sql-driver/mysql"
)

// MySQLConfig 由部署配置填充。密码应来自环境变量或密钥服务，不能写入源码。
type MySQLConfig struct {
	User     string
	Password string
	Address  string // 例如 "127.0.0.1:3307"
	Database string

	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// OpenMySQL 创建一个连接池句柄，并在返回前验证 MySQL 可达。
// 调用方只应在进程退出时关闭返回的 db。
func OpenMySQL(ctx context.Context, cfg MySQLConfig) (*sql.DB, error) {
	driverCfg := mysql.NewConfig()
	driverCfg.User = cfg.User
	driverCfg.Passwd = cfg.Password
	driverCfg.Net = "tcp"
	driverCfg.Addr = cfg.Address
	driverCfg.DBName = cfg.Database

	// MySQL 驱动默认将 DATE/DATETIME 输出为 []byte 或 string。
	// 开启后 Scan 到 time.Time 才有一致语义。
	driverCfg.ParseTime = true
	driverCfg.Loc = time.Local

	// 这是单条连接的拨号、读、写超时；不等于 SQL 查询的 context 超时。
	driverCfg.Timeout = 3 * time.Second
	driverCfg.ReadTimeout = 5 * time.Second
	driverCfg.WriteTimeout = 5 * time.Second

	// Open 通常只建立句柄并校验驱动/DSN，不会立刻拨号。
	db, err := sql.Open("mysql", driverCfg.FormatDSN())
	if err != nil {
		return nil, fmt.Errorf("open MySQL handle: %w", err)
	}

	// 以下属于 database/sql 连接池，而不是 MySQL 驱动。
	// 数值只是示例起点，应按实例数、数据库上限和压测结果调整。
	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

	// PingContext 会从池中获取或创建连接，真正验证网络、认证和服务可用性。
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close() // 失败时释放刚创建的池，避免资源泄漏。
		return nil, fmt.Errorf("ping MySQL: %w", err)
	}
	return db, nil
}
```

应用入口可以这样调用（示例省略了配置中心，只展示生命周期管理）：

```go
package main

import (
	"context"
	"log"
	"time"

	"example.com/go-mysql-data-access/data"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel() // 释放定时器资源。

	db, err := data.OpenMySQL(ctx, data.MySQLConfig{
		User:            "root",
		Password:        "rootpass",
		Address:         "127.0.0.1:3307",
		Database:        "go_tutorial",
		MaxOpenConns:    20,
		MaxIdleConns:    20,
		ConnMaxLifetime: 3 * time.Minute,
		ConnMaxIdleTime: time.Minute,
	})
	if err != nil {
		log.Fatal("initialize data layer: ", err)
	}
	defer db.Close() // 代表 main 退出；Web 服务应在优雅退出阶段执行。

	// 将 db 注入 HTTP server、repository 或 service，并在此阻塞运行服务。
}
```

MySQL 驱动建议设置连接最大生命周期，使它短于数据库、负载均衡器或网络中间件主动断开连接的时间。不要照抄某个“最佳值”：10 个实例、每实例 `MaxOpenConns=20`，最坏情况下就会消耗 200 条 MySQL 连接。

### 标准库底层发生了什么

下面是 Go 1.22 `database/sql` 源码关键路径的缩略版。它删除了锁、错误处理、健康检查和等待队列细节，只保留数据流，不应用于业务代码。

```go
// sql.Open：按名字从驱动注册表取实现，再构造 Connector。
func Open(driverName, dsn string) (*DB, error) {
	driverImpl := drivers[driverName] // 驱动的 init 调用 sql.Register 写入
	if driverCtx, ok := driverImpl.(driver.DriverContext); ok {
		connector, err := driverCtx.OpenConnector(dsn)
		if err != nil {
			return nil, err
		}
		return OpenDB(connector), nil
	}
	// 未实现 DriverContext 的旧式驱动会被 dsnConnector 包装，
	// 之后由它调用 driverImpl.Open(dsn)。
	return OpenDB(dsnConnector{dsn: dsn, driver: driverImpl}), nil
}

// OpenDB：创建池句柄并启动后台连接创建协调逻辑；此刻没有承诺已建立 TCP 连接。
func OpenDB(connector driver.Connector) *DB {
	db := &DB{connector: connector /* 还包括空闲连接和等待队列 */}
	go db.connectionOpener(context.Background())
	return db
}

// 每次 Query/Exec/Ping 均先借连接：优先空闲连接；达到上限则等待；有配额才拨号。
func (db *DB) conn(ctx context.Context) (*driverConn, error) {
	if idle := db.takeIdleConnection(); idle != nil {
		return idle, nil
	}
	if db.openCount >= db.maxOpen {
		return db.waitForConnection(ctx) // 等待也会受 ctx 取消/超时控制
	}
	return db.connector.Connect(ctx) // 此处进入 go-sql-driver/mysql
}
```

真实源码中，`Open` 会优先使用驱动的 `driver.DriverContext`，`PingContext` 和 `QueryContext` 都会通过连接池借连接。于是可以解释三个现象：

- `sql.Open` 成功但数据库不可达：它往往还未拨号，启动时用 `PingContext` 验证；
- 请求超时也可能发生在执行 SQL 前：连接数满了，调用正等待连接池；
- `Rows.Close` 会尽快归还连接：未读完结果集时，连接无法安全复用。

## 使用 `database/sql` 编写可靠的 CRUD

先定义数据类型。数据库的 `bio` 可以为 `NULL`，不能直接扫描到普通 `string`；`sql.NullString` 同时携带值和 `Valid` 标记。

```go
package data

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

var ErrUserNotFound = errors.New("user not found")

// User 对应这里的查询结果；实际项目可为不同查询定义更小的读取模型。
type User struct {
	ID        int64          `db:"id"`
	Email     string         `db:"email"`
	Name      string         `db:"name"`
	Bio       sql.NullString `db:"bio"`
	CreatedAt time.Time      `db:"created_at"`
}

type CreateUserInput struct {
	Email string
	Name  string
	Bio   *string // nil 会被驱动编码为 SQL NULL，而不是空字符串。
}
```

### 写入：`ExecContext` 与参数绑定

不返回行的 SQL 使用 `ExecContext`。占位符 `?` 只能代表**值**，不是字符串拼接模板；驱动会将参数作为值编码。

```go
// CreateUser 插入用户，返回 MySQL AUTO_INCREMENT 生成的主键。
func CreateUser(ctx context.Context, db *sql.DB, input CreateUserInput) (int64, error) {
	const insertUser = `
		INSERT INTO users (email, name, bio)
		VALUES (?, ?, ?)`

	// 三个参数按顺序绑定到三个 ?；input.Bio 为 nil 时写入 NULL。
	result, err := db.ExecContext(ctx, insertUser, input.Email, input.Name, input.Bio)
	if err != nil {
		return 0, fmt.Errorf("insert user: %w", err)
	}

	// LastInsertId 对 MySQL 自增列有效；跨数据库时必须检查目标驱动语义。
	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("get inserted user ID: %w", err)
	}
	return id, nil
}
```

### 查询一行：错误出现在 `Scan`

`QueryRowContext` 返回的 `*sql.Row` 延迟报告错误。网络错误、SQL 语法错误和没有记录，通常都要在 `Scan` 时判断。

```go
func FindUserByID(ctx context.Context, db *sql.DB, id int64) (User, error) {
	const findUser = `
		SELECT id, email, name, bio, created_at
		FROM users
		WHERE id = ?`

	var user User
	err := db.QueryRowContext(ctx, findUser, id).Scan(
		&user.ID,        // Scan 目标顺序必须与 SELECT 列顺序严格一致。
		&user.Email,
		&user.Name,
		&user.Bio,
		&user.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, ErrUserNotFound // 将存储层错误转为业务语义。
	}
	if err != nil {
		return User{}, fmt.Errorf("find user %d: %w", id, err)
	}
	return user, nil
}
```

明确列名比 `SELECT *` 更可靠：表增加字段不会悄悄改变读取接口；手写 `Scan` 时也更容易在 code review 中发现列顺序错误。

### 查询多行：关闭 `Rows`，检查 `rows.Err()`

`QueryContext` 返回的 `*sql.Rows` 持有底层连接与结果集。无论读取完成、提前返回还是扫描失败，都必须关闭；循环后还要检查 `rows.Err()`，因为读取后续网络包的错误会在那里出现。

```go
func ListUsersByPrefix(ctx context.Context, db *sql.DB, prefix string) ([]User, error) {
	const listUsers = `
		SELECT id, email, name, bio, created_at
		FROM users
		WHERE name LIKE CONCAT(?, '%')
		ORDER BY id
		LIMIT 100`

	rows, err := db.QueryContext(ctx, listUsers, prefix)
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close() // 无论何种 return 路径，都使连接尽快可复用。

	users := make([]User, 0)
	for rows.Next() {
		var user User
		if err := rows.Scan(
			&user.ID, &user.Email, &user.Name, &user.Bio, &user.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user row: %w", err)
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		// Next 返回 false 可能是正常读完，也可能是游标读取中途失败。
		return nil, fmt.Errorf("iterate user rows: %w", err)
	}
	return users, nil
}
```

### 更新：`RowsAffected` 的陷阱

`RowsAffected` 很适合写日志和指标，但在 MySQL 默认设置下，把字段更新为原值可能返回 0，即使记录存在。因此不能不加判断地将“影响行数为 0”等同于“用户不存在”。

```go
func RenameUser(ctx context.Context, db *sql.DB, id int64, name string) (int64, error) {
	result, err := db.ExecContext(ctx,
		"UPDATE users SET name = ? WHERE id = ?", name, id)
	if err != nil {
		return 0, fmt.Errorf("rename user %d: %w", id, err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("read affected rows: %w", err)
	}
	return affected, nil
}
```

## 超时、注入防护和预编译

### `context.Context` 的作用范围

服务端数据库调用应接收上游请求的 `ctx`。例如请求取消或超过 800 毫秒预算时：

```go
queryCtx, cancel := context.WithTimeout(requestCtx, 800*time.Millisecond)
defer cancel()

user, err := data.FindUserByID(queryCtx, db, userID)
```

`context` 能限制连接池等待、连接建立以及支持取消的驱动调用；是否能立即中止服务端已运行的 SQL，还取决于驱动和 MySQL。不要在已有请求链路中改用 `context.Background()`，否则会切断取消信号。

### 参数只能替代值，不能替代 SQL 结构

```go
// 错误示例：用户输入成为 SQL 文本的一部分，存在注入风险。
query := "SELECT id, name FROM users WHERE name = '" + name + "'"

// 正确：name 作为参数传递，不会成为 SQL 语法。
row := db.QueryRowContext(ctx,
	"SELECT id, name FROM users WHERE name = ?", name)
```

表名、列名和排序方向不能用 `?` 参数化。需要动态排序时，SQL 结构只能来自代码白名单：

```go
func ListUserIDsSorted(ctx context.Context, db *sql.DB, sortKey string) ([]int64, error) {
	allowed := map[string]string{
		"created": "created_at",
		"name":    "name",
	}
	column, ok := allowed[sortKey]
	if !ok {
		return nil, fmt.Errorf("unsupported sort key %q", sortKey)
	}

	// column 已由程序白名单决定，才允许作为结构拼接。
	query := fmt.Sprintf("SELECT id FROM users ORDER BY %s DESC LIMIT ?", column)
	rows, err := db.QueryContext(ctx, query, 100) // LIMIT 的值仍使用参数。
	if err != nil {
		return nil, fmt.Errorf("query sorted user IDs: %w", err)
	}
	defer rows.Close()

	ids := make([]int64, 0)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan user ID: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user IDs: %w", err)
	}
	return ids, nil
}
```

### 显式预编译的适用边界

对同一个 `*sql.DB` 长期、反复执行同一 SQL 时，可使用 `PrepareContext`。使用完必须关闭 `Stmt`；它可以跨连接使用，标准库会在需要时在新连接上准备，不要把它理解为永久绑定某一物理连接。

```go
func InsertUsers(ctx context.Context, db *sql.DB, inputs []CreateUserInput) error {
	stmt, err := db.PrepareContext(ctx,
		"INSERT INTO users (email, name, bio) VALUES (?, ?, ?)")
	if err != nil {
		return fmt.Errorf("prepare insert user: %w", err)
	}
	defer stmt.Close() // 释放各底层连接上可能准备过的语句。

	for _, input := range inputs {
		if _, err := stmt.ExecContext(ctx, input.Email, input.Name, input.Bio); err != nil {
			return fmt.Errorf("insert user %q: %w", input.Email, err)
		}
	}
	return nil
}
```

参数化本身已经能防注入，不需要为了安全而打开 MySQL 驱动的 `interpolateParams=true`。那个选项是客户端安全转义插值、减少某些预编译往返的性能策略；是否启用应基于字符集限制、观测和压测，而不是作为默认“优化”。

## 事务：同一业务操作必须使用同一个 `tx`

跨多条 SQL 保证“要么全部成功、要么全部失败”时，使用 `BeginTx`。最重要的规则是：**事务开始后，所有要保持原子性的读写都必须使用 `tx`，不能回到外层 `db`。**

转账需要同时扣款和入账。为降低相反方向转账的死锁概率，代码总按账户 ID 从小到大加锁；更复杂的系统仍应对 MySQL 死锁错误设计有限重试和幂等键。

```go
var (
	ErrInvalidTransfer   = errors.New("invalid transfer")
	ErrInsufficientFunds = errors.New("insufficient funds")
)

func Transfer(ctx context.Context, db *sql.DB, fromID, toID, amountCents int64) error {
	if fromID == toID || amountCents <= 0 {
		return ErrInvalidTransfer
	}

	// nil 表示沿用 MySQL 服务端默认隔离级别；显式设置前应先理解业务语义。
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transfer transaction: %w", err)
	}
	// Commit 成功后 Rollback 只会返回 sql.ErrTxDone，这里可安全忽略。
	// 这样任意中途 return 都不会遗留未完成事务。
	defer func() { _ = tx.Rollback() }()

	firstID, secondID := fromID, toID
	if firstID > secondID {
		firstID, secondID = secondID, firstID
	}

	balances := make(map[int64]int64, 2)
	for _, id := range []int64{firstID, secondID} {
		var balance int64
		// FOR UPDATE 只在 tx 内有意义：锁会持续到 Commit 或 Rollback。
		if err := tx.QueryRowContext(ctx,
			"SELECT balance_cents FROM accounts WHERE id = ? FOR UPDATE", id,
		).Scan(&balance); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return fmt.Errorf("account %d does not exist", id)
			}
			return fmt.Errorf("lock account %d: %w", id, err)
		}
		balances[id] = balance
	}

	if balances[fromID] < amountCents {
		return ErrInsufficientFunds // defer 会回滚，余额不会变化。
	}

	// 注意：此处必须是 tx.ExecContext，不能写成 db.ExecContext。
	if _, err := tx.ExecContext(ctx,
		"UPDATE accounts SET balance_cents = balance_cents - ? WHERE id = ?",
		amountCents, fromID,
	); err != nil {
		return fmt.Errorf("debit account %d: %w", fromID, err)
	}
	if _, err := tx.ExecContext(ctx,
		"UPDATE accounts SET balance_cents = balance_cents + ? WHERE id = ?",
		amountCents, toID,
	); err != nil {
		return fmt.Errorf("credit account %d: %w", toID, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transfer: %w", err)
	}
	return nil
}
```

事务应尽可能短。先完成参数校验和外部 HTTP 调用，再开始事务；不要持有事务连接等待用户输入或远程服务。长事务既增加锁冲突，也减少连接池可用连接数。

## 连接池观测与调优

没有通用的 `MaxOpenConns` 最佳值。先为每个实例设置上限，再通过 `DBStats`、慢查询和 MySQL 锁等待指标找瓶颈。

```go
// LogPoolStats 可由定时任务调用，并对接日志或指标系统。
func LogPoolStats(db *sql.DB, logf func(format string, args ...any)) {
	stats := db.Stats()
	logf(
		"mysql pool: open=%d in_use=%d idle=%d wait_count=%d wait_duration=%s max_open=%d",
		stats.OpenConnections, // 总连接数 = InUse + Idle
		stats.InUse,           // 查询或事务尚未归还的连接
		stats.Idle,            // 可立即复用的连接
		stats.WaitCount,       // 因达到 MaxOpenConns 而等待的累计次数
		stats.WaitDuration,    // 上述等待的累计耗时
		stats.MaxOpenConnections,
	)
}
```

`WaitCount` 持续增长时，不应立刻调大上限。先排查未关闭的 `Rows`、过长事务、慢查询和锁等待；盲目增大连接数只会把排队从应用转移到 MySQL，甚至使数据库过载。连接池是有界资源：若代码持有事务连接时又递归等待新连接，确实可能形成应用层死锁。

## 引入 sqlx：保留 SQL，减少映射样板

查询列变多时，反复写 `rows.Scan(&a, &b, ...)` 易错；插入字段多时，位置参数也难维护。sqlx 解决这些样板问题，但不会自动生成迁移、关联或 CRUD SQL。

### 包装已有连接池

已有 `*sql.DB` 时，使用 `sqlx.NewDb`。它只是包装，不会建立第二个连接池：

```go
import "github.com/jmoiron/sqlx"

func WrapSQLX(db *sql.DB) *sqlx.DB {
	// driverName 用于识别 MySQL 的 ? 占位符风格。
	return sqlx.NewDb(db, "mysql")
}
```

同一应用中，不要分别打开一个 `*sql.DB` 和一个 `*sqlx.DB` 再访问同一数据库；这会形成两套独立连接池，连接数和观测都会失真。

### `GetContext`、`SelectContext` 和流式读取

结构体的 `db` tag 使 `snake_case` 列名与 Go 字段形成显式关系。

```go
func FindUserByIDX(ctx context.Context, db *sqlx.DB, id int64) (User, error) {
	var user User
	err := db.GetContext(&user, `
		SELECT id, email, name, bio, created_at
		FROM users
		WHERE id = ?`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return User{}, ErrUserNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("find user %d: %w", id, err)
	}
	return user, nil
}

func ListUsersX(ctx context.Context, db *sqlx.DB, prefix string) ([]User, error) {
	users := make([]User, 0)
	err := db.SelectContext(&users, `
		SELECT id, email, name, bio, created_at
		FROM users
		WHERE name LIKE CONCAT(?, '%')
		ORDER BY id
		LIMIT 100`, prefix)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	return users, nil
}
```

`GetContext` 的本质是查询一行，再按结构体 tag 扫描，仍会返回 `sql.ErrNoRows`。`SelectContext` 在内部迭代、扫描并关闭结果集，适合结果集大小受控的查询。导出或批处理等大结果集则保持流式处理：

```go
func StreamUsersX(ctx context.Context, db *sqlx.DB, consume func(User) error) error {
	rows, err := db.QueryxContext(ctx,
		"SELECT id, email, name, bio, created_at FROM users ORDER BY id")
	if err != nil {
		return fmt.Errorf("query users: %w", err)
	}
	defer rows.Close() // sqlx.Rows 仍包装 database/sql.Rows，必须关闭。

	for rows.Next() {
		var user User
		if err := rows.StructScan(&user); err != nil {
			return fmt.Errorf("scan user: %w", err)
		}
		if err := consume(user); err != nil {
			return fmt.Errorf("consume user %d: %w", user.ID, err)
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate users: %w", err)
	}
	return nil
}
```

sqlx 默认会在查询列无法映射到结构体字段时报错，这是一种保护。不要用 `db.Unsafe()` 静默忽略未知列；联表查询的同名列也必须写别名：

```go
type UserOrderRow struct {
	UserID     int64  `db:"user_id"`
	UserName   string `db:"user_name"`
	OrderID    int64  `db:"order_id"`
	OrderState string `db:"order_state"`
}

const userOrdersQuery = `
	SELECT
		u.id AS user_id,
		u.name AS user_name,
		o.id AS order_id,
		o.status AS order_state
	FROM users AS u
	JOIN orders AS o ON o.user_id = u.id
	WHERE u.id = ?`
```

`SELECT u.id, o.id` 会产生两个 `id` 列，无法可靠映射；明确别名让 SQL 输出和结构体字段一一对应。

### 命名参数：提高可读性，不改变安全模型

`NamedExecContext` 将 `:email`、`:name` 解析为结构体 `db` tag 对应字段，并根据 MySQL 改写为 `?`。SQL 仍由开发者显式编写，参数仍只代表值。

```go
type CreateUserParams struct {
	Email string  `db:"email"`
	Name  string  `db:"name"`
	Bio   *string `db:"bio"`
}

func CreateUserX(ctx context.Context, db *sqlx.DB, input CreateUserParams) (int64, error) {
	result, err := db.NamedExecContext(ctx, `
		INSERT INTO users (email, name, bio)
		VALUES (:email, :name, :bio)`, input)
	if err != nil {
		return 0, fmt.Errorf("insert user: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("get inserted user ID: %w", err)
	}
	return id, nil
}
```

```text
INSERT ... VALUES (:email, :name, :bio)
                 │
                 ▼  sqlx 读取 db tag、组装参数、按 mysql 规则 Rebind
INSERT ... VALUES (?, ?, ?)
args = [input.Email, input.Name, input.Bio]
                 │
                 ▼
database/sql 与 MySQL 驱动执行
```

### `IN` 切片必须显式展开

一个占位符只能绑定一个值，`[]int64{1, 2, 3}` 不能直接用于 `IN (?)`。使用 `sqlx.In` 展开，再 `Rebind` 适配当前驱动：

```go
func FindUsersByIDs(ctx context.Context, db *sqlx.DB, ids []int64) ([]User, error) {
	if len(ids) == 0 {
		return []User{}, nil // 避免生成语法错误的 IN ()。
	}

	query, args, err := sqlx.In(`
		SELECT id, email, name, bio, created_at
		FROM users
		WHERE id IN (?)
		ORDER BY id`, ids)
	if err != nil {
		return nil, fmt.Errorf("expand IN arguments: %w", err)
	}
	// MySQL 基本保持 ?；PostgreSQL 等驱动会被改写为 $1、$2……
	query = db.Rebind(query)

	users := make([]User, 0)
	if err := db.SelectContext(ctx, &users, query, args...); err != nil {
		return nil, fmt.Errorf("find users by IDs: %w", err)
	}
	return users, nil
}
```

### sqlx 事务仍然遵循标准库规则

`BeginTxx` 返回的 `*sqlx.Tx` 内嵌 `*sql.Tx`，只多了 `GetContext`、`SelectContext`、`NamedExecContext` 等便利方法。事务内 SQL 仍然只能走 `tx`：

```go
func DeleteUserWithArchive(ctx context.Context, db *sqlx.DB, id int64) error {
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin archive transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	var user User
	if err := tx.GetContext(ctx, &user,
		"SELECT id, email, name, bio, created_at FROM users WHERE id = ? FOR UPDATE", id,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("lock user: %w", err)
	}

	// 假设已有 user_archives 表；map 的键与命名参数对应。
	if _, err := tx.NamedExecContext(ctx, `
		INSERT INTO user_archives (user_id, email, archived_at)
		VALUES (:user_id, :email, NOW(3))`, map[string]any{
		"user_id": user.ID,
		"email":   user.Email,
	}); err != nil {
		return fmt.Errorf("archive user: %w", err)
	}
	if _, err := tx.ExecContext(ctx, "DELETE FROM users WHERE id = ?", id); err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	return tx.Commit()
}
```

## 如何选择

sqlx 建立在 `database/sql` 上，两者不是互斥的协议栈。选择重点是代码表达方式，而不是“谁更底层”。

| 维度 | `database/sql` | sqlx |
| --- | --- | --- |
| SQL | 手写、完全可见 | 手写、完全可见 |
| 连接池、事务、Context | 标准库原生提供 | 直接复用标准库能力 |
| 结果映射 | 手写 `Scan` | `Get`、`Select`、`StructScan` |
| 参数绑定 | 位置参数 | 位置参数、命名参数、`IN` 展开 |
| 反射 | 不需要 | 结构体映射时需要 |
| 适合场景 | 列少、要精细控制扫描、依赖最少 | 大量手写 SQL、列较多、希望减少样板 |

GORM 属于另一条 ORM 路线：它会围绕模型提供查询构造、关联和迁移等更高层能力。无论是否使用 GORM，理解这里的连接池、Context、驱动和事务边界都是必要基础。

## 上线前检查清单

- 全进程复用一个 `*sql.DB` 或由它包装的 `*sqlx.DB`，不在请求路径反复 `Open`。
- 所有数据库操作使用带 Context 的 API；不要切断上游请求取消链路。
- 每个 `QueryContext` / `QueryxContext` 都关闭 `Rows`，并在迭代后检查 `rows.Err()`。
- 所有值都使用占位符；动态列名、排序和表名仅从代码白名单选择。
- 事务内不使用外层 `db`；事务短小、锁顺序稳定，并为死锁重试设计幂等性。
- MySQL DSN 按需设置 `parseTime=true`、连接/读/写超时和 TLS；密码不提交到仓库。
- 通过 `DBStats`、慢查询和锁等待调连接池，不照搬固定数值。
- sqlx 查询显式列出字段，使用 `db` tag 与联表别名，不用 `Unsafe()` 掩盖映射错误。

## 总结

Go 访问 MySQL 的关键是一条清晰的协作链：驱动注册并实现 MySQL 协议，`database/sql` 管理连接池、事务、资源和统一 API，sqlx 在其上增加结构体映射与参数绑定便利。

掌握 `database/sql` 后，sqlx 的行为就不再神秘：`GetContext` 仍返回 `sql.ErrNoRows`，`sqlx.DB` 仍共享标准库连接池，`sqlx.Tx` 仍必须遵守事务边界。SQL 依旧决定性能与正确性；连接生命周期、超时、资源关闭和锁边界，则决定这些 SQL 能否在真实并发下稳定运行。

## 参考资料

- [Go 官方：访问关系型数据库](https://go.dev/doc/database/)
- [Go 官方：打开数据库句柄与连接池](https://go.dev/doc/database/open-handle)
- [Go 标准库 database/sql 源码](https://go.dev/src/database/sql/sql.go)
- [go-sql-driver/mysql：DSN、时间解析、连接池与超时](https://github.com/go-sql-driver/mysql)
- [sqlx 项目文档](https://github.com/jmoiron/sqlx)
- [sqlx 使用说明：结构体扫描、命名参数与 IN 查询](https://jmoiron.github.io/sqlx/)
