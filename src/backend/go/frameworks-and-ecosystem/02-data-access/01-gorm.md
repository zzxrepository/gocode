---
permalink: /backend/go/frameworks-and-ecosystem/02-data-access/01-gorm/
title: 01. GORM：模型、查询与事务
shortTitle: 01. GORM
order: 1
category:
  - Go
  - Golang 框架与生态
  - 数据访问
tag:
  - Go
  - GORM
  - ORM
  - MySQL
  - 事务
---

# 01. GORM：模型、查询与事务

## 前言

GORM 是 Go 生态中常用的第三方 ORM（对象关系映射）库。它能把结构体、查询条件和关联关系映射为 SQL，减少重复的扫描与拼接代码。但 ORM 并不会替你设计索引、判断事务边界或修复慢查询。

GORM 的底层仍使用 Go 的 `database/sql` 连接池和数据库驱动。因此推荐的学习顺序是：先掌握 [`database/sql`](/backend/go/advanced/01-standard-library/04-database-sql/)，再用 GORM 提高常见数据访问的表达效率。本文统一使用传统 API，避免和泛型 API 混用。

## 安装与初始化

以 MySQL 为例：

```bash
go get gorm.io/gorm
go get gorm.io/driver/mysql
```

应用启动时只初始化一次 `*gorm.DB`，并通过 `db.DB()` 取得底层 `*sql.DB` 配置连接池。

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
		return nil, fmt.Errorf("打开 GORM: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("获取底层连接池: %w", err)
	}
	// 连接池由 database/sql 管理，参数应结合实例数和数据库容量评估。
	sqlDB.SetMaxOpenConns(30)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("检查数据库连接: %w", err)
	}
	return db, nil
}
```

DSN、用户名和密码应来自配置或密钥管理系统，不能写死在源码或提交到仓库。

## 模型不是数据库设计的替代品

以下模型描述订单创建场景。显式声明关键约束，避免让读者猜测数据库意图。

```go
type Product struct {
	ID    uint64 `gorm:"primaryKey"`
	Name  string `gorm:"size:128;not null"`
	Stock int    `gorm:"not null"`
}

type Order struct {
	ID        uint64    `gorm:"primaryKey"`
	ProductID uint64    `gorm:"not null;index"`
	Quantity  int       `gorm:"not null"`
	Status    string    `gorm:"size:32;not null"`
	CreatedAt time.Time // GORM 按约定映射为 created_at 并在创建时写入。
}
```

开发环境可以用 `AutoMigrate` 创建缺失的表、列和索引：

```go
if err := db.AutoMigrate(&Product{}, &Order{}); err != nil {
	return fmt.Errorf("迁移表结构: %w", err)
}
```

生产表结构变更应采用版本化迁移脚本并经过评审。`AutoMigrate` 不会替代灰度、数据回填、索引评估和回滚方案。

## 真实场景：创建订单并原子扣减库存

“扣库存”和“写订单”必须同时成功或同时失败。下面的 `Transaction` 回调返回 `nil` 时提交，返回错误时回滚；事务内部只能使用回调参数 `tx`。

```go
var ErrInsufficientStock = errors.New("商品不存在或库存不足")

func CreateOrder(ctx context.Context, db *gorm.DB, productID uint64, quantity int) (uint64, error) {
	if quantity <= 0 {
		return 0, errors.New("购买数量必须大于 0")
	}

	var order Order
	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&Product{}).
			// 条件与扣减放在同一条 UPDATE 中，防止“先查再扣”的并发超卖。
			Where("id = ? AND stock >= ?", productID, quantity).
			Update("stock", gorm.Expr("stock - ?", quantity))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrInsufficientStock
		}

		order = Order{ProductID: productID, Quantity: quantity, Status: "created"}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return 0, fmt.Errorf("创建订单: %w", err)
	}
	return order.ID, nil
}
```

这段代码的正确性来自数据库条件更新和事务，而不是来自 GORM 语法。即使用原生 SQL，边界也完全相同。

## 查询、更新与零值

查询用户输入时始终使用占位符：

```go
func FindOrders(ctx context.Context, db *gorm.DB, productID uint64) ([]Order, error) {
	var orders []Order
	err := db.WithContext(ctx).
		Where("product_id = ?", productID). // 参数值由驱动绑定，不拼接到 SQL 字符串中。
		Order("id DESC").
		Limit(50).
		Find(&orders).Error
	return orders, err
}
```

结构体作为条件或更新值时，GORM 默认忽略零值。这对 `false`、`0` 和空字符串尤其容易造成误解。更新接口更适合使用 `map` 明确列出允许写入的列：

```go
result := db.WithContext(ctx).
	Model(&Order{}).
	Where("id = ?", orderID).
	Updates(map[string]any{
		"status": "cancelled", // map 会保留零值；这里也避免把整个请求结构体写入数据库。
	})
if result.Error != nil {
	return result.Error
}
if result.RowsAffected == 0 {
	return errors.New("订单不存在")
}
```

动态排序字段、列名和 SQL 片段不能用占位符绑定，必须由代码白名单决定。`Order(userInput)` 不是安全的输入处理方式。

## GORM 在执行什么

链式调用会逐步构造本次操作的模型、条件、排序和上下文；`Find`、`Create`、`Updates`、`Delete` 等终结操作再进入对应回调链。GORM 根据 `Statement` 中的信息生成 SQL，交给 dialect 和底层连接池执行，最后把结果扫描回结构体并填充 `Error`、`RowsAffected` 等字段。

因此要养成三个习惯：

1. 每次终结操作后检查 `Error`，更新和删除还要按业务需要检查 `RowsAffected`。
2. 请求处理入口传入的 `ctx` 要通过 `WithContext` 传到查询和事务。
3. 用日志、慢查询和执行计划观察真实 SQL；ORM 不能自动保证索引正确或查询高效。

## 什么时候用 GORM，什么时候直接写 SQL

GORM 适合常规 CRUD、模型关联、条件组合和统一的数据访问约定。复杂报表、数据库特有函数、性能敏感批处理或需要精确控制 SQL 时，可以使用 `Raw`、`Exec` 或直接使用 `database/sql`。两者不是互斥关系；关键是保持参数绑定、事务边界和可观测性。

## 总结

GORM 是第三方 ORM，不是 Web 框架，也不是 `database/sql` 的替代品。它通过模型和链式 API 降低常见数据访问的样板代码，但连接池仍由底层 `database/sql` 管理，事务和索引仍是业务与数据库共同的责任。把 context、条件更新、错误检查和版本化迁移落实好，GORM 才会真正提升开发效率。

## 参考资料

- [GORM 官方文档](https://gorm.io/docs/)
- [GORM：连接数据库](https://gorm.io/docs/connecting_to_the_database.html)
- [GORM：Context](https://gorm.io/docs/context.html)
- [GORM：事务](https://gorm.io/docs/transactions.html)
- [GORM 核心回调实现](https://github.com/go-gorm/gorm/blob/master/callbacks.go)
