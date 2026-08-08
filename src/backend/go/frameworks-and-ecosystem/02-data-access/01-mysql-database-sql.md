---
permalink: /backend/go/frameworks-and-ecosystem/02-data-access/01-mysql-database-sql/
title: 01. MySQL：使用 database/sql 和 MySQL 驱动
shortTitle: 01. MySQL 与 database/sql
order: 1
category:
  - Go
  - Golang 框架与生态
  - 数据访问
tag:
  - Go
  - MySQL
  - database/sql
  - go-sql-driver/mysql
  - 连接池
  - 事务
---

# 01. MySQL：使用 database/sql 和 MySQL 驱动

## 前言

MySQL 的表、索引和事务由数据库服务端负责；Go 程序要解决的是如何把一条带参数、可取消、可观测的 SQL 安全地送到服务端，并把结果正确还原为 Go 值。`database/sql` 提供连接池与统一 API，`github.com/go-sql-driver/mysql` 实现 MySQL 的认证和通信协议。两者组合适合需要直接掌控 SQL、事务边界和执行计划的服务。

`database/sql` 的通用机制（驱动注册、连接池、`Rows` 与事务生命周期）在[标准库章节](/backend/go/advanced/01-standard-library/04-database-sql/)中详细解释。这里聚焦 MySQL 驱动实际如何配置、怎样写出可运行的数据访问代码，以及遇到类型、时间、连接问题时从哪里检查。

## 依赖与 DSN

```bash
go get github.com/go-sql-driver/mysql
```

驱动采用空白导入，目的只是执行它的初始化逻辑，把 `mysql` 这个名称注册给 `database/sql`：

```go
import (
	"database/sql"

	_ "github.com/go-sql-driver/mysql" // 让 sql.Open("mysql", ...) 能找到 MySQL 驱动。
)
```

DSN（Data Source Name）描述连接目标。一个常用格式是：

```text
用户名:密码@tcp(主机:端口)/数据库名?charset=utf8mb4&parseTime=true&loc=Asia%2FShanghai
```

例如，以下只是本地开发格式，密码不应提交到仓库：

```text
app_user:change-me@tcp(127.0.0.1:3306)/order_service?charset=utf8mb4&parseTime=true&loc=Asia%2FShanghai
```

| 片段 | 含义 | 容易忽略的点 |
| --- | --- | --- |
| `app_user:...` | MySQL 用户名和密码 | 密码含 `@`、`/` 等特殊字符时，优先使用驱动的 `mysql.Config` 生成 DSN，避免手工拼接出错。 |
| `tcp(127.0.0.1:3306)` | TCP 地址 | 容器里 `127.0.0.1` 指向容器自身，不是宿主机或另一个容器。 |
| `/order_service` | 默认数据库 | 没有权限或库名错误会在真正连接、执行时暴露。 |
| `charset=utf8mb4` | 客户端字符集 | `utf8mb4` 能完整表示 Unicode 字符；表、列的字符集也要一致。 |
| `parseTime=true` | 将 `DATE`/`DATETIME` 扫描为 `time.Time` | 没有它时，驱动通常返回 `[]byte`，扫描到 `time.Time` 会失败。 |
| `loc=Asia%2FShanghai` | `time.Time` 的位置 | 参数值中的 `/` 应 URL 编码；应用、驱动和数据库时区要统一约定。 |

比起直接拼字符串，更稳妥的方式是把配置显式放进 `mysql.Config`。下面代码需要额外导入 `github.com/go-sql-driver/mysql`（不是空白导入）：

```go
cfg := mysql.Config{
	User:      os.Getenv("MYSQL_USER"),     // 凭据从运行环境读取，而不是写进源码。
	Passwd:    os.Getenv("MYSQL_PASSWORD"),
	Net:       "tcp",
	Addr:      "127.0.0.1:3306",
	DBName:    "order_service",
	ParseTime: true,                         // 允许扫描到 time.Time。
	Loc:       time.FixedZone("CST", 8*3600), // 与业务和数据库的时区约定保持一致。
}
dsn := cfg.FormatDSN() // 驱动负责正确编码和拼接 DSN。
```

真实服务应通过环境变量、配置中心或密钥管理系统提供 DSN；日志、报错和指标标签都不要打印完整 DSN，以免泄露密码。

## 初始化一个可复用的连接池

