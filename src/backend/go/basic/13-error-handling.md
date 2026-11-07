---
permalink: /backend/go/basic/11-error-handling/
title: 13. 错误处理
shortTitle: 13. 错误处理
order: 13
category:
  - Go
  - Golang 基础知识
tag:
  - Go
  - 错误处理
  - error
  - errors
  - panic
  - recover
---

# 13. 错误处理

## 前言

程序在运行过程中可能遇到很多无法按照预期完成操作的情况，例如：

- 用户输入的数据不合法；
- 文件不存在或没有访问权限；
- 网络连接失败；
- 数据库查询没有结果；
- 除数为零；
- 数组或切片访问越界；
- 向已经关闭的通道发送数据；
- 程序内部出现违反设计约束的状态。

Go 没有传统意义上的 `try`、`catch`、`finally` 异常处理语法，而是提供了两套用途不同的错误处理机制：

1. 使用 `error` 值表示可以预期、可以处理、需要传递给调用者的错误；
2. 使用 `panic` 和 `recover` 处理程序无法正常继续执行的异常状态。

在正常业务代码中，`error` 是主要的错误处理方式。`panic` 不应当被当作普通异常返回机制使用，也不应通过 `panic/recover` 模仿其他语言中的 `try/catch`。

---

## 13.1 error 接口

### 13.1.1 error 是一个接口

`error` 是 Go 预声明的内置接口，其定义如下：

```go
type error interface {
    Error() string
}
```

任何类型只要实现了：

```go
Error() string
```

方法，就实现了 `error` 接口。

因此，错误并不是一种特殊的底层对象，而是一个普通的接口值。

例如：

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return e.Field + ": " + e.Message
}
```

`*ValidationError` 实现了 `error` 接口，因此可以作为错误值返回：

```go
func ValidateName(name string) error {
    if name == "" {
        return &ValidationError{
            Field:   "name",
            Message: "不能为空",
        }
    }

    return nil
}
```

调用：

```go
func main() {
    err := ValidateName("")

    if err != nil {
        fmt.Println(err)
    }
}
```

输出结果：

```text
name: 不能为空
```

执行：

```go
fmt.Println(err)
```

时，`fmt` 包会调用错误值的 `Error` 方法获取错误描述。

---

### 13.1.2 nil 表示操作成功

按照 Go 的惯例：

- 返回 `nil` 错误表示操作成功；
- 返回非 `nil` 错误表示操作失败。

例如：

```go
func Divide(x, y int) (int, error) {
    if y == 0 {
        return 0, errors.New("division by zero")
    }

    return x / y, nil
}
```

调用时检查错误：

```go
result, err := Divide(10, 0)
if err != nil {
    fmt.Println("计算失败：", err)
    return
}

fmt.Println(result)
```

当错误不为 `nil` 时，其他返回值通常不能继续使用。

例如：

```go
file, err := os.Open("config.json")
if err != nil {
    return err
}

defer file.Close()
```

不要在未检查错误的情况下直接使用返回值：

```go
file, _ := os.Open("config.json")

// file 可能为 nil，后续操作可能发生错误
defer file.Close()
```

---

### 13.1.3 error 是值

错误值可以像其他普通值一样：

- 赋值给变量；
- 作为参数传递；
- 作为返回值返回；
- 存储在切片或结构体中；
- 使用接口和类型判断检查；
- 包装另一个错误；
- 组合多个错误。

例如：

```go
var err error

err = errors.New("操作失败")

fmt.Println(err)
```

因此，Go 错误处理的核心思想不是“抛出并捕获异常”，而是：

> 函数通过返回值明确报告错误，调用者根据错误值决定如何处理。

---

## 13.2 返回和处理错误

### 13.2.1 错误通常作为最后一个返回值

当函数可能失败时，通常将 `error` 放在返回值列表的最后：

```go
func ReadConfig(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }

    return data, nil
}
```

调用：

```go
data, err := ReadConfig("config.json")
if err != nil {
    fmt.Println("读取配置失败：", err)
    return
}

fmt.Println(string(data))
```

只有错误而没有其他结果的函数可以直接返回 `error`：

```go
func Save(data []byte) error {
    if len(data) == 0 {
        return errors.New("data is empty")
    }

    return nil
}
```

---

### 13.2.2 及时处理错误

Go 中最常见的错误处理形式是：

```go
value, err := operation()
if err != nil {
    return err
}

// 继续处理 value
```

例如：

```go
func LoadNumber(path string) (int, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return 0, err
    }

    number, err := strconv.Atoi(strings.TrimSpace(string(data)))
    if err != nil {
        return 0, err
    }

    return number, nil
}
```

错误处理通常应当尽早完成，让正常流程保持较少的缩进。

推荐：

```go
value, err := operation()
if err != nil {
    return err
}

use(value)
```

不推荐：

```go
value, err := operation()
if err == nil {
    use(value)
} else {
    return err
}
```

当错误被处理后立即 `return`、`continue` 或 `break`，正常路径会更加清晰。

---

### 13.2.3 不要随意忽略错误

下面的代码使用空白标识符忽略了错误：

```go
data, _ := os.ReadFile("config.json")
```

如果文件读取失败，程序无法知道失败原因，并可能继续使用无效数据。

更合理的写法是：

```go
data, err := os.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("read config: %w", err)
}
```

只有在能够明确证明错误不需要处理时，才可以忽略错误，并且最好通过注释说明原因：

```go
// strings.Builder.WriteString 按照接口约定始终返回 nil 错误。
_, _ = builder.WriteString("hello")
```

---

### 13.2.4 不要使用特殊返回值代替 error

不推荐使用 `-1`、空字符串或 `nil` 等特殊值表示失败，因为这些值本身也可能是合法结果。

不推荐：

```go
func FindUser(name string) int {
    // 使用 -1 表示没有找到
    return -1
}
```

推荐：

```go
func FindUser(name string) (int, error) {
    id, ok := userIDs[name]
    if !ok {
        return 0, errors.New("user not found")
    }

    return id, nil
}
```

如果调用者只需要知道“存在或不存在”，不需要具体错误原因，也可以使用布尔值：

```go
func FindUser(name string) (int, bool) {
    id, ok := userIDs[name]
    return id, ok
}
```

通常：

- 需要解释失败原因时返回 `error`；
- 只需要表达“有或没有”时可以返回 `bool`。

---

## 13.3 创建错误

### 13.3.1 使用 errors.New 创建错误

`errors.New` 根据字符串创建一个错误值：

```go
err := errors.New("division by zero")
```

示例：

```go
package main

