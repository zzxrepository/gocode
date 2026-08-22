---
permalink: /backend/go/frameworks-and-ecosystem/02-data-access/02-gorm/
title: 2.Go mysql 数据访问：GORM
shortTitle: 2. GORM
order: 2
category:
  - Go
  - Golang 框架与生态
  - 数据访问
tag:
  - Go
  - GORM
  - MySQL
  - ORM
  - SQL
  - 连接池
  - 事务
---

# 2.Go mysql 数据访问：GORM

## 前言

GORM 是 Go 生态中常用的 ORM（Object-Relational Mapping，对象关系映射）库。它把结构体、关联关系和常见数据操作组织成 Go API，让简单的 CRUD 更接近业务语言；但 ORM 不是把 SQL 和数据库问题“隐藏掉”，而是换了一种更结构化的表达方式。

理解 GORM 的关键，是始终看见它下面的那一层：GORM 仍通过 `database/sql` 管理连接并借助 MySQL 驱动与服务器通信。因此，连接池、`Context`、事务边界、索引、锁与 SQL 注入并不会因为使用了 ORM 而自动得到解决；它们仍是应用设计的一部分。

本文先建立模型与连接，再逐步学习迁移、CRUD、条件查询、关联、事务与原生 SQL，并在底层原理部分把链路还原为“GORM → `database/sql` → MySQL 驱动 → MySQL”。示例统一采用传统 API，避免与泛型 API 混用；掌握核心概念后，可继续查阅 [GORM 官方中文文档](https://gorm.io/zh_CN/docs/)。

## 2.1 安装与连接数据库
本节以 MySQL 为例，安装 GORM 和 MySQL 驱动：

```bash
go get gorm.io/gorm
go get gorm.io/driver/mysql
```

下面将数据库初始化封装为一个函数：

```go
package database

import (
    "context"
    "fmt"
    "time"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

func Open(dsn string) (*gorm.DB, error) {
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    if err != nil {
        return nil, fmt.Errorf("连接数据库失败：%w", err)
    }

    // GORM 底层使用 database/sql 管理连接池。
    sqlDB, err := db.DB()
    if err != nil {
        return nil, fmt.Errorf("获取底层数据库连接池失败：%w", err)
    }

    // 以下参数只是示例，实际值应根据数据库容量和应用并发量调整。
    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetMaxOpenConns(30)
    sqlDB.SetConnMaxIdleTime(10 * time.Minute)
    sqlDB.SetConnMaxLifetime(time.Hour)

    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()

    if err := sqlDB.PingContext(ctx); err != nil {
        _ = sqlDB.Close()
        return nil, fmt.Errorf("数据库连接不可用：%w", err)
    }

    return db, nil
}
```

MySQL DSN 示例：

```text
root:password@tcp(127.0.0.1:3306)/demo?charset=utf8mb4&parseTime=True&loc=Local
```

其中：

- `charset=utf8mb4`：使用完整的 UTF-8 字符集；
- `parseTime=True`：将日期时间字段解析为 `time.Time`；
- `loc=Local`：使用程序运行环境的本地时区。

在生产项目中，用户名、密码和 DSN 不应直接写在源码中，而应通过环境变量或配置中心读取。

`*gorm.DB` 是数据库操作句柄，底层连接由连接池管理。应用通常只在启动时创建一次并在各层之间复用，不应为每个请求重新调用 `gorm.Open`。

程序退出时，可以关闭底层连接池：

```go
sqlDB, err := db.DB()
if err != nil {
    return err
}
defer sqlDB.Close()
```

## 2.2 定义模型
GORM 使用普通 Go 结构体定义数据模型：

```go
package model

import (
    "time"

    "gorm.io/gorm"
)

type User struct {
    ID        uint           `gorm:"primaryKey"`
    Name      string         `gorm:"size:64;not null"`
    Email     string         `gorm:"size:128;not null;uniqueIndex"`
    Age       int            `gorm:"not null"`
    Active    bool           `gorm:"not null"`
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`
}
```

默认情况下，GORM 遵循约定优于配置的原则：

- `User` 默认映射到 `users` 表；
- `CreatedAt` 映射到 `created_at`；
- 名为 `ID` 的字段默认作为主键；
- `CreatedAt` 和 `UpdatedAt` 会自动维护；
- 模型包含 `gorm.DeletedAt` 时自动启用软删除。

常用标签只需要掌握以下几种：

| 标签                            | 作用                     |
| ------------------------------- | ------------------------ |
| `primaryKey`                    | 设置主键                 |
| `size:64` 或 `type:varchar(64)` | 设置字段大小或数据库类型 |
| `not null`                      | 设置非空约束             |
| `index`                         | 创建普通索引             |
| `uniqueIndex`                   | 创建唯一索引             |
| `column:user_name`              | 指定数据库列名           |

GORM 还提供 `gorm.Model`，其中包含 `ID`、`CreatedAt`、`UpdatedAt` 和 `DeletedAt`。不过显式定义字段通常更清楚，也便于根据项目需要选择主键类型和是否启用软删除。

## 2.3 自动迁移
开发阶段可以使用 `AutoMigrate` 根据模型创建或调整表结构：

```go
if err := db.AutoMigrate(&User{}); err != nil {
    return fmt.Errorf("迁移数据表失败：%w", err)
}
```

`AutoMigrate` 会创建不存在的表、字段、索引和部分约束，但不会为了匹配模型而删除不再使用的字段。

它适合以下场景：

- 学习和演示项目；
- 本地开发环境；
- 表结构简单的小型项目。

生产环境中的表结构变更通常需要可审查、可追踪、可回滚的版本化迁移脚本。删除字段、修改历史数据和调整复杂索引时，不应只依赖 `AutoMigrate`。

## 2.4 创建记录
### 2.4.1 创建一条记录
```go
user := User{
    Name:   "张三",
    Email:  "zhangsan@example.com",
    Age:    20,
    Active: true,
}

