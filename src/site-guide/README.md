---
title: 网站维护与文章发布指南
icon: book-open
date: 2026-08-02
category:
  - 网站维护
tag:
  - VuePress
  - 写作
---

# 网站维护与文章发布指南

这是一套使用 **VuePress 2 + VuePress Theme Hope** 搭建的静态知识网站。文章写在 Markdown 文件中，目录、顶部导航和左侧文章树分别由少量配置文件控制。

这篇文档以当前 GoCode 项目的实际结构为准。以后要新增文章、扩充 Go 教程或调整栏目，按下面的步骤操作即可。

## 1. 先认识项目结构

```text
gocode/
├── src/                         # 所有会被生成到网站的内容
│   ├── README.md                 # 网站首页
│   ├── backend/                  # 后端开发的统一目录
│   │   ├── go/                   # Go 教程
│   │   ├── java/                 # Java 教程
│   │   ├── database/             # 数据库教程
│   │   └── microservices/        # 微服务与分布式
│   ├── frontend/                 # HTML、CSS、JavaScript
│   ├── algorithm/                # 算法与数据结构、LeetCode 题解
│   ├── computer-fundamentals/    # 计算机网络、操作系统
│   ├── tools/                    # Docker、Git、Maven
│   ├── ai-application-development/ # AI 应用开发
│   ├── portfolio.md              # 关于作者页面
│   └── .vuepress/                # 网站配置与图片资源
│       ├── config.ts             # 站点名称、访问基础路径等
│       ├── theme.ts              # 主题、Markdown 能力、GitHub 仓库等
│       ├── navbar.ts             # 顶部导航与“资源导航”下拉菜单
│       ├── sidebar.ts            # 左侧文章目录
│       ├── public/               # 可直接通过网址访问的图片等资源
│       └── styles/               # 自定义颜色和样式
├── package.json                  # npm 命令与依赖
└── deploy.sh                     # 提交源码并部署到 GitHub Pages 的脚本
```

### 文件名与网页地址的关系

| 本地文件 | 网页地址 |
| --- | --- |
| `src/backend/go/README.md` | `/gocode/backend/go/` |
| `src/backend/go/functions.md` | `/gocode/backend/go/functions.html` |
| `src/algorithm/leetcode/hot-100/two-sum.md` | `/gocode/algorithm/leetcode/hot-100/two-sum.html` |

在 `navbar.ts` 和 `sidebar.ts` 中写内部链接时，通常省略 `.html`，例如：`/backend/go/functions`。

## 2. 日常写文章：以新增 Go「函数与方法」教程为例

### 第一步：新建 Markdown 文件

在 `src/backend/go/` 下创建文件：`functions-and-methods.md`。

````md
---
title: Go 函数与方法
icon: code
date: 2026-08-02
category:
  - Go
tag:
  - Go 基础
  - 函数
---

# Go 函数与方法

## 函数

```go
func add(a int, b int) int {
  return a + b
}
```

## 方法

```go
type User struct {
  Name string
}

func (u User) Hello() string {
  return "Hello, " + u.Name
}
```
````

最上方的 `---` 到 `---` 是文章的元信息（frontmatter）：

- `title`：浏览器标题、文章标题。
- `icon`：文章标题旁的图标，可省略。
- `date`：发布日期，建议使用真实日期。
- `category`、`tag`：用于给文章分类和检索，可按需要增加或删除。

### 第二步：让文章出现在左侧目录

Go 同时会从两个入口访问：顶部“后端开发”里的 Go，以及首页“开始学习 Go”。因此，新文章要在 [sidebar.ts](../.vuepress/sidebar.ts) 的 **两个 Go 目录区块**中同时登记。

建议先把 Go 基础语法改成可容纳多篇文章的目录：

```ts
{
  text: "Go 基础语法",
  icon: "book-open",
  collapsible: true,
  collapsed: false,
  children: [
    { text: "基础语法与项目结构", link: "/backend/go/basics" },
    { text: "函数与方法", link: "/backend/go/functions-and-methods" },
  ],
}
```

这个片段只需放入 `sidebar.ts` 的 `"/backend/"` → `Go` 子目录。Go、Java、数据库和微服务都位于 `backend/` 下，所以读者从后端开发点进任何文章，左侧都会始终显示完整的后端目录。

### 第三步：逐步细化 Go 课程

当一个主题文章变多时，不要把所有文章都堆在 `src/backend/go/` 根目录。推荐按专题建文件夹：

```text
src/backend/go/
├── basics.md
├── functions-and-methods.md
├── data-structures/
│   ├── README.md                 # Go 数据结构概览
│   ├── array-and-slice.md
│   ├── map.md
│   └── stack-and-queue.md
├── concurrency/
│   ├── README.md
│   └── goroutine-and-channel.md
└── gin/
    ├── README.md
    └── routing.md
```

随后在后端开发的 Go 目录区块中增加一个可展开分组：

