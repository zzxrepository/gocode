---
title: Linux 命令详解
shortTitle: Linux 命令
order: 2
permalink: /tools/linux/Linux命令详解.html
category:
  - 开发工具
  - 开发环境
tag:
  - Linux
  - 命令行
  - 文本检索
---

# Linux 命令详解

## 1.前言

掌握命令行，不是记住所有参数，而是能把一个目标拆成几个清楚的步骤：找到文件、选择内容、限制输出、统计结果。理解每条命令接收什么、输出什么，就能组合出自己的命令。

示例以 Linux 常见的 Bash、GNU grep 和 GNU coreutils 为基础。macOS、BusyBox 等环境中的选项可能不同；遇到不支持的参数时，以本机 `man 命令名` 为准。涉及删除、覆盖或系统管理的示例，应先在练习目录中理解其效果。

### 1.1 看懂一条命令

```text
命令名 [选项] [参数或操作对象]
```

手册中的方括号表示“可选”，通常不用实际输入。不是所有参数都可省略，具体由命令决定。

```bash
grep -n 'ERROR' app.log
```

| 部分 | 含义 |
| --- | --- |
| `grep` | 执行文本查找 |
| `-n` | 显示行号的选项 |
| `'ERROR'` | 要查找的模式；引号由 Shell 处理，不属于搜索内容 |
| `app.log` | 要读取的文件；相对当前工作目录定位 |

命令、选项和文件名都要注意大小写。`grep -r` 与 `grep -R` 有区别，`head -n 20` 中的 `20` 是 `-n` 的值。

许多不带值的短选项可以合并：`ls -l -a -h` 可写作 `ls -lah`，`grep -R -n` 可写作 `grep -Rn`。初学时先拆开理解，再使用组合写法。`-n` 在不同命令中也不一定含义相同。

### 1.2 当前目录、路径与命令来源

```bash
pwd                       # 当前工作目录
ls                        # 查看当前目录
ls /var/log               # 使用绝对路径查看另一个目录
type ls                   # 判断是别名、函数、内建命令还是外部程序
type ll                   # 确认当前环境是否定义了 ll
```

`ll` 通常是人为定义的别名，例如 `alias ll='ls -l'`，不是所有系统都有的独立命令。编写可迁移的示例或脚本时，直接使用 `ls -l` 更明确。

### 1.3 引号、通配符与正则表达式

Shell 先解释命令行，再把参数交给程序。很多“命令不对”，实际发生在参数传递阶段。

```bash
ls *.log                         # Shell 先把 *.log 展开成匹配的文件名
grep -n 'ERROR' app.log           # 单引号保护搜索模式
grep -nF '[ERROR]' app.log        # -F 将方括号当作普通字符
keyword='timeout'
grep -nF "$keyword" app.log       # 双引号允许变量展开，并保留一个完整参数
grep -nF 'timeout' 'app debug.log' # 文件名有空格，必须加引号
```

| 写法 | 由谁解释 | 含义 |
| --- | --- | --- |
| `*.log`（未加引号的文件参数） | Shell | 匹配以 `.log` 结尾的文件名 |
| `grep -F 'a.b'` | grep | 查找字面文本 `a.b` |
| `grep -E 'a.b'` | grep | 正则表达式中的 `.` 匹配任意单个字符 |
| `grep -E 'ERROR\|WARN'` | grep | 正则表达式中的 `\|` 表示“或” |
| `命令1 \| 命令2` | Shell | 将一个命令的输出接入另一个命令 |

文件名通配符与内容正则表达式是两套规则。查固定编号、地址或带括号的原文时，优先考虑 `grep -F`；需要表达“或”“范围”“行首行尾”时，再使用 `grep -E`。

长命令可以用反斜杠续行；反斜杠必须紧贴换行，后面不能再有空格。终端显示的 `$`、续行提示符 `>` 不属于命令，不要复制进去。

```bash
grep -nF 'ERROR' \
  app.log
```

### 1.4 建立学习顺序

先掌握 `pwd`、`cd`、`ls` 定位文件，再用 `less`、`head`、`tail` 浏览内容，然后学习 `grep` 筛选和管道组合。重定向、`wc`、`sort`、`uniq` 用于保存与统计；最后通过综合练习把它们串起来。

## 2.帮助指令

帮助命令用于查询选项与使用边界。外部程序通常用 `man` 或 `--help`，Bash 内建命令可以用 `help`；不必强记所有参数。

### 2.1 man命令

- 作用：查看命令的详细使用手册

- 语法：

    ```shell
    man 命令名称
    ```

- 实例1：查看列出当前文件目录命令`ls`的详细使用参数

    ```shell
    man ls
    ```

    - 图例1：输入该命令并回车之后会进入命令手册界面，键盘输入`q`返回命令行界面

<img src="https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20240529150824733.png" alt="image-20240529150824733" width="80%" />

### 2.2 help命令

- 作用：查看shell内建命令的简要帮助信息，例如：`cd`、`echo`、`pwd`等，但它并不是用于查看所有命令的手册

- 语法：

    ```shell
    help [parameter:命令名称]  # 如果不指定参数，就是查看bash的所有内建命令
    ```

- 实例1：查看切换目录命令`cd`的简要帮助信息

    ```shell
    help cd
    ```


<img src="https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20240529152330574.png" alt="image-20240529152330574" width="60%"/>

- 实例2：查看bash的所有内建命令

    ```shell
    help
    ```

- 图例2：只有下图中的命令才可是使用`help`命令来查看简要帮助信息

<img src="https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20240529151718583.png" alt="image-20240529151718583" width="80%"/>

### 2.3 `--help`选项

- 作用：大多数命令行工具提供 `--help` 选项，用于在命令行中显示命令的简要帮助信息

- 语法：

    ```shell
    命令 --help
    ```

- 实例1：查看列出当前文件目录命令`ls`的详细使用参数

    ```shell
    ls --help
    ```


<img src="https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20240529152817449.png" alt="image-20240529152817449" width="50%"/>

### 2.4 总结

优先记住查阅方法：外部程序用 `man` 或受支持的 `--help`，Bash 内建命令用 `help`。不确定参数行为时，先查当前环境的手册。

## 3.文件目录管理命令

### 3.1 Linux的目录结构

Linux 将目录组织为从根目录 `/` 开始的树状结构：

![image-20240417210006970](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20240417210006970.png)

- Linux目录结构：

    - `/`：代表根目录，根目录是最顶级的目录，Linux只有这一个顶级目录，不同于Windows有C盘、D盘、E盘等
    - 路径描述的层次关系同样适用`/`来表示
    - `/home/itheima/a.txt`：表示根目录下的`home`文件夹内有一个`itheima`文件夹，`itheima`文件夹内有一个`a.txt`文件

- Linux的文件夹含义：

    | Linux   | 含义                                                         | windows                                           |
    | :------ | :----------------------------------------------------------- | ------------------------------------------------- |
    | `/bin`  | 所有用户可用的基本命令存放的位置                             | windows没有固定的命令存放目录                     |
    | `/sbin` | 需要管理员权限才能使用的命令                                 |                                                   |
    | `/boot` | Linux系统启动的时候需要加载和使用的文件                      |                                                   |
    | `/dev`  | 外设连接Linux后，对应的文件存放的位置                        | 类似Windows中的U盘，光盘的符号文件。              |
    | `/etc`  | 存放系统或者安装的程序的配置文件,注册服务等                  | 类似Windows中的注册表，                           |
    | `/home` | 家目录，Linux中每新建一个用户，会自动在home中为该用户分配一个文件夹 | 类似Windows中的"我的文档"，每个用户有自己的目录。 |
    | `/root` | root账户的家目录，仅供root账户使用                           | 类似Windows中的Administrator账户的"我的文档"      |
    | `/lib`  | Linux的命令和系统启动，需要使用一些公共的依赖，放在lib中，类似我们开发的代码执行需要引入的jdk的jar |                                                   |
    | `/usr`  | 很多系统软件的默认安装路径                                   | 类似Windows中的C盘下的Program Files目录。         |
    | `/var`  | 系统和程序运行产生的日志文件和缓存文件放在这里               |                                                   |

#### 3.1.1 HOME目录

- 每一个用户在登陆Linux系统时都有自己的专属工作目录，称之为HOME目录

- 普通用户的HOME目录，默认在：`/home/用户名`

- root用户的HOME目录，在：`/root`

- Windows系统和Linux系统，均设有用户的HOME目录，如图：

    <img src="https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207170352353.png" alt="image-20231207170352353"  />


![image-20231207170419544](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207170419544.png)

#### 3.1.2 相对路径与绝对路径

- 在Linux中，路径用于指定文件或目录的位置，路径可以分为绝对路径和相对路径。

- **绝对路径** ：是从文件系统的根目录（`/`）开始的完整路径。它始终以 `/` 开头，并提供文件或目录的确切位置。无论当前工作目录是什么，绝对路径都唯一标识一个文件或目录。

    - **示例：**

        - `/home/user/document.txt`：从根目录开始，依次进入 `home` 目录、`user` 目录，最后到达 `document.txt` 文件。

        - `/var/log/syslog`：从根目录开始，依次进入 `var` 目录、`log` 目录，最后到达 `syslog` 文件。

- **相对路径：** 是相对于当前工作目录的路径。它不以 `/` 开头，而是根据当前工作目录提供文件或目录的位置。相对路径可以使用 `.`（表示当前目录）和 `..`（表示上一级目录）来导航。

    - **示例：** 假设当前工作目录是 `/home/user`：

        - `document.txt`：指的是 `/home/user/document.txt`。

        - `../user2/document.txt`：从当前目录的上一级目录开始（即 `/home`），进入 `user2` 目录，最后到达 `document.txt` 文件。

#### 3.1.3 特殊路径符

- `.`： 代表当前目录
    - 比如：`./a.txt`，表示当前文件夹内的`a.txt`文件
- `..`：表示上一级目录
    - 比如：假设当前工作目录是 `/home/itheima/mmz/test`
        - `../`表示上级目录：`/home/itheima/mmz`
        - `../../`表示上一级的上一级目录：`/home/itheima`
- `~`：表示当前用户的HOME目录
    - 比如：`cd ~`，即可切回用户HOME目录

### 3.2 pwd命令

- **功能：**以绝对路径的方式显示用户当前工作目录，第一个`/`表示根目录，最后一个目录是当前目录。执行pwd命令可立刻得知您目前所在的工作目录的绝对路径名称

```bash
pwd
pwd -P  # 显示解析符号链接后的物理路径
```

`pwd` 常由 Shell 内建实现，也可能存在独立程序。Bash 中可用 `help pwd` 查帮助，不要假定内建版本支持 GNU 外部程序的 `--help`、`--version`。

- 实例1：显示当前工作目录的绝对路径

    ```shell
    pwd
    ```

    ![image-20240529163636874](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20240529163636874.png)

> - **说明：**  Linux系统的命令行终端，在启动的时候，会默认加载的是当前登录用户的HOME目录作为当前工作目录，所以`pwd`命令列出的是当前用户HOME目录的绝对路径
>
> - 每个用户在登录`Linux`的时候，都会在`Linux`系统下有一个个人账户目录，路径为：`/home/用户名`，以毛毛演示的这台Linux为例，用户名是`flyvideo`，其HOME目录为：`/home/flyvideo`

### 3.3 ls：查看文件和目录信息

`ls` 主要回答“有哪些文件、它们多大、什么时候修改”，不读取文件正文。不提供路径时查看当前目录；提供目录时，默认列出目录里的内容。

```bash
ls
ls ./logs
ls -lh ./logs
```

#### 3.3.1 常用选项

| 选项 | 作用 | 示例 |
| --- | --- | --- |
| `-l` | 长格式：权限、属主、大小等 | `ls -l` |
| `-h` | 将大小显示为 K、M、G 等易读单位，通常配合 `-l` | `ls -lh` |
| `-a` | 显示隐藏项，包括 `.` 和 `..` | `ls -la` |
| `-A` | 显示隐藏项，但不显示 `.` 和 `..` | `ls -lA` |
| `-t` | 默认按修改时间排序，最近修改的在前 | `ls -lt` |
| `-r` | 反转排序顺序 | `ls -ltr` |
| `-S` | 按文件大小降序排列 | `ls -lhS` |
| `-d` | 显示目录本身，而不是目录内容 | `ls -ld logs` |
| `-R` | 递归列出子目录内容 | `ls -R logs` |
| `-1` | 每行显示一个名称，注意是数字 1 | `ls -1` |

常用组合可以逐项拆开：

```bash
ls -lah logs       # 长格式 + 所有项 + 易读大小
ls -lht logs       # 最近修改的文件排在前面
ls -lhtr logs      # 最近修改的文件排在后面
ls -lh logs/*.log  # 只列出匹配文件名的文件，不会搜索文件内容
ls -ld logs        # 看 logs 目录自身的权限与属性
```

`-t` 默认使用修改时间，不代表文件创建时间，也不等于日志里事件发生的时间。`*.log` 不匹配 `app.log.2025011510`，需要根据实际命名选择 `app.log*` 或指定文件。

#### 3.3.2 读懂长格式输出

```text
-rw-r----- 1 learner staff 2.4M Jan 15 10:30 app.log
lrwxrwxrwx 1 learner staff   18 Jan 15 10:00 current.log -> app.log.2025011510
```

第一行从左到右依次是：文件类型和权限、硬链接数、属主、属组、大小、修改时间、名称。首字符 `-` 表示普通文件，`d` 表示目录，`l` 表示符号链接。