result := db.Create(&user)
if result.Error != nil {
    return result.Error
}

fmt.Println("新用户 ID：", user.ID)
```

创建成功后，数据库生成的主键会回填到 `user.ID`。

### 2.4.2 批量创建
```go
users := []User{
    {
        Name:   "张三",
        Email:  "zhangsan@example.com",
        Age:    20,
        Active: true,
    },
    {
        Name:   "李四",
        Email:  "lisi@example.com",
        Age:    22,
        Active: true,
    },
}

if err := db.Create(&users).Error; err != nil {
    return err
}
```

普通项目先掌握 `Create` 即可。只有一次插入的数据量较大时，才需要进一步了解 `CreateInBatches`。

## 2.5 查询记录
### 2.5.1 查询单条记录
```go
var user User

err := db.
    Where("email = ?", "zhangsan@example.com").
    First(&user).
    Error
```

`First` 用于查询一条记录。没有找到数据时，它会返回 `gorm.ErrRecordNotFound`。

```go
switch {
case errors.Is(err, gorm.ErrRecordNotFound):
    fmt.Println("用户不存在")
case err != nil:
    return err
default:
    fmt.Println(user)
}
```

根据主键查询可以直接写：

```go
if err := db.First(&user, 10).Error; err != nil {
    return err
}
```

当主键来自 HTTP 路径或查询参数时，应先转换成明确的整数类型，不要把未经校验的字符串直接传入查询。

### 2.5.2 查询多条记录
```go
var users []User

