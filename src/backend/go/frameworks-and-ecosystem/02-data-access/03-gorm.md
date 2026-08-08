---
permalink: /backend/go/frameworks-and-ecosystem/02-data-access/01-gorm/
title: 03. GORM：模型映射、CRUD 与事务
shortTitle: 03. GORM
order: 3
category:
  - Go
  - Golang 框架与生态
  - 数据访问
tag:
  - Go
  - GORM
  - ORM
  - MySQL
  - CRUD
  - 事务
---

# 03. GORM：模型映射、CRUD 与事务

## 前言

GORM 是 Go 常用的 ORM（对象关系映射）库。它把结构体解析成表和列，把链式条件组织成 SQL，再调用数据库驱动执行。它很适合常规 CRUD、模型约定和关联加载；但它不是数据库设计工具，无法替你判断索引是否合适、事务是否足够短、SQL 是否走对执行计划。

理解 GORM 的关键不是背 API，而是看清一次调用的路径：**模型结构体先被解析为 Schema；一次链式调用累积为 Statement；Create、Find、Updates 等终结方法运行 Callback；Callback 根据 dialect 生成 SQL，再交给底层 `database/sql` 连接池。** 这样看到一段链式代码时，才能判断它实际会发什么 SQL、会不会忽略零值、是否处于同一事务中。

本文使用传统 API，并以 MySQL 为例。安装依赖：

```bash
go get gorm.io/gorm
go get gorm.io/driver/mysql
```

## 初始化：GORM 仍建立在 `database/sql` 之上

`gorm.Open` 创建的是 GORM 数据库句柄；MySQL dialect 在底层使用 `database/sql` 和 MySQL 驱动。连接池配置、健康检查和进程退出关闭的仍然是 `*sql.DB`。

```go
package store

import (
	"context"
	"fmt"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func OpenMySQL(dsn string) (*gorm.DB, error) {
	// 例：app_user:secret@tcp(127.0.0.1:3306)/order_service?charset=utf8mb4&parseTime=true&loc=Asia%2FShanghai
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("打开 GORM: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("取得底层连接池: %w", err)
	}
	// 每个应用实例均有自己的池；下面只是起始值，必须按压测和数据库容量调整。
	sqlDB.SetMaxOpenConns(30)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		_ = sqlDB.Close() // 初始化失败时释放可能已建立的物理连接。
		return nil, fmt.Errorf("检查 MySQL 连通性: %w", err)
	}
	return db, nil
}
```

应用启动时初始化一次并在依赖中共享 `*gorm.DB`；退出时取得 `sqlDB` 后关闭一次。不要在每个 HTTP 请求里重复 `gorm.Open`，也不要在请求结束时关闭池。连接池、`Rows`、`context` 的基本规则与直接使用 `database/sql` 完全相同。

## 模型先变成 Schema

GORM 第一次遇到模型时，会用反射解析结构体字段、`gorm` tag、嵌入字段和命名策略，得到内部的 `schema.Schema`。该 Schema 缓存在 GORM 的模型缓存中，后续操作复用它；它包含表名、字段名、主键、数据类型、关系和钩子等元数据。

