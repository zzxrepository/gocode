---
title: ZooKeeper 集群部署
shortTitle: 集群部署
description: ZooKeeper 集群部署的阅读摘要，梳理部署模式、多数派与配置检查要点。
order: 2
category:
  - 分布式系统
  - ZooKeeper
tag:
  - ZooKeeper
  - 集群部署
  - 高可用
---

# ZooKeeper 集群部署

## 内容摘要

单机模式适合基础实验；伪集群在一台机器上启动多个实例，可验证选举和通信，但无法抵御宿主机故障。需要高可用时，应将实例部署到独立的故障域。

在默认多数派配置下，集群需要超过半数的投票节点正常通信。三个投票节点可以容忍一个节点故障，五个可以容忍两个。奇数是成本与容错能力之间的常见选择，并非协议强制要求。

## 部署检查要点

- 各节点配置一致的集群成员列表，`dataDir` 下的 `myid` 对应本机的 `server.N` 编号。
- `clientPort` 用于客户端连接；`server.N` 中的两个端口分别用于节点间同步通信与选举。
- 同机启动多个实例时，数据目录和监听端口必须隔离；生产数据目录应使用持久存储。
- 按实际通信需求配置网络访问规则，检查进程状态、角色和日志，并验证故障切换。

## 参考资料

- 原文：[牧小农《Zookeeper 集群部署的那些事儿》](https://www.cnblogs.com/mingyueyy/p/15402379.html)，2021-10-13。
- 官方文档：[ZooKeeper 3.9.4 Administrator's Guide](https://zookeeper.apache.org/doc/r3.9.4/zookeeperAdmin.html)。
