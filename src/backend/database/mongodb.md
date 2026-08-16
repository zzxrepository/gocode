---
title: MongoDB 文档数据库入门
shortTitle: MongoDB
order: 3
icon: simple-icons:mongodb
category:
  - 数据库
tag:
  - MongoDB
  - 文档数据库
  - CRUD
  - 索引
  - 聚合
  - 分片
---

# MongoDB 文档数据库入门

## 前言

MongoDB 是面向文档（document）的数据库。它把数据保存为 BSON 文档，并以集合（collection）组织文档。BSON 是 JSON 的二进制扩展：它保留 JSON 的对象和数组表达方式，同时支持 `ObjectId`、日期、二进制数据、整数类型等更适合数据库存储的类型。

MongoDB 的灵活文档结构适合嵌套数据较多、字段会逐步演进，或读取时希望一次取回完整聚合对象的场景，例如内容系统、商品目录、事件记录和用户配置。但“文档灵活”不等于“不需要模型设计”：查询方式、索引、字段约束、数据增长和一致性需求仍然决定了集合应如何设计。

本文以 `mongosh` 为交互式命令行为主线，目标是建立数据库、集合、文档、CRUD、索引和聚合的基础能力；最后给出 Go 服务接入 MongoDB 的最小边界。复制集、分片、变更流、Atlas Search 和复杂事务属于后续专题。

## 阅读结构

~~~mermaid
flowchart LR
    A[连接 mongosh] --> B[数据库、集合与 BSON 文档]
    B --> C[CRUD 与查询条件]
    C --> D[索引与查询计划]
    D --> E[聚合管道]
    E --> F[数据建模与 Go Driver]
~~~

| 部分 | 要解决的问题 |
| --- | --- |
| 基础对象 | 数据库、集合、文档之间是什么关系？ |
| CRUD | 如何插入、查询、更新和删除文档？ |
| 索引与聚合 | 如何让查询可扩展，并完成统计转换？ |
| 建模 | 何时嵌入文档，何时保存引用？ |
| Go 接入 | 如何复用 Client、使用 Context 并处理结果？ |

## 一、连接 MongoDB 与 `mongosh`

### 1. 确认服务与 Shell

本地服务端进程通常是 `mongod`，交互式 Shell 是 `mongosh`：

~~~bash
mongod --version
mongosh --version
~~~

本地默认连接字符串通常为：

~~~text
mongodb://127.0.0.1:27017
~~~

连接本地实例：

~~~bash
mongosh "mongodb://127.0.0.1:27017"
~~~

若目标启用了认证，应使用应用专用账户和连接字符串中的认证信息；不要把真实密码直接写进 Git 仓库或长期保留在 shell 历史中。云数据库、Docker 和本地安装的启动方式不同，但 MongoDB 客户端使用的核心都是连接字符串。

### 2. Shell 中的数据库与集合命令

进入 `mongosh` 后，可以使用：

~~~javascript
show dbs
use tutorial_db
db
show collections
~~~

| 命令 | 含义 |
| --- | --- |
| `show dbs` | 查看当前有数据的数据库 |
| `use tutorial_db` | 切换当前数据库；数据库尚不存在时只切换上下文 |
| `db` | 显示当前数据库对象 |
| `show collections` | 查看当前数据库的集合 |

MongoDB 通常在第一次向集合写入文档时创建集合，并在首次实际写入数据时创建数据库。因此执行 `use tutorial_db` 后，尚未插入数据时，`show dbs` 未必能看到它。

## 二、先建立 MongoDB 的数据模型

MongoDB 的对象层次可以理解为：

~~~text
MongoDB 部署
└── Database：例如 tutorial_db
    └── Collection：例如 users、articles
        └── Document：一条 BSON 记录
            ├── _id
            ├── 普通字段
            ├── 嵌套对象
            └── 数组
~~~

示例文档：

