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

Go 访问 MySQL 时，最容易形成一个错误印象：导入驱动、调用 `Query`，数据库访问就结束了。实际上，一次可靠的数据访问同时包含四件事：正确表达 SQL、管理连接、处理资源与错误、在需要时保证多个写入的一致性。

下面使用一个完整的商品下单场景说明这些问题。用户购买两件商品时，程序必须完成：读取并锁定库存、扣减库存、创建订单、写入订单项。它们不能只成功一部分；并发请求也不能把库存扣成负数。

配套代码位于 [gocode-examples/go/01-database-sql-demo](https://github.com/zzxrepository/gocode-examples/tree/2d147d72f1ca7144eb001c18e8bbe75c3b18578f/go/01-database-sql-demo)。链接固定到源码提交，文中的函数、表结构和命令均可在该项目中直接运行和核对。

`database/sql` 是 Go 标准库的通用数据访问与连接池模型；`go-sql-driver/mysql` 是实现 MySQL 协议的驱动；`sqlx` 则是在 `database/sql` 之上减少映射和参数绑定样板代码的工具。三者是叠加关系，而不是三种互相替代的方案。

## 阅读结构

内容按照实际开发中的因果顺序展开：先建立 SQL 和数据模型，再使用标准库完成读写；在已经理解 API 的基础上解释事务、连接池和驱动调用链；最后再引入 `sqlx`，这样能清楚知道它简化了什么、没有替代什么。

| 部分 | 要解决的问题 | 核心对象 |
| --- | --- | --- |
| 数据模型与 SQL | 数据如何保存，CRUD 分别是什么 | `products`、`orders`、`order_items` |
| 三层关系 | 标准库、驱动、sqlx 各负责什么 | `database/sql`、MySQL driver、`sqlx` |
| 建立连接 | 如何创建一个可复用的连接池 | `sql.Open`、`PingContext`、`*sql.DB` |
| 标准库 CRUD | 如何插入、查询、更新、删除 | `ExecContext`、`QueryRowContext`、`Rows` |
| 事务下单 | 如何避免部分写入与超卖 | `Tx`、`FOR UPDATE`、`Commit` |
| 底层机制 | 连接从哪里来、何时归还 | `sql.Register`、`Connector`、`DB.conn` |
| sqlx | 如何减少结构体扫描和长参数列表 | `GetContext`、`NamedExecContext`、`sqlx.In` |

下单的业务主线如下：

~~~text
创建商品
  → 查询并更新商品
  → 开始事务
  → 锁定商品库存
  → 扣减库存
  → 创建订单
  → 写入订单项
  → 提交事务

任一步失败 → 回滚事务 → 已完成的库存和订单写入全部撤销
~~~

## 从数据模型开始：SQL 在解决什么问题

关系型数据库把业务事实保存为行和表。表不是 Go 结构体的简单镜像：主键、唯一索引、外键和存储引擎都在表达业务约束。示例的表结构如下：

~~~sql
-- 金额使用“分”保存为整数，避免浮点金额累积误差。
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
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
~~~

几个字段的作用不是装饰：

- `AUTO_INCREMENT` 让 MySQL 为每次插入生成主键，Go 可通过 `LastInsertId` 取得它；
- SKU 的唯一索引拒绝重复商品；
- 订单项保存 `unit_price_cents`，商品后来调价不会修改历史成交价；
- `InnoDB` 提供事务、外键和行锁；
- 商品的主键索引使 `WHERE id = ? FOR UPDATE` 能精准锁定目标记录。

SQL 常被按用途分为四类：

| 类别 | 代表语句 | 在案例中的用途 |
| --- | --- | --- |
| DDL | `CREATE`、`ALTER`、`DROP` | 定义表、索引和约束 |
| DML | `INSERT`、`UPDATE`、`DELETE` | 创建商品、扣减库存、删除临时商品 |
| DQL | `SELECT` | 查询商品与锁定库存 |
| TCL | `COMMIT`、`ROLLBACK` | 提交或撤销一组写入 |

CRUD 是最常见的 DML/DQL 组合：Create 对应 `INSERT`，Read 对应 `SELECT`，Update 对应 `UPDATE`，Delete 对应 `DELETE`。真正的困难不在于记住这四个关键字，而在于明确 SQL 的数据边界和错误边界。

### 参数化查询是 SQL 的安全边界

MySQL 驱动使用 `?` 表示一个**值**。SQL 模板与参数值分开传递，驱动会按类型编码参数，因此输入不会变成 SQL 语法：

~~~go
// 正确：sku 是数据，不会被当作 SQL 片段执行。
row := db.QueryRowContext(ctx, `
	SELECT id, sku, name, price_cents, stock, created_at
	FROM products
	WHERE sku = ?`, sku)

// 错误：sku 成为 SQL 文本的一部分，外部输入可能改变 WHERE 条件。
query := "SELECT id, sku FROM products WHERE sku = '" + sku + "'"
~~~

下面几种写法都不是参数化查询，即使使用了 `fmt.Sprintf`：

~~~go
query := "SELECT * FROM products WHERE sku = '" + sku + "'"
query := fmt.Sprintf("SELECT * FROM products WHERE sku = '%s'", sku)
query := "DELETE FROM products WHERE id = " + requestID
~~~

占位符只能代表值，不能代表表名、列名、排序方向或 SQL 表达式。动态排序必须先从白名单选择 SQL 结构，分页大小仍然通过参数绑定：

~~~go
columns := map[string]string{
	"created_at": "created_at",
	"price":      "price_cents",
	"stock":      "stock",
}
column, ok := columns[requestSort]
if !ok {
	column = "created_at" // 不认识的输入回退到固定列。
}

directions := map[string]string{"asc": "ASC", "desc": "DESC"}
direction, ok := directions[requestDirection]
if !ok {
	direction = "DESC"
}

// 只有白名单中的列名和方向参与字符串格式化；pageSize 始终作为值绑定。
query := fmt.Sprintf(`
	SELECT id, sku, name, price_cents, stock, created_at
	FROM products
	ORDER BY %s %s
	LIMIT ?`, column, direction)
rows, err := db.QueryContext(ctx, query, pageSize)
~~~

输入校验、参数化查询和数据库最小权限分别解决不同问题：输入校验保证数量、分页等符合业务规则；参数化查询保证输入不能改变 SQL 结构；最小权限限制即使应用出错后可造成的影响。三者都不能省略。

## 运行贯穿全文的 Demo

项目提供两个命令入口：一个只使用 `database/sql`，另一个使用 `sqlx` 表达同一条业务链。它们使用同一个 MySQL 容器和同一套表结构。

~~~text
01-database-sql-demo/
├── cmd/database-sql-demo/main.go  标准库入口
├── cmd/sqlx-demo/main.go          sqlx 入口
├── internal/store/mysql.go        驱动配置与连接池
├── internal/store/product.go      标准库 CRUD
├── internal/store/order.go        标准库事务下单
├── internal/store/sqlx.go         sqlx CRUD 与事务下单
├── scripts/docker-compose.yml     MySQL 8.4 容器
└── scripts/schema.sql             初始化表结构
~~~

在示例目录运行：

~~~bash
cd /Users/mmzhang/notes/GoTutorials/gocode-examples/go/01-database-sql-demo

# 首次启动会执行 scripts/schema.sql。
make docker-up

# 标准库与 sqlx 版本分别运行。
make run
make run-sqlx

# 测试输入校验，并检查所有包能编译。
make test
~~~

标准库入口会创建商品、读取和更新它、列出商品、下单、删除一条没有订单引用的临时商品，最后打印连接池状态。输出中的 ID 会随数据库状态变化：

~~~text
创建商品: id=1 stock=10
查询商品: sku=keyboard-sql-... name=database/sql 机械键盘
更新商品名称: changed=true
当前商品数: 1
下单成功: order_id=1; 下单后库存=8
删除临时商品: deleted=true
连接池: open=1 idle=1 in_use=0 wait_count=0
~~~

示例默认连接 `root:rootpass@tcp(127.0.0.1:3307)/go_store`。连接其他数据库时通过 `MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_ADDRESS` 和 `MYSQL_DATABASE` 设置环境变量；生产密码应来自受控配置系统或密钥管理系统，不能写入源码。

## 三层数据访问栈：谁负责什么

一次数据库调用经过的层次如下：

~~~text
业务代码
  │  SQL 模板、参数、Context
  ▼
database/sql
  │  *sql.DB 连接池、*sql.Tx 事务、Rows 生命周期、driver 接口
  ▼
go-sql-driver/mysql
  │  DSN、认证、TCP、MySQL 协议、? 占位符、类型转换
  ▼
MySQL Server

sqlx（可选）
  └─ 在 database/sql 之上包装 *sql.DB / *sql.Tx，增加结构体映射和绑定辅助
~~~

`database/sql` 定义通用抽象，但不内置 MySQL 协议实现；MySQL 驱动实现标准库的驱动接口；`sqlx` 既不会取代驱动，也不会生成 ORM 风格的 SQL。它仍然把查询委托给 `database/sql` 和驱动。

因此有两个结论：

1. 使用 `sqlx` 仍然必须导入 MySQL 驱动；
2. `sqlx` 不会替你管理连接池、关闭结果集、设计事务、加索引或决定锁策略。

## 建立连接：`sql.DB` 是连接池，不是一条连接

先安装依赖：

~~~bash
go get github.com/go-sql-driver/mysql@v1.10.0
go get github.com/jmoiron/sqlx@v1.4.0
~~~

只需触发驱动注册时，使用空白导入：

~~~go
import _ "github.com/go-sql-driver/mysql" // 执行驱动包初始化，注册名为 mysql 的驱动。
~~~

Demo 需要调用 `mysql.NewConfig` 组装 DSN，因此使用普通导入。普通导入同样会执行包初始化。完整的连接创建函数如下：

~~~go
package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	mysql "github.com/go-sql-driver/mysql" // 使用 Config，同时完成驱动注册。
)