第二行的箭头表示 `current.log` 指向另一个文件。查找或统计时，如果同时扫描链接与目标文件，可能把同一份内容计算两遍。先确认文件关系，再决定搜索范围。

#### 3.3.3 使用边界

`ls` 适合人工浏览，不适合让脚本解析其排版。文件名可能有空格甚至换行；需要可靠地批量处理文件时，应使用 Shell 的文件名展开或 `find` 等工具。目录特别大时也不要一开始就 `ls -R /`，先缩小到目标目录。

### 3.4 cd命令

- 功能：切换工作目录
- 语法：`cd [dirName]`
  - `dirName`表示法可为绝对路径或相对路径
  - 若目录名称省略，则变换至使用者的`home directory`(也就是刚`login`时所在的目录)。另外，`~`也表示为`home directory`的意思
  - `.`则是表示目前所在的目录
  - `..`则表示目前目录位置的上一层目录


- 示例：

  ```shell
  cd    进入用户主目录；
  cd ~  进入用户主目录；
  cd -  返回进入此目录之前所在的目录；
  cd ..  返回上级目录（若当前目录为“/“，则执行完后还在“/"；".."为上级目录的意思）；
  cd ../..  返回上两级目录；
  cd !$  把上个命令的参数作为cd参数使用
  cd /usr/local/   切换到local目录
  ```

### 3.5 mkdir命令

- 功能：通过mkdir命令可以创建新的目录（文件夹）(Make Directory)

- 语法：`mkdir [-p] 参数`
  - 参数：必填，表示Linux路径，即要创建的文件夹的路径，相对路径或绝对路径均可
  - 选项：`-p`，表示自动创建不存在的父目录，适用于创建连续多层级的目录

- **案例：**
  - 如果想要一次性创建多个层级的目录(如下图)，会报错，因为上级目录itcast和good并不存在，所以无法创建666目录，可以通过`-p`选项，将一整个链条都创建完成。

![image-20231207171106280](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207171106280.png)

![image-20231207171113888](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207171113888.png)

### 3.6 touch命令

- 功能：创建文件

- 语法：`touch 参数`
  - 说明：该命令无选项，参数必填，表示要创建的文件路径，相对、绝对、特殊路径符均可以使用

![image-20231207171500659](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207171500659.png)

### 3.7 cat、more、less：浏览文件正文

选工具前先判断：文件是否很小，是否需要来回翻页，还是只看开头或末尾。

| 命令 | 适合什么任务 | 是否交互 |
| --- | --- | --- |
| `cat` | 输出小文件全部内容，或按顺序拼接文件 | 否 |
| `more` | 分页阅读，基本操作以前进为主 | 是 |
| `less` | 搜索、前后翻页阅读大文件 | 是 |
| `head` | 只读开头若干行，观察格式 | 否 |
| `tail` | 只看末尾或持续跟踪追加内容 | 可持续运行 |

```bash
cat config.txt                  # 输出全部正文
cat part1.txt part2.txt          # 依次输出两个文件
cat -n config.txt               # 给输出加上行号
less app.log                    # 打开交互阅读界面
less -N app.log                  # 阅读时显示行号
```

不要直接 `cat` 一个几 GB 的日志来寻找某个错误。先用 `grep` 定位，或用 `less` 交互阅读。

`less` 常用按键：

| 按键 | 作用 |
| --- | --- |
| 空格 / `b` | 向后 / 向前翻一屏 |
| `/timeout` 后回车 | 向后搜索 `timeout` |
| `n` / `N` | 跳到同方向 / 反方向的下一处匹配 |
| `g` / `G` | 文件开头 / 文件末尾 |
| `q` | 退出，回到终端 |

这里的“向后”指向文件后面的内容。搜索默认使用正则表达式。也可以将筛选结果交给分页器：`grep -nF 'ERROR' app.log | less`。

### 3.8 cp命令

- 功能：复制文件、文件夹

- 语法：`cp [-r] 参数1 参数2`
  - 参数1：Linux路径，表示被复制的文件或者文件夹
  - 参数2：Linux路径，表示要复制去的地方
  - **选项：`-r`，可选，复制文件夹使用，表示递归**

- **示例：**

  - cp a.txt b.txt，复制当前目录下a.txt为b.txt

  - cp a.txt test/，复制当前目录a.txt到test文件夹内

  - cp -r test test2，复制文件夹test到当前文件夹内为test2存在


- **示例演示1：复制文件**

![image-20231207172343583](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207172343583.png)

**示例演示2：复制文件夹：**

![image-20231207172404209](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207172404209.png)

### 3.9 mv命令

- 功能： 用于移动文件、文件夹，来自英文单词：move

- 语法：`mv 参数1 参数2`
  - 参数1，Linux路径，表示被移动的文件或文件夹
  - **参数2，Linux路径，表示要移动去的地方，如果目标不存在，该命令就是对文件进行改名**

- 示例演示：

![image-20241027202745870](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241027202745870.png)

### 3.10 rm命令

- 功能：删除文件、文件夹，来自英文单词remove
- 语法：`rm [-r -f] 参数...参数`
  - 参数：支持同时删除一个活多个文件或文件夹，每一个表示被删除的使用空格进行分隔
  - 选项：`-r`，同`cp`命令一样，删除文件夹使用
  - 选项：`-f`，表示`force`，强制删除(不会给出确认提示)，一般`root`用户会用到
    - 普通用户删除内容不会弹出提示，只有`root`管理员用户删除内容会有提示
    - 所以一般普通用户用不到`-f`选项

- 注意事项：`rm`命令很危险，一定要注意，特别是切换到`root`用户的时候

- 示例演示1： 删除文件

![image-20231207172530484](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207172530484.png)

- 示例演示2：删除多个文件

![image-20231207172539483](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207172539483.png)

- 示例演示3：删除文件夹，如下图，必须使用`-r`选项才可以

![image-20231207172619243](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207172619243.png)

- 示例演示4：演示强制删除，`-f`选项（可以通过 su - root，并输入密码123456（和普通用户默认一样）临时切换到root用户体验）

<img src="https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207172634295.png" alt="image-20231207172634295" style="zoom:50%;" /><img src="https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207172639609.png" alt="image-20231207172639609" style="zoom:80%;" />

> 通过输入exit命令，退回普通用户。（临时用root，用完记得退出，不要一直用，关于root我们后面会讲解）

- **rm命令支持通配符 *，用来做模糊匹配：**

  - 符号* 表示通配符，即匹配任意内容（包含空），示例：

  - test*，表示匹配任何以test开头的内容

  - *test，表示匹配任何以test结尾的内容

  - *test *，表示匹配任何包含test的内容


- 示例演示5：删除所有以test开头的文件或文件夹

![image-20231207172124708](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207172124708.png)

### 3.11 which命令

- 功能：查看命令的程序本体文件路径，即查看所使用的一系列命令的程序文件存放在哪里
- 语法：`which 要查找的命令`
- 示例：

![image-20241027203625259](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241027203625259.png)

### 3.12 find命令

- 功能：按文件名查找文件，或者按文件大小查找文件夹
- 语法：
  - 按文件名查找文件夹：`find 路径 -name 参数`
    - 路径：搜索的起始路径
    - 参数：被查找的文件名

  - 按文件大小查找文件夹：`find 起始路径 -size +|-n[kMG]`
    - `+`、`-`表达大于和小于
    - `n`表示大小数字
    - `kMG`表示大小单位，k(小写字母)表示kb，M表示MB，G表示GB

- 示例演示1：从根目录搜索文件名为`test`的文件

![image-20241027203857491](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241027203857491.png)

- 示例演示2：

  ```shell
  查找小于10KB的文件： find / -size -10k
  查找大于100MB的文件：find / -size +100M
  查找大于1GB的文件：find / -size +1G
  ```

- 进阶语法：被查找的文件名支持使用通配符`*`来模糊查询
  - 符号`*`表示通配符，即匹配任意内容（包含空）
  - `test*`：表示匹配任何以test开头的内容
  - `*test`：表示匹配任何以test结尾的内容
  - `*test*`：表示匹配任何包含test的内容

- 示例演示1：查找所有以test开头的文件：`find / -name “test*”`

![image-20241027204237833](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241027204237833.png)

- 查找所有以test结尾的文件：`find / -name “*test”`

![image-20241027204247687](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241027204247687.png)

- 查找所有包含test的文件：`find / -name “*test*”`

![image-20241027204254973](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241027204254973.png)


### 3.13 grep：按内容筛选行

`grep` 默认逐行读取输入，输出包含匹配内容的整行。它筛选文件正文，不负责按文件名寻找文件。

```text
grep [选项] 模式 [文件...]
```

文件参数可以是一个或多个；省略文件参数时，从标准输入读取，因此可以接收管道传来的内容。多个文件中查找时，默认还会显示文件名。

#### 3.13.1 从最简单的搜索开始

```bash
grep 'ERROR' app.log              # 含有 ERROR 的行，区分大小写
grep -n 'ERROR' app.log           # 同时显示原文件行号
grep -nF '[ERROR]' app.log        # 按字面查找 [ERROR]
grep -ni 'timeout' app.log        # 忽略大小写并显示行号
grep -nF 'ERROR' app.log app.log.1 # 在两个明确的文件中查找
```

例如输出 `42:[ERROR] connection timeout`，`42` 是这条记录在输入文件中的行号，后面才是正文。

如果只想查找原样文本，`-F` 能避免把 `.[]*` 等字符误认为正则。`grep '[ERROR]'` 并不是精确搜索 `[ERROR]`：其中方括号会被解释为字符集合。

#### 3.13.2 选项按用途记

| 目的 | 选项 | 示例 |
| --- | --- | --- |
| 显示行号 | `-n` | `grep -nF 'ERROR' app.log` |
| 忽略大小写 | `-i` | `grep -i 'error' app.log` |
| 排除匹配行 | `-v` | `grep -vF 'healthcheck' app.log` |
| 固定文本匹配 | `-F` | `grep -F 'a.b' app.log` |
| 扩展正则匹配 | `-E` | `grep -E 'ERROR\|WARN' app.log` |
| 统计匹配行数 | `-c` | `grep -cF 'ERROR' app.log` |
| 仅显示匹配部分 | `-o` | `grep -oE 'status=[0-9]+' app.log` |
| 仅列出有匹配的文件名 | `-l`（小写 L） | `grep -lF 'ERROR' *.log` |
| 强制显示 / 隐藏文件名 | `-H` / `-h` | `grep -HnF 'ERROR' app.log` |
| 显示匹配行之前 / 之后的内容 | `-B N` / `-A N` | `grep -n -A 5 'Exception' app.log` |
| 显示前后各 N 行 | `-C N` | `grep -n -C 3 'Exception' app.log` |
| 每个文件最多选中 N 行 | `-m N` | `grep -m 20 -nF 'ERROR' app.log` |
| 只判断是否找到，不输出正文 | `-q` | `grep -qF 'ready' app.log` |

`-c` 统计的是匹配行数，一行出现三次 `ERROR` 仍算一行。上下文选项会带出未匹配行；不要将带上下文的输出直接当作匹配条数统计。

`-m 20` 是每个文件的限制，不是所有文件合计 20 条。有上下文参数时，输出总行数还可能超过 20 行。

#### 3.13.3 grep -Rn 到底是什么

```bash
grep -Rn 'timeout' ./logs
```

拆开就是 `grep -R -n 'timeout' ./logs`：递归搜索目录及子目录，并给匹配行加行号。

在 GNU grep 中，`-r` 和 `-R` 的重要区别是符号链接：`-r` 跳过递归遍历过程中遇到的符号链接，但会跟随命令行直接指定的链接；`-R` 则会跟随遍历过程中遇到的链接。日常检索普通日志目录通常先选 `-r`，避免意外扫到目录外或重复扫描。

```bash
grep -rnF 'timeout' ./logs
# 引号保护 *.log，使它交给 grep，而不是先由 Shell 展开
grep -rnF --include='*.log' 'timeout' ./logs
grep -rnF --include='*.log*' --exclude='*.gz' 'timeout' ./logs
grep -rnF --exclude-dir=archive 'timeout' ./logs
```

这些文件过滤选项以 GNU grep 为例。`--include='*.log'` 不包含 `app.log.1`；范围要与实际文件名相符。递归查整个目录便于探索，但已知日期和文件后，应改为搜索指定文件，减少无关扫描。

#### 3.13.4 表达“或”“且”“排除”

```bash
# 或：一行包含 ERROR 或 WARN
grep -nE 'ERROR|WARN' app.log
# 固定文本的或：任意一个 -e 模式命中即可
grep -nF -e 'connection timeout' -e 'connection refused' app.log
# 且：先选 ERROR 行，再要求这一行包含 timeout
grep -nF 'ERROR' app.log | grep -F 'timeout'
# 排除：从 ERROR 行中去掉含 healthcheck 的行
grep -nF 'ERROR' app.log | grep -vF 'healthcheck'
```

第二次 `grep` 筛选的是第一次的输出。只有第一次加 `-n` 时，保留下来的是原文件行号；如果第二次也加 `-n`，就会额外标记“上一步结果里的行号”。