~~~javascript
{
  _id: ObjectId("..."),
  name: "张三",
  email: "zhangsan@example.com",
  profile: {
    city: "上海",
    level: 3
  },
  tags: ["go", "mongodb"],
  createdAt: ISODate("2026-08-16T00:00:00Z")
}
~~~

### 1. 文档、集合与关系型表的对应

| MongoDB | 关系型数据库中的近似概念 | 说明 |
| --- | --- | --- |
| Database | Database | 数据库命名空间 |
| Collection | Table | 同类文档集合，但字段不必完全一致 |
| Document | Row | 一条 BSON 记录，可包含嵌套对象和数组 |
| Field | Column | 文档字段，可按需增加 |
| `_id` | Primary Key | 每个文档必须唯一；默认使用 `ObjectId` |
| Index | Index | 用于加速查询、排序和唯一性约束 |

“近似”不表示两者完全相同。关系型表通常先定义列和约束；MongoDB 集合允许不同文档拥有不同字段。应用仍应维护清晰的数据契约，例如使用 Go 结构体、JSON Schema 校验或写入层校验来避免字段无限漂移。

### 2. `_id` 与 `ObjectId`

每个文档都必须有唯一的 `_id`。未显式提供时，MongoDB 会自动生成 `ObjectId`：

~~~javascript
db.users.insertOne({ name: "张三" })
~~~

返回结果中的 `insertedId` 就是新文档的 `_id`。也可以由应用提供字符串、UUID 或业务编号作为 `_id`，但必须保证唯一性。使用默认 `ObjectId` 时，查询单个文档应构造相同类型：

~~~javascript
db.users.findOne({ _id: ObjectId("64f000000000000000000001") })
~~~

把字符串直接与 `ObjectId` 比较不会自动转换，因此会查不到数据。

### 3. 文档灵活不等于没有约束

以下两个文档可以存在于同一个集合：

~~~javascript
{ name: "张三", city: "上海" }
{ name: "李四", phones: ["13800000000"], vip: true }
~~~

这使逐步演进字段变得方便，但也意味着查询、索引和业务代码必须处理字段缺失、类型不一致和历史数据兼容。稳定的核心字段应尽早统一命名、类型和含义；对于必须满足的写入规则，可使用集合校验或在服务层进行验证。

## 三、插入文档：Create

### 1. 插入一条文档

~~~javascript
use tutorial_db

db.users.insertOne({
  name: "张三",
  email: "zhangsan@example.com",
  age: 28,
  profile: { city: "上海", level: 3 },
  tags: ["go", "mongodb"],
  createdAt: new Date()
})
~~~

`insertOne` 返回确认结果和 `insertedId`。如果 `users` 集合不存在，首次插入会创建它。

### 2. 批量插入

~~~javascript
db.users.insertMany([
  { name: "李四", email: "lisi@example.com", age: 25, tags: ["go"] },
  { name: "王五", email: "wangwu@example.com", age: 32, tags: ["redis", "mongodb"] }
])
~~~

批量插入适合导入已验证的数据。若集合存在唯一索引，其中一条文档冲突时，具体行为还受 ordered 选项影响；导入任务应记录失败项，而不是只依赖终端输出。

## 四、查询文档：Read

### 1. `findOne` 与 `find`

~~~javascript
db.users.findOne({ email: "zhangsan@example.com" })

db.users.find({ age: { $gte: 18 } })
db.users.find({ tags: "go" })
~~~

`findOne` 返回第一个匹配文档或 `null`；`find` 返回游标（cursor），Shell 会分批读取结果。数组字段使用等值条件时，只要数组包含该值即可匹配，因此 `{ tags: "go" }` 能匹配 `["go", "mongodb"]`。

### 2. 筛选、投影、排序和分页

~~~javascript
db.users
  .find(
    { age: { $gte: 18, $lt: 30 } },
    { name: 1, email: 1, age: 1 }
  )
  .sort({ age: -1, _id: 1 })
  .limit(20)
~~~

