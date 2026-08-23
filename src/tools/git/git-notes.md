---
title: Git 学习笔记
shortTitle: Git 学习笔记
order: 4
category:
  - Git
tag:
  - Git 基础
  - 版本控制
  - 远端仓库
  - 分支
---

# Git 学习笔记

## 1. Git 概述

- Git是一个免费的、开源的分布式版本控制系统，可以快速高效地处理从小型到大型的各种项目

- Git易于学习，占地面积小，性能极快。 它具有廉价的本地库，方便的暂存区域和多个工作流分支等特性。其性能优于Subversion(svn)、CVS、Perforce和ClearCase等版本控制工具

## 1.1 版本控制

- 版本控制是一种记录文件内容变化，以便将来查阅特定版本修订情况的系统。

- 版本控制其实最重要的是可以记录文件修改历史记录，从而让用户能够查看历史版本，方便版本切换。

  ![‘img’](./assets/wps1.jpg)

> **为什么需要版本控制：** 个人开发过渡到团队协作。
>
> ![img](./assets/wps2.jpg)



## 1.2 版本控制工具

* **集中式版本控制工具**

  - CVS、SVN(Subversion)、VSS

  - 集中化的版本控制系统诸如 CVS、SVN等，都有一个单一的集中管理的服务器，保存所有文件的修订版本，而协同工作的人们都通过客户端连到这台服务器，取出最新的文件或者提交更新。

  - 优点：每个人都可以在一定程度上看到项目中的其他人正在做些什么。而管理员也可以轻松掌控每个开发者的权限，并且管理一个集中化的版本控制系统，要远比在各个客户端上维护本地数据库来得轻松容易。

  - 缺点：中央服务器的单点故障。如果服务器宕机一小时，那么在这一小时内，谁都无法提交更新，也就无法协同工作。

  - 示意图：

    ![img](./assets/wps3.jpg)

* **分布式版本控制工具**

  - Git、Mercurial、Bazaar、Darcs
  - 像 Git这种分布式版本控制工具，客户端提取的不是最新版本的文件快照，而是把代码仓库完整地镜像下来（本地库）。这样任何一处协同工作用的文件发生故障，事后都可以用其他客户端的本地仓库进行恢复。因为每个客户端的每一次文件提取操作，实际上都是一次对整个文件仓库的完整备份。
  - 分布式的版本控制系统出现之后,解决了集中式版本控制系统的缺陷：
    - 服务器断网的情况下也可以进行开发（因为版本控制是在本地进行的）
    - 每个客户端保存的也都是整个完整的项目（包含历史记录，更加安全）

  -  **示意图：**

    ![img](./assets/wps4.png)



## 1.3 Git简史

![img](./assets/wps5.jpg)



> Git是一个开源的分布式版本控制系统，可以有效、高速地处理从很小到非常大的项目版本管理。Git是Linus Torvalds 为了帮助管理 Linux 内核开发而开发的一个开放源码的版本控制软件。同生活中的许多伟大事物一样，Git 诞生于一个极富纷争大举创新的年代。Linux 内核开源项目有着为数众多的参与者。 绝大多数的 Linux 内核维护工作都花在了提交补丁和保存归档的繁琐事务上（1991－2002年间）。 到 2002 年，整个项目组开始启用一个专有的分布式版本控制系统 BitKeeper 来管理和维护代码。到了 2005 年，开发 BitKeeper 的商业公司同 Linux 内核开源社区的合作关系结束，他们收回了Linux 内核社区免费使用BitKeeper 的权力。 这就迫使 Linux 开源社区（特别是 Linux 的缔造者Linus Torvalds）基于使用 BitKeeper 时的经验教训，开发出自己的版本系统。 他们对新的系统制订了若干目标：速度、简单的设计、对非线性开发模式的强力支持（允许成千上万个并行开发的分支）、完全分布式和有能力高效管理类似 Linux 内核一样的超大规模项目（速度和数据量）

## 1.4 Git工作流程

- **示意图：**

  ![image-20240406155233837](./assets/image-20240406155233837.png)

- **四个区域：**

  - 工作区(Workspace)：就是你在电脑里能实际看到的目录

  - 暂存区(Stage/Index)：暂存区也叫索引区，用来临时存放未提交的内容，一般在`.git`目录下的index中

  - 本地仓库(Repository)：Git在本地的版本库，仓库信息存储在`.git`这个隐藏目录中

  - 远程仓库(Remote Repository)：托管在远程服务器上的仓库，也称作代码托管中心。

    - 常见的代码托管中心

      - 局域网
        - GitLab

      - 互联网
        - GitHub(外网)
        - Gitee码云(国内网站)

- **过程描述如下：**

  1.  clone（克隆）: 从远程仓库中克隆代码到本地仓库
  2. checkout （检出）:从本地仓库中检出一个仓库分支然后进行修订
  3. add（添加）: 在提交前先将代码提交到暂存区
  4. commit（提交）: 提交到本地仓库。本地仓库中保存修改的各个历史版本
  5. fetch (抓取) ： 从远程库，抓取到本地仓库，不进行任何的合并动作，一般操作比较少。
  6. pull (拉取) ： 从远程库拉到本地库，自动进行合并(merge)，然后放到到工作区，相当于fetch+merge
  7. push（推送） : 修改完成后，需要和团队成员共享代码时，将代码推送到远程仓库

- **文件状态：**
  - 已修改（Modified）：修改但未保存到暂存区的文件。
  - 已暂存（Staged）：修改后已经保存到暂存区的文件。
  - 已提交（Committed）：暂存区的文件被提交到本地仓库后的状态。

## 2. Git 安装

## 2.1 安装教程

- 官网下载地址： https://git-scm.com/或https://github.com/git-for-windows/git/releases
- 安装步骤：


> 备注：
>
> Git GUI：Git提供的图形界面工具
>
> Git Bash：Git提供的命令行工具

## 2.3 Git初始设置

- 当安装Git后首先要做的事情是设置用户签名和邮箱地址，否则无法提交代码，因为每次Git提交都会使用该用户信息。
- 签名的作用是区分不同操作者身份。用户的签名信息在每一个版本的提交信息中能够看到，以此确认本次提交是谁做的。
- 注意：这里设置用户签名和将来登录GitHub（或其他代码托管中心）的账号没有任何关系。

### 2.3.1 基本语法

| 命令名称                               | 作用             |
| -------------------------------------- | ---------------- |
| `git config --global user.name 用户名` | 设置全局用户签名 |
| `git config --global user.email 邮箱`  | 设置全局用户邮箱 |
| `git config --global credential store` | 存储全局配置     |

### 2.3.2 案例实操

```shell
git config --global user.name zzx
git config --global user.email zzxkingdom@163.com
git config --global credential store
git config --list # 查看全局配置
git config --global user.name # 查看用户名
git config --global user.email # 查看用户邮箱
cat ~/.gitconfig  # cat linux中查看文本的命令
```

## 3. Git 常用命令

- Git最初是为`Linux`的版本控制而开发的，并且是由同一个人开发的，因此在学习Git命令之前，有必要先了解一下基础的Linux命令。

## 3.0 前缀知识-Linux基础命令

> 这里只是一个简单的列举，并没有详细讲Linux命令的使用，更具体的使用还需要大家可以去学一下

