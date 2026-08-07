---
title: Git 常用命令
shortTitle: 常用命令
order: 1
icon: terminal
category:
  - Git
tag:
  - Git
  - 常用命令
  - 分支
  - 远端仓库
---

# Git 常用命令

这一节整理日常开发中最常用的 Git 命令。重点放在命令语法和参数位置，方便写代码时快速查阅。

## 基本查看

### 查看当前状态

```bash
git status
```

查看当前分支、暂存区、工作区改动，以及是否有未跟踪文件。

### 查看提交历史

```bash
git log
git log --oneline
git log --oneline --graph --decorate --all
```

`--oneline` 用一行显示一个提交；`--graph` 显示分支图；`--decorate` 显示分支名和标签；`--all` 显示所有分支。

### 查看具体改动

```bash
git diff
git diff --staged
git diff <commit1> <commit2>
```

`git diff` 查看工作区未暂存的改动。`git diff --staged` 查看已经 `git add` 但还没有提交的改动。两个提交之间的差异可以写成 `git diff <旧提交> <新提交>`。

## 暂存和提交

### 添加到暂存区

```bash
git add <file>
git add <dir>
git add .
git add -A
```

`<file>` 是某个文件，`<dir>` 是某个目录。`git add .` 添加当前目录下的改动。`git add -A` 添加整个仓库里的新增、修改和删除。

### 提交改动

```bash
git commit -m "提交说明"
```

提交说明建议写清楚这次改了什么，例如：

```bash
git commit -m "docs: add git common commands"
```

### 修改最近一次提交

```bash
git commit --amend
git commit --amend -m "新的提交说明"
```

`--amend` 会改写最近一次提交。已经推送到远端的提交不建议随便 amend，除非确认团队协作不会受影响。

## 分支操作

### 查看分支

```bash
git branch
git branch -a
```

`git branch` 查看本地分支。`git branch -a` 同时查看本地分支和远端跟踪分支。

### 创建分支

```bash
git branch <branch-name>
```

`<branch-name>` 是新分支名，例如：

```bash
git branch feature/login
```

这条命令只创建分支，不会自动切过去。

### 切换分支

```bash
git switch <branch-name>
```

`<branch-name>` 是本地已有分支名，例如：

```bash
git switch main
git switch feature/login
```

`git switch` 主要用于切换分支。如果要从某个提交哈希进入临时查看状态，要显式写 `--detach`：

```bash
git switch --detach <commit-hash>
```

`<commit-hash>` 是提交哈希，例如：

```bash
git switch --detach a1b2c3d
```

这种状态叫 detached HEAD，适合临时查看旧版本，不适合直接长期开发。如果要基于某个提交继续开发，更常见的写法是从这个提交创建新分支：

```bash
git switch -c <new-branch-name> <commit-hash>
```

### 创建并切换分支

```bash
git switch -c <branch-name>
```

例如：

```bash
git switch -c feature/profile
```

这等价于创建一个新分支，并立刻切换过去。

### 删除分支

```bash
git branch -d <branch-name>
git branch -D <branch-name>
```

`-d` 会在分支已经合并时删除。`-D` 是强制删除，未合并的改动也会丢掉对应分支引用，使用前要确认。

## 拉取和同步

### 查看远端仓库

```bash
git remote -v
```

常见远端名是 `origin`。`origin` 不是固定语法，而是远端仓库的名字。

### 拉取远端信息

```bash
git fetch
git fetch <remote>
```

`git fetch` 会下载远端分支和提交信息，但不会自动合并到当前分支。`<remote>` 通常是 `origin`。

### 拉取并合并

```bash
git pull
git pull <remote> <branch>
```

如果当前分支已经设置上游分支，直接执行：

```bash
git pull
```

如果没有设置上游分支，可以写完整：

```bash
git pull origin main
```

含义是从远端 `origin` 的 `main` 分支拉取，并合并到当前分支。

## 推送到远端

### 推送当前分支

```bash
git push
```

当前分支已经设置上游分支时，可以直接使用 `git push`。例如本地 `main` 跟踪 `origin/main`，本地 `feature/login` 跟踪 `origin/feature/login`，都可以直接 `git push`。

### 第一次推送新分支

```bash
git push -u <remote> <branch>
```

例如：

```bash
git push -u origin feature/login
```

`-u` 会把当前本地分支和远端分支建立上游关系。以后在这个分支上就可以直接：

```bash
git push
git pull
```

### 推送到指定远端分支

```bash
git push <remote> <local-branch>:<remote-branch>
```

例如：

```bash
git push origin feature/login:feature/login
git push origin feature/login:dev-login
```

冒号左边是本地分支，冒号右边是远端分支。第一条表示把本地 `feature/login` 推到远端同名分支。第二条表示把本地 `feature/login` 推到远端 `dev-login` 分支。

如果本地分支名和远端分支名相同，也常写成：

```bash
git push origin feature/login
```

这等价于把本地 `feature/login` 推送到远端 `origin` 上的同名分支。

### 删除远端分支

```bash
git push <remote> --delete <branch>
```

例如：

```bash
git push origin --delete feature/login
```

这会删除远端 `origin` 上的 `feature/login` 分支，不会删除本地同名分支。

## 合并和变基

### 合并分支

```bash
git merge <branch-name>
```

先切到目标分支，再合并来源分支。例如把 `feature/login` 合并到 `main`：

```bash
git switch main
git merge feature/login
```

### 变基到目标分支

```bash
git rebase <branch-name>
```

例如在功能分支上同步 `main` 的最新提交：

```bash
git switch feature/login
git rebase main
```

`rebase` 会改写当前分支的提交基底。已经推送并被别人使用的公共分支，不建议随意 rebase。

## 撤销和恢复

### 丢弃工作区改动

```bash
git restore <file>
git restore .
```

`git restore <file>` 丢弃某个文件的未暂存改动。`git restore .` 丢弃当前目录下所有未暂存改动。

### 取消暂存

```bash
git restore --staged <file>
git restore --staged .
```

取消暂存后，改动还在工作区，只是不再处于 staged 状态。

### 回退到某个提交

```bash
git reset --soft <commit>
git reset --mixed <commit>
git reset --hard <commit>
```

`--soft` 保留暂存区和工作区改动。`--mixed` 保留工作区改动，但取消暂存。`--hard` 会让暂存区和工作区都回到指定提交，未保存的改动会丢失。

### 生成反向提交

```bash
git revert <commit>
```

`revert` 不会删除历史，而是新增一个“反向提交”。公共分支上撤销某次提交时，通常优先使用 `git revert`。

## 临时保存改动

### 保存当前改动

```bash
git stash
git stash push -m "说明"
```

临时保存当前工作区改动，常用于需要切分支但手头改动还不想提交的场景。

### 查看和恢复 stash

```bash
git stash list
git stash pop
git stash apply
```

`git stash pop` 恢复最近一次 stash，并从 stash 列表中删除。`git stash apply` 恢复最近一次 stash，但保留 stash 记录。

## 常用组合

### 新建分支开发并推送

```bash
git switch -c feature/login
git add .
git commit -m "feat: add login page"
git push -u origin feature/login
```

### 当前分支提交后直接推送

```bash
git status
git add .
git commit -m "docs: update git notes"
git push
```

这里能直接 `git push` 的前提是当前分支已经设置了上游分支。

### 同步 main 后继续开发

```bash
git fetch origin
git switch main
git pull
git switch feature/login
git rebase main
```

也可以在团队约定使用 merge 时，把最后一条改成：

```bash
git merge main
```
