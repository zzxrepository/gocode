---
title: ZooKeeper
shortTitle: ZooKeeper
order: 4
dir:
  link: true
  collapsible: true
  order: 4
icon: network-wired
category:
  - 分布式系统
  - ZooKeeper
tag:
  - ZooKeeper
  - 分布式协调
---

# ZooKeeper

ZooKeeper 为分布式应用提供协调能力，常用于配置管理、服务发现、选主与分布式锁。

这里收录四篇阅读摘要，按基础概念、部署、配置管理和分布式锁的顺序组织。各篇文末保留原文入口及用于核对技术细节的官方资料。

| 文章 | 内容 |
| --- | --- |
| [ZooKeeper 入门](./01-introduction.md) | 数据模型、会话、Watch 与一致性边界 |
| [ZooKeeper 集群部署](./02-cluster-deployment.md) | 部署模式、多数派、节点配置与运行检查 |
| [ZooKeeper 分布式配置管理](./03-configuration-management.md) | 配置读取、变更通知与连接恢复 |
| [ZooKeeper 分布式锁](./04-distributed-lock.md) | 临时顺序节点、前驱监听与异常处理 |