```ts
{
  text: "Go 数据结构",
  icon: "cubes-stacked",
  collapsible: true,
  collapsed: false,
  children: [
    { text: "学习概览", link: "/backend/go/data-structures/" },
    { text: "数组与切片", link: "/backend/go/data-structures/array-and-slice" },
    { text: "Map", link: "/backend/go/data-structures/map" },
    { text: "栈与队列", link: "/backend/go/data-structures/stack-and-queue" },
  ],
}
```

`README.md` 是该专题的首页；其余文件是具体文章。`collapsible: true` 代表读者可以展开或收起，`collapsed: false` 代表首次进入默认展开。

## 3. 修改已有文章

直接编辑对应的 `.md` 文件即可。例如：

- Go 基础：`src/backend/go/basics.md`
- 两数之和：`src/algorithm/leetcode/hot-100/two-sum.md`
- Docker 教程：`src/tools/docker/README.md`

常用 Markdown 写法：

````md
## 二级标题

[一个链接](https://example.com/)

![图片说明](/gocode/example.png)

`行内代码`

```go
fmt.Println("代码块")
```
````

本网站已经启用 Mermaid、TeX、脚注、选项卡、上下角标、图片尺寸、自定义属性等 Markdown 增强能力，它们统一在 [theme.ts](../.vuepress/theme.ts) 的 `markdown` 中开启。

## 4. 图片放在哪里

有两种常用方式：

1. **全站公用图片**：放入 `src/.vuepress/public/`，在文章里使用 `/gocode/文件名.png`。例如站点头像和 Go Gopher 图标就在这里。
2. **某个栏目专用图片**：放进该栏目自己的 `assets/` 目录，再用相对路径引用。例如算法图片放在 `src/algorithm/assets/`。

文件名建议使用英文、小写和连字符，例如 `go-channel-flow.png`，能避免不同系统和网址编码带来的问题。

## 5. 新建一个大栏目时要改哪里

假如将来新增“系统设计”栏目，需要完成这四件事：

1. 新建 `src/system-design/README.md`，作为栏目首页。
2. 在 `src/.vuepress/navbar.ts` 增加顶部导航项，决定它是否出现在最上方。
3. 在 `src/.vuepress/sidebar.ts` 增加 `"/system-design/"` 的左侧目录，决定文章如何分组、展开和收起。
4. 在首页 `src/README.md` 的 `highlights` 中增加一张学习卡片（推荐）。

### 顶部导航、左侧目录、资源下拉分别在哪里改？

| 想改的内容 | 修改文件 |
| --- | --- |
| 顶部栏目，例如“后端开发”“开发工具” | `src/.vuepress/navbar.ts` |
| “资源导航”的下拉链接 | `src/.vuepress/navbar.ts` |
| 点击栏目后左侧的文章树 | `src/.vuepress/sidebar.ts` |
| 首页卡片和按钮 | `src/README.md` |
| 作者介绍 | `src/portfolio.md` |
| 网站名、部署子路径 | `src/.vuepress/config.ts` |
| Markdown 功能、主题设置、GitHub 仓库 | `src/.vuepress/theme.ts` |
| 图标颜色、局部样式 | `src/.vuepress/styles/index.scss` |

因此，资源导航目前就是由 `navbar.ts` 的 `children` 下拉结构控制；单独写一个 Markdown 页面不能自动生成顶部下拉菜单。Markdown 页面适合写说明内容，导航配置负责把它放到哪里。

## 6. 本地预览、构建和部署

### 本地边写边看

在项目根目录执行：

```bash
npm run docs:dev
```

终端会给出本地地址，通常是 `http://localhost:8080/gocode/`。保存 Markdown 或配置文件后，浏览器会自动刷新。

### 发布到 GitHub Pages

确认本地内容无误后，执行当前项目约定的完整命令：

```bash
npm run docs:build && ./deploy.sh
```

它会：

1. 先检查网站能否构建成功；
2. 将源码提交并推送到 GitHub 的 `master` 分支；
3. 将生成的网站推送到 `gh-pages` 分支；
4. GitHub Pages 随后更新 `https://zzxrepository.github.io/gocode/`。

`deploy.sh` 内部也会再构建一次，这是为了确保部署的就是最新静态文件，因此看到第二次构建是正常的。

## 7. 常见问题

### 新文章写了但左侧没有显示

检查三件事：文件是否在 `src/` 下、`sidebar.ts` 是否增加了正确链接、链接是否与文件名一致。修改 `sidebar.ts` 后重新执行本地预览或构建。

### 顶部没有看到新栏目

顶部导航由 `navbar.ts` 控制；只创建文件夹或 Markdown 不会自动出现在顶部。

### 网站更新后浏览器还是旧内容

先等待 GitHub Pages 完成发布，再用 `Cmd + Shift + R` 强制刷新页面，避免浏览器缓存旧的 CSS 或 JavaScript。

## 8. 一条最实用的写作原则

**先写 Markdown，再登记目录，最后预览部署。**

也就是：先把一篇文章写清楚；再在 `sidebar.ts` 把它放进合适专题；需要顶级曝光时再改 `navbar.ts`；确认本地效果后运行部署命令。这样课程内容会持续长大，但网站结构仍然清晰。