| 命令                     | 作用                     |
| ------------------------ | ------------------------ |
| `cd`                     | 改变目录                 |
| `pwd`                    | 显示当前所在目录的路径   |
| `ls(ll)`                 | 列出当前目录中的所有文件 |
| `touch`                  | 新建文件                 |
| `rm [-r] file/directory` | 删除文件或文件夹         |
| `mkdir`                  | 新建文件夹               |
| `mv sourc dest`          | 移动文件                 |
| `reset`                  | 重新初始化终端/清屏      |
| `clear`                  | 清屏                     |
| `history`                | 查看历史命令             |
| `help`                   | 帮助                     |
| `exit`                   | 退出                     |
| `#`                      | 表示注释                 |

## 3.1 Git相关配置

- 这部分配置不强制要求配置，如果遇到相关问题可以再进行配置

### 3.1.1 为常用指令配置别名

- 有些常用的指令参数非常多，每次都要输入好多参数，我们可以使用别名。

**配置步骤：**

1. 打开用户目录，创建`.bashrc`文件。部分windows系统不允许用户创建点号开头的文件，可以打开Git Bash，执行`touch ~/.bashrc`

   ![image-20240406195813729](./assets/image-20240406195813729.png)

2. 在`.bashrc`文件中输入如下内容：

   ```shell
   #用于输出git提交日志
   alias git-log='git log --pretty=oneline --all --graph --abbrev-commit'
   #用于输出当前目录所有文件及基本信息
   alias ll='ls -al'
   ```

3. 打开GitBash，执行`source ~/.bashrc`

![image-20240406200016961](./assets/image-20240406200016961.png)

### 3.1.2 解决Git Bash乱码问题

1. 打开`GitBash`执行下面命令

   ```shell
   git config --global core.quotepath false
   ```

2.  `${git_home}/etc/bash.bashrc`文件最后加入下面两行

   ```shell
   export LANG="zh_CN.UTF-8"
   export LC_ALL="zh_CN.UTF-8"
   ```

> 说明：该配置是在Linux系统下

## 3.2 初始化本地库

### 3.2.1 初始化命令

- 命令形式：`git init`

### 3.2.2 案例实操

- 操作步骤：

  1. 在电脑的任意位置创建一个空目录，作为Git仓库

  2. 进入这个目录，右键打开Git Bash窗口

  3. 执行命令`git init`

  4. 如果创建成功后可在文件夹下看到隐藏的`.git`目录

  5. **熟悉Linux命令的也可以直接在任意位置右键打开Git Bash，然后使用命令行进行上述操作，如下图：**

     ![image-20240406202044997](./assets/image-20240406202044997.png)

- 结果查看（文件夹下面会增加一个`.git`的隐藏文件夹，需要打开查看隐藏文件夹设置）

  ![image-20240406201347605](./assets/image-20240406201347605.png)

## 3.3 基础操作指令

- Git工作目录下对于文件的**修改**(增加、删除、更新)会存在几个状态，这些**修改**的状态会随着我们执行Git的命令而发生变化。

- **图解：**


![image-20240406202739100](./assets/image-20240406202739100.png)

### 3.3.1 查看修改的状态

- 命令形式：`git status`
- 作用：查看修改的状态(暂存区、工作区)

### 3.3.2 添加工作区到暂存区

- 命令形式：`git add <file>(支持通配符)`
  - 将所有修改加入暂存区：`git add .`

- 作用：添加工作区一个或多个文件的修改到暂存区

### 3.3.3 提交暂存区到本地仓库

- 命令形式：`git commit -m "日志信息" 文件名` | `git commit -am "日志信息" 文件名`
  - 提交所有已修改的文件到本地仓库：`git commit -m "日志信息"`
- 作用：提交暂存区内容到本地仓库的当前分支

### 3.3.4 从索引/暂存区中删除文件

- 命令形式：`git rm --cached <file>`

### 3.3.5 查看提交日志信息

- 命令形式1：`git log [option]`

  - `options`选项：
    - `--all` 显示所有分支
    - `--pretty=oneline` 将提交信息显示为一行
    - `--abbrev-commit` 使得输出的commitId更简短
    - `--graph` 以图的形式显示

  - 以简洁模式查看提交历史：`git log --oneline`

- 作用：查看版本详细信息

- ==由于改命令比较长，且参数比较多，因此可以配置别名，可以跳转到3.1节查看如何配置别名。==

- ==在`3.1.1`中配置的别名`git-log`就包含了这些参数，所以后续可以直接使用指令`git-log`==

- 命令形式2：`git reflog`

  - 该命令可以查看已经删除的提交记录

  - 查看后n条提交日志信息：`git reflog -n 数量`

### 3.3.6 版本回退

- 命令形式：`git reset --hard 版本号(commitID)`
  - 版本号(commitID)可以使用`git log`和`git reflog`指令查看
  - 重置当前分支的HEAD为指定提交并删除所有之后的提交：`git reset --mixed <commit-id>`

- 作用：版本切换

### 3.3.7 撤销指定提交

- 命令形式：`git revert <commit-id>`

### 3.3.8 添加文件至忽略列表

- 一般我们总会有些文件无需纳入Git 的管理，也不希望它们总出现在未跟踪文件列表。 通常都是些自动生成的文件，比如日志文件，或者编译过程中创建的临时文件等。 在这种情况下，我们可以在工作目录中创建一个名为`.gitignore`的文件（文件名称固定），列出要忽略的文件模式，**支持通配符**

- 实例：

  ```shell
  # no .a files
  *.a
  # but do track lib.a, even though you're ignoring .a files above
  !lib.a
  # only ignore the TODO file in the current directory, not subdir/TODO
  /TODO
  # ignore all files in the build/ directory
  build/
  # ignore doc/notes.txt, but not doc/server/arch.txt
  doc/*.txt
  # ignore all .pdf files in the doc/ directory
  doc/**/*.pdf
  ```

### 3.3.9 练习：基础操作

```shell
#####################仓库初始化######################
# 创建目录（git_test01）并在目录下打开gitbash
略
# 初始化git仓库
git init
#####################创建文件并提交#####################
# 目录下创建文件 file01.txt
略
# 将修改加入暂存区
git add .
# 将修改提交到本地仓库，提交记录内容为：commit 001
git commit -m 'commit 001'
# 查看日志
git log
####################修改文件并提交######################
# 修改file01的内容为：count=1
略
# 将修改加入暂存区
git add .
# # 将修改提交到本地仓库，提交记录内容为：update file01
git commit --m 'update file01'
# 查看日志
git log
# 以精简的方式显示提交记录
git-log
####################将最后一次修改还原##################
# 查看提交记录
git-log
# 找到倒数第2次提交的commitID
略
# 版本回退
git reset commitID --hard
```

## 3.4 基础操作指令案例实操

### 3.4.1 首次查看（工作区没有文件）

![image-20230627132109306](./assets/image-20230627132109306.png)

### 3.4.2 新增文件

![image-20230627132215734](./assets/image-20230627132215734.png)

![image-20230627132317963](./assets/image-20230627132317963.png)

###  3.4.3 再次查看（检测到未追踪文件）

![image-20230627132547573](./assets/image-20230627132547573.png)

### 3.4.4 将工作区的文件添加到暂存区 | 查看状态（检测到暂存区有新文件）

![image-20230627132954523](./assets/image-20230627132954523.png)

![image-20230627133040699](./assets/image-20230627133040699.png)

