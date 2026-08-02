---
title: LeetCode 刷题笔记 3：二叉树的基本性质
prev:
  text: 二叉树属性
  link: /algorithm/leetcode/binary-tree/LeetCode刷题笔记2
next:
  text: 二叉树路径
  link: /algorithm/leetcode/binary-tree/LeetCode刷题笔记4
---

> 📌本期毛毛张分享的是LeetCode关于二叉树🌲的性质的一些基础题，做这些题目的本质还是遍历二叉树🏃‍➡️的过程，如果还不熟悉二叉树的遍历方法的同学可以先看看毛毛张的这篇文章➡️[LeetCode刷题笔记：二叉树前序遍历、中序遍历、后序遍历和层序遍历 | 递归法 | 迭代法 | 统一迭代法 | 深度优先搜索 | 广度优先搜索](https://blog.csdn.net/weixin_48235955/article/details/139028925)

[toc]

# 1.[110. 平衡二叉树](https://leetcode.cn/problems/balanced-binary-tree/)

## 1.1 题目描述

给定一个二叉树，判断它是否是平衡二叉树

**示例 1：**

![img](https://assets.leetcode.com/uploads/2020/10/06/balance_1.jpg#pic_center)

```
输入：root = [3,9,20,null,null,15,7]
输出：true
```

**示例 2：**

![img](https://assets.leetcode.com/uploads/2020/10/06/balance_2.jpg#pic_center)

```
输入：root = [1,2,2,3,3,null,null,4,4]
输出：false
```

**示例 3：**

```
输入：root = []
输出：true
```

**提示：**

- 树中的节点数在范围 `[0, 5000]` 内
- `-104 <= Node.val <= 104`

## 1.2 题解

### 1.2.1 分析

- **平衡二叉树定义：二叉树的每个节点的左右子树的高度差的绝对值不超过1，则这颗二叉树是平衡二叉树**
- 根据定义，一棵二叉树是平衡二叉树，当且仅当其所有子树也都是平衡二叉树，因此可以使用递归的方式判断二叉树是不是平衡二叉树，递归的顺序可以是自顶向下或者自底向上。
- 这里在这里同时介绍两个概念：
    - 二叉树节点的深度：指从根节点到该节点的最长简单路径边的条数。
    - 二叉树节点的高度：指从该节点到叶子节点的最长简单路径边的条数。


![image-20240627221128602](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/leetcode/image-20240627221128602.png)

### 1.2.2 递归：自顶向下

- **对于自顶向下的递归，其单层递归的逻辑如下：**

    1️⃣对于当前遍历到的节点，首先计算左右子树的深度，如果左右子树的深度差是否不超过1

    2️⃣再分别递归地遍历左右子节点，并判断左子树和右子树是否平衡

    3️⃣如果上面的条件都满足则以该节点为根节点的二叉树是平衡二叉树

- 看完这个逻辑之后，我们发现遍历节点的逻辑顺序属于**前序遍历**，同时还需要编写一个子函数，用来求遍历到的每个节点的深度，**因此时间复杂度比较高**

- 整体的逻辑比较容易想到，下面来看看具体的实现代码吧❗

#### 写法1：易于理解

```java
class Solution {
    //递归 三步走
    //1.确定形参和返回值
    public boolean isBalanced(TreeNode root) {
        //2.确定终止条件
        if(root == null){
            return true;
        }
        //前序遍历
        //3.确定单层递归的逻辑
        //中：左右子树高度差不超过1
        boolean flagMid = Math.abs(getDepth(root.left) - getDepth(root.right)) <= 1;
        //左：左子树也需要是平衡二叉树
        boolean flagLeft = isBalanced(root.left);
        //右：右子树也需要是平衡二叉树
        boolean flagRight = isBalanced(root.right);
        //三个条件都满足才是平衡二叉树
        return flagMid && flagLeft && flagRight;
    }

    //获取树的深度
    //递归法
    //1.确定形参和返回值
    public int getDepth(TreeNode node){
        //2.确定终止条件
        if(node == null){
            return 0;
        }
        //3.确定单层递归逻辑
        return Math.max(getDepth(node.left),getDepth(node.right))  + 1;
    }
}
```

#### 写法2：写法1优化

> 上面的代码，毛毛张为了便于理解，因此每个判断逻辑拆开了，但是这样的运行效率是比较底的，下面对上面的代码进行简化，这种方式的代码运行效率更高

```java
class Solution {
    //递归法 三步走
    //1.确定形形参和返回值
    public boolean isBalanced(TreeNode root) {
        //2.确定终止条件
        if(root == null){
            return true;
        }
        //3.确定单层递归逻辑
        return Math.abs(getDepth(root.left) - getDepth(root.right)) <= 1 && isBalanced(root.left) && isBalanced(root.right);
    }

    //获取树的深度
    //递归法 三步走
    //1.确定形参和返回值
    public int getDepth(TreeNode node){
        //2.确定终止条件
        if(node == null){
            return 0;
        }
        //3.确定单层递归逻辑
        return Math.max(getDepth(node.left),getDepth(node.right))  + 1;
    }
}
```

### 1.2.3 递归：自底向上

**逻辑分析：**

- 自顶向下是先判断整棵树，再判断子树，因此自底向上则是反过来，先从子树判断起，再判断整棵树

- 自底向上首先需要先遍历整棵树的子树，因此需要使用后序遍历的方式
- 这个算法的逻辑实现毛毛张都不知道怎么用文字解释出来，最后发现直接图解比较好，直接用动态图来表示更加直观，同时还能帮助大家理解代码的运行逻辑
- 大家可以先看下面的代码，然后看毛毛张在附上的图解

**代码分析：**

```java
class Solution {
    public boolean isBalanced(TreeNode root) {
        return height(root) >= 0;
    }
    //递归法 三步走
    //1.确定形参和返回值
    //参数：当前传入节点
    //返回值：以当前传入节点为根节点的树的高度。
    public int height(TreeNode root) {
        //2.确定终止条件
        //递归的过程中依然是遇到空节点了为终止
        //返回0，表示当前节点为根节点的树高度为0
        if (root == null) {
            return 0;
        }

        //3.确定单层递归逻辑
        //左子树的高度
        int leftHeight = height(root.left);
        //右子树的高度
        int rightHeight = height(root.right);
        //如果不满足二叉树的条件，可以返回-1来标记已经不符合平衡树的规则
        if (leftHeight == -1 || rightHeight == -1 || Math.abs(leftHeight - rightHeight) > 1) {
            return -1;
        } else {
            return Math.max(leftHeight, rightHeight) + 1;
        }
    }
}
```

**图解：**

![110](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/leetcode/110.gif)

### 1.2.4 迭代法（不推荐）

- 大家看下面的代码就知道迭代法比较复杂，所有毛毛张就不是很推荐，但是为了完整性，毛毛张还是把迭代法的代码放在这里
- 整个代码的就是使用迭代法实现上述**自顶向下**的代码

```java
class Solution {
    //迭代法，效率较低，计算高度时会重复遍历
    //时间复杂度：O(n^2)
    public boolean isBalanced(TreeNode root) {
        //判断特殊情况
        if (root == null) {
            return true;
        }
        //迭代法 借助栈
        Stack<TreeNode> stack = new Stack<>();
        TreeNode pre = null;
        while (root != null || !stack.isEmpty()) {
            while (root != null) {
                stack.push(root);
                root = root.left;
            }
            TreeNode inNode = stack.peek();
            // 右结点为null或已经遍历过
            if (inNode.right == null || inNode.right == pre) {
                // 比较左右子树的高度差，输出
                if (Math.abs(getHeight(inNode.left) - getHeight(inNode.right)) > 1) {
                    return false;
                }
                stack.pop();
                pre = inNode;
                root = null;// 当前结点下，没有要遍历的结点了
            } else {
                root = inNode.right;// 右结点还没遍历，遍历右结点
            }
        }
        return true;
    }

    //迭代遍历求二叉树的高度
    public int getHeight(TreeNode root) {
        //广度优先遍历（BFS） 迭代法 借助队列
        //创建队列，存储迭代过程中的节点
        Queue<TreeNode> queue = new LinkedList<>();
        //判断特殊情况
        if(root != null) queue.offer(root);
        //创建变量，记录迭代的层数，就是树的深度
        int depth = 0;
        //开始迭代
        while(!queue.isEmpty()){
            //获取每一层的结点数
            int size = queue.size();
            //开始迭代每一层
            for(int i =0;i<size;i++){
                TreeNode cur = queue.poll();
                if(cur.left != null) queue.offer(cur.left);
                if(cur.right != null) queue.offer(cur.right);
            }
            //迭代完每一层深度加1
            depth++;
        }
        //迭代完毕，返回结果
        return depth;
    }
}
```

# 2.[222. 完全二叉树的节点个数](https://leetcode.cn/problems/count-complete-tree-nodes/)

## 2.1 题目描述

给你一棵 **完全二叉树** 的根节点 `root` ，求出该树的节点个数。

完全二叉树的定义如下：在完全二叉树中，除了最底层节点可能没填满外，其余每层节点数都达到最大值，并且最下面一层的节点都集中在该层最左边的若干位置。若最底层为第 `h` 层，则该层包含 `1~ 2h` 个节点。

**示例 1：**

![img](https://assets.leetcode.com/uploads/2021/01/14/complete.jpg#pic_center)

```
输入：root = [1,2,3,4,5,6]
输出：6
```

**示例 2：**

```
输入：root = []
输出：0
```

**示例 3：**

```
输入：root = [1]
输出：1
```

**提示：**

- 树中节点的数目范围是`[0, 5 * 104]`
- `0 <= Node.val <= 5 * 104`
- 题目数据保证输入的树是 **完全二叉树**

**进阶：**遍历树来统计节点是一种时间复杂度为 `O(n)` 的简单解决方案。你可以设计一个更快的算法吗？

## 2.2 题解

- 统计二叉树的节点个数，最简单的思路就是遍历二叉树，遍历一个和节点就将计数器+1，遍历二叉树我们熟啊，前序、中序、后序和层序遍历，既有递归实现又有迭代的实现，更多的二叉树的迭代方法可以学习毛毛张的这篇博客➡️[LeetCode刷题笔记：二叉树前序遍历、中序遍历、后序遍历和层序遍历 | 递归法 | 迭代法 | 统一迭代法 | 深度优先搜索 | 广度优先搜索](https://blog.csdn.net/weixin_48235955/article/details/139028925)

### 2.2.1 递归法

**方法1：** 前序遍历

```java
class Solution {
    //递归法 三步走
    //遍历的思路：遍历一个节点，节点数量就要加1
    //创建一个全局变量，记录节点的数量
    int count = 0;
    //1.使用题目确定的形参和返回值
    public int countNodes(TreeNode root) {
        //2.确定终止条件
        if(root == null){
            return 0;
        }

        //3.确定单层递归的逻辑
        //中
        count++;
        //左
        countNodes(root.left);
        //右
        countNodes(root.right);
        return count;
    }
}
```

**方式2：** 后序遍历

```java
class Solution {
    //递归法 三步走
    //子问题思路：左右子树的数量统计完了，再加上自身就是一整棵树的节点
    //1.使用题目确定的形参和返回值
    public int countNodes(TreeNode root) {
        //2.确定终止条件
        if(root == null){
            return 0;
        }

        //3.确定单层递归的逻辑
        //左子树节点数量
        int leftNum = countNodes(root.left);
        //右子树节点数量
        int rightNum = countNodes(root.right);
        //加上自身一个节点，返回结果
        return leftNum + rightNum + 1;
    }
}
```

### 2.2.2 迭代法

```java
class Solution {
    public int countNodes(TreeNode root) {
        //迭代法 借助队列
        //创建队列存储迭代过程中的节点
        Queue<TreeNode> queue = new LinkedList<>();
        //判断特殊情况
        if (root != null) queue.offer(root);
        //创建计数变量
        int result = 0;
        while (!queue.isEmpty()) {
            //获取每一层的结点数
            int size = queue.size();
            //迭代每一层的节点数量
            while (size -- > 0) {
                TreeNode cur = queue.poll();
                result++;
                if (cur.left != null) queue.offer(cur.left);
                if (cur.right != null) queue.offer(cur.right);
            }
        }
        return result;
    }
}
```

# 3.完全二叉树的判断：[958.二叉树的完全性检验](https://leetcode-cn.com/problems/check-completeness-of-a-binary-tree/)

> LeetCode标签：<font color="orange">中等</font>

## 3.1 题目描述

给你一棵二叉树的根节点 `root` ，请你判断这棵树是否是一棵 **完全二叉树** 。

在一棵 **[完全二叉树](https://baike.baidu.com/item/完全二叉树/7773232?fr=aladdin)** 中，除了最后一层外，所有层都被完全填满，并且最后一层中的所有节点都尽可能靠左。最后一层（第 `h` 层）中可以包含 `1` 到 `2h` 个节点。

**示例 1：**

![img](https://assets.leetcode-cn.com/aliyun-lc-upload/uploads/2018/12/15/complete-binary-tree-1.png#pic_center)

```
输入：root = [1,2,3,4,5,6]
输出：true
解释：最后一层前的每一层都是满的（即，节点值为 {1} 和 {2,3} 的两层），且最后一层中的所有节点（{4,5,6}）尽可能靠左。
```

**示例 2：**

![img](https://assets.leetcode-cn.com/aliyun-lc-upload/uploads/2018/12/15/complete-binary-tree-2.png#pic_center)



```
输入：root = [1,2,3,4,5,null,7]
输出：false
解释：值为 7 的节点不满足条件「节点尽可能靠左」。
```

**提示：**

- 树中节点数目在范围 `[1, 100]` 内
- `1 <= Node.val <= 1000`

## 3.2 题解

- 在一棵满二叉树中对二叉树使用层序遍历的顺序从1开始给根节点进行编号，则对于任意一个节点编号为$n$，它的左孩子编号为$2*n$，右孩子编号为$2*n + 1$
- 特征1：**因此我们可以通过上述性质在遍历二叉树的时候给遍历的节点的左右孩子进行编号，同时统计每个遍历整颗二叉树的节点数量，遍历完毕之后应该满足如下等式：节点数量 = 最大编号** 
- 完全二叉树总的可分为下图这两类：

![image-20240627225932962](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/leetcode/image-20240627225932962.png)

- **特征2：对于一个完全二叉树，层序遍历的过程中遇到第一个空节点之后不应该再出现非空节点**

### 3.2.1 深度优先搜索

- 这个代码实现依照的是特征1，如果不明白特征1是什么意思的可以看毛毛张下面画的图解，结合着来理解

- **图解：**

    - **符合条件：**

    ![image-20240628090038325](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/leetcode/image-20240628090038325.png)

    - **不符合条件：**

![image-20240628090551488](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/leetcode/image-20240628090551488.png)

**代码实现：**

```java
class Solution {
    /*
        在完全二叉树中，用1表示根节点编号，则对于任意一个节点:n，它的左孩子为:2*n，右孩子为:2*n + 1
    */
    //记录编号的最大值
    int max = 0;
    //记录节点个数
    int k = 0;
    public boolean isCompleteTree(TreeNode root) {
        traversal(root,1);
        //最后节点的总数量和编号数量不对应就不是完全二叉树
        return max == k;
    }
    //递归法 三步走
    //1.确定形参和返回值
    public void traversal(TreeNode cur,int n) {
        //2.确定终止条件
        if(cur == null) return;
        
        //3.确定单层递归逻辑
        //自增变量用于记录节点的数量
        k = k + 1;
        //变量n用来表示每个节点的编号
        //记录编号的最大值
        max = Math.max(max,n);
        //如果存在左孩子，那么左孩子的编号一定是2*n
        if(cur.left != null){
            traversal(cur.left,2*n);
        }
        //如果存在右孩子，那么右孩子的编号一定是2*n + 1
        if(cur.right != null){
            traversal(cur.right,2*n+1);
        }
    }
}
```

### 3.2.2 广度优先搜索

```java
class Solution {
    //对于一个完全二叉树，层序遍历的过程中遇到第一个空节点之后不应该再出现非空节点
    //广度优先搜索  层序遍历  借助队列
    public boolean isCompleteTree(TreeNode root) {
        //创建队列
        Queue<TreeNode> queue = new LinkedList<>();
        //判断特殊情况
        if(queue != null) queue.offer(root);
        //设立标志，如果遇到第一个空节点就为true
        boolean flag = false;
        //循环遍历
        while(!queue.isEmpty()){
            TreeNode cur = queue.poll();
            //遇到第一个空节点之后不应该再出现非空节点
            if(flag == true && cur != null){
                return false;
            }

            //遇到第一个节点，就把标志置为true
            if(cur == null){
                flag = true;
                continue;
            }
            //无论左右节点是否非空，都入队
            //左
            queue.offer(cur.left);
            //右
            queue.offer(cur.right);
        }
        //如果遍历完没有返回不符合，那就是完全二叉树
        return true;
    }
}
```

# 4.[404. 左叶子之和](https://leetcode.cn/problems/sum-of-left-leaves/)

>  LeetCode标签：<font color="green">简单</font>

## 4.1 题目描述

给定二叉树的根节点 `root` ，返回所有左叶子之和。

**示例 1：**

![img](https://assets.leetcode.com/uploads/2021/04/08/leftsum-tree.jpg#pic_center)

```
输入: root = [3,9,20,null,null,15,7] 
输出: 24 
解释: 在这个二叉树中，有两个左叶子，分别是 9 和 15，所以返回 24
```

**示例 2:**

```
输入: root = [1]
输出: 0
```

**提示:**

- 节点数在 `[1, 1000]` 范围内
- `-1000 <= Node.val <= 1000`

## 4.2 题解

- **这个题目的本质还是遍历，这是在遍历的过程中我们需要判断是否碰到了左叶子节点**，因此如何判断是否到了左叶子节点这个逻辑就比较重要

- 就像我们在区分判断左边还是右边的时候，都有一个参照物，**因此，判断左叶子节点的逻辑得通过其父节点才能知道**，如果一个节点不为空，节点的左子树不为空，且节点左子树的左子树和右子树均为空才能说明该节点为叶子节点，下面是判断的代码逻辑：

    ```java
    if(node.left != null && node.left.left == null && node.left.right == null)
    ```

![image-20240628093553532](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/leetcode/image-20240628093553532.png)

- 在前面说过这个题的本质还是遍历二叉树，**因此方法的分类也是围绕着遍历二叉树的方法进行分类的**，毛毛张在这里分享了两个常见的代码

### 4.2.1 递归法

```java
class Solution {
    //递归法 三步走
    //1.使用题目确定的形参和返回值
    public int sumOfLeftLeaves(TreeNode root) {
        //2.确定终止条件
        if(root == null) return 0;

        //3.确定单层递归逻辑
        //定义结果返回变量
        int sum = 0;
        //找到左叶子
        if(root.left != null && root.left.left == null && root.left.right == null){
            sum += root.left.val;
        }
        //左
        sum += sumOfLeftLeaves(root.left);
        //右
        sum += sumOfLeftLeaves(root.right);
        //返回结果
        return sum;
    }
}
```

### 4.2.2 迭代法

```java
class Solution {
    public int sumOfLeftLeaves(TreeNode root) {
        //迭代法 借助栈 前序遍历
        //创建结果变量
        int sum = 0;
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        //获取当前节点
        TreeNode cur = root;
        //开始迭代
        while(cur != null || !stack.isEmpty()){
            if(cur != null){
                //判断是否是左叶子节点
                if(cur.left != null && cur.left.left == null && cur.left.right == null){
                    sum += cur.left.val;
                }
                //中间节点入栈
                stack.push(cur);
                cur = cur.left;
            }else{
                cur = stack.pop();
                cur = cur.right;
            }
        }
        //返回结果
        return sum;
    }
}
```

# 5.[513. 找树左下角的值](https://leetcode.cn/problems/find-bottom-left-tree-value/)

> LeetCode标签：<font color="orange">中等</font>

## 5.1 题目描述

给定一个二叉树的 **根节点** `root`，请找出该二叉树的 **最底层 最左边** 节点的值。

假设二叉树中至少有一个节点。

**示例 1:**

![image-20240628093840410](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/leetcode/image-20240628093840410.png)

```
输入: root = [2,1,3]
输出: 1
```

**示例 2:**

![image-20240628093910533](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/leetcode/image-20240628093910533.png)

```
输入: [1,2,3,4,null,5,6,null,null,7]
输出: 7 
```

**提示:**

- 二叉树的节点个数的范围是 `[1,104]`
- `-231 <= Node.val <= 231 - 1` 

## 5.2 题解

### 5.2.1 分析

- **这个题不是要求最底层最左边的节点，我们可以首先遍历获取底层的节点，再根据获取的最底层的遍历的节点，获取底层节点列表第一个节点不就是最底层最左边的节点吗？**
- 那么，如何遍历获取最底层的节点呢？**我们可以利用层序遍历，层序遍历既可以通过递归实现，也可以通过迭代实现，毛毛张曾在这篇文章介绍过二叉树的层序遍历的各种实现➡️** [LeetCode刷题笔记：二叉树前序遍历、中序遍历、后序遍历和层序遍历 | 递归法 | 迭代法 | 统一迭代法 | 深度优先搜索 | 广度优先搜索](https://blog.csdn.net/weixin_48235955/article/details/139028925)

- 下面的方法主要是围绕这两种方法展开，二叉树层序遍历的递归实现其实是一种深度优先遍历(DFS)，迭代实现是广度优先搜索(BFS)

### 5.2.2 层序遍历：递归

#### 递归1 毛毛张

**分析：** 

- 毛毛张在上面的一篇的文章分享了如何实现二叉树的层序遍历的递归实现，如果熟悉的小伙伴可以发现只需要在上面做小小的改动即可，所有毛毛张的下面这种写法来源于二叉树的层序遍历的递归实现
- **虽然代码的效率可能没有那么高，如果学过二叉树的遍历的小伙伴可以迅速求解出这道题目，不知道大家发现没有，在刷题LeetCode的过程中，最后往往记得是最先使用的方法求解出来的题目，所有毛毛张把这种方法放在第一个就是在不断的强化已经学习过的知识点，如果能用更少的知识点求解更多的题目也是一种能力**

**代码：**

```java
class Solution {
    //递归  层序遍历
    //确定递归的形参和返回值
    //记录每一层的节点值
    List<List<Integer>> result = new ArrayList<>();
    public int findBottomLeftValue(TreeNode root) {
       getLeftNode(root,1);
       return result.get(result.size()-1).get(0);
    }
    public void traversal(TreeNode node,int depth){
        //确定终止条件
        if(node == null) return;
        //确定单层递归的逻辑
        if(result.size() < depth){
            //创建列表
            List<Integer> list = new ArrayList<>();
            result.add(list);
        }
        result.get(depth-1).add(node.val);
        getLeftNode(node.left,depth+1);
        getLeftNode(node.right,depth+1);
    }
}
```

> - **大家在看了上述代码之后，会不会疑惑这句代码`result.get(result.size()-1).get(0)`，上述代码获取的层序遍历的结果，为啥你能确定遍历的每一层的节点的第一个就是每一层的最左边的结果？**
>
> - 答：因为我在递归的过程中都是左节点优先进入递归，这样就能确保在层序递归遍历的`result`存储的每一层的节点的第一个节点就是最左边的节点，干说可能比较抽象，大家可以根据代码结合下面的动图理解一下这个问题，左边为递归实现的动态图，右边的层序迭代实现的动态图
>
> ![DFS 与 BFS 对比](https://cdn.jsdelivr.net/gh/zzxrepository/image_bed@master/leetcode/fdcd3bd27f4008948084f6ec86b58535e71f66862bd89a34bd6fe4cc42d68e89.gif)

#### 递归2 (官方题解)

**分析：**

- 上面的方法省去了分析时间，同时也消耗了比较大的内存，下面我们来进行优化

- **在上面的代码中，我们会发现，每次要创建新列表的时机是递归的深度又增加了，这里面还隐藏着一个逻辑就是同时递归到每一层的最左边的节点了**

    ```java
    if(result.size() < depth){
        //创建列表
        List<Integer> list = new ArrayList<>();
        result.add(list);
    }
    ```

- 分析出上面一个点，**列表扩容的时机就说明碰到了每一层的最左边的节点，因此我们可以设置一个变量记录这个节点，递归的过程中不断更新，递归结束自然记录的就是最后一层的最左边的节点**，这样就不用去记录每一层的所有结点，大大节省了空间❗

**代码：**

```java
class Solution {
    //左下角的值
    int leftValue = 0;
    //记录递归过程中树的深度
    int maxDepth = 0;
    public int findBottomLeftValue(TreeNode root) {
       traversal(root,1);
       return leftValue;
    }
    //递归法 三步走
    //1.确定形参和返回值
    public void traversal(TreeNode cur,int depth){
        //2.确定终止条件
        if(cur == null) return;

        //3.确定单层递归逻辑
        //判断深度
        if(depth > maxDepth){
            maxDepth = depth;
            //保证优先左边搜索，然后记录深度最大的叶子节点
            //递归结束，则记录的结果就是左下角的值
            leftValue = cur.val;
        }
        //左
        traversal(cur.left,depth+1);
        //右
        traversal(cur.right,depth+1);
    }
}
```

### 5.2.3 层序遍历：迭代

**分析：**

- 我们首先来看一个迭代过程中的动图：

![102二叉树的层序遍历](https://code-thinking.cdn.bcebos.com/gifs/102%E4%BA%8C%E5%8F%89%E6%A0%91%E7%9A%84%E5%B1%82%E5%BA%8F%E9%81%8D%E5%8E%86.gif)

- 通过上面的动图我们可以很容易发现，只需要在迭代每一层的时候记录迭代的第一个结点，下面结合上面的图片来理解一下具体的实现吧！

**代码：**

```java
class Solution {
    //思路：层序遍历的时候，每次记录遍历的第一个值
    //当退出循环的之后，记录的就是最底层、最左边的节点的值
    public int findBottomLeftValue(TreeNode root) {
        //层序遍历 借助队列
        Queue<TreeNode> queue = new LinkedList<>();
        //判断特殊情况
        if(root != null) queue.offer(root);
        //每次记录当前层的最左边的节点
        int result = 0;
        while(!queue.isEmpty()){
            //获取当前层的的节点数量
            int size = queue.size();
            //开始遍历每一层
            for(int i =0;i<size;i++){ 
                //获取当前遍历的节点
                TreeNode cur = queue.poll();
                //如果是第一个就记录下来
                if(i==0){
                    result = cur.val;
                }

                //左节点入队列
                if(cur.left!=null) queue.offer(cur.left);
                //右节点入队
                if(cur.right!= null) queue.offer(cur.right);
            }
        }
        return result;
    }
}
```



## 5.3 练习：[1302. 层数最深叶子节点的和](https://leetcode.cn/problems/deepest-leaves-sum/)

> LeetCode标签：<font color="orange">中等</font>

- 这个题目和上面这个题目的变体，毛毛张在这里就不做详细的介绍，只分享一种比较简单的代码实现，更多的方法，大家根据毛毛张对上面这一题的实现打开LeetCode去尝试一下其它方法

### 5.3.1 题目描述

给你一棵二叉树的根节点 `root` ，请你返回 **层数最深的叶子节点的和** 。

**示例 1：**

![img](https://assets.leetcode-cn.com/aliyun-lc-upload/uploads/2019/12/28/1483_ex1.png#pic_center)

```
输入：root = [1,2,3,4,5,null,6,7,null,null,null,null,8]
输出：15
```

**示例 2：**

```
输入：root = [6,7,8,2,7,1,3,9,null,1,4,null,null,null,5]
输出：19
```

**提示：**

- 树中节点数目在范围 `[1, 104]` 之间。
- `1 <= Node.val <= 100`

### 5.3.2 题解

**递归：**

```java
class Solution {
    //树的最大深度
    int maxDepth = -1;
    //最下层叶子之和
    int sum = 0;
    public int deepestLeavesSum(TreeNode root) {
        traversal(root,1);
        return sum;
    }
    public void traversal(TreeNode cur,int depth){
        //2.确定终止条件
        if(cur == null) return;

        //3.确定单层递归逻辑
        if(depth > maxDepth){
            maxDepth = depth;
            sum = cur.val;
        }
        else if(depth == maxDepth){
            sum += cur.val;
        }
        //左
        traversal(cur.left,depth+1);
        //右
        traversal(cur.right,depth+1);
    }
}
```

**迭代：**

```java
class Solution {
    //层序遍历 递归法
    //创建二维列表 存储每一行的节点
    List<List<Integer>> levelNodeList = new ArrayList<>();
    public int deepestLeavesSum(TreeNode root) {
        //开始递归获取所有层的节点
        getLevelNode(root,0);
        //此时结果所有层的节点已经存储在二维数组levelNodeList中了
        //只需要获取最后一层的列表
        List<Integer> list = levelNodeList.get(levelNodeList.size()-1);
        //然后对改列表里面的值进行求和
        int sum = 0;
        for(int i =0;i< list.size();i++){
            sum += list.get(i);
        }
        return sum;
    }
    //1.确定形参和返回值
    public void getLevelNode(TreeNode cur,int depth){
        //2.确定终止条件
        if(cur == null) return;

        //3.确定单层递归逻辑
        depth++;
        //树的深度 = 列表的大小
        if(levelNodeList.size() < depth){
            List<Integer> list = new ArrayList<>();
            levelNodeList.add(list);
        }
        //把当前节点添加到二维列表中
        levelNodeList.get(depth-1).add(cur.val);

        //继续递归
        getLevelNode(cur.left,depth);
        getLevelNode(cur.right,depth);
    }
}
```

# 参考文献

- <https://leetcode.cn/>
- <https://programmercarl.com/#%E6%9C%AC%E7%AB%99%E8%83%8C%E6%99%AF>