import (
    "errors"
    "fmt"
)

func Divide(x, y int) (int, error) {
    if y == 0 {
        return 0, errors.New("division by zero")
    }

    return x / y, nil
}

func main() {
    result, err := Divide(10, 0)
    if err != nil {
        fmt.Println(err)
        return
    }

    fmt.Println(result)
}
```

输出结果：

```text
division by zero
```

每次调用 `errors.New` 都会创建一个不同的错误值，即使传入的字符串相同。

```go
err1 := errors.New("not found")
err2 := errors.New("not found")

fmt.Println(err1 == err2)
```

输出：

```text
false
```

错误字符串相同，并不代表错误值相等。

---

### 13.3.2 使用 fmt.Errorf 创建格式化错误

当错误信息中需要包含变量时，可以使用 `fmt.Errorf`：

```go
func ValidateAge(age int) error {
    if age < 0 {
        return fmt.Errorf("invalid age %d", age)
    }

    return nil
}
```

调用：

```go
err := ValidateAge(-10)
fmt.Println(err)
```

输出：

```text
invalid age -10
```

与下面的写法相比：

```go
errors.New(fmt.Sprintf("invalid age %d", age))
```

直接使用 `fmt.Errorf` 更简洁。

---

### 13.3.3 错误字符串的编写习惯

错误字符串通常：

1. 使用小写字母开头；
2. 结尾不添加句号；
3. 描述失败的操作或原因；
4. 不添加多余的换行符；
5. 不把日志级别写入错误字符串。

推荐：

```go
errors.New("user not found")
fmt.Errorf("read config %q: permission denied", path)
```

不推荐：

```go
errors.New("User not found.")
errors.New("ERROR: user not found!")
```

错误值经常会被上层继续添加上下文：

```go
return fmt.Errorf("load application: %w", err)
```

如果底层错误以大写开头并带句号，最终组合出的信息可能不自然：

```text
load application: Config file does not exist.
```

---

## 13.4 哨兵错误

### 13.4.1 定义哨兵错误

如果调用者需要判断某一种固定的错误情况，可以定义一个可重复使用的包级错误变量。

这种错误通常称为哨兵错误。

```go
var ErrDivByZero = errors.New("division by zero")
```

函数返回该错误：

```go
func Divide(x, y int) (int, error) {
    if y == 0 {
        return 0, ErrDivByZero
    }

    return x / y, nil
}
```

调用者判断：

```go
result, err := Divide(10, 0)
if err != nil {
    if errors.Is(err, ErrDivByZero) {
        fmt.Println("除数不能为零")
        return
    }

    fmt.Println("其他错误：", err)
    return
}

fmt.Println(result)
```

---

### 13.4.2 使用 errors.Is 判断错误值

对于可能被包装的错误，应使用：

```go
errors.Is(err, target)
```

而不是简单比较：

```go
err == target
```

例如：

```go
var ErrNotFound = errors.New("not found")

func FindUser(name string) error {
    return fmt.Errorf("find user %q: %w", name, ErrNotFound)
}
```

调用：

```go
err := FindUser("张三")

fmt.Println(err == ErrNotFound)
fmt.Println(errors.Is(err, ErrNotFound))
```

输出结果：

```text
false
true
```

`err` 本身已经不是 `ErrNotFound`，而是一个包装了 `ErrNotFound` 的新错误。

`errors.Is` 会沿着错误链检查内部错误，因此能够识别被包装的哨兵错误。

---

### 13.4.3 不要比较错误字符串

不推荐：

```go
if err.Error() == "not found" {
    // 处理错误
}
```

错误字符串主要用于向人展示，不是稳定的程序接口。

错误信息可能因为以下原因改变：

- 上层添加了上下文；
- 标点或措辞发生变化；
- 底层操作系统返回不同文本；
- 程序切换了实现；
- 错误被包装。

应当根据错误语义使用：

```go
errors.Is(err, ErrNotFound)
```

或者根据错误类型使用：

```go
errors.As(err, &target)
```

---

### 13.4.4 谨慎导出哨兵错误

导出的哨兵错误会成为包的公共 API。

例如：

```go
var ErrNotFound = errors.New("not found")
```

调用者可能依赖：

```go
errors.Is(err, ErrNotFound)
```

一旦对外承诺返回 `ErrNotFound`，后续修改错误类型或错误语义时需要保持兼容。

因此，只有在调用者确实需要针对某种错误采取不同操作时，才应导出可识别的错误。

---

## 13.5 自定义错误类型

### 13.5.1 自定义错误的作用

普通错误字符串只能说明错误信息。

如果调用者还需要获取结构化信息，例如：

- 哪个字段验证失败；
- 执行了什么操作；
- 哪个文件出现错误；
- 对应的状态码；
- 底层原始错误；
- 错误发生的位置；

就可以定义自定义错误类型。

例如：

```go
type ValidationError struct {
    Field   string
    Value   any
    Message string
}
```

实现 `Error` 方法：

```go
func (e *ValidationError) Error() string {
    return fmt.Sprintf(
        "validate %s=%v: %s",
        e.Field,
        e.Value,
        e.Message,
    )
}
```

返回错误：

```go
func ValidateAge(age int) error {
    if age < 0 {
        return &ValidationError{
            Field:   "age",
            Value:   age,
            Message: "must not be negative",
        }
    }

    return nil
}
```

---

### 13.5.2 使用 errors.As 获取具体错误类型

调用者可以使用 `errors.As` 检查错误链中是否包含指定类型的错误。

```go
package main

import (
    "errors"
    "fmt"
)

type ValidationError struct {
    Field   string
    Value   any
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf(
        "validate %s=%v: %s",
        e.Field,
        e.Value,
        e.Message,
    )
}

