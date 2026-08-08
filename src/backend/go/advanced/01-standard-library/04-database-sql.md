---
permalink: /backend/go/advanced/01-standard-library/04-database-sql/
title: 04. database/sql：驱动、连接池与事务
shortTitle: 04. database/sql
order: 4
category:
  - Go
  - Golang 进阶知识
  - 标准库
tag:
  - Go
  - database/sql
  - MySQL
  - 事务
  - 连接池
  - 标准库
---

# 04. database/sql：驱动、连接池与事务

## 前言

`database/sql` 常被误认为是“Go 的 MySQL 客户端”。它其实不懂 MySQL 协议，也不直接定义一张表；它处在业务代码和具体驱动之间，提供一套稳定的查询、连接复用和事务 API。真正把字节写到 MySQL、PostgreSQL 或 SQLite 的，是各自的驱动。

这层抽象的价值在于：应用面对的是同一个 `*sql.DB`、`*sql.Rows` 和 `*sql.Tx`，而驱动负责数据库方言和网络细节。代价是不能忘记资源边界——`*sql.DB` 是连接池，不是一条连接；`Rows` 不关闭会占着连接；事务里的每条语句必须落在同一条连接上。

下文的完整示例使用 MySQL 占位符 `?`，并假定项目已经安装驱动：

```bash
go get github.com/go-sql-driver/mysql
```

## 调用链：标准库不直接访问数据库

```text
业务代码（QueryContext / Transaction）
              │
              ▼
database/sql（连接池、参数转交、Rows/Tx 生命周期）
              │
              ▼
driver.Driver / driver.Conn（驱动接口）
              │
              ▼
MySQL 驱动（握手、认证、协议编解码） ──── MySQL Server
```

驱动通常这样被导入：

```go
import (
	"database/sql"

	_ "github.com/go-sql-driver/mysql" // 只为执行驱动包的 init，不直接引用导出标识符。
)

func open(dsn string) (*sql.DB, error) {
	return sql.Open("mysql", dsn) // "mysql" 是驱动注册的名称。
}
```

空白导入并不是多余的。`go-sql-driver/mysql` 的初始化代码会调用：

```go
// 驱动包中的模式；真实驱动会在自己的 init 中完成注册。
func init() {
	sql.Register("mysql", &MySQLDriver{})
}
```

`sql.Register` 把名称和 `driver.Driver` 保存到标准库的全局注册表。随后 `sql.Open("mysql", dsn)` 才能找到该驱动；若忘了导入，错误通常是 `sql: unknown driver "mysql"`。同名驱动重复注册会 panic，这是为了避免同一个名称对应两种协议实现。

## 从 `sql.Open` 到实际连接

`sql.Open` 参数合法时，通常只创建一个连接池对象，不保证已经完成 TCP 连接、认证或选库。因此配置错误不能只靠 `Open` 发现，启动阶段要用 `PingContext` 验证。

```go
package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// OpenMySQL 在进程启动时调用一次；返回的 db 可以并发共享。
func OpenMySQL(dsn string) (*sql.DB, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("创建数据库句柄: %w", err)
	}

	// 这些值没有通用答案。它们必须结合实例数、数据库 max_connections 和压测结果设定。
	db.SetMaxOpenConns(30)              // 池中已打开连接的硬上限；达到后新请求会等待。
	db.SetMaxIdleConns(10)              // 空闲连接的保留上限，过多空闲连接会被关闭。
	db.SetConnMaxIdleTime(5 * time.Minute) // 空闲太久的连接不再复用。
	db.SetConnMaxLifetime(30 * time.Minute) // 定期换连接，避开服务端、代理的陈旧连接。

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel() // 释放定时器；不是在“关闭”传入的 context。
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close() // 初始化失败时也释放池中可能已建立的连接。
		return nil, fmt.Errorf("连通性检查失败: %w", err)
	}
	return db, nil
}
```

