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

假设要实现一个极小的商品下单服务：用户购买商品时，程序先检查库存，再扣库存，接着创建订单和订单明细。任何一步失败，前面的修改都不应留下。

这个场景足够小，却正好覆盖 Go 访问 MySQL 的关键问题：连接从哪里来、查询怎样映射、何时释放资源、怎样避免超卖、事务怎样保证一致性，以及 sqlx 到底节省了什么。

先让完整 Demo 跑起来，再解释刚刚实际用到的机制。Demo 的第一版只用标准库 `database/sql`；随后把同一段代码改成 sqlx。这样不会停留在 API 名字上，也能看清 sqlx 改变和没有改变的边界。

## 三个库的关系

```text
业务代码
   │  QueryContext / ExecContext / BeginTx
   ▼
database/sql
   │  统一 API、连接池、事务、通用参数转换
   ▼
database/sql/driver 接口
   │
   ▼
go-sql-driver/mysql
   │  MySQL 协议、认证、网络 I/O、结果解码
   ▼
MySQL Server

sqlx 位于业务代码和 database/sql 之间：
sqlx.DB 内嵌 *sql.DB，复用连接池和驱动，只增加映射与绑定能力。
```

- `database/sql` 是标准库，不会说 MySQL 协议，也没有内置 MySQL 驱动。
- `github.com/go-sql-driver/mysql` 是驱动，实现标准库的 driver 接口并和 MySQL 通信。
- sqlx 是 `database/sql` 的轻量扩展，不是驱动，也不是自动生成 SQL 的 ORM。SQL 仍由程序明确写出。

## 运行 Demo

### 1. 启动 MySQL 并初始化项目

```bash
# 容器的 3306 映射到宿主机 3307，避免与本机 MySQL 冲突。
docker run --name go-store-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=go_store \
  -p 3307:3306 \
  -d mysql:8.4

mkdir go-mysql-store
cd go-mysql-store
go mod init example.com/go-mysql-store
go get github.com/go-sql-driver/mysql
go get github.com/jmoiron/sqlx
```

目录结构：

```text
go-mysql-store/
├── cmd/demo/main.go
├── internal/store/mysql.go
├── internal/store/product.go
├── internal/store/order.go
└── schema.sql
```

### 2. 创建表

把以下内容保存为 `schema.sql`，执行 `mysql -h 127.0.0.1 -P 3307 -uroot -prootpass go_store < schema.sql`。

```sql
-- 金额用分保存为整数；商品之后调价也不能修改订单成交价。
CREATE TABLE products (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sku         VARCHAR(64) NOT NULL,
    name        VARCHAR(128) NOT NULL,
    price_cents BIGINT UNSIGNED NOT NULL,
    stock       BIGINT UNSIGNED NOT NULL,
    created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_products_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    customer_id        BIGINT UNSIGNED NOT NULL,
    status             VARCHAR(32) NOT NULL,
    total_amount_cents BIGINT UNSIGNED NOT NULL,
    created_at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id         BIGINT UNSIGNED NOT NULL,
    product_id       BIGINT UNSIGNED NOT NULL,
    quantity         BIGINT UNSIGNED NOT NULL,
    unit_price_cents BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    KEY idx_order_items_order_id (order_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 第一版：只使用 database/sql

### 3. 创建连接池

保存为 `internal/store/mysql.go`。这是整个程序唯一创建数据库句柄的地方。

```go
package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	mysql "github.com/go-sql-driver/mysql"
)

// MySQLConfig 从环境变量、配置中心或密钥服务填充，密码不能写进源码。
type MySQLConfig struct {
	User     string
	Password string
	Address  string // 例如 "127.0.0.1:3307"
	Database string
}

