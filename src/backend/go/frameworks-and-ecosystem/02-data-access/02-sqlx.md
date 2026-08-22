---
permalink: /backend/go/frameworks-and-ecosystem/02-data-access/02-sqlx/
title: 01. Go MySQL 数据访问：database/sql 与 sqlx
shortTitle: 01. database/sql 与 sqlx
order: 1
category:
  - Go
  - Golang 框架与生态
  - 数据访问
tag:
  - Go
  - database/sql
  - sqlx
  - MySQL
  - SQL
  - 连接池
  - 事务
---

# 01. Go MySQL 数据访问：database/sql 与 sqlx

## 前言

MySQL 是一种常用的关系型数据库。在 Go 中，可以通过标准库 `database/sql` 配合 MySQL 驱动操作数据库，也可以使用 `sqlx` 对标准库提供的功能进行扩展。

本节使用以下两个第三方库：

- `github.com/go-sql-driver/mysql`：MySQL 驱动；
- `github.com/jmoiron/sqlx`：对标准库 `database/sql` 的扩展封装，可以更方便地将查询结果映射到结构体。

### 13.1.1 准备数据库和数据表

首先创建名为 `test` 的数据库，并在其中创建 `person` 和 `place` 两张表。

```sql
CREATE DATABASE IF NOT EXISTS test;

USE test;

CREATE TABLE `person` (
    `user_id` INT(11) NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(260) DEFAULT NULL,
    `sex` VARCHAR(260) DEFAULT NULL,
    `email` VARCHAR(260) DEFAULT NULL,
    PRIMARY KEY (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

CREATE TABLE `place` (
    `country` VARCHAR(200),
    `city` VARCHAR(200),
    `telcode` INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

其中：

- `CREATE DATABASE` 用于创建数据库；
- `USE test` 表示切换到 `test` 数据库；
- `CREATE TABLE` 用于创建数据表；
- `PRIMARY KEY` 用于指定主键；
- `AUTO_INCREMENT` 表示该字段的值由 MySQL 自动递增；
- `DEFAULT NULL` 表示该字段允许为空，并且默认值为 `NULL`；
- `ENGINE=InnoDB` 表示使用 InnoDB 存储引擎。

创建完成后，可以使用 `DESC` 命令查看数据表结构。

```sql
mysql> DESC person;
+----------+--------------+------+-----+---------+----------------+
| Field    | Type         | Null | Key | Default | Extra          |
+----------+--------------+------+-----+---------+----------------+
| user_id  | int(11)      | NO   | PRI | NULL    | auto_increment |
| username | varchar(260) | YES  |     | NULL    |                |
| sex      | varchar(260) | YES  |     | NULL    |                |
| email    | varchar(260) | YES  |     | NULL    |                |
+----------+--------------+------+-----+---------+----------------+
4 rows in set (0.00 sec)
mysql> DESC place;
+---------+--------------+------+-----+---------+-------+
| Field   | Type         | Null | Key | Default | Extra |
+---------+--------------+------+-----+---------+-------+
| country | varchar(200) | YES  |     | NULL    |       |
| city    | varchar(200) | YES  |     | NULL    |       |
| telcode | int(11)      | YES  |     | NULL    |       |
+---------+--------------+------+-----+---------+-------+
3 rows in set (0.01 sec)
```

### 13.1.2 安装 MySQL 驱动和 sqlx

进入 Go 项目目录，执行以下命令安装依赖：

```bash
go get github.com/go-sql-driver/mysql
go get github.com/jmoiron/sqlx
```

其中，MySQL 驱动通常采用匿名导入方式：

```go
import _ "github.com/go-sql-driver/mysql"
```

匿名导入的作用是执行驱动包中的初始化代码，使其向 `database/sql` 注册名为 `mysql` 的数据库驱动。

如果没有导入 MySQL 驱动，即使代码中使用了：

```go
sqlx.Open("mysql", dsn)
```

程序也无法识别名为 `mysql` 的数据库驱动。

### 13.1.3 连接 MySQL

使用 `sqlx.Open()` 可以创建一个数据库对象：

```go
database, err := sqlx.Open(
    "mysql",
    "root:password@tcp(127.0.0.1:3306)/test",
)
```

第一个参数：

```go
"mysql"
```

表示使用 MySQL 驱动。

第二个参数是数据源名称，也称为 DSN，其基本格式如下：

```text
用户名:密码@tcp(数据库地址:端口)/数据库名
```

例如：

```text
root:root@tcp(127.0.0.1:3306)/test
```

各部分含义如下：

| 内容        | 说明                 |
| ----------- | -------------------- |
| `root`      | MySQL 用户名         |
| `root`      | MySQL 密码           |
| `tcp`       | 使用 TCP 协议连接    |
| `127.0.0.1` | MySQL 服务器地址     |
| `3306`      | MySQL 默认端口       |
| `test`      | 需要访问的数据库名称 |

需要注意，`sqlx.Open()` 主要负责初始化数据库对象和连接池，并不一定会立即与数据库建立实际连接。

因此，可以继续调用 `Ping()` 检查数据库是否能够正常连接。

```go
if err := db.Ping(); err != nil {
    fmt.Println("connect mysql failed:", err)
    return
}
```

下面定义后续示例共同使用的结构体和数据库连接函数：

```go
package main

