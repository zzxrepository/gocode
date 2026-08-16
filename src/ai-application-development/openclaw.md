---
title: OpenClaw：搭建自托管、多渠道的个人 Agent Gateway
shortTitle: OpenClaw
order: 7
category:
  - AI 应用开发
tag:
  - OpenClaw
  - Agent
  - Gateway
  - MCP
---

# OpenClaw：搭建自托管、多渠道的个人 Agent Gateway

## 前言

OpenClaw 是一个自托管的 Agent Gateway：一个 Gateway 进程连接消息渠道、Web Control UI、CLI、模型 Provider 和 Agent 运行时，让个人 Agent 能从 Telegram、Slack、Discord、飞书等渠道接收和处理任务。它不是大模型，也不是单一聊天机器人；Gateway 是会话、路由和渠道连接的统一入口。

这种能力带来的不是“安装即可拥有全权限助手”，而是更大的安全责任。它可能接触聊天记录、文件、凭据和本机工具，因此先建立最小权限、明确 allowlist 和隔离工作区，再增加自动化能力。

## 一、核心结构

```text
聊天渠道 / Web UI / CLI
          ↓
     OpenClaw Gateway
       ├── Agent 会话、路由与记忆
       ├── 模型 Provider
       ├── Skills、插件和工具
       └── MCP Server 注册表 / MCP bridge
```

官方文档将其描述为多渠道、自托管的 Agent Gateway；配置默认位于 `~/.openclaw/openclaw.json`。不同聊天渠道应当使用隔离的会话与访问控制，不能把群聊直接等同于受信任的个人命令行。

## 二、安装与首次验证

官方推荐在 macOS、Linux 或 WSL2 使用安装脚本；已有受支持 Node.js 环境时也可用 npm。安装程序和 npm 包都会执行代码，生产环境应先审阅来源、固定版本并使用受控镜像或包源。

```bash
# macOS / Linux / WSL2：官方安装脚本会进行环境检查并进入引导流程。
curl -fsSL https://openclaw.ai/install.sh | bash

# 已自行管理 Node.js 时，可选择 npm 安装。
npm install -g openclaw@latest

# 交互式配置模型、认证、Gateway 与可选渠道，并安装后台服务。
openclaw onboard --install-daemon

# 确认 Gateway 正在运行，再打开本地控制台。
openclaw gateway status
openclaw dashboard
```

当前官方文档要求 Node.js 22.22.3+、24.15+ 或 25.9+，并推荐 Node 26；版本会演进，应以[安装文档](https://docs.openclaw.ai/install)为准。默认本地 Dashboard 地址为 `http://127.0.0.1:18789/`，不要未经认证直接暴露到公网。

## 三、渠道、Skills 与 MCP 的位置

渠道插件负责收发消息，Agent Runtime 决定如何响应，Skills 给 Agent 提供可复用的工作流程和约束，Tools 才是真正产生副作用的能力。MCP 则可以有两个方向：OpenClaw 可作为 MCP Server 向外部客户端暴露渠道会话；也可保存和管理第三方 MCP Server 的连接定义，供 OpenClaw 管理的 Agent 使用。两者的信任边界不同，不能把“能连上”理解为“可以无限授权”。

OpenClaw 官方 CLI 文档建议先通过 `openclaw mcp status --verbose` 检查已保存的连接。对每个远程 MCP Server 设置工具允许列表、连接超时和请求超时；OAuth 凭据不应写进仓库配置。

## 四、上线前安全清单

- 只允许已知账号或频道触发 Agent；群聊要求 @ 提及和额外确认。
- 默认使用只读、低权限工具；写文件、执行命令、发送消息、访问生产系统分别授权。
- 不把 API Key、聊天记录或个人文件打包进 Skill、插件或 Git 仓库。
- 对外部网页、邮件和 MCP Tool 返回内容视为不可信输入，防范提示注入。
- 定期运行 `openclaw security audit`，升级前在隔离环境验证插件与工作流。

## 参考资料

- [OpenClaw 官方概览](https://docs.openclaw.ai/)
- [OpenClaw：Getting started](https://docs.openclaw.ai/start/getting-started)
- [OpenClaw MCP CLI 文档](https://github.com/openclaw/openclaw/blob/main/docs/cli/mcp.md)

## 总结

OpenClaw 将渠道、模型、会话、工具和自动化汇集到自托管 Gateway 中。先在本地 Dashboard 验证最小可用链路，再逐步接入渠道、Skills 和 MCP；对任何可执行操作都采用 allowlist、最小权限、超时与人工确认。
