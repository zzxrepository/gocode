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
      text: "Go",
      icon: "terminal",
      prefix: "",
      children: "structure",
    },
  ],
  "/java/": [
    {
      text: "Java",
      icon: "mug-hot",
      prefix: "",
      children: "structure",
    },
  ],
  "/database/": [
    {
      text: "数据库",
      icon: "database",
      prefix: "",
      children: "structure",
    },
  ],
  "/tree/": [
    {
      text: "算法与数据结构",
      icon: "diagram-project",
      prefix: "",
      children: "structure",
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
      text: "AI 应用开发",
      icon: "robot",
      prefix: "",
      children: "structure",
    },
  ],
});