import (
    "fmt"

    _ "github.com/go-sql-driver/mysql"
    "github.com/jmoiron/sqlx"
)

type Person struct {
    UserID   int    `db:"user_id"`
    Username string `db:"username"`
    Sex      string `db:"sex"`
    Email    string `db:"email"`
}

type Place struct {
    Country string `db:"country"`
    City    string `db:"city"`
    TelCode int    `db:"telcode"`
}

func openDB() (*sqlx.DB, error) {
    db, err := sqlx.Open(
        "mysql",
        "root:root@tcp(127.0.0.1:3306)/test",
    )
    if err != nil {
        return nil, err
    }

    if err := db.Ping(); err != nil {
        db.Close()
        return nil, err
    }

    return db, nil
}

func main() {
    db, err := openDB()
    if err != nil {
        fmt.Println("open mysql failed:", err)
        return
    }
    defer db.Close()

    fmt.Println("mysql connection success")
}
```

结构体字段后的 `db` 标签用于指定结构体字段与数据库字段之间的映射关系。

例如：

```go
UserID int `db:"user_id"`
```

表示数据库查询结果中的 `user_id` 字段会被映射到结构体的 `UserID` 字段。

如果数据库字段名和结构体字段名无法由 `sqlx` 自动对应，就应当通过 `db` 标签明确指定映射关系。

另外，`*sqlx.DB` 并不表示一条固定的数据库连接，而是一个数据库连接池。Go 程序通常只需要创建并复用一个数据库对象，不应在每次执行 SQL 时重复创建连接池。

### 13.1.4 SQL 基础与 SQL 注入

在使用 Go 操作 MySQL 之前，需要先了解基本的 SQL 语法，以及程序执行 SQL 时可能出现的 SQL 注入问题。

#### 1. SQL 语句的基本分类

SQL 是操作关系型数据库的语言。常见 SQL 语句可以分为以下几类：

| 分类         | 常见语句                     | 作用                         |
| ------------ | ---------------------------- | ---------------------------- |
| 数据定义语言 | `CREATE`、`ALTER`、`DROP`    | 创建、修改或者删除数据库对象 |
| 数据操作语言 | `INSERT`、`UPDATE`、`DELETE` | 插入、修改或者删除数据       |
| 数据查询语言 | `SELECT`                     | 查询数据                     |
| 事务控制语言 | `COMMIT`、`ROLLBACK`         | 提交或者回滚事务             |

本节主要使用以下四种语句：

```sql
INSERT
SELECT
UPDATE
DELETE
```

它们通常被合称为 CRUD 操作：

- Create：新增数据，对应 `INSERT`；
- Read：读取数据，对应 `SELECT`；
- Update：修改数据，对应 `UPDATE`；
- Delete：删除数据，对应 `DELETE`。

#### 2. SQL 语句的基本组成

以一条查询语句为例：

```sql
SELECT user_id, username, email
FROM person
WHERE user_id = 1
ORDER BY user_id DESC
LIMIT 10;
```

其中：

- `SELECT` 指定需要查询的字段；
- `FROM` 指定查询的数据表；
- `WHERE` 指定筛选条件；
- `ORDER BY` 指定排序方式；
- `DESC` 表示降序排列；
- `LIMIT` 限制返回的数据条数。

SQL 关键字通常不区分大小写，但为了便于阅读，本教程使用大写形式书写 SQL 关键字。

#### 3. 什么是 SQL 注入

SQL 注入是指程序直接将外部输入拼接到 SQL 字符串中，导致输入内容被数据库当作 SQL 语法的一部分执行。

下面是一种不安全的查询方式：

```go
username := userInput

query := "SELECT user_id, username, sex, email " +
    "FROM person WHERE username = '" + username + "'"

err := db.Select(&people, query)
```

如果用户正常输入：

```text
stu001
```

最终生成的 SQL 为：

```sql
SELECT user_id, username, sex, email
FROM person
WHERE username = 'stu001';
```

但是，如果用户输入：

```text
' OR 1=1 -- 
```

拼接后的 SQL 可能变成：

```sql
SELECT user_id, username, sex, email
FROM person
WHERE username = '' OR 1=1 -- ';
```

其中：

```sql
OR 1=1
```

始终成立，而 `--` 会将后面的内容作为注释处理。

这样一来，原本只查询一个用户的语句，就可能返回表中的全部用户。

SQL 注入还可能造成：

- 未授权读取数据；
- 修改或者删除数据；
- 绕过登录验证；
- 泄露敏感信息；
- 破坏数据库结构。

具体危害取决于数据库账号拥有的权限、数据库配置以及程序执行 SQL 的方式。

#### 4. 错误做法：直接拼接 SQL

以下写法都存在 SQL 注入风险：

```go
query := "SELECT * FROM person WHERE username = '" + username + "'"
query := fmt.Sprintf(
    "SELECT * FROM person WHERE username = '%s'",
    username,
)
query := "DELETE FROM person WHERE user_id = " + userID
```

即使使用 `fmt.Sprintf()`，本质上仍然是在将输入内容拼接到 SQL 字符串中，并不能防止 SQL 注入。

#### 5. 正确做法：参数化查询

MySQL 驱动使用 `?` 作为参数占位符。

```go
var people []Person

