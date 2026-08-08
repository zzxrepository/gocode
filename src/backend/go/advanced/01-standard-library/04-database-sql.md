---
permalink: /backend/go/advanced/01-standard-library/04-database-sql/
title: 04. database/sql：关系型数据库访问
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

# 04. database/sql：关系型数据库访问

## 前言

`database/sql` 是 Go 标准库提供的关系型数据库访问接口。它定义连接池、查询、事务和行扫描等通用能力，但不直接实现 MySQL、PostgreSQL 或 SQLite 协议；具体数据库由驱动提供。

因此，`database/sql` 应放在“标准库”。GORM 则是更高层的第三方 ORM，适合放在“框架与生态 → 数据访问”。先理解 `database/sql` 的连接池、context、事务和资源释放，使用 GORM 时才不会把 ORM 当成黑盒。

## 三层关系：应用、标准库和驱动

```text
业务代码
  ↓ 调用 QueryContext / ExecContext / BeginTx
database/sql（标准库：统一接口与连接池）
  ↓ driver.Driver / driver.Connector
MySQL、PostgreSQL 等数据库驱动（第三方模块）
  ↓
数据库服务
```

以 MySQL 为例，驱动需要通过空白导入完成注册：

```bash
go get github.com/go-sql-driver/mysql
```

```go
import (
	"database/sql"
	_ "github.com/go-sql-driver/mysql" // 只执行驱动的 init 注册，不直接调用其导出标识符。
)
```

## 初始化的是连接池，不是“一条连接”

`sql.Open` 返回的 `*sql.DB` 是数据库句柄和连接池，适合在应用启动时创建一次并复用。`Open` 不保证已经建立可用连接，启动检查应使用带超时的 `PingContext`。

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
		return nil, fmt.Errorf("创建数据库句柄: %w", err)
	}

	// 这些值必须结合数据库容量、实例数和压测结果配置，不能照抄固定数字。
	db.SetMaxOpenConns(30)
	db.SetMaxIdleConns(10)
	db.SetConnMaxIdleTime(5 * time.Minute)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close() // 初始化失败时释放已创建的连接池资源。
		return nil, fmt.Errorf("检查数据库连接: %w", err)
	}
	return db, nil
}
```

进程退出时调用一次 `db.Close()`，停止连接池接收新请求并释放空闲连接；不要在每个 HTTP 请求结束时关闭 `*sql.DB`。

## 真实场景：查询订单与扣减库存

单行查询使用 `QueryRowContext`，错误会在 `Scan` 时返回。多行查询使用 `QueryContext`，必须关闭 `Rows` 并在循环后检查 `Rows.Err()`。

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
	if err != nil {
		if err == sql.ErrNoRows {
			return Order{}, fmt.Errorf("订单 %d 不存在", orderID)
		}
		return Order{}, fmt.Errorf("查询订单: %w", err)
	}
	return order, nil
}

func CreateOrder(ctx context.Context, db *sql.DB, productID int64, quantity int) (int64, error) {
	if quantity <= 0 {
		return 0, fmt.Errorf("数量必须大于 0")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("开启事务: %w", err)
	}
	// Commit 成功后 Rollback 会返回 sql.ErrTxDone，可安全忽略；异常路径则确保回滚。
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx,
		`UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
		quantity, productID, quantity,
	)
	if err != nil {
		return 0, fmt.Errorf("扣减库存: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("读取扣减结果: %w", err)
	}
	if affected != 1 {
		return 0, fmt.Errorf("商品不存在或库存不足")
	}

	result, err = tx.ExecContext(ctx,
		`INSERT INTO orders (product_id, quantity, status) VALUES (?, ?, ?)`,
		productID, quantity, "created",
	)
	if err != nil {
		return 0, fmt.Errorf("创建订单: %w", err)
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

库存条件写在同一条 `UPDATE` 中，避免“先查库存、再扣减”之间被其他请求抢走库存。事务内的所有 SQL 必须通过 `tx` 执行；混用外层 `db` 会让语句跑到另一个连接上，破坏原子性。

## 参数、空值与资源释放

SQL 参数必须使用占位符，不能用 `fmt.Sprintf` 或字符串拼接：

```go
// 安全：驱动把 userID 作为参数值传递。
row := db.QueryRowContext(ctx, "SELECT name FROM users WHERE id = ?", userID)

// 危险：攻击者可以改变 SQL 结构。
// query := fmt.Sprintf("SELECT name FROM users WHERE id = %s", userInput)
```

占位符样式取决于数据库和驱动：MySQL 常用 `?`，PostgreSQL 驱动常用 `$1`、`$2`。占位符只能绑定值，表名、列名和排序方向等结构必须来自代码中的白名单。

数据库 `NULL` 不能直接扫描到普通 `string`、`int` 等非空类型时，使用 `sql.NullString`、`sql.NullInt64` 等类型区分“空值”和“零值”。

```go
var nickname sql.NullString
if err := row.Scan(&nickname); err != nil {
	return err
}
if nickname.Valid {
	// Valid 为 true 才表示数据库列不是 NULL。
	useNickname(nickname.String)
}
```

## `database/sql` 的内部职责

`*sql.DB` 内部维护空闲连接和等待获取连接的请求。一次查询会从池中获取连接，执行驱动实现的操作，然后在结果关闭、事务结束或语句完成后归还连接。`QueryContext`、`ExecContext` 和 `BeginTx` 接受 `context`，让客户端取消或截止时间有机会传递到驱动和数据库。

所以连接池配置不是孤立调优项。多个服务实例的 `MaxOpenConns` 总和必须小于数据库能承受的连接数，并预留管理连接与其他应用的空间。先观察等待连接数、等待时间、慢查询和数据库负载，再调整参数。

## 总结

`database/sql` 是标准库，不是具体数据库驱动，也不是 ORM。它提供可复用的 `*sql.DB` 连接池、带 context 的查询与事务接口。生产代码应复用数据库句柄、为每次操作传入 context、及时关闭 `Rows`、检查 `Scan` 和 `Rows.Err`，并让同一业务原子操作始终使用同一个 `*sql.Tx`。

掌握这些边界后，再使用 GORM 可以更清楚地判断 ORM 生成的 SQL、事务和连接池行为。

## 参考资料

- [Go 官方：Accessing relational databases](https://go.dev/doc/database/)
- [database/sql 包文档](https://pkg.go.dev/database/sql)
- [Go 官方：Querying for data](https://go.dev/doc/database/querying)
- [Go 官方：Executing transactions](https://go.dev/doc/database/execute-transactions)
