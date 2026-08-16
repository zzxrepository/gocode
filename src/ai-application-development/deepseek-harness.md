---
title: DeepSeek Harness：插件化的开源 Agent Harness
shortTitle: DeepSeek Harness
order: 4
category:
  - AI 应用开发
tag:
  - DeepSeek
  - Harness
  - Agent
  - 插件
---

# DeepSeek Harness：插件化的开源 Agent Harness

## 前言

DeepSeek Harness 是 DeepSeek AI 开源的 Agent Harness，命令行名称为 `dsh`。它的核心设计是“Everything is a Plugin”：将模型、工具、界面与运行能力放在可组合的插件体系中，而不是把所有能力固化在一个单体 Agent 内。它不是 DeepSeek 模型本身，也不是只用于调用 API 的 SDK；它是运行和扩展 Agent 的环境。

截至本文更新时，项目官方明确标注为 **developer preview（开发者预览）**，并提示会有破坏兼容性的改动。因此适合用于学习、原型验证和跟踪架构，不应在未做版本锁定、权限审查和回归测试的前提下直接承担关键生产任务。

## 一、它解决什么问题

模型擅长理解目标和提出下一步，但一个可用 Agent 还要有工具发现、执行循环、状态、权限、界面和扩展机制。DeepSeek Harness 将这些外围能力作为可替换部件：同一个任务可以接入不同模型、工具或界面，而 Harness 负责协调生命周期和交互边界。

```text
用户 / Web UI / CLI
        ↓
DeepSeek Harness（运行时与插件装配）
        ├── 模型与 Agent 插件
        ├── 工具与外部服务插件
        ├── 任务状态与事件
        └── 界面与扩展插件
```

插件化不自动带来安全性。每个插件都可能读取环境变量、访问网络或执行命令，安装前应审计来源、版本和所请求的权限。

## 二、最快运行方式

官方 README 给出的最小 Web 启动方式如下。它会使用本地 Node.js 环境启动 Web UI，默认监听 `http://127.0.0.1:3080`：

```bash
# 先确认 Node.js 环境满足项目当前要求，再临时运行 dsh Web UI。
npx @deepseek-ai/dsh web
```

需要从源码学习或开发插件时，使用仓库方式安装：

```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install       # 安装锁定的工作区依赖
pnpm run build     # 先构建，再运行本地命令
pnpm dsh web
```

不要把 API Key 写入仓库配置或截图。用环境变量、密钥管理器或项目支持的凭据配置提供认证，并在启动前检查本机监听地址、插件来源和工具权限。

## 三、从试用到工程化

建议从一个只读、可复现的任务开始，例如“根据一个本地示例仓库生成修改建议，但不写入文件”。为任务设置明确输入、允许工具、最大步数、预算和验收方式；然后再逐步开放受限写入、测试执行或远程工具。每次升级预览版本后，先在隔离环境重跑评测集，因为插件 API 和行为可能变化。

DeepSeek Harness 可以作为驾驭工程的一个具体实现来理解：Prompt 负责表达意图，上下文层提供所需事实，Harness 将工具、状态、反馈与限制接到同一个 Agent 运行循环中。

## 参考资料

- [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness：架构与开发文档](https://github.com/deepseek-ai/deepseek-harness/tree/master/docs)

## 总结

DeepSeek Harness（`dsh`）是一个以插件化为核心的开源 Agent 运行环境。它的价值在于让 Agent 外围能力可组合、可替换；而它仍处于开发者预览阶段，实际接入应以隔离、权限最小化、版本锁定和回归验证为前提。