func ValidateAge(age int) error {
    if age < 0 {
        return &ValidationError{
            Field:   "age",
            Value:   age,
            Message: "must not be negative",
        }
    }

    return nil
}

func main() {
    err := ValidateAge(-10)
    if err == nil {
        return
    }

    var validationError *ValidationError

    if errors.As(err, &validationError) {
        fmt.Println("字段：", validationError.Field)
        fmt.Println("错误值：", validationError.Value)
        fmt.Println("原因：", validationError.Message)
        return
    }

    fmt.Println("其他错误：", err)
}
```

输出结果：

```text
字段： age
错误值： -10
原因： must not be negative
```

需要注意：

```go
var validationError *ValidationError
errors.As(err, &validationError)
```

传给 `errors.As` 的是 `&validationError`，其类型为：

```go
**ValidationError
```

这是因为 `errors.As` 需要通过这个指针修改变量，使其指向匹配到的错误对象。

---

### 13.5.3 Go 1.26 中的 errors.AsType

从 Go 1.26 开始，可以使用泛型函数 `errors.AsType` 简化类型错误的提取：

```go
validationError, ok := errors.AsType[*ValidationError](err)
if ok {
    fmt.Println(validationError.Field)
}
```

它与下面的传统写法作用相似：

```go
var validationError *ValidationError

if errors.As(err, &validationError) {
    fmt.Println(validationError.Field)
}
```

如果项目需要兼容 Go 1.25 或更早版本，应继续使用 `errors.As`。

---

### 13.5.4 自定义路径错误

下面的路径错误通过 `Unwrap` 保留底层错误：

```go
package main

import (
    "errors"
    "fmt"
    "os"
)

type PathError struct {
    Op   string
    Path string
    Err  error
}

func (e *PathError) Error() string {
    return fmt.Sprintf("%s %s: %v", e.Op, e.Path, e.Err)
}

func (e *PathError) Unwrap() error {
    return e.Err
}

func OpenFile(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return &PathError{
            Op:   "open",
            Path: path,
            Err:  err,
        }
    }

    defer file.Close()
    return nil
}

func main() {
    err := OpenFile("missing.txt")
    if err == nil {
        return
    }

    var pathError *PathError

    if errors.As(err, &pathError) {
        fmt.Println("操作：", pathError.Op)
        fmt.Println("路径：", pathError.Path)
        fmt.Println("原因：", pathError.Err)
        return
    }

    fmt.Println(err)
}
```

这里的 `PathError` 不仅包含错误文本，还保留了：

- 操作名称；
- 文件路径；
- 底层错误。

实现：

```go
func (e *PathError) Unwrap() error
```

以后，`errors.Is` 和 `errors.As` 就可以继续检查底层错误。

标准库中的 `os.PathError` 和 `fs.PathError` 采用了类似设计。

---

## 13.6 错误包装

### 13.6.1 为什么需要添加错误上下文

直接返回底层错误虽然简单，但调用者可能不知道错误发生在什么操作中。

例如：

```go
func LoadConfig(path string) ([]byte, error) {
    return os.ReadFile(path)
}
```

调用者可能只能看到：

```text
open config.json: no such file or directory
```

在复杂调用链中，应当逐层添加必要的操作上下文：

```go
func LoadConfig(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("load config %q: %w", path, err)
    }

    return data, nil
}
```

输出可能为：

```text
load config "config.json": open config.json: no such file or directory
```

这样更容易判断错误发生在哪个业务操作中。

---

### 13.6.2 使用 %w 包装错误

`fmt.Errorf` 中的 `%w` 用于包装另一个错误：

```go
return fmt.Errorf("load config: %w", err)
```

`%w` 在显示文本方面与 `%v` 类似，但它还保留了原错误，使 `errors.Is` 和 `errors.As` 可以继续检查错误链。

例如：

```go
var ErrInvalidConfig = errors.New("invalid config")

func ParseConfig() error {
    return fmt.Errorf("parse application config: %w", ErrInvalidConfig)
}
```

判断：

```go
err := ParseConfig()

if errors.Is(err, ErrInvalidConfig) {
    fmt.Println("配置内容不合法")
}
```

---

### 13.6.3 %v 与 %w 的区别

使用 `%v`：

```go
return fmt.Errorf("load config: %v", err)
```

只会把底层错误转换为文本，新错误不会保留底层错误关系。

使用 `%w`：

```go
return fmt.Errorf("load config: %w", err)
```

会保留错误链。

例如：

```go
var ErrNotFound = errors.New("not found")

err1 := fmt.Errorf("find user: %v", ErrNotFound)
err2 := fmt.Errorf("find user: %w", ErrNotFound)

fmt.Println(errors.Is(err1, ErrNotFound))
fmt.Println(errors.Is(err2, ErrNotFound))
```

输出结果：

```text
false
true
```

---

### 13.6.4 错误链

如果一个错误包装另一个错误，而内部错误又包装了其他错误，就形成了错误链。

```go
var ErrNotFound = errors.New("not found")

func QueryDatabase() error {
    return ErrNotFound
}

func FindUser() error {
    err := QueryDatabase()
    if err != nil {
        return fmt.Errorf("query user: %w", err)
    }

    return nil
}

func HandleRequest() error {
    err := FindUser()
    if err != nil {
        return fmt.Errorf("handle request: %w", err)
    }

    return nil
}
```

最终错误可能显示为：

```text
handle request: query user: not found
```

虽然最外层错误已经被包装多次，但仍然可以判断：

```go
if errors.Is(err, ErrNotFound) {
    fmt.Println("用户不存在")
}
```

---

### 13.6.5 errors.Unwrap

`errors.Unwrap` 可以获取错误直接包装的下一级错误：

```go
inner := errors.Unwrap(err)
```

示例：

```go
original := errors.New("original error")
wrapped := fmt.Errorf("operation failed: %w", original)

