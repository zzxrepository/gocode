import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/gocode/",

  lang: "zh-CN",
  title: "GoCode · 毛毛张",
  description: "跟着毛毛张学 Go",

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