| 扩展正则 | 含义 | 例子 |
| --- | --- | --- |
| `^` | 行首 | `'^ERROR'` |
| `$` | 行尾 | `'timeout$'` |
| `.` | 任意单个字符 | `'a.b'` |
| `[0-9]` | 一个数字 | `'status=[0-9]'` |
| `+` | 前一项出现一次或多次 | `'[0-9]+'` |
| `*` | 前一项出现零次或多次 | `'.*timeout'` |
| `\|` | 或 | `'ERROR\|WARN'` |
| `(...)` | 分组 | `'(read\|write) timeout'` |

以 `2025-01-15T10:20:03` 这样的文本时间为例：

```bash
grep -nE '2025-01-15[T ]10:(1[5-9]|2[0-5]):' app.log
```

这会匹配 10:15:00 至 10:25:59 的文本时间，`[T ]` 接受 `T` 或空格作为日期时间分隔符。它不解析时区，不验证日期，也不能拿来直接比较任意格式的时间。跨小时、跨日期时应分别明确范围。

#### 3.13.5 无输出、报错与特殊字符

没有输出，不一定是命令错误。可能文件不对、大小写不同、没有匹配，也可能权限不足而错误显示在标准错误中。

```bash
grep -nF 'not-present' app.log
printf '退出状态：%s\n' "$?"
```

GNU grep 通常返回 `0` 表示匹配，`1` 表示无匹配，`2` 表示错误。`$?` 必须紧接着读取；若先执行别的命令，它就会被更新。脚本中要区分“没找到”和“读取失败”；不要把二者统称为命令失败。`-q` 提前退出时有特殊情况，完整规则可查本机手册。

搜索以 `-` 开头的文本时，用 `-e` 指明模式；文件名也以 `-` 开头时，用 `--` 结束选项解析，或给文件名前加 `./`。

```bash
grep -nF -e '-timeout' -- app.log
grep -nF 'ERROR' ./-app.log
```

不要为了隐藏报错，立即加 `2>/dev/null`；先确认错误原因，否则可能把“文件不存在”误认为“没有错误日志”。

### 3.14 wc：统计行数、单词数与大小

`wc` 可以读取文件，也可以读取管道输入。

| 选项 | 统计内容 | 说明 |
| --- | --- | --- |
| `-l` | 换行符数量 | 通常用作行数；末行没有换行符时需注意 |
| `-w` | 按空白划分的词数 | 不是中文分词器 |
| `-c` | 字节数 | 适合比较数据体积 |
| `-m` | 字符数 | 依赖当前字符编码与 locale，多字节字符和字节数不同 |

```bash
wc -l app.log                       # 数量后面还会显示文件名
wc -l < app.log                     # 由标准输入读取，结果不带文件名
grep -F 'ERROR' app.log | wc -l      # 统计筛选结果的行数
grep -cF 'ERROR' app.log             # 单文件统计可直接使用 -c
```

`wc app.log` 默认依次输出行数、词数、字节数和文件名。多个文件时会分别统计并给出合计。统计前要明确单位：一条错误可能有多行堆栈，同一请求也可能产生多条日志，“行数”不等于“失败请求数”。

### 3.15 管道符 |：把命令组合起来

#### 3.15.1 三条标准数据流

每个命令通常都有三条标准数据流：

| 名称 | 编号 | 默认连接 | 用途 |
| --- | --- | --- | --- |
| 标准输入 stdin | `0` | 终端输入 | 命令读取数据 |
| 标准输出 stdout | `1` | 终端显示 | 命令输出正常结果 |
| 标准错误 stderr | `2` | 终端显示 | 命令输出诊断、报错等信息 |

`|` 将左侧命令的**标准输出**连接到右侧命令的**标准输入**。虽然正常结果与错误都可能出现在屏幕上，默认只有标准输出进入管道。

```bash
grep -nF 'ERROR' app.log | head -n 20
```

```text
app.log → grep 选出含 ERROR 的行并附行号 → head 取前 20 行 → 终端
```

右侧 `head` 没有文件参数，因为它从管道读取。如果写成 `grep ... | head -n 20 other.log`，`head` 会读取显式指定的 `other.log`，不会按预期处理 grep 的结果。

管道中的命令通常并发运行，数据边产生边流动，并不是左侧全部执行完才启动右侧。`head` 取得足够内容后可以提前退出。

#### 3.15.2 顺序改变，问题就变了

```bash
grep -F 'ERROR' app.log | head -n 20  # 全文件中最先出现的 20 条匹配
head -n 20 app.log | grep -F 'ERROR'  # 只检查文件开头 20 行中的匹配

grep -F 'ERROR' app.log | tail -n 20  # 全文件中最后出现的 20 条匹配
tail -n 200 app.log | grep -F 'ERROR' # 只检查文件末尾 200 行中的匹配
```

后两种取样都不保证得到 20 条错误。先限制文件范围会减少扫描量，同时也可能漏掉范围之外的记录。多个文件拼接后的“最后”是输入顺序的最后，不会自动按事件时间排序。

#### 3.15.3 不要混淆三种竖线写法

| 写法 | 含义 |
| --- | --- |
| `command1 \| command2` | 数据管道 |
| `grep -E 'ERROR\|WARN' app.log` | 引号里的正则“或” |
| `command1 \|\| command2` | 第一条命令退出状态非零时，执行第二条命令 |

命令中的管道必须是英文半角 `|`，不是中文全角 `｜`。正则表达式加引号，防止其中的竖线被 Shell 误认为管道。

Bash 默认用管道中最后一个命令的状态作为整条管道状态。因此 `grep ... | head ...` 后的 `$?` 不能直接判断 grep 是否成功。脚本需要更严格的错误判断时，可了解 `set -o pipefail` 和 `PIPESTATUS`；还要考虑 `head` 提前退出可能导致上游收到 `SIGPIPE`，不能把这种情况一律当成文件损坏。

### 3.16 echo命令

- 功能：在命令行内输出指定内容

- 语法：`echo 输出的内容`
  - 无需选项，只有一个参数表示要输出的内容，复杂内容可以用双引号包围


- 示例演示1：在终端上显示`Hello Linux`

![image-20241027210343610](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241027210343610.png)

### 3.17 命令替换：把输出作为参数

命令替换将一个命令的标准输出放入另一个命令的参数或变量中。推荐使用 `$(...)`，比反引号更容易阅读和嵌套。

```bash
current_dir=$(pwd)
printf '当前目录：%s\n' "$current_dir"
```

双引号避免含空格的结果被拆成多个参数。命令替换会移除输出末尾的换行符；它与管道不同，管道连接数据流，命令替换得到一个文本结果。

### 3.18 重定向与 tee：控制输入输出位置

#### 3.18.1 覆盖、追加与标准错误

| 写法 | 作用 |
| --- | --- |
| `command > result.txt` | 标准输出写入文件；存在时先清空 |
| `command >> result.txt` | 标准输出追加到文件末尾 |
| `command < input.txt` | 从文件读取标准输入 |
| `command 2> errors.txt` | 标准错误写入文件 |
| `command > all.txt 2>&1` | 标准输出和标准错误都写入文件 |

```bash
grep -nF 'ERROR' app.log > errors.txt   # 保存本次结果
grep -nF 'WARN' app.log >> errors.txt   # 追加另一批结果
wc -l < errors.txt                    # 读取文件作为输入
grep -nF 'ERROR' app.log > matches.txt 2> read-errors.txt
```

重定向由 Shell 执行。`>` 会在命令读取输入前截断目标文件，所以**不能写 `grep 'ERROR' app.log > app.log`**，否则原始内容可能先被清空。需要输出新结果时，使用不同的文件名。

重定向顺序也有区别：`> all.txt 2>&1` 先把标准输出接到文件，再让标准错误指向同一位置；`2>&1 > all.txt` 先让标准错误指向原来的标准输出，随后只改变标准输出，因此错误仍可能显示在终端。

`/dev/null` 会丢弃写入的数据。仅在明确不需要某类输出时才将它重定向到这里。

#### 3.18.2 tee：同时查看和保存

```bash
grep -nF 'ERROR' app.log | tee errors.txt
# -a 表示追加；不加 -a 时覆盖目标文件
grep -nF 'WARN' app.log | tee -a errors.txt
```

`tee` 将收到的标准输入同时写入文件和标准输出，可以继续接其他命令：

```bash
grep -nF 'ERROR' app.log | tee errors.txt | head -n 20
```

注意：上例中 `head` 提前关闭管道时，`tee` 可能提前终止，不能依赖这种写法保存全部匹配结果。需要完整保存并预览时，分两步执行：

```bash
grep -nF 'ERROR' app.log > errors.txt
head -n 20 errors.txt
```

### 3.19 tail：查看末尾和跟踪新增内容

`tail` 默认输出最后 10 行，不会自动持续刷新。

```bash
tail app.log               # 最后 10 行
tail -n 50 app.log         # 最后 50 行
tail -n +100 app.log       # 从第 100 行开始，一直到文件末尾
tail -c 100 app.log        # 最后 100 字节，可能截断一个多字节字符
```

推荐 `-n 50` 这种明确写法，而不是依赖旧式 `-50` 简写。`-n +100` 的加号表示“起始位置”，不是“最后 100 行”。

#### 3.19.1 -f 与 -F 的区别

```bash
tail -n 50 -f app.log      # 先显示末尾 50 行，再持续输出追加内容
tail -n 0 -f app.log       # 只观察命令启动后追加的内容
tail -n 50 -F app.log      # 按名称跟踪并重试，适合会被轮转替换的路径
```

在 GNU tail 中，`-f` 默认跟踪已经打开的文件描述符。日志被改名、同名新文件被创建后，它可能继续跟着旧文件；`-F` 等价于 `--follow=name --retry`，会尝试重新打开该路径。它不是“跟踪整个目录”：若程序改为写另一个小时文件名，而原路径不再更新，`-F` 不会自行猜出新名称。

按 `Ctrl+C` 停止跟踪。这会结束当前查看命令，不会停止产生日志的应用程序。

#### 3.19.2 实时过滤与缓冲

```bash
tail -n 50 -F app.log | grep --line-buffered -F 'ERROR'
```

`--line-buffered` 让 GNU grep 按行输出，尤其在后面还接其他管道或重定向时，可以减少缓冲带来的等待。若继续接第二个 grep，也应考虑它的缓冲。该参数不代表应用程序已经及时把日志写到磁盘。

持续运行的 `tail -f` 不适合接 `tail -n 20` 来“实时只显示最后 20 条”；后者通常要等到输入结束。它接 `wc -l` 时，`wc` 也会等待流结束再输出结果。

### 3.20 head：查看开头和限制输出

`head` 默认输出前 10 行。它适合先观察文件格式，或者控制一条检索命令的输出量。

```bash
head app.log                    # 前 10 行
head -n 30 app.log              # 前 30 行
head -c 100 app.log             # 前 100 字节
head -n 5 app.log access.log    # 每个文件分别取前 5 行，并带文件标题
grep -nF 'ERROR' app.log | head -n 20
```

`head` 不理解“时间最新”“错误最严重”等业务含义，只取输入流开头。文件不足指定行数时，直接输出已有内容，不会补齐。

| 想看什么 | 写法 |
| --- | --- |
| 文件最初 20 行 | `head -n 20 app.log` |
| 文件最后 20 行 | `tail -n 20 app.log` |
| 最先出现的 20 条匹配 | `grep -F 'ERROR' app.log \| head -n 20` |
| 最后出现的 20 条匹配 | `grep -F 'ERROR' app.log \| tail -n 20` |
| 新追加的匹配 | `tail -n 0 -F app.log \| grep --line-buffered -F 'ERROR'` |

上表中的管道在实际命令里直接输入 `|`。Markdown 源码中的转义反斜杠只是为了避免竖线被当作表格分隔符。

### 3.21 history命令

- 作用：查看历史输入过的命令

![image-20250331144800377](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331144800377.png)

- 可以通过：`!命令前缀`，自动执行上一次匹配前缀的命令

  <img src="https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207164628606.png" alt="image-20231207164628606" style="zoom:50%;" />

- 可以通过快捷键Ctrl + R，输入内容去匹配历史命令，如果搜索到的内容是你需要的

  - 回车键可以执行
  - 键盘左右键，可以得到此命令（不执行）

  <img src="https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207164754334.png" alt="image-20231207164754334" style="zoom:50%;" />


> - 清楚所有历史命令记录：`history -c`
> - 部分删除操作可以进入该文件：`vim ~/.bash_history`
>   - 该文件即为历史记录存储文件，我们随意修改
>   - 修改后再次 history 查看，发现并没有变化。原因：**缓存**
>   - **执行：history -r**
>   - 读取历史文件并将其内容添加到历史记录中，即重置文件里的内容到内存中，完成修改

### 3.22 vi/vim编辑器

####  3.22.1 简介

- `vi\vim`是`visual interface`的简称，是`Linux`中最经典的文本编辑器。同图形化界面中的 文本编辑器一样，vi是命令行下对文本文件进行编辑的绝佳选择。**vim 是 vi 的加强版本，兼容 vi 的所有指令，不仅能编辑文本，而且还具有 shell 程序编辑的功能，可以不同颜色的字体来辨别语法的正确性，极大方便了程序的设计和编辑性。**

- **vi\vim编辑器的三种工作模式：**
  - 命令模式（Command mode）：命令模式下，所敲的按键编辑器都理解为命令，以命令驱动执行不同的功能。此模型下，不能自由进行文本编辑。
  - 输入模式（Insert mode）：也就是所谓的编辑模式、插入模式。此模式下，可以对文件内容进行自由编辑。
  - 底线命令模式（Last line mode）：以`:`开始，通常用于文件的保存、退出。