fmt.Println(wrapped)
fmt.Println(errors.Unwrap(wrapped))
```

输出：

```text
operation failed: original error
original error
```

实际代码中，如果只是判断某个错误值或错误类型，通常应优先使用：

```go
errors.Is
errors.As
```

它们会自动检查整条错误链。

`errors.Unwrap` 只调用：

```go
Unwrap() error
```

它不会展开实现了：

```go
Unwrap() []error
```

的多错误对象。

---

### 13.6.6 是否应该包装底层错误

使用 `%w` 不只是增加错误文本，它还会把底层错误暴露给调用者。

例如：

```go
return fmt.Errorf("query user: %w", sql.ErrNoRows)
```

调用者以后可能依赖：

```go
errors.Is(err, sql.ErrNoRows)
```

这意味着底层数据库错误成为了当前包的 API 行为之一。

如果以后把数据库实现换成其他存储方式，为了保持兼容，仍然可能需要模拟并返回同一种错误。

因此：

- 希望调用者能够判断底层错误时使用 `%w`；
- 不希望暴露内部实现细节时，可以转换为当前包自己的错误；
- 是否包装应当由 API 边界决定，而不是机械地对所有错误使用 `%w`。

例如，可以把数据库错误转换成当前包自己的哨兵错误：

```go
var ErrUserNotFound = errors.New("user not found")

func FindUser(id int) error {
    err := queryDatabase(id)

    if errors.Is(err, sql.ErrNoRows) {
        return fmt.Errorf("find user %d: %w", id, ErrUserNotFound)
    }

    if err != nil {
        return fmt.Errorf("find user %d: %v", id, err)
    }

    return nil
}
```

这样调用者只依赖当前包定义的 `ErrUserNotFound`，而不依赖数据库实现。

---

## 13.7 多错误处理

### 13.7.1 errors.Join

当一次操作可能产生多个相互独立的错误时，可以使用 `errors.Join` 将它们组合起来。

```go
package main

import (
    "errors"
    "fmt"
)

func main() {
    errRead := errors.New("read failed")
    errClose := errors.New("close failed")

    err := errors.Join(errRead, errClose)

    fmt.Println(err)
}
```

输出结果：

```text
read failed
close failed
```

组合后的错误仍然可以通过 `errors.Is` 判断其中的任意错误：

```go
fmt.Println(errors.Is(err, errRead))
fmt.Println(errors.Is(err, errClose))
```

输出：

```text
true
true
```

---

### 13.7.2 nil 错误会被忽略

`errors.Join` 会忽略所有 `nil` 错误：

```go
err := errors.Join(nil, errors.New("failed"), nil)
```

如果所有参数都是 `nil`：

```go
err := errors.Join(nil, nil)
```

结果也是 `nil`：

```go
fmt.Println(err == nil)
```

输出：

```text
true
```

---

### 13.7.3 收集多个验证错误

```go
package main

import (
    "errors"
    "fmt"
)

type User struct {
    Name string
    Age  int
    Email string
}

func ValidateUser(user User) error {
    var errs []error

    if user.Name == "" {
        errs = append(errs, errors.New("name is empty"))
    }

    if user.Age < 0 {
        errs = append(errs, errors.New("age must not be negative"))
    }

    if user.Email == "" {
        errs = append(errs, errors.New("email is empty"))
    }

    return errors.Join(errs...)
}

func main() {
    user := User{
        Age: -1,
    }

    err := ValidateUser(user)
    if err != nil {
        fmt.Println(err)
    }
}
```

输出结果：

```text
name is empty
age must not be negative
email is empty
```

适合使用多错误的场景包括：

- 表单或配置验证；
- 批量任务处理；
- 同时关闭多个资源；
- 多个并行任务失败；
- 清理阶段出现多个错误。

如果一个错误发生后后续操作已经没有意义，通常仍应立即返回，而不是继续收集错误。

---

### 13.7.4 处理资源关闭错误

资源的 `Close` 方法也可能返回错误。

如果函数主体和关闭资源都可能失败，可以组合两个错误：

```go
func WriteData(path string, data []byte) (err error) {
    file, err := os.Create(path)
    if err != nil {
        return fmt.Errorf("create file: %w", err)
    }

    defer func() {
        err = errors.Join(err, file.Close())
    }()

    if _, err = file.Write(data); err != nil {
        return fmt.Errorf("write file: %w", err)
    }

    return nil
}
```

这里使用命名返回值 `err`，延迟函数可以在函数返回前将文件关闭错误与原错误组合。

---

### 13.7.5 多个 %w

现代 Go 允许 `fmt.Errorf` 中出现多个 `%w`：

```go
err := fmt.Errorf(
    "operation failed: %w; cleanup failed: %w",
    errOperation,
    errCleanup,
)
```

生成的错误可以同时匹配两个底层错误：

```go
errors.Is(err, errOperation)
errors.Is(err, errCleanup)
```

不过，当代码明确需要组合多个独立错误时，`errors.Join` 通常表达得更加直接。

---

## 13.8 panic

### 13.8.1 panic 的作用

`panic` 是一个内置函数，其概念签名为：

```go
func panic(v any)
```

调用 `panic` 会立即停止当前函数后续普通语句的执行，并开始沿当前 goroutine 的调用栈向上展开。

展开过程中：

1. 执行当前函数中已经注册的 `defer`；
2. 当前函数停止执行；
3. 回到调用者；
4. 执行调用者中已经注册的 `defer`；
5. 继续向调用栈上层传播；
6. 如果一直没有被 `recover` 恢复，程序最终终止并输出 panic 信息和调用栈。

示例：

```go
package main

import "fmt"

func third() {
    defer fmt.Println("third defer")
    fmt.Println("third start")

    panic("something went wrong")

    // 不会执行
    fmt.Println("third end")
}

func second() {
    defer fmt.Println("second defer")
    fmt.Println("second start")

    third()

    // 不会执行
    fmt.Println("second end")
}

func first() {
    defer fmt.Println("first defer")
    fmt.Println("first start")

    second()

    // 不会执行
    fmt.Println("first end")
}

func main() {
    first()
}
```

输出顺序类似：

```text
first start
second start
third start
third defer
second defer
first defer
panic: something went wrong
```

---

### 13.8.2 运行时 panic

有些非法操作会由 Go 运行时自动触发 panic。

常见情况包括：

#### 13.8.2.1 数组或切片越界

```go
numbers := []int{1, 2, 3}

