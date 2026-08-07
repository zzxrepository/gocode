---
title: 网站维护与文章发布指南
shortTitle: 网站维护指南
order: 8
dir:
  link: true
  collapsible: true
  order: 8
icon: book-open
date: 2026-08-02
category:
  - 网站维护
tag:
  - VuePress
  - 写作
  - 自动侧边栏
---

# 网站维护与文章发布指南

本站使用 **VuePress 2 + VuePress Theme Hope** 搭建。内容写在 Markdown 文件里，顶部导航由配置控制，左侧文章目录主要由文件结构和 frontmatter 自动生成。

站点采用 **order + structure 自动侧边栏** 组织文章目录。新增文章时，优先维护文章自身的 frontmatter，用 `order` 控制同级排序，由文件结构生成左侧目录；只有新增顶级栏目、特殊导航入口或外部链接分组时，才需要调整配置文件。

## 项目结构

```text
gocode/
├── src/
│   ├── README.md                  # 网站首页
│   ├── backend/                   # 后端开发
│   │   ├── go/                    # Go 教程
│   │   │   ├── basic/             # Go 基础知识
│   │   │   └── advanced/          # Go 进阶知识
│   │   ├── java/                  # Java 教程
│   │   ├── database/              # 数据库
│   │   ├── message-queue/         # 消息队列
│   │   └── microservices/         # 微服务与分布式
│   ├── algorithm/                 # 算法与数据结构
│   ├── computer-fundamentals/     # 计算机基础
│   ├── tools/                     # 开发工具
│   ├── ai-application-development/# AI 应用开发
│   ├── frontend/                  # 前端开发
│   ├── learning-paths/            # 学习路线
│   ├── resources/                 # 资源导航
│   ├── site-guide/                # 网站维护指南
│   └── .vuepress/
│       ├── config.ts              # 站点基础配置
│       ├── theme.ts               # 主题、插件、重定向、排序规则
│       ├── navbar.ts              # 顶部导航
│       ├── sidebar.ts             # 左侧目录入口与结构化侧边栏范围
│       ├── client.ts              # 客户端增强组件
│       ├── public/                # 全站静态资源
│       │   ├── CNAME              # GitHub Pages 自定义域名
│       │   └── .nojekyll          # 关闭 GitHub Pages 的 Jekyll 处理
│       └── styles/                # 全站样式覆盖
├── package.json
└── deploy.sh
```

## 从零构建同款网站

从零构建一个类似本站的技术文档网站，核心工作可以拆成三层：先搭好 VuePress 2 与 VuePress Theme Hope 的站点骨架，再配置导航、侧边栏、主题增强和部署流程，最后按学习栏目组织 Markdown 内容。完成这些基础设置后，新增文章主要依靠 frontmatter 和文件结构完成，不需要频繁修改导航配置。

### 初始化项目

项目可以从一个空目录开始：

```bash
mkdir gocode
cd gocode
npm init -y
```

`package.json` 建议设置为 ESM 项目，并准备本地预览、清缓存预览、构建和主题包更新脚本：

```json
{
  "name": "gocode",
  "description": "GoCode · 毛毛张｜跟着毛毛张学 Go",
  "version": "2.0.0",
  "license": "MIT",
  "type": "module",
  "scripts": {
    "docs:build": "vuepress-vite build src",
    "docs:clean-dev": "vuepress-vite dev src --clean-cache",
    "docs:dev": "vuepress-vite dev src",
    "docs:update-package": "npx vp-update"
  }
}
```

依赖分为 VuePress 核心、Vite 打包器、Hope 主题、Vue 运行时、Markdown 增强能力和本地搜索。本站使用的依赖如下：

```bash
npm install -D vuepress @vuepress/bundler-vite vuepress-theme-hope vue vite sass-embedded mermaid katex flowchart.ts @vuepress/plugin-slimsearch
```

如果需要完全复现当前版本，可以参考 `package.json` 中的版本号锁定依赖。版本锁定的好处是构建结果更稳定，缺点是需要定期主动升级并验证主题行为。

### 创建基础目录

VuePress 的内容根目录是 `src/`。站点配置放在 `src/.vuepress/`，文章按栏目放在 `src/` 下的不同目录。

```text
src/
├── README.md
├── backend/
├── algorithm/
├── computer-fundamentals/
├── frontend/
├── tools/
├── resources/
├── site-guide/
└── .vuepress/
    ├── config.ts
    ├── theme.ts
    ├── navbar.ts
    ├── sidebar.ts
    ├── client.ts
    ├── public/
    └── styles/
```

