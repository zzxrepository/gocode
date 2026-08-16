---
title: Redis 缓存与常用场景
shortTitle: Redis
order: 2
icon: gauge-high
category:
  - 数据库
tag:
  - Redis
  - 缓存
  - 数据结构
  - 缓存策略
  - 持久化
  - 高可用
---

# Redis：连接、数据类型与基础命令

## 前言

Redis 是以内存为主的数据存储系统。它常用于缓存、登录会话、计数器、排行榜、分布式锁和消息队列，但并不只是“一个缓存”：Redis 提供字符串、哈希、列表、集合、有序集合等数据结构，并允许对这些结构做原子操作。

本文是面向本地开发的快速入门。目标是能够启动 Redis、连接客户端、理解键和值、使用五种最常见的数据类型，并知道如何安全地查看和清理测试数据。持久化、复制、哨兵、集群和缓存策略会在后续专题中展开。

## 先学会读 Redis 命令语法

Redis 命令按空格分隔参数，第一项始终是命令名，之后各项的位置有固定含义。后文使用以下模板记号：

| 写法 | 含义 | 实际输入时怎么写 |
| --- | --- | --- |
| `SET`、`HGET`、`SCAN` | 命令名 | 原样写在第一位；Redis 命令不区分大小写，教程统一大写 |
| `key`、`value`、`field`、`member` | 占位符 | 改成真实 Key、值、Hash 字段或集合成员，不能照抄 |
| `[ ... ]` | 可选部分 | 方括号不输入；只有需要该能力时才写其中参数 |
| `a \| b` | 二选一 | 选择一个选项，不输入竖线 |
| `...` | 可重复部分 | 前一个参数组可以重复，例如 `key value [key value ...]` |

例如 `HSET key field value [field value ...]` 应读作：先指定整个 Hash 的 Key，再指定一个字段和它的值；后面还可以继续追加“字段、值”成对参数。实际命令 `HSET user:1001:profile name 张三 city 上海` 一次写入了 `name` 和 `city` 两个字段。参数顺序不可调换：`HSET name user:1001:profile 张三` 会把 `name` 当成 Key，而不是字段。

## 一、启动、停止与连接

### 1. 确认命令是否可用

~~~bash
redis-server --version
redis-cli --version
~~~

Homebrew 安装的 Redis 默认使用 `6379` 端口。以服务方式运行时可使用：

~~~bash
brew services start redis
brew services stop redis
brew services restart redis
brew services list
~~~

仅为了临时实验，也可以直接前台启动：

~~~bash
redis-server
~~~

前台进程停止后，Redis 也会退出；日常开发通常更适合使用 `brew services start redis`。

### 2. 验证服务

~~~bash
redis-cli ping
~~~

返回 `PONG` 说明客户端已连接到本机的 `127.0.0.1:6379`。连接被拒绝通常表示 Redis 尚未启动、端口不一致，或服务绑定了其他地址。

### 3. 连接命令

~~~bash
# 本机默认地址
redis-cli

# 指定主机和端口
redis-cli -h 127.0.0.1 -p 6379

# 指定数据库编号，默认是 0
redis-cli -n 1

# 需要密码时，不建议把密码留在终端历史中
REDISCLI_AUTH='your-password' redis-cli -h 127.0.0.1 -p 6379
~~~

进入交互式客户端后，提示符通常是：

~~~text
127.0.0.1:6379>
~~~

使用 `QUIT` 退出。Redis 默认有编号为 `0` 到 `15` 的逻辑数据库；开发时可以用不同编号隔离不同应用，但生产环境通常优先用独立实例或 Key 前缀隔离。

## 二、先建立三个基本概念

Redis 的数据以 `key -> value` 保存。Key 是二进制安全字符串；Value 的实际类型由第一个写入命令决定。

~~~text
user:1001:name       -> string
user:1001:profile    -> hash
article:hot          -> zset
~~~

建议的 Key 命名规则：

1. 用冒号表达层级，例如 `app:session:<token>`；
2. 名称描述业务而不是实现，例如 `user:42:profile`；
3. 为缓存或会话设置过期时间；
4. 不用 `KEYS *` 扫描生产实例，使用 `SCAN`。

## 三、Key 通用命令：不依赖具体数据类型

String、Hash、List、Set、Sorted Set 的操作命令不同，但每个 Redis Key 都可以进行存在性检查、类型查看、过期控制、删除、改名和渐进式扫描。这些命令属于 Key 空间管理，不依赖 Value 的具体数据类型。

### 1. 查看 Key 是否存在、类型和生存时间