下面示例可直接放入 `store/mysql.go`。它假定调用方传入有效 DSN，并在应用启动阶段调用一次。

```go
package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

func OpenMySQL(dsn string) (*sql.DB, error) {
	// Open 创建的是连接池句柄，不承诺此时已经与 MySQL 完成握手。
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("创建 MySQL 连接池: %w", err)
	}

	// 每个服务实例都会占用自己的连接池；数值应由实例数和数据库容量共同决定。
	db.SetMaxOpenConns(30)                 // 达到上限后，请求会等待可用连接。
	db.SetMaxIdleConns(10)                 // 保留少量热连接，减少反复握手。
	db.SetConnMaxIdleTime(5 * time.Minute) // 避免长期闲置连接被网络设备静默断开。
	db.SetConnMaxLifetime(30 * time.Minute) // 主动轮换，值应小于基础设施的连接淘汰时间。

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close() // Ping 失败时释放可能已建立的连接。
		return nil, fmt.Errorf("连接 MySQL: %w", err)
	}
	return db, nil
}
```

在 `main` 的退出清理路径关闭一次：

```go
db, err := store.OpenMySQL(os.Getenv("MYSQL_DSN"))
if err != nil {
	return err
}
defer db.Close() // 进程停止时关闭池；不能放在每个请求处理函数里。
```

MySQL 服务端的 `max_connections`、应用实例数量与 `SetMaxOpenConns` 必须一起计算。若 8 个实例各允许 30 条连接，单是应用池就可能同时打开 240 条连接。连接等待上升时，先检查 `db.Stats()`、长事务和慢 SQL，再盲目提高连接上限。

## 表结构先表达约束

示例使用订单与商品库存。事务能保证多步操作的原子性，但不能弥补缺少主键、索引和约束的表设计。

```sql
CREATE TABLE products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(128) NOT NULL,
  stock INT NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_products_stock CHECK (stock >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_orders_status_id (status, id), -- 支撑按状态倒序分页。
  CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT chk_orders_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`CHECK` 约束依赖所用 MySQL 版本和实际存储引擎行为；不应只依赖应用层校验。写入时仍须校验输入，因为数据库报错不应是正常控制流。

## CRUD：参数、空值与时间类型

所有示例使用 `Context` 版本 API。HTTP 服务中应把 `r.Context()` 向下传递；命令行或后台任务则按任务边界创建带超时的 context。

```go
package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type Order struct {
	ID        int64
	ProductID int64
	Quantity  int
	Status    string
	CreatedAt time.Time // DSN 开启 parseTime 后可直接扫描 DATETIME。
}

func InsertOrder(ctx context.Context, db *sql.DB, productID int64, quantity int) (int64, error) {
	if productID <= 0 || quantity <= 0 {
		return 0, errors.New("商品 ID 和数量必须为正数")
	}

	result, err := db.ExecContext(ctx, `
		INSERT INTO orders (product_id, quantity, status, created_at)
		VALUES (?, ?, ?, NOW())`,
		productID, quantity, "created", // `?` 只绑定值，不会改变 SQL 的语法结构。
	)
	if err != nil {
		return 0, fmt.Errorf("写入订单: %w", err)
	}
	id, err := result.LastInsertId() // MySQL 自增主键的 INSERT 可取得该连接上的新 ID。
	if err != nil {
		return 0, fmt.Errorf("读取新订单 ID: %w", err)
	}
	return id, nil
}

