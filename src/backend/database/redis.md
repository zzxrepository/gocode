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

查看某个 Key 的类型与生存时间：

~~~redis
TYPE user:1001:profile
TTL user:1001:profile
EXISTS user:1001:profile
~~~

`TTL` 返回秒数：正数表示剩余时间，`-1` 表示永不过期，`-2` 表示 Key 不存在。

## 三、String：最常用的字符串值

String 可保存文本、整数、JSON 字符串或序列化后的对象。计数器特别适合使用 String。

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

## 四、Hash：一个 Key 下的一组字段

Hash 适合保存对象的少量字段，例如用户资料、商品简要信息。它避免把每个字段都拆成独立 Key。

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

## 五、List：有顺序、允许重复的元素

List 是双端链表，可从左或右推入、弹出。常见用途是简单队列、任务缓冲和最近访问记录。

~~~redis
LPUSH queue:email task-1 task-2
RPUSH queue:email task-3
LRANGE queue:email 0 -1

LPOP queue:email
RPOP queue:email
LLEN queue:email
~~~

`LPUSH` / `LPOP` 组合像栈；`RPUSH` / `LPOP` 组合像先进先出队列。需要可靠消费、消费者组和消息确认时，应考虑 Redis Streams 或专业消息队列。

## 六、Set：无序且不重复的成员

Set 自动去重，适合标签、权限、在线用户和集合关系判断。

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

## 七、Sorted Set：带分数的有序集合

Sorted Set（ZSet）中的成员不重复，每个成员关联一个浮点数分数。Redis 按分数排序，因此它很适合排行榜、优先级队列和按时间范围筛选。

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

## 八、过期、删除与安全查看

缓存和会话通常必须过期。常用命令如下：

~~~redis
EXPIRE app:token:abc 3600
EXPIREAT app:token:abc 1760000000
PERSIST app:token:abc

DEL greeting
UNLINK user:1001:profile
~~~

`DEL` 同步删除数据；`UNLINK` 把实际内存回收交给后台线程，对大 Key 更友好。开发环境可以清空当前逻辑数据库：

~~~redis
FLUSHDB
~~~

`FLUSHALL` 会清空实例中所有逻辑数据库，除非确认目标是本地测试实例，否则不要执行。

查看 Key 时使用渐进式扫描：

~~~redis
SCAN 0 MATCH user:* COUNT 100
~~~

将上次返回的游标再次传入，直到游标回到 `0`。`SCAN` 不会像 `KEYS *` 一样一次阻塞整个实例。

## 九、一次完整练习

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

## 十、Go 项目中的连接提示

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
