---
title: MySQL 基础、索引与事务
shortTitle: MySQL
order: 1
icon: table-columns
category:
  - 数据库
tag:
  - MySQL
  - 表设计
  - 索引
  - 事务
  - 锁
  - 性能优化
---

# MySQL：安装、连接与基础 SQL 命令

## 前言

MySQL 是关系型数据库管理系统。它用数据库、表、行、列组织数据，通过 SQL 完成建表、查询、修改和事务控制。对于 Go 服务而言，MySQL 常用于保存用户、文章、订单等需要持久化和关系约束的业务数据。

本文聚焦本地开发需要的基础能力：启动服务、使用 `mysql` 客户端连接、创建数据库和表、执行增删改查、使用索引和事务、导入导出数据。复杂的索引设计、锁机制、执行计划和性能优化会在后续文章中继续展开。

## 先学会读 SQL 语法

后文的“语法”不是可以原样复制的命令，而是用来说明命令组成的模板。先读懂模板中的记号，才能把一段业务需求稳定地翻译成 SQL。

| 写法 | 含义 | 书写时怎么处理 |
| --- | --- | --- |
| `SELECT`、`FROM`、`WHERE` | SQL 关键字 | 必须写；通常不区分大小写，教程统一用大写突出结构 |
| `table_name`、`column_name`、`value` | 占位符 | 替换成真实的表名、列名和值，不能照抄 |
| `[ ... ]` | 可选部分 | 方括号本身不写；只有需要该能力时才写其中内容 |
| `a \| b` | 二选一 | 从两种写法中选择一种，竖线本身不写 |
| `...` | 可重复部分 | 前面的元素可以继续重复，例如多个列名 |
| `;` | 一条 SQL 的结束符 | 在客户端中建议保留，方便区分多条语句 |

例如 `SELECT [DISTINCT] column_name FROM table_name;` 中，`SELECT` 与 `FROM` 是固定关键字；`DISTINCT` 可选；`column_name` 和 `table_name` 必须换成真实名称。因此查询文章标题应写成 `SELECT title FROM posts;`，而不是把 `column_name` 原样发送给数据库。

## 一、确认安装与服务状态

~~~bash
mysql --version
brew services list | rg mysql
~~~

Homebrew 安装的 MySQL 8.4 服务通常可以这样管理：

~~~bash
brew services start mysql@8.4
brew services stop mysql@8.4
brew services restart mysql@8.4
~~~

默认 TCP 地址通常是 `127.0.0.1:3306`。若连接失败，可先确认服务状态和端口：

~~~bash
brew services list
lsof -nP -iTCP:3306 -sTCP:LISTEN
~~~

## 二、连接 MySQL 客户端

### 1. 本机连接

~~~bash
mysql -u root
~~~

指定主机和端口：

~~~bash
mysql -h 127.0.0.1 -P 3306 -u root -p
~~~

`-p` 会提示输入密码，密码不会直接出现在终端命令历史中。连接指定数据库：

~~~bash
mysql -h 127.0.0.1 -P 3306 -u app_user -p blog_demo
~~~

登录后可使用以下命令确认当前会话：

~~~sql
SELECT VERSION();
SELECT USER(), CURRENT_USER();
SELECT DATABASE();
SHOW VARIABLES LIKE 'port';
~~~

使用 `exit`、`quit` 或 `\q` 退出客户端。

### 2. 初始化本地 root 账户

新安装的本地开发环境可能允许 root 使用 Unix socket 或空密码连接。无论当前方式是什么，生产环境都不应使用空密码 root。可以运行：

~~~bash
mysql_secure_installation
~~~

该工具会引导设置 root 认证、移除匿名账户和测试数据库等安全项。应用程序不应直接使用 root，而应使用权限受限的独立账户。

## 三、数据库与账户

### 1. 创建和选择数据库

先认识这一组 DDL 语法：

~~~sql
CREATE DATABASE [IF NOT EXISTS] database_name
  [DEFAULT CHARACTER SET charset_name]
  [DEFAULT COLLATE collation_name];

USE database_name;
DROP DATABASE [IF EXISTS] database_name;
~~~

逐段阅读这段语法：