func FindOrder(ctx context.Context, db *sql.DB, id int64) (Order, error) {
	var order Order
	err := db.QueryRowContext(ctx, `
		SELECT id, product_id, quantity, status, created_at
		FROM orders WHERE id = ?`, id,
	).Scan(&order.ID, &order.ProductID, &order.Quantity, &order.Status, &order.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Order{}, fmt.Errorf("订单 %d 不存在", id)
	}
	if err != nil {
		return Order{}, fmt.Errorf("查询订单: %w", err)
	}
	return order, nil
}
```

如果列允许 `NULL`，应把“可能为空”显式建模：

```go
var note sql.NullString
err := db.QueryRowContext(ctx,
	"SELECT buyer_note FROM orders WHERE id = ?", id,
).Scan(&note)
if err != nil {
	return err
}
if note.Valid {
	fmt.Println(note.String) // Valid 为 true 才表示数据库不是 NULL。
}
```

不要用空字符串偷偷替代 `NULL`，除非业务确实规定二者含义相同。`NULL` 与空字符串、`0`、`false` 在 SQL 三值逻辑和唯一索引中的语义不同。

### 列表查询必须关闭结果集

```go
func ListOrders(ctx context.Context, db *sql.DB, status string, limit int) ([]Order, error) {
	if limit < 1 || limit > 100 {
		return nil, errors.New("limit 必须在 1 到 100 之间")
	}

	rows, err := db.QueryContext(ctx, `
		SELECT id, product_id, quantity, status, created_at
		FROM orders
		WHERE status = ?
		ORDER BY id DESC
		LIMIT ?`, status, limit)
	if err != nil {
		return nil, fmt.Errorf("查询订单列表: %w", err)
	}
	defer rows.Close() // 提前返回时也归还结果集及其占用的连接。

	orders := make([]Order, 0, limit)
	for rows.Next() {
		var order Order
		if err := rows.Scan(&order.ID, &order.ProductID, &order.Quantity, &order.Status, &order.CreatedAt); err != nil {
			return nil, fmt.Errorf("扫描订单: %w", err)
		}
		orders = append(orders, order)
	}
	if err := rows.Err(); err != nil {
		// 读取下一行时发生的协议或网络错误在这里检查。
		return nil, fmt.Errorf("遍历订单: %w", err)
	}
	return orders, nil
}
```

动态表名、列名和 `ORDER BY` 不能通过 `?` 绑定。它们若来自接口参数，必须先映射为代码白名单；不能用 `fmt.Sprintf` 把未验证输入拼进 SQL。

## InnoDB 事务：原子性不等于没有并发问题

以“扣库存并创建订单”为例，两个写入必须同时成功或同时失败。`BeginTx` 开始后，所有语句都要用 `tx`，不能混进 `db`：后者可能从池中拿到另一条连接，已经离开事务。

```go
var ErrInsufficientStock = errors.New("商品不存在或库存不足")