err := db.Select(
    &people,
    `
    SELECT user_id, username, sex, email
    FROM person
    WHERE username = ?
    `,
    username,
)
```

这里的 SQL 语句和参数值是分开传递的：

```go
db.Select(
    &people,
    "SELECT ... WHERE username = ?",
    username,
)
```

数据库驱动会将 `username` 当作普通数据处理，而不会将其解释为 SQL 语法。

即使用户输入：

```text
' OR 1=1 -- 
```

数据库也只会将这段内容作为需要匹配的用户名，而不会执行其中的 `OR 1=1`。

占位符周围不应手动添加引号。

错误写法：

```go
db.Select(
    &people,
    "SELECT * FROM person WHERE username = '?'",
    username,
)
```

正确写法：

```go
db.Select(
    &people,
    "SELECT * FROM person WHERE username = ?",
    username,
)
```

字符串引号和类型转换应交给数据库驱动处理。

参数化查询适用于所有常见的 CRUD 操作：

```go
db.Exec(
    "INSERT INTO person(username, sex, email) VALUES (?, ?, ?)",
    username,
    sex,
    email,
)
db.Select(
    &people,
    "SELECT * FROM person WHERE user_id = ?",
    userID,
)
db.Exec(
    "UPDATE person SET username = ? WHERE user_id = ?",
    username,
    userID,
)
db.Exec(
    "DELETE FROM person WHERE user_id = ?",
    userID,
)
```

只要数据值来自变量、请求参数、表单、URL、JSON 或者其他外部输入，就应当通过参数传递，而不是直接拼接到 SQL 中。

#### 6. 预处理语句

如果同一条 SQL 需要重复执行，可以显式创建预处理语句：

```go
stmt, err := db.Preparex(
    `
    INSERT INTO person(username, sex, email)
    VALUES (?, ?, ?)
    `,
)
if err != nil {
    fmt.Println("prepare failed:", err)
    return
}
defer stmt.Close()

_, err = stmt.Exec(
    "stu001",
    "man",
    "stu01@qq.com",
)
if err != nil {
    fmt.Println("insert failed:", err)
    return
}
```

预处理语句通常包含占位符，但不包含具体参数值。创建完成后，可以使用不同的参数重复执行。

需要注意，防止 SQL 注入并不要求每次都显式调用 `Prepare()`。

下面这种参数化写法本身就是正确的：

```go
db.Exec(
    "DELETE FROM person WHERE user_id = ?",
    userID,
)
```

关键在于 SQL 模板和参数值必须分开传递。显式预处理更适合需要重复执行同一条 SQL 的场景。

#### 7. 占位符不能代替表名和字段名

占位符只能表示数据值，不能表示：

- SQL 关键字；
- 表名；
- 字段名；
- 排序方向；
- 完整的 SQL 表达式。

下面的写法是错误的：

```go
db.Select(
    &people,
    "SELECT * FROM ? WHERE user_id = ?",
    tableName,
    userID,
)
```

下面的写法同样不可行：

```go
db.Select(
    &people,
    "SELECT * FROM person ORDER BY ?",
    sortField,
)
```

因为表名、字段名和排序方式属于 SQL 语句结构，而不是普通的数据值。

如果确实需要动态指定排序字段，应当使用白名单：

```go
allowedSortFields := map[string]string{
    "id":       "user_id",
    "username": "username",
    "email":    "email",
}

sortField, ok := allowedSortFields[userInput]
if !ok {
    sortField = "user_id"
}

query := fmt.Sprintf(
    `
    SELECT user_id, username, sex, email
    FROM person
    ORDER BY %s
    `,
    sortField,
)

err := db.Select(&people, query)
```

虽然这里使用了 `fmt.Sprintf()`，但是被拼接的内容不是未经检查的原始输入，而是从程序预先定义的白名单中取得的安全字段名。

排序方向也应使用白名单：

```go
sortDirection := "ASC"

if userDirection == "desc" {
    sortDirection = "DESC"
}
```

不能直接这样处理：

```go
query := "SELECT * FROM person ORDER BY user_id " + userDirection
```

#### 8. SQL 注入的其他防护措施

参数化查询是防止 SQL 注入的主要措施。此外，还应当配合以下措施：

1. 对外部输入进行类型和格式校验；
2. 数据库账号只授予程序真正需要的权限；
3. 不要在错误响应中向用户暴露完整 SQL 和数据库信息；
4. 动态字段名、表名和排序方式必须使用白名单；
5. 不要将过滤或者替换特殊字符作为主要防护手段；
6. 批量查询、动态条件和 `IN` 查询也应使用安全的参数绑定方式。

例如，用户编号应先解析成整数：

```go
userID, err := strconv.Atoi(input)
if err != nil {
    fmt.Println("invalid user id")
    return
}
```

即使已经完成类型校验，执行 SQL 时仍然应当使用占位符：

```go
db.Get(
    &person,
    "SELECT * FROM person WHERE user_id = ?",
    userID,
)
```

输入校验负责判断数据是否合法，参数化查询负责防止输入内容改变 SQL 结构，两者作用不同，不能相互替代。

### 13.1.5 Insert 插入数据

`INSERT` 用于向数据表中插入新的记录。

#### 1. INSERT 基本语法

```sql
INSERT INTO 表名 (字段一, 字段二, 字段三)
VALUES (值一, 值二, 值三);
```

例如：

```sql
INSERT INTO person (username, sex, email)
VALUES ('stu001', 'man', 'stu01@qq.com');
```

其中：

- `INSERT INTO person` 表示向 `person` 表中插入数据；
- 括号中的内容表示需要写入的字段；
- `VALUES` 后面的内容表示各字段对应的值；
- 字段和值必须按照位置一一对应。

`person` 表中的 `user_id` 字段使用了 `AUTO_INCREMENT`，因此插入数据时可以不提供 `user_id`，MySQL 会自动生成其值。

也可以一次插入多条数据：

```sql
INSERT INTO person (username, sex, email)
VALUES
    ('stu001', 'man', 'stu01@qq.com'),
    ('stu002', 'woman', 'stu02@qq.com');