if err := db.
    Where("age >= ? AND active = ?", 18, true).
    Order("id DESC").
    Find(&users).
    Error; err != nil {
    return err
}
```

`Find` 用于查询多条记录。没有匹配数据时通常返回空切片，不会返回 `gorm.ErrRecordNotFound`。

### 2.5.3 结构体条件与零值
GORM 支持使用结构体作为条件：

```go
db.Where(&User{Name: "张三", Age: 20}).Find(&users)
```

但结构体中的零值默认会被忽略。例如，下面的 `Age: 0` 和 `Active: false` 默认不会进入查询条件：

```go
db.Where(&User{
    Age:    0,
    Active: false,
}).Find(&users)
```

需要查询零值时，使用 Map 更直观：

```go
db.Where(map[string]any{
    "age":    0,
    "active": false,
}).Find(&users)
```

这是使用 GORM 时必须理解的规则：**结构体条件默认忽略零值，Map 条件不会忽略零值。**

## 2.6 链式查询与分页
GORM 通过链式调用逐步构造 SQL：

```go
query := db.Model(&User{})

if keyword != "" {
    query = query.Where("name LIKE ?", "%"+keyword+"%")
}

if onlyActive {
    query = query.Where("active = ?", true)
}
```

`Where`、`Order`、`Limit` 和 `Offset` 等方法只是在构造查询；调用 `First`、`Find`、`Create`、`Updates`、`Delete` 或 `Count` 等执行方法后，SQL 才会被发送到数据库。

一个常见的分页查询如下：

```go
func ListUsers(
    db *gorm.DB,
    page int,
    pageSize int,
) ([]User, int64, error) {
    if page < 1 {
        page = 1
    }
    if pageSize < 1 || pageSize > 100 {
        pageSize = 20
    }

    var total int64
    if err := db.
        Model(&User{}).
        Where("active = ?", true).
        Count(&total).
        Error; err != nil {
        return nil, 0, err
    }

    var users []User
    err := db.
        Where("active = ?", true).
        Order("id DESC").
        Offset((page - 1) * pageSize).
        Limit(pageSize).
        Find(&users).
        Error
    if err != nil {
        return nil, 0, err
    }

    return users, total, nil
}
```

动态排序字段不能直接使用用户输入。正确做法是使用白名单：

```go
allowedOrders := map[string]string{
    "newest":  "id DESC",
    "oldest":  "id ASC",
    "age_asc": "age ASC",
}

order, ok := allowedOrders[userOrder]
if !ok {
    order = "id DESC"
}

db.Order(order).Find(&users)
```

## 2.7 更新记录
### 2.7.1 更新单个字段
```go
result := db.
    Model(&User{}).
    Where("id = ?", userID).
    Update("active", false)

if result.Error != nil {
    return result.Error
}
if result.RowsAffected == 0 {
    return errors.New("用户不存在")
}
```

### 2.7.2 更新多个字段
推荐使用 Map 明确列出需要更新的字段：

```go
result := db.
    Model(&User{}).
    Where("id = ?", userID).
    Updates(map[string]any{
        "name":   "新名字",
        "age":    0,
        "active": false,
    })
```

使用 Map 时，`0`、`false` 和空字符串等零值也会被更新。

使用结构体更新时，GORM 默认只更新非零值：

```go
db.Model(&User{}).
    Where("id = ?", userID).
    Updates(User{
        Name:   "新名字",
        Age:    0,
        Active: false,
    })
```

上面的 `Age` 和 `Active` 默认不会被更新。如果确实需要使用结构体更新零值，可以配合 `Select` 明确指定字段：

```go
db.Model(&User{}).
    Where("id = ?", userID).
    Select("Name", "Age", "Active").
    Updates(User{
        Name:   "新名字",
        Age:    0,
        Active: false,
    })