第二个参数是投影（projection）。`1` 表示返回字段；除非显式写 `_id: 0`，`_id` 默认仍会返回：

~~~javascript
db.users.find({}, { name: 1, _id: 0 })
~~~

常见筛选运算符：

| 目标 | 示例 |
| --- | --- |
| 大于、范围 | `{ age: { $gt: 18, $lte: 30 } }` |
| 包含任一候选值 | `{ city: { $in: ["上海", "北京"] } }` |
| 不等于 | `{ status: { $ne: "deleted" } }` |
| 嵌套字段 | `{ "profile.city": "上海" }` |
| 同时满足多个条件 | `{ $and: [{ age: { $gte: 18 } }, { tags: "go" }] }` |
| 至少满足一个条件 | `{ $or: [{ city: "上海" }, { city: "北京" }] }` |

`skip` 可以实现简单页码分页：

~~~javascript
db.users.find({}).sort({ _id: 1 }).skip(40).limit(20)
~~~

但页码越深，`skip` 需要跳过的记录越多。大数据量列表通常使用基于有序字段或 `_id` 的游标分页，并配合相应索引：

~~~javascript
db.users
  .find({ _id: { $gt: ObjectId("64f000000000000000000001") } })
  .sort({ _id: 1 })
  .limit(20)
~~~

## 五、更新文档：Update

更新操作由**过滤条件**和**更新表达式**组成。不要把普通对象直接作为第二个参数传给 `updateOne`，除非明确要使用替换语义；常规局部更新应使用 `$set`、`$inc`、`$push` 等更新操作符。

~~~javascript
db.users.updateOne(
  { email: "zhangsan@example.com" },
  {
    $set: { "profile.city": "杭州" },
    $inc: { "profile.level": 1 },
    $addToSet: { tags: "backend" }
  }
)
~~~

| 操作符 | 作用 |
| --- | --- |
| `$set` | 设置或覆盖指定字段 |
| `$unset` | 删除字段 |
| `$inc` | 对数值字段增减 |
| `$push` | 向数组追加元素，可重复 |
| `$addToSet` | 向数组添加元素，但避免重复 |
| `$pull` | 从数组移除匹配元素 |

更新多条文档：

~~~javascript
db.users.updateMany(
  { tags: "go" },
  { $set: { active: true } }
)
~~~

需要“没有则创建，有则更新”时使用 `upsert`：

~~~javascript
db.settings.updateOne(
  { key: "site_name" },
  { $set: { value: "Go Tutorials", updatedAt: new Date() } },
  { upsert: true }
)
~~~

## 六、删除文档：Delete

~~~javascript
db.users.deleteOne({ email: "wangwu@example.com" })

db.users.deleteMany({ active: false })
~~~

`deleteMany({})` 会删除集合中的全部文档，适合可丢弃的本地测试数据，不应在未确认过滤条件的环境执行。删除文档不会删除集合本身；若确实需要删除整个集合：

~~~javascript
db.users.drop()
~~~

`drop` 同时删除集合的数据和索引，通常只用于测试、重建或明确的数据迁移流程。

## 七、索引：让查询条件与排序可以扩展

MongoDB 会自动为 `_id` 创建唯一索引。其他高频筛选、排序、关联查询字段通常需要应用显式建立索引。

~~~javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ "profile.city": 1, age: -1 })

db.users.getIndexes()
~~~

第一个索引保证 `email` 唯一；第二个是复合索引，适合首先按城市筛选、再按年龄排序的查询。索引字段顺序很重要：复合索引不是任意字段组合都同样高效，应从真实查询的过滤、排序与选择性出发设计。

使用 `explain` 查看查询计划：

~~~javascript
db.users
  .find({ "profile.city": "上海" })
  .explain("executionStats")
~~~

重点关注：