- `database_name` 是新数据库的名称，例如 `blog_demo`；名称是标识符，不应写成字符串字面量 `'blog_demo'`。
- `IF NOT EXISTS` 是可选保护项：数据库已存在时不抛出“已存在”错误。它不会校验已有数据库的字符集是否与本次声明一致。
- `DEFAULT CHARACTER SET charset_name` 指定默认字符集；`DEFAULT COLLATE collation_name` 指定默认排序和比较规则。两项都省略时，MySQL 继承服务器或上层配置。
- `USE database_name` 只影响当前连接。之后未写数据库前缀的 `posts` 会被解析为该数据库中的 `posts`；新的客户端连接仍需再次选择数据库或在连接命令中指定。
- `DROP DATABASE` 的 `IF EXISTS` 与创建时的保护项类似，但命令本身仍会删除整个目标数据库及其中全部表。

再执行本地示例：

~~~sql
SHOW DATABASES;

CREATE DATABASE blog_demo
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE blog_demo;
SELECT DATABASE();
DROP DATABASE IF EXISTS scratch_demo;
~~~

`utf8mb4` 能完整保存 Unicode 字符，包括 emoji；新项目通常应明确指定它，而不是依赖服务器默认字符集。

### 2. 创建应用账户并授权

账户、权限命令的常用语法如下：

~~~sql
CREATE USER 'user_name'@'host' IDENTIFIED BY 'password';
GRANT privilege_list ON database_name.table_name TO 'user_name'@'host';
SHOW GRANTS FOR 'user_name'@'host';
~~~

逐段阅读这段语法：

- `'user_name'@'host'` 是一个完整账户标识。前半段是用户名，后半段是允许以何种主机来源连接；两部分均为字符串，因此要带单引号。
- `IDENTIFIED BY 'password'` 设置密码。密码是值而不是标识符，必须是单引号字符串；真实项目不应把密码直接写进版本库。
- `privilege_list` 是逗号分隔的权限集合，例如 `SELECT, INSERT, UPDATE`。`ALL PRIVILEGES` 虽方便，但会扩大权限范围，不适合作为应用账户的默认选择。
- `database_name.table_name` 定义授权对象：`blog_demo.posts` 只是一张表，`blog_demo.*` 表示该数据库的全部表，`*.*` 则是所有数据库。点号两侧是标识符，不加引号。
- `TO` 后的账户必须和 `CREATE USER` 时的账户完全一致。`SHOW GRANTS FOR` 用于读取最终生效的授权，而不是重新授权。

示例创建只服务于 `blog_demo` 的应用账户：

~~~sql
CREATE USER 'blog'@'127.0.0.1' IDENTIFIED BY 'change-this-local-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX
  ON blog_demo.* TO 'blog'@'127.0.0.1';
FLUSH PRIVILEGES;

SHOW GRANTS FOR 'blog'@'127.0.0.1';
~~~

`'blog'@'127.0.0.1'` 与 `'blog'@'localhost'` 是不同账户匹配规则。应用通过 TCP 连接时通常使用前者；本机 socket 连接常匹配后者。开发时可根据实际连接方式创建相应账户。

## 四、建表与表结构查看

`CREATE TABLE` 的最小语法为：

~~~sql
CREATE TABLE [IF NOT EXISTS] table_name (
  column_name data_type [column_constraint ...],
  ...,
  [table_constraint ...]
) [table_option ...];
~~~

这段定义从左向右读取。每一个 `column_name data_type ...` 是一列：先写列名，再写数据类型，最后按需要追加约束。比如 `title VARCHAR(200) NOT NULL` 表示名为 `title` 的列最多保存 200 个字符，且插入时不能为 `NULL`。逗号分隔各列或表级约束，最后一项后面不能再写逗号。

`PRIMARY KEY`、`UNIQUE`、`NOT NULL`、`DEFAULT` 分别表示主键唯一、值唯一、不可为空和缺省值。它们既可以写在列定义末尾，也可以作为独立的表级约束；`INDEX index_name (column_name)` 是表级普通索引定义。`ENGINE=InnoDB` 与 `DEFAULT CHARSET=utf8mb4` 位于右括号后，是整张表的存储引擎和默认字符集选项。

下面再创建一个最小文章表：

~~~sql
USE blog_demo;

CREATE TABLE posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  user_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_posts_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
~~~

查看结构：

~~~sql
SHOW TABLES;
DESCRIBE posts;
SHOW CREATE TABLE posts;
SHOW INDEX FROM posts;
~~~

常用字段选择：

| 需求 | 常用类型 |
| --- | --- |
| 自增主键 | `BIGINT AUTO_INCREMENT` |
| 短文本 | `VARCHAR(n)` |
| 长文本 | `TEXT` |
| 金额 | `DECIMAL(p, s)`，不要使用浮点数 |
| 时间 | `DATETIME` 或 `TIMESTAMP` |
| 布尔标记 | `TINYINT(1)` |