进程退出时调用一次 `db.Close()`，它会阻止新操作并关闭空闲连接；不要在每个 HTTP 请求末尾关闭它。`*sql.DB` 被设计为 goroutine 安全的长期对象，反复 `Open`/`Close` 会失去连接复用，还可能在高峰时把数据库打满。

### 源码视角：驱动接口与连接创建

`database/sql/driver` 是给驱动作者的低层接口，应用代码不应直接使用。它的核心关系可以简化为：

```go
// 省略错误处理和其他可选接口后的形状。
type Driver interface {
	Open(name string) (Conn, error) // 根据 DSN 新建一条物理连接。
}

type Conn interface {
	Prepare(query string) (Stmt, error)
	Close() error
	Begin() (Tx, error)
}
```

较新的驱动更常实现 `driver.DriverContext`，由 `OpenConnector` 先把 DSN 解析为可复用的 `driver.Connector`；每次建连接时再调用 `Connector.Connect(ctx)`。这样连接阶段也能接收取消信号。`database/sql` 会探测驱动是否实现可选接口，例如 `driver.QueryerContext`、`driver.ExecerContext`、`driver.ConnBeginTx`；实现了就直接走带 context 的快速路径，否则才退回到预处理语句等兼容路径。

这也解释了一个边界：`context` 是标准库把取消意图传给驱动的通道，并不能神奇地保证数据库已经停止执行。驱动和服务端协议是否支持取消、网络是否已经阻塞，都会影响实际生效时刻；但应用仍应始终使用 `QueryContext`、`ExecContext` 与 `BeginTx`，让取消有机会向下传播。

## `*sql.DB` 如何借还连接

可以把连接池看成“空闲连接列表 + 已打开连接计数 + 等待队列”。执行 `QueryContext` 时，标准库内部会调用类似 `db.conn(ctx, strategy)` 的逻辑：

1. 优先取一条未过期的空闲连接；
2. 没有空闲连接且未达到 `MaxOpenConns` 时，调用驱动新建物理连接；
3. 已达到上限时，把调用者放入等待队列，直到有连接归还或 `ctx` 超时；
4. 操作结束后，连接要么回到空闲池，要么因坏连接、生命周期到期而被关闭并补建。

一个容易忽略的结果是：**连接池等待也消耗请求超时**。因此 `context deadline exceeded` 不一定表示 SQL 本身慢，也可能是所有连接都被长事务或未关闭的 `Rows` 占住了。

```go
stats := db.Stats()
fmt.Printf("open=%d inUse=%d idle=%d wait=%d waitTime=%s\n",
	stats.OpenConnections, // 当前物理连接数（使用中 + 空闲）。
	stats.InUse,           // 正被查询、事务等持有的连接数。
	stats.Idle,            // 能立即借出的空闲连接数。
	stats.WaitCount,       // 因连接上限而等待过的次数。
	stats.WaitDuration,    // 所有等待连接时间的累计值。
)
```

排查时不要把 `MaxOpenConns` 当作“越大越好”。若有 10 个应用实例，每个设为 30，数据库仅应用连接的理论上限就是 300，还没算迁移、管理工具和其他服务。应从数据库允许的连接数倒推，再预留余量；连接等待持续升高时，同时检查慢 SQL、锁等待、事务耗时和 `Rows` 泄漏。

## 查询、扫描与资源归还