### 3.4.5 暂存区文件提交到本地库 | 查看状态（没有文件需要提交）

![image-20230627133335748](./assets/image-20230627133335748.png)

![image-20230627133425162](./assets/image-20230627133425162.png)

### 3.4.6 修改文件（hello.txt）| 查看状态（检测到工作区有文件被修改）

![image-20230627133644105](./assets/image-20230627133644105.png)

### 3.4.7 将修改的文件再次添加暂存区  | 查看状态（工作区的修改添加到了暂存区）

![image-20230627133907417](./assets/image-20230627133907417.png)

![image-20230627133937432](./assets/image-20230627133937432.png)

### 3.4.8 将暂存区文件提交到本地库

![image-20230627134046013](./assets/image-20230627134046013.png)

### 3.4.9 查看历史版本

![image-20230627134228811](./assets/image-20230627134228811.png)



### 3.4.10 版本穿梭

1. 首先查看当前的历史记录，可以看到当前是在48f4e22这个版本

![image-20230627134422376](./assets/image-20230627134422376.png)

2. 切换到之前版本，8ca80d7版本，也就是我们第一次提交的版本

![image-20230627134533136](./assets/image-20230627134533136.png)

3. 切换完毕之后再查看历史记录，当前成功切换到了8ca80d7版本

![image-20230627134618381](./assets/image-20230627134618381.png)

4. 然后查看文件hello.txt，发现文件内容已经变化

![image-20230627134649667](./assets/image-20230627134649667.png)

>  Git切换版本，底层其实是移动的HEAD指针。

## 3.5 分支

- 几乎所有的版本控制系统都以某种形式支持分支。 使用分支意味着你可以把你的工作从开发主线上分离开来进行重大的Bug修改、开发新的功能，以免影响开发主线。
- 下面首先介绍一下Git中一些主要的分支功能以及命名

### 3.5.1 各分支功能介绍

![img](./assets/wps13111.jpg)

- 主干分支 master：主要负责管理正在运行的生产环境代码，永远保持与正在运行的生产环境完全一致。为了保持稳定性一般不会直接在这个分支上修改代码，都是通过其他分支合并过来的。
- 开发分支 develop：主要负责管理正在开发过程中的代码。一般情况下应该是最新的代码。
- 功能分支 feature：为了不影响较短周期的开发工作，一般把中长期开发模块，会从开发分支中独立出来。 开发完成后会合并到开发分支。

- 准生产分支（预发布分支） release：较大的版本上线前，会从开发分支中分出准生产分支，进行最后阶段的集成测试。该版本上线后，会合并到主干分支。生产环境运行一段阶段较稳定后可以视情况删除。
- bug修理分支 hotfix：主要负责管理生产环境下出现的紧急修复的代码。 从主干分支分出，修复完毕并测试上线后，并回主干分支和开发分支。并回后，视情况可以删除该分支。
- 还有一些其他分支，在此不再详述，例如test分支（用于代码测试）、pre分支（预上线分支）等等。

### 3.5.2 分支操作

- `git branch` ：==查看所有本地分支（当前分支前会有一个星号*)==

-  `git branch -r`：查看远程分支

- `git branch <branch-name>`：创建本地分支
- `git checkout <branch-name>`：切换分支
- `git checkout -b <branch-name>`：创建并切换分支

- `git checkout <file> <commit-id>`：恢复文件到指定版本

- 删除分支：不能删除当前分支，只能删除其它分支
  - `git branch -d branch`：删除分支时，需要做各种检查
  - `git branch -D branch`：不做任何检查，强制删除

### 3.5.4 合并分支

#### 3.5.4.1 概述

- 你在使用 Git 合并分支时只会使用 `git merge` 吗？有时使用 `git rebase` 可以比 `git merge` 做出更优雅的操作

<img src="./assets/image-20241019211145242.png" alt="image-20241019211145242" style="zoom:50%;" />

- `git rebase`和 `git merge` 理解的是它解决了同样的问题，这两个命令都旨在将更改从一个分支合并到另一个分支，但二者的合并方式却有很大的不同。当你在专用分支上开发新 feature 时，然后另一个团队成员在 `master` 分支提交了新的 commits，这会发生什么？这会导致分叉的历史记录，对于这个问题，使用 Git 作为协作工具的任何人来说都应该很熟悉。现在，假设在 `master` 分支上的新提交与你正在开发的 feature 相关。需要将新提交合并到你的 `feature` 分支中，你可以有两个选择：merge 或者 rebase

<img src="./assets/image-20241019211303835.png" alt="image-20241019211303835" style="zoom:33%;" />

- `git merge`基本功能：用于将一个分支的历史记录合并到当前分支中。它会创建一个新的“合并提交”（merge commit），保留所有原始的历史记录，并生成一个包含所有父分支的合并结果。

  - 常用参数：

    - `git merge <branch>`：将指定的 `<branch>` 合并到当前分支。

    - `--no-ff`：禁用快速合并（fast-forward）。即使可以通过快进合并，Git 也会创建一个合并提交。适合想要保留所有合并历史的情况。

      ```shell
      git merge --no-ff <branch>
      ```

    - `--ff`：允许快速合并（默认行为）。如果分支的提交可以直接快进，Git 会简单地移动指针，而不创建合并提交。

      ```shell
      git merge --ff <branch>
      ```

    - `--squash`：将被合并分支的所有更改压缩成一个提交，但不会自动提交。通常用于整理提交历史。

      ```shell
      git merge --squash <branch>
      git commit
      ```

    - `--abort`：如果合并过程中发生冲突且无法继续，可以使用 `--abort` 取消合并，并将工作目录恢复到合并开始之前的状态。

      ```shell
      git merge --abort
      ```

    - `--strategy=<strategy>`：选择合并策略。Git 提供了不同的策略（`resolve`、`recursive` 等）。最常见的是 `recursive`，适合合并两个历史相同的分支。

      ```shell
      git merge --strategy=recursive <branch>
      ```

  - 使用场景：保留分支的提交历史时使用，特别是在团队协作时，所有分支的提交会完整保留，适合需要记录合并过程的项目。

- `git rebase`基本功能：`git rebase`通过将一个分支的所有提交“重新应用”到另一个分支上，使历史记录更加线性化。与 `git merge` 不同的是，`git rebase` 会“重写历史”，不产生额外的合并提交。

  - 常用参数：

    - `git rebase <branch>`：将当前分支上的提交“重新应用”到 `<branch>` 上。

    - `--onto <newbase> <upstream> <branch>`：将 `<branch>` 从 `<upstream>` 基础上移到新的基础 `<newbase>` 上。这对于需要将一个子分支移到另一分支之上时非常有用。

      ```shell
      git rebase --onto newbase upstream branch
      ```

    - `--interactive` 或 `-i`：允许你在 rebase 过程中编辑、删除或合并提交。适合整理提交历史、修改旧的提交记录等。

      ```shell
      git rebase -i <base-branch>
      ```

    - `--continue`：如果 `git rebase` 过程中遇到冲突并解决冲突后，继续执行 rebase 操作。

      ```shell
      git rebase --continue
      ```

    - `--abort`：取消 rebase，并恢复到 rebase 之前的状态。

      ```shell
      git rebase --abort
      ```

    - `--skip`：跳过有问题的提交。如果你在解决冲突后想要跳过某个提交，可以使用 `--skip`

      ```shell
      git rebase --skip
      ```

  - 使用场景：想要保持历史记录整洁、线性化时使用，特别是在个人开发分支中。在合作开发时，使用 rebase 需要小心，避免破坏其他人的提交历史。

