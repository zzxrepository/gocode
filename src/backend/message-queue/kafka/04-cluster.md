---
title: Kafka 集群
shortTitle: 04. 集群
order: 4
category:
  - 消息队列
  - Kafka
tag:
  - Kafka
  - Go
  - Java
---

# Kafka 集群

## 前言

单节点能够演示 API，却不能验证节点故障后的副本接管。这个实验在本机启动三个独立 KRaft 进程，使用三副本订单 Topic，观察 Leader、ISR 和写入门槛。

## KRaft 与数据副本

Controller 仲裁维护集群元数据，Broker 承担分区数据的读写与复制。两者解决不同问题：元数据仲裁可用不代表任意分区都还有可用 Leader，分区副本存活也不能替代 Controller 多数派。

三个 Controller 通常可容忍一个不可用。实验为了节省资源让每个节点同时承担 broker/controller；生产部署通常需要根据负载和故障隔离要求分离角色。

脚本使用 Kafka 4.3 仍支持的静态 `controller.quorum.voters` 建立固定三节点实验。动态仲裁、Controller 成员变更有独立的初始化和管理步骤，不能把单节点 `--standalone` 格式化流程直接套用到同一个三节点集群。

## Leader、Follower 与 ISR

分区 Leader 接收写入，Follower 从 Leader 复制。ISR 是满足同步条件的副本集合，包含 Leader。落后或失联的副本可能移出 ISR，恢复后需要追赶才能重新加入。

本实验设置：

```properties
# 每个订单分区有三份副本，至少两个 ISR 才允许 all 确认写入。
default.replication.factor=3
min.insync.replicas=2
```

生产者使用 `acks=all`。健康时三个 ISR 都确认；失去一个副本后还可以在满足门槛时写入；只剩一个 ISR 时写入应该失败。副本总数并不保证 ISR 一直满足要求。

`unclean.leader.election.enable=false` 是当前默认值，不允许为了恢复服务而随意选举一个落后的非同步副本。打开它可能增加可用性，也可能造成已确认数据丢失，不能写成无代价的优化。

## 独立三节点环境

进入本章 Go 或 Java 项目，二选一启动集群。两个 demo 的脚本相同、各自独立，但端口相同，因此不能同时启动两套。

```bash
python3 scripts/cluster.py start
python3 scripts/cluster.py status

export KAFKA_BROKERS=127.0.0.1:19192,127.0.0.1:19292,127.0.0.1:19392
export KAFKA_TOPIC="orders.c04.$(date +%s)"

# 服务启动后先检查元数据是否可访问。
kafka-topics --bootstrap-server "$KAFKA_BROKERS" --list
./run.sh init --partitions 3 --replicas 3
./run.sh produce --orders 3
./run.sh inspect
```

数据、配置、日志和 PID 位于本项目 `.cache/cluster/`，客户端端口为 19192、19292、19392，Controller 端口为 19193、19293、19393。脚本检测端口冲突后会停止，不会接管 9092 上已有的服务。各数据目录只在首次创建时格式化，重启沿用原集群 ID。

`inspect` 应显示每个分区的三个 Replicas 与三个 ISR。Leader 可能分散在不同节点上。

## 故障实验

先查看某个分区的 Leader，再停止对应实验节点，例如节点 1：

```bash
# PID 来自本 demo 创建的进程；操作前可用 cluster.py status 核对。
kill -TERM "$(cat .cache/cluster/1/pid)"

# 等待故障检测和选主后再观察。
./run.sh inspect
./run.sh produce --orders 1 --prefix after-failure
```

新 Leader 应在仍同步的副本中选出，ISR 可能暂时缩为两个。选主期间发送可能短暂重试；结果取决于重试期限和故障恢复时间，不能要求每次都完全无感。

如果再停止第二个 combined 节点，会同时破坏 Controller 多数派和数据副本门槛。因此这个实验不能用来单独证明 min ISR 的效果。要隔离验证写入门槛，可以在健康集群中临时把**实验 Topic** 的门槛设为 4：

```bash
kafka-configs --bootstrap-server "$KAFKA_BROKERS" \
  --alter --entity-type topics --entity-name "$KAFKA_TOPIC" \
  --add-config min.insync.replicas=4
# all 确认无法满足门槛，应失败。
./run.sh produce --orders 1 --prefix rejected
# 恢复实验配置。
kafka-configs --bootstrap-server "$KAFKA_BROKERS" \
  --alter --entity-type topics --entity-name "$KAFKA_TOPIC" \
  --add-config min.insync.replicas=2
```

先恢复健康三节点再执行门槛实验。故障测试后停止仍存活的节点，确认端口释放，再运行 start 恢复全部节点；原有数据不删除。

```bash
python3 scripts/cluster.py stop
python3 scripts/cluster.py status
```

## 控制器与分区运维

元数据状态可通过 `kafka-metadata-quorum --bootstrap-server "$KAFKA_BROKERS" describe --status` 观察。分区副本分配、Leader 选择与 Controller 仲裁状态应分别检查。

增加 Broker 不会自动把已有所有分区均匀搬过去。副本重新分配需要明确的迁移计划，并观察复制流量、磁盘与 ISR。实验不在本机已有集群上执行自动迁移。

## 完整示例

- [Go + Sarama](https://github.com/zzxrepository/gocode-examples/tree/3c68a4c19fdc89a392400a0350e7a334018aad90/message-queue/kafka/go/04-cluster-demo)
- [Java 官方客户端](https://github.com/zzxrepository/gocode-examples/tree/3c68a4c19fdc89a392400a0350e7a334018aad90/message-queue/kafka/java/04-cluster-demo)

两个目录均包含完整源码、独立依赖文件、运行脚本和测试入口。命令在所选 demo 目录执行；运行其他 demo 时重新进入对应目录。

## 总结

Kafka 高可用由元数据仲裁、分区复制、选主策略和写入确认共同构成。三副本是常见部署选择，不是普通 Topic 固定的默认值，也不能替代真实故障验证。

## 参考资料

- [Apache Kafka 4.3：kraft](https://kafka.apache.org/43/operations/kraft/)
- [Apache Kafka 4.3：broker-configs](https://kafka.apache.org/43/configuration/broker-configs/)
- [IBM Sarama 1.60.0](https://pkg.go.dev/github.com/IBM/sarama@v1.60.0)

> 本文沿用 [dunwu 的 Kafka 教程](https://dunwu.github.io/bigdata-tutorial/kafka/) 的主题结构，按 Kafka 4.3.1 重写技术说明并补充订单实验。改编文档继续采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)；完整代码及验证结果以所链接的示例提交为准。