```

因此，更新接口中通常更推荐使用 Map 或专门的更新参数结构体，避免零值被意外忽略。

GORM 默认会阻止没有条件的全表更新，并返回 `gorm.ErrMissingWhereClause`。不要为了绕过保护而随意添加 `WHERE 1 = 1`，全表更新应经过明确的业务确认。

## 2.8 删除与软删除
根据主键删除记录：

```go
result := db.Delete(&User{}, userID)
if result.Error != nil {
    return result.Error
}
```

由于 `User` 模型包含 `gorm.DeletedAt`，这里执行的是软删除。GORM 实际上会更新 `deleted_at`，普通查询会自动排除已经软删除的数据。

查询包含软删除记录在内的全部数据：

```go
db.Unscoped().Find(&users)
```

永久删除：

```go
db.Unscoped().Delete(&User{}, userID)
```

`Unscoped().Delete` 会真正删除数据，通常只应用于明确的数据清理场景。

GORM 同样会阻止没有条件的全表删除。更新和删除操作完成后，应根据业务需要检查 `RowsAffected`，不能只检查 `Error`。

## 2.9 错误处理与请求上下文
GORM 传统 API 将错误保存在返回值的 `Error` 字段中：

```go
result := db.Where("email = ?", email).First(&user)
if result.Error != nil {
    return result.Error
}
```

常见处理原则如下：

1. 每次数据库操作后检查 `Error`；
2. 使用 `errors.Is` 判断 `gorm.ErrRecordNotFound`；
3. 更新和删除后根据需要检查 `RowsAffected`；
4. 不要通过结构体字段是否为零值来判断查询是否成功；
5. 为请求设置超时，避免数据库操作无限等待。

在 Web 项目中，应将请求的 `context.Context` 传给 GORM：

```go
func GetUser(ctx context.Context, db *gorm.DB, id uint) (User, error) {
    var user User

    err := db.
        WithContext(ctx).
        First(&user, id).
        Error

    return user, err
}
```

这样，当客户端取消请求或请求超时时，数据库操作也可以随之取消。

## 2.10 事务
当多个数据库操作必须同时成功或同时失败时，应使用事务。

下面以“创建订单并扣减库存”为例：

```go
type Product struct {
    ID    uint `gorm:"primaryKey"`
    Name  string
    Stock int
}

type Order struct {
    ID        uint `gorm:"primaryKey"`
    ProductID uint
    Quantity  int
    CreatedAt time.Time
}
```

```go
func CreateOrder(
    ctx context.Context,
    db *gorm.DB,
    productID uint,
    quantity int,
) error {
    if quantity <= 0 {
        return errors.New("购买数量必须大于 0")
    }

    return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        result := tx.
            Model(&Product{}).
            Where("id = ? AND stock >= ?", productID, quantity).
            Update("stock", gorm.Expr("stock - ?", quantity))

        if result.Error != nil {
            return result.Error
        }
        if result.RowsAffected == 0 {
            return errors.New("商品不存在或库存不足")
        }

        order := Order{
            ProductID: productID,
            Quantity:  quantity,
        }

        if err := tx.Create(&order).Error; err != nil {
            return err
        }

        return nil
    })
}
```

`Transaction` 的执行规则为：

- 回调返回 `nil`，事务提交；
- 回调返回错误，事务回滚；
- 事务内部必须使用回调参数 `tx`，不能继续使用外部的 `db`。

对于大多数业务代码，优先使用 `Transaction` 回调即可。手动调用 `Begin`、`Commit`、`Rollback` 和保存点属于更复杂的场景，可在需要时查阅官方文档。

## 2.11 关联查询
关联关系是 ORM 的重要能力，但入门阶段只需要先掌握模型定义和 `Preload`。

假设一个用户拥有多个订单：

```go
type User struct {
    ID     uint
    Name   string
    Orders []Order
}

type Order struct {
    ID     uint
    UserID uint
    Amount int64
}
```

查询用户并预加载订单：

```go
var user User

if err := db.
    Preload("Orders").
    First(&user, userID).
    Error; err != nil {
    return err
}
```

普通 `First` 只查询用户表，`Preload("Orders")` 会额外加载关联订单。

一对一、一对多和多对多关系的标签与约束较多，不应在基础教程中一次全部展开。实际项目遇到具体关系时，再结合官方关联文档学习更有效。

## 2.12 原生 SQL 与 SQL 注入
ORM 不能完全替代 SQL。复杂统计、数据库特有功能或性能敏感查询中，仍可能需要原生 SQL。

查询数据可以使用 `Raw`：

```go
type UserSummary struct {
    Name string
    Age  int
}

