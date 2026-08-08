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

MySQL 是常用的关系型数据库。Go 的 `database/sql` 提供连接池、查询和事务等统一接口，但它不实现 MySQL 协议；`github.com/go-sql-driver/mysql` 才是负责网络通信、参数编码和结果解码的 MySQL 驱动。

因此，一个实际的 MySQL 访问链路包含三部分：业务代码调用 `database/sql`，标准库从 `*sql.DB` 连接池取得连接，再由 MySQL 驱动执行 SQL。这一层不需要 ORM，适合需要直接掌控 SQL 的服务。

## 安装驱动与连接数据库

```bash
go get github.com/go-sql-driver/mysql
```

驱动通过 `init` 向 `database/sql` 注册名称。空白导入的目的就是触发这一步：

```go
import (
	"database/sql"

	_ "github.com/go-sql-driver/mysql" // 注册名称为 mysql 的数据库驱动。
)
```

DSN 描述用户名、密码、地址和数据库名。密码不应硬编码，下面只展示格式：

```text
app_user:password@tcp(127.0.0.1:3306)/order_service?parseTime=true&charset=utf8mb4
```

`parseTime=true` 让驱动把 MySQL 的日期时间解析为 Go 的 `time.Time`。应用启动时创建并检查一个连接池：

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
		return nil, fmt.Errorf("create database handle: %w", err)
	}

	// 连接池参数要结合服务实例数和数据库连接上限确定。
	db.SetMaxOpenConns(30)
	db.SetMaxIdleConns(10)
	db.SetConnMaxIdleTime(5 * time.Minute)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close() // 失败时释放已创建的连接池。
		return nil, fmt.Errorf("ping MySQL: %w", err)
	}
	return db, nil
}
```

`sql.Open` 得到的是连接池句柄，不是一条已经验证可用的连接；`PingContext` 才能把配置或网络错误尽早暴露出来。`*sql.DB` 可以被多个 goroutine 共享，应用退出时关闭一次即可，不能在每个 HTTP 请求结束时关闭。

## 准备一张订单表

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_product_status (product_id, status)
);
```

表结构、索引和约束由数据库设计决定。Go 代码负责正确地传参、扫描结果和管理事务，不能代替数据建模。

## 写入与读取

`ExecContext` 用于不返回结果集的 `INSERT`、`UPDATE`、`DELETE`；所有外部输入都必须作为参数传递，不能拼接到 SQL 文本中。

```go
type Order struct {
	ID        int64
	ProductID int64
	Quantity  int
	Status    string
	CreatedAt time.Time
}

func CreateOrder(ctx context.Context, db *sql.DB, productID int64, quantity int) (int64, error) {
	result, err := db.ExecContext(ctx, `
		INSERT INTO orders (product_id, quantity, status, created_at)
		VALUES (?, ?, ?, NOW())`,
		productID, quantity, "created", // 参数由驱动绑定，不会改变 SQL 结构。
	)
	if err != nil {
		return 0, fmt.Errorf("insert order: %w", err)
	}
	orderID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("read inserted order ID: %w", err)
	}
	return orderID, nil
}
```

单行查询使用 `QueryRowContext`，错误在 `Scan` 时返回：

```go
func FindOrder(ctx context.Context, db *sql.DB, orderID int64) (Order, error) {
	var order Order
	err := db.QueryRowContext(ctx, `
		SELECT id, product_id, quantity, status, created_at
		FROM orders WHERE id = ?`, orderID,
	).Scan(&order.ID, &order.ProductID, &order.Quantity, &order.Status, &order.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Order{}, fmt.Errorf("order %d not found", orderID)
	}
	if err != nil {
		return Order{}, fmt.Errorf("query order: %w", err)
	}
	return order, nil
}
```

多行查询返回 `*sql.Rows`，需要主动关闭并在遍历后检查错误：

```go
rows, err := db.QueryContext(ctx, `
	SELECT id, product_id, quantity, status, created_at
	FROM orders WHERE status = ? ORDER BY id DESC LIMIT ?`, "created", 50)
if err != nil {
	return nil, err
}
defer rows.Close() // 释放结果集，并让连接有机会归还连接池。

orders := make([]Order, 0)
for rows.Next() {
	var order Order
	if err := rows.Scan(&order.ID, &order.ProductID, &order.Quantity, &order.Status, &order.CreatedAt); err != nil {
		return nil, err
	}
	orders = append(orders, order)
}
if err := rows.Err(); err != nil {
	return nil, err // 网络中断等迭代期错误会出现在这里。
}
```

## 事务处理原子业务

扣减库存和创建订单必须同时成功或同时失败。事务开始后，所有 SQL 都要通过 `tx` 执行：

```go
func CreateOrderWithStock(ctx context.Context, db *sql.DB, productID int64, quantity int) (int64, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback() // Commit 成功后会返回 sql.ErrTxDone，可安全忽略。

	result, err := tx.ExecContext(ctx,
		`UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
		quantity, productID, quantity,
	)
	if err != nil {
		return 0, fmt.Errorf("decrease stock: %w", err)
	}
	changed, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	if changed != 1 {
		return 0, errors.New("product not found or insufficient stock")
	}

	result, err = tx.ExecContext(ctx,
		`INSERT INTO orders (product_id, quantity, status, created_at) VALUES (?, ?, ?, NOW())`,
		productID, quantity, "created",
	)
	if err != nil {
		return 0, fmt.Errorf("insert order: %w", err)
	}
	orderID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit transaction: %w", err)
	}
	return orderID, nil
}
```

库存条件放在同一条 `UPDATE` 中，避免“先读库存，再扣库存”之间被并发请求抢走库存。事务与条件更新承担不同职责，不能互相替代。

## 总结

MySQL 驱动让 `database/sql` 能够真正连接 MySQL，`*sql.DB` 负责连接池。生产代码应在启动时初始化并验证连接池，每次数据库操作传入 `context`，使用占位符绑定参数，及时关闭 `Rows`，并用 `*sql.Tx` 保证原子业务操作。

## 参考资料

- [go-sql-driver/mysql](https://github.com/go-sql-driver/mysql)
- [Go 官方：Accessing relational databases](https://go.dev/doc/database/)
- [database/sql 包文档](https://pkg.go.dev/database/sql)
