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

以前新增文章时，经常需要同时创建文件、修改 `sidebar.ts`、手写上一篇和下一篇链接。现在站点已经迁移为 **order + structure 自动侧边栏**：新增文章时，优先维护文章自己的 frontmatter；只有新增顶级栏目或特殊导航时，才需要改配置文件。

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
│   ├── site-guide/                # 网站维护指南
│   └── .vuepress/
│       ├── config.ts              # 站点基础配置
│       ├── theme.ts               # 主题、插件、重定向、排序规则
│       ├── navbar.ts              # 顶部导航
│       └── sidebar.ts             # 左侧目录入口与结构化侧边栏范围
├── package.json
└── deploy.sh
```

## 文件和网页地址

| 本地文件 | 网页地址 |
| --- | --- |
| `src/backend/go/basic/README.md` | `/gocode/backend/go/basic/` |
| `src/backend/go/basic/09-methods/README.md` | `/gocode/backend/go/basic/09-methods/` |
| `src/algorithm/leetcode/hot-100/two-sum.md` | `/gocode/algorithm/leetcode/hot-100/two-sum.html` |

在配置里写内部链接时，通常省略部署前缀 `/gocode`，例如：

```text
/backend/go/basic/09-methods/
```

文章正文里引用站内页面，也优先使用这种根路径写法。

## 自动侧边栏规则

当前 `src/.vuepress/sidebar.ts` 只负责定义大的栏目入口。栏目内部文章列表由 VuePress Theme Hope 的 `children: "structure"` 自动生成。

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
| `shortTitle` | 侧边栏、面包屑等位置使用的短标题 |
| `icon` | 页面图标 |
| `order` | 同级页面排序，数字越小越靠前 |
| `category` | 文章分类 |
| `tag` | 文章标签 |

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
| 希望某篇文章出现在顶部导航 | 需要 |
| 修改资源导航下拉链接 | 需要 |

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
