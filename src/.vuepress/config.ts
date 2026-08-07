import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  head: [
    [
      "script",
      {
        defer: true,
        src: "https://cloud.umami.is/script.js",
        "data-website-id": "6f8632c9-5b9d-425e-998f-f38c5491259b",
      },
    ],
  ],

  lang: "zh-CN",
  title: "GoCode · 毛毛张",
  description: "跟着毛毛张学 Go",

  theme,

  bundler: viteBundler({
    viteOptions: {
      css: {
        preprocessorOptions: {
          scss: {
            quietDeps: true,
            silenceDeprecations: ["if-function"],
          },
        },
      },
    },
  }),

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
