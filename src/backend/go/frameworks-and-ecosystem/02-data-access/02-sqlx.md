---
permalink: /backend/go/frameworks-and-ecosystem/02-data-access/02-sqlx/
title: 02. sqlx：结构体映射与命名参数
shortTitle: 02. sqlx
order: 2
category:
  - Go
  - Golang 框架与生态
  - 数据访问
tag:
  - Go
  - sqlx
  - database/sql
  - MySQL
  - SQL
---

# 02. sqlx：结构体映射与命名参数

## 前言

`sqlx` 是 `database/sql` 的第三方扩展。它保留 `*sql.DB`、`*sql.Tx` 和数据库驱动的工作方式，只补上几个频繁重复的动作：把查询行映射到结构体、按结构体字段绑定命名参数、展开 `IN` 参数。

它不是 ORM，不会根据结构体自动生成完整 CRUD，也不会替你管理迁移、关联或索引。SQL 仍然由开发者明确编写，这正是 `sqlx` 适合复杂查询和希望保持 SQL 可见性的原因。

## 安装与初始化

```bash
go get github.com/jmoiron/sqlx
go get github.com/go-sql-driver/mysql
```

`sqlx` 不包含 MySQL 驱动，仍需导入驱动并使用注册名 `mysql`：

```go
import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/go-sql-driver/mysql" // 让 sqlx.Open 可以找到 MySQL 驱动。
)

func OpenMySQL(dsn string) (*sqlx.DB, error) {
	db, err := sqlx.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("open MySQL: %w", err)
	}
	db.SetMaxOpenConns(30) // sqlx.DB 嵌入 database/sql 的连接池能力。

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping MySQL: %w", err)
	}
	return db, nil
}
```

`sqlx.Open` 和 `sql.Open` 一样只创建句柄，`PingContext` 才能确认连接可用。

## 用 `db` tag 映射查询结果

数据库列通常使用 `snake_case`，Go 字段使用 `PascalCase`。`db` tag 让映射关系显式且稳定：

```go
type Order struct {
	ID        int64     `db:"id"`
	ProductID int64     `db:"product_id"`
	Quantity  int       `db:"quantity"`
	Status    string    `db:"status"`
	CreatedAt time.Time `db:"created_at"`
}
```

查询一行使用 `GetContext`，查询多行使用 `SelectContext`：

```go
func FindOrder(ctx context.Context, db *sqlx.DB, orderID int64) (Order, error) {
	var order Order
	err := db.GetContext(&order, `
		SELECT id, product_id, quantity, status, created_at
		FROM orders WHERE id = ?`, orderID,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Order{}, fmt.Errorf("order %d not found", orderID)
	}
	if err != nil {
		return Order{}, fmt.Errorf("get order: %w", err)
	}
	return order, nil
}

func ListOrders(ctx context.Context, db *sqlx.DB, productID int64) ([]Order, error) {
	orders := make([]Order, 0)
	err := db.SelectContext(&orders, `
		SELECT id, product_id, quantity, status, created_at
		FROM orders WHERE product_id = ? ORDER BY id DESC LIMIT 50`, productID,
	)
	if err != nil {
		return nil, fmt.Errorf("list orders: %w", err)
	}
	return orders, nil
}
```

这减少了手写 `rows.Next` 和 `Scan` 的样板代码，但不改变 SQL 的性能与错误语义。查询列仍应显式列出，不能因为映射方便就滥用 `SELECT *`。

## 命名参数让写入参数更清楚

当字段较多时，位置参数容易写错顺序。`NamedExecContext` 根据 `:name` 和结构体 tag 或 map 的键绑定参数：

```go
type CreateOrderParams struct {
	ProductID int64  `db:"product_id"`
	Quantity  int    `db:"quantity"`
	Status    string `db:"status"`
}

func CreateOrder(ctx context.Context, db *sqlx.DB, input CreateOrderParams) (int64, error) {
	result, err := db.NamedExecContext(ctx, `
		INSERT INTO orders (product_id, quantity, status, created_at)
		VALUES (:product_id, :quantity, :status, NOW())`, input,
	)
	if err != nil {
		return 0, fmt.Errorf("insert order: %w", err)
	}
	return result.LastInsertId()
}
```

命名参数提升可读性，不代表可以把列名或排序规则交给用户。`:name` 仍只能绑定值；动态 SQL 结构必须来自代码白名单。

## `IN` 查询需要展开占位符

普通占位符不能直接接收一个切片。`sqlx.In` 将切片展开为多个占位符，`Rebind` 再适配当前驱动的占位符风格：

```go
func FindOrdersByIDs(ctx context.Context, db *sqlx.DB, ids []int64) ([]Order, error) {
	if len(ids) == 0 {
		return []Order{}, nil // 空集合不应拼出 IN ()。
	}

	query, args, err := sqlx.In(`
		SELECT id, product_id, quantity, status, created_at
		FROM orders WHERE id IN (?)`, ids)
	if err != nil {
		return nil, fmt.Errorf("build IN query: %w", err)
	}
	query = db.Rebind(query) // MySQL 保持 ?；其他驱动可能需要 $1、$2。

	var orders []Order
	if err := db.SelectContext(ctx, &orders, query, args...); err != nil {
		return nil, fmt.Errorf("query orders: %w", err)
	}
	return orders, nil
}
```

## 事务仍然使用 `*sqlx.Tx`

`sqlx` 的事务原则与 `database/sql` 完全相同：在事务内使用 `tx`，不要换回外层 `db`。

```go
tx, err := db.BeginTxx(ctx, nil)
if err != nil {
	return err
}
defer tx.Rollback() // 异常路径回滚；提交成功后的 ErrTxDone 可以忽略。

var order Order
if err := tx.GetContext(&order,
	"SELECT id, product_id, quantity, status, created_at FROM orders WHERE id = ? FOR UPDATE", orderID,
); err != nil {
	return err
}

if _, err := tx.ExecContext(ctx, "UPDATE orders SET status = ? WHERE id = ?", "paid", orderID); err != nil {
	return err
}
return tx.Commit()
```

## 总结

`sqlx` 是轻量的 `database/sql` 扩展，而非 ORM。它适合保留手写 SQL，同时减少结构体扫描、命名参数与 `IN` 查询的重复代码。驱动、连接池、参数绑定、context、资源释放和事务边界仍遵循 `database/sql` 的规则。

## 参考资料

- [sqlx 项目文档](https://github.com/jmoiron/sqlx)
- [database/sql 包文档](https://pkg.go.dev/database/sql)