fmt.Println(numbers[10])
```

#### 13.8.2.2 向已经关闭的通道发送数据

```go
channel := make(chan int)

close(channel)

channel <- 1
```

运行时会触发类似：

```text
panic: send on closed channel
```

#### 13.8.2.3 关闭已经关闭的通道

```go
channel := make(chan int)

close(channel)
close(channel)
```

#### 13.8.2.4 关闭 nil 通道

```go
var channel chan int

close(channel)
```

#### 13.8.2.5 对 nil 指针进行解引用

```go
var user *User

fmt.Println(user.Name)
```

#### 13.8.2.6 类型断言失败

```go
var value any = "Go"

number := value.(int)
```

#### 13.8.2.7 整数除以零

```go
zero := 0

result := 10 / zero
```

这些错误通常意味着程序逻辑存在问题。

---

### 13.8.3 主动调用 panic

程序也可以主动调用 `panic`：

```go
func MustPositive(number int) int {
    if number <= 0 {
        panic("number must be positive")
    }

    return number
}
```

`panic` 的参数可以是任意类型：

```go
panic("message")
panic(100)
panic(errors.New("operation failed"))
panic(&CustomError{})
```

实际项目中通常传递：

- 字符串；
- `error`；
- 自定义错误类型。

---

### 13.8.4 panic(nil)

现代 Go 中，即使调用：

```go
panic(nil)
```

正在发生 panic 时，直接有效调用的 `recover` 也保证返回非 `nil` 值。

因此，不应使用下面的逻辑区分是否调用了 `panic(nil)`：

```go
value := recover()
if value == nil {
    // 错误地认为没有发生 panic
}
```

在当前 Go 版本中，只要 `recover` 被有效调用并成功捕获正在传播的 panic，其返回值就不是 `nil`。

尽管如此，代码仍然不应主动使用 `panic(nil)`，因为它不能表达任何有意义的错误原因。

---

## 13.9 recover

### 13.9.1 recover 的作用

`recover` 是一个内置函数，其概念签名为：

```go
func recover() any
```

`recover` 可以终止当前 goroutine 正在进行的 panic 展开过程，并取得传给 `panic` 的值。

典型写法：

```go
package main

import "fmt"

func Test() {
    defer func() {
        if value := recover(); value != nil {
            fmt.Println("捕获 panic：", value)
        }
    }()

    panic("test panic")
}

func main() {
    Test()
    fmt.Println("程序继续执行")
}
```

输出结果：

```text
捕获 panic： test panic
程序继续执行
```

---

### 13.9.2 recover 必须由延迟函数直接调用

`recover` 只有在当前 goroutine 正在 panic，并且由延迟执行的函数直接调用时，才能终止 panic。

有效写法：

```go
func Test() {
    defer func() {
        value := recover()
        fmt.Println(value)
    }()

    panic("test panic")
}
```

也可以把恢复逻辑写在普通函数中，并直接延迟调用该函数：

```go
func RecoverPanic() {
    fmt.Println(recover())
}

func Test() {
    defer RecoverPanic()

    panic("test panic")
}
```

这里的 `RecoverPanic` 本身就是被 `defer` 调用的函数，所以其中直接调用 `recover` 是有效的。

---

### 13.9.3 间接调用 recover 无效

下面的写法无效：

```go
func InnerRecover() {
    fmt.Println(recover())
}

func Test() {
    defer func() {
        InnerRecover()
    }()

    panic("test panic")
}
```

`recover` 不是由延迟函数直接调用，而是由延迟函数调用的另一个函数间接调用，因此返回 `nil`。

当前 panic 会继续向外传播。

同样，下面的写法也不能捕获 panic：

```go
func Test() {
    defer recover()

    panic("test panic")
}
```

虽然 `recover` 出现在 `defer` 后面，但它并不是被一个延迟函数直接调用的恢复逻辑，因此不会终止 panic。

最清晰和最常见的写法仍然是：

```go
defer func() {
    if value := recover(); value != nil {
        // 处理 panic
    }
}()
```

---

### 13.9.4 在非 panic 状态下调用 recover

如果当前 goroutine 没有正在发生 panic，`recover` 返回 `nil`：

```go
func main() {
    fmt.Println(recover())
}
```

输出：

```text
<nil>
```

因此，普通位置调用 `recover` 没有意义。

---

### 13.9.5 recover 后不会回到 panic 位置

观察下面的代码：

```go
package main

import "fmt"

func Test() {
    defer func() {
        if value := recover(); value != nil {
            fmt.Println("捕获：", value)
        }
    }()

    fmt.Println("panic 前")

    panic("failed")

    // 不会执行
    fmt.Println("panic 后")
}

func main() {
    Test()
    fmt.Println("返回 main")
}
```

输出：

```text
panic 前
捕获： failed
返回 main
```

恢复后：

- `Test` 中 `panic` 后面的代码不会继续执行；
- `Test` 执行剩余的延迟函数；
- `Test` 随后返回调用者；
- 调用者从调用 `Test` 之后继续执行。

因此，`recover` 不是“回到发生错误的地方继续运行”。

---

### 13.9.6 将代码限制在局部函数中

如果希望某段代码发生 panic 后，外层函数还能继续执行，可以把这段代码放进一个局部匿名函数中。

```go
package main

import "fmt"

func Calculate(x, y int) {
    result := 0

    func() {
        defer func() {
            if value := recover(); value != nil {
                fmt.Println("计算失败：", value)
                result = 0
            }
        }()

        result = x / y
    }()

    fmt.Println("结果：", result)
    fmt.Println("外层函数继续执行")
}

func main() {
    Calculate(10, 0)
}
```

输出类似：

```text
计算失败： runtime error: integer divide by zero
结果： 0
外层函数继续执行
```

匿名函数因为 panic 而提前返回，但外层 `Calculate` 函数仍然可以继续执行。

不过，对于除数为零这种可预期错误，更合理的方式仍然是返回 `error`：

```go
func Divide(x, y int) (int, error) {
    if y == 0 {
        return 0, ErrDivByZero
    }

    return x / y, nil
}
```

---

## 13.10 将 panic 转换为 error

某些包可能在内部使用 `panic` 简化深层递归代码的退出流程，但应当在对外 API 边界恢复，并转换为普通 `error`。

```go
package main

