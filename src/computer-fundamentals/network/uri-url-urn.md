---
title: URI、URL 与 URN
shortTitle: URI 与 URL
order: 7
icon: link
category:
  - 计算机网络
tag:
  - URI
  - URL
  - URN
---

# URI、URL 与 URN

## 1.URI（统一资源标识符）

### 定义

**URI（Uniform Resource Identifier）** 是用于标识互联网上资源（如文档、图像、服务等）的字符串。它可以表示资源的 **名称**、**位置**，或两者结合。URI 包含两个主要子类：**URL**（定位资源）和 **URN**（命名资源）。

### 语法

URI 的标准语法如下：

```
scheme:[//authority][/path][?query][#fragment]
```

- **Scheme（协议）**：标识资源访问的协议（如 `http`、`ftp`、`mailto`），不区分大小写。
- **Authority（权限）**：可选部分，通常包含主机名和端口，格式为 `[user:password@]host:port`。
- **Path（路径）**：资源在服务器上的层级路径，以 `/` 分隔。
- **Query（查询）**：可选参数，以 `?` 开头，格式为键值对（如 `?name=ferret&color=purple`）。
- **Fragment（片段）**：指向资源内部的某个部分（如 `#section1`）。

**示例**

```
foo://user:pass@example.com:8042/over/there?name=ferret#nose
```

- **Scheme**: `foo`
- **Authority**: `user:pass@example.com:8042`
- **Path**: `/over/there`
- **Query**: `name=ferret`
- **Fragment**: `nose`





## 2.URL（统一资源定位符）

### 定义

**URL（Uniform Resource Locator）** 是 URI 的子集，专门用于通过协议和位置 **定位资源**。URL 必须包含访问资源的协议（如 HTTP）和资源的具体位置（如域名和路径）。

### 语法

URL 的典型语法为：

```
scheme://host:port/path?query#fragment
```

- **Scheme**：访问资源的协议（如 `https`）。
- **Host**：服务器域名或 IP 地址。
- **Port**：服务器端口（可选，默认与协议绑定，如 HTTP 默认 80）。
- **Path**：资源在服务器上的路径。
- **Query**：传递给服务器的参数（如 `?page=1&sort=desc`）。
- **Fragment**：资源内部的锚点（如 `#footer`）。

**示例**

```
https://www.example.com:8080/docs/book.html?chapter=3#glossary
```

- **Scheme**: `https`
- **Host**: `www.example.com`
- **Port**: `8080`
- **Path**: `/docs/book.html`
- **Query**: `chapter=3`
- **Fragment**: `glossary`



## 3.URN（统一资源名称）

### 定义

**URN（Uniform Resource Name）** 是 URI 的另一个子集，用于通过 **全局唯一名称** 标识资源，即使资源的位置发生变化，URN 依然有效。URN 常用于持久化标识（如书籍的 ISBN 号）。

### 语法

URN 的标准语法为：

```
urn:<NID>:<NSS>
```

- **NID（Namespace Identifier）**：命名空间标识符（如 `isbn`、`issn`），需向 IANA 注册。
- **NSS（Namespace Specific String）**：命名空间内的唯一标识符。

### 示例

```
urn:isbn:978-3-16-148410-0
```

- **Scheme**: `urn`
- **NID**: `isbn`
- **NSS**: `978-3-16-148410-0`



## 4.URI、URL、URN 的关系

1. **URI** 是广义概念，包含 URL 和 URN。
2. **URL** 通过位置定位资源，资源移动后可能失效。
3. **URN** 通过名称标识资源，资源移动后依然有效。



## 5.Java 中的 URI 与 URL

### 1. 核心类

| 类名           | 包         | 用途                 |
| :------------- | :--------- | :------------------- |
| `java.net.URI` | `java.net` | 解析、构造和操作 URI |
| `java.net.URL` | `java.net` | 定位和访问网络资源   |

### 2. 创建对象

```java
// URI 的创建（不抛出受检异常）
URI uri = URI.create("https://user:pass@example.com:8080/path?q=1#frag");

// URL 的创建（可能抛出 MalformedURLException）
try {
    URL url = new URL("https://example.com/path?q=1#frag");
} catch (MalformedURLException e) {
    e.printStackTrace();
}
```

### 3. 核心方法与操作

#### **URI 类**

- **解析组件**：

  ```java
  String scheme = uri.getScheme();    // "https"
  String host = uri.getHost();        // "example.com"
  int port = uri.getPort();           // 8080
  String path = uri.getPath();        // "/path"
  String query = uri.getQuery();      // "q=1"
  String fragment = uri.getFragment();// "frag"
  ```

- **编码处理**：自动处理特殊字符（如空格转为 `%20`）。

- **不可变性**：所有方法返回新对象，原对象不变。

#### **URL 类**

- **访问资源**：

  ```java
  InputStream inputStream = url.openStream(); // 获取资源流
  URLConnection conn = url.openConnection();  // 获取连接对象
  ```

- **编码限制**：需手动处理特殊字符（如 `URLEncoder.encode()`）。

- **协议支持**：默认支持 HTTP、HTTPS、FTP 等协议。

### 4. 关键区别

| **特性**     | **URI**                     | **URL**                                |
| :----------- | :-------------------------- | :------------------------------------- |
| **用途**     | 解析和操作 URI 组件         | 定位和访问网络资源                     |
| **编码处理** | 自动编码特殊字符            | 需手动编码（如空格→`%20`）             |
| **异常处理** | `URI.create()` 不抛受检异常 | 构造函数可能抛 `MalformedURLException` |
| **资源访问** | 不支持直接访问资源          | 支持 `openStream()` 等操作             |

## 6.对比总结表

| **分类**     | URI                           | URL                        | URN                           |
| :----------- | :---------------------------- | :------------------------- | :---------------------------- |
| **核心作用** | 标识资源（名称或位置）        | 通过位置定位资源           | 通过名称唯一标识资源          |
| **唯一性**   | 可能唯一                      | 唯一（依赖位置）           | 全局唯一（依赖命名规则）      |
| **Java类**   | `java.net.URI`                | `java.net.URL`             | 无专用类（可通过 `URI` 表示） |
| **示例**     | `foo://example.com/path#frag` | `https://example.com/path` | `urn:isbn:0451450523`         |