命令语法：

~~~text
EXISTS key [key ...]
TYPE key
TTL key | PTTL key
EXPIRETIME key
~~~

逐项理解参数与返回值：

- `EXISTS key [key ...]` 中第一个及后续 `key` 都是待检查的 Key，返回的是“存在的参数个数”，不是布尔值。例如 `EXISTS a b c` 可能返回 `2`；重复传入同一个已存在 Key 会按传入次数计数。
- `TYPE key` 只接受一个 Key，返回其底层类型。Key 不存在时返回 `none`，而不是报错。
- `TTL key` 与 `PTTL key` 都只接受一个 Key；前者返回剩余秒数，后者返回剩余毫秒数。正数是剩余时间，`-1` 表示 Key 存在但未设置过期时间，`-2` 表示 Key 不存在。
- `EXPIRETIME key` 返回预计过期时的 Unix 秒级时间戳；它是“什么时候过期”，而 `TTL` 是“还剩多久”。

下面再使用用户资料 Key 作为示例：

~~~redis
EXISTS user:1001:profile
TYPE user:1001:profile

TTL user:1001:profile
PTTL user:1001:profile
EXPIRETIME user:1001:profile
~~~

| 命令 | 返回或作用 |
| --- | --- |
| `EXISTS key [key ...]` | 返回存在的 Key 数量 |
| `TYPE key` | 返回 `string`、`hash`、`list`、`set`、`zset` 或 `none` |
| `TTL key` / `PTTL key` | 返回剩余秒数 / 毫秒数 |
| `EXPIRETIME key` | 返回过期的 Unix 秒级时间戳（Redis 7.0+） |

`TTL` 和 `PTTL` 的特殊返回值相同：正数表示剩余时间，`-1` 表示 Key 存在但永不过期，`-2` 表示 Key 不存在。

### 2. 设置、更新和取消过期时间

命令语法：

~~~text
EXPIRE key seconds [NX | XX | GT | LT]
PEXPIRE key milliseconds [NX | XX | GT | LT]
EXPIREAT key unix_seconds [NX | XX | GT | LT]
PERSIST key
~~~

`key` 必须已经存在；`seconds`、`milliseconds` 和 `unix_seconds` 分别表示相对秒、相对毫秒、绝对 Unix 时间。`PERSIST` 没有时间参数，它移除 Key 的 TTL。

方括号内四个条件选项不是一起叠加使用，而是从中选择至多一个：

| 选项 | 只有在什么条件下才设置新 TTL |
| --- | --- |
| `NX` | Key 当前没有 TTL |
| `XX` | Key 当前已经有 TTL |
| `GT` | 新 TTL 比当前 TTL 更长 |
| `LT` | 新 TTL 比当前 TTL 更短 |

若给出的时间小于等于 0，Redis 会立即删除这个 Key，而不是保存一个“零秒 TTL”。这些命令返回 `1` 表示成功设置或移除 TTL，返回 `0` 表示 Key 不存在或条件选项不满足。下面的命令展示不同时间表示法：

~~~redis
EXPIRE session:token-demo 1800
PEXPIRE session:token-demo 5000
EXPIREAT session:token-demo 1760000000

PERSIST session:token-demo
~~~

`EXPIRE` 以秒设置 TTL，`PEXPIRE` 以毫秒设置，`EXPIREAT` 使用 Unix 时间戳；`PERSIST` 移除 TTL，使 Key 恢复为永久 Key。若新建的是 String，优先在 `SET` 时同时设置过期时间：

~~~redis
SET session:token-demo 1001 EX 1800
~~~

这样写入值和设置 TTL 是同一条原子命令，避免 `SET` 成功后、`EXPIRE` 执行前进程异常而留下永久缓存。

Redis 7.0+ 的 `EXPIRE` 还支持条件选项：

~~~redis
EXPIRE session:token-demo 1800 NX
EXPIRE session:token-demo 3600 XX
~~~

`NX` 只给当前没有 TTL 的 Key 设置过期时间；`XX` 只更新已经有 TTL 的 Key。它们适合需要区分“首次加过期”与“续期”的场景。

### 3. 删除、改名与复制 Key

命令语法：

~~~text
DEL key [key ...]
UNLINK key [key ...]
RENAME key newkey
RENAMENX key newkey
COPY source destination [DB destination_db] [REPLACE]
~~~