`src/README.md` 是网站首页。每个顶级栏目通常也需要一个 `README.md`，它既是栏目首页，也负责用 frontmatter 声明栏目标题、图标、排序和目录行为。

### 配置站点入口

`src/.vuepress/config.ts` 是 VuePress 的站点入口配置。这个文件主要声明部署路径、语言、站点标题、描述、主题和 Vite 构建设置。

```ts
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
});
```

`base` 要和最终部署地址匹配。本站当前部署在 `https://gocode.mmzhang.cn/` 的根路径下，因此设置为 `/`。如果改回 GitHub Pages 仓库子路径，例如 `https://zzxrepository.github.io/gocode/`，才需要设置为 `/gocode/`。

### 配置主题能力

`src/.vuepress/theme.ts` 负责 Hope 主题配置。这个文件决定站点导航、侧边栏、页脚、仓库链接、图标前缀、Markdown 增强、重定向和组件注册。

```ts
import { hopeTheme } from "vuepress-theme-hope";

import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://gocode.mmzhang.cn",

  author: {
    name: "神马都会亿点点的毛毛张",
  },

  logo: "/maomao-zhang-logo-clean.png",
  favicon: "/maomao-zhang-logo-clean.png",

  repo: "zzxrepository/gocode",
  docsBranch: "master",
  docsDir: "src",

  navbar,
  sidebar,
  sidebarSorter: ["readme", "order", "title", "filename"],

  footer: "Copyright © 2026 神马都会亿点点的毛毛张",
  displayFooter: true,

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
  },
});
```

其中 `sidebarSorter` 是当前站点文章组织方式的关键设置。它让目录首页优先显示，然后按 `order`、标题和文件名排序。配合每篇文章的 frontmatter，可以形成稳定的课程式目录。

### 配置顶部导航

`src/.vuepress/navbar.ts` 控制顶部导航。顶级导航适合放主要学习栏目、资源导航和关于作者，不适合放过多普通文章。

```ts
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
```

资源类内容建议做成独立页面，而不是做成很长的顶部下拉菜单。独立页面更适合继续扩展分类、说明和卡片样式。

### 配置自动侧边栏

`src/.vuepress/sidebar.ts` 控制左侧目录入口。本站的做法是：顶层栏目首页要作为左侧栏第一项出现，形成统一的当前栏目入口；栏目内部再交给 `children: "structure"` 自动读取文件结构。

```ts
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
        { text: "资源导航", icon: "compass", link: "/resources/" },
      ],
    },
  ],

  "/backend/": [
    { text: "后端开发", icon: "server", link: "/backend/" },
    {
      text: "GO",
      icon: "terminal",
      link: "/backend/go/",
      collapsible: true,
      collapsed: false,
      children: [
        {
          text: "Golang 基础知识",
          icon: "book-open",
          collapsible: true,
          collapsed: false,
          prefix: "go/basic/",
          children: "structure",
        },
      ],
    },
  ],

  "/algorithm/": "structure",
  "/computer-fundamentals/": "structure",
  "/tools/": "structure",
  "/resources/": [
    { text: "资源导航", icon: "compass", link: "/resources/" },
    { text: "常用搜索", icon: "magnifying-glass", link: "/resources/#常用搜索" },
    { text: "官方文档", icon: "book-open", link: "/resources/#官方文档" },
    { text: "AI 工具", icon: "robot", link: "/resources/#ai-工具" },
  ],
  "/site-guide/": "structure",
});
```

对于 Go 这类层级更深的栏目，可以在 `sidebar.ts` 中固定上层分组，再让子目录自动生成。例如 `backend/go/basic/` 和 `backend/go/advanced/` 可以分别作为结构化侧边栏范围。

资源导航这类“所有内容都在一页”的页面，可以在 `sidebar.ts` 中手写锚点链接，例如 `/resources/#官方文档`。这样左侧栏看起来像一级目录，点击时仍然停留在同一个页面内跳转。此类页面可以在 frontmatter 中设置 `toc: false`，避免右侧再出现一份重复的“此页内容”。

### 准备首页

首页写在 `src/README.md`。Hope 主题支持通过 frontmatter 生成首页英雄区、行动按钮和推荐栏目。

