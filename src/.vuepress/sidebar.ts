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
        { text: "网站维护指南", icon: "book-open", link: "/site-guide/" },
      ],
    },
    { text: "关于作者", icon: "user", link: "/portfolio" },
  ],
  "/backend/": [
    {
      text: "Go",
      icon: "terminal",
      collapsible: true,
      collapsed: false,
      children: [
        {
          text: "Go 基础语法",
          icon: "book-open",
          collapsible: true,
          collapsed: false,
          children: [{ text: "基础语法与项目结构", icon: "code", link: "/backend/go/basics" }],
        },
        {
          text: "并发编程",
          icon: "arrows-split-up-and-left",
          collapsible: true,
          collapsed: false,
          children: [{ text: "Goroutine、Channel 与 Context", icon: "timeline", link: "/backend/go/concurrency" }],
        },
        {
          text: "Web 开发：Gin",
          icon: "globe",
          collapsible: true,
          collapsed: false,
          children: [{ text: "Gin 服务开发", icon: "route", link: "/backend/go/gin" }],
        },
        {
          text: "工程实践",
          icon: "gears",
          collapsible: true,
          collapsed: false,
          children: [{ text: "配置、日志、测试与部署", icon: "wrench", link: "/backend/go/engineering" }],
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
          text: "🔥 Hot 100 题解",
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
      children: [{ text: "模型调用与提示词", icon: "comment-dots", link: "/ai-application-development/llm-applications" }],
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
      children: [{ text: "Agent 工作流与实战", icon: "bezier-curve", link: "/ai-application-development/agent-development" }],
    },
  ],
});