// OpenMySQL 返回连接池句柄，不是某条单独的 TCP 连接。
// 程序启动时创建一次；进程退出时才关闭。
func OpenMySQL(ctx context.Context, cfg MySQLConfig) (*sql.DB, error) {
	// 用驱动 Config 生成 DSN，避免密码、时区等包含特殊字符时手拼出错。
	driverCfg := mysql.NewConfig()
	driverCfg.User = cfg.User
	driverCfg.Passwd = cfg.Password
	driverCfg.Net = "tcp"
	driverCfg.Addr = cfg.Address
	driverCfg.DBName = cfg.Database

	// 开启后，MySQL DATE/DATETIME 才能稳定扫描到 Go 的 time.Time。
	driverCfg.ParseTime = true
	driverCfg.Loc = time.Local

	// 这些限制的是单条物理连接的拨号、读、写，不等于查询 ctx 的超时。
	driverCfg.Timeout = 3 * time.Second
	driverCfg.ReadTimeout = 5 * time.Second
	driverCfg.WriteTimeout = 5 * time.Second

	// Open 往往只创建池句柄，此时不保证已经连接上 MySQL。
	db, err := sql.Open("mysql", driverCfg.FormatDSN())
	if err != nil {
		return nil, fmt.Errorf("open MySQL handle: %w", err)
	}

	// 每个应用实例最多打开 20 条连接；这些值要按实例数和 MySQL 上限调节。
	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(20)
	db.SetConnMaxLifetime(3 * time.Minute)
	db.SetConnMaxIdleTime(time.Minute)

	// PingContext 会真实借用或创建连接，因此能尽早发现网络和认证错误。
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close() // 初始化失败时不把半可用的池交给调用者。
		return nil, fmt.Errorf("ping MySQL: %w", err)
	}
	return db, nil
}
```

`sql.DB` 是并发安全的连接池。不要在每个 HTTP 请求或每个 repository 方法中 `sql.Open`；那是在不断创建新连接池。10 个实例都设置 `MaxOpenConns=20` 时，MySQL 最坏要承受 200 条连接。

### 4. 商品 CRUD：写入、一行查询、多行查询

保存为 `internal/store/product.go`。

```go
package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

var ErrProductNotFound = errors.New("product not found")

// db tag 暂时不被 database/sql 使用；保留它是为了后面切换 sqlx。
type Product struct {
	ID         int64     `db:"id"`
	SKU        string    `db:"sku"`
	Name       string    `db:"name"`
	PriceCents int64     `db:"price_cents"`
	Stock      int64     `db:"stock"`
	CreatedAt  time.Time `db:"created_at"`
}

type CreateProductInput struct {
	SKU        string
	Name       string
	PriceCents int64
	Stock      int64
}

func CreateProduct(ctx context.Context, db *sql.DB, input CreateProductInput) (Product, error) {
	if input.SKU == "" || input.Name == "" || input.PriceCents < 0 || input.Stock < 0 {
		return Product{}, fmt.Errorf("invalid product input")
	}

	result, err := db.ExecContext(ctx, `
		INSERT INTO products (sku, name, price_cents, stock)
		VALUES (?, ?, ?, ?)`,
		input.SKU,        // 每个 ? 只绑定一个“值”，绝不把参数当作 SQL 语法。
		input.Name,
		input.PriceCents,
		input.Stock,
	)
	if err != nil {
		return Product{}, fmt.Errorf("insert product: %w", err)
	}
	id, err := result.LastInsertId() // MySQL AUTO_INCREMENT 生成的主键。
	if err != nil {
		return Product{}, fmt.Errorf("read inserted product ID: %w", err)
	}
	return GetProduct(ctx, db, id) // 读回完整数据，返回统一的 Product 形态。
}

// QueryRowContext 的错误在 Scan 时才报告，因此必须检查 Scan 的返回值。
func GetProduct(ctx context.Context, db *sql.DB, id int64) (Product, error) {
	var product Product
	err := db.QueryRowContext(ctx, `
		SELECT id, sku, name, price_cents, stock, created_at
		FROM products WHERE id = ?`, id,
	).Scan(
		&product.ID,         // Scan 目标的顺序必须和 SELECT 列的顺序一致。
		&product.SKU,
		&product.Name,
		&product.PriceCents,
		&product.Stock,
		&product.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Product{}, ErrProductNotFound
	}
	if err != nil {
		return Product{}, fmt.Errorf("get product %d: %w", id, err)
	}
	return product, nil
}