func CreateOrderWithStock(
	ctx context.Context,
	db *sql.DB,
	productID int64,
	quantity int,
) (int64, error) {
	if quantity <= 0 {
		return 0, errors.New("数量必须大于 0")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("开始事务: %w", err)
	}
	defer tx.Rollback() // 成功 Commit 后返回 sql.ErrTxDone，可安全忽略。

	result, err := tx.ExecContext(ctx, `
		UPDATE products
		SET stock = stock - ?
		WHERE id = ? AND stock >= ?`, quantity, productID, quantity)
	if err != nil {
		return 0, fmt.Errorf("扣减库存: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("读取库存更新结果: %w", err)
	}
	if affected != 1 {
		return 0, ErrInsufficientStock
	}

	result, err = tx.ExecContext(ctx, `
		INSERT INTO orders (product_id, quantity, status, created_at)
		VALUES (?, ?, ?, NOW())`, productID, quantity, "created")
	if err != nil {
		return 0, fmt.Errorf("插入订单: %w", err)
	}
	orderID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("读取订单 ID: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("提交事务: %w", err)
	}
	return orderID, nil
}
```

这里有两层保障：事务负责“扣库存 + 插订单”的整体提交或回滚；`UPDATE ... WHERE stock >= ?` 把库存判断放进单条语句，防止两个请求都先读到同一份库存后再扣减。不要在事务中调用远程服务或执行长时间任务，否则会增加锁等待和连接池压力。

MySQL 默认隔离级别、死锁检测和锁等待超时是数据库层规则。出现死锁错误时，应用应记录 SQL/业务上下文并对**可安全重试的短事务**有限重试；不能对任意写操作无条件重试，因为调用方可能已经观察到部分外部副作用。

## 驱动层的几个实用细节

- 使用 `DATETIME` 且需要 Go 的 `time.Time` 时设置 `parseTime=true`；时间字段是否保存 UTC、展示时是否转本地时区，需要团队统一约定。
- `context` 超时只覆盖本次操作及等待连接的时间。对连接、读写设置更细的网络超时，应按驱动文档使用 DSN 的 `timeout`、`readTimeout`、`writeTimeout` 等参数，并和上层请求超时协调。
- MySQL 服务器或负载均衡器可能主动断开长期空闲连接。`ConnMaxLifetime`/`ConnMaxIdleTime` 用来主动淘汰陈旧连接；不要把它们设成零后假定网络永远可靠。
- 观察 `db.Stats()` 中的 `WaitCount` 与 `WaitDuration`，并结合 MySQL 慢查询日志、`SHOW PROCESSLIST`、锁等待信息判断瓶颈在应用池、SQL 还是数据库。

## 从 SQL 语言到可审查的语句

直接使用 `database/sql` 的优势是 SQL 就在代码里，因此团队必须读得懂 SQL 的形状和风险。常见分类如下：

| 分类 | 常见命令 | 本文中的用途 | 生产注意点 |
| --- | --- | --- | --- |
| DDL（数据定义） | `CREATE`、`ALTER`、`DROP` | 建库、建表、建索引 | 走版本化迁移，评估元数据锁与回滚 |
| DML（数据操作） | `INSERT`、`UPDATE`、`DELETE` | 订单的新增、状态变更、删除 | 写清 `WHERE`，检查受影响行数 |
| DQL（数据查询） | `SELECT` | 列表、详情、统计 | 明确列、索引与排序，避免无界读取 |
| TCL（事务控制） | `START TRANSACTION`、`COMMIT`、`ROLLBACK` | 保证多步写入一致 | 在 Go 中通过 `*sql.Tx` 管理 |
| DCL（权限控制） | `GRANT`、`REVOKE` | 为应用创建最小权限账号 | 不在业务请求中执行 |

一条典型查询由若干固定部件组成：

```sql
SELECT id, product_id, quantity, status, created_at -- 返回哪些列
FROM orders                                          -- 从哪张表读取
WHERE status = 'created' AND id < 1000               -- 哪些行有资格
ORDER BY id DESC                                      -- 以什么稳定顺序排列
LIMIT 20;                                             -- 最多返回多少行
```

SQL 的书写顺序并不完全等于数据库的逻辑处理顺序。阅读查询时可先从 `FROM`/`WHERE` 判断候选行，再看 `SELECT` 的投影和 `ORDER BY`/`LIMIT` 的结果整理；优化则需要以 `EXPLAIN` 的实际计划为准。列表接口必须有稳定排序：仅按 `created_at` 排序在同一时刻多条记录时可能翻页重复或漏数据，通常加主键作为第二排序键。

### SQL 注入：值与结构必须分开

下面的代码看似只是查询，却让客户端内容成为 SQL 文本的一部分：

```go
// 不要这样写：input 若为 ' OR 1=1 -- ，条件就可能被改写。
query := "SELECT id, status FROM orders WHERE status = '" + input + "'"
rows, err := db.QueryContext(ctx, query)
```

`fmt.Sprintf` 不会改变风险，本质仍是拼接。正确方式是让 SQL 模板保持不变，让驱动单独编码参数：

```go
rows, err := db.QueryContext(ctx,
	"SELECT id, status FROM orders WHERE status = ?", input)
// `input` 无论包含引号、注释还是关键字，都只是一个字符串值。
```

不要给 `?` 手工加单引号；驱动会按 Go 值的类型处理字符串、时间、整数和 `NULL`。参数化查询是主要防线，但不是唯一防线：请求参数还应做业务格式校验，数据库账号只授予所需库表权限，错误响应不可泄露完整 SQL/DSN。

占位符**不能**替代表、列、关键字、排序方向或整个条件片段。需要动态排序时，把用户选项映射为代码中固定的安全片段：

```go
func orderClause(input string) string {
	allowed := map[string]string{
		"newest": "created_at DESC, id DESC",
		"oldest": "created_at ASC, id ASC",
		"id":     "id DESC",
	}
	if clause, ok := allowed[input]; ok {
		return clause
	}
	return allowed["newest"] // 原始输入从未进入 SQL 结构。
}

func ListByOrder(ctx context.Context, db *sql.DB, status, sort string) (*sql.Rows, error) {
	query := "SELECT id, status FROM orders WHERE status = ? ORDER BY " + orderClause(sort)
	return db.QueryContext(ctx, query, status)
}
```

同理，`IN` 条件不可把逗号列表作为一个参数塞进 `IN (?)`。由程序根据元素个数生成固定数量的 `?`，每个 ID 仍然单独传参；空集合应提前返回空结果，不能生成 `IN ()`。

## 完整 CRUD Repository：每一步都明确资源与结果

下面的仓储实现把新增、详情、分页列表、更新和删除放在一起。它不试图隐藏 SQL；注释标出每个方法要维护的边界。示例假定已定义 `Order` 类型并已创建 `orders` 表。

```go
package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type OrderRepository struct {
	db *sql.DB // 注入进程级连接池；repository 不拥有、也不关闭它。
}

func NewOrderRepository(db *sql.DB) *OrderRepository { return &OrderRepository{db: db} }

type OrderPage struct {
	Items []Order
	NextID int64 // 0 表示当前页没有下一页；用于基于主键的游标分页。
}

func (r *OrderRepository) Create(ctx context.Context, productID int64, quantity int) (Order, error) {
	if productID <= 0 || quantity <= 0 {
		return Order{}, errors.New("productID 和 quantity 必须为正数")
	}
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO orders(product_id, quantity, status, created_at)
		VALUES (?, ?, ?, NOW())`, productID, quantity, "created")
	if err != nil {
		return Order{}, fmt.Errorf("新增订单: %w", err)
	}
	id, err := result.LastInsertId() // 只在 INSERT 且驱动支持时有业务意义。
	if err != nil {
		return Order{}, fmt.Errorf("读取新增订单 ID: %w", err)
	}
	// 重新读一遍让返回模型以数据库实际默认值为准；也可用 MySQL RETURNING 能力时再调整。
	return r.ByID(ctx, id)
}

func (r *OrderRepository) ByID(ctx context.Context, id int64) (Order, error) {
	var order Order
	err := r.db.QueryRowContext(ctx, `
		SELECT id, product_id, quantity, status, created_at
		FROM orders WHERE id = ?`, id,
	).Scan(&order.ID, &order.ProductID, &order.Quantity, &order.Status, &order.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Order{}, fmt.Errorf("订单 %d 不存在", id)
	}
	if err != nil {
		return Order{}, fmt.Errorf("按 ID 查询订单: %w", err)
	}
	return order, nil
}

func (r *OrderRepository) PageCreated(ctx context.Context, beforeID int64, size int) (OrderPage, error) {
	if size < 1 || size > 100 {
		return OrderPage{}, errors.New("size 必须在 1 到 100 之间")
	}
	if beforeID <= 0 {
		beforeID = int64(^uint64(0) >> 1) // 首页从最大 int64 开始向前取。
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, product_id, quantity, status, created_at
		FROM orders
		WHERE status = ? AND id < ?
		ORDER BY id DESC LIMIT ?`, "created", beforeID, size+1)
	if err != nil {
		return OrderPage{}, fmt.Errorf("分页查询订单: %w", err)
	}
	defer rows.Close() // 不论 Scan 或循环中何处失败，均归还连接。

	items := make([]Order, 0, size+1)
	for rows.Next() {
		var item Order
		if err := rows.Scan(&item.ID, &item.ProductID, &item.Quantity, &item.Status, &item.CreatedAt); err != nil {
			return OrderPage{}, fmt.Errorf("扫描订单分页: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return OrderPage{}, fmt.Errorf("读取订单分页: %w", err)
	}
	page := OrderPage{Items: items}
	if len(items) > size {
		page.Items = items[:size]
		page.NextID = page.Items[len(page.Items)-1].ID
	}
	return page, nil
}

func (r *OrderRepository) Cancel(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE orders SET status = ?
		WHERE id = ? AND status = ?`, "cancelled", id, "created")
	if err != nil {
		return fmt.Errorf("取消订单: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("读取取消结果: %w", err)
	}
	if affected != 1 {
		return fmt.Errorf("订单不存在，或已不处于 created 状态")
	}
	return nil
}

func (r *OrderRepository) DeleteDraft(ctx context.Context, id int64) error {
	// 删除条件同时保护对象身份与业务状态，防止误删除已生效订单。
	result, err := r.db.ExecContext(ctx, "DELETE FROM orders WHERE id = ? AND status = ?", id, "draft")
	if err != nil {
		return fmt.Errorf("删除草稿订单: %w", err)
	}
	if n, err := result.RowsAffected(); err != nil || n != 1 {
		if err != nil { return fmt.Errorf("读取删除结果: %w", err) }
		return fmt.Errorf("草稿订单不存在或不能删除")
	}
	return nil
}

// BuildIn 保证每个元素都成为独立参数；调用方只能传受控的列名常量。
func BuildIn(column string, ids []int64) (string, []any, error) {
	if len(ids) == 0 { return "", nil, errors.New("ids 不能为空") }
	ph := strings.TrimRight(strings.Repeat("?,", len(ids)), ",")
	args := make([]any, len(ids))
	for i, id := range ids { args[i] = id }
	return column + " IN (" + ph + ")", args, nil
}

```

示例刻意没有用 `SELECT *`：列清单是接口契约，增加一个大字段不会意外扩大所有列表的网络传输。游标分页以 `id` 为边界，避免深页 `OFFSET` 逐渐扫描大量已跳过行；业务若按时间排序，可使用 `(created_at, id)` 这样的复合游标与匹配索引。

## NULL、时间和预处理：三个容易在测试外出错的细节

### 让 NULL 在 Go 模型中可见

数据库中的 `NULL` 表示“未知或不存在”，不是空字符串、零数量或 Unix epoch。可空列扫描到基本类型会失败，或者迫使你在 SQL 中丢失语义。用 `sql.NullString`、`sql.NullInt64`、`sql.NullBool`、`sql.NullTime`，或者仓储内部使用指针字段。

```go
type PaymentRow struct {
	ID          int64
	ExternalRef sql.NullString // Valid=false 说明是 SQL NULL，而非 ""。
	PaidAt      sql.NullTime
}

func (r *OrderRepository) Payment(ctx context.Context, id int64) (PaymentRow, error) {
	var p PaymentRow
	err := r.db.QueryRowContext(ctx, `
		SELECT id, external_ref, paid_at FROM payments WHERE order_id = ?`, id,
	).Scan(&p.ID, &p.ExternalRef, &p.PaidAt)
	return p, err
}
```

### 统一时间约定

`DATE` 只表示日历日期，`DATETIME` 表示无时区的日期时间，`TIMESTAMP` 则有 MySQL 特定的时区转换行为。项目应先约定“存 UTC、展示时转换”或其他明确规则，再让数据库 session、DSN 的 `loc` 和应用格式化保持一致。对 MySQL 驱动，`parseTime=true` 让日期/时间列可扫描到 `time.Time`；没有它时常得到 `[]byte`，而不是可直接使用的时间对象。

不要以 `time.Local` 的机器配置作为业务规则。测试应覆盖夏令时地区、跨日边界与 `NULL` 时间；时间范围查询使用半开区间 `created_at >= ? AND created_at < ?`，避免在精度不一致时漏掉“当天最后一瞬”。

### 显式预处理并非注入防线

每次 `ExecContext(ctx, "... ?", value)` 都已经把模板和值分开，因此已经具备注入防护。`PrepareContext` 的用途是重复使用同一语句、表达生命周期或配合批量写入；是否带来性能收益取决于驱动、服务端配置和实际压测。

```go
func InsertAuditBatch(ctx context.Context, db *sql.DB, orderIDs []int64) error {
	stmt, err := db.PrepareContext(ctx,
		"INSERT INTO audit_logs(order_id, action, created_at) VALUES (?, ?, NOW())")
	if err != nil { return fmt.Errorf("准备审计插入: %w", err) }
	defer stmt.Close() // 结束批次后释放 statement 的资源。

	for _, id := range orderIDs {
		if _, err := stmt.ExecContext(ctx, id, "batch-import"); err != nil {
			return fmt.Errorf("写入订单 %d 审计: %w", id, err)
		}
	}
	return nil
}
```

`*sql.Stmt` 可以并发使用，也可能在池中的多条物理连接上分别准备。批量中的所有写入若必须全成或全败，应在 `BeginTx` 后使用 `tx.PrepareContext`，并在发生错误时回滚；不能把循环 + 预处理误认为自动事务。

## InnoDB 运行故障：从连接、计划、锁到重试

排障先缩小“到底在哪里等”：连接池、网络、SQL 扫描、行锁还是提交。下面的顺序比直接把池上限调大更可靠。

1. 应用侧读取 `db.Stats()`：`WaitCount`/`WaitDuration` 上升说明请求在等池连接；检查事务是否结束、`Rows` 是否关闭、实例总连接数是否超过预算。
2. 服务端检查慢查询日志和 `EXPLAIN`：确认索引、估计行数与排序/临时表，不要仅凭 SQL 看上去简单。
3. 检查 `SHOW PROCESSLIST`、InnoDB 锁等待与最近死锁信息：长事务常是阻塞者，短事务只是受害者。
4. 核对 DSN 的网络超时与负载均衡空闲超时：陈旧连接应通过 `ConnMaxIdleTime`/`ConnMaxLifetime` 主动淘汰。
5. 最后才在容量预算内调整池上限，并重新压测，不让多个实例同时把 `max_connections` 耗尽。

死锁不是“数据库坏了”：两个事务以不同顺序请求相同行锁时，InnoDB 会选择一个回滚。正确做法是缩短事务、统一更新顺序、建立合适索引，并仅对幂等且调用方尚未获得成功响应的短事务做有限退避重试。网络超时后的提交状态也可能未知；对于创建类操作，使用业务唯一键/幂等键，重试时先查询该键，而不是盲目再次插入。

### 事务重试要以幂等性为前提

不是所有错误都该重试。语法错误、权限错误、字段校验失败和唯一键冲突通常重试无效；死锁或短暂的可用性错误才可能适合重试。更重要的是，网络中断发生在 `Commit` 附近时，客户端可能不知道服务端究竟提交成功还是失败，因此“再执行一次”可能造出重复订单。

一种常见设计是在表中保存由调用方提供的幂等键，并让数据库的唯一索引最终裁决：

```sql
ALTER TABLE orders
  ADD COLUMN request_id CHAR(36) NOT NULL,
  ADD UNIQUE KEY uk_orders_request_id (request_id);
```

```go
func CreateIdempotent(ctx context.Context, db *sql.DB, requestID string, productID int64) (int64, error) {
	// requestID 必须来自调用链的稳定标识；不要每次重试都生成新的 UUID。
	result, err := db.ExecContext(ctx, `
		INSERT INTO orders(request_id, product_id, quantity, status, created_at)
		VALUES (?, ?, ?, ?, NOW())`, requestID, productID, 1, "created")
	if err == nil {
		return result.LastInsertId()
	}
	// 真实项目应通过驱动错误码精确识别重复键，而非比对错误字符串。
	var existingID int64
	readErr := db.QueryRowContext(ctx,
		"SELECT id FROM orders WHERE request_id = ?", requestID).Scan(&existingID)
	if readErr == nil { return existingID, nil }
	return 0, fmt.Errorf("创建幂等订单: %w", err)
}
```

这个模式不替代业务校验，却把“重复请求只能有一条记录”放在可靠的数据库约束中。支付、消息投递等跨系统副作用还需要 outbox 或专门的幂等协议，不能只靠一次 SQL 事务承诺全局一致性。

### 索引与锁的简要读法

索引服务于具体访问路径，不是“每个列一个索引”。例如订单列表常按用户和主键游标查询，`(user_id, id)` 比两个独立索引更能支持 `WHERE user_id = ? AND id < ? ORDER BY id DESC`。相反，为写入频繁的每个字段建索引会放大 `INSERT`/`UPDATE` 成本。

执行 `EXPLAIN SELECT ...` 时关注访问类型、可能/实际索引、估计行数和是否出现额外排序或临时表；但优化前先采集真实参数与数据分布。事务内的 `SELECT ... FOR UPDATE` 会申请锁，它必须在明确的事务和受控索引路径内使用，否则可能扩大锁范围并造成无谓阻塞。

## 总结

访问 MySQL 的可靠组合是：驱动实现 MySQL 协议，`database/sql` 复用连接池，应用明确传递 context、参数和事务边界。使用 `parseTime` 与时区参数处理时间，使用 `Rows.Close` 归还查询资源，用单条条件更新应对并发库存竞争，并让每个事务内的 SQL 始终经由同一个 `*sql.Tx`。这些规则不依赖 ORM，换成 GORM 仍然成立。

## 参考资料

- [go-sql-driver/mysql README 与 DSN 文档](https://github.com/go-sql-driver/mysql#dsn-data-source-name)
- [go-sql-driver/mysql 配置结构](https://pkg.go.dev/github.com/go-sql-driver/mysql#Config)
- [Go 官方：访问关系型数据库](https://go.dev/doc/database/)
- [MySQL 参考手册：InnoDB 事务模型](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