![image-20241027211751440](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241027211751440.png)

- **编辑模式没有什么特殊的，进入编辑模式后，任何快捷键都没有作用，就是正常输入文本而已。唯一大家需要记住的，就是：通过`esc`，可以退回到命令模式中即可。**
- **底线命令快捷键：**

|     模式     |     命令      |     描述     |
| :----------: | :-----------: | :----------: |
| 底线命令模式 |     `:wq`     |  保存并退出  |
| 底线命令模式 |     `:q`      |    仅退出    |
| 底线命令模式 |     `:q!`     |   强制退出   |
| 底线命令模式 |     `:w`      |    仅保存    |
| 底线命令模式 | **`:set nu`** | **显示行号** |
| 底线命令模式 | `:set paste`  | 设置粘贴模式 |

- **命令模式快捷键：**

|   模式   | 命令  |                描述                 |
| :------: | :---: | :---------------------------------: |
| 命令模式 |  `i`  |    在当前光标位置进入`输入模式`     |
| 命令模式 |  `a`  | 在当前光标位置 之后 进入`输入模式`  |
| 命令模式 |  `I`  |   在当前行的开头，进入`输入模式`    |
| 命令模式 |  `A`  |   在当前行的结尾，进入`输入模式`    |
| 命令模式 |  `o`  |   在当前光标下一行进入`输入模式`    |
| 命令模式 |   O   |   在当前光标上一行进入`输入模式`    |
| 输入模式 | `ESC` | 任何情况下输入`ESC`都能回到命令模式 |

|   模式   |    命令    |               描述               |
| :------: | :--------: | :------------------------------: |
| 命令模式 |    `上`    |           向上移动光标           |
| 命令模式 |    `下`    |           向下移动光标           |
| 命令模式 |    `左`    |           向左移动光标           |
| 命令模式 |    `右`    |           向右移动光标           |
| 命令模式 |    `0`     |      移动光标到当前行的开头      |
| 命令模式 |    `$`     |      移动光标到当前行的结尾      |
| 命令模式 |  `pageup`  |             向上翻页             |
| 命令模式 | `pagedown` |             向下翻页             |
| 命令模式 |    `/`     |           进入搜索模式           |
| 命令模式 |    `n`     |           向下继续搜索           |
| 命令模式 |    `N`     |           向上继续搜索           |
| 命令模式 |    `dd`    |       删除光标所在行的内容       |
| 命令模式 |   `ndd`    | n是数字，表示删除当前光标向下n行 |
| 命令模式 |    `yy`    |            复制当前行            |
| 命令模式 |   `nyy`    |  n是数字，复制当前行和下面的n行  |
| 命令模式 |    `p`     |          粘贴复制的内容          |
| 命令模式 |    `u`     |             撤销修改             |
| 命令模式 |  `ctrl+r`  |           反向撤销修改           |
| 命令模式 |    `gg`    |             跳到首行             |
| 命令模式 |    `G`     |             跳到行尾             |
| 命令模式 |    `dG`    |    从当前行开始，向下全部删除    |
| 命令模式 |   `dgg`    |    从当前行开始，向下全部删除    |
| 命令模式 |    `d$`    | 从当前光标开始，删除到本行的结尾 |
| 命令模式 |    `d0`    |  从当前行开始，删除到本行的开头  |

#### 3.22.2 使用

- 语法：由于vim兼容全部的vi功能，后续全部使用vim命令

  ```shell
  vi 文件路径
  vim 文件路径
  ```

- 解释：
  - 如果文件路径表示的文件不存在，那么此命令会用于编辑新文件
  - 如果文件路径表示的文件存在，那么此命令用于编辑已有文件
- 用法：通过vim命令编辑文件，会打开一个新的窗口，此时这个窗口就是：命令模式窗口，如下图所示，命令模式是vi编辑器的入口和出口
  - 进入vim编辑器会进入命令模式
  - 通过命令模式输入键盘指令，可以进入输入模式
  - 输入模式需要退回到命令模式，然后通过命令可以进入底线命令模式

![image-20250331155543330](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331155543330.png)

## 4.Linux实用操作

### 4.1 各类小技巧（快捷键）

- **强制停止：**Ctrl + C

  - Linux某些程序的运行如果想要强行停止它，可以使用快捷键Ctrl+C

  ![image-20250331144530693](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331144530693.png)

  - 命令输入错误，也可以通过快捷键Ctrl + C，退出当前输入，重新输入

  ![image-20250331144538341](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331144538341.png)

- **退出或登出：**Ctrl + D

  - 退出账户的登录

  ![image-20250331144655329](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331144655329.png)

  - 退出某些特定程序的专属页面（ps：不能用于退出vi/vim）

  ![QQ_1743409954403](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/QQ_1743409954403.png)

- **光标移动快捷键：**

  - Ctrl + A，跳到命令开头

  - Ctrl + E，跳到命令结尾

  - Ctrl + 键盘左键，向左跳一个单词

  - Ctrl + 键盘右键，向右跳一个单词


- **清屏：**
  - **通过快捷键Ctrl + L，可以清空终端内容，或通过命令clear得到同样效果**


### 4.2 关机与重启命令

下表总结了这四个命令的区别和用法：

|       命令        |     功能     | 关机通知消息 | 需要手动断开电源 |
| :---------------: | :----------: | :----------: | :--------------: |
|     `reboot`      | 重新启动系统 |      否      |        否        |
| `shutdown -r now` | 重新启动系统 |      是      |        否        |
|    `poweroff`     | 完全关闭系统 |      否      |        是        |
|      `halt`       | 完全关闭系统 |      否      |        是        |

- 根据实际需求，选择合适的命令来进行关机或重启操作。如果需要快速重启系统且不需要关机通知消息，则可以使用`reboot`命令。如果需要重启系统并显示关机通知消息，则可以使用`shutdown -r now`命令。如果只需要完全关闭系统而不重新启动，则可以使用`poweroff`命令或`halt`命令。
- 在`Ubuntu Linux`中，有多种命令可用于关闭或重新启动系统。`reboot`命令用于快速重新启动系统，`shutdown -r now`命令用于重启系统并显示关机通知消息，`poweroff`命令用于完全关闭系统，而`halt`命令也用于完全关闭系统但需要手动断开电源连接。根据具体需求，选择适当的命令来管理系统的关机和重启操作。

### 4.3 软件安装

操作系统安装软件有许多种方式，一般分为：

**下载安装包自行安装**

- **如win系统使用exe文件、msi文件等**
- **如mac系统使用dmg文件、pkg文件等**

**系统的应用商店内安装**

- **如win系统有Microsoft Store商店**
- **如mac系统有AppStore商店**

Linux系统同样支持这两种方式，我们首先，先来学习使用：Linux命令行内的”应用商店”，yum命令安装软件  前面学习的各类Linux命令，都是通用的。 但是软件安装，CentOS系统和Ubuntu是使用不同的包管理器。

CentOS使用yum管理器，Ubuntu使用apt管理器

#### 4.3.1 yum命令-CentOS系统

- 作用：`yum`是`RPM`包软件管理器，用于自动化安装配置Linux软件，并可以自动解决依赖问题
- 语法：`yum [-y] [install | remove | search] 软件名称`
    - `-y`选项：自动确认，无需手动确认安装或者卸载过程
    - `install`选项：安装
    - `remove`选项：卸载
    - `search`选项：搜索
- 说明：`yum`命令需要`root`权限，可以`su`切换到`root`，或使用`sudo`提权，同时`yum`命令需要连网
- 示例1：`yum [-y] install wget`， 通过yum命令安装wget程序

![image-20241114234430097](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114234430097.png)

- 示例2：`yum [-y] remove wget`，通过yum命令卸载wget命令
- 示例3：`yum search wget`，通过yum命令，搜索是否有wget安装包

