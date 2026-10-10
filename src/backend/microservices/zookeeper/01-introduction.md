---
title: ZooKeeper 入门
shortTitle: 入门
description: ZooKeeper 基础概念的阅读摘要，梳理数据模型、会话、Watch 与一致性边界。
order: 1
category:
  - 分布式系统
  - ZooKeeper
tag:
  - ZooKeeper
  - ZNode
  - Watch
---

# ZooKeeper 入门

## 内容摘要

ZooKeeper 是分布式协调服务。应用通过共享少量状态并监听其变化，实现配置更新、成员管理和选主等功能。

数据以树形结构组织，每个节点称为 ZNode，可保存数据与状态信息。常见节点包括持久节点、临时节点，以及它们的顺序节点形式。顺序节点的编号由父节点维护，不应理解成跨所有路径的全局编号。

客户端通过会话与服务端交互。Watch 用于通知节点变化，通知本身不携带更新后的完整数据，客户端需要重新读取。

## 理解边界

- 临时节点随会话结束或过期而删除，短暂的网络断开不等于会话过期。
- 普通 Watch 触发后需要重新注册；ZooKeeper 3.6.0 起还支持持久 Watch，不能笼统地说所有监听都是一次性的。
- 不同客户端并不保证在任意时刻读到完全相同的数据，普通读取可能得到较旧的状态。

## 参考资料

- 原文：[牧小农《Zookeeper入门看这篇就够了》](https://www.cnblogs.com/mingyueyy/p/15353154.html)，2021-09-29。
- 官方文档：[ZooKeeper 3.9.4 Programmer's Guide](https://zookeeper.apache.org/doc/r3.9.4/zookeeperProgrammers.html)。
