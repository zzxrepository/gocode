import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    {
      text: "学习栏目",
      icon: "graduation-cap",
      children: [
        { text: "后端开发", icon: "server", link: "/backend/" },
        { text: "算法与数据结构", icon: "diagram-project", link: "/algorithm/" },
        { text: "计算机基础", icon: "desktop", link: "/computer-fundamentals/" },
        { text: "开发工具", icon: "screwdriver-wrench", link: "/tools/" },
        { text: "AI 应用开发", icon: "robot", link: "/ai-application-development/" },
        { text: "前端开发", icon: "laptop-code", link: "/frontend/" },
        { text: "学习路线", icon: "map", link: "/learning-paths/" },
        { text: "网站维护指南", icon: "book-open", link: "/site-guide/" },
      ],
    },
    { text: "关于作者", icon: "user", link: "/portfolio" },
  ],
  "/backend/": [
    {
      text: "GO",
      icon: "terminal",
      collapsible: true,
      collapsed: false,
      children: [
        {
          text: "Golang 基础知识",
          icon: "book-open",
          collapsible: true,
          collapsed: false,
          children: [
            {
              text: "基础教程",
              icon: "list-ol",
              collapsible: true,
              collapsed: false,
              children: [
                { text: "01. 基础语法与项目结构", icon: "code", link: "/backend/go/basic/01-project-structure/" },
                { text: "02. 变量、常量与类型", icon: "font", link: "/backend/go/basic/02-variables-and-types/" },
                { text: "03. 流程控制", icon: "code-fork", link: "/backend/go/basic/03-control-flow/" },
                { text: "04. 函数", icon: "diagram-project", link: "/backend/go/basic/04-functions/" },
                { text: "05. 数组与切片", icon: "table-cells", link: "/backend/go/basic/05-arrays-and-slices/" },
                { text: "06. Map", icon: "table", link: "/backend/go/basic/06-map/" },
                { text: "07. 结构体与方法", icon: "cube", link: "/backend/go/basic/07-structs-and-methods/" },
                { text: "08. 指针", icon: "location-arrow", link: "/backend/go/basic/08-pointers/" },
                { text: "09. 接口", icon: "plug", link: "/backend/go/basic/09-interfaces/" },
                { text: "10. 错误处理", icon: "triangle-exclamation", link: "/backend/go/basic/10-error-handling/" },
                { text: "11. 包与 Go Modules", icon: "boxes-stacked", link: "/backend/go/basic/11-packages-and-modules/" },
              ],
            },
          ],
        },
        {
          text: "Golang 进阶知识",
          icon: "rocket",
          collapsible: true,
          collapsed: false,
          children: [
            {
              text: "01. 标准库",
              icon: "toolbox",
              collapsible: true,
              collapsed: false,
              children: [
                { text: "01. context", icon: "timeline", link: "/backend/go/advanced/01-standard-library/01-context/" },
              ],
            },
            {
              text: "02. 并发编程",
              icon: "arrows-split-up-and-left",
              collapsible: true,
              collapsed: true,
              children: [{ text: "并发编程目录", icon: "list-check", link: "/backend/go/advanced/02-concurrency/" }],
            },
            {
              text: "03. Web 开发",
              icon: "globe",
              collapsible: true,
              collapsed: true,
              children: [{ text: "Web 开发目录", icon: "route", link: "/backend/go/advanced/03-web-development/" }],
            },
            {
              text: "04. 工程实践",
              icon: "gears",
              collapsible: true,
              collapsed: true,
              children: [{ text: "工程实践目录", icon: "wrench", link: "/backend/go/advanced/04-engineering-practice/" }],
            },
            {
              text: "05. 性能优化",
              icon: "gauge-high",
              collapsible: true,
              collapsed: true,
              children: [{ text: "性能优化目录", icon: "chart-line", link: "/backend/go/advanced/05-performance/" }],
            },
          ],
        },
      ],
    },
    {
      text: "Java",
      icon: "mug-hot",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "Java 基础", icon: "book-open", children: [{ text: "Java 基础语法与面向对象", icon: "cube", link: "/backend/java/basics" }] },
        { text: "集合与并发", icon: "boxes-stacked", children: [{ text: "集合框架与并发编程", icon: "list", link: "/backend/java/collections-and-concurrency" }] },
        { text: "JVM 与框架", icon: "microchip", children: [{ text: "JVM 与 Spring 生态", icon: "memory", link: "/backend/java/jvm-and-frameworks" }] },
      ],
    },
    {
      text: "数据库",
      icon: "database",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "MySQL", icon: "table", children: [{ text: "MySQL 基础、索引与事务", icon: "table-columns", link: "/backend/database/mysql" }] },
        { text: "Redis", icon: "bolt", children: [{ text: "Redis 缓存与常用场景", icon: "gauge-high", link: "/backend/database/redis" }] },
        { text: "MongoDB", icon: "simple-icons:mongodb", children: [{ text: "MongoDB 文档数据库入门", icon: "file-lines", link: "/backend/database/mongodb" }] },
      ],
    },
    {
      text: "消息队列",
      icon: "tower-broadcast",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "消息队列概览", icon: "message", link: "/backend/message-queue/" },
      ],
    },
    {
      text: "微服务与分布式",
      icon: "share-nodes",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "栏目概览", icon: "map", link: "/backend/microservices/" },
        { text: "Spring / Spring Boot", icon: "seedling", link: "/backend/microservices/spring-spring-boot" },
        { text: "go-zero", icon: "cubes", link: "/backend/microservices/go-zero" },
        { text: "分布式系统", icon: "network-wired", link: "/backend/microservices/distributed-systems" },
        { text: "云原生", icon: "cloud", link: "/backend/microservices/cloud-native" },
      ],
    },
  ],
  "/frontend/": [
    {
      text: "HTML",
      icon: "fa6-brands:html5",
      collapsible: true,
      collapsed: false,
      children: [{ text: "HTML 基础与语义化", icon: "file-code", link: "/frontend/html" }],
    },
    {
      text: "CSS",
      icon: "fa6-brands:css3-alt",
      collapsible: true,
      collapsed: false,
      children: [{ text: "CSS 布局与样式", icon: "paintbrush", link: "/frontend/css" }],
    },
    {
      text: "JavaScript",
      icon: "fa6-brands:js",
      collapsible: true,
      collapsed: false,
      children: [{ text: "JavaScript 基础与浏览器编程", icon: "bolt-lightning", link: "/frontend/javascript" }],
    },
  ],
  "/algorithm/": [
    {
      text: "数据结构",
      icon: "cubes-stacked",
      collapsible: true,
      collapsed: false,
      children: [{ text: "数据结构学习路线", icon: "road", link: "/algorithm/data-structures/" }],
    },
    {
      text: "算法",
      icon: "diagram-project",
      collapsible: true,
      collapsed: false,
      children: [{ text: "算法学习路线", icon: "compass", link: "/algorithm/algorithms/" }],
    },
    {
      text: "LeetCode 题解",
      icon: "simple-icons:leetcode",
      collapsible: true,
      collapsed: false,
      children: [
        {
          text: "二叉树题解",
          icon: "tree",
          collapsible: true,
          collapsed: false,
          children: [
            { text: "二叉树遍历", icon: "shuffle", link: "/algorithm/leetcode/binary-tree/LeetCode二叉树刷题笔记总结1-二叉树的遍历" },
            { text: "二叉树属性", icon: "tags", link: "/algorithm/leetcode/binary-tree/LeetCode刷题笔记2" },
            { text: "二叉树基本性质", icon: "circle-nodes", link: "/algorithm/leetcode/binary-tree/Leetcode刷题笔记3" },
            { text: "二叉树路径", icon: "signs-post", link: "/algorithm/leetcode/binary-tree/LeetCode刷题笔记4" },
            { text: "构造二叉树", icon: "hammer", link: "/algorithm/leetcode/binary-tree/LeetCode刷题笔记5" },
            { text: "二叉搜索树（一）", icon: "magnifying-glass", link: "/algorithm/leetcode/binary-tree/LeetCode刷题笔记6二叉搜索树1" },
            { text: "二叉搜索树（二）", icon: "check-double", link: "/algorithm/leetcode/binary-tree/LeetCode刷题笔记7二叉搜索树2" },
            { text: "二叉树的直径", icon: "ruler-combined", link: "/algorithm/leetcode/binary-tree/LeetCode刷题笔记8" },
          ],
        },
        {
          text: "Hot 100 题解",
          icon: "fire",
          collapsible: true,
          collapsed: false,
          children: [{ text: "1. 两数之和", icon: "hashtag", link: "/algorithm/leetcode/hot-100/two-sum" }],
        },
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
        { text: "网络概览", icon: "circle-info", link: "/computer-fundamentals/network/" },
        { text: "网络分层与协议", icon: "layer-group", link: "/computer-fundamentals/network/network-layers-and-protocols" },
        { text: "HTTP 与 HTTPS", icon: "lock", link: "/computer-fundamentals/network/http-and-https" },
        { text: "TCP 与 UDP", icon: "link", link: "/computer-fundamentals/network/tcp-and-udp" },
        { text: "DNS 与域名解析", icon: "at", link: "/computer-fundamentals/network/dns" },
      ],
    },
    {
      text: "操作系统",
      icon: "desktop",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "操作系统概览", icon: "list-check", link: "/computer-fundamentals/operating-system/" },
        { text: "进程、线程与协程", icon: "arrows-split-up-and-left", link: "/computer-fundamentals/operating-system/process-thread-coroutine" },
        { text: "内存管理", icon: "memory", link: "/computer-fundamentals/operating-system/memory-management" },
        { text: "文件系统", icon: "folder-tree", link: "/computer-fundamentals/operating-system/file-system" },
      ],
    },
  ],
  "/tools/": [
    {
      text: "开发环境",
      icon: "laptop",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "macOS 使用技巧", icon: "fa6-brands:apple", link: "/tools/development-environment/macos-tips" },
      ],
    },
    {
      text: "🐳 Docker",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "Docker 入门", icon: "box-open", link: "/tools/docker/" },
        { text: "镜像与容器", icon: "cubes-stacked", link: "/tools/docker/images-and-containers" },
        { text: "Docker Compose", icon: "list-ol", link: "/tools/docker/docker-compose" },
      ],
    },
    {
      text: "Git",
      icon: "code-branch",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "Git 入门", icon: "fa6-brands:git-alt", link: "/tools/git/" },
        { text: "分支与协作", icon: "code-merge", link: "/tools/git/branch-and-collaboration" },
      ],
    },
    {
      text: "Maven",
      icon: "box",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "Maven 入门", icon: "flask", link: "/tools/maven/" },
        { text: "生命周期与依赖管理", icon: "calendar-days", link: "/tools/maven/lifecycle-and-dependencies" },
      ],
    },
  ],
  "/ai-application-development/": [
    {
      text: "大模型应用",
      icon: "robot",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "模型调用与提示词", icon: "comment-dots", link: "/ai-application-development/llm-applications" },
        { text: "LangChain：大模型应用框架", icon: "link", link: "/ai-application-development/langchain" },
      ],
    },
    {
      text: "RAG 与 MCP",
      icon: "link",
      collapsible: true,
      collapsed: false,
      children: [{ text: "知识库与工具调用", icon: "book-atlas", link: "/ai-application-development/rag-and-mcp" }],
    },
    {
      text: "Agent 应用开发",
      icon: "wand-magic-sparkles",
      collapsible: true,
      collapsed: false,
      children: [
        { text: "Agent 工作流与实战", icon: "bezier-curve", link: "/ai-application-development/agent-development" },
        { text: "LangGraph：Agent 工作流框架", icon: "diagram-project", link: "/ai-application-development/langgraph" },
      ],
    },
  ],
  "/learning-paths/": [
    { text: "☕ Java 学习路线", icon: "map", link: "/learning-paths/java" },
  ],
});
