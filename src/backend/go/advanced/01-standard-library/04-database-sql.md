---
permalink: /backend/go/advanced/01-standard-library/04-database-sql/
title: 04. database/sql：连接池、查询与事务
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

# 04. database/sql：连接池、查询与事务

## 前言

`database/sql` 是 Go 标准库的关系型数据库访问层。它不认识 MySQL、PostgreSQL 或 SQLite 的网络协议；它定义统一的查询、事务和连接池接口，再由具体数据库驱动完成协议实现。

GORM 等 ORM 的数据库驱动和连接池仍建立在这层能力之上。理解 `*sql.DB`、`*sql.Rows` 和 `*sql.Tx` 的资源边界，才能在 ORM 出现问题时知道该往哪里排查。

## 应用、标准库与驱动的关系

```text
业务代码
  -> database/sql：连接池、Query/Exec、事务接口
  -> 数据库驱动：把调用转换为 MySQL、PostgreSQL 等协议
  -> 数据库服务
```

以 MySQL 为例，驱动是第三方模块，需要单独安装：

```bash
go get github.com/go-sql-driver/mysql
```

```go
import (
	"database/sql"

	_ "github.com/go-sql-driver/mysql" // 仅执行驱动 init，将 "mysql" 注册给 database/sql。
)
```

空白导入不是“没有使用的导入”。驱动在初始化时向 `database/sql` 注册名称，之后 `sql.Open("mysql", dsn)` 才知道该使用哪个驱动。

## `sql.DB` 是连接池，不是一条数据库连接

`sql.Open` 返回的 `*sql.DB` 是可以被多个 goroutine 共享的数据库句柄和连接池。它不保证此刻已经连上数据库，因此启动阶段还应调用 `PingContext` 做连通性检查。

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
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database handle: %w", err)
	}

	// 这些数值不是通用答案，要结合实例数量、数据库上限和压测结果调整。
	db.SetMaxOpenConns(30)
	db.SetMaxIdleConns(10)
	db.SetConnMaxIdleTime(5 * time.Minute)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close() // 初始化失败也要释放已经创建的连接池。
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return db, nil
}
```

应用启动时创建一次，进程退出时关闭一次：

```go
db, err := OpenMySQL(dsn)
if err != nil {
	return err
}
defer db.Close() // 只在应用生命周期结束时关闭，不要每个请求都 Close。
```

把 `MaxOpenConns` 设得过小会让请求等待连接；设得过大则可能让多个服务实例压垮数据库。观察 `db.Stats()`、慢查询和数据库连接数，再做调整。

## 三种最常用的 SQL 调用

假设有一张订单表：

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  status VARCHAR(32) NOT NULL
);
```

### 查询一行：`QueryRowContext`

`QueryRowContext` 的错误会在 `Scan` 时返回。查询不到记录时，使用 `errors.Is(err, sql.ErrNoRows)` 判断，而不是比较错误字符串。

```go
type Order struct {
	ID        int64
	ProductID int64
	Quantity  int
	Status    string
}

func FindOrder(ctx context.Context, db *sql.DB, orderID int64) (Order, error) {
	const query = `
		SELECT id, product_id, quantity, status
		FROM orders
		WHERE id = ?`

	var order Order
	err := db.QueryRowContext(ctx, query, orderID).Scan(
		&order.ID, &order.ProductID, &order.Quantity, &order.Status,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Order{}, fmt.Errorf("order %d not found", orderID)
	}
	if err != nil {
		return Order{}, fmt.Errorf("query order: %w", err)
	}
	return order, nil
}
```

### 查询多行：`QueryContext`

`QueryContext` 返回 `*sql.Rows`，必须关闭。循环结束后还要检查 `Rows.Err()`，因为迭代过程中的网络或驱动错误会在那里出现。

