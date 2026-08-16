---
title: 驾驭工程：让 Agent 在反馈回路中可靠工作
shortTitle: 驾驭工程
order: 3
category:
  - AI 应用开发
tag:
  - 驾驭工程
  - Harness Engineering
  - Agent
  - 评测
---

# 驾驭工程：让 Agent 在反馈回路中可靠工作

## 前言

驾驭工程（Harness Engineering）中的 Harness 是“马具、驾驭装置”，在 Agent 语境里指围绕模型搭建的运行环境：工具、状态、任务入口、规则、验证、权限、评测、观测和反馈循环。模型负责在不确定处作出判断；Harness 负责让这种判断在真实系统中可执行、可限制、可验证和可恢复。

OpenAI 对这一思路的实践概括为“人负责驾驭，Agent 负责执行”：工程师更多地设计环境、说明意图和构建反馈回路，而不是只修改一段 Prompt。[Harness engineering](https://openai.com/index/harness-engineering/) 也强调了仓库可理解性、可执行约束和持续维护的重要性。

## 一、Harness 包含什么

```text
任务入口 → 上下文装配 → 模型决策 → 受限工具调用 → 验证与观察
    ↑                                                   ↓
    └──────── 状态、评测、人工审批、重试与停止条件 ───┘
```

| 层次 | 责任 | 例子 |
| --- | --- | --- |
| 任务合同 | 定义输入、产物和完成条件 | Issue 模板、JSON Schema、验收清单 |
| 能力边界 | 提供最小必要工具 | 只读检索、沙箱执行、受限写入 |
| 状态与记忆 | 保存已知事实和进度 | 检查点、计划、决策记录 |
| 验证 | 用机械方式检查结果 | 编译、测试、lint、策略检查 |
| 运行控制 | 限制成本与风险 | 超时、重试、步数、审批、回滚 |
| 观测与评测 | 发现退化并改进 | trace、失败集、离线评测、告警 |

## 二、把确定性规则放回代码

模型可以决定“下一步查哪个文档”，但不应该决定“是否绕过金额上限”“是否跳过测试”“谁可以访问客户数据”。这些约束应当在工具层或工作流层强制执行。

```ts
async function runAgent(task: Task) {
  const plan = await model.plan(task);
  for (const step of plan.steps.slice(0, 8)) { // 明确步数上限，避免无限循环。
    const result = await runInSandbox(step, { timeoutMs: 30_000 });
    if (!result.ok) return requestHumanOrRetry(task, result);
  }

  // 完成不是模型自称完成，而是可执行验收条件全部通过。
  const checks = await Promise.all([runTests(), runLinter(), validateContract(task)]);
  return checks.every(Boolean) ? complete(task) : revise(task, checks);
}
```

上例中的循环、沙箱、上限与检查点都是 Harness；模型只是其中一个决策组件。

## 三、让知识对 Agent 可见且可执行

对人有用的隐性约定，若只存在于聊天记录或某个人脑中，对 Agent 等同于不存在。把架构决策、常用命令、测试方式、目录边界、依赖规范放在仓库内，并让 lint 或 CI 检查关键约束。文档不是越长越好：入口应短而稳定，随后按需链接到更详细的规则，避免第一次调用就淹没在上下文中。

## 四、安全与质量闭环

高风险工具默认最小权限、最小数据范围和人工确认；工具返回的文本同样视为不可信输入。为真实失败建立回归集：失败的任务、错误工具调用、越权尝试、过期上下文和无法完成的任务都应能在更新后重跑。用通过率、返工率、人工介入率、执行时间和成本共同判断改动，而不是只比较一次对话的“感觉”。

## 参考资料

- [OpenAI：Harness engineering](https://openai.com/index/harness-engineering/)
- [AI Harness Engineering: A Runtime Substrate for Foundation-Model Software Agents](https://arxiv.org/abs/2605.13357)

## 总结

驾驭工程不替代提示词或上下文工程，而是把它们纳入一个可验证的运行系统。可靠 Agent 的关键不是放任模型做更多事，而是让每项能力都有清楚的输入、权限、反馈和停止条件。
