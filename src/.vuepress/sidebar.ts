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
      text: "后端开发",
      link: "",
      children: [
        { text: "Go", link: "/go/" },
        { text: "Java", link: "/java/" },
        { text: "数据库", link: "/database/" },
      ],
    },
  ],
  "/go/": [
    {
      text: "Go",
      icon: "code",
      prefix: "",
      children: "structure",
    },
  ],
  "/java/": [
    {
      text: "Java",
      icon: "code",
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
      icon: "code",
      prefix: "",
      children: "structure",
    },
  ],
  "/computer-fundamentals/": [
    {
      text: "计算机基础",
      icon: "laptop-code",
      prefix: "",
      children: "structure",
    },
  ],
  "/tools/": [
    {
      text: "开发工具",
      icon: "screwdriver-wrench",
      prefix: "",
      children: "structure",
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