```go
package model

import (
	"time"

	"gorm.io/gorm"
)

type Product struct {
	ID        uint64    `gorm:"primaryKey"`          // 显式声明主键，避免约定被误读。
	Name      string    `gorm:"size:128;not null"`  // 迁移时表达列长度和非空约束。
	Stock     int       `gorm:"not null"`
	CreatedAt time.Time // 按命名策略映射为 created_at，并由 GORM 创建时写入。
	UpdatedAt time.Time // 更新时由 GORM 自动维护。
}

type Order struct {
	ID        uint64         `gorm:"primaryKey"`
	ProductID uint64         `gorm:"not null;index:idx_product_status"`
	Quantity  int            `gorm:"not null"`
	Status    string         `gorm:"size:32;not null;index:idx_product_status"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"` // 存在该字段时，默认查询自动加 deleted_at IS NULL。
}
```

默认命名策略会把 `ProductID` 映射为 `product_id`，把 `Order` 映射为 `orders`；但“默认”不是契约。遗留库、缩写、多库分表或精确索引名都应使用 tag 或自定义 `TableName` 明确表达。模型 tag 描述的是 GORM 的映射意图，不能取代数据库层面的 SQL 审查、索引设计和权限控制。

开发环境可以使用自动迁移：

```go
if err := db.AutoMigrate(&Product{}, &Order{}); err != nil {
	return fmt.Errorf("迁移订单模型: %w", err)
}
```

`AutoMigrate` 擅长创建缺失的表、列和部分索引，但不会为了匹配结构体而安全地删除历史列。生产变更应使用版本化迁移脚本：先评估锁表和数据回填，再发布可追踪、可回滚的变更。

## 源码视角：Statement 和 Callback 是怎样串起来的

GORM 的 `*gorm.DB` 不只是“连接对象”。每个操作会携带一个 `Statement`，其中保存当前模型、表名、`WHERE` 条件、`SELECT` 列、`ORDER BY`、`LIMIT`、变量、context 和构造 SQL 的 `strings.Builder` 等状态。链式 API 的大部分工作只是更新这个 Statement；遇到终结方法才真正执行。

```go
// 下面是帮助理解的简化形状，字段名以 GORM 源码为准，省略了大量细节。
type DB struct {
	Statement *Statement
	Error     error
}

type Statement struct {
	DB       *DB
	Model    any
	Table    string
	Clauses  map[string]clause.Clause // WHERE、ORDER BY、LIMIT 等 SQL 子句。
	Vars     []any                    // ? 对应的参数值，不直接拼进 SQL 文本。
	Context  context.Context
}
```

例如：

```go
query := db.WithContext(ctx).
	Model(&Order{}).
	Where("product_id = ? AND status = ?", productID, "created").
	Order("id DESC").
	Limit(20)

// 到这里主要是在构造 Statement；Find 才会触发查询回调、生成并执行 SQL。
err := query.Find(&orders).Error
```

初始化阶段，GORM 为查询、创建、更新、删除、行查询等注册了一组 Callback。以查询为例，回调会解析模型、补上软删除条件、调用 dialect 的 clause builder 生成 SQL、通过连接池执行，然后把行扫描回目标值。创建和更新回调还会处理时间戳、主键回填、关联保存等工作。不同驱动的 dialect 负责方言差异，例如 MySQL 的反引号、占位符和 `LIMIT` 表达。

```text
db.Where(...).Order(...).Find(&orders)
          │  累积条件
          ▼
Statement（Schema、Clauses、Vars、Context）
          │  运行 Query callbacks
          ▼
生成 SQL + 绑定 Vars ──> database/sql ──> MySQL driver ──> MySQL
          │
          ▼
Scan 到 orders，写回 Error / RowsAffected
```

这不是鼓励业务代码依赖内部字段；它解释了三个实用现象：

1. `Where` 之后不检查 `Error` 没有意义，应该在 `Find`、`Create`、`Updates` 等执行后检查。
2. `WithContext` 必须在本次操作链中出现，才能进入 Statement 并传到底层驱动。
3. ORM 日志帮助核对 SQL，却不能替代 `EXPLAIN`、慢查询日志和数据库层的锁等待分析。

开发中可以对单次调用使用 `db.Debug()`，或者配置受控的 logger；高流量生产环境不应长期记录所有 SQL 和敏感参数。

## CRUD：清楚检查 `Error` 与 `RowsAffected`

### 创建与读取

```go
package store

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"
)

func CreateProduct(ctx context.Context, db *gorm.DB, product *Product) error {
	if product.Name == "" || product.Stock < 0 {
		return errors.New("商品名称不能为空，库存不能小于零")
	}
	// Create 执行后，数据库生成的主键及自动时间字段会回填到 product。
	if err := db.WithContext(ctx).Create(product).Error; err != nil {
		return fmt.Errorf("创建商品: %w", err)
	}
	return nil
}