- 总结对比：

  - **`git merge`**：保留完整的提交历史，适合团队合作，需要追踪所有合并操作时使用。

  - **`git rebase`**：重写提交历史，适合个人开发和想要创建整洁的线性历史记录时使用。

#### 3.5.4.2 git merge命令理解

- 最简单的方式是通过以下命令将 `master` 分支合并到 `feature` 分支中：

  ```shell
  git checkout feature
  git merge master
  ```

- 这会在 `feature` 分支中创建一个新的 **merge commit**，它将两个分支的历史联系在一起，请看如下所示的分支结构：

<img src="./assets/image-20241019211443402.png" alt="image-20241019211443402" style="zoom: 50%;" />

- 优缺点：
  - 使用 merge 是很好的方式，因为它是一种 **非破坏性的** 操作。现有分支不会以任何方式被更改。这避免了 rebase 操作所产生的潜在缺陷（下面讨论）。
  - 另一方面，这也意味着 `feature` 分支每次需要合并上游更改时，它都将产生一个额外的合并提交。如果`master` 提交非常活跃，这可能会严重污染你的 feature 分支历史记录。尽管可以使用高级选项 `git log` 缓解此问题，**但它可能使其他开发人员难以理解项目的历史记录**

> 上面两条命令可以合并为一条：
>
> ```shell
> git merge feature master
> ```

#### 3.5.4.3 git rebase命令理解

- 作为 merge 的替代方法，你可以使用以下命令将 `master` 分支合并到 `feature`分支上：

  ```shell
  git checkout feature
  git rebase master
  ```

- 这会将整个 `feature` 分支移动到 `master` 分支的顶端，从而有效地整合了所有 `master` 分支上的提交。但是，与 merge 提交方式不同，rebase 通过为原始分支中的每个提交创建全新的 commits 来 **重写** 项目历史记录

<img src="./assets/image-20241019211706615.png" alt="image-20241019211706615" style="zoom: 50%;" />

- 优缺点：
  - rebase 的主要好处是可以获得更清晰的项目历史。首先，它消除了 `git merge` 所需的不必要的合并提交；其次，正如你在上图中所看到的，rebase 会产生完美线性的项目历史记录，你可以在 `feature`分支上没有任何分叉的情况下一直追寻到项目的初始提交。这样可以通过命令 `git log`，`git bisect` 和 `gitk` 更容易导航查看项目。
  - 但是，针对这样的提交历史我们需要权衡其「安全性」和「可追溯性」。如果你不遵循Rebase 的黄金法则(在下面会介绍)，重写项目历史记录可能会对你的协作工作流程造成灾难性后果。而且，rebase 会丢失合并提交的上下文， 你也就无法看到上游更改是何时合并到 feature 中的。

#### 3.5.4.4 rebase 和 merge 的区别

- 假设我们有如下分支：

```shell
  D---E feature
 /
A---B---C master
```

- 现在我们将分别使用 `merge` 和 `rebase`，把 `master` 分支的 B、C 提交集成到 `feature` 分支，并在 `feature` 分支新增一个提交 F，然后再将 `feature` 分支合入 `master` ，最后对比两种方法所形成的提交历史的区别。

- 使用 `merge`
  1. 切换到 `feature` 分支： `git checkout feature`。
  2. 合并 `master` 分支的更新： `git merge master`。
  3. 新增一个提交 F： `git add . && git commit -m "commit F"` 。
  4. 切回 `master` 分支并执行快进合并： `git chekcout master && git merge feature`。

- 执行过程如下图所示：

