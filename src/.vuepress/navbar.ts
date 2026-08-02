import { navbar } from "vuepress-theme-hope";

export default navbar([
  { text: "首页", icon: "house", link: "/" },
  { text: "后端开发", icon: "server", link: "/backend/" },
  { text: "算法与数据结构", icon: "code", link: "/tree/" },
  { text: "计算机基础", icon: "laptop-code", link: "/computer-fundamentals/" },
  { text: "开发工具", icon: "screwdriver-wrench", link: "/tools/" },
  { text: "AI 应用开发", icon: "robot", link: "/ai-application-development/" },
  {
    text: "资源导航",
    icon: "compass",
    children: [
      {
        text: "AI 工具",
        children: [
          { text: "ChatGPT", link: "https://chatgpt.com/" },
          { text: "Claude", link: "https://claude.ai/" },
          { text: "Gemini", link: "https://gemini.google.com/" },
          { text: "DeepSeek", link: "https://chat.deepseek.com/" },
          { text: "Hugging Face", link: "https://huggingface.co/" },
        ],
      },
      {
        text: "云服务",
        children: [
          { text: "阿里云", link: "https://www.aliyun.com/" },
          { text: "阿里百炼", link: "https://bailian.console.aliyun.com/" },
          { text: "火山引擎", link: "https://www.volcengine.com/" },
          { text: "华为云", link: "https://www.huaweicloud.com/" },
        ],
      },
    ],
  },
  { text: "关于作者", icon: "user", link: "/portfolio" },
]);