`DEL key [key ...]` 与 `UNLINK key [key ...]` 中每个参数都是独立 Key，返回实际删除的数量；不存在的 Key 不计入结果。`RENAME key newkey` 的前一个参数是源 Key，后一个是新名称：源不存在会报错，目标存在会被覆盖。`RENAMENX` 的参数顺序相同，但目标已经存在时返回 `0`，不会覆盖。`COPY source destination ...` 也按“源、目标”顺序；`DB destination_db` 表示目标逻辑数据库编号，`REPLACE` 才允许覆盖已有目标 Key。

~~~redis
DEL greeting
UNLINK user:1001:profile

RENAME config:theme config:theme:old
RENAMENX config:lang config:lang:backup
COPY source:key target:key
~~~

| 命令 | 适用场景 |
| --- | --- |
| `DEL` | 同步删除一个或多个 Key；普通小 Key 的默认选择 |
| `UNLINK` | 异步回收实际内存；删除大 Key 时更友好 |
| `RENAME` | 覆盖目标 Key 并改名；应确认目标是否允许被覆盖 |
| `RENAMENX` | 仅目标 Key 不存在时改名，避免意外覆盖 |
| `COPY` | 复制 Key 到新名称；适合迁移或构造测试数据 |

改名或复制不等于修改业务数据模型。尤其是 `RENAME` 会覆盖已有目标 Key，执行前应确认命名空间与目标是否安全。

### 4. 遍历 Key 空间：使用 `SCAN`，谨慎使用 `KEYS`

命令语法：

~~~text
SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]
KEYS pattern
~~~

`cursor` 是扫描进度标记，不是偏移量或页码：第一次必须传 `0`，之后必须把响应中的新游标原样传回，直到新游标再次为 `0`。`MATCH pattern` 使用 glob 模式而非正则表达式，例如 `user:*` 匹配以 `user:` 开头的 Key；`COUNT count` 只是建议 Redis 每轮工作的数量，不保证恰好返回 count 个 Key；`TYPE type` 可把候选结果限定为 `string`、`hash` 等类型。

~~~redis
SCAN 0 MATCH user:* COUNT 100
~~~

`SCAN` 返回下一次扫描游标和一批 Key。把返回的游标作为下一次命令的第一个参数，直到游标重新变为 `0`：

~~~text
SCAN 0 MATCH user:* COUNT 100
  -> cursor 17, keys [...]

SCAN 17 MATCH user:* COUNT 100
  -> cursor 0, keys [...]
~~~

`COUNT` 是提示值而不是精确数量；在遍历期间 Key 可能被新增、删除或重复返回，因此 SCAN 适合运维查看、迁移和后台渐进处理，不应把它当成强一致分页 API。

不要在生产实例的常规请求路径中使用：

~~~redis
KEYS *
~~~

`KEYS` 必须遍历整个 Key 空间，大数据量时可能长时间阻塞 Redis。Redis 官方建议对未知规模的 Key 空间使用增量式 `SCAN`。

## 四、String：最常用的字符串值

String 可保存文本、整数、JSON 字符串或序列化后的对象。计数器特别适合使用 String。

常用命令语法：

~~~text
SET key value [NX | XX] [EX seconds | PX milliseconds]
GET key
INCR key | INCRBY key increment | DECR key
MSET key value [key value ...]
MGET key [key ...]
~~~

`SET key value ...` 的前两个参数分别是 Key 和完整值，值中有空格时在 redis-cli 中需要加引号。`NX` 和 `XX` 是互斥的写入条件；`EX seconds` 与 `PX milliseconds` 也是互斥的 TTL 表示。满足条件时 `SET` 返回 `OK`，条件不满足时返回空结果（nil），这样可以用一条命令实现“仅首次写入”的互斥锁雏形。

`GET key` 只能读取 String，Key 不存在时返回 nil；若 Key 实际是 Hash 等其他类型，会返回 `WRONGTYPE`。`INCR key` 相当于把一个整数 String 加 1；不存在的 Key 从 0 开始，非整数内容则报错。`INCRBY key increment` 的 `increment` 可以为负数。`MSET key value [key value ...]` 必须保持“Key、值”成对出现，`MGET key [key ...]` 按传入 Key 的顺序返回对应值。

~~~redis
SET greeting "hello redis"
GET greeting

SET app:token:abc "user-1001" EX 3600
TTL app:token:abc

INCR page:view:home
INCRBY page:view:home 10
DECR stock:book:42

MSET config:theme dark config:lang zh-CN
MGET config:theme config:lang
~~~

`SET ... EX 3600` 在写入时同时设置一小时过期时间，适合验证码、会话和缓存。不要先 `SET` 再单独 `EXPIRE`，否则在两条命令之间发生异常会留下无过期的 Key。