```

#### 2. 使用 Go 插入数据

`INSERT` 不会返回查询结果集，因此可以使用 `Exec()` 方法执行。

```go
package main

import (
    "fmt"

    _ "github.com/go-sql-driver/mysql"
    "github.com/jmoiron/sqlx"
)

func main() {
    db, err := sqlx.Open(
        "mysql",
        "root:root@tcp(127.0.0.1:3306)/test",
    )
    if err != nil {
        fmt.Println("open mysql failed:", err)
        return
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        fmt.Println("connect mysql failed:", err)
        return
    }

    result, err := db.Exec(
        `
        INSERT INTO person(username, sex, email)
        VALUES (?, ?, ?)
        `,
        "stu001",
        "man",
        "stu01@qq.com",
    )
    if err != nil {
        fmt.Println("insert failed:", err)
        return
    }

    id, err := result.LastInsertId()
    if err != nil {
        fmt.Println("get last insert id failed:", err)
        return
    }

    fmt.Println("insert success:", id)
}
```

SQL 语句中的问号 `?` 是参数占位符：

```sql
INSERT INTO person(username, sex, email)
VALUES (?, ?, ?);
```

实际参数按照顺序传递给 `Exec()`：

```go
"stu001",
"man",
"stu01@qq.com",
```

第一个参数对应第一个 `?`，第二个参数对应第二个 `?`，以此类推。

这种参数化查询方式可以：

- 避免手动处理字符串引号；
- 自动处理不同的数据类型；
- 防止输入内容被解释成 SQL 语法；
- 降低 SQL 注入风险。

不应当使用字符串拼接构造插入语句：

```go
sql := "INSERT INTO person(username) VALUES ('" + username + "')"
```

应当改为：

```go
_, err := db.Exec(
    "INSERT INTO person(username) VALUES (?)",
    username,
)
```

#### 3. Exec 和 sql.Result

`Exec()` 的返回值类型为：

```go
sql.Result
```

可以通过 `LastInsertId()` 获取数据库生成的自增主键：

```go
id, err := result.LastInsertId()
```

也可以通过 `RowsAffected()` 获取受影响的行数：

```go
rows, err := result.RowsAffected()
```

示例输出：

```text
insert success: 2
```

这里的 `2` 表示新插入记录的 `user_id`。

### 13.1.6 Select 查询数据

`SELECT` 用于从数据表中读取数据。

#### 1. SELECT 基本语法

查询指定字段：

```sql
SELECT 字段一, 字段二
FROM 表名;
```

例如：

```sql
SELECT user_id, username, email
FROM person;
```

也可以使用 `*` 查询所有字段：

```sql
SELECT *
FROM person;
```

在实际项目中，一般建议明确写出需要的字段，而不是长期依赖 `SELECT *`。这样可以使查询结果更加清晰，并减少不必要的数据传输。

#### 2. WHERE 查询条件

使用 `WHERE` 可以筛选符合条件的记录：

```sql
SELECT user_id, username, email
FROM person
WHERE user_id = 1;
```

常见条件运算符包括：

| 运算符       | 说明               |
| ------------ | ------------------ |
| `=`          | 等于               |
| `<>` 或 `!=` | 不等于             |
| `>`          | 大于               |
| `<`          | 小于               |
| `>=`         | 大于等于           |
| `<=`         | 小于等于           |
| `AND`        | 多个条件同时成立   |
| `OR`         | 多个条件满足其一   |
| `LIKE`       | 模糊匹配           |
| `IN`         | 匹配指定集合中的值 |

例如：

```sql
SELECT user_id, username
FROM person
WHERE sex = 'man' AND user_id > 1;
```

#### 3. 排序和限制数量

常见查询语法如下：

```sql
SELECT 字段
FROM 表名
WHERE 查询条件
ORDER BY 排序字段 ASC 或 DESC
LIMIT 返回数量;
```

例如：

```sql
SELECT user_id, username, email
FROM person
WHERE sex = 'man'
ORDER BY user_id DESC
LIMIT 10;
```

其中：

- `WHERE` 用于筛选数据；
- `ORDER BY` 用于排序；
- `ASC` 表示升序；
- `DESC` 表示降序；
- `LIMIT` 用于限制返回的数据条数。

#### 4. 使用 Go 查询多条数据

`sqlx` 提供了 `Select()` 方法，可以查询多条数据并将结果直接映射到结构体切片中。

```go
package main

import (
    "fmt"

    _ "github.com/go-sql-driver/mysql"
    "github.com/jmoiron/sqlx"
)

type Person struct {
    UserID   int    `db:"user_id"`
    Username string `db:"username"`
    Sex      string `db:"sex"`
    Email    string `db:"email"`
}

