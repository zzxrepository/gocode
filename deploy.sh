#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e

# 源码应在运行本脚本前完成提交并推送到 master。
# 此脚本只负责构建静态站点并发布到 gh-pages。
git remote get-url origin
REPO_URL="$(git remote get-url origin)"

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

echo "部署完成：静态文件已推送到 gh-pages 分支"