func ListProducts(ctx context.Context, db *sql.DB) ([]Product, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, sku, name, price_cents, stock, created_at
		FROM products ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	// Rows 持有连接和结果集；无论正常结束还是提前 return 都必须关闭。
	defer rows.Close()

	products := make([]Product, 0)
	for rows.Next() {
		var product Product
		if err := rows.Scan(
			&product.ID, &product.SKU, &product.Name,
			&product.PriceCents, &product.Stock, &product.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan product row: %w", err)
		}
		products = append(products, product)
	}
	// Next 返回 false 既可能是读完，也可能是网络或解码错误。
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate product rows: %w", err)
	}
	return products, nil
}
```

这三个函数已经给出常用模式：

- 不返回结果集的语句使用 `ExecContext`；
- 一行使用 `QueryRowContext(...).Scan(...)`，通过 `sql.ErrNoRows` 区分未找到；
- 多行使用 `QueryContext`，立即 `defer rows.Close()`，循环后检查 `rows.Err()`；
- 不拼接用户输入。占位符只能绑定值，表名、列名和排序方向只能来自代码白名单。

### 5. 下单事务：避免扣了库存却没有订单

保存为 `internal/store/order.go`。事务内每一条 SQL 都通过 `tx` 执行，而不是外层 `db`。

```go
package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var (
	ErrInvalidOrder      = errors.New("invalid order")
	ErrInsufficientStock = errors.New("insufficient stock")
)

type PlaceOrderInput struct {
	CustomerID int64
	ProductID  int64
	Quantity   int64
}