func main() {
    db, err := sqlx.Open(
        "mysql",
        "root:root@tcp(127.0.0.1:3306)/test",
    )
    if err != nil {
        fmt.Println("open mysql failed:", err)
        return
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        fmt.Println("connect mysql failed:", err)
        return
    }

    var people []Person

    err = db.Select(
        &people,
        `
        SELECT user_id, username, sex, email
        FROM person
        WHERE user_id = ?
        `,
        1,
    )
    if err != nil {
        fmt.Println("select failed:", err)
        return
    }

    fmt.Println("select success:", people)
}
```

查询条件中的值应当作为独立参数传递：

```go
err := db.Select(
    &people,
    `
    SELECT user_id, username, sex, email
    FROM person
    WHERE user_id = ?
    `,
    userID,
)
```

不应直接拼接：

```go
query := "SELECT * FROM person WHERE user_id = " + userID
```

示例输出：

```text
select success: [{1 stu001 man stu01@qq.com}]
```

`Select()` 的第一个参数必须是用于接收结果的切片指针：

```go
var people []Person

db.Select(&people, ...)
```

这里不能传入：

```go
db.Select(people, ...)
```

因为 `sqlx` 需要通过指针修改切片中的内容。

#### 5. 使用 Get 查询单条数据

如果只需要查询一条记录，可以使用 `Get()`：

```go
var person Person

err := db.Get(
    &person,
    `
    SELECT user_id, username, sex, email
    FROM person
    WHERE user_id = ?
    `,
    1,
)
if err != nil {
    fmt.Println("get person failed:", err)
    return
}

fmt.Println(person)
```

`Select()` 和 `Get()` 的主要区别如下：

| 方法       | 接收对象                   | 适用场景     |
| ---------- | -------------------------- | ------------ |
| `Select()` | 切片指针                   | 查询多条数据 |
| `Get()`    | 结构体指针或者基本类型指针 | 查询单条数据 |

查询语句会返回数据行，因此底层通常通过 `Query()`、`QueryRow()` 或对应的 `Context` 方法执行。

### 13.1.7 Update 更新数据

`UPDATE` 用于修改数据表中已经存在的记录。

#### 1. UPDATE 基本语法

```sql
UPDATE 表名
SET 字段一 = 新值一,
    字段二 = 新值二
WHERE 查询条件;
```

例如：

```sql
UPDATE person
SET username = 'stu0003'
WHERE user_id = 1;
```

其中：

- `UPDATE person` 指定要修改的数据表；
- `SET` 指定要修改的字段和值；
- `WHERE` 指定需要修改的记录。

也可以同时修改多个字段：

```sql
UPDATE person
SET username = 'stu0003',
    email = 'stu03@qq.com'
WHERE user_id = 1;
```

需要特别注意，省略 `WHERE` 条件会修改表中的所有记录：

```sql
UPDATE person
SET username = 'stu0003';
```

因此，在执行更新操作前，应确认 `WHERE` 条件是否正确。

#### 2. 使用 Go 更新数据

`UPDATE` 不返回查询结果集，因此使用 `Exec()` 执行。

```go
package main

import (
    "fmt"

    _ "github.com/go-sql-driver/mysql"
    "github.com/jmoiron/sqlx"
)

func main() {
    db, err := sqlx.Open(
        "mysql",
        "root:root@tcp(127.0.0.1:3306)/test",
    )
    if err != nil {
        fmt.Println("open mysql failed:", err)
        return
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        fmt.Println("connect mysql failed:", err)
        return
    }

    result, err := db.Exec(
        `
        UPDATE person
        SET username = ?
        WHERE user_id = ?
        `,
        "stu0003",
        1,
    )
    if err != nil {
        fmt.Println("update failed:", err)
        return
    }

    rows, err := result.RowsAffected()
    if err != nil {
        fmt.Println("get affected rows failed:", err)
        return
    }

    fmt.Println("update success:", rows)
}
```

这里的两个参数按照占位符出现的顺序传入：

```go
"stu0003",
1,
```

对应：

```sql
SET username = ?
WHERE user_id = ?
```

使用参数化查询可以防止用户名等外部输入改变 SQL 语句的结构。

#### 3. 获取受影响的行数

可以使用 `RowsAffected()` 获取更新操作实际影响的行数：

```go
rows, err := result.RowsAffected()
```

第一次运行时，如果数据确实发生了变化，输出结果可能为：

```text
update success: 1
```

表示有一行数据被修改。

再次执行相同的更新时，由于字段值已经是 `stu0003`，数据没有发生实际变化，输出结果可能为：

```text
update success: 0
```

在默认配置下，这里的返回值通常表示实际发生变化的行数，而不是 SQL 条件匹配到的行数。

### 13.1.8 Delete 删除数据

`DELETE` 用于删除数据表中的记录。

#### 1. DELETE 基本语法

```sql
DELETE FROM 表名
WHERE 查询条件;
```

例如：

```sql
DELETE FROM person
WHERE user_id = 1;
```

其中：

- `DELETE FROM person` 表示从 `person` 表中删除数据；
- `WHERE user_id = 1` 表示只删除 `user_id` 等于 `1` 的记录。

需要特别注意，省略 `WHERE` 条件会删除表中的所有数据：

```sql
DELETE FROM person;
```

该语句虽然不会删除数据表本身，但会删除表中的所有记录。

因此，执行删除操作时必须谨慎检查删除条件。

#### 2. 使用 Go 删除数据

删除数据同样可以使用 `Exec()`：

```go
package main

