# GoCode 项目说明与维护规则

GoCode 是个人编程学习网站，使用 VuePress 2 与 VuePress Theme Hope 搭建，并通过 GitHub Pages 部署在：

```text
https://gocode.mmzhang.cn/
```

站点用于沉淀编程学习笔记、官方文档入口、AI 应用开发资料、后端开发知识、算法与数据结构、计算机基础、前端基础、开发工具、资源导航和网站维护说明。

## 技术栈

- VuePress 2
- VuePress Theme Hope
- Vite 打包器
- Markdown 内容，统一放在 `src/` 下
- GitHub Pages 静态站部署，发布分支是 `gh-pages`
- 自定义域名通过 `src/.vuepress/public/CNAME` 维护
- 评论系统使用 Giscus，基于 GitHub Discussions
- 站内搜索使用 SlimSearch 本地全文搜索
- 访问统计使用 Umami Cloud

## 项目结构

```text
gocode/
├── src/
│   ├── README.md                  # 网站首页
│   ├── backend/                   # 后端开发笔记
│   ├── algorithm/                 # 算法与数据结构
│   ├── computer-fundamentals/     # 计算机网络、操作系统等基础
│   ├── frontend/                  # 前端基础
│   ├── tools/                     # 开发工具
│   ├── ai-application-development/# AI 应用开发
│   ├── learning-paths/            # 学习路线
│   ├── resources/                 # 资源导航
│   ├── site-guide/                # 网站维护指南
│   └── .vuepress/
│       ├── config.ts              # base、head 脚本、主题入口
│       ├── theme.ts               # 主题、插件、搜索、评论、重定向
│       ├── navbar.ts              # 顶部导航
│       ├── sidebar.ts             # 侧边栏入口规则
│       ├── public/                # 静态资源、CNAME、.nojekyll
│       └── styles/                # 主题样式覆盖
├── package.json
├── package-lock.json
└── deploy.sh
```

## 常用命令

```bash
npm install             # 安装依赖
npm run docs:dev        # 本地预览
npm run docs:clean-dev  # 清缓存后本地预览
npm run docs:build      # 发布前构建检查
./deploy.sh             # 源码已推送 master 后，发布静态站点到 gh-pages
```

## 站点配置

```text
src/.vuepress/config.ts       base: "/"
src/.vuepress/theme.ts        hostname: "https://gocode.mmzhang.cn"
src/.vuepress/public/CNAME    gocode.mmzhang.cn
gocode.mmzhang.cn             CNAME -> zzxrepository.github.io
```

除非部署域名发生变化，不要随意修改 `base`、`hostname` 和 `CNAME`。搜索配置在 `src/.vuepress/theme.ts`，评论配置在同一文件，Umami Cloud 脚本配置在 `src/.vuepress/config.ts`。完整的建站、发布和维护说明位于 `src/site-guide/README.md`。

## 开始前

每次处理本项目时，按以下顺序阅读：

1. 本文件 `AGENTS.md`
2. `src/site-guide/README.md`
3. 当前栏目首页和目标文章

遵循已有的 frontmatter、目录、命名和导航约定。保留与当前任务无关的工作区改动，不擅自回滚、删除或提交它们。
<!-- 
## 教程内容

- 教程必须面向读者独立成文：读者不需要知道需求来源或此前对话，也能理解它要解决的问题、核心概念、示例和结论。
- 对话只用于确定选题与范围。不要把需求沟通、写作计划、个人背景、问答或“前面提到过”的表述整理进公开正文。
- 正文不解释文章为何放在某个栏目、目录如何调整、与此前文章的编排关系，也不使用“本篇、下一篇、后面会学”等课程导航语。需要说明前置概念时，直接讲技术关系与适用边界。
- 实质性教程在开头设置 `## 前言`，在末尾设置 `## 总结`。示例、前提条件、使用边界和方案对比只在有助于解释主题时使用。
- 教程中的示例代码、关键配置和源码片段必须配有必要的中文注释或紧邻的逐段说明。注释应解释设计意图、关键调用、数据流和容易误用的行为，不能只重复代码字面含义。
- 把文章放入正确的学习栏目，并保持标题、frontmatter、排序、分类、标签和标题层级与附近内容一致。
- 技术术语应准确、稳定。涉及版本、协议、框架行为或外部规范时，优先查阅官方文档、规范和项目原始资料。
- `## 参考资料` 按实际需要添加：只列出实际用于核对或支撑文章的资料，优先官方文档、规范和项目文档，不添加凑数链接。
- 文章不能只是泛泛介绍，要有真实学习和理解的味道。应像认真读过源码和文档后，把知识掰开讲给别人听，而不是模板化地罗列概念和 API，也就是不要像AI 那种一板一眼的总结。 -->

## 内容与站点维护

- 网站公开内容位于 `src/`；目录首页使用 `README.md`；同级顺序优先由 frontmatter 的 `order` 控制。
- 侧边栏按“知识栏目 → 专题分组 → 文章”组织，学习栏目内部最多展示三级。课程根节点（例如 `GO`）只是容器，不计入这三级。
- 只有真正包含子内容的专题分组才使用“目录 + `README.md`”。叶子文章必须使用直接的 `.md` 文件，不能再建“文章目录 + `README.md`”，否则会在侧边栏显示为可展开分组和同名文章两次。
- 叶子文章不设置 `dir` 或 `icon`；图标只用于栏目和专题分组。迁移已有叶子文章时，用 `permalink` 保持原网页地址，并为无法保留的旧地址配置重定向。
- 新增或调整目录后，检查侧边栏：同名文章不得重复出现，叶子文章不得显示为可展开分组。
- 新增资源链接时，检查整个分类的质量、语言、重复情况和使用价值；有官方中文资料时优先使用。
- `src/resources/README.md` 的一级分类使用手工锚点侧边栏；新增、删除或改名一级分类时，必须同步更新 `src/.vuepress/sidebar.ts` 中的 `/resources/` 配置。
- 仅在新增真正的顶级栏目时修改 `src/.vuepress/navbar.ts` 和 `src/.vuepress/sidebar.ts`。
- 保留 `src/.vuepress/public/CNAME` 和 `src/.vuepress/public/.nojekyll`。搜索引擎验证文件应保留在 `src/.vuepress/public/`，确保它们进入部署产物。
- 修改会影响后续维护方式的站点配置时，同步更新 `src/site-guide/README.md`。

## 验证与发布

除非用户明确要求不发布，每次完成项目更新后都执行以下流程：

1. 运行 `npm run docs:build`。
2. 只提交当前任务相关的源码改动到 `master`，使用清晰的提交信息；不要暂存无关工作区改动。
3. 推送 `master` 到 `origin`。
4. 运行 `./deploy.sh` 构建并强制推送静态站点到 `gh-pages`。
5. 确认远端 `master`、`gh-pages` 和本地工作区状态；确认部署产物仍包含 `CNAME`、`.nojekyll` 与必要的验证文件。

`./deploy.sh` 只负责构建和发布静态文件，不能替代源码的提交与推送步骤。
