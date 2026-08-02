
> 今天毛毛张要分享的内容是LeetCode的刷题笔记，主要介绍的二叉树的路径的遍历，毛毛张试图通过一种方法能尽力做类似的题目，达到举一反三的目的

[TOC]

# 1.概述

## 1.1 题目

- LeetCode题目链接：
    - Problem: [257. 二叉树的所有路径](https://leetcode.cn/problems/binary-tree-paths/)
    - Problem: [112. 路径总和](https://leetcode.cn/problems/path-sum/)
    - Problem:[113. 路径总和 II](https://leetcode.cn/problems/path-sum-ii/)
    - Problem:[437. 路径总和 III](https://leetcode.cn/problems/path-sum-iii/)
    
- 这四个题目的本质是一样的，毛毛张认为可以放在一起总结，毛毛张在这里以[257. 二叉树的所有路径](https://leetcode.cn/problems/binary-tree-paths/)为例进行思路的分析，只要理解的了这个题的思路，就可以用这个思路去做另外几道道题目。题目说明如下：

    > 给定一个二叉树，返回所有从根节点到叶子节点的路径。
    >
    > 说明: 叶子节点是指没有子节点的节点。
    >
    > 示例: 
    >
    > ![257.二叉树的所有路径1](https://code-thinking-1253855093.file.myqcloud.com/pics/2021020415161576.png)

- 思路：毛毛张在这里根据[代码随想录](https://programmercarl.com/0257.%E4%BA%8C%E5%8F%89%E6%A0%91%E7%9A%84%E6%89%80%E6%9C%89%E8%B7%AF%E5%BE%84.html#%E6%80%9D%E8%B7%AF)的思路结合Java代码进行完善和补充

    > 这道题目要求从根节点到叶子的路径，所以需要前序遍历，这样才方便让父节点指向孩子节点，找到对应的路径。
    >
    > 在这道题目中将第一次涉及到回溯，因为我们要把路径记录下来，需要回溯来回退一个路径再进入另一个路径
    >
    > 前序遍历以及回溯的过程如图：
    >
    > ![image-20240520195313697](../../assets/image-20240520195313697.png)
    >
    > 我们先使用递归的方式，来做前序遍历。**要知道递归和回溯就是一家的，本题也需要回溯**

## 1.2 递归

我们在这里依旧遵循代码随想录中的递归方法论：三步走原则

1.首先确定递归函数的形参和返回值：要传入根节点，记录每一条路径的`path`，和存放结果集的`result`，这里递归不需要返回值，代码如下：这里使用`List<Integer>`结构`path`来记录路径，所以要把`List<Integer>`结构的`path`转为`String`格式，再把这个`String`放进`result`里。因为在下面处理单层递归逻辑的时候，要做回溯，使用`List<Integer>`方便来做回溯。

```java
public void getPath(TreeNode node,List<Integer> path,List<String> result)
```

2.确定递归终止条件：毛毛张的这一步的递归终止条件的确定和代码随想录中的有区别

- 终止条件1：当根节点为空

    ```java
    if (node == NULL) {
        return;
    }
    ```

- 终止条件2：当遇到叶子节点，因为本题要找到叶子节点，就开始结束的处理逻辑了，把路径放进`result`里。

    ```java
    if (node.left == NULL && node.right == NULL) {
        终止处理逻辑;
        return;   
    }
    ```

- 接下来我们来看终止处理逻辑：这里我们先使用`List<Integer>`结构的`path`容器来记录路径，那么终止处理逻辑如下：

    ```java
    //前序遍历
    path.add(node.val);
    //终止条件2
    //遇到叶子节点，说明已经遍历了一条路径了
    if(node.left == null && node.right == null){
        //开始拼接字符串
        StringBuilder sb = new StringBuilder();
        for(int i =0;i < path.size();i++){
            if(i != path.size()-1){
                sb.append(path.get(i) + "->");
            }else{
                sb.append(path.get(i));
            }
        }
        result.add(sb.toString());
        return;
    }
    ```

3.确定单层递归逻辑：因为是前序遍历，需要先处理中间节点，中间节点在终止条件2中处理了，然后是递归和回溯的过程，在这里递归的时候，如果为空就不进行下一层递归了，终止条件1仅仅是判断根节点是否为空，所以递归前要加上判断语句，下面要递归的节点是否为空，如下：

```text
if (node.left != null) {
    traversal(node.left, path, result);
}
if (node.right != null) {
    traversal(node.right, path, result);
}
```

这一步我们只做了递归，我们会发现随着不断的递归，`path`集合会一直添加节点，我们来看这个状态，程序在前序遍历的过程中，递归两次之后，path的状态如下

[1,2]

接下首先判断左节点是否为空，此时左节点不为空，那么继续递归，进入左子树，此时左子树仅一个节点，就是`1号节点`，递归进入之后，此时path集合状态如下：

[1,2,3]





它还要删节点，然后才能加入新的节点。

那么回溯要怎么回溯呢，一些同学会这么写，如下：

```cpp
if (node.left) {
    traversal(node.left, path, result);
}
if (node.right) {
    traversal(node.right, path, result);
}
path.pop_back();
```

这个回溯就有很大的问题，我们知道，**回溯和递归是一一对应的，有一个递归，就要有一个回溯**，这么写的话相当于把递归和回溯拆开了， 一个在花括号里，一个在花括号外。

**所以回溯要和递归永远在一起，世界上最遥远的距离是你在花括号里，而我在花括号外！**

那么代码应该这么写：

```cpp
if (cur->left) {
    traversal(cur->left, path, result);
    path.pop_back(); // 回溯
}
if (cur->right) {
    traversal(cur->right, path, result);
    path.pop_back(); // 回溯
}
```

那么本题整体代码如下：

```cpp
class Solution {
    /**
     * 递归法
     */
    public List<String> binaryTreePaths(TreeNode root) {
        //1.首先创建于一个列表接收返回结果
        List<String> result = new ArrayList<>();
        //2.创建中间变量存储递归的值
        List<Integer> paths = new ArrayList<>();
        //3.开始递归
        //递归方法论
        //确定形参和返回值
        getPath(root,paths,result);
        return result;
    }

    public void getPath(TreeNode node,List<Integer> paths,List<String> result){
        //确定终止条件
        //终止条件1
        if(node == null){
            return; 
        }
        //前序遍历
        paths.add(node.val);
        //终止条件2
        //遇到叶子节点，说明已经遍历了一条路径了
        if(node.left == null && node.right == null){
            //开始拼接字符串
            StringBuilder sb = new StringBuilder();
            for(int i =0;i < paths.size();i++){
                if(i != paths.size()-1){
                    sb.append(paths.get(i) + "->");
                }else{
                    sb.append(paths.get(i));
                }
            }
            result.add(sb.toString());
            return;
        }

        //确定单层递归逻辑
        //说明不是叶子节点
        if(node.left != null){
            //继续遍历
            getPath(node.left,paths,result);
            //遍历返回之后，说明到了叶子节点，此时需要返回
            paths.remove(paths.size()-1);
        }

        //说明不是叶子节点
        if(node.right != null){
            //继续遍历
            getPath(node.right,paths,result);
            //遍历返回之后，说明到了叶子节点，此时需要返回
            paths.remove(paths.size()-1);
        }
    }
}
```

如上的C++代码充分体现了回溯。

那么如上代码可以精简成如下代码：

```cpp
class Solution {
private:

    void traversal(TreeNode* cur, string path, vector<string>& result) {
        path += to_string(cur->val); // 中
        if (cur->left == NULL && cur->right == NULL) {
            result.push_back(path);
            return;
        }
        if (cur->left) traversal(cur->left, path + "->", result); // 左
        if (cur->right) traversal(cur->right, path + "->", result); // 右
    }

public:
    vector<string> binaryTreePaths(TreeNode* root) {
        vector<string> result;
        string path;
        if (root == NULL) return result;
        traversal(root, path, result);
        return result;

    }
};
```

## 迭代



#  2.[257. 二叉树的所有路径](https://leetcode.cn/problems/binary-tree-paths/)

## 2.1 题目描述

给你一个二叉树的根节点 `root` ，按 **任意顺序** ，返回所有从根节点到叶子节点的路径。

**叶子节点** 是指没有子节点的节点。

**示例 1：**

![img](https://assets.leetcode.com/uploads/2021/03/12/paths-tree.jpg)

```
输入：root = [1,2,3,null,5]
输出：["1->2->5","1->3"]
```

**示例 2：**

```
输入：root = [1]
输出：["1"]
```

 

**提示：**

- 树中节点的数目在范围 `[1, 100]` 内
- `-100 <= Node.val <= 100`



## 2.1 递归法



### 2.1.1 方法1：毛毛张的方法

```java
class Solution {
    /**
     * 递归法
     */
    public List<String> binaryTreePaths(TreeNode root) {
        //1.首先创建于一个列表接收返回结果
        List<String> result = new ArrayList<>();
        //2.创建中间变量存储递归的值
        List<Integer> paths = new ArrayList<>();
        //3.开始递归
        //递归方法论
        //确定形参和返回值
        getPath(root,paths,result);
        return result;
    }

    public void getPath(TreeNode node,List<Integer> paths,List<String> result){
        //确定终止条件
        //终止条件1
        if(node == null){
            return; 
        }
        //前序遍历
        paths.add(node.val);
        //终止条件2
        //遇到叶子节点，说明已经遍历了一条路径了
        if(node.left == null && node.right == null){
            //开始拼接字符串
            StringBuilder sb = new StringBuilder();
            for(int i =0;i < paths.size();i++){
                if(i != paths.size()-1){
                    sb.append(paths.get(i) + "->");
                }else{
                    sb.append(paths.get(i));
                }
            }
            result.add(sb.toString());
            return;
        }

        //确定单层递归逻辑
        //说明不是叶子节点
        if(node.left != null){
            //继续遍历
            getPath(node.left,paths,result);
            //遍历返回之后，说明到了叶子节点，此时需要返回
            paths.remove(paths.size()-1);
        }

        //说明不是叶子节点
        if(node.right != null){
            //继续遍历
            getPath(node.right,paths,result);
            //遍历返回之后，说明到了叶子节点，此时需要返回
            paths.remove(paths.size()-1);
        }
    }
}
```





### 2.1.2 方法2：优化

```java
class Solution {
    /**
     * 递归法
     */

    //1.首先创建于一个列表接收返回结果
    List<String> result = new ArrayList<>();
    public List<String> binaryTreePaths(TreeNode root) {
        getPath(root,"");
        return result;
    }

    public void getPath(TreeNode node,String s){
        if(node == null){
            return;
        }
        //判断叶子节点
        if(node.left == null && node.right == null){
            result.add(new StringBuilder(s).append(node.val).toString());
            return;
        }

        //如果不是叶子节点进行遍历
        if(node.left != null ){
            //继续进行遍历
            getPath(node.left,new StringBuilder(s).append(node.val).append("->").toString());
        }
        if(node.right != null ){
            //继续进行遍历
            getPath(node.right,new StringBuilder(s).append(node.val).append("->").toString());
        }
    }

}
```





## 2.2 迭代法

```java
class Solution {
    //迭代法:前序遍历
    public List<String> binaryTreePaths(TreeNode root) {
        //迭代法 借助栈
        //1.创建对返回值
        List<String> result = new ArrayList<>();
        //2.判断特殊情况
        if(root == null){
            return result;
        }
        //3.创建栈存放中间节点
        Stack<Object> stack = new Stack<>();
        
        stack.push(root);
        stack.push(root.val + "");
        while(!stack.isEmpty()){
            //获取当前处理的结点
            String s = (String) stack.pop();
            TreeNode cur = (TreeNode) stack.pop();
            
            //遇到叶子结点
            if(cur.left == null && cur.right == null){
                result.add(s);
            }

            if(cur.right != null){
                stack.push(cur.right);
                stack.push(s + "->" +cur.right.val);
            }
            if(cur.left != null){
                stack.push(cur.left);
                stack.push(s +"->"+ cur.left.val);
            }
        }

        return result;
    }
}

```





统一迭代法

```java
class Solution {
    //统一迭代法 前序遍历
    public List<String> binaryTreePaths(TreeNode root) {
        //迭代法 借助栈
        //1.创建对返回值
        List<String> result = new ArrayList<>();
        //2.判断特殊情况
        if(root == null){
            return result;
        }
        //3.创建栈存放中间节点
        Stack<Object> stack = new Stack<>();
        stack.push(root.val + "");
        stack.push(root);
        //中间路径字符串
        String s = new String();
        while(!stack.isEmpty()){
            TreeNode cur = (TreeNode) stack.peek();
            //判断当前节点是否为空
            if(cur != null){
                //先把其中间结点弹出，重新摆放
                cur = (TreeNode) stack.pop();
                s = (String) stack.pop();

                //右
                if(cur.right != null){
                    stack.push(s + "->" +cur.right.val);
                    stack.push(cur.right);
                }
                //左
                if(cur.left != null){
                    stack.push(s +"->"+ cur.left.val);
                    stack.push(cur.left);
                }

                //中
                stack.push(s);
                stack.push(cur);
                stack.push(null);
            }
            else{
                //弹出前面的null
                stack.pop();
                //获取当前处理的结点
                cur = (TreeNode) stack.pop();
                s = (String) stack.pop();
                //遇到叶子结点
                if(cur.left == null && cur.right == null){
                    result.add(s);
                }
            }
        }
        return result;
    }
}
```







# 3.[112. 路径总和1](https://leetcode.cn/problems/path-sum/)

## 3.1 题目描述

给你二叉树的根节点 `root` 和一个表示目标和的整数 `targetSum` 。判断该树中是否存在 **根节点到叶子节点** 的路径，这条路径上所有节点值相加等于目标和 `targetSum` 。如果存在，返回 `true` ；否则，返回 `false` 。

**叶子节点** 是指没有子节点的节点。

 

**示例 1：**

![img](https://assets.leetcode.com/uploads/2021/01/18/pathsum1.jpg)

```
输入：root = [5,4,8,11,null,13,4,7,2,null,null,null,1], targetSum = 22
输出：true
解释：等于目标和的根节点到叶节点路径如上图所示。
```

**示例 2：**

![img](https://assets.leetcode.com/uploads/2021/01/18/pathsum2.jpg)

```
输入：root = [1,2,3], targetSum = 5
输出：false
解释：树中存在两条根节点到叶子节点的路径：
(1 --> 2): 和为 3
(1 --> 3): 和为 4
不存在 sum = 5 的根节点到叶子节点的路径。
```

**示例 3：**

```
输入：root = [], targetSum = 0
输出：false
解释：由于树是空的，所以不存在根节点到叶子节点的路径。
```

 

**提示：**

- 树中节点的数目在范围 `[0, 5000]` 内
- `-1000 <= Node.val <= 1000`
- `-1000 <= targetSum <= 1000`

## 3.1 递归法

### 3.1.1 方法1：毛毛张的方法

```java
class Solution {
    public boolean hasPathSum(TreeNode root, int targetSum) {
       //创建中间路径
        List<Integer> paths = new ArrayList<>();
        boolean result = function(root,paths,targetSum);
        return result;   
    }

    //递归方法
    //确定形参和返回值
    public boolean function(TreeNode node,List<Integer> paths,int SUM){
        //确定终止条件
        if(node == null){
            return false;
        }
        

        //确定单层递归逻辑
        //添加节点的值
        paths.add(node.val);        
        //如果遇到叶子节点计算路径总和
        if(node.left == null && node.right == null){
            //开始计算路径总和
            int total = 0;
            for(int i =0;i<paths.size();i++){
                total += paths.get(i);
            }
            if(total == SUM){
                return true;
            }
            else{
                return false;
            }
        }

        //创建结果返回值
        boolean result_left = false;
        boolean result_right = false;
    
        //如果不是叶子节点，继续递归
        //递归左节点
        if(node.left != null){
            result_left = function(node.left,paths,SUM);
            paths.remove(paths.size()-1);//回溯
        }
        //递归右节点
        if(node.right != null){
            result_right =  function(node.right,paths,SUM);
            paths.remove(paths.size()-1);//回溯
        }
        return result_left || result_right;
    } 
}
```



### 3.1.2 优化1

```java
class Solution {
    public boolean hasPathSum(TreeNode root, int targetSum) {
       if(root == null) return false;
       return traversal(root,targetSum);  
    }

    //递归法 三步走
    //1.确定形参和返回值
    public boolean traversal(TreeNode cur,int target){
        //2.确定终止条件
        //中
        //遇到叶子结点且和等于target
        if(cur.left == null && cur.right == null && target - cur.val == 0) return true;
        //遇到叶子结点但是和不等于target，那说明这条路径不符合条件
        if(cur.left == null && cur.right == null) return false;

        //3.确定单层递归逻辑
        //左节点不为空就继续判断
        if(cur.left != null){
            //如果找到符合条件的路径就立刻返回
            if(traversal(cur.left,target - cur.val)){
                return true;
            }
        }
        //右
        if(cur.right != null){
            if(traversal(cur.right,target - cur.val)){
                return true;
            }
        } 

        //如果上面遍历完了，没有返回true，那说明没有符合条件的路径
        return false;
    } 
}

```

### 3.1.2 优化2

```java
class Solution {
    //递归法 三步走
    //1.确定形参和返回值
    public boolean hasPathSum(TreeNode root, int targetSum) {
       //2.确定终止条件
        if(root == null) return false;
        //中
        //遇到叶子结点且和等于target
        if(root.left == null && root.right == null && targetSum - root.val == 0) return true;

        //3.确定单层递归逻辑
        //左节点不为空就继续判断
        //如果找到符合条件的路径就立刻返回
        if(hasPathSum(root.left,targetSum - root.val)){
            return true;
        }
        if(hasPathSum(root.right,targetSum - root.val)){
            return true;
        }
        //如果上面遍历完了，没有返回true，那说明没有符合条件的路径
        return false;
    }
}

```

### 3.1.2 优化3

```java
class Solution {
    //递归法 三步走
    //1.确定形参和返回值
    public boolean hasPathSum(TreeNode root, int targetSum) {
       //2.确定终止条件
        if(root == null) return false;
        //中
        //遇到叶子结点且和等于target
        if(root.left == null && root.right == null && targetSum - root.val == 0) return true;

        //左 和 右
        return hasPathSum(root.left,targetSum - root.val) || hasPathSum(root.right,targetSum - root.val);
    }
}
```





## 3.2 迭代法

深度优先搜索

```java
class Solution {
    public boolean hasPathSum(TreeNode root, int targetSum) {
        //迭代法 前序遍历 借助栈
        //创建栈 存储中间迭代的结果
        Stack<Object> stack = new Stack<>();
        if(root != null){
            stack.push(targetSum);
            stack.push(root);
        }
        //开始迭代  
        while(!stack.isEmpty()){
            //获取栈顶元素
            TreeNode cur = (TreeNode) stack.pop();
            int remain = (Integer)stack.pop();

            //中间结点 开始进行判断
            if(cur.left == null && cur.right == null && remain - cur.val == 0) return true;

            //左边结点
            if(cur.left != null){
                stack.push(remain - cur.val);
                stack.push(cur.left);
            }
            //右边结点
            if(cur.right != null){
                stack.push(remain - cur.val);
                stack.push(cur.right);
            }
        }
        //返回结果
        return false;
    }
}
```



```java
class Solution {
    public boolean hasPathSum(TreeNode root, int targetSum) {
        //迭代法 前序遍历 借助栈
        //创建栈 存储中间迭代的结果
        Stack<Object> stack = new Stack<>();
        //获取当前处理的结点
        TreeNode cur = root;
        //开始迭代  
        int remain = targetSum;
        while(cur != null || !stack.isEmpty()){
            //沿着根的左孩子，依次入栈
            //如果左孩子不为空，会一直执行if语句体
            if(cur != null){
                //处理中间节点
                //首先进行判断
                remain = remain - cur.val;//这一步非常重要
                if(cur.left == null && cur.right == null && remain == 0) return true;
                stack.push(remain);
                stack.push(cur);
                cur = cur.left;
            }else{
                cur = (TreeNode) stack.pop();
                remain = (int) stack.pop();
                cur = cur.right;
            }
        }
        //返回结果
        return false;
    }
}
```





广度优先搜索 + 层序遍历

```java
class Solution {
    public boolean hasPathSum(TreeNode root, int targetSum) {
        //层序遍历 迭代法 借助队列
        //创建队列，存储中间结果
        Queue<Object> queue = new LinkedList<>();
        //判断特殊情况
        if(root != null){
            queue.offer(root.val);
            queue.offer(root);
        }
        //开始迭代
        while(!queue.isEmpty()){
            //获取每一层的元素个数
            int size = queue.size()/2;//由于每个节点入队时，会入队节点和节点的值
            for(int i = 0;i < size;i++){
                //队列是先进先出
                int sum = (int) queue.poll();
                TreeNode cur = (TreeNode) queue.poll();

                // 如果该节点是叶子节点了，同时该节点的路径数值等于sum，那么就返回true
                if(cur.left == null && cur.right == null && sum == targetSum) {
                    return true;
                }

                // 右节点，入队，将该节点的路径数值也记录下来
                if(cur.right != null){
                    queue.offer(sum + cur.right.val);
                    queue.offer(cur.right);
                }
                // 左节点，入队，将该节点的路径数值也记录下来
                if(cur.left != null) {
                    queue.offer(sum + cur.left.val);
                    queue.offer(cur.left);
                }
            }

        }
        //如果遍历完没有符合条件的，那就是没有
        return false;
    }
}
```





# 4.[113.路径总和2](https://leetcode.cn/problems/path-sum-ii/)

## 4.1 题目描述





## 4.1 递归法

### 4.1.1 方法1：毛毛张的方法



```java
class Solution {
    public List<List<Integer>> pathSum(TreeNode root, int targetSum) {
        //创建结果返回值
        List<List<Integer>> result = new ArrayList<>();
        //创建中间路径
        List<Integer> paths = new ArrayList<>();
        function(root,paths,result,targetSum);
        return result;
    }

    public void function(TreeNode node,List<Integer> paths,List<List<Integer>> result,int SUM){
        //确定终止条件
        if(node == null){
            return;
        }

        //确定单层的递归逻辑
        //添加中间节点
        paths.add(node.val);
        //判断中间节点是不是叶子节点
        if(node.left == null && node.right == null){
            //开始计算路径总和
            int total = 0;
            for(int i =0;i<paths.size();i++){
                total += paths.get(i);
            }
            if(total == SUM){
                //添加这条路径到结果列表
                List<Integer> list = new ArrayList<>(paths);
                result.add(list);
            }
            return;
        }

        //如果不是叶子节点就递归
        if(node.left != null){
            function(node.left,paths,result,SUM);
            //回溯
            paths.remove(paths.size()-1);
        }

        if(node.right != null){
            function(node.right,paths,result,SUM);
            //回溯
            paths.remove(paths.size()-1);
        }
    }
}
```





### 4.1.2 方法2：优化1

```java
class Solution {
    //创建结果返回值
    List<List<Integer>> result = new ArrayList<>();
    //创建递归过程中的路径
    List<Integer> path = new ArrayList<>();
    public List<List<Integer>> pathSum(TreeNode root, int targetSum) {
        traversal(root,targetSum);
        return result;
    }
    //递归法 三步走 
    //1.确定形参和方法值
    public void traversal(TreeNode cur,int targetSum){
        //2.确定终止条件
        if(cur == null) return;

        //3.确定单层递归逻辑
        //添加路径
        path.add(cur.val);
        //然后对这条路径进行判断：是否到了叶子节点且路径和是否等于目标值
        int target = targetSum - cur.val;
        if(cur.left == null && cur.right == null && target == 0) result.add(new ArrayList<>(path));
        //递归
        //左
        if(cur.left != null){
            traversal(cur.left,target);
            path.remove(path.size()-1);
        }
        //右
        if(cur.right != null){
            traversal(cur.right,target);
            path.remove(path.size()-1);
        }
    }
}
```





### 优化2

```java
class Solution {
    //创建结果返回值
    List<List<Integer>> result = new ArrayList<>();
    //创建递归过程中的路径
    List<Integer> path = new ArrayList<>();
    public List<List<Integer>> pathSum(TreeNode root, int targetSum) {
        traversal(root,targetSum);
        return result;
    }
    //递归法 三步走 
    //1.确定形参和方法值
    public void traversal(TreeNode cur,int targetSum){
        //2.确定终止条件
        if(cur == null) return;

        //3.确定单层递归逻辑
        //添加路径
        path.add(cur.val);
        //然后对这条路径进行判断：是否到了叶子节点且路径和是否等于目标值
        int target = targetSum - cur.val;
        if(cur.left == null && cur.right == null && target == 0) result.add(new ArrayList<>(path));
        
        //递归
        //左
        traversal(cur.left,target);
        //右
        traversal(cur.right,target);
        //回溯
        path.remove(path.size()-1);
    }
}
```







## 4.2 迭代法



```java
class Solution {
    public List<List<Integer>> pathSum(TreeNode root, int targetSum) {
        //迭代法 借助栈 前序遍历
        //首先创建结果返回值
        List<List<Integer>> result = new ArrayList<>();
        //创建栈 存储中间结果
        Stack<Object> stack = new Stack<>();
        //判断特殊情况
        if(root != null){
            List<Integer> initialPath = new ArrayList<>();
            initialPath.add(root.val);
            stack.push(initialPath);
            stack.push(root);
        }
        //开始迭代
        while(!stack.isEmpty()){
            //获取当前处理的结点
            TreeNode cur = (TreeNode) stack.pop();
            List<Integer> path = (List<Integer>) stack.pop();

            //判断是不是叶子结点，并求和，判断和是不是满足目标值
            if(cur.left == null && cur.right == null){
                //开始求和
                int sum = 0;
                for(int i = 0;i<path.size();i++){
                    sum += path.get(i);
                }
                //优化
                //int sum = path.stream().mapToInt(Integer::intValue).sum();
                //判断求和结果是否满足目标值
                if(sum == targetSum){
                    result.add(new ArrayList<Integer>(path));
                }
            }

            //左
            if(cur.left != null){
                List<Integer> leftPath = new ArrayList<>(path);
                leftPath.add(cur.left.val);
                stack.push(leftPath);
                stack.push(cur.left);
            }
            //右
            if(cur.right != null){
                List<Integer> rightPath = new ArrayList<>(path);
                rightPath.add(cur.right.val);
                stack.push(rightPath);
                stack.push(cur.right);
            }
        }
        //返回结果
        return result;
    }
}
```





# 5.[437. 路径总和 III](https://leetcode.cn/problems/path-sum-iii/)

## 5.1 题目描述

给定一个二叉树的根节点 `root` ，和一个整数 `targetSum` ，求该二叉树里节点值之和等于 `targetSum` 的 **路径** 的数目。

**路径** 不需要从根节点开始，也不需要在叶子节点结束，但是路径方向必须是向下的（只能从父节点到子节点）。

 

**示例 1：**

![img](https://assets.leetcode.com/uploads/2021/04/09/pathsum3-1-tree.jpg)

```
输入：root = [10,5,-3,3,2,null,11,3,-2,null,1], targetSum = 8
输出：3
解释：和等于 8 的路径有 3 条，如图所示。
```

**示例 2：**

```
输入：root = [5,4,8,11,null,13,4,7,2,null,null,5,1], targetSum = 22
输出：3
```

**提示:**

- 二叉树的节点个数的范围是 `[0,1000]`
- `-109 <= Node.val <= 109` 
- `-1000 <= targetSum <= 1000` 



## 5.2 题解

### 5.2.1 递归

#### 双层递归|官方题解|最容易想到

```java
class Solution {
    //递归法 三步走  
    //1.使用题目确定的形参和方法值
    public int pathSum(TreeNode root, long targetSum) {
        //2.确定终止条件
        if(root == null) return 0;

        //3.确定单层递归逻辑
        //创建全局变量用于记录结果
        int num = 0;
        num += traversal(root,targetSum);//中
        //递归求子树的符合条件的路径数量
        num += pathSum(root.left,targetSum);//左
        num += pathSum(root.right,targetSum);//右
        //返回结果
        return num;
    }
    //递归法求一棵树的符合条件的路径数量
    public int traversal(TreeNode cur,long targetSum){
        //判断特殊情况
        if(cur == null) return 0;

        //确定单层递归逻辑
        //定义变量：记录符合条件的路径数量
        int count = 0;
        //中
        if(cur.val == targetSum) count++;
        //左
        count += traversal(cur.left,targetSum-cur.val);
        //右
        count += traversal(cur.right,targetSum-cur.val);
        //返回结果
        return count;
    }
}
```

**复杂度分析：**

- 时间复杂度： O(N^2^），其中 N为该二叉树节点的个数。对于每一个节点，求以该节点为起点的路径数目时，则需要遍历以该节点为根节点的子树的所有节点，因此求该路径所花费的最大时间为 O(N)，我们会对每个节点都求一次以该节点为起点的路径数目，因此时间复杂度为 O(N^2^）。
- 空间复杂度：O(N)，考虑到递归需要在栈上开辟空间。

# 6.[236. 二叉树的最近公共祖先](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/)

## 6.1 题目描述

给定一个二叉树, 找到该树中两个指定节点的最近公共祖先。

[百度百科](https://baike.baidu.com/item/最近公共祖先/8918834?fr=aladdin)中最近公共祖先的定义为：“对于有根树 T 的两个节点 p、q，最近公共祖先表示为一个节点 x，满足 x 是 p、q 的祖先且 x 的深度尽可能大（**一个节点也可以是它自己的祖先**）。”

 

**示例 1：**

![img](https://assets.leetcode.com/uploads/2018/12/14/binarytree.png)

```
输入：root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1
输出：3
解释：节点 5 和节点 1 的最近公共祖先是节点 3 。
```

**示例 2：**

![img](https://assets.leetcode.com/uploads/2018/12/14/binarytree.png)

```
输入：root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4
输出：5
解释：节点 5 和节点 4 的最近公共祖先是节点 5 。因为根据定义最近公共祖先节点可以为节点本身。
```

**示例 3：**

```
输入：root = [1,2], p = 1, q = 2
输出：1
```

 

**提示：**

- 树中节点数目在范围 `[2, 105]` 内。
- `-109 <= Node.val <= 109`
- 所有 `Node.val` `互不相同` 。
- `p != q`
- `p` 和 `q` 均存在于给定的二叉树中。





## 6.2 题解

### 6.2.1 方法1 

```java
class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        // 创建路径列表
        List<TreeNode> pathP = new ArrayList<>();
        List<TreeNode> pathQ = new ArrayList<>();

        // 通过前序遍历找到到该节点的路径
        findPath(root, p, pathP);
        findPath(root, q, pathQ);

        // 比较路径
        TreeNode ancestor = null;
        int len = Math.min(pathP.size(), pathQ.size());
        for (i = 0; i < len; i++) {
            if (pathP.get(i) == pathQ.get(i))
                ancestor = pathP.get(i);
            else 
                break;
        }
        return ancestor;
    }

    // 通过前序遍历找到到目标节点的路径
    private boolean findPath(TreeNode root, TreeNode target, List<TreeNode> path) {
        if (root == null) return false;

        path.add(root);

        if (root == target) return true;

        if (root.left != null && findPath(root.left, target, path)) return true;

        if (root.right != null && findPath(root.right, target, path)) return true;

        path.remove(path.size() - 1);
        return false;
    }
}
```



### 6.2.2 方法2



```java
class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        return nearestCommonAncestor(root, p, q);
    }
    //递归法 三步走
    //1.确定形参和方法值
    public TreeNode nearestCommonAncestor(TreeNode cur, TreeNode p, TreeNode q){
        //2.确定终止条件
        if(cur == p || cur == q || cur == null) return cur;

        //3.确定单层递归逻辑
        //左：如果当前节点不是要找的节点，进入左子树找是否存在该节点
        TreeNode left = nearestCommonAncestor(cur.left, p, q);
        //右：如果当前节点不是要找的节点，进入右子树找是否存在该节点
        TreeNode right = nearestCommonAncestor(cur.right, p, q);

        //判断左右子树返回情况
        //说明 root的左/右子树中都不包含 p,q 
        if(left == null && right == null) return null;
        //p,q均存在于左子树
        if(left != null && right == null) return left;
        //p,q均存在于右子树
        if(left == null && right != null) return right;
        //一个在左子树，一个在右子树
        return cur;
    }
}
```















# 7.[235. 二叉搜索树的最近公共祖先](https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-search-tree/)

## 7.1 题目描述

给定一个二叉搜索树, 找到该树中两个指定节点的最近公共祖先。

[百度百科](https://baike.baidu.com/item/最近公共祖先/8918834?fr=aladdin)中最近公共祖先的定义为：“对于有根树 T 的两个结点 p、q，最近公共祖先表示为一个结点 x，满足 x 是 p、q 的祖先且 x 的深度尽可能大（**一个节点也可以是它自己的祖先**）。”

例如，给定如下二叉搜索树: root = [6,2,8,0,4,7,9,null,null,3,5]

![img](https://assets.leetcode-cn.com/aliyun-lc-upload/uploads/2018/12/14/binarysearchtree_improved.png)

 

**示例 1:**

```
输入: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8
输出: 6 
解释: 节点 2 和节点 8 的最近公共祖先是 6。
```

**示例 2:**

```
输入: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4
输出: 2
解释: 节点 2 和节点 4 的最近公共祖先是 2, 因为根据定义最近公共祖先节点可以为节点本身。
```

 

**说明:**

- 所有节点的值都是唯一的。
- p、q 为不同节点且均存在于给定的二叉搜索树中。



## 7.2 题解

### 7.2.1 方法1

```java
class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        // 创建路径列表
        List<TreeNode> pathP = new ArrayList<>();
        List<TreeNode> pathQ = new ArrayList<>();

        // 通过前序遍历找到到该节点的路径
        traversal(root, p, pathP);
        traversal(root, q, pathQ);

        TreeNode ancestor = null;
        int len = Math.min(pathP.size(), pathQ.size());
        for (i = 0; i < len; i++) {
            if (pathP.get(i) == pathQ.get(i))
                ancestor = pathP.get(i);
            else 
                break;
        }
        return ancestor;
    }
    // 通过前序遍历找到到目标节点的路径
    private boolean traversal(TreeNode root, TreeNode target, List<TreeNode> path) {
        if (root == null) return false;

        path.add(root);

        if (root == target) return true;
        else if (target.val < root.val && root.left != null && findPath(root.left, target, path)) return true;
        else if(root.right != null && findPath(root.right, target, path)) return true;

        path.remove(path.size() - 1);
        return false;
    }
}
```



```java
class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        List<TreeNode> pathP = traversal(root, p);
        List<TreeNode> pathQ = traversal(root, q);
        TreeNode ancestor = null;
        for (int i = 0; i < pathP.size() && i < pathQ.size(); ++i) {
            if (pathP.get(i) == pathQ.get(i)) {
                ancestor = pathP.get(i);
            } else {
                break;
            }
        }
        return ancestor;
    }

    public List<TreeNode> traversal(TreeNode root, TreeNode target) {
        List<TreeNode> path = new ArrayList<TreeNode>();
        TreeNode node = root;
        while (node != target) {
            path.add(node);
            if (target.val < node.val) {
                node = node.left;
            } else {
                node = node.right;
            }
        }
        path.add(node);
        return path;
    }
}
```



```java
class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        TreeNode ancestor = root;
        while (true) {
            if (p.val < ancestor.val && q.val < ancestor.val) {
                ancestor = ancestor.left;
            } else if (p.val > ancestor.val && q.val > ancestor.val) {
                ancestor = ancestor.right;
            } else {
                break;
            }
        }
        return ancestor;
    }
}
```







### 7.2.2 方法2

```java
class Solution {
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        return nearestCommonAncestor(root, p, q);
    }
    //递归法 三步走
    //本质是遍历，只要遍历到该节点的值处于q.val和p.val中间
    //1.确定形参和方法值
    public TreeNode nearestCommonAncestor(TreeNode cur, TreeNode p, TreeNode q){
        //2.确定终止条件
        if(cur == null) return null;

        //3.确定单层递归逻辑
        //左子树
        if(cur.val > p.val && cur.val > q.val){
            if(cur.left != null){
                return nearestCommonAncestor(cur.left, p, q);
            }
        }
        //右子树
        if(cur.val < p.val && cur.val < q.val){
            if(cur.right != null){
                return nearestCommonAncestor(cur.right, p, q);
            }
        }

        //中  先判断左右子树，就省了一次判断
        //if(cur.val < p.val && cur.val > q.val || cur.val > p.val && cur.val < q.val)
        //完整的返回语句需要加上上面这个if判断语句
        return cur;
    }
}
```







# 8.[1457. 二叉树中的伪回文路径](https://leetcode.cn/problems/pseudo-palindromic-paths-in-a-binary-tree/)

## 8.1 题目描述

给你一棵二叉树，每个节点的值为 1 到 9 。我们称二叉树中的一条路径是 「**伪回文**」的，当它满足：路径经过的所有节点值的排列中，存在一个回文序列。

请你返回从根到叶子节点的所有路径中 **伪回文** 路径的数目。

**示例 1：**

![img](https://assets.leetcode-cn.com/aliyun-lc-upload/uploads/2020/05/23/palindromic_paths_1.png)

```
输入：root = [2,3,1,3,1,null,1]
输出：2 
解释：上图为给定的二叉树。总共有 3 条从根到叶子的路径：红色路径 [2,3,3] ，绿色路径 [2,1,1] 和路径 [2,3,1] 。
     在这些路径中，只有红色和绿色的路径是伪回文路径，因为红色路径 [2,3,3] 存在回文排列 [3,2,3] ，绿色路径 [2,1,1] 存在回文排列 [1,2,1] 。
```

**示例 2：**

**![img](https://assets.leetcode-cn.com/aliyun-lc-upload/uploads/2020/05/23/palindromic_paths_2.png)**

```
输入：root = [2,1,1,1,3,null,null,null,null,null,1]
输出：1 
解释：上图为给定二叉树。总共有 3 条从根到叶子的路径：绿色路径 [2,1,1] ，路径 [2,1,3,1] 和路径 [2,1] 。
     这些路径中只有绿色路径是伪回文路径，因为 [2,1,1] 存在回文排列 [1,2,1] 。
```

**示例 3：**

```
输入：root = [9]
输出：1
```

**提示：**

- 给定二叉树的节点数目在范围 `[1, 105]` 内
- `1 <= Node.val <= 9`



## 8.2 题解



### 8.2.1 深度优先遍历：递归法

#### 写法1

```java
class Solution {
    //创建map,记录路径上的节点值的出现次数
    Map<Integer,Integer> map = new TreeMap<>();
    //伪回文路径计数器
    int count = 0;
    public int pseudoPalindromicPaths (TreeNode root) {
        traversal(root);
        return count;
    }

    //递归法 三步走
    //1.确定形参和返回值
    public void traversal(TreeNode cur){
        //2.确定终止条件
        if(cur == null) return;

        //3.确定单层递归逻辑
        //判断map中是否包含该节点值
        if(map.containsKey(cur.val)){
            int value = map.get(cur.val);
            map.put(cur.val,value+1);
        }else{
            map.put(cur.val,1);
        }
        //判断是否到了叶子结点
        if(cur.left == null && cur.right == null){
            //判断是否是回文序列
            if(isPseudoPalindrome(new TreeMap<>(map))) count++;
        }
        //递归
        traversal(cur.left);
        traversal(cur.right);
        //回溯
        int value = map.get(cur.val);
        map.put(cur.val,value-1);
    }

    public boolean isPseudoPalindrome(Map<Integer,Integer> map){
        Set<Integer> set = map.keySet();
        int odd = 0;
        for(Integer key:set){
            if(map.get(key)%2 == 1){
                odd++;
            }
        }
        return odd <=1;
    }
}
```



#### 写法2

```java
class Solution {
    public int pseudoPalindromicPaths (TreeNode root) {
        //审题发现，节点的值只会在在0~9之间出现
        //因此直接定义一个数组更为方便
        int[] counter = new int[10];
        return traversal(root,counter);
    }

    //递归法 三步走
    //1.确定形参和返回值
    public int traversal(TreeNode cur,int[] counter){
        //2.确定终止条件
        if(cur == null) return 0;

        //3.确定单层递归逻辑
        //统计该节点的值
        counter[cur.val]++;
        //伪回文路径计数器
        int count = 0;
        //判断是否到了叶子结点
        if(cur.left == null && cur.right == null){
            //判断是否是回文序列
            if(isPseudoPalindrome(counter)) count++;
        }else{
            //递归
            count += traversal(cur.left,counter);
            count += traversal(cur.right,counter);
        }
        //回溯
        counter[cur.val]--;
        //返回结果
        return count;
    }

    //判断该计数数组是否为伪回文序列
    public boolean isPseudoPalindrome(int[] counter){
        int odd = 0;
        for(int value:counter){
            if(value % 2 == 1){
                odd++;
            }
        }
        return odd <=1;
    }
}
```



#### 写法3



```java
class Solution {
    //审题发现，节点的值只会在在0~9之间出现
    //因此直接定义一个数组更为方便
    int[] counter = new int[10];
    //伪回文路径计数器
    int count = 0;
    public int pseudoPalindromicPaths (TreeNode root) {
        traversal(root);
        return count;
    }

    //递归法 三步走
    //1.确定形参和返回值
    public void traversal(TreeNode cur){
        //2.确定终止条件
        if(cur == null) return;

        //3.确定单层递归逻辑
        //统计该节点的值
        counter[cur.val]++;
        
        //判断是否到了叶子结点
        if(cur.left == null && cur.right == null){
            //判断是否是回文序列
            if(isPseudoPalindrome(counter)) count++;
        }
        //递归
        traversal(cur.left);
        traversal(cur.right);
        //回溯
        counter[cur.val]--;
    }

    //判断该计数数组是否为伪回文序列
    public boolean isPseudoPalindrome(int[] counter){
        int odd = 0;
        for(int value:counter){
            if(value % 2 == 1){
                odd++;
            }
        }
        return odd <=1;
    }
}
```



### 7.2.2 深度优先遍历：迭代法

```java
class Solution {
    public int pseudoPalindromicPaths (TreeNode root) {
        // 迭代法 借助栈  双层循环
        // 创建伪回文路径计数器
        int count = 0;
        // 定义计数数组
        int[] counter = new int[10];
        // 创建栈，存储中间节点和计数数组
        Stack<Object> stack = new Stack<>();
        // 判断特殊情况
        TreeNode cur = root;
        while (cur != null || !stack.isEmpty()) {
            while (cur != null) {
                // 访问当前节点，更新计数数组
                counter[cur.val]++;
                // 如果是叶子节点，检查是否为伪回文路径
                if (cur.left == null && cur.right == null && isPseudoPalindrome(counter)) {
                    count++;
                }
                // 将当前节点和当前计数数组的副本入栈
                stack.push(cur);
                stack.push(counter.clone());
                // 遍历左子树
                cur = cur.left;
            }
            // 出栈，恢复计数数组状态
            counter = (int[]) stack.pop();
            cur = (TreeNode) stack.pop();
            // 访问右子树
            cur = cur.right;
        }
        return count;
    }

    // 判断该计数数组是否为伪回文序列
    public boolean isPseudoPalindrome(int[] counter) {
        int odd = 0;
        for (int value : counter) {
            if (value % 2 == 1) {
                odd++;
            }
        }
        return odd <= 1;
    }
}
```





# 参考文献

- <https://programmercarl.com/0257.%E4%BA%8C%E5%8F%89%E6%A0%91%E7%9A%84%E6%89%80%E6%9C%89%E8%B7%AF%E5%BE%84.html#%E7%AE%97%E6%B3%95%E5%85%AC%E5%BC%80%E8%AF%BE>



