#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e

# ===================== 第一步：提交项目源码到 master 分支 =====================
# 1. 添加所有源码文件（.gitignore 中配置的文件会自动忽略）
# git init
git add -A
git commit -m "docs: update project source code" || echo "No changes to commit for source code"

# 3. 确认已关联远程仓库
git remote get-url origin
REPO_URL="$(git remote get-url origin)"

# 4. 推送源码到远程 master 分支
git push -u origin master

# ===================== 第二步：推送静态文件到 gh-pages 分支 =====================
# 生成静态文件到临时目录，避免旧 dist 目录中的 Git 元数据影响构建
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT
npx vuepress-vite build src --dest "$BUILD_DIR"

# 进入生成的静态文件目录
cd "$BUILD_DIR"

# 初始化临时仓库并提交静态文件
git init
git remote add origin "$REPO_URL"
git add -A
git commit -m 'deploy: update static files to gh-pages'

# 强制推送静态文件到 gh-pages 分支
git push -f origin HEAD:gh-pages

# 返回项目根目录
cd -

echo "✅ 部署完成！源码已推送到 master 分支，静态文件已推送到 gh-pages 分支"