```md
---
home: true
icon: house
title: 跟着毛毛张学 Go
heroImage: /maomao-zhang-logo-clean.png
heroText: GoCode · 毛毛张
tagline: 跟着毛毛张学 Go，系统学习软件开发与 AI 应用开发
actions:
  - text: 开始学习 Go
    icon: terminal
    link: /backend/go/
    type: primary
  - text: 资源导航
    icon: compass
    link: /resources/
---
```

首页的重点是提供入口，而不是承载所有内容。主要栏目、学习路线、资源导航和项目实践适合放在首页，具体文章交给栏目页和侧边栏管理。

### 创建栏目与文章

每个顶级栏目建议准备一个 `README.md`。例如 `src/tools/README.md`：

```md
---
title: 开发工具
shortTitle: 开发工具
order: 4
dir:
  link: true
  collapsible: true
  order: 4
icon: screwdriver-wrench
category:
  - 开发工具
tag:
  - Docker
  - Git
---

# 开发工具

这里整理日常开发和部署最常用的工具教程。
```

长教程适合使用目录型文章，例如：

```text
src/backend/go/basic/09-methods/README.md
```

短文章可以直接使用 Markdown 文件，例如：

```text
src/tools/git/branch-and-collaboration.md
```

目录型文章更适合课程章节，因为后续可以继续添加图片、示例代码和子资源。

### 配置静态资源

全站公用静态资源放在 `src/.vuepress/public/`。例如站点 logo、favicon、首页图片和通用封面图。

```text
src/.vuepress/public/
├── maomao-zhang-logo-clean.png
├── go-gopher.png
└── assets/
    └── image/
        ├── go-context-cover.png
        └── go-encoding-cover.png
```

`public` 下的资源会被复制到站点根路径。文章中引用时从根路径开始写：

```md
![Go Gopher](/go-gopher.png)
```

如果是某个栏目独有的图片，也可以放在栏目自己的 `assets/` 目录里，然后使用相对路径引用。

### 配置全站样式

主题样式覆盖放在 `src/.vuepress/styles/index.scss`。本站在这里处理了导航图标颜色、Go 栏目图标替换、沉浸阅读按钮和资源导航卡片样式。

```scss
.vp-nav-links > .vp-nav-item:nth-child(1) .vp-icon {
  color: #2563eb;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}
```

样式覆盖应尽量限制作用范围。例如资源导航页使用 `.resource-grid`、`.resource-card` 这类专用类名，避免影响普通文章的排版。

### 添加客户端增强

`src/.vuepress/client.ts` 可以注册客户端组件。本站用它实现了一个“沉浸阅读”按钮，用于临时隐藏导航栏、侧边栏和目录，让长文章阅读更专注。

客户端增强适合放轻量交互功能，例如阅读模式、页面状态按钮、全局快捷键等。复杂业务功能不建议直接塞进文档站主题层，应该拆成独立组件或独立应用。

### 配置部署脚本

GitHub Pages 部署通常需要两步：先把源码推到 `master`，再把构建产物推到 `gh-pages`。

```sh
#!/usr/bin/env sh

set -e

git add -A
git commit -m "gocode v1" || echo "No changes to commit for source code"

git remote get-url origin
REPO_URL="$(git remote get-url origin)"

git push -u origin master

BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT
npx vuepress-vite build src --dest "$BUILD_DIR"

cd "$BUILD_DIR"
git init
git remote add origin "$REPO_URL"
git add -A
git commit -m 'deploy: update static files to gh-pages'
git push -f origin HEAD:gh-pages
cd -
```

使用临时目录构建可以避免旧的 `dist` 目录残留影响发布结果。`gh-pages` 分支通常只保留静态文件，不承载源码。

### 配置 GitHub Pages

仓库需要在 GitHub Pages 设置中选择 `gh-pages` 分支作为发布来源。如果不配置自定义域名，项目页默认访问地址形如：

```text
https://zzxrepository.github.io/gocode/
```

这种项目页部署方式需要把 `base` 设置为 `/gocode/`。

如果使用独立域名或子域名，访问路径通常是站点根路径。本站当前使用：

```text
https://gocode.mmzhang.cn/
```

对应配置为：

```text
src/.vuepress/config.ts       base: "/"
src/.vuepress/theme.ts        hostname: "https://gocode.mmzhang.cn"
src/.vuepress/public/CNAME    gocode.mmzhang.cn
```

域名解析在阿里云 DNS 中添加一条记录即可：

| 主机记录 | 记录类型 | 记录值 |
| --- | --- | --- |
| `gocode` | `CNAME` | `zzxrepository.github.io` |

