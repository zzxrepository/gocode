---
title: 消息队列
shortTitle: 消息队列
order: 4
dir:
  link: true
  collapsible: true
  order: 4
icon: tower-broadcast
category:
  - 消息队列
tag:
  - 消息队列
  - RabbitMQ
  - RocketMQ
  - Kafka
  - 异步通信
---

# 消息队列

消息队列用于让服务之间异步通信、削峰填谷和解耦业务流程，是后端工程实践的重要基础设施。

本栏目包含以下主题：

- 基础概念：生产者、消费者、消息确认、重试与死信队列。
- [RabbitMQ](./rabbitmq/)：可靠投递、路由和业务异步化。
- [RocketMQ](./rocketmq/)：事务消息、顺序消息与业务消息系统。
- [Kafka](./kafka/)：以订单事件为主线的 8 个主题，提供 Go/Sarama 与 Java 独立运行示例。
- 实战设计：幂等、消息积压、重复消费与可观测性。

面试复习：[消息队列面试题](/interview/message-queue.html)。
