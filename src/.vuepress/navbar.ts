import { navbar } from "vuepress-theme-hope";

export default navbar([
  { text: "首页", icon: "house", link: "/" },
  { text: "后端开发", icon: "server", link: "/backend/" },
  { text: "AI 应用开发", icon: "robot", link: "/ai-application-development/" },
  { text: "算法与数据结构", icon: "diagram-project", link: "/algorithm/" },
  { text: "计算机基础", icon: "desktop", link: "/computer-fundamentals/" },
  { text: "前端开发", icon: "laptop-code", link: "/frontend/" },
  { text: "开发工具", icon: "screwdriver-wrench", link: "/tools/" },
  { text: "资源导航", icon: "compass", link: "/resources/" },
  { text: "关于作者", icon: "user", link: "/portfolio" },
]);