## 五、Hash：一个 Key 下的一组字段

Hash 适合保存对象的少量字段，例如用户资料、商品简要信息。它避免把每个字段都拆成独立 Key。

常用命令语法：

~~~text
HSET key field value [field value ...]
HGET key field
HMGET key field [field ...]
HGETALL key
HINCRBY key field increment
HDEL key field [field ...]
~~~

`key` 指向整个 Hash，`field` 是 Hash 内部字段，`value` 是字段值。`HSET` 的参数必须是“Key + 若干 field/value 对”；它返回本次新建字段的数量，覆盖已有字段不计为新建。Hash 的 TTL 只能设置在整个 Key 上，不能单独给一个 `field` 设置 TTL。

`HGET key field` 读取一个字段；`HMGET key field [field ...]` 依传入字段顺序返回多个值；`HGETALL key` 返回所有字段和值的交替列表，因此只适用于字段数量可控的对象。`HINCRBY` 只对某个字段中的整数做增减，字段不存在时按 0 处理。

~~~redis
HSET user:1001:profile name "张三" city "上海" level 3
HGET user:1001:profile name
HMGET user:1001:profile name city level
HGETALL user:1001:profile

HINCRBY user:1001:profile level 1
HDEL user:1001:profile city
HLEN user:1001:profile
~~~

`HGETALL` 会返回全部字段，不适合字段极多或未知大小的 Hash；这类场景可使用 `HSCAN` 分批读取。

## 六、List：有顺序、允许重复的元素

List 是双端链表，可从左或右推入、弹出。常见用途是简单队列、任务缓冲和最近访问记录。

常用命令语法：

~~~text
LPUSH key element [element ...]
RPUSH key element [element ...]
LPOP key [count] | RPOP key [count]
LRANGE key start stop
LLEN key
~~~

`LPUSH key element [element ...]` 与 `RPUSH` 的 `key` 是整个列表，后面的每个 `element` 都会写入；前者从左端插入，后者从右端插入。`LPOP key [count]` 中的 `count` 可省略：省略时返回一个元素，写出时返回最多 count 个元素。`RPOP` 的规则相同但从右端取。

`LRANGE key start stop` 的 `start`、`stop` 是包含两端的下标，`0` 是第一个元素，`-1` 是最后一个元素。因此 `LRANGE queue 0 -1` 是读取全部元素，`LRANGE queue 0 9` 是读取前十个。读取范围不会删除元素。

~~~redis
LPUSH queue:email task-1 task-2
RPUSH queue:email task-3
LRANGE queue:email 0 -1

LPOP queue:email
RPOP queue:email
LLEN queue:email
~~~

`LPUSH` / `LPOP` 组合像栈；`RPUSH` / `LPOP` 组合像先进先出队列。需要可靠消费、消费者组和消息确认时，应考虑 Redis Streams 或专业消息队列。

## 七、Set：无序且不重复的成员

Set 自动去重，适合标签、权限、在线用户和集合关系判断。

常用命令语法：

~~~text
SADD key member [member ...]
SMEMBERS key
SISMEMBER key member
SREM key member [member ...]
SCARD key
SINTER key [key ...]
~~~

`SADD key member [member ...]` 的第一个参数是 Set Key，之后都是成员；重复成员不会重复保存，返回值是本次实际新增的数量。`SISMEMBER key member` 返回 `1` 或 `0`；`SREM` 返回实际移除的数量；`SCARD` 返回成员总数。`SINTER key [key ...]` 的所有参数都是 Set Key，不是成员，它返回这些集合共有的成员。

~~~redis
SADD article:42:tags redis golang database redis
SMEMBERS article:42:tags
SISMEMBER article:42:tags golang
SREM article:42:tags database
SCARD article:42:tags

SADD user:1001:roles reader writer
SADD user:1002:roles reader
SINTER user:1001:roles user:1002:roles
~~~

`SMEMBERS` 会一次返回全部成员；大集合应使用 `SSCAN`。

## 八、Sorted Set：带分数的有序集合

Sorted Set（ZSet）中的成员不重复，每个成员关联一个浮点数分数。Redis 按分数排序，因此它很适合排行榜、优先级队列和按时间范围筛选。

常用命令语法：

~~~text
ZADD key score member [score member ...]
ZRANGE key start stop [WITHSCORES]
ZREVRANGE key start stop [WITHSCORES]
ZINCRBY key increment member
ZSCORE key member
ZREMRANGEBYSCORE key min max
~~~