> **CentOS7**停服之后，官方**yum**源无法访问，如果继续用会发生如下报错：
>
> ```shell
> Could not resolve host: mirrorlist.centos.org; Unknown error
> ```
>
> 相关配置可参考：[【Linux】CentOS7停服之后配置yum镜像源](https://blog.csdn.net/weixin_48235955/article/details/145879184?spm=1011.2415.3001.5331)

#### 4.3.2 apt命令-Ubuntu系统

- 语法：`apt [-y] [install | remove | search] 软件名称`
  - `-y`选项：自动确认，无需手动确认安装或者卸载过程
  - `install`选项：安装
  - `remove`选项：卸载
  - `search`选项：搜索


- 用法和yum一致，同样需要`root`权限

#### 4.3.3 snap命令安装

- 作用：通过Snap可以安装众多的软件包。需要注意的是，snap是一种全新的软件包管理方式，它类似一个容器拥有一个应用程序所有的文件和库，各个应用程序之间完全独立。所以使用snap包的好处就是它解决了应用程序之间的依赖问题，使应用程序之间更容易管理。但是由此带来的问题就是它占用更多的磁盘空间。
- 语法：`snap [-y] [install/search/remove]  包名`

![QQ_1743413574732](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/QQ_1743413574732.png)

```bash
# 可以搜索想要的snap包，例如tomcat
sudo snap search tomcat
# 安装snap包
sudo snap install tomcat-sample
# 删除一个snap包
sudo snap remove tomcat
```

- 安装路径统一在：

![QQ_1743413545259](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/QQ_1743413545259.png)

- 查看通过snap安装的snap包：`snap list`

### 4.4 systemctl

#### 4.4 `systemctl` 命令

- 作用：`systemctl` 是一个用于管理 Linux 系统服务的命令，可以控制软件（服务）的启动、关闭、重启以及设置开机自启状态。

- **适用范围**：
  - 系统内置服务（如 `NetworkManager`、`firewalld` 等）均可被 `systemctl` 控制。
  - 第三方软件：
    - 如果安装后自动注册为服务，可直接通过 `systemctl` 管理。
    - 如果未自动注册，可手动将其添加到 `systemctl` 管理中。

- 说明：Linux 系统中，许多软件（包括内置和第三方）都支持通过 `systemctl` 命令进行管理。能够被 `systemctl` 管理的软件通常被称为 **服务**。

- 语法：`systemctl [start | stop | restart | status | enable | disable] 服务名`
  - `start`：启动服务
  - `stop`：停止服务
  - `restart`：重启服务
  - `status`：查看服务的当前状态
  - `enable`：设置服务开机自启
  - `disable`：取消服务开机自启

- 常见的系统内置服务：

  - `NetworkManager`：主网络服务

  - `network`：副网络服务

  - `firewalld`：防火墙服务

  - `sshd`：SSH 服务（如 FinalShell 远程登录 Linux 使用的服务）

- 部分第三方软件安装后会自动注册为服务，可通过 `systemctl` 管理：

  - 安装 NTP 软件后，可通过 `ntpd` 服务名管理：

    ```bash
    systemctl start ntpd
    ```

  - 安装 Apache 服务器后，可通过 `httpd` 服务名管理：

    ```bash
    systemctl enable httpd
    ```

- 手动添加服务：如果第三方软件未自动注册为服务，可以手动将其添加到 `systemctl` 管理中。具体方法通常涉及创建服务文件并放置到 `/etc/systemd/system/` 目录下。

### 4.5 软链接与硬链接

#### 软连接

- 功能：在系统中创建软链接，可以将文件、文件夹链接到其它位置，**类似Windows系统中的创建快捷方式**

- 语法：`ln -s 参数1 参数2`

    - `-s`选项：创建软连接

    - 参数1：被链接的文件或文件夹

    - 参数2：要链接去的地方（快捷方式的名称和存放位置）

- 使用案例：

    ```shell
    ln -s /etc/yum.conf ~/yum.conf
    ln -s /etc/yum ~/yum
    ```

![image-20241114111515540](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114111515540.png)

- 说明：链接只是一个指向，并不是物理移动，类似 Windows 系统的快捷方式；若目标文件 / 文件夹被删除或移动，软链接会 “悬空”（无法访问），但软链接本身仍作为独立文件存在。

#### 硬链接

- 功能：为文件创建**新的文件名**，多个硬链接与原文件共享同一个 inode（本质是 “同一个文件的不同访问入口”）；**删除任意一个硬链接不会删除文件内容，只有当所有硬链接（包括原文件）都被删除时，文件才会真正从文件系统中移除**。

- 语法：

  ```
  ln 参数1 参数2
  ```

  - 无`-s`选项（默认创建硬链接）
  - 参数 1：被链接的**文件**（硬链接不能链接目录）
  - 参数 2：新的硬链接文件名

- 使用案例：

  ```shell
  touch test.txt       # 创建原文件
  echo "test content" > test.txt  # 向原文件写入内容
  ln test.txt test_hard.txt  # 为test.txt创建硬链接test_hard.txt
  ```

- 说明：硬链接与原文件共享同一个 inode，修改其中一个（如`echo "new content" >> test_hard.txt`），另一个也会同步变化；硬链接**不能跨文件系统**（因为不同文件系统的 inode 编号相互独立），且**不能链接目录**（避免目录结构出现循环引用，导致文件系统遍历逻辑混乱）。

### 4.6 时间类命令

#### 4.6.1 日期

- 作用：在命令行中查看系统的时间

- 语法：`date [-d] [+格式化字符串]`

    - `-d`选项：按照给定的字符串显示日期，一般用于日期计算
    - 格式化字符串：通过特定的字符串标记，来控制显示的日期格式
      - %Y：年
      - %y：年份后两位数字 (00~99)
      - %m：月份 (01~12)
      - %d：日 (01~31)
      - %H：小时 (00~23)
      - %M：分钟 (00~59)
      - %S：秒 (00~60)
      - %s：自 1970-01-01 00:00:00 UTC 到现在的秒数（时间戳）


##### 4.6.1.1 显示日期

- 示例1：使用date命令本体，无选项，直接查看时间

![image-20231213222119505](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231213222119505.png)

> **可以看到这个格式非常的不习惯。我们可以通过格式化字符串自定义显示格式**

- 实例2：按照2022-01-01的格式显示日期

  ![image-20221027220514640](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/20221027220514.png)

- 实例3：按照2022-01-01 10:00:00的格式显示日期

  ![image-20221027220525625](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/20221027220525.png)


> **由于中间带有空格，所以使用双引号包围格式化字符串，作为整体。**

##### 4.6.1.2 日期运算

- `-d`选项是用于日期计算，同时可以和格式化字符串配合使用
- 支持的时间标记为：
  - year年
  - month月
  - day天
  - hour小时
  - minute分钟
  - second秒

- 使用示例：

![image-20221027220429831](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/20221027220429.png)


#### 4.6.2 修改Linux时区

- 说明：`Linux`系统默认时区非中国的东八区，修改时区为中国时区

- 命令：

    ```shell
    rm -f /etc/localtime
    sudo ln -s /usr/share/zoneinfo/Asia/Shanghai /etx/localtime
    ```

- 命令解释：
    - 首先将系统自带的localtime文件删除
    - 接着将`/usr/share/zoneinfo/Asia/Shanghai`文件链接为`localtime`文件即可，这一步需要`root`权限

#### 4.6.3 ntp程序

- 功能：自动校准系统时间

- 安装：`yum install -y ntp`

- 启动管理：`systemctl start | stop | restart | status | disable | enable ntpd`

- 启动并设置开机自启：当ntpd启动后会定期的帮助我们联网校准系统的时间

    - `systemctl start ntpd`

    - `systemctl enable ntpd`


- 也可以手动校准（需root权限）：`ntpdate -u ntp.aliyun.com`
    - 通过阿里云提供的服务网址配合ntpdate（安装ntp后会附带这个命令）命令自动校准

![image-20231213222617528](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231213222617528.png)

### 4.7 和网络有关的命令

#### 4.7.1 IP地址

- 概述：每一台联网的电脑都会有一个地址，用于和其它计算机进行通讯，`IP`地址主要有2个版本：`IPV4`版本和`IPV6`版本（V6很少用），`IPv4`版本的地址格式是：`a.b.c.d`，其中`abcd`表示`0~255`的数字，如`192.168.88.101`就是一个标准的`IP`地址

- 特殊IP：

    - `127.0.0.1`：表示本机

    - `0.0.0.0`：特殊IP地址
      - 可以用于指代本机
      - 可以在端口绑定中用来确定绑定关系
      - 在一些IP地址限制中，表示所有IP的意思，如放行规则设置为`0.0.0.0`，表示允许任意IP访问

- **可以通过命令查看IP：`ifconfig`，查看本机的ip地址，如无法使用ifconfig命令，可以安装：`yum -y install net-tools`**

![image-20231213222825437](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231213222825437.png)

> 主网卡：一般Centos的主网卡叫ens33，inet表示ip地址

#### 4.7.2 ifconfig命令

- 作用：用于显示和配置Linux系统的网络接口，比如`IP`地址、子网掩码、`MAC`地址等等；它也可以用于启动或停止某个网络接口。

- **基本用法如下所示：**

  ```shell
  ifconfig [网络接口] [选项]
  ```

- 命令解释：

  - 网络接口可以是网络接口的名称，比如eth0、eth1等等

  - 选项可以是以下任意组合：

    - `up`：启动网络接口

    - `down`：停止网络接口

    - `inet [IP地址]`：设置网络接口的IP地址

    - `netmask [子网掩码]`：设置网络接口的子网掩码

    - `hw [MAC地址]`：设置网络接口的MAC地址


- **案例1：这个示例中，我们首先启动了eth0网络接口，然后设置了其IP地址为192.168.1.10，子网掩码为255.255.255.0，最后设置了其MAC地址为00:11:22:33:44:55。**

  ```shell
  ifconfig eth0 up
  ifconfig eth0 inet 192.168.1.10 netmask 255.255.255.0
  ifconfig eth0 hw ether 00:11:22:33:44:55
  ```

> 在Windows下主机的IP查看命令：ipconfig/all
>
> <img src="https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231207174504821.png" alt="image-20231207174504821" style="zoom:50%;" />

#### 4.7.3 主机名

- 概述：每一台电脑除了对外联络地址（IP地址）以外，也可以有一个名字，称之为主机名，无论是Windows或Linux系统，都可以给系统设置主机名
- 语法：`hostname`
    - 功能：查看Linux系统主机的名称，Windows也适用

- Windows系统主机名：

![image-20231213223237916](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231213223237916.png)

- Linux系统主机名：

![image-20231213223248380](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231213223248380.png)

##### 4.7.3.1 在Linux中修改主机名

**方法1：** 修改Linux主机名：`hostnamectl set-hostname 主机名`（需root权限）

![image-20231213223118802](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231213223118802.png)

**方法2：**

- 设置主机名：`hostname 修改后的主机名`
- 使用`exit`命令退出系统
- 然后重新登陆系统

![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/5f6d4a6e869eb8eb5ebcf1a5843d8121.png)

**方法3：**

- `cd /etc`进入etc文件夹；
- 然后`vi hostname`进入`hostname`文件；
- 在脚本文件里，按`i`键进入编辑模式，将原来的主机名修改为你想要修改的主机名；
- 按下`Esc`键退出编辑模式，输入`:wq`退出并保存；
- reboot 重启服务器即可。

![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/1191ecf7de45e351834d234e56d5fcac.png)

**脚本内容为修改后的主机名如下图：**

![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/6363e1db39fccd91dde89987be747227.png)

> **注：方法2为临时修改，方法3为永久修改**

#### 4.7.4 ping命令

- 作用：测试网络是否联通

- 语法：`ping [-c num] 参数`
    - `-c`选项：检查的次数，不使用该选项，将无限次持续检查
    - 参数：IP或主机名，被检查的服务器的IP地址或者主机名地址
- 示例1：检查到`baidu.com`是否联通(结果表示联通，延迟8ms左右)

![image-20241114143429284](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114143429284.png)

- 示例2：检查到39.156.66.10是否联通，并检查3次

![image-20241114143506515](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114143506515.png)


#### 4.7.5 域名解析

IP地址实在是难以记忆，有没有什么办法可以通过主机名或替代的字符地址去代替数字化的IP地址呢？实际上，我们一直都是通过字符化的地址去访问服务器，很少指定IP地址。比如，我们在浏览器内打开：www.baidu.com，会打开百度的网址，其中，www.baidu.com，是百度的网址，我们称之为：**域名**

> 不是说通过IP地址才能访问服务器吗？为什么域名这一串好记的字符，也可以呢？
>
> 这一切，都是域名解析帮助我们解决的。

- 访问www.baidu.com的域名流程如下：

![image-20231213223442368](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231213223442368.png)

- 总结：

  - 先查看本机的记录（私人地址本）
    - Windows看：C:\Windows\System32\drivers\etc\hosts
    - Linux看：/etc/hosts

  - 前一步如果没有再联网去公开DNS服务器（如114.114.114.114，8.8.8.8等）查找


> **Windows系统下配置主机名映射：** 比如，我们FinalShell/XShell/VSCode是通过IP地址连接到的Linux服务器，那有没有可能通过域名（主机名）连接呢？可以，我们只需要在Windows系统的：`C:\Windows\System32\drivers\etc\hosts`文件中配置记录即可
>
> ![image-20231213223635428](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20231213223635428.png)
>

### 4.8 和进程有关的命令

- 程序运行在操作系统，是被操作系统所管理的，为管理运行的程序，每个程序在运行的时候，便被操作系统注册为系统的一个**进程**，并会为每一个进程都分配一个独有的**进程ID(进程号)**

- Windows系统任务管理器：

![image-20241114193543982](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114193543982.png)

- Linux系统查看进程：

![image-20241114193532273](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114193532273.png)

#### 4.8.1 ps命令

- 功能：查看Linux系统中的进程信息

- 语法：`ps [-e -f]`
    - `-e`选项：显示出全部的进程
    - `-f`选项：以完全格式化的形式展示信息(展示全部信息)
    - 一般来说，固定用法就是：`ps -ef`，列出全部进行的全部信息

- 示例1：

![image-20241114193840991](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114193840991.png)

- 图片解释：**从左到右分别是：**
    - UID：进程所属的用户ID
    - PID：进程的进程号ID
    - PPID：进程的父ID（启动此进程的其它进程）
    - C：此进程的CPU占用率（百分比）
    - STIME：进程的启动时间
    - TTY：启动此进程的终端序号，如显示?，表示非终端启动
    - TIME：进程占用CPU的时间
    - CMD：进程对应的名称或启动路径或启动命令

- `ps`命令可以结合`grep`过滤进程信息：

    - 示例1：在一个在终端执行命令：`tail`，可以看到，此命令一直阻塞在那里；新建一个终端，在终端中找到`tail`命令的进程信息
    - 命令：`ps -ef | grep tail`

    ![image-20241114202905254](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114202905254.png)

- 过滤不仅仅过滤名称，进程号，用户ID等等，都可以被grep过滤

    - 如：`ps -ef | grep 30001`，过滤带有30001关键字的进程信息（一般指代过滤30001进程号）

#### 4.8.2 kill命令

- 在Windows系统中，可以通过任务管理器选择进程后，点击结束进程从而关闭它；而在Linux系统中，可以通过`kill`命令关闭进程
- 语法：`kill [-9] 进程ID`
    - `-9`选项：表示强制关闭进程，不使用此选项会向进程发送信号要求其关闭，但是否关闭要看进程自身的处理机制
- 示例1：

![image-20241114203208971](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114203208971.png)

- 示例2：

![image-20241114203221702](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114203221702.png)

#### 4.8.3 top命令

- 简介：
  - `top`是 Linux 系统中的一个基本的命令行工具，用于实时监视系统的进程、CPU 使用情况、内存占用、负载情况等系统资源，类似于Windows的任务管理器。
  - `top`命令的界面比较简洁，主要以文本形式展示进程列表和系统资源占用情况。
  - `top`命令的操作相对简单，常见的操作如按键切换排序方式、查看不同资源的使用情况、结束进程等。


- 基础语法：直接在命令行输入`top`即可，如下图所示（按Q或Ctrl + C退出)

![命令显示界面](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/a25b259c4453449fa87a57144827da2a.png)

- **top命令内容详解：**

  - 第一行：top：命令名称，14:39:58：当前系统时间，up 6 min：启动了6分钟，2 users：2个用户登录，load：1、5、15分钟负载

  ![image-20250331150947739](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331150947739.png)

  - 第二行：Tasks：175个进程，1 running：1个进程子在运行，174 sleeping：174个进程睡眠，0个停止进程，0个僵尸进程

  ![image-20250331150956723](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331150956723.png)

  - 第三行：%Cpu(s)：CPU使用率，us：用户CPU使用率，sy：系统CPU使用率，ni：高优先级进程占用CPU时间百分比，id：空闲CPU率，wa：IO等待CPU占用率，hi：CPU硬件中断率，si：CPU软件中断率，st：强制等待占用CPU率

  ![image-20250331151024841](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331151024841.png)

  - 第四、五行：
    - Kib Mem：物理内存，total：总量，free：空闲，used：使用，buff/cache：buff和cache占用
    - KibSwap：虚拟内存（交换空间），total：总量，free：空闲，used：使用，buff/cache：buff和cache占用

  ![image-20250331151408716](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331151408716.png)

  - 其它：
    - PID：进程id
    - USER：进程所属用户
    - PR：进程优先级，越小越高
    - NI：负值表示高优先级，正表示低优先级
    - VIRT：进程使用虚拟内存，单位KB
    - RES：进程使用物理内存，单位KB
    - SHR：进程使用共享内存，单位KB
    - S：进程状态（S休眠，R运行，Z僵死状态，N负数优先级，I空闲状态）
    - %CPU：进程占用CPU率
    - %MEM：进程占用内存率
    - TIME+：进程使用CPU时间总计，单位10毫秒
    - COMMAND：进程的命令或名称或程序文件路径

  ![image-20250331151453938](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331151453938.png)

- 可用选项：

![image-20221027221340729](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/20221027221340.png)

- 交互式模式中，可用快捷键：

![image-20221027221354137](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/20221027221354.png)

#### 4.8.4 htop命令

- 简介：
  - `htop`是一个类似于`top`的进程查看工具，提供了更丰富的功能和更友好的用户界面。
  - `htop`命令的界面更加直观，使用彩色标记和条形图等形式展示进程列表、CPU、内存、交换空间、负载等信息。
  - `htop`命令支持更多的交互操作，如使用鼠标点击、快捷键切换排序方式、查看和设置进程优先级、终止进程等。
  - `htop`还提供了一些额外的功能，如在进程列表中搜索、监视指定用户的进程等

