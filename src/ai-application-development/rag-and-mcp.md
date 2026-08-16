---
title: RAG：构建可更新、可追溯的知识库问答
shortTitle: RAG
order: 5
category:
  - AI 应用开发
tag:
  - RAG
  - 检索增强生成
  - 知识库
---

# RAG：构建可更新、可追溯的知识库问答

## 前言

检索增强生成（Retrieval-Augmented Generation，RAG）在回答前先从外部知识中检索相关材料，再将材料作为上下文交给模型。它解决的不是“让模型记住更多”，而是让应用能使用可更新、可审计、带来源的知识。原始 RAG 工作将参数化模型与可检索的非参数化记忆结合，用于知识密集型生成任务。[Lewis 等人的论文](https://arxiv.org/abs/2005.11401) 是这一术语的重要来源。

RAG 不能保证正确答案：检索不到、解析错误、权限过滤缺失或模型误读证据，都会造成错误。因此应把它当作一条需要分别评测的系统链路。

## 一、两条链路

```text
离线：原始文档 → 解析与清洗 → 切分 → 向量化 → 写入索引
在线：用户问题 → 查询改写/向量化 → 检索 → 重排 → 证据上下文 → 模型回答
```

离线链路决定“系统里有什么”；在线链路决定“本次带什么给模型”。二者都应保留文档版本、来源 URL、更新时间、访问权限等元数据，不能只保存一段匿名文本。

## 二、先把文档做对

切分并非固定按 500 个字符。技术文档适合保留标题层级、代码块和段落边界；表格、PDF 和扫描件需要单独处理；相邻片段可保留少量重叠以避免句子被截断。每个 chunk 至少保存：`document_id`、`chunk_id`、文本、标题路径、来源、更新时间和 ACL。

下面的伪代码强调元数据与权限过滤的位置：

```ts
async function answer(question: string, userId: string) {
  const query = await embed(question);
  const candidates = await vectorStore.search(query, { limit: 20 });

  // 权限过滤必须发生在模型看到内容之前，不能交给提示词判断。
  const allowed = candidates.filter((doc) => canRead(userId, doc.metadata.acl));
  const evidence = await rerank(question, allowed, { limit: 5 });

  return chat({
    system: "仅依据给出的证据回答；证据不足时明确说明。每项结论标注来源编号。",
    user: { question, evidence: evidence.map(toCitationBlock) },
  });
}
```

## 三、召回、重排与生成各自评测

不要只看“最终回答像不像对”。先用带标准证据的问题集评估检索：正确材料是否进入 top-k（Recall@k）、无关材料是否过多、权限是否正确；再评估重排；最后评估回答是否被证据支持、引用是否可打开、无法回答时是否诚实拒答。线上还应记录查询、索引版本、命中文档标识、耗时和用户反馈，但需脱敏并遵守数据保留策略。

## 四、何时不该用 RAG

需要实时执行动作时使用受控工具，而不是把接口返回值预先做成知识库；小而稳定、每次都要使用的规则可以直接放在系统指令；长文总结可以直接在用户授权范围内读取原文。RAG 特别适合文档规模较大、知识会更新、且需要给出来源的问答场景。

## 参考资料

- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)
- [LangChain：Retrieval](https://docs.langchain.com/oss/python/langchain/retrieval)

## 总结

RAG 的关键是“先找到可信证据，再受约束地生成”。文档解析、切分、元数据、权限、召回、重排、引用和评测共同决定质量；只优化最后一段 Prompt 往往治标不治本。