func FindProduct(ctx context.Context, db *gorm.DB, id uint64) (Product, error) {
	var product Product
	err := db.WithContext(ctx).First(&product, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return Product{}, fmt.Errorf("商品 %d 不存在", id)
	}
	if err != nil {
		return Product{}, fmt.Errorf("查询商品: %w", err)
	}
	return product, nil
}

func ListCreatedOrders(ctx context.Context, db *gorm.DB, productID uint64) ([]Order, error) {
	var orders []Order
	err := db.WithContext(ctx).
		Where("product_id = ? AND status = ?", productID, "created"). // 值仍必须走占位符。
		Order("id DESC").
		Limit(50).
		Find(&orders).Error
	if err != nil {
		return nil, fmt.Errorf("查询订单列表: %w", err)
	}
	// Find 没有匹配行时通常返回空切片，不会返回 ErrRecordNotFound。
	return orders, nil
}
```

`First` 的“找不到”要通过 `errors.Is(err, gorm.ErrRecordNotFound)` 判断，不能看结构体的 `ID` 是否为零。`Find` 查询集合时，没有匹配项通常是正常的空切片。对于分页，限制 `pageSize` 上限；更深的页可考虑基于索引的游标分页，而不是无限增大的 `OFFSET`。

### 更新：结构体会省略零值

GORM 的结构体更新默认只选择非零值。这个规则避免把未填字段误写成零，但也容易让 `false`、`0` 和空字符串“更新不进去”。面向外部请求时，优先列出允许变更的列。

```go
func CancelOrder(ctx context.Context, db *gorm.DB, id uint64) error {
	result := db.WithContext(ctx).
		Model(&Order{}).
		Where("id = ? AND status = ?", id, "created").
		Updates(map[string]any{
			"status": "cancelled", // map 保留零值；这里也避免把请求中的其他字段一并更新。
		})
	if result.Error != nil {
		return fmt.Errorf("取消订单: %w", result.Error)
	}
	if result.RowsAffected != 1 {
		return fmt.Errorf("订单不存在，或当前状态不能取消")
	}
	return nil
}

// 若业务需要用结构体更新 false 和 0，要显式 Select 允许的字段。
result := db.Model(&Product{}).Where("id = ?", id).
	Select("Stock").
	Updates(Product{Stock: 0})
```

GORM 默认阻止没有条件的批量更新/删除并返回 `gorm.ErrMissingWhereClause`。不要为了绕过这项保护而添加 `WHERE 1 = 1`；全表修改应是经过显式授权、审查和备份的运维操作。

### 删除与软删除

模型带有 `gorm.DeletedAt` 时：

```go
result := db.WithContext(ctx).Delete(&Order{}, id)
if result.Error != nil {
	return result.Error
}
if result.RowsAffected != 1 {
	return fmt.Errorf("订单 %d 不存在", id)
}
```

这会更新 `deleted_at`，普通查询自动排除该行；`Unscoped()` 才会查询或永久删除软删除数据。永久删除影响审计、关联和恢复能力，不能因为 API 简短就随意使用。

## 条件、排序与原生 SQL 的安全边界

GORM 并没有取消 SQL 注入风险。`Where("name = ?", input)`、`Raw("... WHERE id = ?", id)` 会绑定**值**；表名、列名、排序片段仍是 SQL 结构，不能直接接收用户输入。

```go
allowedOrder := map[string]string{
	"newest": "id DESC",
	"oldest": "id ASC",
}
order, ok := allowedOrder[userOrder]
if !ok {
	order = allowedOrder["newest"] // 只使用代码维护的 SQL 片段。
}

var orders []Order
err := db.WithContext(ctx).
	Where("status = ?", status).
	Order(order).
	Find(&orders).Error
```

复杂报表、窗口函数、特定索引 hint 或性能敏感批处理，用参数化的 `Raw`/`Exec` 甚至直接使用 `database/sql` 往往更清楚：

```go
type DailyCount struct {
	Day   time.Time
	Count int64
}