- `htop`命令显示的界面主要由以下四个部分组成：
  1. 标题栏（Header Bar）：位于界面的顶部，显示系统的整体状态，包括 CPU 使用率、内存占用、进程数等。
  2. 进程列表（Process List）：位于界面的主要部分，显示当前运行的进程及其相关信息。每行表示一个进程，列显示进程的 ID、用户、CPU 使用率、内存占用、进程状态等信息。
  3. 柱状图区域（Graphs Area）：位于界面的左侧或右侧或顶部（咱们文中的在顶部），以柱状图的形式展示系统资源的使用情况，如 CPU 使用率、内存占用、磁盘读写等。
  4. 快捷键提示栏（Shortcut Keys Bar）：位于界面的底部，显示常用的快捷键操作，帮助用户快速了解和使用`htop`的功能，便于管理控制。

![显示界面概况](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/3fb0b176b4bb465eaa9bccfb2717bddd.png)

> 注意：`htop`的界面可能会因操作系统和版本而略有不同，咱们今天说的都是基于常见的情况，具体细节可能会有所差异哟！

### 4.9 网络传输下载命令

#### 4.9.1 wget命令

- 简介：`wget`命令是非交互式的文件下载器，可以在命令行内下载网络文件

- 语法：`wget [-b] url`

    - `-b`选项：可选，后台下载，会将日志写入到当前工作目录的`wget-log`文件
    - `url`参数：下载链接


- 示例1：下载apache-hadoop 3.3.0版本：`wget http://archive.apache.org/dist/hadoop/common/hadoop-3.3.0/hadoop-3.3.0.tar.gz`

![image-20240113155021681](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20240113155021681.png)

- 示例2：在后台下载：`wget -b http://archive.apache.org/dist/hadoop/common/hadoop-3.3.0/hadoop-3.3.0.tar.gz`
    - 通过tail命令可以监控后台下载进度：`tail -f wget-log`


> 注意：无论下载是否完成，都会生成要下载的文件，如果下载未完成，请及时清理未完成的不可用文件。

#### 4.9.2 curl命令

- 简介：`curl`命令可以发送`http`网络请求，可用于下载文件、获取信息等

- 语法：`curl [-O] url`

    - `-O`选项：用于下载文件，当`url`是下载链接时，可以使用此选项保存文件
    -  `url`参数：要发起请求的网络地址


- 示例1：向cip.cc发起网络请求：`curl cip.cc`

![image-20240113155441006](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20240113155441006.png)

- 示例2：向python.mmzhang.com发起网络请求：`curl python.mmzhang.com`

- 示例3：通过curl下载hadoop-3.3.0安装包：`curl -O http://archive.apache.org/dist/hadoop/common/hadoop-3.3.0/hadoop-3.3.0.tar.gz `

### 4.10 和端口相关的命令

#### 4.10.1 什么是端口

- 端口，是设备与外界通讯交流的出入口。端口可以分为：物理端口和虚拟端口两类
    - 物理端口：又可称之为接口，是可见的端口，如USB接口，RJ45网口，HDMI端口等
    - 虚拟端口：是指计算机内部的端口，是不可见的，是用来操作系统和外部进行交互使用的

![image-20241114235940282](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114235940282.png)

- **端口(虚拟端口)的作用**：计算机程序之间的通讯，通过IP只能锁定计算机，但是无法锁定具体的程序，通过端口可以锁定计算机上具体的程序，确保程序之间进行沟通，IP地址相当于小区地址，在小区内可以有许多住户（程序），而门牌号（端口）就是各个住户（程序）的联系地址

![QQ_1743405824706](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/QQ_1743405824706.png)

- Linux系统是一个超大号小区，可以支持65535个端口，这6万多个端口分为3类进行使用：
  - **公认端口：`1~1023`，通常用于一些系统内置或知名程序的预留使用，如SSH服务的22端口，HTTPS服务的443端口（非特殊需要，不要占用这个范围的端口）**
  - **注册端口：`1024~49151`，通常可以随意使用，用于松散的绑定一些程序\服务~**
  - **动态端口：`49152~65535`，通常不会固定绑定程序，而是当程序对外进行网络链接时，用于临时使用。**

> 如图中，计算机A的微信连接计算机B的微信，A使用的50001即动态端口，临时找一个端口作为出口
>
> 计算机B的微信使用端口5678，即注册端口，长期绑定此端口等待别人连接
>
> **PS**：上述微信的端口仅为演示，具体微信的端口使用非图中示意

#### 4.10.2 nmap命令

- 作用：查看端口占用情况

- 安装：`yum -y install nmap`
- 语法：`nmap 被查看的IP地址`
- 案例演示：可以看到，本机（127.0.0.1）上有5个端口现在被程序占用了，其中22端口，一般是SSH服务使用，即FinalShell远程连接Linux所使用的端口

![image-20250331153317132](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331153317132.png)

#### 4.10.3 netstat命令

- 功能：查看指定端口的占用情况或者说查看TCP 的连接状态。
- 语法：`netstat -anp | grep 端口号`  |  `netstat -napt`
- 安装：`yum -y install net-tools`
- 示例1：可以看到当前系统6000端口被程序（进程号7174）占用了，其中，0.0.0.0:6000，表示端口绑定在0.0.0.0这个IP地址上，表示允许外部访问

![image-20250331153724874](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331153724874.png)

- 示例2：当前系统12345端口，无人使用哦

![image-20250331153822761](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331153822761.png)


### 4.11 磁盘信息监控

#### 4.11.1 df命令

- 作用：列出文件系统的整体磁盘空间使用情况，用于查看磁盘已被使用的空间和剩余空间
- 语法：`df [选项] [文件名]`
- **常用选项**
    - `-h` 或 `--human-readable`：以易读的单位（如 GB、MB、KB）显示磁盘空间。
    - `-a` 或 `--all`：显示所有文件系统，包括虚拟文件系统。
    - `-i` 或 `--inodes`：以 inode 数量显示磁盘使用情况。
    - `-t` 或 `--type=TYPE`：只显示指定类型的文件系统。
    - `-T` 或 `--print-type`：显示文件系统类型。
    - `-x` 或 `--exclude-type=TYPE`：排除指定类型的文件系统。
    - `-B` 或 `--block-size`：指定单位大小（如 1k、1m）。

- **高级选项**

  - `-H` 或 `--si`：与 `-h` 类似，但使用 1000 为单位（如 1k=1000）。

  - `-k`：以 KB 为单位显示磁盘空间。

  - `-m`：以 MB 为单位显示磁盘空间。

  - `-l` 或 `--local`：只显示本地文件系统。

  - `-P` 或 `--portability`：使用 POSIX 格式显示。

  - `--no-sync`：统计前不调用 `sync` 命令（默认）。

  - `-sync`：统计前调用 `sync` 命令。

- **示例 1：查看指定文件或目录的磁盘空间**

    ```bash
    [root@localhost ~]# df /home
    Filesystem     1K-blocks      Used Available Use% Mounted on
    /dev/sdc6      191133580 116360288  64991380  65% /home

    [root@localhost ~]# df /bin/ls
    Filesystem     1K-blocks      Used Available Use% Mounted on
    /dev/sdc5      133460776 116068332  10540144  92% /
    ```

- **示例 2：查看所有文件系统（包括虚拟文件系统）**

  ```shell
  [root@localhost ~]# df -a
  Filesystem       1K-blocks       Used  Available Use% Mounted on
  sysfs                    0          0          0    - /sys
  proc                     0          0          0    - /proc
  udev              65784276          0   65784276   0% /dev
  devpts                   0          0          0    - /dev/pts
  tmpfs             13165072       3164   13161908   1% /run
  /dev/sdc5        133460776  116068332   10540144  92% /
  securityfs               0          0          0    - /sys/kernel/security
  tmpfs             65825344     111040   65714304   1% /dev/shm
  tmpfs                 5120          0       5120   0% /run/lock
  tmpfs             65825344          0   65825344   0% /sys/fs/cgroup
  ```

- **示例 3：指定单位大小**

  ```bash
  [root@localhost ~]# df -B 1k
  Filesystem           1K-blocks      Used Available Use% Mounted on
  /dev/sda2             16036224   2749160  12459316  19% /

  [root@localhost ~]# df --block-size 1m
  Filesystem           1M-blocks      Used Available Use% Mounted on
  /dev/sda2                15661      2685     12168  19% /
  ```

- **示例 4：以易读方式显示**

  ```bash
  [root@localhost ~]# df -h
  Filesystem      Size  Used Avail Use% Mounted on
  udev             63G     0   63G   0% /dev
  tmpfs            13G  3.1M   13G   1% /run
  /dev/sdc5       128G  111G   11G  92% /
  tmpfs            63G  109M   63G   1% /dev/shm
  tmpfs           5.0M     0  5.0M   0% /run/lock
  tmpfs            63G     0   63G   0% /sys/fs/cgroup
  ```

- **示例 5：以 inode 数量显示**

  ```shell
  [root@localhost ~]# df -i
  Filesystem        Inodes    IUsed     IFree IUse% Mounted on
  udev            16446069      793  16445276    1% /dev
  tmpfs           16456336     1583  16454753    1% /run
  /dev/sdc5        8552448   555625   7996823    7% /
  tmpfs           16456336      777  16455559    1% /dev/shm
  tmpfs           16456336        4  16456332    1% /run/lock
  tmpfs           16456336       19  16456317    1% /sys/fs/cgroup
  ```

- **输出结果列说明**

  - **Filesystem**：文件系统对应的分区设备名称。

  - **1K-blocks**：磁盘空间的总容量（单位为 1KB）。

  - **Used**：已使用的磁盘空间。

  - **Available**：剩余的磁盘空间。

  - **Use%**：磁盘使用率（超过 90% 时需注意）。

  - **Mounted on**：磁盘挂载的目录。

- **注意事项**

  - 虚拟文件系统（如 `/proc`）通常不占用物理磁盘空间。

  - 使用 `-h` 或 `-i` 可以快速查看易读的磁盘空间或 inode 使用情况。

#### 4.11.2 iostat命令

- 作用：查看CPU、磁盘的相关信息
- 语法：`iostat [-x] [num1] [num2]`
    - `-x`选项：显示更多信息
    - `num1`：刷新间隔
    - `num2`：刷新几次
- 示例1：

![image-20241114144445997](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114144445997.png)

> tps：该设备每秒的传输次数；"一次传输"意思是"一次I/O请求"；多个逻辑请求可能会被合并为"一次I/O请求"；"一次传输"请求的大小是未知的。

- 示例2：使用`iostat`的`-x`选项，可以显示更多信息

![image-20241114144935668](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114144935668.png)

> - rrqm/s： 每秒这个设备相关的读取请求有多少被Merge了（当系统调用需要读取数据的时候，VFS将请求发到各个FS，如果FS发现不同的读取请求读取的是相同Block的数据，FS会将这个请求合并Merge, 提高IO利用率, 避免重复调用）；
>
> - wrqm/s： 每秒这个设备相关的写入请求有多少被Merge了。
>
> - rsec/s： 每秒读取的扇区数；sectors
>
> - wsec/： 每秒写入的扇区数。
>
> - rKB/s： 每秒发送到设备的读取请求数
>
> - wKB/s： 每秒发送到设备的写入请求数
>
> - avgrq-sz  平均请求扇区的大小
>
> - avgqu-sz  平均请求队列的长度。毫无疑问，队列长度越短越好。
>
> - await：  每一个IO请求的处理的平均时间（单位是微秒毫秒）。
>
> - svctm   表示平均每次设备I/O操作的服务时间（以毫秒为单位）
>
> - %util：  磁盘利用率

### 4.12 网络状态监控

#### 4.12.1 sar命令

- 作用：查看网络的相关统计（sar命令非常复杂，这里仅简单用于统计网络）
- 语法：`sar -n DEV num1 num2`
    - `-n`选项：查看网络
    - `DEV`：表示查看网络接口
    - `num1`：刷新间隔(不填就查看一次结果)
    - `num2`：查看次数(不填无限次数)
- 示例1：查看2次，隔3秒刷新一次，并最终汇总平均记录

![image-20241114150328098](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114150328098.png)

> **信息解读：**
>
> - **IFACE 本地网卡接口的名称**
>
> - **rxpck/s 每秒钟接受的数据包**
>
> - **txpck/s 每秒钟发送的数据包**
>
> - **rxKB/S 每秒钟接受的数据包大小，单位为KB**
>
> - **txKB/S 每秒钟发送的数据包大小，单位为KB**
>
> - **rxcmp/s 每秒钟接受的压缩数据包**
>
> - **txcmp/s 每秒钟发送的压缩包**
>
> - **rxmcst/s 每秒钟接收的多播数据包**

### 4.13 环境变量和命令搜索路径

#### 4.13.1 环境变量简介

- **引入**：在Linux系统中，我们通常使用一些系统命令，比如`cd`、`ls`、`echo`等。这些命令实际上对应于系统中的可执行程序文件。以`cd`为例，其文件路径为`/usr/bin/cd`。但为什么我们不需要每次都输入完整路径`/usr/bin/cd`，无论当前工作目录在哪里，直接输入`cd`就能执行呢？这得益于**环境变量**的帮助。
- **什么是环境变量**：环境变量是操作系统用来存储一些关键信息的变量，帮助系统管理和协调应用程序。环境变量存在于Windows、Linux、Mac等操作系统中，可以存储用户目录、系统路径、当前用户等信息，方便系统在执行任务时快速查找所需资源。

#### 4.13.2 `env`命令——查看系统环境变量

- **作用**：使用`env`命令可以查看系统中的所有环境变量。环境变量通常以键值对的形式存储，即变量名称和对应的值。

- **语法**：直接输入`env`