| 指标或阶段 | 含义 |
| --- | --- |
| `IXSCAN` | 使用索引扫描 |
| `COLLSCAN` | 全集合扫描；大集合中应重点检查 |
| `totalKeysExamined` | 扫描的索引键数量 |
| `totalDocsExamined` | 读取的文档数量 |
| `nReturned` | 最终返回的文档数量 |

索引能提升读性能和唯一性检查，但会增加写入维护成本、占用内存和磁盘。不要为每个字段都建立索引；应先根据慢查询、关键接口与执行计划验证需求。

## 八、聚合管道：在数据库中完成分组和转换

`aggregate` 接收一个由阶段组成的数组。每一阶段接收上阶段输出的文档流并继续转换：

~~~mermaid
flowchart LR
    A[Collection] --> B[$match 筛选]
    B --> C[$group 分组统计]
    C --> D[$sort 排序]
    D --> E[$project 输出字段]
    E --> F[结果文档]
~~~

假设文章文档包含 `status`、`authorId` 和 `views`，统计已发布文章的作者阅读量：

~~~javascript
db.articles.aggregate([
  { $match: { status: "published" } },
  {
    $group: {
      _id: "$authorId",
      articleCount: { $sum: 1 },
      totalViews: { $sum: "$views" }
    }
  },
  { $sort: { totalViews: -1 } },
  {
    $project: {
      _id: 0,
      authorId: "$_id",
      articleCount: 1,
      totalViews: 1
    }
  },
  { $limit: 10 }
])
~~~

| 阶段 | 作用 |
| --- | --- |
| `$match` | 尽早筛选文档，通常应尽可能放在管道前部 |
| `$group` | 按字段或表达式分组，并计算 `$sum`、`$avg`、`$max` 等 |
| `$sort` | 对中间结果排序 |
| `$project` | 控制输出字段，重命名或计算字段 |
| `$limit` | 限制结果量 |

聚合不是免成本的“数据库内循环”。`$match`、`$sort`、`$lookup` 等阶段是否能利用索引，会直接影响性能；应先减少参与管道的文档，再进行分组或复杂转换。

## 九、数据建模：嵌入还是引用

MongoDB 的关键设计决策不是“是否建表”，而是相关数据应嵌入同一文档，还是使用不同集合并保存引用。

### 1. 适合嵌入的情况

~~~javascript
{
  _id: ObjectId("..."),
  title: "MongoDB 入门",
  author: {
    id: "user-1001",
    name: "张三"
  },
  tags: ["database", "mongodb"]
}
~~~

当嵌入数据与主文档总是一起读取、数量有明确上限、更新频率低时，嵌入通常能减少一次额外查询。

### 2. 适合引用的情况

~~~javascript
{
  _id: ObjectId("..."),
  title: "MongoDB 入门",
  authorId: ObjectId("...")
}
~~~

用户、订单、评论等独立增长且会被多个对象复用的数据，更适合存入独立集合，通过 `authorId` 等字段引用。引用不代表必须每次使用 `$lookup`；许多服务会按访问模式拆分查询，或保留少量冗余的展示字段。

| 判断问题 | 倾向嵌入 | 倾向引用 |
| --- | --- | --- |
| 是否总是与主文档一起读取 | 是 | 否 |
| 子数据是否有固定且较小的上限 | 是 | 否，可能无限增长 |
| 子数据是否被多个主文档共享 | 否 | 是 |
| 子数据是否需要独立频繁更新 | 否 | 是 |

文档不能无限增长。无上限评论数组、日志数组、历史记录数组不应持续追加到同一文档；应拆分为独立集合或按时间分桶。

### 3. 用集合校验维持写入契约

MongoDB 不要求预先声明固定表结构，但可以为关键集合设置校验：

~~~javascript
db.createCollection("articles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "authorId", "createdAt"],
      properties: {
        title: { bsonType: "string", minLength: 1 },
        authorId: { bsonType: "objectId" },
        createdAt: { bsonType: "date" }
      }
    }
  }
})
~~~

校验适合防止明显错误进入数据库，但不能代替服务层的权限校验、业务规则和跨集合一致性控制。

