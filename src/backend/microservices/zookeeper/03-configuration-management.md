---
title: ZooKeeper 分布式配置管理
shortTitle: 分布式配置管理
description: ZooKeeper 配置管理的阅读摘要，梳理读取、监听、刷新与连接恢复流程。
order: 3
category:
  - 分布式系统
  - ZooKeeper
tag:
  - ZooKeeper
  - 配置管理
  - Watch
---

# ZooKeeper 分布式配置管理

## 内容摘要

配置管理可以利用 ZNode 保存配置，由应用读取并维护本地副本，再通过 Watch 感知更新。通知表达的是“状态发生变化”，应用仍需读取数据并完成校验后再更新本地配置。

## 读取与刷新流程

1. 建立会话后读取配置，同时注册监听。
2. 收到变化通知后重新读取；使用普通 Watch 时同步重新注册。
3. 节点不存在时，通过 `exists` 监听创建事件，避免只依赖数据变化通知。
4. 连接恢复后重新核对配置；会话过期后重建会话及所需监听。

## 使用边界

Watch 不是逐条保存变更的消息队列。两次读取之间可能发生多次修改，业务应围绕当前状态刷新，不能依赖收到每一次中间变化。应用还需明确配置缺失、格式错误和连接中断时的处理方式。

## 参考资料

- 原文：[牧小农《ZooKeeper分布式配置——看这篇就够了》](https://www.cnblogs.com/mingyueyy/p/15431845.html)，2021-10-21。
- 官方文档：[ZooKeeper 3.9.4 Programmer's Guide：Watches](https://zookeeper.apache.org/doc/r3.9.4/zookeeperProgrammers.html#ch_zkWatches)。
