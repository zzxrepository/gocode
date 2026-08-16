---
title: 提示词工程：把需求变成可执行的模型输入
shortTitle: 提示词工程
order: 1
category:
  - AI 应用开发
tag:
  - 大模型
  - 提示词工程
  - Prompt Engineering
---

# 提示词工程：把需求变成可执行的模型输入

## 前言

提示词工程（Prompt Engineering）不是为模型编一段“神奇咒语”，而是把原本含糊的自然语言需求，转成模型能够稳定执行的输入契约。模型仍会根据概率生成内容，不能被提示词变成确定性程序；但清楚地说明目标、事实边界、输出结构和失败处理，可以显著减少无关回答与格式返工。

它主要解决单次或短链路中的“模型该如何回答”。当问题变成“应该带哪些资料进上下文”“如何跨多轮维护状态”“如何限制工具和验证结果”时，分别进入上下文工程和驾驭工程的范围。

## 一、把提示词看成输入契约

一个可维护的提示词通常有五部分：

| 部分 | 要回答的问题 | 示例 |
| --- | --- | --- |
| 目标 | 要完成什么任务 | 把工单归类并给出处理建议 |
| 已知事实 | 哪些内容可以作为依据 | 仅使用工单正文和给出的产品规则 |
| 约束 | 哪些行为不允许 | 信息不足时必须标记为 `needs_human` |
| 输出契约 | 返回什么字段、采用什么格式 | 返回符合 JSON Schema 的对象 |
| 验收标准 | 怎样算正确 | 分类必须来自枚举，不能凭空引用政策 |

“你是专业客服，请认真回答”只有角色和模糊目标；它没有限定事实来源，也没有定义可被程序消费的结果。相反，输出结构和失败路径明确后，调用方就可以校验、重试或转人工。

## 二、稳定指令与运行时数据分离

系统规则应来自受版本控制的模板，用户问题、检索片段和业务数据作为变量填入。不要把用户输入直接拼在系统指令后，避免它覆盖既定规则。

```ts
type Ticket = { id: string; text: string };

function buildMessages(ticket: Ticket) {
  return [
    {
      role: "system",
      // 稳定规则由应用维护；用户内容不能改变这些边界。
      content: `你负责分流售后工单。只输出 JSON：
{"category":"refund|delivery|account|other","reason":"不超过40字","needs_human":boolean}。
信息不足时 category 为 other 且 needs_human 为 true。`,
    },
    {
      role: "user",
      // 运行时数据显式标记边界，降低它被误当作指令的风险。
      content: `工单 ID：${ticket.id}\n<ticket>${ticket.text}</ticket>`,
    },
  ];
}
```

标签不是安全边界，模型仍可能受到恶意文本影响；真正的边界还包括输入长度限制、内容清洗、权限校验和输出校验。

## 三、示例、推理与结构化输出

少量代表性示例（few-shot examples）适合解释分类口径、语气或边界案例。示例必须和线上规则一起维护；过期示例会比没有示例更误导模型。需要机器读取时，优先使用模型 API 的结构化输出能力或在客户端按 Schema 校验，而不是用正则从自然语言中“猜” JSON。

```ts
import { z } from "zod";

const Result = z.object({
  category: z.enum(["refund", "delivery", "account", "other"]),
  reason: z.string().max(40),
  needs_human: z.boolean(),
});

// 即使模型声称遵守格式，也必须在业务边界重新验证。
const result = Result.parse(JSON.parse(modelText));
if (result.needs_human) enqueueHumanReview(result);
```

“一步一步思考”并不是所有任务的默认答案。对于可验证的业务流程，更可靠的是要求模型给出简短结论与可检查依据，把计算、权限和规则判断交给确定性代码或工具执行。

## 四、用评测而不是体感迭代

维护一个小而真实的评测集：常见输入、边界输入、对抗性输入和应该拒绝的输入都要覆盖。每次修改模板后，比较分类准确率、格式通过率、人工转交率、延迟和 token 成本。若某类错误只靠加一条更长的规则才压住，往往意味着应当补充上下文、工具或程序校验，而不是无限堆叠提示词。

## 常见误区

- 把保密、鉴权、金额上限写在提示词里就当作安全控制；这些必须由代码强制执行。
- 将整份数据库、长聊天记录和无关文档粘贴进提示词；它会稀释关键信息并提高成本。
- 用角色扮演替代任务定义；角色只能补充风格，不能替代事实、输入和验收标准。
- 只用几次手工对话判断效果；上线前应运行固定评测集。

## 参考资料

- [OpenAI：Prompt engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic：Prompt engineering overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)

## 总结

提示词工程的核心是把语言需求变成可测试的输入契约：目标清楚、事实有边界、输出可校验、失败能处理。它是模型应用的起点，却不是全部控制层；上下文选择、工具权限和运行时验证仍需由系统设计承担。