// MySQLConfig 把连接信息集中在启动阶段，业务 SQL 无需关心 DSN 格式。
type MySQLConfig struct {
	User     string
	Password string
	Address  string // 例如 127.0.0.1:3307。
	Database string
}

// OpenMySQL 创建并验证整个进程可复用的 database/sql 连接池。
func OpenMySQL(ctx context.Context, cfg MySQLConfig) (*sql.DB, error) {
	driverCfg := mysql.NewConfig()
	driverCfg.User = cfg.User
	driverCfg.Passwd = cfg.Password
	driverCfg.Net = "tcp"
	driverCfg.Addr = cfg.Address
	driverCfg.DBName = cfg.Database

	// 让 DATETIME 扫描为 time.Time；否则驱动通常返回 []byte 或 string。
	driverCfg.ParseTime = true
	driverCfg.Loc = time.Local

	// 这是底层网络 I/O 的超时，和每个业务请求的 Context 超时不同。
	driverCfg.Timeout = 3 * time.Second
	driverCfg.ReadTimeout = 5 * time.Second
	driverCfg.WriteTimeout = 5 * time.Second

	// sql.Open 返回的是池句柄，通常尚未真正建立 TCP 连接。
	db, err := sql.Open("mysql", driverCfg.FormatDSN())
	if err != nil {
		return nil, fmt.Errorf("open MySQL handle: %w", err)
	}

	// 下列设置由 database/sql 管理，不属于 MySQL 驱动。
	db.SetMaxOpenConns(20)                 // 最多 20 条打开或正在创建的连接。
	db.SetMaxIdleConns(20)                 // 最多保留 20 条空闲连接。
	db.SetConnMaxLifetime(3 * time.Minute) // 连接可复用的最长生命周期。
	db.SetConnMaxIdleTime(time.Minute)     // 空闲过久的连接可以被清理。

	// PingContext 会借用或建立物理连接，验证网络、地址、认证和数据库名。
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close() // 初始化失败时释放已创建的池资源。
		return nil, fmt.Errorf("ping MySQL: %w", err)
	}
	return db, nil
}
~~~