- **示例**：

    ![image-20241114151116683](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114151116683.png)

- 图片解释：如上图所示，系统中记录了一些环境变量信息，例如：

    - `HOME`：用户的HOME路径，如`/home/mmzhang`

    - `USER`：当前操作用户

    - `PWD`：当前工作目录
    - 这些信息可以帮助系统在运行时从环境变量中获取关键信息。

#### 4.13.3 `PATH`环境变量——命令的搜索路径

- **作用**：`PATH`环境变量指定了系统查找可执行程序的目录路径。当我们输入一个命令时，系统会按照`PATH`中记录的路径顺序查找该命令的可执行文件。例如，`cd`命令的可执行文件位于`/usr/bin/cd`，`PATH`的作用就是让系统自动到这个目录查找并执行该命令。

- **路径结构**：`PATH`中的目录路径之间用冒号 `:` 分隔。执行命令时，系统会从`PATH`中指定的目录开始依次查找，直到找到相应的可执行文件。例如：

    - `/usr/local/bin`
    - `/usr/bin`
    - `/usr/local/sbin`
    - `/home/mmzhang/bin`

- **自定义`PATH`**：我们可以将自定义路径加入`PATH`中，使系统在查找命令时包含我们指定的目录路径。方法如下：

    ```bash
    export PATH=$PATH:<自定义路径>
    ```

- **示例**：

![image-20241114151723841](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114151723841.png)

- 图片解释：上图展示了系统中包含的几个路径。当我们执行一个命令时，系统会按顺序从这些路径中查找相应的程序文件。比如`cd`命令的可执行文件位于`/usr/bin`目录。

- **提示**：将自定义路径加入`PATH`后，便可以在任意工作目录中执行位于该路径的命令。

#### 4.13.4 使用 `$` 符号读取环境变量的值

- **说明**：在Linux系统中，`$`符号用于读取环境变量的值。环境变量中的信息不仅供系统使用，也可以通过`$变量名`语法进行访问。
- **用法**：
    - 使用`$变量名`直接读取变量值
    - 若变量名与其他内容相连，为防混淆可使用`${变量名}`格式
- 示例1：输出PATH环境变量的值：`echo $PATH`

![image-20241114153030728](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114153030728.png)

- 示例2：输出PATH环境变量的值以及ABC：`echo ${PATH}ABC`

![image-20241114153137993](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20241114153137993.png)

#### 4.13.5 自定义环境变量`PATH`

- **添加自定义路径**：系统默认的`PATH`中包含常用的系统目录，但用户可以根据需要将自定义路径添加到`PATH`中，便于在任意目录执行自定义命令。

    - **临时添加**：使用`export`命令可以临时修改`PATH`，修改在当前终端有效。格式为：

        ```bash
        export PATH=$PATH:<新路径>
        ```

    - **永久添加**：若希望修改在重启后依然有效，可以将`PATH`的设置添加到系统配置文件中：

        - **当前用户**：修改`~/.bashrc`或`~/.bash_profile`

        - **所有用户**：修改`/etc/profile`

        - 添加后使用`source`命令使配置文件生效：

            ```bash
            source <配置文件路径>
            ```

- **示例**：

    - 创建自定义命令文件：

        1. 在主目录中创建一个文件夹`myenv`。
        2. 在`myenv`文件夹中创建文件`mkhaha`，内容为`echo 哈哈哈哈哈`。
        3. 尝试在不同目录执行`mkhaha`命令，发现系统无法找到此命令。

    - **临时添加路径**：使用以下命令将`myenv`目录添加到`PATH`中，现在无论当前目录为何，都可以直接执行`mkhaha`命令

        ```bash
        export PATH=$PATH:/home/mmzhang/myenv
        ```

    - **永久添加路径**：在`~/.bashrc`中加入以下内容，修改完成，运行`source ~/.bashrc`使其生效。这样，即使重启系统，`mkhaha`命令也可以在任意目录执行

        ```bash
        export PATH=$PATH:/home/mmzhang/myenv
        ```

### 4.14 压缩解压类指令

#### 4.14.1 压缩格式

- 市面上有非常多的压缩格式
    - zip格式：Linux、Windows、MacOS，常用
    - 7zip：Windows系统常用
    - rar：Windows系统常用
    - tar：Linux、MacOS常用
    - gzip：Linux、MacOS常用

Linux 中常用命令行工具完成归档与压缩，两者的作用需要分别理解。
- 主要针对的是`tar`、`gzip`、`zip`这三种压缩格式

#### 4.14.2 tar

- `tar`命令可以对以下两种格式进行解压缩：
    - `.tar`：称之为归档文件(`tarball`)，即简单的将文件组装到一个`.tar`的文件内，并没有太多文件体积的减少，仅仅是简单的封装
    - `.gz`：也常见为`.tar.gz`，是`gzip`格式的压缩文件，即使用`gzip`压缩算法将文件压缩到一个文件内，可以极大的减少压缩后的体积

- 语法：

    ```shell
    tar [-c -v -x -f -z -C] 参数1 参数2 ... 参数N
    ```

- 常见参数选项说明：
    - `-c`：创建压缩文件，用于压缩模式
    - `-v`：显示压缩、解压过程，用于查看进度
    - `-x`：解压模式
    - **`-f`：要创建的文件，或要解压的文件**
        - **该选项必须在所有选项中位置处于最后一个**
    - **`-z`：`gzip`模式，不使用该参数就是普通的`.tar`格式**
        - **如果使用的话一般处于选项位第一个**
    - `-C`：指定解压的目的地，用于解压模式，不写默认解压到当前目录
        - 该选项单独使用，和解压其它参数分开

- 以下列出 `tar` 的常用选项，更多用法可通过 `man tar` 查询。

##### 4.14.2.1 压缩

**语法：**

```shell
tar -zcvf 压缩包 被压缩文件1 被压缩文件2 ... 被压缩文件N
```

**说明：**

- `-z`：如果使用该选项的话，一般处于选项位第一个
    - 如果压缩指定的压缩文件名为`.tar.gz`，该参数可以省略
- `-f`：如果使用该选项，必须在选项位最后一个

**常用压缩组合为：**

```bash
# 将1.txt 2.txt 3.txt 压缩到test.tar文件内
tar -cvf test.tar 1.txt 2.txt 3.txt
# 将1.txt 2.txt 3.txt 压缩到test.tar.gz文件内，使用gzip模式
tar -zcvf test.tar.gz 1.txt 2.txt 3.txt
tar -cvf test.tar.gz 1.txt 2.txt 3.txt
```


##### 4.14.2.2 解压

**语法：**

```shell
tar -zxvf 被解压的文件 -C 要解压去的地方
```

**说明：**

- `-z`：表示使用`gzip`模式，可以省略
- `-C`：指定要解压去的地方，可以省略，不写则默认解压到当前目录

**常用解压组合有：**

```bash
# 解压test.tar，将文件解压至当前目录
tar -xvf test.tar

# 解压test.tar，将文件解压至指定目录（/home/mmzhang）
tar -xvf test.tar -C /home/mmzhang

# 以gzip模式解压test.tar.gz，将文件解压至指定目录（/home/mmzhang）
tar -zxvf test.tar.gz -C /home/mmzhang
```

#### 4.14.3 zip

- `.zip`格式的压缩与解压命令比较简单

##### 4.14.3.1 压缩

**语法：**

```shell
zip [-r] 参数1 参数2 ... 参数N
```

**说明：**

- `-r`：如果被压缩的包含文件夹的时候，需要使用`-r`选项，和`rm`、`cp`等命令的`-r`效果一致
    - 建议：不管压缩什么文件还是文件夹都带上该参数，直接一步到位，省得漏掉

**示例：**

```bash
# 将a.txt b.txt c.txt 压缩到test.zip文件内
zip test.zip a.txt b.txt c.txt

# 将test、mmzhang两个文件夹和a.txt文件，压缩到test.zip文件内
zip -r test.zip test mmzhang a.txt
```

**详细语法：**

```shell
zip [options] 目标压缩包名称 待压缩源文件
```

**参数详解：**

```shell
-v 显示操作详细信息

-d 从压缩包里删除文件
-m 将文件剪切到压缩包里，源文件将被删除
-r 递归压缩

-x 排除文件

-c 加一行备注
-z 加备注

-T 测试压缩包完整性
-e 加密

-q 安静模式

-1, --fast 更快的压缩速度
-9, --best 更好的压缩率

--help 查看帮助
-h2 查看更多帮助
```

##### 4.14.3.2 解压

语法：

```shell
unzip [-d] 参数
```

**说明：**

- `-d`：指定要解压去的位置，同`tar`的`-C`选项
- 参数：被解压的`zip`压缩包文件

**示例：**

```bash
# 将test.zip解压到当前目录
unzip test.zip

# 将test.zip解压到指定文件夹内（/home/mmzhang）
unzip test.zip -d /home/mmzhang
```

**详细语法：**

```shell
unzip [-Z] [options] 待压缩源文件 [list] [-x xlist] [-d exdir]
```

**参数详解：**

```shell
-v 显示操作详细信息

-l 查看压缩包内容
-d 解压到指定文件夹。exdir 是目标目录的路径
-x 排除压缩包内文件
list 一个可选参数，指定要从 ZIP 文件中解压的文件列表。如果省略，默认解压 ZIP 文件中的所有文件
-x xlist 指定不解压缩的文件列表。xlist是要排除的文件名或模式列表

-t 测试压缩包文件内容
-z 查看备注

-o 覆盖文件无需提示
-n 不覆盖现有文件
-q 安静模式

--help 查看帮助
```

#### 4.14.4 总结

- `tar` 和 `zip` 的常用操作可按创建归档、查看归档和解包三个目的来记忆。
- 大家只需要记住一些最常用的命令即可，甚至不需要记，只需要有印象，然后使用`man`命令来查看使用帮助即可

## 5.用户和权限

### 5.1 用户

#### 5.1.1 root用户(超级管理员)

- 无论是Windows、MacOS、Linux均采用多用户的管理模式进行权限管理。在Linux系统中，拥有最大权限的账户名为：root（超级管理员）

![image-20250331112312104](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331112312104.png)

- `root`用户拥有最大的系统操作权限，而普通用户在许多地方的权限是受限的。
- 演示1：使用普通用户在根目录下创建文件夹

![image-20250331112433002](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331112433002.png)

- 演示2：切换到root用户后，继续尝试

![image-20250331112452995](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331112452995.png)

- 注意事项：
  - 普通用户的权限，一般在其HOME目录内是不受限的
  - 一旦出了HOME目录，大多数地方，普通用户仅有只读和执行权限，无修改权限

#### 5.1.2 su命令

- 作用：用于账户切换的系统命令，其来源英文单词：Switch User

- 语法：`su [-] [用户]`
- 解释说明：
  - 可选项：`-`是可选的，表示是否在切换用户后加载环境变量，建议带上
  - 参数：用户名，表示要切换的用户，用户名也可以省略，省略表示切换到`root`
  - 切换用户后，可以通过exit命令退回上一个用户，也可以使用快捷键：Ctrl + D
  - 使用普通用户，切换到其它用户需要输入密码，如切换到root用户
  - 使用root用户切换到其它用户，无需密码，可以直接切换

#### 5.1.3 sudo命令

- **在我们得知root密码的时候，可以通过su命令切换到root得到最大权限，但是我们不建议长期使用root用户，避免带来系统损坏。我们可以使用sudo命令，为普通的命令授权，临时以root身份执行。**
- 语法：`sudo 其它命令`
- 解释：
  - 在其它命令之前，带上sudo，即可为这一条命令临时赋予root授权
  - 但是并不是所有的用户，都有权利使用sudo，我们需要为普通用户配置sudo认证

> 为普通用户`mmzhang`配置sudo认证：
>
> - 切换到root用户，执行visudo命令，会自动通过vi编辑器打开：/etc/sudoers
>
> - 在文件的最后添加：
>
>   ```vim
>   mmzhang ALL=(ALL)       NOPASSWD: ALL
>   ```
>
> - 其中最后的NOPASSWD:ALL 表示使用sudo命令，无需输入密码
>
> - 最后通过 wq 保存
>
> - 切换回普通用户
>
> ![image-20250331113502539](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331113502539.png)
>
> - 执行的命令，均以root运行


### 5.2 用户与用户组管理

#### 5.2.1 用户与用户组

- Linux系统中可以：
  - 配置多个用户
  - 配置多个用户组
  - 用户可以加入多个用户组中

![image-20250331115049270](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331115049270.png)

- Linux中关于权限的管控级别有2个级别，分别是：
  - 针对用户的权限控制
  - 针对用户组的权限控制

> 比如，针对某文件，可以控制用户的权限，也可以控制用户组的权限；所以，我们需要了解在Linux中进行用户、用户组管理的基础命令，为后面学习权限控制打下基础。

#### 5.2.2 用户组管理

以下命令需root用户执行

- 创建用户组：`groupadd 用户组名`
- 删除用户组：`groupdel 用户组名`

> 为后续演示，我们创建一个`itcast`用户组：`groupadd itcast`

#### 5.2.3 用户管理

以下命令需root用户执行

- 创建用户：`useradd [-g -d] 用户名`
  - 选项：`-g`指定用户的组，不指定`-g`，会创建同名组并自动加入，指定`-g`需要组已经存在，如已存在同名组，必须使用`-g`
  - 选项：`-d`指定用户`HOME`路径，不指定，`HOME`目录默认在：`/home/用户名`

