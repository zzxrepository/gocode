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

GORM 是 Go 生态中的第三方 ORM。它把结构体、查询条件和关联关系映射为 SQL，能减少常规 CRUD 的样板代码；它不是数据库，也不能替业务决定索引、锁、事务边界或数据迁移方案。

GORM 的数据库驱动和连接池仍落在 [`database/sql`](/backend/go/advanced/01-standard-library/04-database-sql/) 上。理解 SQL、连接池和事务边界，才能看清 ORM 如何组织这些能力，而不是把链式 API 当成魔法。

## 安装与初始化

以 MySQL 为例，需要 GORM 核心模块和 MySQL dialect：

```bash
go get gorm.io/gorm
go get gorm.io/driver/mysql
```

应用启动时初始化一次 `*gorm.DB`，再通过 `DB()` 取得底层 `*sql.DB` 配置连接池：

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
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open GORM: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get underlying sql.DB: %w", err)
	}
	// 连接池属于 database/sql；这些参数必须结合压测和数据库容量确定。
	sqlDB.SetMaxOpenConns(30)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return db, nil
}
```

DSN 中的账号和密码来自配置或密钥管理系统，不能写进源码和仓库。进程退出时关闭的是 `sqlDB`，而不是每次请求后关闭 `*gorm.DB`。

## 模型描述映射，不替代数据库设计

下面的模型对应商品和订单。GORM 会按约定把 `ProductID` 映射为 `product_id`，也可以用 tag 明确约束与索引意图。

```go
type Product struct {
	ID    uint64 `gorm:"primaryKey"`
	Name  string `gorm:"size:128;not null"`
	Stock int    `gorm:"not null"`
}

type Order struct {
	ID        uint64    `gorm:"primaryKey"`
	ProductID uint64    `gorm:"not null;index"` // 订单按商品查询时需要索引。
	Quantity  int       `gorm:"not null"`
	Status    string    `gorm:"size:32;not null"`
	CreatedAt time.Time // 按约定映射为 created_at，并在创建时写入。
}
```

`AutoMigrate` 可以在本地开发时创建缺失表、列和索引：

```go
if err := db.AutoMigrate(&Product{}, &Order{}); err != nil {
	return fmt.Errorf("migrate schema: %w", err)
}
```

生产环境的表结构变更仍应使用版本化迁移：评审 SQL、评估锁表时间、安排回填和回滚。模型 tag 不能替代这些工作。

## 常规 CRUD：每次操作都检查结果

```go
func CreateProduct(ctx context.Context, db *gorm.DB, product *Product) error {
	// WithContext 把请求取消和截止时间传给本次数据库操作。
	return db.WithContext(ctx).Create(product).Error
}

func FindProduct(ctx context.Context, db *gorm.DB, productID uint64) (Product, error) {
	var product Product
	err := db.WithContext(ctx).First(&product, productID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return Product{}, fmt.Errorf("product %d not found", productID)
	}
	if err != nil {
		return Product{}, fmt.Errorf("find product: %w", err)
	}
	return product, nil
}

func ListCreatedOrders(ctx context.Context, db *gorm.DB, productID uint64) ([]Order, error) {
	var orders []Order
	err := db.WithContext(ctx).
		Where("product_id = ? AND status = ?", productID, "created"). // 参数值仍要使用占位符。
		Order("id DESC").
		Limit(50).
		Find(&orders).Error
	return orders, err
}
```

创建、查询、更新、删除等终结操作之后都要检查 `Error`。更新和删除还常常要检查 `RowsAffected`，它决定“目标不存在”是否应被视为业务错误。

## 零值更新是 GORM 的常见误区

结构体作为更新值时，GORM 默认会跳过零值。`false`、`0` 和空字符串本来可能是你想写入的值，却可能被省略。对 HTTP 请求这类外部输入，使用 `map` 或 `Select` 明确允许更新的字段更安全：

```go
result := db.WithContext(ctx).
	Model(&Order{}).
	Where("id = ?", orderID).
	Updates(map[string]any{
		"status": "cancelled", // map 会保留零值，也避免整块请求结构体被意外写入。
	})
if result.Error != nil {
	return result.Error
}
if result.RowsAffected == 0 {
	return fmt.Errorf("order %d not found", orderID)
}
```

参数化同样不是可选项。`Where("id = ?", id)` 会绑定值；动态列名、排序字段和 SQL 片段无法由占位符保护，必须映射到代码白名单，不能直接写成 `Order(userInput)`。

## 事务：ORM 语法没有改变事务原则

创建订单仍然需要原子扣库存。`Transaction` 回调返回 `nil` 时提交，返回错误时回滚；回调中的每一条操作都必须使用 `tx`。

```go
var ErrInsufficientStock = errors.New("product not found or insufficient stock")

func CreateOrder(ctx context.Context, db *gorm.DB, productID uint64, quantity int) (uint64, error) {
	if quantity <= 0 {
		return 0, errors.New("quantity must be positive")
	}

	var order Order
	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&Product{}).
			// 把条件和扣减合为一条 UPDATE，避免“先查再扣”的并发超卖。
			Where("id = ? AND stock >= ?", productID, quantity).
			Update("stock", gorm.Expr("stock - ?", quantity))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrInsufficientStock
		}

		order = Order{ProductID: productID, Quantity: quantity, Status: "created"}
		return tx.Create(&order).Error // 使用 tx，不能换回外层 db。
	})
	if err != nil {
		return 0, fmt.Errorf("create order: %w", err)
	}
	return order.ID, nil
}
```

这里的正确性来自事务和 SQL 条件更新，不来自 GORM 的链式写法。即使改写为 `database/sql`，业务边界仍然一样。

## GORM 从调用到 SQL 做了什么

链式调用会把模型、条件、排序、上下文等信息累积到本次操作的 `Statement` 中。遇到 `Find`、`Create`、`Updates` 等终结方法后，GORM 的回调链根据模型和 dialect 生成 SQL，再交给底层连接池执行，最后把扫描结果、`Error` 和 `RowsAffected` 回填到 `*gorm.DB`。

这解释了三个工程习惯：

1. 开发时开启适量 SQL 日志，确认 ORM 实际发出了什么查询；生产环境控制日志量并结合慢查询观测。
2. 复杂报表、数据库特有函数或性能敏感批处理可以使用 `Raw`、`Exec`，必要时直接使用 `database/sql`。
3. ORM 生成 SQL 不等于 SQL 一定高效。索引、执行计划、锁等待和事务隔离仍要在数据库层验证。

## 总结

GORM 是建立在 `database/sql` 和数据库驱动之上的第三方 ORM。它擅长模型映射和常规 CRUD，但连接池、请求 context、参数绑定、事务和索引仍需要应用明确管理。把 ORM 当成一种表达 SQL 的工具，而不是替你承担数据库设计的黑盒，才能在项目中用得稳。

## 参考资料

- [GORM 官方文档](https://gorm.io/docs/)
- [GORM：连接数据库](https://gorm.io/docs/connecting_to_the_database.html)
- [GORM：查询](https://gorm.io/docs/query.html)
- [GORM：事务](https://gorm.io/docs/transactions.html)
- [GORM 源码：回调注册](https://github.com/go-gorm/gorm/blob/master/callbacks.go)