`sql.Open("mysql", dsn)` 中的 `mysql` 是驱动注册名。它只创建 `*sql.DB` 及其池状态，通常不会立刻拨号，所以启动阶段要配合有超时的 `PingContext`。创建成功后，`*sql.DB` 应作为长生命周期依赖复用：

~~~go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel() // 启动时也不能无限等待数据库。

db, err := store.OpenMySQL(ctx, cfg)
if err != nil {
	return err
}
defer db.Close() // 只在进程退出时关闭整个池。
~~~

每个 HTTP 请求都 `sql.Open` 和 `Close` 是常见错误：它会不断创建连接池、降低复用率，并很容易耗尽 MySQL 的连接数。请求处理函数应传入 `r.Context()`，在它的基础上设置合理的业务超时。

## 使用 `database/sql` 完成 CRUD

标准库的 API 很少，但每种返回值都对应不同的资源语义：

| 操作 | 方法 | 返回值与必须处理的边界 |
| --- | --- | --- |
| `INSERT`、`UPDATE`、`DELETE` | `ExecContext` | `sql.Result`、执行错误 |
| 一行或零行 | `QueryRowContext` | 在 `Scan` 时处理 `sql.ErrNoRows` |
| 多行 | `QueryContext` | `*sql.Rows`，必须关闭并检查 `Rows.Err` |
| 多个相关写入 | `BeginTx` | `*sql.Tx`，必须 `Commit` 或 `Rollback` |