// PlaceOrder 将锁库存、扣库存、创建订单、写订单项放入同一原子边界。
func PlaceOrder(ctx context.Context, db *sql.DB, input PlaceOrderInput) (int64, error) {
	if input.CustomerID <= 0 || input.ProductID <= 0 || input.Quantity <= 0 {
		return 0, ErrInvalidOrder
	}

	// tx 在 Commit 或 Rollback 前会独占连接池中的一条连接。
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("begin order transaction: %w", err)
	}
	// Commit 成功后 Rollback 返回 sql.ErrTxDone，可安全忽略。
	// 任意中途 return 都会触发回滚。
	defer func() { _ = tx.Rollback() }()

	var priceCents, stock int64
	err = tx.QueryRowContext(ctx, `
		SELECT price_cents, stock
		FROM products WHERE id = ?
		FOR UPDATE`, input.ProductID,
	).Scan(&priceCents, &stock)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrProductNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("lock product %d: %w", input.ProductID, err)
	}
	if stock < input.Quantity {
		return 0, ErrInsufficientStock
	}

	// FOR UPDATE 已经锁行；stock >= ? 再提供一层防御，并让结果可检查。
	result, err := tx.ExecContext(ctx, `
		UPDATE products SET stock = stock - ?
		WHERE id = ? AND stock >= ?`,
		input.Quantity, input.ProductID, input.Quantity,
	)
	if err != nil {
		return 0, fmt.Errorf("decrease stock: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("read stock update result: %w", err)
	}
	if affected != 1 {
		return 0, ErrInsufficientStock
	}

	// 真实系统需要根据业务上限检查 priceCents * Quantity 溢出。
	total := priceCents * input.Quantity
	orderResult, err := tx.ExecContext(ctx, `
		INSERT INTO orders (customer_id, status, total_amount_cents)
		VALUES (?, 'created', ?)`, input.CustomerID, total)
	if err != nil {
		return 0, fmt.Errorf("insert order: %w", err)
	}
	orderID, err := orderResult.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("read inserted order ID: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
		VALUES (?, ?, ?, ?)`,
		orderID, input.ProductID, input.Quantity, priceCents,
	); err != nil {
		return 0, fmt.Errorf("insert order item: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit order transaction: %w", err)
	}
	return orderID, nil
}
```

```text
BeginTx
  ├─ SELECT ... FOR UPDATE：锁住商品行
  ├─ UPDATE products：扣库存
  ├─ INSERT orders：创建订单头
  └─ INSERT order_items：写入成交单价和数量
Commit

任一步失败 → defer Rollback → 前面的写入全部撤销
```

不要在事务中调用第三方 HTTP、等待用户输入或做无关慢操作。事务越长，锁等待和连接池压力越大。

### 6. 运行入口

保存为 `cmd/demo/main.go`。每次运行使用唯一 SKU，可重复执行。

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"example.com/go-mysql-store/internal/store"
)

func main() {
	// 整个 Demo 只有 10 秒预算。HTTP 服务应使用请求传入的 Context。
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := store.OpenMySQL(ctx, store.MySQLConfig{
		User:     getenv("MYSQL_USER", "root"),
		Password: getenv("MYSQL_PASSWORD", "rootpass"),
		Address:  getenv("MYSQL_ADDRESS", "127.0.0.1:3307"),
		Database: getenv("MYSQL_DATABASE", "go_store"),
	})
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close() // 只在程序退出时关闭连接池。

	product, err := store.CreateProduct(ctx, db, store.CreateProductInput{
		SKU:        fmt.Sprintf("keyboard-%d", time.Now().UnixNano()),
		Name:       "机械键盘",
		PriceCents: 39900, // 399.00 元
		Stock:      10,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("创建商品: id=%d, stock=%d\n", product.ID, product.Stock)

	orderID, err := store.PlaceOrder(ctx, db, store.PlaceOrderInput{
		CustomerID: 10001,
		ProductID:  product.ID,
		Quantity:   2,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("下单成功: order_id=%d\n", orderID)

	updated, err := store.GetProduct(ctx, db, product.ID)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("下单后库存: %d\n", updated.Stock) // 输出应为 8。
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
```

```bash
go run ./cmd/demo
# 创建商品: id=1, stock=10
# 下单成功: order_id=1
# 下单后库存: 8
```

## 看懂已经用到的底层原理

### 驱动注册、Open 和 Ping

MySQL 驱动初始化时的关键源码只有一行：

```go
func init() {
	// "mysql" 是驱动注册名，不是数据库名。
	sql.Register("mysql", &MySQLDriver{})
}
```

因此 `sql.Open("mysql", dsn)` 才能按名字找到驱动。若代码只需注册、不使用驱动导出的 `Config`，可采用空白导入：

```go
import _ "github.com/go-sql-driver/mysql"
```

下面是 Go 标准库 `database/sql` 的核心路径缩略版。锁、统计和错误分支被省略，只保留实际的调用关系：

```go
func Open(driverName, dsn string) (*DB, error) {
	driverImpl := drivers[driverName] // 来自驱动 init 中的 sql.Register
	if driverCtx, ok := driverImpl.(driver.DriverContext); ok {
		connector, err := driverCtx.OpenConnector(dsn)
		if err != nil {
			return nil, err
		}
		return OpenDB(connector), nil
	}
	return OpenDB(dsnConnector{dsn: dsn, driver: driverImpl}), nil
}

func OpenDB(connector driver.Connector) *DB {
	db := &DB{connector: connector /* 空闲连接和等待队列也在 DB 中 */}
	go db.connectionOpener(context.Background())
	return db
}

func (db *DB) conn(ctx context.Context) (*driverConn, error) {
	if idle := db.takeIdleConnection(); idle != nil {
		return idle, nil // 先复用空闲连接
	}
	if db.openCount >= db.maxOpen {
		return db.waitForConnection(ctx) // 上限已满时等待，ctx 可取消
	}
	return db.connector.Connect(ctx) // 此处才由 MySQL 驱动拨号、认证
}
```

这解释了三个常见现象：

| 代码 | 实际含义 |
| --- | --- |
| `sql.Open` | 创建连接池句柄，通常还没有建立 TCP 连接。 |
| `PingContext` | 借连接并验证网络、认证和 MySQL 服务真实可用。 |
| `rows.Close` | 释放结果集，使其占用的连接可以回到池中。 |

`context.Context` 同时限制池等待、连接建立和支持取消的数据库调用。它不是立刻终止任何 SQL 的魔法按钮，取消效果也取决于驱动和 MySQL；但改用 `context.Background()` 会直接切断请求取消链路。

### 用指标调连接池

```go
// 由定时任务调用并接入日志或监控。
func LogPoolStats(db *sql.DB, logf func(format string, args ...any)) {
	stats := db.Stats()
	logf(
		"mysql pool: open=%d in_use=%d idle=%d wait_count=%d wait_duration=%s",
		stats.OpenConnections, // 总连接数 = InUse + Idle
		stats.InUse,           // 查询或事务尚未归还的连接
		stats.Idle,            // 可立即复用的连接
		stats.WaitCount,       // 因 MaxOpenConns 而等待的累计次数
		stats.WaitDuration,    // 上述等待的累计耗时
	)
}
```

`WaitCount` 持续增长时，先找未关闭的 `Rows`、长事务、慢查询和锁等待。盲目增大连接数往往只是把排队从应用移到 MySQL。

## 用 sqlx 重构同一个 Demo

先掌握了手写 `Scan`，才能知道 sqlx 的价值：SQL、连接池和事务都不变；它主要减少列映射和长位置参数的样板。

### 1. 包装已有连接池

```go
import "github.com/jmoiron/sqlx"

func NewSQLX(db *sql.DB) *sqlx.DB {
	// 只包一层，不创建第二个连接池；driverName 告诉 sqlx MySQL 使用 ?。
	return sqlx.NewDb(db, "mysql")
}
```

不要对同一个数据库同时单独 `sql.Open` 和 `sqlx.Open`。两次 Open 会得到两套独立的连接池，连接数和限额都会翻倍。

### 2. 用结构体映射替换 Scan

```go
package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/jmoiron/sqlx"
)

func GetProductX(ctx context.Context, db *sqlx.DB, id int64) (Product, error) {
	var product Product
	// GetContext 仍执行一行查询，只是根据 Product 的 db tag 自动映射列。
	err := db.GetContext(&product, `
		SELECT id, sku, name, price_cents, stock, created_at
		FROM products WHERE id = ?`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return Product{}, ErrProductNotFound
	}
	if err != nil {
		return Product{}, fmt.Errorf("get product %d: %w", id, err)
	}
	return product, nil
}

func ListProductsX(ctx context.Context, db *sqlx.DB) ([]Product, error) {
	products := make([]Product, 0)
	// SelectContext 会迭代、映射并关闭 Rows，适用于结果集大小受控的列表。
	if err := db.SelectContext(&products, `
		SELECT id, sku, name, price_cents, stock, created_at
		FROM products ORDER BY id`); err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	return products, nil
}
```

联表时必须为同名列取别名，不能让 sqlx 猜测两个 `id` 应放在哪里：

```sql
SELECT o.id AS order_id, p.id AS product_id, p.name AS product_name
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products AS p ON p.id = oi.product_id;
```

不要使用 `db.Unsafe()` 静默忽略找不到字段的列。列别名或 tag 写错时，报错比悄悄丢数据更安全。

### 3. 用命名参数和 IN 查询

```go
type CreateProductParams struct {
	SKU        string `db:"sku"`
	Name       string `db:"name"`
	PriceCents int64  `db:"price_cents"`
	Stock      int64  `db:"stock"`
}

func CreateProductX(ctx context.Context, db *sqlx.DB, input CreateProductParams) (int64, error) {
	result, err := db.NamedExecContext(ctx, `
		INSERT INTO products (sku, name, price_cents, stock)
		VALUES (:sku, :name, :price_cents, :stock)`, input)
	if err != nil {
		return 0, fmt.Errorf("insert product: %w", err)
	}
	return result.LastInsertId()
}

func GetProductsByIDsX(ctx context.Context, db *sqlx.DB, ids []int64) ([]Product, error) {
	if len(ids) == 0 {
		return []Product{}, nil // 避免生成 MySQL 不接受的 IN ()。
	}
	query, args, err := sqlx.In(`
		SELECT id, sku, name, price_cents, stock, created_at
		FROM products WHERE id IN (?) ORDER BY id`, ids)
	if err != nil {
		return nil, fmt.Errorf("expand IN: %w", err)
	}
	query = db.Rebind(query) // MySQL 保持 ?；PostgreSQL 会改成 $1、$2……

	products := make([]Product, 0)
	if err := db.SelectContext(ctx, &products, query, args...); err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	return products, nil
}
```

命名参数会变为 MySQL 可执行的形式：

```text
VALUES (:sku, :name, :price_cents, :stock)
                 │  sqlx 根据 db tag 取值并重写
                 ▼
VALUES (?, ?, ?, ?)
args = [input.SKU, input.Name, input.PriceCents, input.Stock]
```

命名参数依旧只能绑定值，不能绑定表名、列名和排序方向。

### 4. sqlx 的事务没有新规则

下列函数只抽出下单中的“锁定并扣库存”步骤，用于对照标准库版本。它特别说明两点：先判断 `BeginTxx` 的错误再安排回滚；写入依然必须通过 `tx`。

```go
func LockAndDecreaseStockX(ctx context.Context, db *sqlx.DB, input PlaceOrderInput) error {
	// *sqlx.Tx 内嵌 *sql.Tx，仍然绑定连接池中的一条连接。
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin stock transaction: %w", err)
	}
	// Commit 成功后这里的 Rollback 返回 sql.ErrTxDone；忽略即可。
	defer func() { _ = tx.Rollback() }()

	var locked struct {
		PriceCents int64 `db:"price_cents"`
		Stock      int64 `db:"stock"`
	}
	// GetContext 只是把 QueryRowContext(...).Scan(...) 换成 db tag 映射；
	// FOR UPDATE 的锁语义和 MySQL 事务语义完全没变。
	if err := tx.GetContext(ctx, &locked,
		"SELECT price_cents, stock FROM products WHERE id = ? FOR UPDATE", input.ProductID,
	); err != nil {
		return fmt.Errorf("lock product: %w", err)
	}
	if locked.Stock < input.Quantity {
		return ErrInsufficientStock
	}

	// 写入仍必须通过 tx，不能改回外层 db。
	result, err := tx.NamedExecContext(ctx, `
		UPDATE products SET stock = stock - :quantity
		WHERE id = :product_id AND stock >= :quantity`, map[string]any{
		"product_id": input.ProductID,
		"quantity":   input.Quantity,
	})
	if err != nil {
		return fmt.Errorf("decrease stock: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read update result: %w", err)
	}
	if affected != 1 {
		return ErrInsufficientStock
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit stock transaction: %w", err)
	}
	return nil
}
```

sqlx 的 `GetContext` 源码揭示了它的边界：

```go
func GetContext(ctx context.Context, q QueryerContext, dest interface{},
	query string, args ...interface{}) error {
	r := q.QueryRowxContext(ctx, query, args...) // 仍从底层发起单行查询
	return r.scanAny(dest, false)                // 只将手写 Scan 换成结构体映射
}
```

它不会替你开启事务、选择隔离级别或解决超卖；这些仍由 SQL、锁和 `database/sql` 事务边界决定。

## 排错与选择

| 现象或需求 | 优先检查或选择 |
| --- | --- |
| `sql: unknown driver "mysql"` | 驱动没有导入，或注册名不是 `mysql`。 |
| Open 成功但 Ping 失败 | DSN、网络、账号密码或 MySQL 服务状态。 |
| 连接池等待增长 | `Rows.Close`、长事务、慢查询、锁等待。 |
| sqlx 映射失败 | SELECT 列、AS 别名和 `db` tag。 |
| 事务“不生效” | 是否有 SQL 误用了外层 `db` 而非 `tx`。 |
| 少量字段、需精细扫描 | 直接使用 `database/sql`。 |
| 大量手写 SQL、字段较多 | 在 `database/sql` 基础上使用 sqlx。 |

## 总结

这个 Demo 先跑通了完整的“创建商品 → 锁库存 → 下单 → 读取库存”流程，再把每个动作放回正确层次：驱动实现 MySQL 协议，`database/sql` 管理连接池、资源与事务，sqlx 仅减少结构体映射和参数绑定的重复代码。

`sql.Open` 创建的是池句柄，`PingContext` 验证真实连接，`Rows.Close` 归还资源，`BeginTx` 将多条 SQL 绑定在同一原子边界。理解这些基础后，sqlx 的 `GetContext`、`NamedExecContext` 和 `sqlx.In` 就只是更易读的表达，而不是另一套神秘机制。

## 参考资料

- [Go 官方：访问关系型数据库](https://go.dev/doc/database/)
- [Go 官方：打开数据库句柄与连接池](https://go.dev/doc/database/open-handle)
- [Go 标准库 database/sql 源码](https://go.dev/src/database/sql/sql.go)
- [go-sql-driver/mysql：DSN、时间解析、连接池与超时](https://github.com/go-sql-driver/mysql)
- [sqlx 项目文档](https://github.com/jmoiron/sqlx)
- [sqlx 使用说明](https://jmoiron.github.io/sqlx/)
