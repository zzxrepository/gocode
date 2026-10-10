---
title: ZooKeeper 分布式锁
shortTitle: 分布式锁
description: ZooKeeper 分布式锁的阅读摘要，梳理临时顺序节点、前驱监听与异常处理。
order: 4
category:
  - 分布式系统
  - ZooKeeper
tag:
  - ZooKeeper
  - 分布式锁
  - 临时顺序节点
---

# ZooKeeper 分布式锁

## 内容摘要

单进程锁无法协调不同进程对共享资源的访问。ZooKeeper 锁的一种常见实现，是在同一持久父节点下创建临时顺序节点，用节点顺序决定竞争者的先后。

## 获取与释放流程

1. 每个竞争者创建自己的临时顺序节点。
2. 获取子节点列表，按顺序后缀比较；序号最小者获得锁。
3. 其余竞争者只监听紧邻自己的前驱节点，避免所有等待者同时被唤醒。
4. 前驱删除后重新检查排序。若注册监听时前驱已不存在，应立即重试检查，不能继续等待。
5. 使用完毕后删除自己的节点，释放锁。

## 异常处理

创建请求超时不代表创建失败，应借助请求标识检查节点是否已经存在。排序使用的是顺序节点后缀，不是事务编号 `zxid`。

会话过期会清理临时节点；短暂断线不会立即释放锁。连接状态不确定时，业务不能继续假定自己持锁。锁的节点状态也不能自动阻止旧进程继续访问外部资源。

## 参考资料

- 原文：[牧小农《ZK（ZooKeeper）分布式锁实现》](https://www.cnblogs.com/mingyueyy/p/15455673.html)，2021-10-24。
- 官方文档：[ZooKeeper 3.9.4 Recipes and Solutions：Locks](https://zookeeper.apache.org/doc/r3.9.4/recipes.html#sc_recipes_Locks)。
- 官方文档：[ZooKeeper 3.9.4 Programmer's Guide：Sessions](https://zookeeper.apache.org/doc/r3.9.4/zookeeperProgrammers.html#ch_zkSessions)。