### 写入：`ExecContext` 与 `LastInsertId`

商品数据模型和创建函数位于 `internal/store/product.go`：

~~~go
type Product struct {
	ID         int64
	SKU        string
	Name       string
	PriceCents int64
	Stock      int64
	CreatedAt  time.Time
}

type CreateProductInput struct {
	SKU        string
	Name       string
	PriceCents int64
	Stock      int64
}

func validateProductInput(input CreateProductInput) error {
	if input.SKU == "" || input.Name == "" || input.PriceCents < 0 || input.Stock < 0 {
		return ErrInvalidProduct // 在执行 SQL 前拒绝明显不合理的业务输入。
	}
	return nil
}

// CreateProduct 写入商品，并读取数据库最终保存的完整记录。
func CreateProduct(ctx context.Context, db *sql.DB, input CreateProductInput) (Product, error) {
	if err := validateProductInput(input); err != nil {
		return Product{}, err
	}

	// ? 与每个参数严格按位置对应。没有任何外部输入参与拼接 SQL 文本。
	result, err := db.ExecContext(ctx, `
		INSERT INTO products (sku, name, price_cents, stock)
		VALUES (?, ?, ?, ?)`,
		input.SKU, input.Name, input.PriceCents, input.Stock,
	)
	if err != nil {
		return Product{}, fmt.Errorf("insert product: %w", err)
	}

	id, err := result.LastInsertId() // 取得本次 INSERT 的 AUTO_INCREMENT 主键。
	if err != nil {
		return Product{}, fmt.Errorf("read inserted product ID: %w", err)
	}
	return GetProduct(ctx, db, id) // 再读一次，获得 created_at 等数据库生成的值。
}
~~~

`LastInsertId` 在这个 MySQL 自增主键场景可用，但不是所有数据库、所有主键生成策略都有相同语义。编写跨数据库代码前需要查看目标驱动的文档。

### 查询一行：错误在 `Scan` 时出现

`QueryRowContext` 返回的是延迟读取的 `Row`。它不会在调用处返回错误，SQL 错误、网络错误和“没有记录”都会在 `Scan` 时出现：

