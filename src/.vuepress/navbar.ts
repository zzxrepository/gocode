import { navbar } from "vuepress-theme-hope";

export default navbar([
  { text: "首页", icon: "house", link: "/" },
  { text: "后端开发", icon: "server", link: "/backend/" },
  { text: "前端开发", icon: "laptop-code", link: "/frontend/" },
  { text: "算法与数据结构", icon: "diagram-project", link: "/algorithm/" },
  { text: "计算机基础", icon: "desktop", link: "/computer-fundamentals/" },
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
          { text: "Kimi", link: "https://kimi.moonshot.cn/" },
          { text: "DeepSeek", link: "https://chat.deepseek.com/" },
          { text: "GLM", link: "https://chatglm.cn/" },
          { text: "MiniMax", link: "https://www.minimaxi.com/" },
          { text: "通义千问", link: "https://www.qianwen.com/" },
          { text: "豆包", link: "https://www.doubao.com/" },
          { text: "腾讯元宝", link: "https://yuanbao.tencent.com/" },
          { text: "Hugging Face", link: "https://huggingface.co/" },
        ],
      },
      {
        text: "模型 API 与订阅",
        children: [
          { text: "Kimi API 平台", link: "https://platform.moonshot.cn/" },
          { text: "DeepSeek API 平台", link: "https://platform.deepseek.com/" },
          { text: "GLM API Token / 充值", link: "https://open.bigmodel.cn/" },
          { text: "阿里百炼", link: "https://bailian.console.aliyun.com/" },
        ],
      },
      {
        text: "云服务",
        children: [
          { text: "阿里云", link: "https://www.aliyun.com/" },
          { text: "火山引擎", link: "https://www.volcengine.com/" },
          { text: "华为云", link: "https://www.huaweicloud.com/" },
          { text: "腾讯云", link: "https://cloud.tencent.com/" },
          { text: "百度智能云", link: "https://cloud.baidu.com/" },
        ],
      },
      {
        text: "建站与文档",
        children: [
          { text: "VuePress Theme Hope", link: "https://theme-hope.vuejs.press/" },
          { text: "VuePress 官方文档", link: "https://vuejs.press/zh/" },
        ],
      },
    ]
  },
  { text: "关于作者", icon: "user", link: "/portfolio" },
]);
