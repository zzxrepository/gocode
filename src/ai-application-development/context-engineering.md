---
title: 上下文工程：为模型准备恰好足够的信息
shortTitle: 上下文工程
order: 2
category:
  - AI 应用开发
tag:
  - 上下文工程
  - Context Engineering
  - Agent
  - RAG
---

# 上下文工程：为模型准备恰好足够的信息

## 前言

上下文工程（Context Engineering）关注的是：一次模型调用前，到底应该放入哪些信息，以及以什么顺序、格式和预算放入。信息可能来自系统规则、当前用户目标、对话历史、检索结果、工具返回、任务状态和长期记忆。它不是单纯“支持长上下文”，而是在有限的上下文窗口内选择最相关、最可信、最有权限的信息。

提示词工程主要设计指令本身；上下文工程还要决定证据从哪里来、历史保留多少、过期信息如何淘汰。选错上下文会让再强的模型也无从判断。

## 一、上下文不是一条字符串

可以按来源和寿命拆分：

| 层次 | 内容 | 典型处理 |
| --- | --- | --- |
| 稳定规则 | 安全策略、输出契约、产品原则 | 版本化模板，始终保留 |
| 当前任务 | 用户请求、已确认约束、工作流状态 | 每次调用更新 |
| 短期历史 | 最近轮次、工具结果 | 截断、摘要或结构化存储 |
| 外部证据 | RAG 文档、数据库查询、网页内容 | 按相关性、时效和 ACL 检索 |
| 长期记忆 | 用户偏好、可复用结论 | 可撤销、带来源和过期时间 |

模型看到的每个文本块都可能包含错误或注入内容。来源越不可信，越应限制它能影响的范围；工具输出和网页正文应被标记为数据，而不是系统指令。

## 二、先分配 token 预算

上下文窗口很大也不意味着把所有内容塞进去。过多历史会稀释当前目标、增加成本并使关键证据被忽略。先为稳定指令、当前任务、证据、历史摘要和模型输出预留预算，再按优先级装配。

```ts
type ContextItem = { priority: number; tokens: number; content: string };

function pack(items: ContextItem[], budget: number) {
  // 先放高优先级内容；低优先级历史可以被摘要或丢弃。
  return items
    .sort((a, b) => b.priority - a.priority)
    .reduce<{ used: number; content: string[] }>((state, item) => {
      if (state.used + item.tokens > budget) return state;
      state.used += item.tokens;
      state.content.push(item.content);
      return state;
    }, { used: 0, content: [] });
}
```

实际 token 数应由对应模型的 tokenizer 计算；估算字符数只适合做粗略的提前筛选。

## 三、RAG、记忆与工具不是同一个东西

RAG 擅长从大量文档中找证据；记忆保存跨会话的偏好或已确认事实；工具获取当前状态并执行动作。把“用户常用语言”放进向量库再检索，或把“当前订单状态”写进长期记忆，都会造成过期和权限问题。更合理的做法是：稳定偏好结构化存储并按用户读取，动态业务事实实时查询，文档型知识通过检索召回。

## 四、压缩、引用和可观察性

长会话应在完成一个阶段后写入结构化摘要，例如“已确认需求、未决问题、关键决定、工具结果引用”，而不是让模型自由概括全部历史。每段检索证据都要携带来源、版本和权限信息；生成回答时要求引用证据，便于用户和开发者复核。

记录上下文装配的元数据：使用了哪些规则版本、哪些 chunk、是否命中缓存、token 占用和最终结果。日志不应默认保存全部私人文本或凭据。

## 参考资料

- [OpenAI：Harness engineering](https://openai.com/index/harness-engineering/)
- [MCP Server primitives：Prompts、Resources、Tools](https://modelcontextprotocol.io/specification/2025-06-18/server/index)

## 总结

上下文工程是在调用前做信息选择与编排：让模型看到需要的事实，而不是更多事实。明确来源、权限、时效、预算和淘汰策略，才能使多轮 Agent 的输出稳定、可解释且成本可控。