## 五、CRUD：先掌握语法，再执行示例

### 1. `INSERT`：先写列，再写值

单行与多行插入的通用语法：

~~~sql
INSERT INTO table_name (column_1, column_2, ...)
VALUES (value_1, value_2, ...);

INSERT INTO table_name (column_1, column_2, ...)
VALUES
  (value_1, value_2, ...),
  (value_1, value_2, ...);
~~~

从左到右读：`INSERT INTO` 表示写入；`table_name` 是目标表；括号中的 `column_1, column_2` 是本次要赋值的目标列；`VALUES` 后每对括号是一行数据；其中第 n 个值只会赋给第 n 个列。

例如 `INSERT INTO posts (title, user_id) VALUES ('Go', 1001);` 中，`'Go'` 只赋给 `title`，`1001` 只赋给 `user_id`。不在列列表中的列不会“丢失”：若列有 `DEFAULT`，MySQL 使用默认值；若允许 `NULL`，则为 `NULL`；若既无默认值又不可为空，插入会失败。多行插入只是把多个同列顺序的值组放在同一条语句中。

省略列列表虽然可执行，但会依赖表字段顺序，建表演进后容易出错；应用 SQL 应始终显式写出目标列。

示例：

~~~sql
INSERT INTO posts (title, content, user_id, status)
VALUES ('学习 MySQL', '第一篇文章', 1001, 'published');

INSERT INTO posts (title, content, user_id)
VALUES
  ('Go 与 SQL', '连接数据库', 1001),
  ('Redis 入门', '缓存基础', 1002);
~~~

### 2. `SELECT`：筛选、分组、排序与分页

一个查询可以由多个子句组成，常用语法骨架如下：

~~~sql
SELECT [DISTINCT] select_expr [, select_expr ...]
FROM table_reference
[JOIN table_reference ON join_condition]
[WHERE row_condition]
[GROUP BY group_expr [, group_expr ...]]
[HAVING group_condition]
[ORDER BY sort_expr [ASC | DESC] [, sort_expr ...]]
[LIMIT row_count [OFFSET offset]];
~~~

每一部分承担不同职责：

| 子句 | 回答的问题 | 关键写法 |
| --- | --- | --- |
| `SELECT select_expr` | 最终要返回什么 | 列名、表达式、聚合函数；可用 `AS alias` 起结果列别名 |
| `FROM table_reference` | 数据从哪里来 | 表名、视图、子查询或其别名 |
| `JOIN ... ON ...` | 如何把另一份数据接进来 | `ON` 写两侧行的匹配条件，不是普通筛选条件 |
| `WHERE row_condition` | 哪些原始行可参与后续计算 | 普通列条件，如 `status = 'published'`；不能直接使用 `COUNT(*)` |
| `GROUP BY group_expr` | 按什么维度汇总 | 每个不同分组键形成一组输出 |
| `HAVING group_condition` | 哪些分组保留 | 聚合后的条件，如 `COUNT(*) >= 2` |
| `ORDER BY sort_expr` | 结果怎样排列 | `ASC` 升序（默认），`DESC` 降序；可写多个排序键 |
| `LIMIT row_count OFFSET offset` | 最多返回多少行、跳过多少行 | `LIMIT 20` 取 20 行，`OFFSET 40` 先跳过 40 行 |

`select_expr` 不一定是原始列。`COUNT(*) AS total` 会计算行数并把结果列命名为 `total`；`price * quantity AS amount` 则是计算表达式。启用常见的 `ONLY_FULL_GROUP_BY` 模式时，`SELECT` 中未被聚合的列必须也出现在 `GROUP BY` 中，避免“同一组到底取哪一行的值”这种歧义。

书写顺序必须遵守语法骨架；理解数据处理时，则可先记住逻辑主线：

~~~text
FROM / JOIN 组合数据源
    → WHERE 过滤行
    → GROUP BY 形成分组
    → 聚合函数计算每组结果
    → HAVING 过滤分组
    → SELECT 选择输出列
    → ORDER BY 排序
    → LIMIT 截取结果
~~~

`WHERE` 过滤原始行，不能直接筛选 `COUNT()`、`SUM()` 等聚合结果；聚合后的条件应写在 `HAVING`。`ORDER BY` 默认升序，`DESC` 表示降序；分页必须配合稳定排序，避免不同请求返回的行顺序漂移。

