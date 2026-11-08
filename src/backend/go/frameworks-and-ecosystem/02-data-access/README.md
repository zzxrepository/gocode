---
title: 02. 数据访问
shortTitle: 02. 数据访问
order: 2
dir:
  link: true
  collapsible: true
  order: 2
icon: database
category:
  - Go
  - Golang 框架与生态
  - 数据访问
tag:
  - Go
  - database/sql
  - MySQL
  - sqlx
  - ORM
  - GORM
  - Redis
  - 数据库
---

# 02. 数据访问

Go 程序访问数据存储时，需要处理驱动、连接池、查询、事务、模型映射和缓存一致性等问题。本专题涵盖 MySQL 驱动、`sqlx`、GORM 与 Redis 客户端的使用边界。

## MySQL 数据访问

1. [Go MySQL 数据访问：database/sql 与 sqlx](/backend/go/frameworks-and-ecosystem/02-data-access/01-sqlx/)：理解驱动、连接池、参数化 SQL、结果扫描与事务，再用 `sqlx` 简化字段映射和参数处理。
2. [Go MySQL 数据访问：GORM](/backend/go/frameworks-and-ecosystem/02-data-access/02-gorm/)：通过模型与链式 API 组织 CRUD、关联查询和事务，理解 ORM 生成 SQL 的过程。

## 各层负责什么

| 层次 | 主要职责 | SQL 如何提供 |
| --- | --- | --- |
| `database/sql` 与 MySQL 驱动 | 标准库管理连接池、语句、结果集和事务，驱动实现 MySQL 协议 | 应用编写 SQL |
| `sqlx` | 扩展标准库，提供结构体映射、命名参数与切片参数展开 | 应用编写 SQL |
| GORM | 提供模型映射、SQL 构造、关联与迁移等 ORM 能力 | 由 Go API 构造，也支持原生 SQL |

这些库处理 Go 程序与数据库之间的数据访问。Gin 等 Web 框架处理 HTTP 请求、路由和中间件；GORM 可以与不同 Web 框架或命令行程序配合使用，因此统一归入“数据访问”。
