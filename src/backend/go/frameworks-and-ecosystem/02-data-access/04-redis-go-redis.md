---
permalink: /backend/go/frameworks-and-ecosystem/02-data-access/04-redis-go-redis/
title: 04. Redis：使用 go-redis 客户端
shortTitle: 04. Redis 与 go-redis
order: 4
category:
  - Go
  - Golang 框架与生态
  - 数据访问
tag:
  - Go
  - Redis
  - go-redis
  - 缓存
  - 数据访问
---

# 04. Redis：使用 go-redis 客户端

## 前言

Redis 常被用于缓存、会话、限流、分布式锁和消息队列。Go 程序通常使用 `github.com/redis/go-redis/v9` 与 Redis 通信。它直接实现 Redis 协议，不经过 `database/sql`，因为 Redis 不是关系型数据库，也不使用 SQL。

缓存代码最重要的不是 `Get` 和 `Set` 的语法，而是缓存未命中、过期、更新和故障时业务如何保持正确。下面以用户资料的 cache-aside 模式说明这条边界。

## 创建并复用客户端

```bash
go get github.com/redis/go-redis/v9
```

`redis.Client` 内部维护连接池，应在应用启动时创建并复用：

```go
package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

func OpenRedis(addr, password string, database int) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password, // 密码应来自配置或密钥管理，不写入源码。
		DB:           database,
		DialTimeout:  2 * time.Second,
		ReadTimeout:  2 * time.Second,
		WriteTimeout: 2 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close() // 启动检查失败时主动释放连接池。
		return nil, fmt.Errorf("ping Redis: %w", err)
	}
	return client, nil
}
```

进程退出时调用一次 `client.Close()`。不要在每个请求结束时创建和关闭客户端，这会丢失连接复用并增加 Redis 压力。

## Cache-Aside：先读缓存，未命中再读数据库

cache-aside 的核心流程是：先读缓存；未命中则读数据库；成功后回填带 TTL 的缓存。`redis.Nil` 表示键不存在，不是 Redis 连接错误。

```go
type User struct {
	ID       int64  `json:"id"`
	Nickname string `json:"nickname"`
}

type UserRepository interface {
	FindByID(ctx context.Context, userID int64) (User, error)
}

type UserCache struct {
	redis *redis.Client
	repo  UserRepository
}

func (c *UserCache) FindByID(ctx context.Context, userID int64) (User, error) {
	key := fmt.Sprintf("user:profile:%d", userID)

	encoded, err := c.redis.Get(ctx, key).Bytes()
	if err == nil {
		var user User
		if err := json.Unmarshal(encoded, &user); err != nil {
			// 缓存内容损坏时删除它，随后回源数据库重建。
			_ = c.redis.Del(ctx, key).Err()
		} else {
			return user, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		// 缓存不可用不应让只读请求直接失败；记录后继续读主存储。
		log.Printf("read Redis cache: %v", err)
	}

	user, err := c.repo.FindByID(ctx, userID)
	if err != nil {
		return User{}, err
	}

	encoded, err = json.Marshal(user)
	if err == nil {
		// TTL 防止缓存永久陈旧；具体时长由数据更新频率和容量决定。
		if err := c.redis.Set(ctx, key, encoded, 10*time.Minute).Err(); err != nil {
			log.Printf("write Redis cache: %v", err)
		}
	}
	return user, nil
}
```

这个模式里，数据库仍是事实来源，Redis 是可重建的加速层。缓存命中可减少数据库压力；缓存故障时回源数据库，服务仍能提供正确数据，只是延迟和数据库负载会上升。

## 更新数据后删除缓存

更新用户资料时，先提交数据库事务，再删除缓存键。下一次读取会回源并写入新值：

```go
func (c *UserCache) UpdateNickname(ctx context.Context, userID int64, nickname string) error {
	if err := c.repo.UpdateNickname(ctx, userID, nickname); err != nil {
		return err // 主存储更新失败时，不删除旧缓存。
	}

	key := fmt.Sprintf("user:profile:%d", userID)
	if err := c.redis.Del(ctx, key).Err(); err != nil {
		// 删除失败应记录并告警；TTL 会作为最后一道过期保护。
		log.Printf("invalidate Redis cache: %v", err)
	}
	return nil
}
```

“更新数据库后删除缓存”通常比同时更新两份数据简单可靠。需要更强一致性、跨服务失效或高并发回填控制时，还要结合消息队列、版本号或互斥机制设计。

## Pipeline 与事务不是一回事

Pipeline 将多条命令一次发给 Redis，减少网络往返；它不自动提供原子性：

```go
commands, err := client.Pipelined(ctx, func(pipe redis.Pipeliner) error {
	pipe.Incr(ctx, "page:views")          // 两条命令一起发送，减少 RTT。
	pipe.Expire(ctx, "page:views", time.Hour)
	return nil
})
if err != nil {
	return err
}
_ = commands // 逐条命令的结果也应按业务需要检查。
```

需要原子读改写时，应使用 Redis 事务、Lua 脚本或其他适当的 Redis 原子命令。不要因为 Go 代码按顺序写了两条命令，就假定它们在并发环境下一定原子执行。

## 总结

`go-redis` 是 Redis 的第三方 Go 客户端，与 `database/sql` 无关。应用应复用 `redis.Client`，为每条命令传递 `context` 和超时，区分 `redis.Nil` 与真实错误，并把缓存当作可失效、可重建的副本。缓存设计的关键是数据源、失效策略和故障回退，而不是单纯调用 `Get`、`Set`。

## 参考资料

- [go-redis 项目文档](https://github.com/redis/go-redis)
- [Redis 官方文档](https://redis.io/docs/latest/)