把需求“统计已发布文章，按作者分组，只保留至少两篇的作者，按篇数从多到少取前十名”翻译为 SQL 时，先确定数据源 `FROM posts`，再把“已发布”写为 `WHERE status = 'published'`，把“按作者”写为 `GROUP BY user_id`，把“至少两篇”写为 `HAVING COUNT(*) >= 2`，最后补 `ORDER BY total DESC LIMIT 10`。这个拆解比背一整条长 SQL 更可靠。

基础查询和条件筛选示例：

~~~sql
SELECT id, title, user_id, status
FROM posts
ORDER BY id DESC;

SELECT id, title
FROM posts
WHERE user_id = 1001 AND status = 'published'
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 0;
~~~

聚合、分组和分组后过滤示例：

~~~sql
SELECT status, COUNT(*) AS total
FROM posts
GROUP BY status
HAVING COUNT(*) >= 1
ORDER BY total DESC, status ASC;
~~~

深度 `OFFSET` 分页会越来越慢。数据量较大时，可将最后一条记录的有序字段作为游标：

~~~sql
SELECT id, title, created_at
FROM posts
WHERE created_at < '2026-08-16 12:00:00'
ORDER BY created_at DESC, id DESC
LIMIT 20;
~~~

### 3. `JOIN`：按关联条件组合多张表

连接查询的基础语法：

~~~sql
SELECT select_expr
FROM left_table AS l
[INNER] JOIN right_table AS r ON l.key = r.key;

SELECT select_expr
FROM left_table AS l
LEFT JOIN right_table AS r ON l.key = r.key;
~~~

`INNER JOIN` 只保留两边都匹配的行；`LEFT JOIN` 保留左表全部行，右表无匹配时右侧列为 `NULL`。连接条件通常使用主键与外键或具有相同业务含义的字段。

这里 `left_table AS l` 的 `AS l` 是别名：后续 `l.key` 表示左表的某列，既能缩短书写，也能在两张表都有 `id` 这类同名列时消除歧义。`ON l.key = r.key` 是“哪两行构成一对”的规则；`WHERE` 则在连接完成后筛选结果。若在 `LEFT JOIN` 后把右表条件放入 `WHERE`，可能会过滤掉右侧为 `NULL` 的左表行，从而改变为近似内连接；需要保留左表行时，右表的匹配限制通常应写在 `ON` 中。

假设存在 `users(id, name)` 表，查询文章及作者名称：

~~~sql
SELECT p.id, p.title, p.status, u.name AS author_name
FROM posts AS p
JOIN users AS u ON u.id = p.user_id
WHERE p.status = 'published'
ORDER BY p.created_at DESC, p.id DESC
LIMIT 20;
~~~

### 4. `UPDATE` 与 `DELETE`：先限定范围，再修改数据

常用语法：

~~~sql
UPDATE table_name
SET column_1 = expression_1 [, column_2 = expression_2 ...]
[WHERE row_condition]
[ORDER BY sort_expr]
[LIMIT row_count];

DELETE FROM table_name
[WHERE row_condition]
[ORDER BY sort_expr]
[LIMIT row_count];
~~~

`UPDATE` 的 `table_name` 是要修改的表；`SET` 后每一项都是“列 = 新值或表达式”，例如 `views = views + 1` 是基于旧值计算新值；多个赋值用逗号分隔。`WHERE` 决定受影响的行，`ORDER BY` 和 `LIMIT` 只在需要控制有限行时使用。`DELETE FROM` 后没有列列表，因为它删除的是整行；其余范围控制规则相同。

没有 `WHERE` 的 `UPDATE` 或 `DELETE` 会影响整张表。执行写操作前，先用相同 `WHERE` 写一条 `SELECT` 确认影响范围；需要多步一致性时，把写操作放入事务。

~~~sql
UPDATE posts
SET title = 'MySQL 基础命令', status = 'published'
WHERE id = 1;

DELETE FROM posts
WHERE id = 3;
~~~

## 六、索引的最小知识

索引是帮助数据库更快定位行的数据结构，但会增加写入和存储成本。主键天然有索引；经常作为筛选、连接或排序条件的列才值得考虑增加索引。

常用索引与执行计划语法：

~~~sql
CREATE [UNIQUE] INDEX index_name
  ON table_name (column_name [ASC | DESC], ...);

EXPLAIN SELECT ...;
DROP INDEX index_name ON table_name;
~~~

`CREATE [UNIQUE] INDEX` 中的 `UNIQUE` 是可选项：不写时同一键值可重复，写出后重复写入会失败。`index_name` 是索引自身的名字，不是列名；`ON table_name` 指定索引属于哪张表；括号中的列按先后顺序构成索引键。复合索引 `(status, created_at)` 不等价于两个独立索引：它首先按 `status` 组织，再在相同 status 内按 `created_at` 组织。