import (
    "fmt"
)

type ParseError struct {
    Message string
}

func (e *ParseError) Error() string {
    return e.Message
}

func parseInternal(input string) string {
    if input == "" {
        panic(&ParseError{
            Message: "input is empty",
        })
    }

    return input
}

func Parse(input string) (result string, err error) {
    defer func() {
        value := recover()
        if value == nil {
            return
        }

        parseError, ok := value.(*ParseError)
        if !ok {
            // 不是本函数预期处理的 panic，继续向外传播
            panic(value)
        }

        result = ""
        err = parseError
    }()

    result = parseInternal(input)
    return result, nil
}

func main() {
    result, err := Parse("")
    if err != nil {
        fmt.Println("解析失败：", err)
        return
    }

    fmt.Println(result)
}
```

这个模式有两个重要特点：

1. 只恢复包内部明确预期的 panic；
2. 对于数组越界、nil 指针等意外 panic，重新调用 `panic` 继续传播。

不推荐无差别吞掉所有 panic：

```go
defer func() {
    recover()
}()
```

这种写法会隐藏真正的程序缺陷，使问题更难定位。

---

## 13.11 panic 与 goroutine

### 13.11.1 recover 只能恢复同一个 goroutine 的 panic

`recover` 不能跨 goroutine 捕获 panic。

下面的代码无法在 `main` goroutine 中捕获子 goroutine 的 panic：

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    defer func() {
        if value := recover(); value != nil {
            fmt.Println("main 捕获：", value)
        }
    }()

    go func() {
        panic("goroutine panic")
    }()

    time.Sleep(time.Second)
}
```

子 goroutine 的 panic 必须在子 goroutine 内部恢复。

---

### 13.11.2 在 goroutine 入口设置恢复边界

```go
package main

import (
    "fmt"
    "sync"
)

func SafeRun(task func()) {
    defer func() {
        if value := recover(); value != nil {
            fmt.Println("任务发生 panic：", value)
        }
    }()

    task()
}

func main() {
    var waitGroup sync.WaitGroup

    waitGroup.Add(1)

    go func() {
        defer waitGroup.Done()

        SafeRun(func() {
            panic("worker failed")
        })
    }()

    waitGroup.Wait()

    fmt.Println("主程序继续执行")
}
```

输出：

```text
任务发生 panic： worker failed
主程序继续执行
```

服务器、任务调度器和 worker pool 可能会在 goroutine 入口设置恢复边界，防止某个任务的 panic 直接终止整个进程。

但是，恢复之后还需要：

- 记录错误；
- 记录调用栈；
- 清理资源；
- 标记任务失败；
- 根据业务决定是否重试；
- 避免继续使用可能已经损坏的状态。

---

### 13.11.3 记录 panic 调用栈

单纯打印 panic 值通常不足以定位问题。

可以使用 `runtime/debug.Stack` 获取当前调用栈：

```go
package main

import (
    "fmt"
    "runtime/debug"
)

func SafeRun(task func()) {
    defer func() {
        if value := recover(); value != nil {
            fmt.Printf(
                "panic: %v\n%s",
                value,
                debug.Stack(),
            )
        }
    }()

    task()
}

func main() {
    SafeRun(func() {
        panic("task failed")
    })
}
```

在生产环境中，panic 日志通常至少应包含：

- panic 值；
- 调用栈；
- 请求或任务标识；
- 相关操作上下文。

---

## 13.12 defer 中再次发生 panic

当函数正在处理一个 panic 时，延迟函数中又发生新的 panic，会让控制流程更加复杂。

例如：

```go
func Test() {
    defer func() {
        fmt.Println("恢复：", recover())
    }()

    defer func() {
        panic("panic in defer")
    }()

    panic("original panic")
}
```

后注册的延迟函数先执行：

```go
defer func() {
    panic("panic in defer")
}()
```

它又触发了一个新的 panic。随后前面的恢复函数看到的是当前正在传播的 panic。

不要依赖多个 panic 相互覆盖或嵌套时的具体结果来编写业务逻辑。

更合理的原则是：

- 延迟清理函数应尽量简单；
- 清理函数应避免主动调用 `panic`；
- 如果清理操作可能失败，优先返回或组合 `error`；
- 恢复函数本身也应避免再次发生 panic。

---

## 13.13 error 与 panic 的使用边界

### 13.13.1 应当返回 error 的情况

以下情况通常应当返回 `error`：

- 用户输入不合法；
- 文件不存在；
- 网络请求失败；
- 数据库查询失败；
- 数据格式错误；
- 权限不足；
- 配置文件内容错误；
- 外部服务不可用；
- 操作超时；
- 业务规则校验失败。

这些错误都是程序运行过程中可以合理预期的失败。

例如，负数半径应返回错误，而不是 panic：

```go
func CircleArea(radius float64) (float64, error) {
    if radius < 0 {
        return 0, fmt.Errorf(
            "radius must not be negative: %v",
            radius,
        )
    }

    return math.Pi * radius * radius, nil
}
```

调用者可以决定：

- 向用户提示；
- 修改输入；
- 使用默认值；
- 重试；
- 返回上层；
- 记录日志。

---

### 13.13.2 可以考虑 panic 的情况

以下情况可以考虑使用 `panic`：

1. 程序内部出现理论上不可能发生的状态；
2. 违反了必须成立的内部不变量；
3. 初始化阶段缺少程序运行必需的资源；
4. `Must` 风格函数无法完成操作；
5. 包内部使用 panic 展开复杂递归，但在公共 API 边界转换为 error；
6. 明显的程序员使用错误，继续执行没有意义。

例如：

```go
func MustCompilePattern(pattern string) *regexp.Regexp {
    compiled, err := regexp.Compile(pattern)
    if err != nil {
        panic(err)
    }

    return compiled
}
```

标准库通常会提供两种形式：

```go
regexp.Compile(pattern)
regexp.MustCompile(pattern)
```