以下表结构贯穿示例：

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_status_id (status, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 单行：错误在 `Scan` 时出现

`QueryRowContext` 返回的不是数据本身，而是延迟扫描的 `*Row`。因此“没有记录”、类型转换失败和查询错误都要在 `Scan` 后判断。

```go
type Order struct {
	ID        int64
	ProductID int64
	Quantity  int
	Status    string
	CreatedAt time.Time
}

func FindOrder(ctx context.Context, db *sql.DB, id int64) (Order, error) {
	const query = `
		SELECT id, product_id, quantity, status, created_at
		FROM orders
		WHERE id = ?`

	var order Order
	err := db.QueryRowContext(ctx, query, id).Scan(
		&order.ID, &order.ProductID, &order.Quantity, &order.Status, &order.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Order{}, fmt.Errorf("订单 %d 不存在", id)
	}
	if err != nil {
		return Order{}, fmt.Errorf("查询订单: %w", err)
	}
	return order, nil
}
```

这里需要额外导入 `errors`、`fmt` 和 `time`。`Scan` 的目标必须是指针，列顺序与目标顺序必须一致；数据库列允许 `NULL` 时，不能直接扫描到 `string`、`int`、`time.Time`，应使用 `sql.NullString`、`sql.NullInt64`、`sql.NullTime`，或在 SQL 中明确 `COALESCE` 默认值。

### 多行：`Rows.Close` 决定连接何时归还

```go
func ListCreatedOrders(ctx context.Context, db *sql.DB, limit int) ([]Order, error) {
	if limit < 1 || limit > 100 {
		return nil, fmt.Errorf("limit 必须在 1 到 100 之间")
	}

	rows, err := db.QueryContext(ctx, `
		SELECT id, product_id, quantity, status, created_at
		FROM orders
		WHERE status = ?
		ORDER BY id DESC
		LIMIT ?`, "created", limit)
	if err != nil {
		return nil, fmt.Errorf("查询订单列表: %w", err)
	}
	defer rows.Close() // 尽早退出循环时也释放服务端结果集，让连接回到池中。

	orders := make([]Order, 0, limit)
	for rows.Next() {
		var order Order
		if err := rows.Scan(&order.ID, &order.ProductID, &order.Quantity, &order.Status, &order.CreatedAt); err != nil {
			return nil, fmt.Errorf("扫描订单: %w", err)
		}
		orders = append(orders, order)
	}
	if err := rows.Err(); err != nil {
		// 网络中断、读取下一批数据失败等迭代期错误在这里出现。
		return nil, fmt.Errorf("遍历订单: %w", err)
	}
	return orders, nil
}
```

`Rows` 读到 EOF 时通常会自动关闭，但业务代码常常提前返回，所以 `defer rows.Close()` 仍是必须形成的习惯。漏掉它的表现很像“连接池不够用”：`InUse` 持续上涨，后续请求开始等待连接。

### 写入：检查 `Result`，而非猜测成功

```go
func CancelOrder(ctx context.Context, db *sql.DB, id int64) error {
	result, err := db.ExecContext(ctx,
		`UPDATE orders SET status = ? WHERE id = ? AND status = ?`,
		"cancelled", id, "created", // 值由驱动绑定，不会改变 SQL 的结构。
	)
	if err != nil {
		return fmt.Errorf("取消订单: %w", err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("读取影响行数: %w", err)
	}
	if affected != 1 {
		return fmt.Errorf("订单不存在，或当前状态不能取消")
	}
	return nil
}
```

`LastInsertId` 和 `RowsAffected` 是驱动提供的能力，具体语义应以数据库和驱动文档为准。对于 MySQL 的自增主键，`INSERT` 后常用 `LastInsertId`；对于 `UPDATE`，`RowsAffected` 可用于区分“没有匹配目标”和“业务条件不满足”。

## 参数只能代替值，不能代替 SQL 结构

```go
// 正确：id 是数据值，驱动负责编码与转义。
db.QueryRowContext(ctx, "SELECT status FROM orders WHERE id = ?", id)

// 错误：用户输入进入 SQL 文本，会造成注入风险。
// query := fmt.Sprintf("SELECT status FROM orders WHERE id = %s", input)
```

MySQL 使用 `?`，PostgreSQL 驱动通常使用 `$1`、`$2`。占位符不能用于表名、列名、排序关键字或 SQL 片段；若接口允许选择排序，只能把外部选项映射到白名单：

```go
orders := map[string]string{
	"newest": "id DESC",
	"oldest": "id ASC",
}
orderBy, ok := orders[userChoice]
if !ok {
	orderBy = orders["newest"] // SQL 结构来自代码常量，而不是用户输入。
}
query := "SELECT id, status FROM orders ORDER BY " + orderBy
```

## 事务固定一条连接

事务不是“给多条 SQL 加一个前缀”，而是数据库连接上的状态。`BeginTx` 从池中借出一条连接，并把它交给 `*sql.Tx` 独占到 `Commit` 或 `Rollback` 为止。若在事务函数里改用外层 `db.ExecContext`，连接池可能给到另一条连接，那条 SQL 根本不在当前事务内。

```go
var ErrInsufficientStock = errors.New("商品不存在或库存不足")

func CreateOrder(ctx context.Context, db *sql.DB, productID int64, quantity int) (int64, error) {
	if quantity <= 0 {
		return 0, errors.New("购买数量必须大于 0")
	}

	// 需要特定隔离级别时传入 &sql.TxOptions{Isolation: sql.LevelReadCommitted}；
	// 是否支持及实际含义由数据库驱动和服务端决定。
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("开始事务: %w", err)
	}
	defer tx.Rollback() // Commit 成功后会返回 sql.ErrTxDone，忽略即可；异常路径会真正回滚。

	result, err := tx.ExecContext(ctx, `
		UPDATE products
		SET stock = stock - ?
		WHERE id = ? AND stock >= ?`, quantity, productID, quantity)
	if err != nil {
		return 0, fmt.Errorf("扣减库存: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("读取扣减结果: %w", err)
	}
	if affected != 1 {
		return 0, ErrInsufficientStock
	}

	result, err = tx.ExecContext(ctx, `
		INSERT INTO orders (product_id, quantity, status, created_at)
		VALUES (?, ?, ?, NOW())`, productID, quantity, "created")
	if err != nil {
		return 0, fmt.Errorf("创建订单: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("读取订单主键: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("提交事务: %w", err)
	}
	return id, nil
}
```

条件更新 `stock >= ?` 和事务各有职责：前者把“检查库存并扣减”变成不可分割的一条 SQL，避免并发超卖；后者保证“扣库存和创建订单”要么一起提交、要么一起回滚。事务要尽量短，不要在其中调用慢 HTTP 服务、等待用户输入或做大量计算，否则它会长期占用连接和锁。

## 预处理语句的边界

`db.PrepareContext` 可以显式创建 `*sql.Stmt`，适合同一 SQL 被高频重复执行的情况；`Stmt` 也可并发使用。值得注意的是，`*sql.DB` 是池，预处理语句可能需要在多条物理连接上分别准备，不能把它理解为“一次 Prepare 永远只有一份服务端语句”。现代驱动和数据库还会自行处理预处理或协议优化，是否显式 `Prepare` 应用压测和驱动文档决定，而不是为了“看起来更快”。

```go
stmt, err := db.PrepareContext(ctx,
	`INSERT INTO audit_logs (order_id, action) VALUES (?, ?)`)
if err != nil {
	return err
}
defer stmt.Close() // 释放这个可复用语句句柄持有的资源。

_, err = stmt.ExecContext(ctx, orderID, "cancelled")
return err
```

`PrepareContext` 的“准备”也可能需要借连接，因此应带上 deadline。若语句只在一个事务中使用，应由事务创建或绑定，不能把池级别的 `Stmt` 想当然地拿进事务：

```go
func WriteAuditInTx(ctx context.Context, tx *sql.Tx, orderID int64) error {
	// tx.PrepareContext 保证该 statement 使用当前事务所独占的连接。
	stmt, err := tx.PrepareContext(ctx,
		`INSERT INTO audit_logs (order_id, action) VALUES (?, ?)`)
	if err != nil {
		return fmt.Errorf("准备审计语句: %w", err)
	}
	defer stmt.Close() // 事务结束前关闭语句句柄，释放驱动资源。

	if _, err := stmt.ExecContext(ctx, orderID, "created"); err != nil {
		return fmt.Errorf("写入审计: %w", err)
	}
	return nil
}
```

### Context 是操作预算，不是可选装饰

`database/sql` 提供了不带 `Context` 的旧 API，但新业务代码应默认使用 `QueryContext`、`QueryRowContext`、`ExecContext`、`PrepareContext` 和 `BeginTx`。HTTP 层将 `r.Context()` 传到 repository，客户端断开、服务关闭或请求超时时，等待连接和驱动层查询都有机会停止。

```go
func HandleGetOrder(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	// 不要从 Background 新造 context，否则会丢掉请求取消信号与截止时间。
	order, err := FindOrder(r.Context(), db, parseOrderID(r))
	if err != nil {
		// 真实项目应将错误映射为适当 HTTP 状态，并记录已脱敏的上下文。
		http.Error(w, "查询订单失败", http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(order)
}
```

超时应从入口向下分配，而非每层任意叠加很长的超时。比如网关给请求 800ms，repository 又无条件建一个 3 秒 context，会使取消失效；反过来，后台批处理可以为一批操作创建自己的清晰上限。对数据库来说，context 可能覆盖三段时间：等待池连接、网络 I/O、服务端执行；究竟何时能取消取决于驱动和协议，所以还应设置数据库侧的语句/锁超时作为兜底。

### `Conn`：只有确实需要粘连会话时才使用

绝大多数业务只需要 `DB` 或 `Tx`。`db.Conn(ctx)` 会从池中借出一条特定连接，直到 `Conn.Close()` 才归还；适用于会话变量、临时表、驱动特性等必须在同一连接连续执行的少数场景。

```go
func WithSessionVariable(ctx context.Context, db *sql.DB) error {
	conn, err := db.Conn(ctx)
	if err != nil {
		return fmt.Errorf("借出连接: %w", err)
	}
	defer conn.Close() // 这是归还连接到池，不是关闭整个 DB。

	// 例子只说明“同一会话”的边界；变量语义属于具体数据库。
	if _, err := conn.ExecContext(ctx, "SET SESSION sql_mode = ?", "STRICT_ALL_TABLES"); err != nil {
		return fmt.Errorf("设置会话变量: %w", err)
	}
	_, err = conn.ExecContext(ctx, "INSERT INTO audit_logs(order_id, action) VALUES (?, ?)", 42, "session-demo")
	return err
}
```

不要为了“确保连续两条 SQL 在同一连接”而滥用 `Conn`：若这两条语句需要原子性，应使用 `Tx`；若不需要会话状态，让池自由分配连接才能获得更好的并发能力。

### 空值、多结果集和列元数据

SQL 的 `NULL` 不等于 Go 零值。扫描可空字段时，以 `sql.Null*` 保存值和有效性，序列化给 API 前再根据业务模型转换为指针或省略字段：

```go
type CustomerRow struct {
	ID    int64
	Email sql.NullString // String 即使为空也不能说明数据库是否为 NULL。
	Seen  sql.NullTime
}

func ScanCustomer(row *sql.Row) (CustomerRow, error) {
	var customer CustomerRow
	err := row.Scan(&customer.ID, &customer.Email, &customer.Seen)
	if err != nil {
		return CustomerRow{}, err
	}
	return customer, nil
}
```

少数存储过程会返回多个结果集。此时每个结果集都应完整消费或关闭，并通过 `NextResultSet` 推进；不要假定 `rows.Next()` 只覆盖一个结果集。`Rows.Columns()` 与 `ColumnTypes()` 可以协助做通用导出工具，但正常业务查询应显式列出列和扫描目标，因为编译器无法保护“列顺序变了”的运行时错误。

### `DB.Stats` 应当如何成为监控指标

`Stats` 是进程内当前池的快照，适合定期采集而不是每次请求打印。至少监控 `OpenConnections`、`InUse`、`Idle`、`WaitCount`、`WaitDuration`、`MaxIdleClosed`、`MaxLifetimeClosed`；前两个趋势配合 QPS 和延迟更有解释力。

| 指标组合 | 合理推断 | 下一步 |
| --- | --- | --- |
| `InUse` 接近上限，`WaitCount` 持续增加 | 池已造成排队 | 找长事务、未关闭 Rows、慢 SQL、实例总连接数 |
| `OpenConnections` 很低但 SQL 慢 | 不一定是池问题 | 看执行计划、服务端 CPU/IO、锁等待 |
| `MaxLifetimeClosed` 突增且有连接错误 | 轮换过于激进或基础设施主动切断 | 调整生命周期并核对 LB/DB 超时 |
| `Idle` 长期为零且没有等待 | 当前并发确实会吃满连接 | 结合吞吐评估是否要增加上限 |

监控只能揭示现象，不能替代容量规划：应用的 `MaxOpenConns × 实例数` 必须小于数据库为该业务预留的连接预算，且要扣除迁移、只读副本、管理会话与故障切换余量。

### 生命周期检查清单

一次普通读操作的资源责任可以压缩成下面这张表。把这些动作放在 code review 清单里，能避免许多在压测后才暴露的池耗尽问题。

| 对象 | 谁创建 | 必须何时结束 | 常见误用 |
| --- | --- | --- | --- |
| `*sql.DB` | 应用启动组合根 | 进程退出 | 每个请求 `Open` 或 `Close` |
| `*sql.Rows` | `QueryContext` | 读取后立即 `Close` | 只检查 `Next`，提前 return 时泄漏 |
| `*sql.Tx` | `BeginTx` | 恰好一次 Commit/Rollback | 一条语句走 `tx`、另一条走 `db` |
| `*sql.Stmt` | `PrepareContext` | 不再复用时 `Close` | 长期创建后忘记关闭 |
| `*sql.Conn` | `DB.Conn` | 会话工作结束 `Close` | 用它替代事务或忘记归还 |

`Close` 的语义也不同：`Rows.Close` 结束结果集，`Tx.Rollback` 放弃事务，`Conn.Close` 把连接归还给池，`DB.Close` 才是关闭整个池。不要因为方法名相同而把它们放到错误的生命周期里。

### 测试 repository 时测试什么

单元测试可用接口、mock 或轻量数据库验证错误映射；但最终仍要在目标数据库/驱动集成测试，因为占位符、`NULL`、事务隔离、时间和 `LastInsertId` 都是具体实现语义。至少覆盖：找不到记录、`Rows.Err`、context 超时、重复键、回滚、并发条件更新，以及连接池在并发下不会无限等待。测试需要断言业务结果，而不是只断言“调用了某段 SQL”。

## 常见故障的定位顺序

| 现象 | 先检查什么 | 常见根因 |
| --- | --- | --- |
| `context deadline exceeded` | `DB.Stats()` 的 `WaitCount`、慢查询、锁等待 | 连接池耗尽、SQL 慢、事务过长 |
| `sql: no rows in result set` | 是否是正常的“未找到”分支 | 漏掉 `sql.ErrNoRows` 处理 |
| 连接数一直增长 | `Rows.Close`、事务是否提交/回滚、实例数量 | 资源泄漏或池上限配置失衡 |
| 事务部分生效 | 回调内是否误用了外层 `db` | SQL 没有都走同一个 `*sql.Tx` |
| 时间扫描失败或时区不对 | 列类型、驱动 DSN | `NULL` 未处理、MySQL `parseTime`/时区配置不一致 |

## 总结

`database/sql` 是 Go 的数据库访问骨架：驱动通过注册接入，`*sql.DB` 负责共享连接池，`Rows` 和 `Tx` 决定连接的归还时机。可靠的使用方式是启动时初始化并 `PingContext`，请求链路始终传递 `context`，查询后关闭 `Rows`，更新检查结果，并让一个原子业务的全部 SQL 都通过同一个 `*sql.Tx` 执行。ORM 改变的是写 SQL 的方式，不会改变这些资源与事务规则。

## 参考资料

- [database/sql 包文档](https://pkg.go.dev/database/sql)
- [database/sql/driver 包文档](https://pkg.go.dev/database/sql/driver)
- [Go 官方：管理连接](https://go.dev/doc/database/manage-connections)
- [Go 官方：执行事务](https://go.dev/doc/database/execute-transactions)