import (
    "fmt"

    _ "github.com/go-sql-driver/mysql"
    "github.com/jmoiron/sqlx"
)

func main() {
    db, err := sqlx.Open(
        "mysql",
        "root:root@tcp(127.0.0.1:3306)/test",
    )
    if err != nil {
        fmt.Println("open mysql failed:", err)
        return
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        fmt.Println("connect mysql failed:", err)
        return
    }

    result, err := db.Exec(
        `
        DELETE FROM person
        WHERE user_id = ?
        `,
        1,
    )
    if err != nil {
        fmt.Println("delete failed:", err)
        return
    }

    rows, err := result.RowsAffected()
    if err != nil {
        fmt.Println("get affected rows failed:", err)
        return
    }

    fmt.Println("delete success:", rows)
}
```

查询条件中的数据应当作为参数传入：

```go
result, err := db.Exec(
    "DELETE FROM person WHERE user_id = ?",
    userID,
)
```

不应直接拼接外部输入：

```go
query := "DELETE FROM person WHERE user_id = " + userID
```

#### 3. 获取删除行数

使用 `RowsAffected()` 可以获得被删除的记录数量：

```go
rows, err := result.RowsAffected()
```

如果数据库中存在 `user_id = 1` 的数据，第一次运行结果为：

```text
delete success: 1
```

表示成功删除一行数据。

再次执行相同的删除操作时，由于该记录已经不存在，结果为：

```text
delete success: 0
```

如果不需要获取受影响的行数，也可以忽略 `Exec()` 返回的 `sql.Result`：

```go
_, err := db.Exec(
    "DELETE FROM person WHERE user_id = ?",
    1,
)
if err != nil {
    fmt.Println("delete failed:", err)
    return
}
```

### 13.1.9 MySQL 事务

事务用于将多个数据库操作组织成一个不可分割的执行单元。

例如，转账操作通常包括：

1. 从一个账户扣除金额；
2. 向另一个账户增加金额。

这两个操作必须同时成功或者同时失败，不能只执行其中一个。这类场景就需要使用事务。

#### 1. 事务的 ACID 特性

事务具有以下四个基本特性，通常简称为 ACID：

1. 原子性：事务中的操作要么全部执行成功，要么全部不执行；
2. 一致性：事务执行前后，数据库都应保持符合约束的有效状态；
3. 隔离性：并发事务之间的执行应当相互隔离；
4. 持久性：事务提交后，修改结果应被永久保存。

#### 2. Go 中的事务方法

在 Go 中，事务操作主要涉及以下方法。

开始事务：

```go
tx, err := db.Begin()
```

提交事务：

```go
err := tx.Commit()
```

回滚事务：

```go
err := tx.Rollback()
```

使用 `sqlx` 时，也可以调用 `Beginx()` 获得 `*sqlx.Tx`：

```go
tx, err := db.Beginx()
```

#### 3. 事务执行流程

事务的基本执行流程如下：

```text
开始事务
    ↓
执行第一条 SQL
    ↓
执行第二条 SQL
    ↓
全部成功 → 提交事务
任意失败 → 回滚事务
```

只有调用 `Commit()` 后，事务中的修改才会正式提交。

如果调用 `Rollback()`，事务中的修改会被撤销。

#### 4. 事务示例

下面在同一个事务中连续插入两条数据：

```go
package main

import (
    "fmt"

    _ "github.com/go-sql-driver/mysql"
    "github.com/jmoiron/sqlx"
)

func main() {
    db, err := sqlx.Open(
        "mysql",
        "root:root@tcp(127.0.0.1:3306)/test",
    )
    if err != nil {
        fmt.Println("open mysql failed:", err)
        return
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        fmt.Println("connect mysql failed:", err)
        return
    }

    tx, err := db.Beginx()
    if err != nil {
        fmt.Println("begin transaction failed:", err)
        return
    }

    result, err := tx.Exec(
        `
        INSERT INTO person(username, sex, email)
        VALUES (?, ?, ?)
        `,
        "stu001",
        "man",
        "stu01@qq.com",
    )
    if err != nil {
        fmt.Println("first insert failed:", err)

        if rollbackErr := tx.Rollback(); rollbackErr != nil {
            fmt.Println("rollback failed:", rollbackErr)
        }
        return
    }

    id, err := result.LastInsertId()
    if err != nil {
        fmt.Println("get first insert id failed:", err)

        if rollbackErr := tx.Rollback(); rollbackErr != nil {
            fmt.Println("rollback failed:", rollbackErr)
        }
        return
    }

    fmt.Println("insert success:", id)

    result, err = tx.Exec(
        `
        INSERT INTO person(username, sex, email)
        VALUES (?, ?, ?)
        `,
        "stu001",
        "man",
        "stu01@qq.com",
    )
    if err != nil {
        fmt.Println("second insert failed:", err)

        if rollbackErr := tx.Rollback(); rollbackErr != nil {
            fmt.Println("rollback failed:", rollbackErr)
        }
        return
    }

    id, err = result.LastInsertId()
    if err != nil {
        fmt.Println("get second insert id failed:", err)

        if rollbackErr := tx.Rollback(); rollbackErr != nil {
            fmt.Println("rollback failed:", rollbackErr)
        }
        return
    }

    fmt.Println("insert success:", id)

    if err := tx.Commit(); err != nil {
        fmt.Println("commit transaction failed:", err)
        return
    }

    fmt.Println("transaction committed")
}
```

示例输出：

```text
insert success: 2
insert success: 3
transaction committed
```

查看 MySQL 中的数据：

```sql
mysql> SELECT * FROM person;
+---------+----------+------+--------------+
| user_id | username | sex  | email        |
+---------+----------+------+--------------+
|       2 | stu001   | man  | stu01@qq.com |
|       3 | stu001   | man  | stu01@qq.com |
+---------+----------+------+--------------+
2 rows in set (0.00 sec)
```

#### 5. 事务中的注意事项

事务开始后，事务中的数据库操作必须通过事务对象 `tx` 执行：

```go
tx.Exec(...)
```

不能在事务中混用原来的数据库对象：

```go
db.Exec(...)
```

下面的写法是错误的：

```go
tx, err := db.Beginx()
if err != nil {
    return
}