var users []UserSummary

err := db.Raw(
    "SELECT name, age FROM users WHERE age >= ?",
    18,
).Scan(&users).Error
```

执行更新或删除语句可以使用 `Exec`：

```go
result := db.Exec(
    "UPDATE users SET active = ? WHERE last_login_at < ?",
    false,
    deadline,
)
```

无论使用 GORM 查询 API 还是原生 SQL，外部数据都应通过占位符传递：

```go
// 安全：用户输入只是参数值。
db.Where("name = ?", userInput).First(&user)
```

不要将用户输入直接拼接到 SQL 中：

```go
// 危险：存在 SQL 注入风险。
db.Where(
    fmt.Sprintf("name = '%s'", userInput),
).First(&user)
```

需要特别注意：占位符只能安全绑定“值”，不能代替表名、字段名、排序方向、SQL 函数或完整 SQL 片段。动态排序和动态字段必须通过白名单映射。

GORM 日志中显示的 SQL 主要用于调试，不一定与数据库实际执行时的参数转义形式完全相同，不应将日志 SQL 当作可以直接复制执行的安全语句。

## 2.13 项目实践建议
### 2.13.1 不要把 GORM 当作 SQL 的替代品
使用 GORM 仍然需要理解主键、索引、Join、事务和查询执行计划。ORM 只是帮助生成和组织 SQL，不能自动解决错误的表结构或低效查询。

### 2.13.2 不要为每个请求创建数据库连接
应用启动时初始化一个 `*gorm.DB` 并复用，由底层 `database/sql` 连接池负责管理连接。

### 2.13.3 请求链路中使用 `WithContext`
这样才能让超时、取消和链路追踪作用于数据库操作。

### 2.13.4 开发环境观察 SQL，生产环境控制日志量
排查问题时可以针对某次操作使用：

```go
db.Debug().Where("email = ?", email).First(&user)
```

不要在高流量生产环境中长期输出所有 SQL 和参数。

### 2.13.5 生产迁移使用版本化脚本
`AutoMigrate` 适合学习和简单开发，但复杂生产变更应使用迁移工具管理版本和回滚策略。

### 2.13.6 对更新和删除保持谨慎
明确 `WHERE` 条件，检查 `RowsAffected`，并区分软删除与永久删除。

### 2.13.7 复杂查询允许回到原生 SQL
当链式 API 已经让查询变得难以阅读时，使用参数化的原生 SQL 往往更清晰，也更方便分析和优化。

## 2.14 本节小结
学习 GORM 不需要记忆全部 API。基础阶段应真正掌握以下内容：

- 初始化并复用 `*gorm.DB`，合理配置底层连接池；
- 通过结构体和常用标签定义模型；
- 使用 `Create`、`First`、`Find`、`Updates` 和 `Delete` 完成 CRUD；
- 理解结构体条件和结构体更新会忽略零值；
- 使用 `Where` 占位符传递参数，动态 SQL 结构使用白名单；
- 正确处理 `Error`、`ErrRecordNotFound` 和 `RowsAffected`；
- 使用 `Transaction` 保证多步写操作的数据一致性；
- 根据需要使用 `Preload` 和参数化原生 SQL。

复合主键、复杂迁移器、钩子、锁、优化器提示、逐行扫描和保存点等内容，只有在项目出现对应需求时再学习即可。







[toc]

## 代码注释补充

下面的说明按原文小节顺序对应所有代码块。原始 API、查询条件和模型定义保持不变；这些注释用于说明每段代码的调用边界和容易误用的地方。

### 初始化与模型

- `gorm.Open(mysql.Open(dsn), &gorm.Config{})` 只创建 GORM 句柄和底层连接池配置，真实连通性由后续 `sqlDB.PingContext` 验证。DSN 中的 `parseTime=True` 让 MySQL 时间列映射到 `time.Time`。
- `db.DB()` 取出 GORM 使用的 `*sql.DB`。连接池参数必须配置在它上面；`*gorm.DB` 不应每个请求重新创建，应用启动时初始化一次并注入业务层。
- `SetMaxOpenConns` 是单个应用实例的上限，不是全局数据库上限。实例数乘以这个值必须小于 MySQL 业务连接预算。
- 模型中的 `ID`、`CreatedAt`、`UpdatedAt` 和 `gorm.DeletedAt` 会被 GORM 的 schema 解析器识别。`gorm:"..."` 标签影响建表、列约束或索引；它不是数据库已经存在这些约束的证明，迁移和生产 schema 仍需审查。
- `DeletedAt gorm.DeletedAt` 启用软删除。常规查询会自动加上 `deleted_at IS NULL` 条件；`Unscoped` 会移除这个条件，因此必须谨慎使用。

### 迁移与创建

- `AutoMigrate(&User{})` 根据模型创建缺失的表、列和部分索引。它不会为了完全匹配当前结构体而删除历史字段，因此不能替代生产版本化迁移。
- `db.Create(&user)` 需要传指针，GORM 才能把数据库生成的主键、时间字段回填到 `user`。`result.Error` 是传统 API 的错误出口。
- `db.Create(&users)` 传入切片指针时会批量创建并回填每个元素。大批量写入需要结合数据库参数数、锁时间和 `CreateInBatches` 评估批次大小。

### 查询、条件与分页

- `Where`、`Order`、`Limit`、`Offset` 是链式构造条件；`First`、`Find`、`Count`、`Create`、`Updates`、`Delete` 才会执行 SQL。每次链式调用返回新的会话状态，避免无意修改原始 `db`。
- `First` 零行时返回 `gorm.ErrRecordNotFound`，需要 `errors.Is` 判断；`Find` 查询零行时通常返回空切片且没有该错误。这两种语义不能混用。
- 结构体条件默认忽略零值，原因是 GORM 只从非零字段构造条件。查询 `false`、`0` 或空字符串时使用 Map，或显式写 `Where("active = ?", false)`。
- 分页函数先对 `page` 和 `pageSize` 设边界，避免负 Offset、无限返回或恶意大页。`Count` 和查询列表是两次 SQL；数据量大或一致性要求高时要明确接受这种语义，或在事务/快照中处理。
- `Order` 接收 SQL 片段，不能直接接收用户输入。白名单将请求值转换成固定 `id DESC` 等片段后才可调用。

### 更新、删除与错误

- `Model(&User{}).Where(...).Update` 和 `Updates` 都应先限定 `WHERE`。`RowsAffected` 用于判断是否匹配到记录或是否真正更新，具体语义需要结合 MySQL 的更新计数规则。
- Map 更新会保留 `0`、`false` 和空字符串；结构体更新默认忽略零值。需要强制结构体零值时，用 `Select` 指定字段，避免接口中的未传字段被意外写入。
- `Delete(&User{}, userID)` 因模型含 `DeletedAt` 而成为软删除；`Unscoped().Delete` 才会物理删除。两者都要处理 `Error` 和需要时的 `RowsAffected`。
- 传统 API 的所有查询错误都保存在 `result.Error`。不要通过 `User{}` 的零值判断“是否查到数据”。
- `WithContext(ctx)` 把请求取消和超时传递到底层 `database/sql`。在 Web 服务中应使用请求的 Context，而不是随意创建 `context.Background()`。

### 事务、关联与原生 SQL

- `db.WithContext(ctx).Transaction(func(tx *gorm.DB) error { ... })` 在回调返回 `nil` 时提交，返回错误时回滚。事务内所有操作必须使用 `tx`；混用外层 `db` 会让那条 SQL 逃离事务。
- 扣库存使用 `WHERE id = ? AND stock >= ?` 与 `gorm.Expr("stock - ?", quantity)`，让条件检查与更新在一条 SQL 中完成；`RowsAffected == 0` 同时涵盖商品不存在和库存不足。
- `Preload("Orders")` 会在主查询之外加载关联数据，避免手写关联扫描，但需要关注关联数量造成的额外 SQL 和内存占用。不要把不受限制的深层预加载放进高流量接口。
- `Raw`、`Exec` 和 `Where` 都应通过 `?` 绑定外部值。`fmt.Sprintf` 拼接用户输入会绕过 GORM 的值绑定并造成 SQL 注入风险。
- `db.Debug()` 会输出 SQL 和参数信息，适合本地排查；高流量生产环境长期打开会增加日志量，并可能泄露敏感数据。

## 底层原理补充

### GORM 仍然依赖 `database/sql`

GORM 的 MySQL dialector 负责识别方言、生成 MySQL 风格 SQL 和打开驱动连接；连接池仍然由 `database/sql` 管理。调用链可以概括为：

```text
业务代码的 db.Where(...).First(...)
  → GORM 会话与 Statement
  → GORM Query 回调链构造 SQL 与变量
  → gorm.io/driver/mysql 方言与 MySQL 驱动
  → database/sql 连接池借用物理连接
  → MySQL Server
