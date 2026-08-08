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

## 总结

访问 MySQL 的可靠组合是：驱动实现 MySQL 协议，`database/sql` 复用连接池，应用明确传递 context、参数和事务边界。使用 `parseTime` 与时区参数处理时间，使用 `Rows.Close` 归还查询资源，用单条条件更新应对并发库存竞争，并让每个事务内的 SQL 始终经由同一个 `*sql.Tx`。这些规则不依赖 ORM，换成 GORM 仍然成立。

## 参考资料

- [go-sql-driver/mysql README 与 DSN 文档](https://github.com/go-sql-driver/mysql#dsn-data-source-name)
- [go-sql-driver/mysql 配置结构](https://pkg.go.dev/github.com/go-sql-driver/mysql#Config)
- [Go 官方：访问关系型数据库](https://go.dev/doc/database/)
- [MySQL 参考手册：InnoDB 事务模型](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html)
