---
permalink: /backend/go/frameworks-and-ecosystem/02-data-access/02-sqlx/
title: 01. Go MySQL 数据访问：database/sql 与 sqlx
shortTitle: 01. database/sql 与 sqlx
order: 1
category:
  - Go
  - Golang 框架与生态
  - 数据访问
tag:
  - Go
  - database/sql
  - sqlx
  - MySQL
  - SQL
  - 连接池
  - 事务
---

# 01. Go MySQL 数据访问：database/sql 与 sqlx

## 前言

能执行一条 SELECT，并不代表已经掌握了数据库访问。真实项目还必须处理连接复用、请求取消、结果集释放、事务一致性和并发写入。一个错误的连接池生命周期或一次遗漏的 Rows.Close，往往比 SQL 语法更早造成线上问题。

这里使用一个可运行的下单扣库存项目建立完整认识：先创建商品；下单时锁定商品库存；库存足够才扣减；最后创建订单和订单明细。任一步失败，前面的修改必须全部撤销。

配套代码：[gocode-examples/go/01-database-sql-demo](https://github.com/zzxrepository/gocode-examples/tree/7068d075e04e9e1f6ad3e245b7cca721b6cca05b/go/01-database-sql-demo)。链接固定到源码提交，文章中的文件和函数都能直接定位到可运行项目。

项目使用 Go 1.26.5，模块固定了 go-sql-driver/mysql v1.10.0 与 sqlx v1.4.0。版本升级时，应以自身 go.mod 和依赖项目的兼容性声明为准。

## 阅读结构

内容按照代码实际运行的因果顺序组织：先运行项目，接着解释标准库代码，然后沿着已调用的路径阅读驱动、连接池和 sqlx 的原理。

| 部分 | 核心问题 | 关键对象 |
| --- | --- | --- |
| Demo 主线 | 下单时程序具体做了什么 | 商品、订单、库存 |
| 初始化 | 谁创建连接池，怎样验证 MySQL | sql.DB、DSN、PingContext |
| 基础读写 | 怎样写入、查询一行和查询多行 | ExecContext、QueryRowContext、Rows |
| 事务 | 怎样避免超卖和部分写入 | Tx、FOR UPDATE、Commit、Rollback |
| 底层原理 | 调用如何进入连接池和驱动 | sql.Register、Connector、DB.conn |
| sqlx | sqlx 省略了什么，保留了什么 | GetContext、NamedExecContext、sqlx.In |

下单业务的主链：

~~~text
创建商品
  -> 锁定商品库存
  -> 扣减库存
  -> 创建订单
  -> 创建订单明细
  -> Commit

任一步失败 -> Rollback -> 前面执行过的写入全部撤销
~~~

## 先运行完整 Demo

项目提供两个入口。第一个只用 database/sql；第二个使用 sqlx 完成同一业务，便于比较两者的边界。

~~~text
01-database-sql-demo/
├── cmd/database-sql-demo/main.go  标准库下单流程
├── cmd/sqlx-demo/main.go          sqlx 下单流程
├── internal/store/mysql.go         驱动配置与连接池
├── internal/store/product.go       商品 CRUD
├── internal/store/order.go         标准库事务下单
├── internal/store/sqlx.go          sqlx CRUD 与事务下单
├── scripts/docker-compose.yml      MySQL 容器
└── scripts/schema.sql              表结构
~~~

在 examples 项目目录执行：

~~~bash
# 启动 MySQL；首次创建数据卷时会自动执行 schema.sql。
make docker-up

# 运行只使用 database/sql 的版本。
make run

# 运行 sqlx 版本。
make run-sqlx

# 执行不依赖 MySQL 的输入校验测试，并检查所有包。
make test
~~~

[标准库入口](https://github.com/zzxrepository/gocode-examples/blob/7068d075e04e9e1f6ad3e245b7cca721b6cca05b/go/01-database-sql-demo/cmd/database-sql-demo/main.go) 的关键动作是：

~~~go
db, err := store.OpenMySQL(ctx, mysqlConfig())
if err != nil {
    log.Fatal(err)
}
defer db.Close() // 只在进程退出时关闭连接池。

product, err := store.CreateProduct(ctx, db, store.CreateProductInput{
    SKU:        fmt.Sprintf("keyboard-sql-%d", time.Now().UnixNano()),
    Name:       "database/sql 机械键盘",
    PriceCents: 39900,
    Stock:      10,
})

orderID, err := store.PlaceOrder(ctx, db, store.PlaceOrderInput{
    CustomerID: 10001,
    ProductID:  product.ID,
    Quantity:   2,
})
~~~

预期可以观察到库存变化：

~~~text
创建商品: id=1 stock=10
下单成功: order_id=1; 下单后库存=8
~~~

程序运行可分成两个阶段：

~~~text
启动阶段
  配置驱动 -> 创建 sql.DB 连接池 -> PingContext 验证真实连接

业务阶段
  从连接池借连接 -> 执行 SQL -> 归还连接
  或 BeginTx -> 同一连接执行多条 SQL -> Commit 或 Rollback
~~~

## 三层数据访问栈

~~~text
业务 Store
   │
   ├─ database/sql：sql.DB、sql.Tx、sql.Rows
   │       │
   │       └─ database/sql/driver 接口
   │                 │
   │                 └─ go-sql-driver/mysql：认证、MySQL 协议、网络 I/O
   │
   └─ sqlx：包装 sql.DB 和 sql.Tx，增加映射与绑定能力
~~~

database/sql 是标准库提供的通用访问模型。它不理解 MySQL 协议，也没有内置 MySQL 驱动。go-sql-driver/mysql 实现标准库定义的 driver 接口，负责与 MySQL 建立连接、认证、发送查询和解码结果。

sqlx 不在驱动下面。它建立在 database/sql 之上，主要补充三类高频操作：

- 将查询列映射到结构体字段；
- 由结构体或 map 绑定命名参数；
- 展开 IN 查询中的切片参数，并按照驱动的占位符风格改写 SQL。

因此，即使用了 sqlx，Context、连接池、Rows.Close、事务和锁的规则也完全不变。

## 连接池：sql.DB 不是一条连接

[internal/store/mysql.go](https://github.com/zzxrepository/gocode-examples/blob/7068d075e04e9e1f6ad3e245b7cca721b6cca05b/go/01-database-sql-demo/internal/store/mysql.go) 将驱动配置和连接池创建集中在启动阶段：

~~~go
driverCfg := mysql.NewConfig()
driverCfg.User = cfg.User
driverCfg.Passwd = cfg.Password
driverCfg.Net = "tcp"
driverCfg.Addr = cfg.Address
driverCfg.DBName = cfg.Database

// DATETIME 需要由驱动解析为 Go 的 time.Time。
driverCfg.ParseTime = true
driverCfg.Loc = time.Local

// 连接级网络超时；它们不同于一次 SQL 的 Context 超时。
driverCfg.Timeout = 3 * time.Second
driverCfg.ReadTimeout = 5 * time.Second
driverCfg.WriteTimeout = 5 * time.Second

db, err := sql.Open("mysql", driverCfg.FormatDSN())
~~~

sql.Open 返回 sql.DB。它是并发安全的连接池句柄，并不表示已经取得了一条可以永久使用的连接。下面的每请求 Open 是错误做法：

~~~go
func handleRequest(ctx context.Context) error {
    db, err := sql.Open("mysql", dsn)
    if err != nil {
        return err
    }
    defer db.Close()
    return db.PingContext(ctx)
}
~~~

每次请求都创建新池，连接无法复用，MySQL 连接数也会迅速膨胀。项目只创建一个池，并控制其容量和连接寿命：

~~~go
db.SetMaxOpenConns(20)              // 单个实例最多占用 20 条物理连接。
db.SetMaxIdleConns(20)              // 保留可立即复用的空闲连接。
db.SetConnMaxLifetime(3 * time.Minute)
db.SetConnMaxIdleTime(time.Minute)
~~~

这不是固定最佳值。10 个实例都设置 20，MySQL 最坏就可能接收 200 条连接。连接池大小必须结合实例数量、max_connections、慢查询和实际等待指标配置。

sql.Open 通常不会立即拨号，所以项目随后执行：

~~~go
if err := db.PingContext(ctx); err != nil {
    _ = db.Close()
    return nil, fmt.Errorf("ping MySQL: %w", err)
}
~~~

PingContext 会从池借连接或新建连接，才能在启动阶段发现地址、密码、网络或 MySQL 服务的问题。业务查询本身会借连接，不应在每次查询前额外 Ping。

## database/sql 基础读写

### 写入：ExecContext 和参数绑定

[CreateProduct](https://github.com/zzxrepository/gocode-examples/blob/7068d075e04e9e1f6ad3e245b7cca721b6cca05b/go/01-database-sql-demo/internal/store/product.go) 使用 ExecContext 执行 INSERT：

~~~go
result, err := db.ExecContext(ctx,
    "INSERT INTO products (sku, name, price_cents, stock) VALUES (?, ?, ?, ?)",
    input.SKU, input.Name, input.PriceCents, input.Stock,
)
if err != nil {
    return Product{}, fmt.Errorf("insert product: %w", err)
}
id, err := result.LastInsertId()
~~~

每个问号只能绑定一个值。驱动会对值进行编码，外部输入不会被解释为 SQL 语法。不能拼接用户输入：

~~~go
// 错误：name 若来自请求，会成为 SQL 文本的一部分。
query := "SELECT id FROM products WHERE name = '" + name + "'"
~~~

占位符不能替代表名、列名和排序方向。这些 SQL 结构若要动态变化，只能从程序维护的白名单选择。

LastInsertId 在 MySQL AUTO_INCREMENT 场景可用；跨数据库项目应审查目标驱动是否具有相同语义。

### 单行：QueryRowContext 的错误在 Scan 时出现

GetProduct 的核心：

~~~go
err := db.QueryRowContext(ctx,
    "SELECT id, sku, name, price_cents, stock, created_at FROM products WHERE id = ?",
    id,
).Scan(
    &product.ID,
    &product.SKU,
    &product.Name,
    &product.PriceCents,
    &product.Stock,
    &product.CreatedAt,
)
if errors.Is(err, sql.ErrNoRows) {
    return Product{}, ErrProductNotFound
}
~~~

QueryRowContext 返回延迟取值的 Row。SQL 语法错误、网络错误和没有记录都会在 Scan 时报告，因此必须检查 Scan 的结果。

Scan 的目标顺序必须和 SELECT 列顺序一致。明确列名比 SELECT 星号稳定：表新增字段不会悄悄改变读取接口，代码审查也能发现列与字段不匹配的问题。

### 多行：QueryContext、Rows.Close 和 Rows.Err

ListProducts 展示完整模式：

~~~go
rows, err := db.QueryContext(ctx,
    "SELECT id, sku, name, price_cents, stock, created_at FROM products ORDER BY id")
if err != nil {
    return nil, fmt.Errorf("query products: %w", err)
}
defer rows.Close()

for rows.Next() {
    var product Product
    if err := rows.Scan(
        &product.ID, &product.SKU, &product.Name,
        &product.PriceCents, &product.Stock, &product.CreatedAt,
    ); err != nil {
        return nil, fmt.Errorf("scan product row: %w", err)
    }
    products = append(products, product)
}
if err := rows.Err(); err != nil {
    return nil, fmt.Errorf("iterate product rows: %w", err)
}
~~~

Rows 不是普通切片迭代器。它可能还在读取 MySQL 结果集，并占用池中的物理连接。Close 保证提前返回时也释放资源；Rows.Err 捕获 Next 拉取后续数据时发生的网络和解码错误。

## 事务下单：一致性来自事务边界

[PlaceOrder](https://github.com/zzxrepository/gocode-examples/blob/7068d075e04e9e1f6ad3e245b7cca721b6cca05b/go/01-database-sql-demo/internal/store/order.go) 是项目的核心。它先开始事务：

~~~go
tx, err := db.BeginTx(ctx, nil)
if err != nil {
    return 0, fmt.Errorf("begin order transaction: %w", err)
}
defer func() { _ = tx.Rollback() }()
~~~

sql.Tx 绑定连接池中的一条连接。Commit 前，所有需要原子执行的查询和写入必须使用 tx 的方法。若库存更新使用 tx、订单插入误用外层 db，订单插入就不属于这个事务。

下单前锁定目标商品：

~~~go
err = tx.QueryRowContext(ctx,
    "SELECT price_cents, stock FROM products WHERE id = ? FOR UPDATE",
    input.ProductID,
).Scan(&priceCents, &stock)
if stock < input.Quantity {
    return 0, ErrInsufficientStock
}
~~~

FOR UPDATE 是 InnoDB 事务内的排他行锁。并发下单者尝试锁定同一商品时只能等待当前事务完成，或因 Context 超时退出。扣库存时仍带库存条件并检查影响行数：

~~~go
result, err := tx.ExecContext(ctx,
    "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
    input.Quantity, input.ProductID, input.Quantity,
)
affected, err := result.RowsAffected()
if affected != 1 {
    return 0, ErrInsufficientStock
}
~~~

同一个 tx 随后写入 orders 和 order_items，最后才 Commit。任意 INSERT 或 UPDATE 失败，defer 中的 Rollback 会撤销前面已成功的写入。Commit 成功后 Rollback 只会得到 sql.ErrTxDone，忽略即可。

事务应尽量短。不要在锁住商品后调用第三方 HTTP、等待用户输入或执行无关慢查询；这些操作会延长锁持有时间，也会减少连接池可用连接。

## 用过 API 后，再阅读底层调用链

### 驱动如何被找到

MySQL 驱动初始化时注册自己的名字：

~~~go
func init() {
    sql.Register("mysql", &MySQLDriver{})
}
~~~

所以 sql.Open 的第一个参数 mysql 是驱动注册名。若只想触发注册，不使用驱动导出的 Config，可以空白导入：

~~~go
import _ "github.com/go-sql-driver/mysql"
~~~

### Open 为什么不一定建立连接

标准库的关键逻辑可以缩略为：

~~~go
func Open(driverName, dsn string) (*DB, error) {
    driverImpl := drivers[driverName]
    if driverCtx, ok := driverImpl.(driver.DriverContext); ok {
        connector, err := driverCtx.OpenConnector(dsn)
        if err != nil {
            return nil, err
        }
        return OpenDB(connector), nil
    }
    return OpenDB(dsnConnector{dsn: dsn, driver: driverImpl}), nil
}

func OpenDB(connector driver.Connector) *DB {
    db := &DB{connector: connector}
    go db.connectionOpener(context.Background())
    return db
}
~~~

OpenDB 保存 Connector、空闲连接和等待队列等池状态。真正执行业务时，标准库按下列顺序借连接：

~~~go
func (db *DB) conn(ctx context.Context) (*driverConn, error) {
    if idle := db.takeIdleConnection(); idle != nil {
        return idle, nil
    }
    if db.openCount >= db.maxOpen {
        return db.waitForConnection(ctx)
    }
    return db.connector.Connect(ctx)
}
~~~

先复用空闲连接；达到 MaxOpenConns 就等待；有配额才进入 MySQL 驱动拨号和认证。Context 能取消池等待，也能向支持 Context 的驱动传递取消信号。它不是无条件终止服务端 SQL 的魔法开关，最终行为仍取决于驱动和 MySQL。

标准库提供 DBStats 观察池：

~~~go
stats := db.Stats()
log.Printf("open=%d in_use=%d idle=%d wait_count=%d wait_duration=%s",
    stats.OpenConnections,
    stats.InUse,
    stats.Idle,
    stats.WaitCount,
    stats.WaitDuration,
)
~~~

WaitCount 持续增长时，先排查未关闭的 Rows、长事务、慢查询和锁等待。直接增大连接数常常只是把排队从应用移到 MySQL。

## sqlx：同一 Demo 的更简洁表达

[sqlx 入口](https://github.com/zzxrepository/gocode-examples/blob/7068d075e04e9e1f6ad3e245b7cca721b6cca05b/go/01-database-sql-demo/cmd/sqlx-demo/main.go) 先创建标准库连接池，再用 NewSQLX 包装：

~~~go
baseDB, err := store.OpenMySQL(ctx, mysqlConfig())
if err != nil {
    log.Fatal(err)
}
defer baseDB.Close()

db := store.NewSQLX(baseDB)
~~~

包装函数只有一行：

~~~go
func NewSQLX(db *sql.DB) *sqlx.DB {
    return sqlx.NewDb(db, "mysql")
}
~~~

这不会创建第二个连接池。sqlx.DB 内嵌原始 sql.DB，连接上限、Stats、Context 和事务规则仍来自标准库。

### 结构体映射

[GetProductSQLX](https://github.com/zzxrepository/gocode-examples/blob/7068d075e04e9e1f6ad3e245b7cca721b6cca05b/go/01-database-sql-demo/internal/store/sqlx.go) 用 GetContext 取代手写 Scan：

~~~go
var product Product
err := db.GetContext(ctx, &product,
    "SELECT id, sku, name, price_cents, stock, created_at FROM products WHERE id = ?",
    id,
)
if errors.Is(err, sql.ErrNoRows) {
    return Product{}, ErrProductNotFound
}
~~~

Product 的字段通过 db tag 对应列名。GetContext 的源码逻辑本质上仍是查询一行再扫描：

~~~go
func GetContext(ctx context.Context, q QueryerContext, dest interface{},
    query string, args ...interface{}) error {
    r := q.QueryRowxContext(ctx, query, args...)
    return r.scanAny(dest, false)
}
~~~

所以 sql.ErrNoRows、Context、连接池与驱动错误语义完全不变。SelectContext 适合大小受控的列表，它内部遍历、映射并关闭 Rows；大量导出仍应使用 QueryxContext 流式读取。

联表查询有重名列时必须起别名，例如 order_id、product_id 和 product_name。不要使用 db.Unsafe 静默跳过找不到字段的列；映射错误越早暴露越安全。

### 命名参数与 IN

sqlx 的命名参数让长写入更易读：

~~~go
result, err := db.NamedExecContext(ctx,
    "INSERT INTO products (sku, name, price_cents, stock) VALUES (:sku, :name, :price_cents, :stock)",
    input,
)
~~~

对 MySQL，它会根据结构体的 db tag 取值，再改写为问号占位符与参数切片。它仍只绑定值，不能绑定表名、列名和排序方向。

一个占位符不能直接装下切片。项目使用 sqlx.In：

~~~go
query, args, err := sqlx.In(
    "SELECT id, sku, name, price_cents, stock, created_at FROM products WHERE id IN (?) ORDER BY id",
    ids,
)
if err != nil {
    return nil, err
}
query = db.Rebind(query)
~~~

sqlx.In 将切片展开为多个占位符；Rebind 将 SQL 调整为当前驱动的风格。MySQL 使用问号，PostgreSQL 等驱动会使用数字占位符。空切片必须提前返回，不能生成 IN ()。

### sqlx 事务仍是标准库事务

[PlaceOrderSQLX](https://github.com/zzxrepository/gocode-examples/blob/7068d075e04e9f6ad3e245b7cca721b6cca05b/go/01-database-sql-demo/internal/store/sqlx.go) 用 BeginTxx、GetContext 和 NamedExecContext 改写了同一业务流程：

~~~go
tx, err := db.BeginTxx(ctx, nil)
if err != nil {
    return 0, err
}
defer func() { _ = tx.Rollback() }()

err = tx.GetContext(ctx, &locked,
    "SELECT price_cents, stock FROM products WHERE id = ? FOR UPDATE",
    input.ProductID,
)

result, err := tx.NamedExecContext(ctx,
    "UPDATE products SET stock = stock - :quantity WHERE id = :product_id AND stock >= :quantity",
    params,
)
~~~

sqlx 不会自动开启事务，也不会自动避免超卖。无论使用 sql.Tx 还是 sqlx.Tx，所有原子操作都必须通过同一个 tx 执行、检查错误并显式 Commit。

## 选择与检查清单

| 场景 | 优先选择 |
| --- | --- |
| 字段很少，需要精确控制 Scan | database/sql |
| 大量手写 SQL、字段和写入参数较多 | sqlx |
| 大结果集导出 | QueryContext 或 QueryxContext 流式处理 |
| 多条写入需要一致性 | BeginTx 或 BeginTxx |
| 动态表名、列名、排序规则 | 代码白名单 |

- 全进程复用一个 sql.DB；sqlx 包装它而不是重新 Open。
- 使用带 Context 的查询、写入和事务 API。
- 每一个 Rows 都关闭，并在迭代结束后检查 Rows.Err。
- 外部值使用占位符；SQL 结构只能来自白名单。
- 事务中只使用 tx，保持事务短小，为死锁重试设计幂等性。
- 使用 DBStats、慢查询和锁等待调优连接池。
- sqlx 查询写清列名、tag 和联表别名，不用 Unsafe 掩盖映射错误。

## 总结

Go 访问 MySQL 不是单个查询函数，而是一条协作链：驱动实现 MySQL 协议，database/sql 管理连接池、资源与事务，sqlx 在其上减少结构体映射和参数绑定的样板代码。

下单 Demo 先展示如何运行，再将代码拆解为连接池、CRUD、事务、驱动注册和 sqlx 重构。理解这条因果链后，既能写出可读的数据库代码，也能在并发、超时和资源耗尽时准确定位问题。

## 参考资料

- [配套 Demo README](https://github.com/zzxrepository/gocode-examples/blob/7068d075e04e9f6ad3e245b7cca721b6cca05b/go/01-database-sql-demo/README.md)
- [Go 官方：访问关系型数据库](https://go.dev/doc/database/)
- [Go 官方：打开数据库句柄与连接池](https://go.dev/doc/database/open-handle)
- [Go 标准库 database/sql 源码](https://go.dev/src/database/sql/sql.go)
- [go-sql-driver/mysql 文档](https://github.com/go-sql-driver/mysql)
- [sqlx 项目文档](https://github.com/jmoiron/sqlx)