- 删除用户：`userdel [-r] 用户名`
  - 选项：`-r`，删除用户的HOME目录，不使用`-r`，删除用户时，HOME目录保留

- 查看用户所属组：`id [用户名]`
  - 参数：用户名，被查看的用户，如果不提供则查看自身

- 修改用户所属组：`usermod -aG 用户组 用户名`
  - 作用：将指定用户加入指定用户组

#### 5.2.4 getent命令

- 作用：可以查看当前系统中有哪些用户或者用户则
- 查看系统所有用户语法： `getent passwd`

![QQ_1743393590599](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/QQ_1743393590599.png)

> 共有7份信息，分别是：`用户名:密码(x):用户ID:组ID:描述信息(无用):HOME目录:执行终端(默认bash)`

- 查看系统所有用户组语法：`getent group`

![QQ_1743393565776](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/QQ_1743393565776.png)

### 5.3 权限管理

#### 5.3.1 查看权限控制

- 通过`ls -l`可以以列表形式查看内容，并显示权限细节

![image-20250331120229643](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331120229643.png)

- 解释：
  - 序号1，表示文件、文件夹的权限控制信息
  - 序号2，表示文件、文件夹所属用户
  - 序号3，表示文件、文件夹所属用户组

- 权限控制信息解析：权限细节总共分为10个槽位

![image-20250331120403094](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/javaweb/image-20250331120403094.png)

- 举例：drwxr-xr-x，表示：
  - 这是一个文件夹，首字母d表示
  - 所属用户的权限是：有r有w有x，rwx
  - 所属用户组的权限是：有r无w有x，r-x （-表示无此权限）
  - 其它用户的权限是：有r无w有x，r-x

- **rwx**表示什么：
  - r表示读权限
  - w表示写权限
  - x表示执行权限
- **针对文件、文件夹的不同，rwx的含义有细微差别**
  - r
    - 针对文件可以查看文件内容
    - 针对文件夹，可以查看文件夹内容，如ls命令
  - w
    - 针对文件表示可以修改此文件
    - 针对文件夹，可以在文件夹内：创建、删除、改名等操作
  - x
    - 针对文件表示可以将文件作为程序执行
    - 针对文件夹，表示可以更改工作目录到此文件夹，即cd进入

#### 5.3.2 修改控制权限-chmod命令

- 作用：修改文件、文件夹的权限信息

- 注意：只有文件、文件夹的所属用户或`root`用户可以修改

- **语法：`chmod [-R] 权限 参数`**

  - **权限：要设置的权限，u表示user所属用户权限，g表示group组权限，o表示other其它用户权限**

  - **参数：被修改的文件、文件夹**


  - **选项`-R`：设置文件夹和其内部全部内容一样生效**

- 案例演示1：将文件权限修改为rwxr-x--x`

  ```shell
  chmod u=rwx,g=rx,o=x hello.txt
  ```

- 案例演示2：将文件夹test以及文件夹内全部内容权限设置为`rwxr-x--x`

  ```shell
  chmod -R u=rwx,g=rx,o=x test
  ```

- **权限的数字序号：权限可以用3位数字来代表，第一位数字表示用户权限，第二位表示用户组权限，第三位表示其它用户权限，数字的细节如下：r记为4，w记为2，x记为1，可以有：**
  - **0：无任何权限，      即 ---**
  - **1：仅有x权限，       即 --x**
  - **2：仅有w权限	  即 -w-**
  - **3：有w和x权限	即 -wx**
  - **4：仅有r权限	   即 r--**
  - **5：有r和x权限	 即 r-x**
  - **6：有r和w权限	即 rw-**
  - **7：有全部权限	即 rwx**

- 案例演示3：

  ```shell
  # 将hello.txt的权限修改为：r-x--xr-x
  chmod 515 hello.txt
  # 将hello.txt的权限修改为：-wx-w-rw-
  chmod 326 hello.txt
  ```

- 根据实际访问需求分配权限。例如，私人文本文件可以只允许属主读写；不要因为文件属于自己就开放所有人的写权限。

  ```shell
  chmod 600 hello.txt
  ```

#### 5.3.3 修改权限控制-chown命令

- 作用：修改文件、文件夹的所属用户和用户组
- 注意：普通用户无法修改所属为其它用户或组，所以此命令只适用于root用户执行
- 语法：`chown [-R] [用户][:][用户组] 文件或文件夹`
  - `-R`：同chmod，对文件夹内全部内容应用相同规则
  - 用户：修改所属用户
  - 用户组：修改所属用户组
  - `:`：用于分隔用户和用户组

- 示例：
  - `chown root hello.txt`：将hello.txt所属用户修改为root
  - `chown :root hello.txt`：将hello.txt所属用户组修改为root
  - `chown root:itheima hello.txt`：将hello.txt所属用户修改为root，用户组修改为itheima
  - `chown -R root test`：将文件夹test的所属用户修改为root并对文件夹内全部内容应用同样规则

## 6. bash 与脚本执行方式

| 写法 | 执行环境 | 对当前 Shell 的影响 |
| --- | --- | --- |
| `bash file.sh` | 启动 Bash 执行脚本 | 脚本中的 `cd`、普通变量修改不会直接改变父 Shell |
| `sh file.sh` | 使用本机 `sh` 指向的解释器 | 不应假定支持 Bash 数组等扩展 |
| `./file.sh` | 按首行 shebang 指定的解释器运行 | 文件需要执行权限 |
| `source file.sh` 或 `. file.sh` | 在当前 Shell 中读取执行 | 可以改变当前目录、变量与函数 |

`source` 常用于加载环境配置，不是与 `bash` 完全相同的另一种启动方式。更完整的变量、条件和循环用法见 [Shell 编程](./Shell编程.md)。

## 7. 文本检索综合练习

### 7.1 创建独立的练习数据

以下数据用于练习命令组合。在 Bash 中执行，使用临时目录，不覆盖已有文件：

```bash
practice_dir=$(mktemp -d)
cd "$practice_dir" || exit
mkdir logs
cat > logs/app.log <<'EOF'
2025-01-15T10:14:59 INFO trace=t01 service started
2025-01-15T10:15:01 INFO trace=t02 request started
2025-01-15T10:15:02 ERROR trace=t02 code=TIMEOUT read timeout
2025-01-15T10:15:03 INFO trace=t02 request finished
2025-01-15T10:20:01 WARN trace=t03 code=RETRY retry scheduled
2025-01-15T10:20:02 ERROR trace=t03 code=TIMEOUT read timeout
2025-01-15T10:21:00 INFO trace=t04 healthcheck ok
2025-01-15T10:25:59 ERROR trace=t05 code=REFUSED connection refused
2025-01-15T10:26:00 ERROR trace=t06 code=TIMEOUT write timeout
EOF
```

`<<'EOF'` 是 here-document：把两行 `EOF` 之间的内容作为 `cat` 的输入；引号使正文中的变量和命令替换不被展开。结束标记必须单独占一行。`>` 将示例内容写到刚创建的练习目录里。

### 7.2 先确定文件，再确定范围

```bash
pwd
ls -lh logs
head -n 3 logs/app.log
tail -n 3 logs/app.log
```

这四步分别确认当前位置、目标文件、行首格式和文件末尾。真实文本可能用不同日期格式、时区或字段名称；先观察格式，再编写匹配条件。

### 7.3 从自然语言推导命令

目标：“查找 10:15 到 10:25 分钟内的错误，带原始行号，只预览前 10 条。”

先查时间，再筛选级别，最后限制输出：

```bash
grep -nE '2025-01-15[T ]10:(1[5-9]|2[0-5]):' logs/app.log \
  | grep -F ' ERROR ' \
  | head -n 10
```

预期结果是第 `3`、`6`、`8` 行。第 `9` 行虽然是 ERROR，但时间为 10:26，因此不在范围内。这里给 `ERROR` 两侧加空格，是依据示例的字段格式，避免命中其他字段里的同名子串。

初学时不要一次写出整条长命令。每加一个条件，就执行一次，检查输出是否符合预期；这样出错时能知道是哪一步改变了结果。

### 7.4 从匹配行回到完整上下文

```bash
grep -n -C 1 -F 'code=REFUSED' logs/app.log
grep -nF 'trace=t02 ' logs/app.log
```

第一条显示错误前后各一行；第二条返回第 `2`、`3`、`4` 行，串起同一个标识对应的记录。邻近行不一定属于同一次请求，因为多个请求可能交错写入；稳定的关联字段更适合追踪过程。

想看固定行号范围，可以使用 `sed`：

```bash
sed -n '2,4p' logs/app.log
```

这里 `-n` 关闭默认输出，`2,4` 是行号范围，`p` 表示打印。这条命令只读取文件，没有使用会原地修改文件的 `-i`。

### 7.5 从查找扩展到统计

```bash
grep -cF ' ERROR ' logs/app.log
# 预期：4

grep -F ' ERROR ' logs/app.log \
  | grep -oE 'code=[A-Z_]+' \
  | sort \
  | uniq -c \
  | sort -nr
```

预期统计结果（前导空格可能不同）：

```text
3 code=TIMEOUT
1 code=REFUSED
```

| 阶段 | 为什么需要 |
| --- | --- |
| 第一个 `grep` | 限定只统计错误行 |
| `grep -oE` | 只提取错误码字段，去掉每行各不相同的时间等内容 |
| `sort` | 将相同错误码排到一起 |
| `uniq -c` | 合并相邻的相同行，并输出每组出现次数 |
| `sort -nr` | 将次数按数值从大到小排序 |

`uniq` 只合并**相邻**的相同行，不能省掉前面的排序。`sort -n` 按数值排序，`-r` 反转顺序；普通字典顺序并不等于数值顺序。

### 7.6 压缩文件、轮转文件与当前文件

按小时或日期拆分的文件、带 `.1` 后缀的旧文件、`.gz` 压缩文件、指向当前文件的链接，处理方式各不相同。文件名只是线索，应结合 `ls -l` 与实际内容判断。

```bash
# 以下文件名为示意，实际使用时替换为存在的目标文件
grep -HnF 'ERROR' app.log.2025011510 app.log.2025011511
zgrep -nF 'ERROR' app.log.20250114.gz
```

`zgrep` 可以检索 gzip 压缩后的文本；普通 `grep -r` 不会自动解压 `.gz`。`zgrep` 的选项支持依赖本机实现，可先看 `zgrep --help` 或 `man zgrep`。

不要同时将一个“当前文件链接”和它指向的归档文件纳入统计，否则可能重复。也不要将所有 `.log`、`.wf`、`.gz` 都当成互斥的数据集；具体写入级别及内容是否重复，要查看应用的日志配置。

### 7.7 自己写命令时的检查顺序

1. **对象**：在哪个目录，目标文件是否存在，是否为链接或压缩文件？
2. **格式**：时间、级别和关联字段怎么写，大小写是否一致？
3. **条件**：查固定文本用 `-F`，查组合模式用 `-E`，需要“且”就逐步过滤。
4. **呈现**：是否加文件名 `-H`、行号 `-n`、上下文 `-C` 或分页 `less`？
5. **规模**：先限定文件与时间，预览用 `head`；统计前确认没有截断和重复。
6. **结果**：没找到还是读取失败，统计的是行数、出现次数还是独立事件数？

### 7.8 常用命令速查

| 需求 | 命令 |
| --- | --- |
| 看当前位置 | `pwd` |
| 看大小及最近修改的文件 | `ls -lht logs` |
| 搜索固定文本并显示行号 | `grep -nF 'keyword' app.log` |
| 查目录及子目录 | `grep -rnF 'keyword' logs` |
| 看前后各 5 行 | `grep -nC 5 -F 'keyword' app.log` |
| 看开头 / 末尾 20 行 | `head -n 20 app.log` / `tail -n 20 app.log` |
| 持续跟踪可轮转路径 | `tail -n 50 -F app.log` |
| 分页阅读 | `less -N app.log` |
| 看指定行段 | `sed -n '100,140p' app.log` |
| 统计匹配行 | `grep -cF 'keyword' app.log` |
| 保存匹配结果 | `grep -nF 'keyword' app.log > matches.txt` |
| 查 gzip 压缩文本 | `zgrep -nF 'keyword' app.log.gz` |

## 总结

`ls` 负责查看文件信息，`head`、`tail` 和 `less` 负责浏览正文，`grep` 负责选行，管道负责连接数据流，重定向负责改变输入输出位置。理解这些边界后，就可以按目标逐步组合命令，而不必背诵长串固定模板。

先在小数据上验证，再扩大到实际文件；先预览格式与结果，再执行统计或保存。这比一次堆叠很多参数更容易写对，也更容易发现遗漏。

## 参考资料

- [GNU grep 手册](https://www.gnu.org/software/grep/manual/grep.html)
- [GNU coreutils 手册：ls、head、tail、wc、sort 等](https://www.gnu.org/software/coreutils/manual/coreutils.html)
- [Bash 手册：管道](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)
- [Bash 手册：重定向](https://www.gnu.org/software/bash/manual/html_node/Redirections.html)
- [curl 命令详解](./Linux命令详解之-curl命令.md)

原有延伸阅读：

- <https://blog.csdn.net/weixin_44191814/article/details/120091363>
- <https://www.cnblogs.com/52fhy/p/5721465.html>
- [鸟哥Linux命令大全](https://man.niaoge.com/tar)
- <https://blog.csdn.net/Abysscarry/article/details/79700293>
- <https://blog.csdn.net/acsdds/article/details/107480835>