```

因此，`db.DB()` 返回的 `*sql.DB` 才是连接池参数和 `DBStats` 的入口。GORM 不会绕过 `database/sql`，也不会消除连接池、慢 SQL、锁和结果集的资源问题。

### 链式调用为何不会立刻执行 SQL

`Where`、`Order` 和 `Limit` 会复制会话状态并向 `Statement` 追加 Clause。简化的概念代码如下：

```go
func (db *DB) Where(query any, args ...any) *DB {
    next := db.getInstance() // 复制会话，避免污染原 db。
    next.Statement.AddClause(buildWhere(query, args))
    return next // 此时只积累条件，还没有发出 SQL。
}

func (db *DB) Find(dest any) *DB {
    tx := db.getInstance()
    tx.Statement.Dest = dest // 记录扫描目标。
    return tx.callbacks.Query().Execute(tx) // Query 回调链组装并执行 SQL。
}
```

回调链会根据 `Statement` 中的模型、`WHERE`、`ORDER BY`、`LIMIT` 等 Clause 生成 SQL 和参数数组，最后调用驱动。`Debug` 看到的 SQL 是这条回调链生成的调试信息；执行计划、索引选择和锁行为仍由 MySQL 决定。

### 模型标签与关联如何生效

第一次使用模型时，GORM 的 schema 解析器会通过反射读取字段、标签、主键、关联字段与表名约定，并缓存 schema。`db:"..."`、`gorm:"..."` 标签只影响映射和生成规则；表中已有的数据质量、外键策略、索引和约束仍要在数据库层验证。

`Preload("Orders")` 会先执行用户查询，再用主记录 ID 构造关联查询并把结果按照外键回填到结构体。它避免 N+1 的逐个查询，但也可能在一次请求中加载大量关联数据，因此需要按业务约束主查询范围和关联范围。

### `Transaction` 的底层边界

`Transaction` 回调内部的 `tx` 包装的是一条已开始事务的底层连接。回调返回错误时，GORM 调用回滚；返回 `nil` 时提交。它只能保证经由 `tx` 发出的语句属于同一事务，不能替业务决定隔离级别、幂等键、行锁范围或外部系统调用的补偿策略。

## 总结

GORM 的价值在于模型映射、SQL 构造和常见数据操作的统一表达；它并不取代数据库本身的规则。底层依然是 `database/sql` 和 MySQL 驱动完成连接与执行，因此连接池、参数化、错误处理、索引、事务边界和并发控制仍需要由应用明确负责。

实践中，可以让 GORM 承担模型明确、查询结构稳定的 CRUD；当查询十分复杂、需要利用特定 SQL 能力或必须精确控制语句时，使用原生 SQL 并不意味着“绕开”GORM。无论选择哪种写法，都应检查最终 SQL、传递 `Context`、处理每一次错误，并让同一业务动作中的写入处在清晰且可回滚的事务边界内。
