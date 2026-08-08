import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://gocode.mmzhang.cn",

  author: {
    name: "神马都会亿点点的毛毛张",
  },

  // 用于导航栏、浏览器标签页与收藏夹的站点图标
  logo: "/maomao-zhang-logo-clean.png",
  favicon: "/maomao-zhang-logo-clean.png",

  repo: "zzxrepository/gocode",

  // 源码位于 GitHub 的 master 分支，用于生成“在 GitHub 上编辑此页”链接
  docsBranch: "master",

  docsDir: "src",

  // 导航栏
  navbar,

  // 侧边栏
  sidebar,
  sidebarSorter: ["readme", "order", "title", "filename"],

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
    comment: {
      provider: "Giscus",
      repo: "zzxrepository/gocode",
      repoId: "R_kgDOQ7csNw",
      category: "Comments",
      categoryId: "DIC_kwDOQ7csN84DC32n",
      mapping: "pathname",
      strict: false,
      reactionsEnabled: true,
      inputPosition: "bottom",
    },

    slimsearch: {
      indexContent: true,
      suggestion: true,
      queryHistoryCount: 5,
      resultHistoryCount: 5,
    },

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
        "/go/basics.html": "/backend/go/basic/01-project-structure/",
        "/go/concurrency.html": "/backend/go/advanced/02-concurrency/",
        "/go/gin.html": "/backend/go/frameworks-and-ecosystem/01-web-frameworks/",
        "/go/engineering.html": "/backend/go/advanced/04-engineering-practice/",
        "/backend/go/basic/": "/backend/go/basic/01-project-structure/",
        "/backend/go/advanced/": "/backend/go/advanced/01-standard-library/",
        "/backend/go/frameworks-and-ecosystem/": "/backend/go/frameworks-and-ecosystem/01-web-frameworks/",
        "/backend/go/advanced/01-standard-library/04-net-http/": "/backend/go/advanced/03-web-development/01-http-server/",
        "/backend/go/advanced/04-engineering-practice/01-viper-config/": "/backend/go/frameworks-and-ecosystem/04-common-libraries/01-viper-config/",
        "/backend/go/advanced/06-third-party-libraries/01-viper-config/": "/backend/go/frameworks-and-ecosystem/04-common-libraries/01-viper-config/",
        "/backend/go/frameworks-and-ecosystem/04-common-libraries/01-configuration/": "/backend/go/frameworks-and-ecosystem/04-common-libraries/01-viper-config/",
        "/backend/go/frameworks-and-ecosystem/04-common-libraries/01-configuration/01-viper-config/": "/backend/go/frameworks-and-ecosystem/04-common-libraries/01-viper-config/",
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