tx.Exec("INSERT INTO person ...")

// 这条语句不属于上面的事务。
db.Exec("UPDATE person ...")

tx.Commit()
```

`db.Exec()` 可能从连接池中获取另一条连接，因此它执行的 SQL 不属于当前事务。

如果其中任意一步执行失败，应调用：

```go
tx.Rollback()
```

回滚事务。

只有所有操作均成功时，才调用：

```go
tx.Commit()
```

提交事务。

参数化查询同样适用于事务中的 SQL：

```go
tx.Exec(
    "UPDATE person SET username = ? WHERE user_id = ?",
    username,
    userID,
)
```

事务只能保证一组数据库操作按照事务规则执行，并不能替代参数化查询。即使 SQL 在事务中执行，也不能直接拼接外部输入。

## 代码注释补充

下面的说明按原文小节顺序对应所有代码块。原始 SQL、方法名和示例输入保持不变；阅读代码时可将这一节作为逐段注释使用。

### 数据库与表结构

- `CREATE DATABASE IF NOT EXISTS test` 只在数据库不存在时创建，重复执行不会报错；`USE test` 只影响当前命令行会话，Go 的目标数据库由 DSN 决定。
- `person.user_id` 的 `AUTO_INCREMENT` 由 MySQL 生成，插入时不要自己猜测下一个编号；代码应从 `sql.Result.LastInsertId` 取得本次写入的结果。
- `person` 中的 `username`、`sex`、`email` 都允许 `NULL`。若查询结果要扫描到 Go 中，应使用 `sql.NullString`，不能假定它们总能扫描进 `string`。
- `place` 用来说明不同列类型的映射，但它没有主键和唯一约束，不适合作为生产业务表的模板。生产表至少要明确主键、字符集、必要的索引与约束。
- `DESC` 的输出中，`Null` 表示是否允许 SQL `NULL`，`Key` 表示索引类型，`Extra` 中的 `auto_increment` 表示由数据库生成值。

### 驱动导入与连接代码

- `go get` 会把依赖写入当前 module 的 `go.mod`；实际项目应提交 `go.mod` 和 `go.sum`，让构建使用可重复的依赖版本。
- `_ "github.com/go-sql-driver/mysql"` 的空白标识符表示只执行包初始化，不直接引用包名。驱动的 `init` 调用 `sql.Register("mysql", ...)`，所以 `sqlx.Open` 和 `sql.Open` 才能通过名称找到驱动。
- DSN 中 `tcp(127.0.0.1:3306)` 指定网络和地址，末尾数据库名指定默认 schema。密码含特殊字符或需要 `parseTime` 等选项时，优先用驱动的 `mysql.Config` 生成 DSN。
- `sqlx.Open` 和 `sql.Open` 返回的是连接池句柄，不保证已建立物理连接。示例随后调用 `Ping`，正是在启动时把地址、网络、认证和数据库名错误尽早暴露出来。
- `defer db.Close()` 只应放在应用进程退出的生命周期中。每个请求都创建并关闭 `*sqlx.DB` 会不断创建新连接池，无法复用连接。
- `db` 标签只被 sqlx 的反射映射读取。`UserID int \`db:"user_id"\`` 将下划线列名与 Go 的驼峰字段明确对应；使用标准库手动 `Scan` 时，标签不起作用。

### SQL 基础、参数绑定与预处理

- `SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ...` 中，`WHERE` 过滤行，`ORDER BY` 决定顺序，`LIMIT` 限制返回数量。生产查询应明确列名，避免长期依赖 `SELECT *`。
- 拼接用户名的示例专门展示 SQL 注入：输入若进入 SQL 文本，数据库无法区分它是普通字符串还是语法。`fmt.Sprintf` 只是另一种拼接方式，并不会增加安全性。
- MySQL 的 `?` 是值占位符。参数必须作为 `Exec`、`Query`、`Get` 或 `Select` 的独立实参传入；不要写成 `WHERE username = '?'`，单引号会把占位符变为普通字符。
- `Preparex` 返回可复用的语句对象，使用后需要 `defer stmt.Close()`。显式预处理适合重复执行同一 SQL；防注入的核心仍然是模板与参数分离，不要求每次显式 `Prepare`。
- 表名、字段名和排序方向属于 SQL 结构，不能由 `?` 绑定。动态排序示例先将外部输入映射到 `allowedSortFields`，再格式化映射后的固定字符串；原始输入绝不能直接进入 `ORDER BY`。
- `strconv.Atoi` 只能校验“能否转换成整数”，不能代替参数绑定。输入校验和参数化查询分别承担业务正确性与 SQL 结构安全。