`EXPLAIN SELECT ...` 把完整的查询语句接在 `EXPLAIN` 后面；它不返回业务查询结果，而是展示优化器计划。`DROP INDEX index_name ON table_name` 要同时给出索引名和所属表。应先从查询条件和排序方式推导索引，再用执行计划验证。

示例：

~~~sql
CREATE INDEX idx_posts_status_created_at
  ON posts (status, created_at);

EXPLAIN
SELECT id, title
FROM posts
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 20;

DROP INDEX idx_posts_status_created_at ON posts;
~~~

`EXPLAIN` 用于观察优化器计划。入门阶段不必追求每一列都加索引；先理解查询条件、联合索引的左前缀和真实查询量，再做设计。

## 七、事务：让多条写操作一起成功或失败

InnoDB 支持事务。转账、下单、库存扣减等多个写操作具有一致性要求时，应放入同一事务：

事务控制语法：

~~~sql
START TRANSACTION;
-- 一条或多条 DML：INSERT / UPDATE / DELETE
COMMIT;

ROLLBACK;
~~~

`START TRANSACTION` 没有表名或参数，它只是为当前连接开启一个事务边界；之后的 `INSERT`、`UPDATE`、`DELETE` 才是实际修改数据的语句。`COMMIT` 提交当前事务的全部修改；`ROLLBACK` 放弃尚未提交的修改。事务只影响同一连接，不能由另一个客户端连接来提交或回滚。

DDL 语句在 MySQL 中常会隐式提交事务，因此不应把建表、改表和普通业务写操作混在同一事务设计中。

示例：

~~~sql
START TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;
~~~

出现错误或决定放弃时：

~~~sql
ROLLBACK;
~~~

事务应尽可能短：不要在事务中等待用户输入、调用慢的外部 HTTP 服务或执行大范围无索引查询，否则会长期占用锁和连接。

## 八、导入、导出与执行 SQL 文件

导出一个数据库：

~~~bash
mysqldump -h 127.0.0.1 -P 3306 -u root -p blog_demo > blog_demo.sql
~~~

导入：

~~~bash
mysql -h 127.0.0.1 -P 3306 -u root -p blog_demo < blog_demo.sql
~~~

在客户端中执行迁移文件：

~~~sql
SOURCE /absolute/path/to/001_create_posts.sql;
~~~

对于应用项目，建表和变更 SQL 应放入版本化的 `migrations` 目录，不要只在客户端历史中保留操作记录。

## 九、Go 服务中的连接提示

Go 标准库通过 `database/sql` 管理连接池；常用 MySQL 驱动是 `github.com/go-sql-driver/mysql`。DSN 形式通常为：

~~~text
user:password@tcp(127.0.0.1:3306)/blog_demo?parseTime=true&loc=Local
~~~

启动时创建并验证数据库句柄：

~~~go
db, err := sql.Open("mysql", dsn)
if err != nil {
    return err
}
if err := db.PingContext(ctx); err != nil {
    return err
}
~~~

`sql.Open` 不一定立刻建立连接，因此仍应通过 `PingContext` 尽早暴露配置、网络或认证错误。数据库句柄应作为应用的长生命周期依赖复用，而不是每个请求重新打开。

## 十、日常排查命令

~~~sql
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads_connected';
SHOW VARIABLES LIKE 'character_set%';
SHOW TABLE STATUS LIKE 'posts';
~~~

这些命令可帮助确认当前连接、字符集和表状态。遇到问题时优先保存完整错误信息、实际 DSN（隐藏密码）和正在执行的 SQL，再判断是账户权限、网络端口、表结构还是语句本身的问题。

## 总结

MySQL 入门的关键步骤是：确认服务运行，使用 `mysql -u root` 或指定主机端口连接，创建 UTF-8 的数据库与最小权限账户，掌握建表和 CRUD，再用事务保护需要一致性的多步写入。

实际项目中，把 SQL 变更放进 migrations，使用独立应用账户，并通过参数化查询传值。这样就能在保持基础简单的同时，为后续的索引、事务、锁和性能优化打下可靠基础。

## 参考资料

- [MySQL 8.4：SELECT Statement](https://dev.mysql.com/doc/refman/8.4/en/select.html)
- [MySQL 8.4：INSERT Statement](https://dev.mysql.com/doc/refman/8.4/en/insert.html)
- [MySQL 8.4：UPDATE Statement](https://dev.mysql.com/doc/refman/8.4/en/update.html)