GitHub Pages 的 Custom domain 填 `gocode.mmzhang.cn`。DNS 校验通过后再启用 Enforce HTTPS。

如果仓库名、部署路径或自定义域名不同，需要同步调整 `config.ts` 中的 `base`、`theme.ts` 中的 `hostname`、`public/CNAME`，以及 README 或导航中的站内链接。

### 完整构建流程

一个可复用的构建流程如下：

```text
1. 初始化 npm 项目并安装 VuePress、Hope 主题和 Markdown 增强依赖
2. 创建 src/ 与 src/.vuepress/ 目录
3. 编写 config.ts、theme.ts、navbar.ts、sidebar.ts
4. 准备首页、顶级栏目 README 和文章目录
5. 放置 logo、favicon、封面图等静态资源
6. 编写 styles/index.scss 做少量主题样式覆盖
7. 使用 npm run docs:dev 本地预览
8. 使用 npm run docs:build 做发布前检查
9. 使用 deploy.sh 推送源码和静态文件
10. 在 GitHub Pages 中确认 gh-pages 分支发布成功
```

这个流程完成后，站点的日常维护重点就会从“改配置”转为“写内容”。新增普通文章时，维护 frontmatter、文件路径和栏目 README 即可；只有新增顶级栏目、特殊导航入口、资源页布局或主题能力时，才需要调整 `.vuepress` 下的配置。

## 站点增强功能

搜索、评论、访问统计和自定义域名都属于站点级能力。它们通常不写在普通文章里，而是维护在 `.vuepress` 配置或 GitHub Pages 设置中。

### 添加全文搜索

本站使用 `@vuepress/plugin-slimsearch` 做本地全文搜索。它不需要第三方账号，也不需要服务器，适合个人文档站。

依赖安装：

```bash
npm install -D @vuepress/plugin-slimsearch
```

主题配置写在 `src/.vuepress/theme.ts` 的 `plugins` 中：

```ts
plugins: {
  slimsearch: {
    indexContent: true,
    suggestion: true,
    queryHistoryCount: 5,
    resultHistoryCount: 5,
  },
}
```

`indexContent: true` 表示索引正文内容。站点构建后会生成 `slimsearch.worker.js`，页面右上角会出现搜索入口，并支持 `Ctrl + K` 快捷键。

### 添加评论

本站使用 Giscus 作为评论系统。Giscus 基于 GitHub Discussions，适合 GitHub Pages、技术博客和开源文档站，不需要额外服务器。

配置位置是 `src/.vuepress/theme.ts`：

```ts
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
}
```

新增或重新配置 Giscus 时，先在 GitHub 仓库中开启 Discussions，并准备一个可讨论的分类，例如 `Comments`。然后在 Giscus 页面选择仓库、分类和映射方式，生成 `repoId`、`categoryId` 等参数，再填回主题配置。

如果改用 Waline，配置会变成：

```ts
plugins: {
  comment: {
    provider: "Waline",
    serverURL: "https://your-waline-server.example.com",
    pageview: true,
  },
}
```

Waline 支持评论和阅读量，但需要单独部署服务和数据库。Giscus 与 Waline 不建议同时作为评论系统启用。

### 添加访问统计

本站使用 Umami Cloud 统计访问数据。Umami 不需要安装前端依赖，只需要把它生成的脚本放进 VuePress 的 `head`。

配置位置是 `src/.vuepress/config.ts`：

```ts
export default defineUserConfig({
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
});
```

访问统计在 Umami Cloud 后台查看。本站入口已经放在资源导航的“建站与个人项目”分区。

### 维护自定义域名

自定义域名需要同时维护三处：

| 位置 | 当前值 | 作用 |
| --- | --- | --- |
| `src/.vuepress/config.ts` | `base: "/"` | 控制站内资源和路由前缀 |
| `src/.vuepress/theme.ts` | `hostname: "https://gocode.mmzhang.cn"` | 控制 sitemap、SEO 和站点元信息 |
| `src/.vuepress/public/CNAME` | `gocode.mmzhang.cn` | 让 GitHub Pages 绑定自定义域名 |

DNS 解析使用 CNAME：

```text
gocode.mmzhang.cn -> zzxrepository.github.io
```

如果以后改成根域名 `mmzhang.cn`，需要把 GitHub Pages 的 Custom domain、`public/CNAME` 和 `theme.ts` 的 `hostname` 一起改掉；`base` 仍然保持 `/`。

