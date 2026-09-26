---
title: Kafka
shortTitle: Kafka
order: 3
dir:
  link: true
  collapsible: true
  order: 3
icon: tower-broadcast
category:
  - 消息队列
  - Kafka
tag:
  - Kafka
  - Go
---

# Kafka

以订单事件贯穿 Kafka 核心机制：创建订单、发送支付事件、更新状态、汇总金额。每个主题都提供可单独运行的 Go 与 Java 项目，并包含运行命令和预期结果。

## 教程目录

| 章节 | 内容 |
| --- | --- |
| [01 快速入门](./01-quickstart.html) | 事件协议、Topic、跨语言读写 |
| [02 生产者](./02-producer.html) | 同步与异步发送、确认、幂等和分区 |
| [03 消费者](./03-consumer.html) | 消费组、手动提交与再均衡 |
| [04 集群](./04-cluster.html) | 三节点 KRaft、副本和故障切换 |
| [05 可靠传输](./05-reliability.html) | 事务、MySQL 幂等与 Outbox |
| [06 存储](./06-storage.html) | 压缩 Topic、快照和 Tombstone |
| [07 流式处理](./07-stream-processing.html) | 事件时间聚合与 Java Kafka Streams |
| [08 运维](./08-operations.html) | 消费积压、位点重置和监控 |

## 版本与源码

- Kafka 4.3.1，使用 KRaft；服务端与 Java 示例要求 JDK 17+。
- Go 1.25+，IBM Sarama 1.60.0。
- Java 官方 kafka-clients 4.3.1，Maven 3.9.x；流处理另含 Kafka Streams 实验。
- 数据库可靠性实验使用 MySQL，其他基础实验不依赖数据库。

[完整示例仓库](https://github.com/zzxrepository/gocode-examples/tree/3c68a4c19fdc89a392400a0350e7a334018aad90/message-queue/kafka) 按 `kafka/go/章节-demo` 和 `kafka/java/章节-demo` 组织。每章独立维护依赖、运行脚本、配置样例与验证脚本；代码链接固定到与文章对应的提交。

两种语言共用 JSON 事件、订单 Key 和 CRC32 分区规则。Go 内存窗口聚合用于理解事件时间；Java Kafka Streams 额外演示有状态拓扑、事务输出与恢复，不将两者描述为相同的框架能力。

## 来源与许可

本组教程以 [dunwu（钝悟）的 BIGDATA-TUTORIAL](https://dunwu.github.io/bigdata-tutorial/kafka/) 的主题结构为基础，按 Kafka 4.3.1 重写技术正文、命令与示例，增加双语言订单实验和真实服务验证。

改编文档继续采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)；新增程序代码采用示例仓库中的 MIT 许可。原导入的 33 张图片及来源记录保留在 assets/dunwu，当前正文以更新后的说明和图示为准。

- [原始 Markdown 快照](https://github.com/dunwu/bigdata-tutorial/tree/b3f38146d8ce7613aca819a628683a87ff513765/docs/kafka)
- <a :href="$withBase('/downloads/kafka/CC-BY-SA-4.0.txt')">许可全文</a>
- <a :href="$withBase('/downloads/kafka/source-index.txt')">原目录与参考资料</a>
