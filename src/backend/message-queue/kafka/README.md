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

这里整理 Kafka 的基础概念、安装配置，以及使用 Go 生产和消费消息的实践。

## 教程目录

1. [快速入门](./01-quickstart.html)
2. [生产者](./02-producer.html)
3. [消费者](./03-consumer.html)
4. [集群](./04-cluster.html)
5. [可靠传输](./05-reliability.html)
6. [存储](./06-storage.html)
7. [流式处理](./07-stream-processing.html)
8. [运维](./08-operations.html)

## 版本说明

以下转载教程保留原版内容，其中 Kafka 2.x、Java 8、ZooKeeper 及旧版客户端配置仅适用于对应版本。Kafka 4.x 使用 KRaft，已移除 ZooKeeper 模式；当前版本操作请参考 [Kafka 官方快速入门](https://kafka.apache.org/43/getting-started/quickstart/)。

## 来源与许可

本组 8 篇教程来自 [dunwu（钝悟）的 BIGDATA-TUTORIAL](https://dunwu.github.io/bigdata-tutorial/kafka/)，按 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 转载；转载文章及其改编继续适用同一许可。原文引用的第三方资料保留原出处。

导入时补充了站点元信息和版本说明，将 33 张配图保存到本地，修复了一个失效图片地址，并将原文手工目录替换为本站自动目录。技术正文与代码示例保留原版，未整体升级到 Kafka 4.x。

- [原始 Markdown 快照](https://github.com/dunwu/bigdata-tutorial/tree/b3f38146d8ce7613aca819a628683a87ff513765/docs/kafka)
- <a :href="$withBase('/downloads/kafka/CC-BY-SA-4.0.txt')">许可全文</a>
- <a :href="$withBase('/downloads/kafka/source-index.txt')">原目录与参考资料</a>