## 文件和网页地址

| 本地文件 | 网页地址 |
| --- | --- |
| `src/backend/go/basic/README.md` | `/backend/go/basic/` |
| `src/backend/go/basic/09-methods/README.md` | `/backend/go/basic/09-methods/` |
| `src/algorithm/leetcode/hot-100/two-sum.md` | `/algorithm/leetcode/hot-100/two-sum.html` |

在配置里写内部链接时，通常使用根路径，例如：

```text
/backend/go/basic/09-methods/
```

文章正文里引用站内页面，也优先使用这种根路径写法。

## 自动侧边栏规则

当前 `src/.vuepress/sidebar.ts` 负责定义大的栏目入口。栏目内部文章列表由 VuePress Theme Hope 的 `children: "structure"` 自动生成。顶级栏目首页通常要在侧边栏显示为第一项，因此栏目首页的 frontmatter 要保留 `dir.link: true`，不要随意写 `index: false`。

例如 Go 基础教程：

```ts
{
  text: "Golang 基础知识",
  icon: "book-open",
  collapsible: true,
  collapsed: false,
  prefix: "/backend/go/basic/",
  children: "structure",
}
```

主题会读取 `src/backend/go/basic/` 下的真实目录和 Markdown 文件：

- 目录会变成侧边栏分组。
- 目录里的 `README.md` 用来控制分组标题、图标、顺序和点击链接。
- 普通 `.md` 文件会变成文章链接。
- 同级内容先按 `order` 排序，再按标题或文件名排序。
- 不希望进入目录或索引的页面，写 `index: false`。

排序规则在 `src/.vuepress/theme.ts` 中显式声明：

```ts
sidebarSorter: ["readme", "order", "title", "filename"]
```

这表示目录首页优先，其次看 `order`，再看标题和文件名。

## 新增文章

最快路径：

```text
1. 选栏目：先确认文章应该放在哪个已有栏目下
2. 建文件：长教程优先建 13-generics/README.md，短文章可以建 generics.md
3. 写元信息：补齐 title / shortTitle / icon / order / category / tag
4. 写正文：一级标题和 title 保持一致，重点文章在标题下方放封面图
5. 查效果：执行 npm run docs:build，确认文章进入侧边栏且构建通过
6. 发上线：需要发布时执行 ./deploy.sh
```

普通文章使用下面的 frontmatter：

```md
---
title: 13. 泛型
shortTitle: 泛型
icon: code
order: 13
category:
  - Go
tag:
  - Go
  - 泛型
---

# 13. 泛型
```

字段说明：

| 字段 | 作用 |
| --- | --- |
| `title` | 页面完整标题，也影响浏览器标题 |
| `shortTitle` | 侧边栏、面包屑等位置使用的短标题；课程类文章如果要在侧边栏显示序号，要写成 `01. xxx` |
| `icon` | 页面图标 |
| `order` | 同级页面排序，数字越小越靠前；它只控制顺序，不会自动显示在侧边栏文字里 |
| `category` | 文章分类 |
| `tag` | 文章标签 |

侧边栏层级较深的文章项可以不写 `icon`。例如 `Go -> Golang 进阶知识 -> 01. 标准库 -> 01. context` 这类四级文章，去掉图标后目录会更清爽。

例如新增 Go 基础教程第 13 篇：

```text
src/backend/go/basic/13-generics/README.md
```

写好 `order: 13` 后，它会自动出现在 Go 基础教程侧边栏里，不需要手动修改 `sidebar.ts`。

## 新增目录

每个希望出现在侧边栏中的目录，都建议放一个 `README.md` 作为目录首页。

```md
---
title: 06. 网络编程
shortTitle: 网络编程
icon: network-wired
order: 6
dir:
  link: true
  collapsible: true
category:
  - Go
tag:
  - Go
  - 网络编程
---

# 06. 网络编程
```

目录 README 的关键点：

- `title`、`shortTitle`、`icon` 会影响目录页和侧边栏分组。
- `order` 控制这个目录在父级中的排序。
- `dir.link: true` 让侧边栏分组标题可以点击进入目录首页。
- `dir.collapsible: true` 让目录可以展开和收起。

目录下面继续放文章时，每篇文章也写自己的 `order`：

```text
src/backend/go/advanced/06-network-programming/
├── README.md
├── 01-tcp.md
├── 02-http.md
└── 03-websocket.md
```

## 什么时候还需要改 sidebar.ts