```go
func ListCreatedOrders(ctx context.Context, db *sql.DB, limit int) ([]Order, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, product_id, quantity, status
		FROM orders
		WHERE status = ?
		ORDER BY id DESC
		LIMIT ?`, "created", limit)
	if err != nil {
		return nil, fmt.Errorf("query orders: %w", err)
	}
	defer rows.Close() // 归还查询占用的连接和结果集资源。

	orders := make([]Order, 0)
	for rows.Next() {
		var order Order
		if err := rows.Scan(&order.ID, &order.ProductID, &order.Quantity, &order.Status); err != nil {
			return nil, fmt.Errorf("scan order: %w", err)
		}
		orders = append(orders, order)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate orders: %w", err)
	}
	return orders, nil
}
```

### 修改数据：`ExecContext`

`INSERT`、`UPDATE`、`DELETE` 通常用 `ExecContext`。返回的 `sql.Result` 可取得受影响行数；是否需要 `LastInsertId` 取决于驱动和数据库。

```go
result, err := db.ExecContext(ctx,
	`UPDATE orders SET status = ? WHERE id = ?`, "cancelled", orderID)
if err != nil {
	return fmt.Errorf("cancel order: %w", err)
}
affected, err := result.RowsAffected()
if err != nil {
	return fmt.Errorf("read affected rows: %w", err)
}
if affected == 0 {
	return fmt.Errorf("order %d not found or unchanged", orderID)
}
```

## 参数绑定不是可选项

占位符把 SQL 结构与数据值分开，避免用户输入改变 SQL 的语义：

```go
// 正确：orderID 是参数值，不会被拼接到 SQL 文本中。
row := db.QueryRowContext(ctx, "SELECT status FROM orders WHERE id = ?", orderID)

// 错误：不要用 fmt.Sprintf 或字符串拼接用户输入。
// query := fmt.Sprintf("SELECT status FROM orders WHERE id = %s", userInput)
```

MySQL 常用 `?`，PostgreSQL 常用 `$1`、`$2`。占位符只能代替值，不能代替表名、列名和排序方向；这些 SQL 结构若必须动态变化，只能由代码白名单决定。

## 事务：同一业务原子操作使用同一个 `*sql.Tx`

创建订单时，“扣库存”和“插订单”必须同时成功或同时失败。事务开始后，所有语句都必须通过 `tx` 执行，不能混入外层 `db`。

```go
func CreateOrder(ctx context.Context, db *sql.DB, productID int64, quantity int) (int64, error) {
	if quantity <= 0 {
		return 0, errors.New("quantity must be positive")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("begin transaction: %w", err)
	}
	// Commit 成功后 Rollback 会返回 sql.ErrTxDone，可以忽略；异常路径则会真正回滚。
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx,
		`UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
		quantity, productID, quantity,
	)
	if err != nil {
		return 0, fmt.Errorf("decrease stock: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("read stock update result: %w", err)
	}
	if affected != 1 {
		return 0, errors.New("product not found or insufficient stock")
	}

	result, err = tx.ExecContext(ctx,
		`INSERT INTO orders (product_id, quantity, status) VALUES (?, ?, ?)`,
		productID, quantity, "created",
	)
	if err != nil {
		return 0, fmt.Errorf("insert order: %w", err)
	}
	orderID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("read order id: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit transaction: %w", err)
	}
	return orderID, nil
}
```

把库存判断放进同一条 `UPDATE`，避免“先查询库存、再扣减”之间被其他并发请求抢走库存。事务保证多个操作的原子边界，条件更新处理的是并发竞争条件，两者缺一不可。

## `database/sql` 在内部负责什么

每次 `QueryContext`、`ExecContext` 或 `BeginTx` 都会向 `*sql.DB` 借一个可用连接；操作完成、`Rows.Close`、事务提交或回滚后，连接才有机会回到池中。`context` 到期时，标准库会尝试让驱动取消正在进行的操作，因此数据库访问必须优先使用带 `Context` 的方法。

`database/sql` 不替你做三件事：设计表结构和索引、决定事务边界、解释具体数据库的锁与隔离级别。它提供的是可靠且统一的访问骨架。

## 总结

`database/sql` 是标准库的数据库访问与连接池接口，不是驱动，也不是 ORM。应用应复用一个 `*sql.DB`，所有请求传递 `context`，多行查询及时关闭 `Rows`，并让原子业务操作始终通过同一个 `*sql.Tx` 执行。理解这层以后，GORM 生成的 SQL、事务和连接池行为就不再是黑盒。

## 参考资料

- [Go 官方：Accessing relational databases](https://go.dev/doc/database/)
- [Go 官方：Managing connections](https://go.dev/doc/database/manage-connections)
- [database/sql 包文档](https://pkg.go.dev/database/sql)
- [Go 官方：Executing transactions](https://go.dev/doc/database/execute-transactions)