其中：

- `Compile` 返回 `error`；
- `MustCompile` 失败时调用 `panic`。

`Must` 形式通常用于程序员在代码中写死、并且启动前就应当保证正确的数据。

例如：

```go
var emailPattern = regexp.MustCompile(
    `^[^@\s]+@[^@\s]+\.[^@\s]+$`,
)
```

如果表达式是用户运行时输入的，则不应使用 `MustCompile`。

---

### 13.13.3 选择原则

可以使用下面的问题帮助判断：

#### 13.13.3.1 错误是否由外部输入或环境导致？

如果是，通常返回 `error`。

#### 13.13.3.2 调用者是否可能恢复、重试或采取替代方案？

如果是，应返回 `error`。

#### 13.13.3.3 错误是否表示程序自身存在缺陷？

如果是，可以考虑 `panic`。

#### 13.13.3.4 继续运行是否可能破坏数据或违反核心约束？

如果是，可以考虑停止当前流程。

#### 13.13.3.5 这是公共库的 API 吗？

公共库通常应尽量返回 `error`，把最终处理决定交给调用者。

可以概括为：

> 可预期的失败返回 error，违反程序内部基本假设的状态才考虑 panic。

---

## 13.14 常见错误处理模式

### 13.14.1 添加上下文后返回

```go
func LoadUser(path string) (*User, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf(
            "read user file %q: %w",
            path,
            err,
        )
    }

    var user User

    if err := json.Unmarshal(data, &user); err != nil {
        return nil, fmt.Errorf(
            "decode user file %q: %w",
            path,
            err,
        )
    }

    return &user, nil
}
```

错误信息逐层描述正在执行的操作。

---

### 13.14.2 识别错误后采取不同操作

```go
user, err := repository.FindUser(id)
if err != nil {
    switch {
    case errors.Is(err, ErrUserNotFound):
        return showNotFound()

    case errors.Is(err, context.DeadlineExceeded):
        return showTimeout()

    default:
        return fmt.Errorf("find user %d: %w", id, err)
    }
}
```

---

### 13.14.3 返回部分结果和错误

有些函数可能同时返回部分结果和错误。

例如，`io.Reader.Read` 可能同时返回：

```go
n > 0
err == io.EOF
```

因此，调用标准库 API 时应根据它的文档判断返回值是否仍然有效。

不能机械地认为：

```go
err != nil
```

时其他返回值一定毫无意义。

对于自己设计的 API，也应在文档中明确说明：

- 出错时是否可能返回部分结果；
- 部分结果是否可以继续使用；
- 调用者应先处理结果还是错误。

---

### 13.14.4 重试可恢复错误

```go
func Retry(
    attempts int,
    operation func() error,
) error {
    var errs []error

    for attempt := 1; attempt <= attempts; attempt++ {
        err := operation()
        if err == nil {
            return nil
        }

        errs = append(
            errs,
            fmt.Errorf("attempt %d: %w", attempt, err),
        )
    }

    return fmt.Errorf(
        "operation failed after %d attempts: %w",
        attempts,
        errors.Join(errs...),
    )
}
```

实际项目中还需要考虑：

- 是否所有错误都适合重试；
- 重试间隔；
- 指数退避；
- 上下文取消；
- 最大执行时间；
- 操作是否具有幂等性。

---

## 13.15 常见错误与反模式

### 13.15.1 使用 panic 处理普通业务错误

不推荐：

```go
func FindUser(id int) User {
    user, ok := users[id]
    if !ok {
        panic("user not found")
    }

    return user
}
```

推荐：

```go
func FindUser(id int) (User, error) {
    user, ok := users[id]
    if !ok {
        return User{}, ErrUserNotFound
    }

    return user, nil
}
```

用户不存在是可以预期的业务情况，不应该导致整个调用栈进入 panic。

---

### 13.15.2 模仿 try/catch

下面的代码试图使用 `panic/recover` 模仿 `try/catch`：

```go
func Try(
    operation func(),
    handler func(any),
) {
    defer func() {
        if value := recover(); value != nil {
            handler(value)
        }
    }()

    operation()
}
```

调用：

```go
Try(
    func() {
        panic("failed")
    },
    func(value any) {
        fmt.Println(value)
    },
)
```

虽然这种写法可以运行，但不符合 Go 的常规错误处理方式。

它会带来以下问题：

- 错误控制流不明确；
- 调用者无法通过函数签名知道操作可能失败；
- 容易误捕获真正的程序缺陷；
- 容易丢失静态类型信息；
- 不利于使用 `errors.Is` 和 `errors.As`；
- 使代码风格与标准库严重不一致。

普通操作应写成：

```go
func Operation() error {
    return errors.New("failed")
}

func main() {
    if err := Operation(); err != nil {
        fmt.Println(err)
    }
}
```

---

### 13.15.3 捕获后什么都不做

不推荐：

```go
defer func() {
    recover()
}()
```

这样会无声地隐藏 panic。

至少应当：

- 记录 panic 值；
- 记录调用栈；
- 标记当前操作失败；
- 清理相关资源；
- 只捕获确定可以隔离的边界。

---

### 13.15.4 同时记录并返回同一个错误

例如：

```go
func LoadConfig() error {
    data, err := os.ReadFile("config.json")
    if err != nil {
        log.Println(err)
        return err
    }

    _ = data
    return nil
}
```

如果每一层都记录并返回，最终可能出现多条重复日志。

通常：

- 底层函数添加上下文并返回；
- 最终负责处理错误的边界统一记录。

例如：

```go
func LoadConfig() error {
    data, err := os.ReadFile("config.json")
    if err != nil {
        return fmt.Errorf("read config: %w", err)
    }

    _ = data
    return nil
}

func main() {
    if err := LoadConfig(); err != nil {
        log.Println(err)
    }
}
```

---

### 13.15.5 丢失原始错误

不推荐：

```go
if err != nil {
    return errors.New("read failed")
}
```

调用者无法知道底层失败原因。

如果应当保留底层错误：

```go
if err != nil {
    return fmt.Errorf("read failed: %w", err)
}
```

如果不希望暴露实现细节，可以转换为当前包定义的错误：

