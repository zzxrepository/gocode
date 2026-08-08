# GoCode

GoCode 是毛毛张的个人编程学习网站，使用 VuePress 2 和 VuePress Theme Hope 搭建，目前通过 GitHub Pages 部署在：

```text
https://gocode.mmzhang.cn/
```

这个站点用于沉淀编程学习笔记、官方文档入口、AI 应用开发资料、后端开发知识、算法与数据结构、计算机基础、前端基础、开发工具、资源导航和网站维护说明。

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

安装依赖：

```bash
npm install
```

本地预览：

```bash
npm run docs:dev
```

清缓存后本地预览：

```bash
npm run docs:clean-dev
```

发布前构建检查：

```bash
npm run docs:build
```

发布静态站点（源码已提交并推送到 `master` 后）：

```bash
./deploy.sh
```

## 内容维护规则

- 网站公开内容统一写在 `src/` 下。
- 一个目录的首页使用 `README.md`。
- 文章元信息写在 frontmatter 中，常用字段包括 `title`、`shortTitle`、`order`、`icon`、`category`、`tag`。
- 同级文章顺序优先用 `order` 控制，侧边栏会按文件结构自动生成。
- 只有新增真正的顶级栏目时，才需要同时调整 `src/.vuepress/navbar.ts` 和 `src/.vuepress/sidebar.ts`。
- 普通文章不要塞进顶部导航，普通文章交给左侧侧边栏管理。
- 全站共用静态资源放在 `src/.vuepress/public/`。
- 资源导航里如果有官方中文文档，优先放中文链接。
- 资源导航要控制质量，不要堆砌低质量、重复、很少用的网站。

## 教程写作要求

- 教程必须是可独立阅读的文章：读者不需要知道需求来源或此前的对话，也能理解它要解决的问题、核心概念、示例和结论。
- 对话只用于确定选题与范围，不能把需求沟通、写作计划、个人背景或问答内容整理进正文。
- 实质性教程应包含 `## 前言` 和 `## 总结`。示例、前提条件、使用边界和方案对比应围绕解释主题服务。
- 技术术语应准确、稳定；涉及版本、协议、框架行为等内容时，以官方文档、规范或项目原始文档为准。
- `## 参考资料` 按实际需要添加，只列出实际用于核对或支撑文章的资料，优先官方文档、规范和项目文档，不添加凑数链接。

## 当前站点配置

当前域名配置：

```text
src/.vuepress/config.ts       base: "/"
src/.vuepress/theme.ts        hostname: "https://gocode.mmzhang.cn"
src/.vuepress/public/CNAME    gocode.mmzhang.cn
```

当前阿里云 DNS 解析：

```text
gocode.mmzhang.cn -> CNAME -> zzxrepository.github.io
```

除非部署域名发生变化，否则不要随便修改 `base`、`hostname` 和 `CNAME`。

当前站点增强能力：

- 搜索：`@vuepress/plugin-slimsearch`，配置在 `src/.vuepress/theme.ts`。
- 评论：Giscus，配置在 `src/.vuepress/theme.ts`。
- 访问统计：Umami Cloud 脚本，配置在 `src/.vuepress/config.ts`。

## 维护与发布流程

以后更新这个项目时，先读本 README，再读 `src/site-guide/README.md`，然后阅读当前栏目首页和目标文章。

只改文章或资源内容时：

1. 修改 `src/` 下对应的 Markdown 文件。
2. 检查 frontmatter 和侧边栏排序。
3. 如果新增资源链接，要顺手检查整个资源分类的质量、语言、重复情况和使用价值。
4. 执行 `npm run docs:build`。
5. 提交源码到 `master`。
6. 推送 `master` 到远端。
7. 把构建产物发布到 `gh-pages`。
8. 确认构建产物里仍然有 `CNAME` 和 `.nojekyll`。

修改站点配置时：

1. 先判断改动应该放在 `config.ts`、`theme.ts`、`navbar.ts`、`sidebar.ts`、样式文件还是静态资源里。
2. 如果这个改动会影响以后维护方式，要同步更新 `src/site-guide/README.md`。
3. 执行 `npm run docs:build`。
4. 推送源码并部署 `gh-pages`。
5. 部署后检查对应线上页面。

重要习惯：

- 不要回滚和当前任务无关的本地改动。
- 不要删除 `src/.vuepress/public/CNAME`。
- 不要删除 `src/.vuepress/public/.nojekyll`。
- 不要同时混用多个评论系统，除非毛毛张明确要求。
- 根目录 README 只写项目用途和维护操作；很长的网站搭建说明放到 `src/site-guide/README.md`。
- 除非明确要求不发布，每次完成项目更新后都要构建、提交任务相关改动、推送 `master` 并部署 `gh-pages`。
- `./deploy.sh` 只负责构建并发布静态文件到 `gh-pages`；源码必须先由明确的提交推送步骤发布到 `master`。

## 更多说明

完整的网站搭建、文章发布和维护指南在：

```text
src/site-guide/README.md
```