## 十、事务与一致性边界

单个文档的写入和更新是原子的。将彼此强相关的数据设计在同一文档中，通常可以用单文档原子性解决一致性问题。

跨多个文档或集合需要“全部成功或全部失败”时，MongoDB 支持多文档事务，但事务依赖复制集或分片集群，单机独立 `mongod` 环境不具备完整条件。事务会增加锁定、重试和运行时间成本，应先考虑是否能通过数据模型把强一致更新收敛到单个文档。

## 十一、Go 服务中的连接提示

MongoDB 官方 Go Driver 当前主版本使用 `go.mongodb.org/mongo-driver/v2`。安装依赖：

~~~bash
go get go.mongodb.org/mongo-driver/v2/mongo
~~~

应用应在启动阶段创建一个 `mongo.Client` 并长期复用，而不是为每个 HTTP 请求重新连接：

~~~go
package data

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.mongodb.org/mongo-driver/v2/mongo/readpref"
)

func Connect(uri string) (*mongo.Client, error) {
	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, err
	}
	return client, nil
}

func FindUser(ctx context.Context, collection *mongo.Collection, email string) (bson.M, error) {
	var user bson.M
	err := collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	return user, err
}
~~~

| 原则 | 原因 |
| --- | --- |
| 复用 `mongo.Client` | Client 管理连接池，重复创建会增加连接开销 |
| 每次数据库调用传递 `context.Context` | 让超时、取消和链路信息向下传播 |
| 区分 `mongo.ErrNoDocuments` | `FindOne` 未找到不是普通内部错误 |
| 启动时 `Ping` | 尽早发现连接字符串、认证或网络配置错误 |
| 关闭服务时 `Disconnect` | 有序释放客户端资源 |

业务层不应直接把数据库文档原样作为 HTTP 响应。通常由 Repository 负责 MongoDB 查询与 BSON 映射，Service 负责业务规则，Controller 负责 HTTP 输入和输出。

## 十二、日常排查命令

~~~javascript
show dbs
use tutorial_db
show collections

db.users.countDocuments({})
db.users.findOne()
db.users.getIndexes()

db.users.find({ "profile.city": "上海" }).explain("executionStats")
db.stats()
~~~

排查时先确认连接的数据库和集合，再确认过滤条件的字段类型是否正确，最后查看索引与执行计划。最常见的问题不是 MongoDB “没有数据”，而是连接到了错误数据库、`ObjectId` 与字符串类型不一致、字段路径写错，或查询条件没有索引。

## 总结

MongoDB 以 BSON 文档保存数据，以集合组织文档。学习路径可以概括为：

1. 使用 `mongosh` 连接实例，理解数据库、集合、文档和 `_id`；
2. 用 `insertOne`、`find`、`updateOne`、`deleteOne` 完成 CRUD；
3. 用筛选条件、投影、排序和限制控制读取结果；
4. 为高频过滤与排序建立经过验证的索引，并通过 `explain("executionStats")` 检查执行计划；
5. 使用聚合管道完成筛选、分组、排序和结果转换；
6. 按访问模式选择嵌入或引用，并为关键集合维护数据契约；
7. 在 Go 服务中复用 Client，并把 Context 传给每次数据库调用。

MongoDB 的灵活性来自文档模型，但性能和可维护性仍来自明确的查询模式、受控的数据增长、合适的索引和清晰的应用层边界。

## 参考资料

- [MongoDB Shell CRUD Operations](https://www.mongodb.com/docs/mongodb-shell/crud/)
- [MongoDB 官方索引文档](https://www.mongodb.com/docs/manual/indexes/)
- [MongoDB 官方聚合管道文档](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)
- [MongoDB 官方数据建模文档](https://www.mongodb.com/docs/manual/data-modeling/)
- [MongoDB Go Driver 官方文档](https://www.mongodb.com/docs/drivers/go/current/)