```go
if err != nil {
    return fmt.Errorf("read failed: %w", ErrStorage)
}
```

---

### 13.15.6 对错误字符串进行判断

不推荐：

```go
if strings.Contains(err.Error(), "not found") {
    // ...
}
```

推荐：

```go
if errors.Is(err, ErrNotFound) {
    // ...
}
```

或者：

```go
var pathError *os.PathError

if errors.As(err, &pathError) {
    // ...
}
```

---

### 13.15.7 返回带有 nil 指针的 error 接口

观察下面的代码：

```go
type AppError struct {
    Message string
}

func (e *AppError) Error() string {
    if e == nil {
        return "<nil>"
    }

    return e.Message
}

func BadOperation() error {
    var appError *AppError = nil

    return appError
}
```

调用：

```go
err := BadOperation()

fmt.Println(err == nil)
```

输出：

```text
false
```

虽然 `appError` 是 nil 指针，但返回后的 `error` 接口中包含：

```text
动态类型：*AppError
动态值：nil
```

因此接口本身不等于 `nil`。

正确写法：

```go
func GoodOperation() error {
    var appError *AppError = nil

    if appError == nil {
        return nil
    }

    return appError
}
```

更常见的情况是直接在成功路径返回无类型的 `nil`：

```go
func GoodOperation() error {
    return nil
}
```

---

## 13.16 一个完整示例

下面通过读取用户配置演示错误创建、包装、错误类型和错误判断。

```go
package main

import (
    "encoding/json"
    "errors"
    "fmt"
    "os"
)

var ErrInvalidConfig = errors.New("invalid config")

type Config struct {
    Host string `json:"host"`
    Port int    `json:"port"`
}

type ConfigError struct {
    Path string
    Err  error
}

func (e *ConfigError) Error() string {
    return fmt.Sprintf(
        "config %q: %v",
        e.Path,
        e.Err,
    )
}

func (e *ConfigError) Unwrap() error {
    return e.Err
}

func ValidateConfig(config Config) error {
    var errs []error

    if config.Host == "" {
        errs = append(
            errs,
            fmt.Errorf("host is empty: %w", ErrInvalidConfig),
        )
    }

    if config.Port < 1 || config.Port > 65535 {
        errs = append(
            errs,
            fmt.Errorf(
                "port %d is outside 1-65535: %w",
                config.Port,
                ErrInvalidConfig,
            ),
        )
    }

    return errors.Join(errs...)
}

func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, &ConfigError{
            Path: path,
            Err:  err,
        }
    }

    var config Config

    if err := json.Unmarshal(data, &config); err != nil {
        return nil, &ConfigError{
            Path: path,
            Err: fmt.Errorf(
                "decode JSON: %w",
                err,
            ),
        }
    }

    if err := ValidateConfig(config); err != nil {
        return nil, &ConfigError{
            Path: path,
            Err:  err,
        }
    }

    return &config, nil
}

func main() {
    config, err := LoadConfig("config.json")
    if err != nil {
        switch {
        case errors.Is(err, os.ErrNotExist):
            fmt.Println("配置文件不存在")

        case errors.Is(err, ErrInvalidConfig):
            fmt.Println("配置内容不合法：", err)

        default:
            var configError *ConfigError

            if errors.As(err, &configError) {
                fmt.Println(
                    "配置文件处理失败：",
                    configError.Path,
                )
                fmt.Println("原因：", configError.Err)
                return
            }

            fmt.Println("未知错误：", err)
        }

        return
    }

    fmt.Printf("配置加载成功：%+v\n", config)
}
```

这个示例体现了以下设计：

1. 使用 `error` 返回可预期失败；
2. 使用自定义错误保存文件路径；
3. 使用 `Unwrap` 保留底层错误；
4. 使用 `%w` 构造错误链；
5. 使用 `errors.Is` 判断错误语义；
6. 使用 `errors.As` 获取具体错误类型；
7. 使用 `errors.Join` 返回多个验证错误；
8. 没有使用 `panic` 处理普通文件和配置错误。

---

## 总结

### 普通错误

```go
func Operation() (Result, error)
```

成功：

```go
return result, nil
```

失败：

```go
return zeroValue, err
```

调用：

```go
result, err := Operation()
if err != nil {
    return err
}
```

---

### 创建错误

固定文本：

```go
errors.New("operation failed")
```

包含变量：

```go
fmt.Errorf("invalid value %d", value)
```

---

### 包装错误

```go
fmt.Errorf("read config: %w", err)
```

保留底层错误，并允许：

```go
errors.Is
errors.As
```

继续检查。

---

### 判断错误值

```go
errors.Is(err, ErrNotFound)
```

不要依赖：

```go
err.Error() == "not found"
```

---

### 判断错误类型

兼容广泛版本的写法：

```go
var target *CustomError

if errors.As(err, &target) {
    // 使用 target
}
```

Go 1.26 及以上：

```go
target, ok := errors.AsType[*CustomError](err)
```

---

### 组合多个错误

```go
err := errors.Join(err1, err2, err3)
```

所有参数为 `nil` 时返回 `nil`。

---

### panic 的传播

```text
调用 panic
    ↓
停止当前函数的普通代码
    ↓
逆序执行当前函数的 defer
    ↓
向调用者传播
    ↓
继续逆序执行调用者的 defer
    ↓
被 recover 终止，或者程序退出
```

---

### recover 的生效条件

```go
defer func() {
    if value := recover(); value != nil {
        // 处理 panic
    }
}()
```

必须满足：

1. 当前 goroutine 正在 panic；
2. `recover` 由被延迟执行的函数直接调用；
3. `recover` 与 panic 位于同一个 goroutine。

---

### error 与 panic 的选择

```text
可预期、可处理、可能恢复的失败：
    返回 error

违反程序内部基本约束、无法安全继续：
    考虑 panic

公共 API：
    通常返回 error

内部使用 panic：
    应在包边界恢复并转换为 error
```

## 参考资料

- [errors 标准库文档](https://pkg.go.dev/errors)
- [Go 1.26 发布说明：errors.AsType](https://go.dev/doc/go1.26#errors)
