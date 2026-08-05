---
title: LeetCode 刷题笔记 5：构造二叉树
shortTitle: 构造二叉树
order: 5
icon: hammer
category:
  - 算法
  - LeetCode
  - 二叉树
tag:
  - LeetCode
  - 二叉树
  - 构造二叉树
  - 递归
  - 迭代
  - DFS
  - BFS
---

> 本篇分享的是与**构造二叉树**有关的问题，有关二叉树的基础知识可以[点击此处跳转学习]()，**构造二叉树的就是遍历树，构造树一般采用的是前序遍历，因为先构造中间节点，然后递归构造左子树和右子树**

[toc]



# 0.前言

- 毛毛张在前面已经分享过三期关于树的LeetCode算法题了：
  - [LeetCode刷题笔记：二叉树前序遍历、中序遍历、后序遍历和层序遍历 | 递归法 | 迭代法 | 统一迭代法 | 深度优先搜索 | 广度优先搜索](https://blog.csdn.net/weixin_48235955/article/details/139028925)
  - [LeetCode刷题笔记：二叉树的基本属性操作 | 4道题目 | 5道练习 | 二叉树的最大深度 | 最小深度 | 深度优先遍历 | 广度优先遍历 | 递归法 | 迭代法 | Java](https://blog.csdn.net/weixin_48235955/article/details/139395774)
  - [Leetcode刷题笔记 | 二叉树基本性质 | 一天的题量 | 5道题目 | 深度优先搜索 | 广度优先搜索 | 递归 | 遍历](https://blog.csdn.net/weixin_48235955/article/details/140038423)

- **二叉树的题目的解法大多数可以从两个角度来解决：**
  - **深度优先遍历**
    - 递归法
    - 迭代法
  - **广度优先遍历**
    - 递归法
    - 迭代法

- 下面的四道题目不是很难，毛毛张主要讲解算法思路，前面连体可以参看毛毛张在关于[二叉树](https://blog.csdn.net/weixin_48235955/article/details/140065102)的知识介绍中有跟详细的讲解

# 1.[106. 从中序与后序遍历序列构造二叉树](https://leetcode.cn/problems/construct-binary-tree-from-inorder-and-postorder-traversal/)

## 1.1 题目描述

给定两个整数数组 `inorder` 和 `postorder` ，其中 `inorder` 是二叉树的中序遍历， `postorder` 是同一棵树的后序遍历，请你构造并返回这颗 *二叉树* 。

**示例 1:**

![img](https://assets.leetcode.com/uploads/2021/02/19/tree.jpg)

```
输入：inorder = [9,3,15,20,7], postorder = [9,15,7,20,3]
输出：[3,9,20,null,null,15,7]
```

**示例 2:**

```
输入：inorder = [-1], postorder = [-1]
输出：[-1]
```

**提示:**

- `1 <= inorder.length <= 3000`
- `postorder.length == inorder.length`
- `-3000 <= inorder[i], postorder[i] <= 3000`
- `inorder` 和 `postorder` 都由 **不同** 的值组成
- `postorder` 中每一个值都在 `inorder` 中
- `inorder` **保证**是树的中序遍历
- `postorder` **保证**是树的后序遍历

## 1.2 题解

- **逻辑思路：** 以 后序数组的最后一个元素为切割点，先切中序数组，根据中序数组，反过来再切后序数组。一层一层切下去，每次后序数组最后一个元素就是节点元素。
- **图解：**
  ![106.从中序与后序遍历序列构造二叉树](https://img-blog.csdnimg.cn/img_convert/ad8e90c89f60e8992449fae213e0cf1e.png#pic_center)
- **实现步骤：根据上面的逻辑思路和图解，很容易想到使用递归的方式来实现，利用递归实现，主要分为以下几步**
  - 第一步：如果数组大小为零的话，说明是空节点了。
  - 第二步：如果不为空，那么取后序数组最后一个元素作为节点元素。
  - 第三步：找到后序数组最后一个元素在中序数组的位置，作为切割点
  - 第四步：切割中序数组，切成中序左数组和中序右数组 （顺序别搞反了，一定是先切中序数组）
  - 第五步：切割后序数组，切成后序左数组和后序右数组
  - 第六步：递归处理左区间和右区间

### 1.2.1 递归法

#### 1.2.1.1 方法1

```java
class Solution {
    //递归法 三步走
    //1.使用题目确定的形参和返回值
    public TreeNode buildTree(int[] inorder, int[] postorder) {
        //2.确定终止条件
        //①如果数组大小为零的话，说明是空节点了
        if(inorder == null || inorder.length == 0){
            return null;
        }

        //3.确定单层递归的逻辑
        //②如果数组不为空，那么取后序数组最后一个元素作为建立根节点
        int rootVal = postorder[postorder.length - 1];
        TreeNode root = new TreeNode(rootVal);

        //③找到后序数组最后一个元素在中序数组的位置，作为切割点
        int index;
        for(index = 0;index < inorder.length;index++){
            if(inorder[index] == rootVal) break;
        }

        int leftLength = index;
        int rightLength = inorder.length - index - 1;

        int[] inorderLeftArr = null;
        int[] postorderLeftArr = null;
        int[] inorderRightArr = null;
        int[] postorderRightArr = null;
        if(leftLength > 0){
            inorderLeftArr = new int[leftLength];
            postorderLeftArr = new int[leftLength];
            for(int i = 0;i<leftLength;i++){
                inorderLeftArr[i] = inorder[i];
                postorderLeftArr[i] = postorder[i];
            }
        }

        if(rightLength > 0){
            //中序右数组
            inorderRightArr = new int[rightLength];
            //后序右数组
            postorderRightArr = new int[rightLength];
            for(int i= 0;i<rightLength;i++){
                inorderRightArr[i] = inorder[index+1+i];
                postorderRightArr[i] = postorder[index+i];
            }
        }


        //⑥递归处理左区间和右区间
        root.left =  buildTree(inorderLeftArr,postorderLeftArr);
        root.right = buildTree(inorderRightArr,postorderRightArr);

        return root;
    }
}
```

#### 1.2.1.2 方法2(推荐)

```java
class Solution {
    public TreeNode buildTree(int[] inorder, int[] postorder) {
        //// 中序区间：[inBegin, inEnd)，后序区间[postBegin, postEnd)
        return buildSubTree(inorder, 0,inorder.length,postorder,0,postorder.length);
    }

    //递归法 三步走
    //1.确定形参和返回值
    public TreeNode buildSubTree(int[] inorder, int inBegin,int inEnd,int[] postorder,int postBegin,int postEnd) {
        //2.确定终止条件
        //①如果数组大小为零的话，说明是空节点了
        if(inBegin == inEnd || postBegin == postEnd) return null;

        //3.确定单层递归逻辑
        //②如果不为空，那么取后序数组最后一个元素作为节点元素
        int rootVal = postorder[postEnd-1];
        TreeNode root = new TreeNode(rootVal);

        //③找到后序数组最后一个元素在中序数组的位置，作为切割点
        int index;
        for(index = inBegin;index < inEnd;index++){
            if(inorder[index] == rootVal) break;
        }
        //下面是本题的关键，获取切割之后的子树的开始索引和结束索引
        //中序:[9,3,15,20,7]   后序：[9,15,7,20,3]
        //④切割中序数组，切成中序左数组和中序右数组
        int leftInBegin = inBegin;
        int leftInEnd = index;
        int rightInBegin = index + 1;
        int rightInEnd = inEnd;
        //⑤切割后序数组，切成后序左数组和后序右数组
        int leftPostBegin = postBegin;
        int leftPostEnd = postBegin + leftInEnd - leftInBegin;
        int rightPostBegin = postBegin + leftInEnd - leftInBegin;
        int rightPostEnd = postEnd - 1;
        //⑥递归处理左区间和右区间
        root.left = buildSubTree(inorder, leftInBegin,leftInEnd,postorder,leftPostBegin,leftPostEnd);
        root.right = buildSubTree(inorder, rightInBegin,rightInEnd,postorder,rightPostBegin,rightPostEnd);

        //返回结果
        return root;
    }
}
```

#### 1.2.1.3 方法3

> 能使用这个方式是因为在题目的提示中说：**`inorder` 和 `postorder` 都由 不同 的值组成**

```java
class Solution {
    Map<Integer, Integer> map = new HashMap<>();
    public TreeNode buildTree(int[] inorder, int[] postorder) {
        // inorder：左 -> 根 -> 右   postorder：左 -> 右 -> 根
        // 每次找到当前postorder中最后的元素作为当前节点，在inorder中找到这个节点划分成左子树和右子树后，重复这个过程。
        for(int i=0; i<inorder.length; i++){
            map.put(inorder[i], i);
        }
        return buildSubTree(inorder, 0, inorder.length, postorder, 0, postorder.length);
    }
    //递归法 三步走
    //1.确定形参和返回值
    public TreeNode buildSubTree(int[] inorder,int inBegin,int inEnd,int[] postorder,int postBegin,int postEnd){
        //2.确定终止条件
        //①如果数组大小为零的话，说明是空节点了
        if(inBegin == inEnd){
            return null;
        }

        //3.确定单层递归逻辑
        //②如果不为空，那么取后序数组最后一个元素作为节点元素
        int val = postorder[postEnd - 1];
        TreeNode root = new TreeNode(val);
        //③找到后序数组最后一个元素在中序数组的位置，作为切割点
        int index = map.get(val);
        //下面是本题的关键，获取切割之后的子树的开始索引和结束索引
        //中序:[9,3,15,20,7]   后序：[9,15,7,20,3]
        //⑥递归处理左区间和右区间
        root.left = buildSubTree(inorder, inBegin, index, postorder, postBegin, postBegin+(index - inBegin));
        root.right = buildSubTree(inorder, index+1, inEnd, postorder, postBegin+(index - inBegin), postEnd-1);
        //返回结果
        return root;
    }
}
```

#### 1.2.1.4 总结

- **方法1和方法2的本质是一样的，区别在于写递归函数的时候是否再用题目默认的函数体作为递归函数**

- **能使用这个方式是因为在题目的提示中说：`inorder` 和 `postorder` 都由 不同 的值组成**

### 1.2.2 迭代法

```java
class Solution {
    public TreeNode buildTree(int[] inorder, int[] postorder) {
        //迭代法 借助栈
        //首先判断特殊情况
        if (postorder == null || postorder.length == 0) {
            return null;
        }
        //创建栈，存储中间节点
        Stack<TreeNode> stack = new Stack<>();
        //创建根节点：根节点为前序数组的第一个元素
        TreeNode root = new TreeNode(postorder[postorder.length -1]);
        //根节点入栈
        stack.push(root);
        int inorderIndex = inorder.length - 1;
        for (int i = postorder.length - 2; i >= 0; i--) {
            int postorderVal = postorder[i];
            TreeNode node = stack.peek();
            if (node.val != inorder[inorderIndex]) {
                node.right = new TreeNode(postorderVal);
                stack.push(node.right);
            } else {
                while (!stack.isEmpty() && stack.peek().val == inorder[inorderIndex]) {
                    node = stack.pop();
                    inorderIndex--;
                }
                node.left = new TreeNode(postorderVal);
                stack.push(node.left);
            }
        }
        //返回结果
        return root;
    }
}
```

## 1.3 总结

- **这个题目虽然给定了递归法和迭代法来进行求解，毛毛张在这里还是推荐递归法，递归法的思路比较清晰，然而迭代法的思路比较复杂**
- 下面一道题目作为此题的练习，毛毛张不做过多描述

# 2.[105. 从前序与中序遍历序列构造二叉树](https://leetcode.cn/problems/construct-binary-tree-from-preorder-and-inorder-traversal/)

## 2.1 题目描述

给定两个整数数组 `preorder` 和 `inorder` ，其中 `preorder` 是二叉树的**先序遍历**， `inorder` 是同一棵树的**中序遍历**，请构造二叉树并返回其根节点。

**示例 1:**

![img](https://assets.leetcode.com/uploads/2021/02/19/tree.jpg)

```
输入: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]
输出: [3,9,20,null,null,15,7]
```

**示例 2:**

```
输入: preorder = [-1], inorder = [-1]
输出: [-1]
```

**提示:**

- `1 <= preorder.length <= 3000`
- `inorder.length == preorder.length`
- `-3000 <= preorder[i], inorder[i] <= 3000`
- `preorder` 和 `inorder` 均 **无重复** 元素
- `inorder` 均出现在 `preorder`
- `preorder` **保证** 为二叉树的前序遍历序列
- `inorder` **保证** 为二叉树的中序遍历序列\

## 2.2 题解

- **此题的求解思路和题目1类似**

### 2.2.1 递归法

#### 2.2.1.1 方法1

```java
class Solution {
    //递归法 三步走
    //1.使用题目确定的形参和返回值
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        //2.确定终止条件
        //①如果数组大小为零的话，说明是空节点了。
        if(inorder == null || inorder.length == 0){
            return null;
        }

        //3.确定单层递归的逻辑
        //②如果数组不为空，那么取后序数组最后一个元组作为节点元素
        int rootVal = preorder[0];
        TreeNode root = new TreeNode(rootVal);

        //③找到后序数组最后一个元素在中序数组的位置，作为切割点
        int index;
        for(index = 0;index < inorder.length;index++){
            //找到切割点
            if(inorder[index] == rootVal) break;
        }
        //左子树的长度
        int leftLength = index;
        //右子树的长度
        int rightLength = inorder.length - index - 1;
        //根据数组的长度建立数组
        int[] inorderLeftArr = null;
        int[] preorderLeftArr = null;
        int[] inorderRightArr = null;
        int[] preorderRightArr = null;
        if(leftLength > 0){
            inorderLeftArr = new int[leftLength];
            preorderLeftArr = new int[leftLength];
            for(int i = 0;i<leftLength;i++){
                inorderLeftArr[i] = inorder[i];
                preorderLeftArr[i] = preorder[i+1];
            }
        }

        if(rightLength > 0){
            //中序右数组
            inorderRightArr = new int[rightLength];
            //后序右数组
            preorderRightArr = new int[rightLength];
            for(int i= 0;i<rightLength;i++){
                inorderRightArr[i] = inorder[index+1+i];
                preorderRightArr[i] = preorder[index+1+i];
            }
        }

        //⑥递归处理左区间和右区间
        root.left =  buildTree(preorderLeftArr,inorderLeftArr);
        root.right = buildTree(preorderRightArr,inorderRightArr);

        return root;
    }
}
```

#### 2.2.1.2 方法2

```java
class Solution {
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        return buildSubTree(preorder ,0 ,preorder.length ,inorder ,0 ,inorder.length);
    }
    //递归法 三步走
    //1.确定形参和返回值
    public TreeNode buildSubTree(int[] preorder,int preBegin,int preEnd,int[] inorder,int inBegin,int inEnd){
        //2.确定终止条件
        //①如果数组大小为零的话，说明是空节点了
        if(preBegin == preEnd || inBegin == inEnd) return null;

        //3.确定单层递归逻辑
        //②如果不为空，那么取前序数组第一个元素作为节点元素
        int val = preorder[preBegin];
        TreeNode root = new TreeNode(val);
        //③找到前序数组第一个元素在中序数组的位置，作为切割点
        int index;
        for(index = inBegin;index < inEnd; index++) {
            if(inorder[index] == val) break;
        }
        //下面是本题的关键，获取切割之后的子树的开始索引和结束索引
        //前序：[3,9,20,15,7] 中序：[9,3,15,20,7]
        //⑥递归处理左区间和右区间
        int leftLen = index - inBegin;
        root.left = buildSubTree(preorder,preBegin+1,preBegin+leftLen+1,inorder,inBegin,index);
        root.right = buildSubTree(preorder,preBegin+leftLen+1,preEnd,inorder,index+1,inEnd);
        return root;
     }
}
```

#### 2.2.1.3 方法3

```java
class Solution {
    Map<Integer,Integer> map = new HashMap<>();
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        //存储中序数组的元素和对应的索引
        for(int i=0;i<inorder.length;i++){
            map.put(inorder[i],i);
        }
        //开始递归
        return buildSubTree(preorder,0,preorder.length,inorder,0,inorder.length);
    }
    //递归法 三步走
    //1.确定形参和返回值
    public TreeNode buildSubTree(int[] preorder,int preBegin,int preEnd,int[] inorder,int inBegin,int inEnd){
        //2.确定终止条件
        //①如果数组大小为零的话，说明是空节点了
        if(preBegin == preEnd || inBegin == inEnd) return null;

        //3.确定单层递归逻辑
        //②如果不为空，那么取前序数组第一个元素作为节点元素
        int val = preorder[preBegin];
        TreeNode root = new TreeNode(val);
        //③找到前序数组第一个元素在中序数组的位置，作为切割点
        int index = map.get(val);
        int leftLen = index - inBegin;
        //下面是本题的关键，获取切割之后的子树的开始索引和结束索引
        //前序：[3,9,20,15,7] 中序：[9,3,15,20,7]
        //⑥递归处理左区间和右区间
        root.left = buildSubTree(preorder,preBegin+1,preBegin+leftLen+1,inorder,inBegin,index);
        root.right = buildSubTree(preorder,preBegin+leftLen+1,preEnd,inorder,index+1,inEnd);
        //返回结果
        return root;
    }
}
```

### 2.2.2 迭代法

```java
class Solution {
    public TreeNode buildTree(int[] preorder, int[] inorder) {
        //迭代法 借助栈
        //首先判断特殊情况
        if (preorder == null || preorder.length == 0) {
            return null;
        }
        //创建栈，存储中间节点
        Stack<TreeNode> stack = new Stack<>();
        //创建根节点：根节点为前序数组的第一个元素
        TreeNode root = new TreeNode(preorder[0]);
        //根节点入栈
        stack.push(root);
        int inorderIndex = 0;
        //开始迭代
        //前序：[3,9,20,15,7] 中序：[9,3,15,20,7]
        for (int i = 1; i < preorder.length; i++) {
            int preorderVal = preorder[i];
            TreeNode node = stack.peek();
            if (node.val != inorder[inorderIndex]) {
                //说明该节点肯定存在左子树
                node.left = new TreeNode(preorderVal);
                stack.push(node.left);
            } else {
                //不存在左子树，只存在右子树
                while (!stack.isEmpty() && stack.peek().val == inorder[inorderIndex]) {
                    node = stack.pop();
                    inorderIndex++;
                }
                node.right = new TreeNode(preorderVal);
                stack.push(node.right);
            }
        }
        //返回根节点
        return root;
    }
}
```

# 3.[654. 最大二叉树](https://leetcode.cn/problems/maximum-binary-tree/)

## 3.1 题目描述

给定一个不重复的整数数组 `nums` 。 **最大二叉树** 可以用下面的算法从 `nums` 递归地构建:

1. 创建一个根节点，其值为 `nums` 中的最大值。
2. 递归地在最大值 **左边** 的 **子数组前缀上** 构建左子树。
3. 递归地在最大值 **右边** 的 **子数组后缀上** 构建右子树。

返回 *`nums` 构建的* ***最大二叉树\*** 。

**示例 1：**

![img](https://assets.leetcode.com/uploads/2020/12/24/tree1.jpg)

> 输入：nums = [3,2,1,6,0,5]
> 输出：[6,3,5,null,2,0,null,null,1]
> 解释：递归调用如下所示：
> - [3,2,1,6,0,5] 中的最大值是 6 ，左边部分是 [3,2,1] ，右边部分是 [0,5] 。
>     - [3,2,1] 中的最大值是 3 ，左边部分是 [] ，右边部分是 [2,1] 。
>         - 空数组，无子节点。
>         - [2,1] 中的最大值是 2 ，左边部分是 [] ，右边部分是 [1] 。
>             - 空数组，无子节点。
>             - 只有一个元素，所以子节点是一个值为 1 的节点。
>     - [0,5] 中的最大值是 5 ，左边部分是 [0] ，右边部分是 [] 。
>         - 只有一个元素，所以子节点是一个值为 0 的节点。
>         - 空数组，无子节点。

**示例 2：**

![img](https://assets.leetcode.com/uploads/2020/12/24/tree2.jpg)

> 输入：nums = [3,2,1]
> 输出：[3,null,2,null,1]

**提示：**

- `1 <= nums.length <= 1000`
- `0 <= nums[i] <= 1000`
- `nums` 中的所有整数 **互不相同**

## 3.2 题解

- 这道题目相较于上面两道题目更简单一点，**关键一点的逻辑就是求数组的最大值及其索引位置**
- 构造树一般采用的是前序遍历，因为先构造中间节点，然后递归构造左子树和右子树
- 这道题目还是推荐使用递归法来进行求解，其中递归的单层递归逻辑包含一下三步：
  - 先要找到数组中最大的值和对应的下标， 最大的值构造根节点，下标用来下一步分割数组。
  - 根据最大值所在的下标左区间 构造左子树
  - 根据最大值所在的下标右区间 构造右子树

- 图解：

![654.最大二叉树](https://code-thinking.cdn.bcebos.com/gifs/654.%E6%9C%80%E5%A4%A7%E4%BA%8C%E5%8F%89%E6%A0%91.gif)

### 3.2.1 递归法

#### 写法1

```java
class Solution {
    //递归法 三步走
    //1.使用题目确定的形参和返回值
    public TreeNode constructMaximumBinaryTree(int[] nums) {
        //2.确定终止条件
        if(nums == null || nums.length == 0) return null;

        //3.确定单层递归逻辑
        //找到数组中的最大值及其索引
        int max = Integer.MIN_VALUE;
        int index = -1;
        for(int i = 0;i<nums.length;i++){
            if(nums[i] > max){
                max = nums[i];
                index = i;
            }
        }
        //创建根节点
        TreeNode root = new TreeNode(max);

        //递归左子树
        //左子树长度
        int leftLen = index;
        if(leftLen>0){
            //创建数组
            int[] leftArr = new int[leftLen];
            for(int i=0;i<leftLen;i++){
                leftArr[i] = nums[i];
            }
            root.left = constructMaximumBinaryTree(leftArr);
        }

        //递归右子树
        //右子树的长度
        int rightLen = nums.length - leftLen -1;
        if(rightLen>0){
            //创建数组
            int[] rightArr = new int[rightLen];
            for(int i=0;i<rightLen;i++){
                rightArr[i] = nums[i+index+1];
            }
            root.right = constructMaximumBinaryTree(rightArr);
        }

        //返回结果
        return root;
    }
}
```

#### 写法2

```java
class Solution {
    public TreeNode constructMaximumBinaryTree(int[] nums) {
        return constructMaximumBinaryTree(nums,0,nums.length);
    }
    //递归法 三步走
    //1.确定的形参和返回值
    public TreeNode constructMaximumBinaryTree(int[] nums,int begin,int end) {
        //2.确定终止条件
        if(nums == null || begin >= end) return null;

        //3.确定单层递归逻辑
        //找到数组中的最大值及其索引
        int max = Integer.MIN_VALUE;
        int index = -1;
        for(int i = begin;i<end;i++){
            if(nums[i] > max){
                max = nums[i];
                index = i;
            }
        }
        //创建根节点
        TreeNode root = new TreeNode(max);
        //递归左子树
        root.left = constructMaximumBinaryTree(nums,begin,index);
        //递归右子树
        root.right = constructMaximumBinaryTree(nums,index+1,end);

        //返回结果
        return root;
    }
}
```

# 4.[617. 合并二叉树](https://leetcode.cn/problems/merge-two-binary-trees/)

## 4.1 题目描述

给你两棵二叉树： `root1` 和 `root2` 。

想象一下，当你将其中一棵覆盖到另一棵之上时，两棵树上的一些节点将会重叠（而另一些不会）。你需要将这两棵树合并成一棵新二叉树。合并的规则是：如果两个节点重叠，那么将这两个节点的值相加作为合并后节点的新值；否则，**不为** null 的节点将直接作为新二叉树的节点。

返回合并后的二叉树。

**注意:** 合并过程必须从两个树的根节点开始。

**示例 1：**

![img](https://assets.leetcode.com/uploads/2021/02/05/merge.jpg)

```
输入：root1 = [1,3,2,5], root2 = [2,1,3,null,4,null,7]
输出：[3,4,5,5,4,null,7]
```

**示例 2：**

```
输入：root1 = [1], root2 = [1,2]
输出：[2,2]
```

**提示：**

- 两棵树中的节点数目在范围 `[0, 2000]` 内
- `-104 <= Node.val <= 104`

## 4.2 题解

- 不知道大家看到这题目，有没有发现这道题和这道题目[101. 对称二叉树](https://leetcode.cn/problems/symmetric-tree/)有点类似，**本质是同时遍历两个二叉树**，在遍历的过程进行响应逻辑
- 二叉树中只要是需要遍历求解的问题，就能够通过深度优先遍历和广度优先遍历两种方法来做
- **算法逻辑：同时按相同顺序递归两棵树，（注意一定是要同时，按照相同的顺序），在遍历的过程全部围绕下面两种情况进行判断：假设遍历的两个节点分别为`t1`和`t2`**
  - **情况1：** 如果有一个为空，假设如果``t1 == NULL`了，两个树合并就应该是`t2`了（如果t2也为NULL也无所谓，合并之后就是NULL）
  - **情况2：** 如果不为空，就要把两棵树的元素加到一起，继续进行下一层递归
  - 注意：**在递归的过程中为了避免重新创建一棵树，我们可以复用其中一棵树，假设将t2树合并到t1上，最终t1就是合并之后的根节点**
- 下面两种方法的本质就是遍历二叉树，如果对二叉树遍历方法还不熟悉的小伙伴可以看看毛毛张的这篇博客：
  - [LeetCode刷题笔记：二叉树前序遍历、中序遍历、后序遍历和层序遍历 | 递归法 | 迭代法 | 统一迭代法 | 深度优先搜索 | 广度优先搜索](https://blog.csdn.net/weixin_48235955/article/details/139028925)

### 4.2.1 深度优先遍历

#### 递归法

```java
class Solution {
    //递归法 三步走
    //1.使用题目确定的形参和返回值
    public TreeNode mergeTrees(TreeNode root1, TreeNode root2) {
        //2.确定终止条件
        if(root1 == null) return root2;
        if(root2 == null) return root1;

        //3.确定单层递归条件
        int newVal = root1.val + root2.val;
        TreeNode root = new TreeNode(newVal);
        //递归左子树
        root.left = mergeTrees(root1.left,root2.left);
        //递归右子树
        root.right = mergeTrees(root1.right,root2.right);

        //返回结果
        return root;
    }
}
```

#### 迭代法：借助栈

```java
class Solution {
    public TreeNode mergeTrees(TreeNode root1, TreeNode root2) {
        //判断特殊情况
        if(root1 == null) return root2;
        if(root2 == null) return root1;
        //深度优先遍历 迭代法 借助栈
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        stack.push(root2);
        stack.push(root1);
        //注意入栈和出栈的顺序
        while(!stack.isEmpty()){
            TreeNode node1 = stack.pop();
            TreeNode node2 = stack.pop();
            node1.val += node2.val;

            if(node1.left != null && node2.left != null){
                stack.push(node2.left);
                stack.push(node1.left);
            }else{
                if(node1.left == null && node2.left != null){
                    node1.left = node2.left;
                }
            }

            if(node1.right != null && node2.right != null){
                stack.push(node2.right);
                stack.push(node1.right);
            }else{
                if(node1.right == null && node2.right !=null){
                    node1.right = node2.right;
                }
            }
        }
        //返回结果
        return root1;
    }
}
```

### 4.2.2 广度优先遍历：借助队列

```java
class Solution {
    public TreeNode mergeTrees(TreeNode root1, TreeNode root2) {
        //判断特殊情况
        if(root1 == null) return root2;
        if(root2 == null) return root1;
        //广度优先遍历 借助队列
        //创建队列
        Queue<TreeNode> queue = new LinkedList<>();
        //根节点入队
        queue.offer(root1);
        queue.offer(root2);
        //开始遍历
        while(!queue.isEmpty()){
            //获取每一层的节点数
            int size = queue.size()/2;
            for(int i = 0;i<size;i++){
                TreeNode node1 = queue.poll();
                TreeNode node2 = queue.poll();
                node1.val += node2.val;

                //左子树
                if(node1.left != null && node2.left != null){
                    queue.offer(node1.left);
                    queue.offer(node2.left);
                }else{
                    if(node1.left == null && node2.left != null){
                        node1.left = node2.left;
                    }
                }

                //右子树
                if(node1.right != null && node2.right != null){
                    queue.offer(node1.right);
                    queue.offer(node2.right);
                }else{
                    if(node1.right == null && node2.right != null){
                        node1.right = node2.right;
                    }
                }
            }

        }
        //返回结果
        return root1;
    }
}
```
