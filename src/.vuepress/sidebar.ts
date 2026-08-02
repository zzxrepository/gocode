import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    {
      text: "学习栏目",
      children: [
        { text: "后端开发", link: "/backend/" },
        { text: "算法与数据结构", link: "/tree/" },
        { text: "计算机基础", link: "/computer-fundamentals/" },
        { text: "开发工具", link: "/tools/" },
        { text: "AI 应用开发", link: "/ai-application-development/" },
      ],
    },
    { text: "关于作者", link: "/portfolio" },
  ],
  "/backend/": [
    {
      text: "Go",
      icon: "terminal",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "Go 教程", link: "/go/" },
      ],
    },
    {
      text: "Java",
      icon: "mug-hot",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "Java 教程", link: "/java/" },
      ],
    },
    {
      text: "数据库",
      icon: "database",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "数据库教程", link: "/database/" },
      ],
    },
    {
      text: "微服务与分布式",
      icon: "diagram-project",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "栏目概览", link: "/backend/microservices/" },
        { text: "Spring / Spring Boot", link: "/backend/microservices/spring-spring-boot" },
        { text: "go-zero", link: "/backend/microservices/go-zero" },
        { text: "分布式系统", link: "/backend/microservices/distributed-systems" },
        { text: "云原生", link: "/backend/microservices/cloud-native" },
      ],
    },
  ],
  "/go/": [
    {
      text: "Go 基础语法",
      icon: "terminal",
      collapsible: true,
      collapsed: false,
      children: [{ text: "基础语法与项目结构", link: "/go/basics" }],
    },
    {
      text: "并发编程",
      icon: "arrows-split-up-and-left",
      collapsible: true,
      collapsed: false,
      children: [{ text: "Goroutine、Channel 与 Context", link: "/go/concurrency" }],
    },
    {
      text: "Web 开发：Gin",
      icon: "globe",
      collapsible: true,
      collapsed: false,
      children: [{ text: "Gin 服务开发", link: "/go/gin" }],
    },
    {
      text: "工程实践",
      icon: "gears",
      collapsible: true,
      collapsed: false,
      children: [{ text: "配置、日志、测试与部署", link: "/go/engineering" }],
    },
  ],
  "/java/": [
    {
      text: "Java 基础",
      icon: "mug-hot",
      collapsible: true,
      collapsed: false,
      children: [{ text: "Java 基础语法与面向对象", link: "/java/basics" }],
    },
    {
      text: "集合与并发",
      icon: "layer-group",
      collapsible: true,
      collapsed: false,
      children: [{ text: "集合框架与并发编程", link: "/java/collections-and-concurrency" }],
    },
    {
      text: "JVM 与框架",
      icon: "microchip",
      collapsible: true,
      collapsed: false,
      children: [{ text: "JVM 与 Spring 生态", link: "/java/jvm-and-frameworks" }],
    },
  ],
  "/database/": [
    {
      text: "MySQL",
      icon: "database",
      collapsible: true,
      collapsed: false,
      children: [{ text: "MySQL 基础、索引与事务", link: "/database/mysql" }],
    },
    {
      text: "Redis",
      icon: "bolt",
      collapsible: true,
      collapsed: false,
      children: [{ text: "Redis 缓存与常用场景", link: "/database/redis" }],
    },
  ],
  "/tree/": [
    {
      text: "LeetCode 二叉树题解",
      icon: "diagram-project",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "二叉树遍历", link: "/tree/LeetCode二叉树刷题笔记总结1-二叉树的遍历" },
        { text: "二叉树属性", link: "/tree/LeetCode刷题笔记2" },
        { text: "二叉树基本性质", link: "/tree/Leetcode刷题笔记3" },
        { text: "二叉树路径", link: "/tree/LeetCode刷题笔记4" },
        { text: "构造二叉树", link: "/tree/LeetCode刷题笔记5" },
        { text: "二叉搜索树（一）", link: "/tree/LeetCode刷题笔记6二叉搜索树1" },
        { text: "二叉搜索树（二）", link: "/tree/LeetCode刷题笔记7二叉搜索树2" },
        { text: "二叉树的直径", link: "/tree/LeetCode刷题笔记8" },
      ],
    },
  ],
  "/computer-fundamentals/": [
    {
      text: "计算机网络",
      icon: "network-wired",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "网络概览", link: "/computer-fundamentals/network/" },
        { text: "网络分层与协议", link: "/computer-fundamentals/network/network-layers-and-protocols" },
        { text: "HTTP 与 HTTPS", link: "/computer-fundamentals/network/http-and-https" },
        { text: "TCP 与 UDP", link: "/computer-fundamentals/network/tcp-and-udp" },
        { text: "DNS 与域名解析", link: "/computer-fundamentals/network/dns" },
      ],
    },
    {
      text: "操作系统",
      icon: "desktop",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "操作系统概览", link: "/computer-fundamentals/operating-system/" },
        { text: "进程、线程与协程", link: "/computer-fundamentals/operating-system/process-thread-coroutine" },
        { text: "内存管理", link: "/computer-fundamentals/operating-system/memory-management" },
        { text: "文件系统", link: "/computer-fundamentals/operating-system/file-system" },
      ],
    },
  ],
  "/tools/": [
    {
      text: "Docker",
      icon: "docker",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "Docker 入门", link: "/tools/docker/" },
        { text: "镜像与容器", link: "/tools/docker/images-and-containers" },
        { text: "Docker Compose", link: "/tools/docker/docker-compose" },
      ],
    },
    {
      text: "Git",
      icon: "code-branch",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "Git 入门", link: "/tools/git/" },
        { text: "分支与协作", link: "/tools/git/branch-and-collaboration" },
      ],
    },
    {
      text: "Maven",
      icon: "box",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "Maven 入门", link: "/tools/maven/" },
        { text: "生命周期与依赖管理", link: "/tools/maven/lifecycle-and-dependencies" },
      ],
    },
  ],
  "/ai-application-development/": [
    {
      text: "大模型应用",
      icon: "robot",
      collapsible: true,
      collapsed: false,
      children: [{ text: "模型调用与提示词", link: "/ai-application-development/llm-applications" }],
    },
    {
      text: "RAG 与 MCP",
      icon: "link",
      collapsible: true,
      collapsed: false,
      children: [{ text: "知识库与工具调用", link: "/ai-application-development/rag-and-mcp" }],
    },
    {
      text: "Agent 应用开发",
      icon: "diagram-project",
      collapsible: true,
      collapsed: false,
      children: [{ text: "Agent 工作流与实战", link: "/ai-application-development/agent-development" }],
    },
  ],
});
