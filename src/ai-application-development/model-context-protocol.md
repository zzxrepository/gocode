---
title: MCP：让模型应用安全地连接工具与上下文
shortTitle: MCP
order: 6
category:
  - AI 应用开发
tag:
  - MCP
  - Model Context Protocol
  - 工具调用
  - Agent
---

# MCP：让模型应用安全地连接工具与上下文

## 前言

模型上下文协议（Model Context Protocol，MCP）是连接模型应用与外部能力的开放协议。它定义 Client 与 Server 如何协商能力、传输消息和调用外部接口；它不是模型、不是 Agent 框架，也不是 RAG 的替代品。MCP Server 可以提供三类核心原语：供用户选择的 Prompts、由应用管理的 Resources，以及供模型调用的 Tools。[官方规范](https://modelcontextprotocol.io/specification/2025-06-18/server/index) 还明确区分了三者的控制权。

## 一、先选对能力类型

| 原语 | 谁发起使用 | 适合放什么 |
| --- | --- | --- |
| Prompt | 用户或宿主选择 | 固定任务模板、常用工作流入口 |
| Resource | 应用附加或读取 | 文件、配置、Git 历史、知识内容 |
| Tool | 模型在授权范围内调用 | 查询、计算、创建工单、受控写入 |

例如“读取当前项目配置”可以是 Resource；“创建发布单”应是带输入 Schema 和权限校验的 Tool。不要把写操作伪装成普通文本资源，也不要让模型调用一个权限过宽的“万能 shell 工具”。

## 二、实现一个最小工具 Server

以下示例使用 MCP TypeScript SDK v2 的 stdio 方式。stdio 的约定是：标准输出只传 MCP 协议，普通日志写到标准错误；由宿主进程负责启动和终止 Server。

```bash
npm init -y
npm pkg set type=module
npm install @modelcontextprotocol/server zod tsx
```

```ts
// src/index.ts
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const server = new McpServer({ name: "ticket-tools", version: "1.0.0" });

server.registerTool(
  "get-ticket",
  {
    description: "按 ID 查询一张已授权访问的工单，不执行任何写操作。",
    // Schema 同时用于生成模型可见的参数说明和运行时校验。
    inputSchema: z.object({ id: z.string().regex(/^TKT-\d+$/) }),
  },
  async ({ id }) => {
    const ticket = await lookupTicket(id); // lookupTicket 内部还必须做当前用户的 ACL 校验。
    if (!ticket) {
      return { content: [{ type: "text", text: "工单不存在或无权访问" }], isError: true };
    }
    return { content: [{ type: "text", text: JSON.stringify(ticket) }] };
  },
);

// stdout 留给协议；不要在这里 console.log 调试信息。
await serveStdio(server);
```

可用官方 Inspector 在接入真实宿主前测试 Server。Tool Schema 的作用不止是方便模型调用：它会在 handler 执行前拒绝非法参数，但它不能替代认证、授权、限流或审计。

## 三、安全边界

MCP 会把不可信的多方连接起来：用户输入可能诱导模型，工具返回可能夹带提示注入，远程 Server 可能索取凭据或执行副作用。实践中应做到：允许列表管理 Server；使用短期凭据或 OAuth；每个 Tool 最小权限；写操作展示预览并要求审批；对参数、响应、超时和速率都设限制；记录操作审计但不记录密钥。

MCP 让“连接”标准化，不会自动让“连接”安全。是否调用工具、可调用什么、返回结果是否可信，仍由宿主和业务系统负责。

## 参考资料

- [MCP Server primitives 官方规范](https://modelcontextprotocol.io/specification/2025-06-18/server/index)
- [MCP TypeScript SDK：Build your first server](https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-server)

## 总结

MCP 用统一协议暴露 Prompt、Resource 和 Tool，使模型应用可以复用外部能力。一个好 MCP Server 具有窄而清楚的能力边界、可验证的 Schema、独立的鉴权与审计，并把高风险动作交给明确的审批流程。