~~~go
// GetProduct 查询一条商品记录；缺少记录转换为明确的领域错误。
func GetProduct(ctx context.Context, db *sql.DB, id int64) (Product, error) {
	var product Product

	// SELECT 列与 Scan 目标必须同数量、同顺序且类型可转换。
	err := db.QueryRowContext(ctx, `
		SELECT id, sku, name, price_cents, stock, created_at
		FROM products
		WHERE id = ?`, id,
	).Scan(
		&product.ID,
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
~~~

这里不使用 `SELECT *`。明确列名能稳定扫描顺序，也避免表新增字段后不知不觉改变读取接口。`QueryRowContext` 不暴露需要手动关闭的 `Rows`，因此不需要对它调用 `Close`。

### 查询多行：`Rows.Close` 与 `Rows.Err` 缺一不可

多行查询的 `Rows` 可能仍在从网络读取结果集，并持有连接池中的物理连接。循环只读到一半就返回时，`Close` 才能让连接尽快回到池中；`Rows.Err` 才能报告 `Next` 阶段发生的错误：

~~~go
// ListProducts 展示 *sql.Rows 的完整生命周期。
func ListProducts(ctx context.Context, db *sql.DB) ([]Product, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, sku, name, price_cents, stock, created_at
		FROM products
		ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close() // 所有 return 路径都释放结果集与关联连接。

	products := make([]Product, 0)
	for rows.Next() {
		var product Product
		if err := rows.Scan(
			&product.ID,
			&product.SKU,
			&product.Name,
			&product.PriceCents,
			&product.Stock,
			&product.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan product row: %w", err)
		}
		products = append(products, product)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate product rows: %w", err)
	}
	return products, nil
}
~~~

如果数据库列允许 `NULL`，不能直接把它扫描进不可空的 `string`、`int64` 或 `time.Time`。使用 `sql.NullString`、`sql.NullInt64` 或 `sql.NullTime` 表示“存在值”与“数据库为 NULL”的区别：

~~~go
var deletedAt sql.NullTime
err := db.QueryRowContext(ctx, `
	SELECT deleted_at FROM products WHERE id = ?`, productID,
).Scan(&deletedAt)
if err != nil {
	return err
}

if deletedAt.Valid {
	log.Printf("已删除时间：%s", deletedAt.Time)
} else {
	log.Print("商品尚未删除") // Valid 为 false，才代表 SQL NULL。
}
~~~

### 更新与删除：正确理解受影响行数

更新和删除也是 `ExecContext`。任何面向单条资源的修改都必须携带预期的 `WHERE` 条件；遗漏条件会修改或删除整张表。

~~~go
// UpdateProductName 返回本次是否真的修改了字段值。
func UpdateProductName(ctx context.Context, db *sql.DB, id int64, name string) (bool, error) {
	if id <= 0 || name == "" {
		return false, ErrInvalidProduct
	}

	result, err := db.ExecContext(ctx, `
		UPDATE products
		SET name = ?
		WHERE id = ?`, name, id)
	if err != nil {
		return false, fmt.Errorf("update product %d: %w", id, err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("read product update result: %w", err)
	}

	// MySQL 默认把“新旧值相同”也报告为 0 行，false 不能单独说明商品不存在。
	return affected > 0, nil
}

// DeleteProduct 只删除没有被订单项引用的商品。
func DeleteProduct(ctx context.Context, db *sql.DB, id int64) (bool, error) {
	if id <= 0 {
		return false, ErrInvalidProduct
	}

	result, err := db.ExecContext(ctx, `DELETE FROM products WHERE id = ?`, id)
	if err != nil {
		return false, fmt.Errorf("delete product %d: %w", id, err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("read product delete result: %w", err)
	}
	return affected == 1, nil
}
~~~

`order_items` 的外键会拒绝删除已经出现在订单中的商品。这是数据库约束保护历史数据的例子。实际系统中的商品下架通常设计为状态字段或软删除，而不是物理删除。

## 用下单事务理解一致性与并发

假设库存为 1，两个请求同时执行“先读库存，再扣库存”。若没有事务和锁，两个请求都可能读到 1，随后都创建订单，这就是超卖。

~~~text
事务 A                                 事务 B
SELECT ... FOR UPDATE，读取 stock=1    SELECT ... FOR UPDATE，等待 A 的锁
UPDATE products，stock 减 1
INSERT orders / order_items
COMMIT
                                       读取 stock=0，返回库存不足
~~~

`PlaceOrder` 把相关写入放入一个事务。代码中的每个注释对应一个容易被忽略的边界：

~~~go
// PlaceOrder 原子地锁库存、扣库存、创建订单和订单明细。
func PlaceOrder(ctx context.Context, db *sql.DB, input PlaceOrderInput) (int64, error) {
	if err := validateOrderInput(input); err != nil {
		return 0, err
	}

	// 事务在 Commit 或 Rollback 前独占池中的一条连接。
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("begin order transaction: %w", err)
	}
	// 提交后的 Rollback 会返回 sql.ErrTxDone；这里忽略即可。
	// defer 使任何中途 return 都撤销已经完成的写入。
	defer func() { _ = tx.Rollback() }()

	var priceCents, stock int64
	err = tx.QueryRowContext(ctx, `
		SELECT price_cents, stock
		FROM products
		WHERE id = ?
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
	if priceCents > math.MaxInt64/input.Quantity {
		return 0, ErrInvalidOrder // 防止总价相乘时 int64 溢出。
	}

	// 事务内所有原子操作都必须经 tx 执行，不能误用外层 db。
	// stock >= ? 是第二道保护，受影响行数必须为 1。
	result, err := tx.ExecContext(ctx, `
		UPDATE products
		SET stock = stock - ?
		WHERE id = ? AND stock >= ?`,
		input.Quantity, input.ProductID, input.Quantity,
	)
	if err != nil {
		return 0, fmt.Errorf("decrease product stock: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("read stock update result: %w", err)
	}
	if affected != 1 {
		return 0, ErrInsufficientStock
	}

	total := priceCents * input.Quantity
	orderResult, err := tx.ExecContext(ctx, `
		INSERT INTO orders (customer_id, status, total_amount_cents)
		VALUES (?, ?, ?)`, input.CustomerID, "created", total)
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
~~~

这里需要同时理解事务与并发控制：

1. `BeginTx` 让 `tx` 固定使用一条物理连接；`Commit` 和 `Rollback` 会把它归还给池。
2. `FOR UPDATE` 只有在事务中才有意义，并依赖 InnoDB 的行锁能力；等值主键条件使锁范围尽可能小。
3. `UPDATE ... WHERE stock >= ?` 把库存条件与扣减放在同一条 SQL 中。即使未来修改了读取逻辑，这道条件仍能防止扣成负数。
4. 在事务中误用 `db.ExecContext` 会从连接池借用另一条连接，该语句不属于当前事务。
5. 事务要尽量短。持锁期间不要调用第三方 HTTP、等待用户输入或执行无关慢查询。

若 `Commit` 因网络问题返回错误，客户端可能无法知道服务器是否已经提交。支付、下单等重要操作还应使用业务幂等键和对账机制，不能简单重试整段事务。

## 使用过 API 后，再理解底层调用链

### 驱动注册：`sql.Open` 为什么认识 `mysql`

MySQL 驱动在包初始化时向标准库注册驱动名。驱动源码的核心逻辑可以概括为：

~~~go
func init() {
	// 将驱动实现注册到 database/sql 的全局驱动表。
	sql.Register("mysql", &MySQLDriver{})
}
~~~

因此，`sql.Open("mysql", dsn)` 的第一个参数不是数据库地址，而是注册名。少了驱动导入时，标准库会返回类似 `sql: unknown driver "mysql" (forgotten import?)` 的错误。

### `Open`、`PingContext` 与连接池的职责边界

标准库 `Open` 的重要工作不是创建一条连接，而是：从注册表查找驱动、根据 DSN 创建 `driver.Connector`、再用它创建 `*sql.DB`。`*sql.DB` 保存连接池状态并启动连接创建协程；真实连接会在首次 `PingContext`、查询或事务开始时按需创建。

下面是依据 Go 1.26.5 `database/sql` 源码整理的流程伪代码，名称经过简化，不能直接复制：

~~~go
func (db *DB) conn(ctx context.Context) (*driverConn, error) {
	db.mu.Lock() // 保护空闲连接、已打开数量和等待者队列。

	if db.hasIdleConnection() {
		conn := db.takeIdleConnection()
		conn.inUse = true
		db.mu.Unlock()
		return resetSessionIfNeeded(ctx, conn)
	}

	if db.maxOpen > 0 && db.numOpen >= db.maxOpen {
		waiter := db.addConnectionWaiter()
		db.mu.Unlock()
		return waitForConnectionOrContextDone(ctx, waiter)
	}

	db.numOpen++ // 先占用名额，避免多个 goroutine 同时突破上限。
	db.mu.Unlock()
	return db.connector.Connect(ctx) // 网络拨号在锁外执行。
}
~~~

这段逻辑解释了连接池的三个分支：

~~~text
一次 Exec / Query / BeginTx
  ├─ 池中有空闲连接         → 借用
  ├─ 没有空闲且未达上限      → 创建
  └─ 已达到 MaxOpenConns     → 等待归还，或因 Context 超时而返回

Rows.Close / Tx.Commit / Tx.Rollback
  → 归还连接到空闲池，或因过期、出错而关闭
~~~

所以资源释放不是形式要求：未关闭的 `Rows` 和未结束的事务都在长期占用池里的连接。使用 `DBStats` 观察状态：

~~~go
stats := db.Stats()
log.Printf(
	"open=%d in_use=%d idle=%d wait_count=%d wait_duration=%s",
	stats.OpenConnections, // 当前打开的物理连接数。
	stats.InUse,           // 被 SQL、Rows 或 Tx 占用的连接数。
	stats.Idle,            // 可立即借用的空闲连接数。
	stats.WaitCount,       // 因 MaxOpenConns 而等待的累计次数。
	stats.WaitDuration,    // 上述等待的累计时长。
)
~~~

`WaitCount` 持续增长不能直接推导为“连接数太小”。还可能是慢 SQL、锁等待、长事务或遗漏 `Rows.Close`。先定位阻塞来源，再评估连接总预算：

~~~text
应用实例数 × 每实例 MaxOpenConns
    ≤ MySQL 可分配给业务连接的总预算
~~~

预算还要为迁移、监控、管理连接和故障恢复留出余量。Demo 中的 `20` 只是本地教学配置，不是生产环境的通用答案。

## 在已理解标准库后使用 sqlx

标准库的显式 `Scan` 很可靠，但重复的列列表和一长串扫描目标会变得冗长。`sqlx` 保持 `database/sql` 的连接和事务模型，只补充以下高频能力：

- `GetContext`：查询一行并映射到结构体；
- `SelectContext`：查询多行并映射到结构体切片；
- `NamedExecContext`：把结构体或 map 的字段绑定到命名参数；
- `sqlx.In`：展开 `IN (?)` 中的切片参数；
- `BeginTxx`：获得支持上述辅助能力的事务对象。

### 先包装已有连接池

不要为 `database/sql` 和 `sqlx` 各调用一次 `Open`。那会创建两个独立连接池，连接上限、统计和生命周期配置都会分裂。正确方式是包装已有的 `*sql.DB`：

~~~go
// NewSQLX 不创建新连接池；sqlx 与 database/sql 共用同一个 *sql.DB。
func NewSQLX(db *sql.DB) *sqlx.DB {
	return sqlx.NewDb(db, "mysql")
}
~~~

`sqlx.DB` 在内部持有 `*sql.DB`，并记录驱动名与字段映射器。`GetContext` 和 `SelectContext` 最终仍通过底层的 `QueryContext` 获得结果集，再按照列名和结构体标签执行扫描。

### 结构体映射：从手动 `Scan` 到 `GetContext`

给字段写上 `db` 标签，列名与 Go 命名不同也能清晰映射。标签由 `sqlx` 使用；标准库的手动 `Scan` 不会读取它：

~~~go
type Product struct {
	ID         int64     `db:"id"`
	SKU        string    `db:"sku"`
	Name       string    `db:"name"`
	PriceCents int64     `db:"price_cents"`
	Stock      int64     `db:"stock"`
	CreatedAt  time.Time `db:"created_at"`
}

// GetProductSQLX 不再手写 Scan 顺序，但 SQL 的列仍然显式列出。
func GetProductSQLX(ctx context.Context, db *sqlx.DB, id int64) (Product, error) {
	var product Product
	err := db.GetContext(ctx, &product, `
		SELECT id, sku, name, price_cents, stock, created_at
		FROM products
		WHERE id = ?`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return Product{}, ErrProductNotFound
	}
	if err != nil {
		return Product{}, fmt.Errorf("get product %d: %w", id, err)
	}
	return product, nil
}

// SelectContext 查询多行，并完成 Rows 迭代、StructScan 与结果集关闭。
func ListProductsSQLX(ctx context.Context, db *sqlx.DB) ([]Product, error) {
	products := make([]Product, 0)
	if err := db.SelectContext(ctx, &products, `
		SELECT id, sku, name, price_cents, stock, created_at
		FROM products
		ORDER BY id`); err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	return products, nil
}
~~~

`GetContext` 在零行时仍返回 `sql.ErrNoRows`；`SelectContext` 查询零行时得到空切片而不是错误。`sqlx` 减少扫描样板代码，但不会替业务决定“找不到数据”应当如何处理。

### 命名参数与 `IN` 查询

位置参数多时容易把值的顺序写错。`NamedExecContext` 用结构体字段或 map 的键匹配 SQL 中的命名参数：

~~~go
type CreateProductParams struct {
	SKU        string `db:"sku"`
	Name       string `db:"name"`
	PriceCents int64  `db:"price_cents"`
	Stock      int64  `db:"stock"`
}

// 命名参数提升可读性，但 SQL 仍由应用维护，值仍由驱动安全绑定。
result, err := db.NamedExecContext(ctx, `
	INSERT INTO products (sku, name, price_cents, stock)
	VALUES (:sku, :name, :price_cents, :stock)`, input)
if err != nil {
	return Product{}, fmt.Errorf("insert product: %w", err)
}
~~~

切片不能直接作为一个 `?` 的值传入 `IN (?)`。不要手工将 ID 拼接进 SQL；使用 `sqlx.In` 展开参数，并通过 `Rebind` 适配不同驱动的占位符风格：

~~~go
func GetProductsByIDsSQLX(ctx context.Context, db *sqlx.DB, ids []int64) ([]Product, error) {
	if len(ids) == 0 {
		return []Product{}, nil // 避免生成 MySQL 不接受的 IN ()。
	}

	query, args, err := sqlx.In(`
		SELECT id, sku, name, price_cents, stock, created_at
		FROM products
		WHERE id IN (?)
		ORDER BY id`, ids)
	if err != nil {
		return nil, fmt.Errorf("expand IN: %w", err)
	}

	// MySQL 保持 ?；切换 PostgreSQL 等驱动时会改写为 $1、$2……
	query = db.Rebind(query)

	products := make([]Product, 0)
	if err := db.SelectContext(ctx, &products, query, args...); err != nil {
		return nil, fmt.Errorf("query products by IDs: %w", err)
	}
	return products, nil
}
~~~

`sqlx` 事务的正确用法与标准库没有本质变化：使用 `BeginTxx` 获得 `*sqlx.Tx`，后续所有需要原子性的语句都通过 `tx.GetContext`、`tx.NamedExecContext` 或 `tx.ExecContext` 执行，最后 `Commit`，中途通过延迟 `Rollback` 兜底。结构体映射和命名参数改变的是表达方式，不会改变锁、隔离级别和事务边界。

## 常见错误与排查顺序

| 现象 | 优先检查 | 修复方向 |
| --- | --- | --- |
| `unknown driver "mysql"` | 是否导入了 MySQL 驱动，注册名是否拼写正确 | 空白导入或普通导入 `go-sql-driver/mysql` |
| `Open` 成功，第一次查询失败 | 是否误把 `Open` 当作连通性校验 | 启动时调用带超时的 `PingContext` |
| 连接池等待增多 | `Rows` 是否关闭、事务是否结束、是否有慢 SQL 或锁等待 | 查看 `DBStats`、慢日志和事务状态，再调整池大小 |
| 取不到数据却没有错误分支 | 是否只检查了 `QueryRowContext` 调用 | 在 `Scan` 返回值中判断 `sql.ErrNoRows` |
| `Scan` 类型错误 | 列顺序、`NULL`、`DATETIME` 解析 | 显式列出列，使用 `sql.Null*`，配置 `parseTime` |
| 更新返回 0 行 | 值是否相同、条件是否匹配 | 先定义接口语义，必要时读取或使用版本号条件更新 |
| 事务中出现部分写入 | 是否混用了 `db.*` 与 `tx.*` | 事务内全部经 `tx` 执行，并保证回滚 |
| 并发下超卖 | 是否只做“查询库存后更新” | 使用事务、`FOR UPDATE` 或原子条件更新，并检查影响行数 |
| 动态查询存在注入风险 | 是否拼接了请求输入 | 值参数化；表名、列名、排序方向只允许白名单 |

## 参考资料

- [Go 标准库 `database/sql`](https://pkg.go.dev/database/sql)
- [Go 1.26.5 `database/sql` 源码](https://github.com/golang/go/blob/go1.26.5/src/database/sql/sql.go)
- [go-sql-driver/mysql 文档](https://pkg.go.dev/github.com/go-sql-driver/mysql)
- [go-sql-driver/mysql v1.10.0 驱动源码](https://github.com/go-sql-driver/mysql/blob/v1.10.0/driver.go)
- [sqlx 使用指南](https://jmoiron.github.io/sqlx/)
- [可运行的数据库访问 Demo](https://github.com/zzxrepository/gocode-examples/tree/2d147d72f1ca7144eb001c18e8bbe75c3b18578f/go/01-database-sql-demo)

## 总结

`database/sql`、MySQL 驱动和 `sqlx` 的关系可以归纳为：标准库管理统一 API、连接池和事务；驱动完成 MySQL 通信与数据转换；`sqlx` 在不改变底层模型的前提下减少结构体扫描、命名参数和 `IN` 查询的样板代码。

可靠的数据访问建立在几个不可替代的规则上：`*sql.DB` 要长期复用并设置合理边界；每次数据库调用都应带 `Context`；值必须通过占位符绑定；多行查询关闭 `Rows` 并检查 `Rows.Err`；查询一行在 `Scan` 时处理 `sql.ErrNoRows`；事务内所有语句只使用 `tx`；库存、余额等并发写入要同时设计事务边界与数据库条件。

掌握这些规则后，选择 `database/sql` 还是 `sqlx` 就不再是“能不能访问数据库”的问题，而是“是否需要减少重复映射代码”的表达选择。无论选择哪一种，连接池、SQL 安全、事务和索引仍然是应用必须亲自负责的部分。
