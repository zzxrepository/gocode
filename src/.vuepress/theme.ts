import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://zzxrepository.github.io",

  author: {
    name: "神马都会亿点点的毛毛张",
  },

  // 用于导航栏、浏览器标签页与收藏夹的站点图标
  logo: "/maomao-zhang-logo-clean.png",
  favicon: "/maomao-zhang-logo-clean.png",

  repo: "zzxrepository/gocode",

  docsDir: "src",

  // 导航栏
  navbar,

  // 侧边栏
  sidebar,

  // 页脚
  footer: "Copyright © 2026 神马都会亿点点的毛毛张",
  displayFooter: true,

  // 多语言配置
  metaLocales: {
    editLink: "在 GitHub 上编辑此页",
  },

  // 如果想要实时查看任何改变，启用它。注: 这对更新性能有很大负面影响
  // hotReload: true,

  // 此处开启了很多功能用于演示，你应仅保留用到的功能。
  markdown: {
    align: true,
    attrs: true,
    codeTabs: true,
    component: true,
    demo: true,
    figure: true,
    footnote: true,
    flowchart: true,
    gfm: true,
    imgLazyload: true,
    imgSize: true,
    include: true,
    mark: true,
    math: {
      type: "katex",
    },
    mermaid: true,
    plantuml: true,
    spoiler: true,
    stylize: [
      {
        matcher: "Recommended",
        replacer: ({ tag }) => {
          if (tag === "em")
            return {
              tag: "Badge",
              attrs: { type: "tip" },
              content: "Recommended",
            };
        },
      },
    ],
    sub: true,
    sup: true,
    tabs: true,
    tasklist: true,
    vPre: true,

    // 如果你需要幻灯片，安装 @vuepress/plugin-revealjs 并取消下方注释
    // revealjs: {
    //   plugins: ["highlight", "math", "search", "notes", "zoom"],
    // },

    // 在启用之前安装 chart.js
    // chartjs: true,

    // insert component easily

    // 在启用之前安装 echarts
    // echarts: true,

    // playground: {
    //   presets: ["ts", "vue"],
    // },

    // 在启用之前安装 @vue/repl
    // vuePlayground: true,

    // 在启用之前安装 sandpack-vue3
    // sandpack: true,
  },

  // 在这里配置主题提供的插件
  plugins: {
    // 评论功能暂未启用。配置自己的 Giscus 仓库后再在此处开启。

    components: {
      components: ["Badge", "VPCard"],
    },

    icon: {
      prefix: "fa6-solid:",
    },

    redirect: {
      config: {
        "/tree/": "/algorithm/",
        "/go/": "/backend/go/",
        "/go/basics.html": "/backend/go/basics.html",
        "/go/concurrency.html": "/backend/go/concurrency.html",
        "/go/gin.html": "/backend/go/gin.html",
        "/go/engineering.html": "/backend/go/engineering.html",
        "/java/": "/backend/java/",
        "/java/basics.html": "/backend/java/basics.html",
        "/java/collections-and-concurrency.html": "/backend/java/collections-and-concurrency.html",
        "/java/jvm-and-frameworks.html": "/backend/java/jvm-and-frameworks.html",
        "/database/": "/backend/database/",
        "/database/mysql.html": "/backend/database/mysql.html",
        "/database/redis.html": "/backend/database/redis.html",
      },
    },

    // 如果你需要 PWA。安装 @vuepress/plugin-pwa 并取消下方注释
    // pwa: {
    //   favicon: "/favicon.ico",
    //   cacheHTML: true,
    //   cacheImage: true,
    //   appendBase: true,
    //   apple: {
    //     icon: "/assets/icon/apple-icon-152.png",
    //     statusBarColor: "black",
    //   },
    //   msTile: {
    //     image: "/assets/icon/ms-icon-144.png",
    //     color: "#ffffff",
    //   },
    //   manifest: {
    //     icons: [
    //       {
    //         src: "/assets/icon/chrome-mask-512.png",
    //         sizes: "512x512",
    //         purpose: "maskable",
    //         type: "image/png",
    //       },
    //       {
    //         src: "/assets/icon/chrome-mask-192.png",
    //         sizes: "192x192",
    //         purpose: "maskable",
    //         type: "image/png",
    //       },
    //       {
    //         src: "/assets/icon/chrome-512.png",
    //         sizes: "512x512",
    //         type: "image/png",
    //       },
    //       {
    //         src: "/assets/icon/chrome-192.png",
    //         sizes: "192x192",
    //         type: "image/png",
    //       },
    //     ],
    //     shortcuts: [
    //       {
    //         name: "Demo",
    //         short_name: "Demo",
    //         url: "/demo/",
    //         icons: [
    //           {
    //             src: "/assets/icon/guide-maskable.png",
    //             sizes: "192x192",
    //             purpose: "maskable",
    //             type: "image/png",
    //           },
    //         ],
    //       },
    //     ],
    //   },
    // },
  },
});