`ZADD key score member [score member ...]` 中，`key` 是排行榜，之后必须严格按“分数、成员”成对出现；顺序不能写反。`score` 必须是数字，`member` 在同一个 ZSet 中唯一，重复添加同一成员会更新分数。返回值默认是本次新增成员数，而不是分数被更新的数量。

`ZRANGE key start stop [WITHSCORES]` 与 `ZREVRANGE` 的 `start`、`stop` 都是排名下标，不是分数范围；`WITHSCORES` 是可选输出开关，写出后返回结果会在每个成员后附带分数。`ZINCRBY key increment member` 用增量更新一个成员的分数并返回新分数；`ZRANK` 返回从低分开始的名次。

~~~redis
ZADD leaderboard 98 alice 86 bob 100 carol
ZREVRANGE leaderboard 0 2 WITHSCORES
ZRANGE leaderboard 0 -1 WITHSCORES

ZINCRBY leaderboard 5 bob
ZSCORE leaderboard bob
ZRANK leaderboard alice
ZREMRANGEBYSCORE leaderboard -inf 60
~~~

`ZREVRANGE` 从高分到低分读取排行榜；`ZRANGE` 从低分到高分读取。Redis 6.2 之后，部分命令支持更统一的 `ZRANGE ... REV` 写法，但阅读已有项目时仍会经常见到 `ZREVRANGE`。

## 九、数据库级清理与日常排查

Key 的删除与扫描属于通用命令；下面的命令作用于当前逻辑数据库或整个实例，风险更高。

命令语法：

~~~text
DBSIZE
FLUSHDB [ASYNC | SYNC]
FLUSHALL [ASYNC | SYNC]
~~~

`DBSIZE` 没有参数，返回当前逻辑数据库的 Key 总数。`FLUSHDB` 只处理当前逻辑数据库，`FLUSHALL` 处理实例全部逻辑数据库。方括号中的 `ASYNC \| SYNC` 表示二选一：`SYNC` 让删除和内存回收同步完成，`ASYNC` 先从 Key 空间移除数据、再异步回收内存；无论哪种方式，业务数据都会立刻不可再访问。

本地测试示例：

~~~redis
DBSIZE
FLUSHDB
~~~

`DBSIZE` 返回当前逻辑数据库的 Key 数量。`FLUSHDB` 会清空**当前**逻辑数据库，适合明确确认过的本地测试环境。

~~~redis
FLUSHALL
~~~

`FLUSHALL` 会清空实例中的所有逻辑数据库。除非目标是可丢弃的本地测试实例，否则不应执行。排查线上问题时，优先使用 `TYPE`、`TTL`、`SCAN` 和精确的业务 Key，而不是清理命令。

## 十、一次完整练习

下面用 Redis 模拟登录会话与文章浏览量：

~~~redis
SET session:token-demo 1001 EX 1800
GET session:token-demo
TTL session:token-demo

HSET user:1001 name "张三" role "writer"
HGETALL user:1001

INCR article:42:views
INCR article:42:views
GET article:42:views

ZADD article:rank 2 42
ZINCRBY article:rank 1 42
ZREVRANGE article:rank 0 9 WITHSCORES
~~~

这组命令展示了一个常见组合：String 保存带 TTL 的会话与计数器，Hash 保存对象字段，ZSet 保存排行榜。

## 十一、Go 项目中的连接提示

Go 常用客户端是 `github.com/redis/go-redis/v9`。连接对象应在应用启动时创建一次并复用，而不是每个请求新建一个 Client：

~~~go
client := redis.NewClient(&redis.Options{Addr: "127.0.0.1:6379", DB: 0})
if err := client.Ping(ctx).Err(); err != nil {
    return err
}
~~~

业务代码应通过 `context.Context` 执行命令，以便超时、取消和链路追踪能够向下传递。

## 总结

Redis 的快速上手路径是：启动服务并用 `redis-cli ping` 验证连接；先掌握 String、Hash、List、Set、Sorted Set；为缓存和会话设置 TTL；使用 `SCAN` 而不是 `KEYS *` 查看未知规模的数据。

选择数据结构时不必追求“Redis 命令越多越好”。只要能根据数据是否有字段、是否需要顺序、是否需要去重、是否需要按分数排序作出选择，就已经能够覆盖大多数本地开发场景。

## 参考资料

- [Redis 官方 Key 空间管理文档](https://redis.io/docs/latest/develop/using-commands/keyspace/)
- [Redis 官方命令参考](https://redis.io/docs/latest/commands/)