### Insert、Select、Update 与 Delete

- `Exec` 用于不返回结果集的语句。返回的 `sql.Result` 可以读取 `LastInsertId` 和 `RowsAffected`；两者都可能返回错误，不能省略错误判断。
- 每个 `?` 与参数按位置一一对应。插入语句不传 `user_id`，由 `AUTO_INCREMENT` 生成主键；字符串引号、转义和类型编码由驱动完成。
- `Select(&people, ...)` 的第一个参数必须是切片指针，sqlx 才能把多行结果写入切片；`Get(&person, ...)` 适合一行结果。零行时 `Get` 会返回 `sql.ErrNoRows`，业务层应使用 `errors.Is` 区分“未找到”和数据库故障。
- `UPDATE` 和 `DELETE` 中的 `WHERE` 是安全边界。省略它会影响整张表；执行前应确认资源 ID 和业务条件都进入了 `WHERE`。
- `RowsAffected` 对更新的语义取决于数据库和驱动设置。MySQL 默认情况下，更新成相同值可能返回 0；因此 0 不总能单独表示“记录不存在”。

### 事务代码

- `Begin` 或 `Beginx` 成功后，`tx` 会固定占用池中的一条连接。事务内所有相关 SQL 必须经由 `tx.Exec`、`tx.Get` 或 `tx.Query` 发出，不能混用外层 `db`。
- 每条 SQL 失败路径都调用 `Rollback` 的原始写法是正确的；生产代码常用 `defer tx.Rollback()` 集中兜底，并在所有语句成功后调用一次 `Commit`。
- `Commit` 成功后事务已结束，随后兜底 `Rollback` 返回 `sql.ErrTxDone` 可以忽略。`Commit` 失败时不要假定服务器一定没有提交，重要写入需要幂等键和状态核对。
- 参数化规则在事务中完全相同。事务保证一组操作的原子性，不能修复把外部输入拼接进 SQL 的注入漏洞。

## 底层原理补充

### `database/sql` 如何找到 MySQL 驱动

MySQL 驱动包初始化时注册名称，概念上等价于：

```go
func init() {
    // 把 MySQL 协议实现放入 database/sql 的全局驱动表。
    sql.Register("mysql", &MySQLDriver{})
}
```

`sql.Open("mysql", dsn)` 先从这张注册表取出驱动。标准库不认识 MySQL 协议；它只定义 `database/sql/driver` 接口。驱动实现连接、认证、网络读写、参数编码和结果解码，标准库负责在它之上提供统一的 `DB`、`Tx`、`Rows` API。

### `sql.Open` 与连接池的实际职责

`sql.Open` 返回 `*sql.DB`。这个对象是并发安全的池管理器，不是一条固定连接。简化后的内部流程如下：

```go
func (db *DB) conn(ctx context.Context) (*driverConn, error) {
    db.mu.Lock() // 保护空闲连接、打开数量和等待队列。

    if db.hasIdleConnection() {
        conn := db.takeIdleConnection() // 优先复用空闲连接。
        db.mu.Unlock()
        return conn, nil
    }
    if db.maxOpen > 0 && db.numOpen >= db.maxOpen {
        waiter := db.addWaiter()
        db.mu.Unlock()
        return waiter.wait(ctx) // 池满时等待；ctx 取消可中断等待。
    }

    db.numOpen++ // 先预留名额，避免并发超过上限。
    db.mu.Unlock()
    return db.connector.Connect(ctx) // 锁外执行可能阻塞的网络拨号。
}
```

`Rows.Close`、`Tx.Commit` 与 `Tx.Rollback` 会触发连接归还；长时间未关闭的 `Rows` 和未结束的事务都会占用物理连接。`SetMaxOpenConns` 限制并发连接，达到上限后调用方会等待，因此 `DBStats.WaitCount` 的增长既可能是池过小，也可能是慢 SQL、锁等待或资源泄漏。

### sqlx 在标准库之上做了什么

`sqlx.DB` 包装已有的 `*sql.DB`，不会创建第二个连接池。它的 `Get`、`Select` 最终仍通过标准库查询获得 `Rows`，再根据列名和 `db` 标签用反射执行结构体扫描；`NamedExec` 先把 `:name` 转成驱动占位符和参数列表；`sqlx.In` 把一个切片参数展开为多个占位符；`Rebind` 让同一 SQL 能适配 MySQL 的 `?` 和 PostgreSQL 的 `$1` 等风格。

因此，sqlx 减少的是映射和绑定代码，不会改变连接池、事务、行锁、执行计划或索引的行为。

## 总结

原文的 SQL 基础、参数化、CRUD 与事务代码已经保持原顺序复制。实际使用时，重点是长期复用 `*sql.DB` 或 `*sqlx.DB`、为调用传递 `Context`、关闭多行结果集、在 `Scan` 时处理单行查询错误、让事务内所有 SQL 使用同一个 `tx`，并把所有外部值通过占位符传给驱动。