var counts []DailyCount
err := db.WithContext(ctx).Raw(`
	SELECT DATE(created_at) AS day, COUNT(*) AS count
	FROM orders
	WHERE created_at >= ? AND created_at < ?
	GROUP BY DATE(created_at)`, start, end, // 时间范围是值，仍由驱动安全绑定。
).Scan(&counts).Error
```

日志中展示的 SQL 主要用于调试，参数显示方式不等同于数据库实际的预处理和转义过程；不要复制日志 SQL 后误以为已经验证了安全性或执行计划。

## 事务：Callback 没有改变事务原则

GORM 默认会为单条创建、更新、删除操作使用事务，以增强一致性；这一行为可通过配置改变。无论默认策略如何，跨多条 SQL 的业务原子性仍需要显式事务。`Transaction` 回调返回 `nil` 时提交，返回错误时回滚；回调内必须使用传入的 `tx`。

```go
var ErrInsufficientStock = errors.New("商品不存在或库存不足")

func CreateOrderWithStock(
	ctx context.Context,
	db *gorm.DB,
	productID uint64,
	quantity int,
) (uint64, error) {
	if quantity <= 0 {
		return 0, errors.New("购买数量必须大于 0")
	}

	var order Order
	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&Product{}).
			// 在同一条 UPDATE 中检查并扣减，避免“先查后扣”的并发超卖。
			Where("id = ? AND stock >= ?", productID, quantity).
			Update("stock", gorm.Expr("stock - ?", quantity))
		if result.Error != nil {
			return fmt.Errorf("扣减库存: %w", result.Error)
		}
		if result.RowsAffected != 1 {
			return ErrInsufficientStock
		}

		order = Order{ProductID: productID, Quantity: quantity, Status: "created"}
		if err := tx.Create(&order).Error; err != nil {
			return fmt.Errorf("创建订单: %w", err)
		}
		return nil // GORM 随后提交该事务。
	})
	if err != nil {
		return 0, fmt.Errorf("创建订单事务: %w", err)
	}
	return order.ID, nil
}
```

`tx` 绑定一条底层连接；在回调里写 `db.Create(...)` 会从外层池选择连接，破坏事务边界。事务只包数据库操作，不能包慢 HTTP 调用、文件上传或等待用户确认。若需要嵌套流程，GORM 可使用 savepoint；是否适用取决于业务的可回滚边界，不能把 savepoint 当成分布式事务。

## 使用 GORM 时仍要看的数据库事实

| 问题 | ORM 能做什么 | 仍必须在数据库层确认 |
| --- | --- | --- |
| 查询慢 | 生成查询、记录 SQL | `EXPLAIN`、索引、返回行数、慢查询日志 |
| 连接耗尽 | 经 `database/sql` 复用连接 | 池上限、`Rows`/事务时长、实例总数 |
| 数据竞争 | 组织事务和条件更新 | 隔离级别、行锁、死锁及重试策略 |
| 结构迁移 | 根据模型创建部分对象 | 锁表风险、数据回填、回滚与发布顺序 |

GORM 最合适的定位是“清晰地表达大多数 SQL 的工具”。遇到关联预加载要留意 N+1 查询与返回数据量；遇到复杂查询要敢于回到参数化 SQL；遇到性能问题要以真实 SQL 和执行计划为证据，而不是猜测链式 API 做了什么。

## 总结

GORM 将结构体解析为 Schema，把链式条件累积到 Statement，并通过 Callback 生成 SQL、调用底层 `database/sql`。使用它时应显式管理底层连接池与 context，理解结构体更新会跳过零值，检查每次操作的 `Error` 和必要的 `RowsAffected`，并让同一原子业务的全部操作经由事务回调中的 `tx` 执行。ORM 能减少样板代码，但安全、索引、锁、迁移和事务边界仍是应用与数据库共同承担的责任。

## 参考资料

- [GORM 官方文档](https://gorm.io/docs/)
- [GORM：模型](https://gorm.io/docs/models.html)
- [GORM：SQL 构建器与 Statement](https://gorm.io/docs/sql_builder.html)
- [GORM：事务](https://gorm.io/docs/transactions.html)
- [GORM 源码：Callback 注册](https://github.com/go-gorm/gorm/blob/master/callbacks.go)