![Dec-30-2020-merge-example](https://waynerv.com/posts/git-rebase-intro/Dec-30-2020-merge-example.gif)

- 我们将得到如下提交历史：

```shell
* 6fa5484 (HEAD -> master, feature) commit F
*   875906b Merge branch 'master' into feature
|\
| | 5b05585 commit E
| | f5b0fc0 commit D
* * d017dff commit C
* * 9df916f commit B
|/
* cb932a6 commit A
```

---

- 使用 `rebase`，步骤与使用 `merge` 基本相同，唯一的区别是第 2 步的命令替换成： `git rebase master`。

- 执行过程如下图所示：

![Dec-30-2020-rebase-example](https://waynerv.com/posts/git-rebase-intro/Dec-30-2020-rebase-example.gif)

- 我们将得到如下提交历史：

```shell
* 74199ce (HEAD -> master, feature) commit F
* e7c7111 commit E
* d9623b0 commit D
* 73deeed commit C
* c50221f commit B
* ef13725 commit A
```

- 可以看到，使用 `rebase` 方法形成的提交历史是完全线性的，同时相比 `merge` 方法少了一次 `merge` 提交，看上去更加整洁。





#### 3.5.4.4 交互式 Rebase

交互式 rebase 使你有机会在将 commits 移动到新分支时更改这些 commits。这比自动 rebase 更强大，因为它提供了对分支提交历史的完全控制。通常，这用于在合并 feature 分支到 `master` 之前清理其杂乱的历史记录。

要使用交互式 rebase，需要使用 `git rebase` 和 `-i` 选项：

```css
git checkout feature
git rebase -i master
```

这将打开一个文本编辑器，列出即将移动的所有提交：

```cmake
pick 33d5b7a Message for commit #1
pick 9480b3d Message for commit #2
pick 5c67e61 Message for commit #3
```

此列表准确定义了执行 rebase 后分支的外观。通过更改 `pick` 命令或重新排序条目，你可以使分支的历史记录看起来像你想要的任何内容。例如，如果第二次提交 fix 了第一次提交中的一个小问题，您可以使用以下 `fixup` 命令将它们浓缩为一个提交：

```cmake
pick 33d5b7a Message for commit #1
fixup 9480b3d Message for commit #2
pick 5c67e61 Message for commit #3
```

保存并关闭文件时，Git将根据您的指示执行 rebase，从而产生如下所示的项目历史记录：

![使用交互式rebase来压缩提交](https://wac-cdn.atlassian.com/dam/jcr:fe6942b4-7a60-4464-9181-b67e59e50788/04.svg?cdnVersion=457)

消除这种无意义的提交使你的功能历史更容易理解。这是 `git merge` 根本无法做到的事情。至于 commits 条目前的 `pick`、`fixup`、`squash` 等命令，在 git 目录执行 `git rebase -i` 即可查看到，大家按需重排或合并提交即可，注释说明非常清晰，在此不做过多说明:

#### 3.5.4.5 Rebase 的黄金法则

一旦你理解了什么是 rebase，最重要的是要学习什么时候**不能**使用它。`git rebase` 的黄金法则是永远不要在**公共**分支上使用它。

例如，想想如果你 rebase `master` 分支到 `feature` 分支之上会发生什么：

![重新分配主分支](https://wac-cdn.atlassian.com/dam/jcr:1d22f018-b2c7-4096-9db1-c54940cf4f4e/05.svg?cdnVersion=457)

rebase 将所有 `master` 分支上的提交移动 `feature` 分支的顶端。问题是这只发生在 **你自己** 的存储库中。所有其他开发人员仍在使用原始版本的 `master`。由于 rebase 导致全新 commit，Git 会认为你的 `master` 分支历史与其他人的历史不同。

此时，同步两个 `master` 分支的唯一方法是将它们合并在一起，但是这样会产生额外的合并提交和两组包含相同更改的提交（原始提交和通过 rebase 更改的分支提交）。不用说，这是一个令人非常困惑的情况。

因此，在你运行 `git rebase` 命令之前，总是问自己，**还有其他人在用这个分支吗？** 如果答案是肯定的，那就把你的手从键盘上移开，开始考虑采用非破坏性的方式进行改变（例如，`git revert` 命令）。否则，你可以随心所欲地重写历史记录。

#### 3.5.4.6 Force Push

如果你尝试将 rebase 了的 `master` 分支推送回 remote repository，Git 将阻止你这样做，因为它会与远程`master` 分支冲突。但是，你可以通过传递 `--force` 标志来强制推送，如下所示：

```perl
# Be very careful with this command!
git push --force
```

这样你自己 repository 的内容将覆盖远程 `master`分支的内容，但这会使团队的其他成员感到困惑。因此，只有在确切知道自己在做什么时才要非常小心地使用此命令。

如果没有人在 feature branch 上作出更改，你可以使用 force push 将本地内容推送到 remote repository 做清理工作

#### 3.5.4.7 工作流程演练

rebase 可以根据你所在团队的需要方便的整合到现有的 Git 工作流程中。在本节中，我们将了解 rebase 在功能开发的各个阶段可以提供的好处。

在任何工作流程中，利用 `git rebase` 是为每个功能创建专用分支。这为你提供了必要的分支，以安全地利用 rebase：

![在专用分支中开发功能](https://wac-cdn.atlassian.com/dam/jcr:6af9de07-088b-4f8b-97a7-b66569a9e4ac/06.svg?cdnVersion=457)

#### 本地清理

将 rebase 纳入工作流程的最佳方法之一是清理本地正在进行的功能。通过定期执行交互式 rebase，你可以确保功能中的每个提交都具有针对性和意义。这可以使你在编写代码时无需担心将其分解为隔离的提交(多个提交)，你可以在事后修复整合它。

使用 `git rebase` 时，有两种情况：feature 父分支（例如 `master` ）的提交，或在 feature 中的早期提交。我们在 **交互式 Rebase** 部分已经介绍了第一种情况的示例。我们来看后一种情况，当你只需要修复最后几次提交时，以下命令仅做最后 3 次提交的交互式 rebase。

```css
git checkout feature
git rebase -i HEAD~3
```

通过指定 `HEAD~3` ，你实际上并没有移动分支，你只是交互式地重写其后的3个提交。请注意，这**不会**将上游更改合并到 `feature` 分支中。

![重新上头~3](https://wac-cdn.atlassian.com/dam/jcr:079532c4-2594-40ed-a5c4-0e3621b9edff/07.svg?cdnVersion=457)

如果要使用此方法重写整个功能，`git merge-base` 命令可用于查找 `feature` 分支的原始 base。以下内容返回原始 base 的提交ID，然后你可以将其传递给 `git rebase`：

```csharp
git merge-base feature master
```

交互式 rebase 的使用是引入`git rebase` 工作流的好方法，因为它只影响本地分支。其他开发人员唯一能看到的就是你提交的最终版，这应该是一个简洁易懂易跟踪的分支历史记录。

但同样，这仅适用于 **私有** feature分支。如果你通过相同的功能分支(**公共分支**)与其他开发人员协作，那么你是 **不被允许** 重写其历史记录的。

#### 将上游更改合并到功能分支中

在 **概念概述** 部分中，我们了解了 feature 分支可以使用 `git merge` 或 `git rebase` 合并 master 分支的上游更改 。merge 是一个安全的方式，可以保留存 git repository 的整个历史记录，而 rebase 则是通过将 feature 分支移动到 `master` 顶端来创建线性历史记录。

这种使用 `git rebase` 类似于本地清理，但在此过程中它包含了那些来自 `master` 上游提交。

请记住，将当前提交 rebase 到远程 branch(非 master 分支)一样是合法的。当与另一个开发人员协作使用相同的功能并且你需要将他们的更改合并到你的 repository 时，就会发生这种情况。

例如，如果你和另一个名为 John 的开发人员添加了对 `feature` 分支的提交，在你 fetch (注意 fetch 并不会自动 merge )来自 John 的远程 `feature`分支后，你的 repository 可能如下所示：

![在同一个功能分支上进行协作](https://wac-cdn.atlassian.com/dam/jcr:0bb661aa-361d-47ba-8c7b-00b3be0546cb/08.svg?cdnVersion=457)

你可以整合上来自上游的分叉：要么用 `john/feature` **merge** 本地 `feature` ，要么 **rebase** 本地`feature` 到`john/feature` 的顶部。

![合并与重新定位到远程分支](https://wac-cdn.atlassian.com/dam/jcr:1896adb1-5d49-419a-9b50-3a36adac186c/09.svg?cdnVersion=457)

请注意，此 rebase 不违反 **Rebase 黄金规则**，因为只有你的本地 `feature` 提交被移动， 之前的所有内容都不会受到影响。这就像是说 "将我的更改添加到 John 已经完成的工作中"。在大多数情况下，这比通过合并提交与远程分支同步更直观。

默认情况下，使用 `git pull` 命令执行合并，但你可以通过向其传递 `--rebase` 选项来强制它将远程分支 以 rebase 方式集成。

```css
git pull --rebase
```

#### 使用 Pull 请求 Review Feature

如果你在代码审查过程中使用 pull 请求，在使用了 pull 请求之后你应该避免使用 `git rebase` 。一旦你发出 pull 请求，其他开发人员就会查看你的提交，这意味着它是一个 **公共** 分支。重写其历史记录将使 Git 和你的队友无法跟踪添加到该功能的任何后续提交。

其他开发人员的任何更改都需要合并 `git merge` 而不是 `git rebase`。

因此，**在提交拉取请求之前**，通常使用交互式 rebase 清理代码通常是个好的办法。**注意使用顺序**

#### 集成已批准的功能

在你的团队批准某项 feature 后，你可以选择将该功能 rebase 到 `master` 分支的顶端，然后`git merge`再将该功能集成到主代码库中。

这与将上游更改合并到 feature 分支中的情况类似，但由于你不允许在 `master` 分支中重写提交，因此你必须最终使用 `git merge` 该功能进行集成。但是，通过在 merge 之前执行 rebase，你可以确保会以 fast-forward 方式 merge，从而产生完美的线性历史记录。

![使用和不使用rebase将功能集成到master中](https://wac-cdn.atlassian.com/dam/jcr:df39b1f1-2686-4ee5-90bf-9836783342ce/10.svg?cdnVersion=457)

如果您不熟悉 `git rebase`，可以随时在临时分支中执行 rebase。这样，如果你不小心弄乱了功能的历史记录，可以查看原始分支，然后重试。例如：

```mipsasm
git checkout feature
git checkout -b temporary-branch
git rebase -i master
# [Clean up the history]
git checkout master
git merge temporary-branch
```

#### 总结

如果你更喜欢没有不必要的干净的合并提交，线性历史记录，你就需要开始了解使用 rebase 功能。同时你应该会使用 `git rebase` 而不是 `git merge` 集成来自另一个分支的更改。

另一方面，如果你想保留项目的完整历史记录并避免重写公共提交的风险，你可以坚持下去`git merge`。这两种选择都是完全有效的，但至少现在你可以选择利用 `git rebase` 的好处 。

https://waynerv.com/posts/git-rebase-intro/

https://blog.csdn.net/weixin_42310154/article/details/119004977

### 3.5.5 解决冲突

- 当两个分支上对文件的修改可能会存在冲突，例如同时修改了同一个文件的同一行，这时就需要手动解决冲突，解决冲突步骤如下：

  1. 处理文件中冲突的地方
  2. 将解决完冲突的文件加入暂存区(add)
  3. 提交到仓库(commit)

  - 冲突部分的内容处理如下所示：

    ![image-20240406195409713](./assets/image-20240406195409713.png)

### 3.5.4 分支实操

```shell
###########################创建并切换到dev01分支，在dev01分支提交
# [master]创建分支dev01
git branch dev01
# [master]切换到dev01
git checkout dev01
# [dev01]创建文件file02.txt
略
# [dev01]将修改加入暂存区并提交到仓库,提交记录内容为：add file02 on dev
git add .
git commit -m 'add file02 on dev'
# [dev01]以精简的方式显示提交记录
git-log
###########################切换到master分支，将dev01合并到master分支
# [dev01]切换到master分支
git checkout master
# [master]合并dev01到master分支
git merge dev01
# [master]以精简的方式显示提交记录
git-log
# [master]查看文件变化(目录下也出现了file02.txt)
略
##########################删除dev01分支
# [master]删除dev01分支
git branch -d dev01
# [master]以精简的方式显示提交记录
git-log
```



## 4. Git 命令行操作远程仓库

## 4.1 基础操作指令

### 4.1.1 git clone 克隆

**作用1：** 克隆远程仓库到本地

```shell
git clone <仓库路径> [本地目录]
```

**注意实现：**

-  本地目录可以省略，会自动生成一个目录

### 4.1.2 git remote 远程

**说明：** 该命令用于管理Git仓库中的远程仓库，该命令提供了一些用于查看、添加、重命名和删除远程仓库的功能

**作用1：** 添加远程仓库

```shell
git remote add <远程名称> <仓库路径>
```

**参数说明：**

- 远端名称默认是`origin`，取决于远端服务器的设置
- 仓库路径需要从远端服务器获获取URL
- 例如：`git remote add origin git@gitee.com:czbk_zhang_meng/git_test.git`

**作用2：** 查看当前仓库中已配置的远程仓库

```shell
git remote
```

**补充说明：**

- ==列出当前仓库中已配置的远程仓库，并显示它们的 URL==：`git remote -v`

**补充命令：**

- `git remote set-url <remote_name> <new_url>`：修改指定远程仓库的 URL
- `git remote show <remote_name>`：显示指定远程仓库的详细信息，包括 URL 和相关联的本地分支
- `git remote get-url origin`：获取远程仓库的URL：
- `git remote rm <remote-name>` 或者 `git remote remove <remote_name>`：从当前仓库中删除指定的远程仓库
- `git remote rename <old_name> <new_name>`：将已配置的远程仓库重命名

### 4.1.3 git push 推送

- `git push [-f] [--set-upstream] [远端名称 [本地分支名] [:远端分支名] ]`：推送本地仓库到远程仓库

  - 如果远程分支名和本地分支名称相同，则可以只写本地分支
    - `git push origin master`

  - `-f`表示强制覆盖
  - `--set-upstream`推送到远端的同时并且建立起和远端分支的关联关系。
    - `git push --set-upstream origin master`

  - 如果**当前分支已经和远端分支关联**，则可以省略分支名和远端名。
    - `git push` 将`master`分支推送到已关联的远端分支。

### 4.1.4 git fetch 抓取

- `git fetch <remote-name> <branch-name>`：从指定远程分支获取最新版本到本地目录，不会自动合并
  - 如果不指定远端名称和分支名，则抓取所有分支
  - `git fetch <remote-name>`：获取所有远程分支

### 4.1.5 git pull 拉取

- `git pull [-f] <remote-name> <branch-name>`：将远程仓库的代码拉取到本地仓库并自动合并，`git pull`相当于`git fetch + git merge`
  - 常用参数：
    - `-r` 或者 `--rebase`：在拉取远程仓库代码时使用 `rebase` 而不是 `merge`。
    - `-f` 或者 `--force`：强制执行拉取操作，更新本地仓库代码。
    - `--all`：拉取所有分支的代码。
    - `-p` 或者 `--prune`：删除本地不存在的远程分支。

图解：https://www.cnblogs.com/imust2008/p/16904075.html

### 4.1.6 远程分支

- `git branch -a`：查看所有本地分支和远程分支（当前分支前会有一个星号*)

- `git branch -vv`：查看本地分支与远程分支的关联关系

  - 示例：

    ![image-20240413180610720](./assets/image-20240413180610720.png)

### 4.1.7 master、origin master 与 origin/master

- **master**：它代表本地的某个分支名
- **origin master**： 代表着两个概念，前面的 **origin** 代表远程名，后面的 **master** 代表远程分支名
- **origin/master** ：只代表一个概念，即远程分支名，是从远程拉取代码后在本地建立的一份拷贝（因此也有人把它叫作本地分支）

- 举例说明：

  -  `git fetch origin master` ：它的意思是从名为 **origin** 的远程上拉取名为 **master** 的分支到本地分支 **origin/master** 中。既然是拉取代码，当然需要同时指定远程名与分支名，所以分开写

  -  `git merge origin/master` ：它的意思是合并名为 **origin/master** 的分支到当前所在分支。既然是分支的合并，当然就与远程名没有直接的关系，所以没有出现远程名。需要指定的是被合并的分支

  - `git push origin master` ：它的意思是推送本地的 **master** 分支到远程 **origin**，涉及到远程以及分支，当然也得分开写了

  - `git fetch origin master stable oldstable`：一次性拉取多个分支的代码

  - `git merge origin/master hotfix-2275 hotfix-2276 hotfix-2290`：一次性合并多个分支的代码

- 执行 `git branch -a` 可以查看所有的分支名：

  ```shell
  root@localhost:/dat/taoblog# git branch -a
  * master
    remotes/origin/HEAD -> origin/master
    remotes/origin/api
    remotes/origin/draft
    remotes/origin/master
    remotes/origin/rsync
    remotes/origin/waterfall
  ```

- 可以进入 **.git** 目录看看它们的结构：

  ```shell
  root@localhost:/dat/taoblog# cd .git
  root@localhost:/dat/taoblog/.git# tree refs/
  refs/
  |-- heads
  |   `-- master
  |-- remotes
  |   `-- origin
  |       |-- api
  |       |-- draft
  |       |-- HEAD
  |       |-- master
  |       |-- rsync
  |       `-- waterfall
  `-- tags

  4 directories, 7 files
  ```

- 并且，它们都只是一串简单的哈希值：

  ```shell
  root@localhost:/dat/taoblog/.git# cat refs/remotes/origin/waterfall
  8d6e2a06bc5df0b87b3b05993a9e36749ccc857a
  ```

### 4.1.8 解决合并冲突

> 在一段时间，A、B用户修改了同一个文件，且修改了同一行位置的代码，此时会发生合并冲突。
>
> A用户在本地修改代码后优先推送到远程仓库，此时B用户在本地修订代码，提交到本地仓库后，也需要推送到远程仓库，此时B用户晚于A用户，**故需要先拉取远程仓库的提交，经过合并后才能推送到远端分支**,如下图所示。
>
> ![image-20240413180803645](./assets/image-20240413180803645.png)
>
> 在B用户拉取代码时，因为A、B用户同一段时间修改了同一个文件的相同位置代码，故会发生合并冲突。
>
> **远程分支也是分支，所以合并时冲突的解决方式也和解决本地分支冲突相同相同**，在此不再赘述，需要学员自己练习。





## 4.2 演示

练习：远程仓库操作

```bash
##########################1-将本地仓库推送到远程仓库
# 完成4.1、4.2、4.3、4.4的操作
略
# [git_test01]添加远程仓库
git remote add origin git@gitee.com/**/**.git
# [git_test01]将master分支推送到远程仓库,并与远程仓库的master分支绑定关联关系
git push --set-upstream origin master
###########################2-将远程仓库克隆到本地
# 将远程仓库克隆到本地git_test02目录下
git clone git@gitee.com/**/**.git git_test02
# [git_test02]以精简的方式显示提交记录
git-log
###########################3-将本地修改推送到远程仓库
# [git_test01]创建文件file03.txt
略
# [git_test01]将修改加入暂存区并提交到仓库,提交记录内容为：add file03
git add .
git commit -m 'add file03'
# [git_test01]将master分支的修改推送到远程仓库
git push origin master
###########################4-将远程仓库的修改更新到本地
# [git_test02]将远程仓库修改再拉取到本地
git pull
# 以精简的方式显示提交记录
git-log
# 查看文件变化(目录下也出现了file03.txt)
略
```

实操：

> - 查看远程分支
>
> ![在这里插入图片描述](./assets/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA6Z-p5puZ5Lqu,size_20,color_FFFFFF,t_70,g_se,x_16.png)
>
> **远程分支内容 :**
>
> ```bash
> D:\Git\git-learning-course>git branch -a
> * master
>   remotes/origin/6-
>   remotes/origin/HEAD -> origin/master
>   remotes/origin/feature1
>   remotes/origin/master
> ```
>
> **远程分支分析：**
>
> `* master` 是本地仓库的 master 分支 ;
>
> `remotes/origin` 开头的是远程分支 ;
>
> `remotes/origin/feature1` 和 `remotes/origin/6-` 就是远程分支 , 下面开始删除这两个远程分支 ;
>
> 此时 , 在 Git 远程端查看 , 有 master 主分支 , 和 `feature1` 和 `6-` 两个分支 ;
>
> <img src="./assets/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA6Z-p5puZ5Lqu,size_20,color_FFFFFF,t_70,g_se,x_16-1712406896557-1.png" alt="在这里插入图片描述" style="zoom:80%;" />
>
> **删除远程分支：** `git push origin --delete feature1`
>
> <img src="./assets/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA6Z-p5puZ5Lqu,size_20,color_FFFFFF,t_70,g_se,x_16-1712406896558-2.png" alt="在这里插入图片描述" style="zoom:80%;" />
>
> 删除之后 , 再次查看 Git 远程仓库 , 发现没有 feature1 分支了
>
> <img src="./assets/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA6Z-p5puZ5Lqu,size_20,color_FFFFFF,t_70,g_se,x_16-1712406896558-3.png" alt="在这里插入图片描述" style="zoom:80%;" />
>
> 同理再执行 `git push origin --delete 6-` 删除另外一个分支 ：
>
> <img src="./assets/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA6Z-p5puZ5Lqu,size_20,color_FFFFFF,t_70,g_se,x_16-1712406896558-4.png" alt="在这里插入图片描述" style="zoom:80%;" />
>
> 上述执行出错 , 但是远程分支删除成功 ：
>
> ![在这里插入图片描述](./assets/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA6Z-p5puZ5Lqu,size_20,color_FFFFFF,t_70,g_se,x_16-1712406896558-5.png)







## 5. Git 客户端操作远程仓库

github使用教程：

- https://blog.csdn.net/qq_44770178/article/details/130081757?spm=1001.2014.3001.5506
- https://blog.csdn.net/Sakuya__/article/details/86496715?spm=1001.2014.3001.5506

[在Ubuntu系统中如何使用git命令从github上clone数据](https://blog.csdn.net/qq_41989372/article/details/85128271?spm=1001.2014.3001.5506)

[Ubuntu下git与github的连接,以及仓库创建和克隆，远程推送](https://blog.csdn.net/qq_43697688/article/details/89893699?spm=1001.2014.3001.5506)

[VS2019上传代码到gitee](https://blog.csdn.net/qq_43027065/article/details/116091346?spm=1001.2014.3001.5506)

## 1. 安装部署

使用命令行操作git相对而言是非常不方便的，查看内容也不是很直观，所有官方推荐使用Git的GUI 客户端来完成页面化操作。

https://git-scm.com/downloads/guis

![1](./assets/1.png)





​    推荐下载使用GitHub Desktop。下载安装之后，选择不登录先进入页面。

![2](./assets/2.png)

## 2. 基础操作

### 2.1 设置个人信息



![1704960580138](./assets/3.png)

### 2.2 创建新的Git仓库

![1704960497554](./assets/4.png)

### 2.3 提交不同版本

![1704960800309](./assets/5C1704960800309.png)

新创建文件1.txt，并写入信息。之后可以在GitGui上面进行提交。

![1704961275801](./assets/5C1704961275801.png)

多次提交的版本可以直接在History页面查看区别，不需要再使用reset命令。

![1704962382919](./assets/5C1704962382919.png)

## 3. 连接GitHub远程仓库

登录自己注册的账号

![1705040350413](./assets/5C1705040350413.png)

点击Publish可以将当前项目创建到GitHub上面。

![1705458108708](./assets/5C1705458108708.png)

之后修改本地文件，就可以先推送到本地git之后再远程同步到GitHub仓库中。

（1）选择对应的分支

![1705458651469](./assets/5C1705458651469.png)

（2）点击推送

![1705458678557](./assets/5C1705458678557.png)

（3）也可以先在GitHub上面创建远程仓库，之后再拉取到本地保持统一。

![1705459375393](./assets/5C1705459375393.png)

![1705459556035](./assets/5C1705459556035.png)

（4）拉取远程仓库到本地

![1705459822148](./assets/5C1705459822148.png)

点击克隆即可，连接完成远程仓库和本地Git之后，在本地修改文件提交Git之后再push推送即可完成同步。

![1705459901802](./assets/5C1705459901802.png)

## 3. Gitee替代GitHub

GitHub的网站有时候会连接不上，无法登录。可以使用阿里提供的Git远程仓库网站Gitee来代替。

![1705460369930](./assets/5C1705460369930.png)

登录账号之后创建新的仓库

![1705461501846](./assets/5C1705461501846.png)

同步远程Gitee仓库的方式和同步GitHub仓库方法完全一致。

![1705461596842](./assets/5C1705461596842.png)

## 4. idea兼容使用Git（JAVA代码）

（1）首先在idea中创建一个空的项目

![1705461792030](./assets/5C1705461792030.png)

（2）编写基础的JAVA代码Hello world

![1705462825829](./assets/5C1705462825829.png)

（3）此时会产生IDEA中的特定文件

![1705462906032](./assets/5C1705462906032.png)

（4） 配置Git忽略文件

- **文件名称：xxxx.ignore**（前缀名随便起，建议是git.ignore）

- 这个文件的存放位置原则上在哪里都可以，为了便于让~/.gitconfig文件引用，建议也放在用户家目录下

- git.ignore文件模版内容如下

  ```text
  # Compiled class file
  *.class

  # Log file
  *.log

  # BlueJ files
  *.ctxt

  # Mobile Tools for Java (J2ME)
  .mtj.tmp/

  # Package Files #
  *.jar
  *.war
  *.nar
  *.ear
  *.zip
  *.tar.gz
  *.rar

  # virtual machine crash logs, see http://www.java.com/en/download/help/error_hotspot.xml
  hs_err_pid*

  .classpath
  .project
  .settings
  target
  .idea
  *.iml
  ```

（5）在.gitconfig文件中引用

  （此文件在Windows的家目录中）

  ```
[user]
	name = yhm
	email = yaohm7788@163.com
[core]
	excludesfile = C:/Users/merge/git.ignore
  ```

  注意：这里要使用正斜线（/），不要使用反斜线（\）

（6） 定位Git程序

![1705471200362](./assets/5C1705471200362.png)

（7）初始化本地库

![1705471441919](./assets/5C1705471441919.png)



（8）提交到本地库

右键点击项目选择Git -> Add将项目添加到暂存区。

![1705471545505](./assets/5C1705471545505.png)

![1705472084800](./assets/5C1705472084800.png)



（9）切换版本

查看历史版本

![img](./assets/wps66.jpg)

![img](./assets/wps67.jpg)

右键选择要切换的版本，然后在菜单里点击get。

![1705472349179](./assets/5C1705472349179.png)



## 6. 企业项目构建与开发分支

## 6.1 创建项目与分支管理

首先在Gitlab上面按照项目规格创建远程仓库。

![1706084894289](./assets/5C1706084894289.png)

### 3.1 idea与远程仓库连接

![1705473717653](./assets/5C1705473717653.png)

### 3.2 不同分支的提交与合并

（1）新建分支和切换分支

![1706087127924](./assets/5C1706087127924.png)

（2）不同分支提交代码与合并

首先在feature分支编写第一个模块的模拟代码，并提交

```java
package com.atguigu;


public class module1 {
    public static void main(String[] args) {
        System.out.println("完成第一个模块的开发");
    }
}
```

（3）合并feature到develop分支

![1706088019573](./assets/5C1706088019573.png)

![1706088077244](./assets/5C1706088077244.png)

审查测试通过之后，完成合并

![1706087991195](./assets/5C1706087991195.png)

## 6.2 冲突提交

实际单个模块的开发往往不是单独一个人来进行操作，当多个人协同开发相同的一个项目时，就会涉及到提交冲突的问题。

### 6.2.1 不同人修改不同文件

（1）在远程仓库添加gitLab.txt

![1706146898301](./assets/5C1706146898301.png)

（2）在本地IDEA中添加代码，继续进行第二个模块的开发

```java
public class Module2 {
    public static void main(String[] args) {
        System.out.println("开始进行模块2的开发");
    }
}
```

（3）提交代码到远程仓库，此时会有报错信息

![1705549702169](./assets/5C1705549702169.png)

Git会智能识别，采用merge合并命令，拉取远端文件到本地进行合并。

（4）查看Git提交的全部历史记录，可以看到中间有拉取Gitee日志的部分

![1706146278780](./assets/5C1706146278780.png)



### 6.2.2 不同人修改同文件的不同区域

（1）远程仓库修改module1代码

```java
public class Module1 {
    public static void main(String[] args) {
        System.out.println("没完成模块1的开发");
    }
}
```

（2）本地IDEA继续添加代码

```java

//添加注释
public class Module1 {
    public static void main(String[] args) {
        System.out.println("完成模块1的开发");
    }
}
```

（3）提交代码，之后push到远程仓库

![1705550474743](./assets/5C1705550474743.png)

同样可以采用merge命令，git会自动合并不同的区域代码。

![1706146956838](./assets/5C1706146956838.png)

![1706146975271](./assets/5C1706146975271.png)

### 6.2.3 不同人修改同文件的相同区域

（1）远程仓库添加模块开发顺利

![1705551269043](./assets/5C1705551269043.png)

（2）本地IDEA添加模块开发遇到了bug

```java
public class module1 {
    public static void main(String[] args) {
        System.out.println("完成第一个模块的开发");
        System.out.println("继续进行第一个模块的二次开发");
        System.out.println("模块开发继续!!!");
        System.out.println("模块开发遇到了bug!");
    }
}
```

![1705551516941](./assets/5C1705551516941.png)

无法直接采用merge命令，需要人为判断哪些作为最终的结果来保留

（3）之后需要重新提交到远程仓库

![1705551702149](./assets/5C1705551702149.png)



### 6.2.4 同时变更文件名和文件内容

（1）本地IDEA修改原先的文件名称为Module1plus，之后重新开发实现功能

```java
//添加注释
public class Module1plus {
    public static void main(String[] args) {
        System.out.println("没完成模块1的开发");
        System.out.println("模块1的开发遇到了bug");
        System.out.println("完成了模块1的开发");
        System.out.println("进一步完成了模块1的拓展开发");
    }
}
```

（3）提交代码修改到远程仓库

![1705552452300](./assets/5C1705552452300.png)

可以直接提交成功。

### 6.2.5 不同人把同一文件改成不同的文件名

（1）远程仓库把文件名称改为module1

（2）本地IDEA修改文件名称为module3

（3）提交到远程仓库

![1705552598042](./assets/5C1705552598042.png)

（4）需要手动宣传使用哪一个

![1705552665960](./assets/5C1705552665960.png)

push会导致报错，之后需要用户自己解决保留哪些文件。

（5）使用命令解决最终的冲突

```
C:\mybigdata\project\gitlab_demo>git status
#删除掉报红找不到的文件
C:\mybigdata\project\gitlab_demo>git rm src/main/java/com/atguigu/Module1Plus.java
```

（6）最后重新选择正确的代码提交到仓库

![1706151049392](./assets/5C1706151049392.png)





## 写在最后

- 如果你不能很好的应用 Git，那么这里为你提供一个非常棒的 Git 在线练习工具 [Git Online](https://learngitbranching.js.org/) ，你可以更直观的看到你所使用的命令会产生什么效果

## 参考文献

- https://blog.csdn.net/weixin_47824895/article/details/130169142
- https://blog.csdn.net/weixin_48152652/article/details/124258293
- https://blog.csdn.net/kevinxxw/article/details/123980372
- https://blog.csdn.net/michaelshare/article/details/79108233
- https://blog.twofei.com/695/
- [What is origin/master in git compared to origin master? - Stack Overflow](http://stackoverflow.com/questions/19321584/what-is-origin-master-in-git-compared-to-origin-master)
- [In Git, what is the difference between origin/master vs origin master? - Stack Overflow](http://stackoverflow.com/questions/18137175/in-git-what-is-the-difference-between-origin-master-vs-origin-master)
- [Git branching: master vs. origin/master vs. remotes/origin/master - Stack Overflow](http://stackoverflow.com/questions/10588291/git-branching-master-vs-origin-master-vs-remotes-origin-master)
- [菜鸟Git教程](https://www.runoob.com/git/git-tutorial.html)
- https://juejin.cn/s/git%20pull%20%E5%91%BD%E4%BB%A4%E5%8F%82%E6%95%B0