新增普通文章、在已有栏目里新增普通目录，通常不需要改 `sidebar.ts`。

仍然需要改 `sidebar.ts` 的情况主要有：

1. 新增顶级栏目，例如 `src/system-design/`。
2. 改变某个栏目的自动生成范围。
3. 插入外部链接、跨栏目链接或特殊固定分组。
4. 某个栏目不适合完全按照文件结构展示。
5. 需要关闭某个栏目的侧边栏。

如果只是新增一篇 Go、算法、数据库、工具类文章，优先检查 frontmatter，而不是改 sidebar。

## 什么时候需要改 navbar.ts

`navbar.ts` 控制顶部导航和资源下拉菜单。

| 场景 | 是否需要改 `navbar.ts` |
| --- | --- |
| 新增一篇普通文章 | 不需要 |
| 新增已有栏目下的子目录 | 通常不需要 |
| 新增顶级栏目 | 需要 |
| 新增资源导航页面里的链接 | 通常不需要，只改 `src/resources/README.md` |
| 希望某篇文章出现在顶部导航 | 需要 |
| 把某个页面做成顶部导航入口 | 需要 |

顶部导航是站点入口，不适合放太多普通文章。普通文章交给自动侧边栏管理即可。

## 图片放在哪里

有两种常用放法：

1. 全站公用图片放在 `src/.vuepress/public/`。
2. 某个栏目专用图片放在该栏目自己的 `assets/` 目录。

文件名建议使用英文、小写和连字符，例如：

```text
go-channel-flow.png
binary-tree-traversal.png
```

文章中引用 `public` 下的图片时，路径从站点根开始：

```md
![Go Gopher](/go-gopher.png)
```

长教程或重点文章建议在一级标题下方放一张 16:9 封面图，写法和 `context` 文章保持一致：

```md
# 01. context

![Go context 源码解析封面](/assets/image/go-context-cover.png)
```

封面图建议统一放在：

```text
src/.vuepress/public/assets/image/
```

文件名建议使用栏目和主题组合，例如：

```text
go-context-cover.png
go-struct-cover.png
go-reflect-cover.png
```

引用栏目内图片时，可以使用相对路径：

```md
![二叉树遍历](../assets/binary-tree-traversal.png)
```

## 本地预览和构建

边写边看：

```bash
npm run docs:dev
```

如果新增目录、调整 frontmatter 后侧边栏没有及时刷新，使用清缓存预览：

```bash
npm run docs:clean-dev
```

发布前构建检查：

```bash
npm run docs:build
```

部署到 GitHub Pages：

```bash
npm run docs:build && ./deploy.sh
```

## 常见问题

### 新文章写了但侧边栏没有显示

优先检查：

1. 文件是否放在 `src/` 下。
2. 所在栏目是否已经在 `sidebar.ts` 中启用 `children: "structure"`。
3. frontmatter 是否写了正确的 `title`。
4. 是否误写了 `index: false`。
5. 本地开发服务是否需要重启或执行 `npm run docs:clean-dev`。

### 文章顺序不对

检查同级文章的 `order`。

```md
---
title: 09. 方法
shortTitle: 方法
order: 9
---
```

同一级目录下建议使用连续数字，课程类文章最好让目录编号和 `order` 保持一致。

### 侧边栏标题太长

长标题文章要写 `shortTitle`：

```md
---
title: 二叉树前序遍历、中序遍历、后序遍历和层序遍历
shortTitle: 二叉树遍历
order: 1
---
```

这样页面标题仍然完整，侧边栏不会被长标题撑开。

### 目录不能点击

目录 README 里加：

```md
---
dir:
  link: true
  collapsible: true
---
```

### 不想让旧页面进入目录

在旧页面 frontmatter 中写：

```md
---
index: false
---
```

当前 Go 旧扁平页如 `backend/go/basics.md`、`backend/go/concurrency.md` 已经作为兼容页隐藏，新内容应维护在 `backend/go/basic/` 和 `backend/go/advanced/` 下。

## 推荐工作流

新增文章时按这个顺序做：

```text
1. 在正确栏目下创建 Markdown 或 README.md
2. 写好 title / shortTitle / icon / order
3. 编写正文
4. npm run docs:dev 本地预览
5. npm run docs:build 构建检查
6. 需要发布时执行 npm run docs:build && ./deploy.sh
```

核心原则是：**内容顺序由 frontmatter 管，栏目入口由 sidebar.ts 管，顶部曝光由 navbar.ts 管。**
