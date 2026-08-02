# [543. 二叉树的直径](https://leetcode.cn/problems/diameter-of-binary-tree/)

标签：简单

## 题目描述

给你一棵二叉树的根节点，返回该树的 **直径** 。

二叉树的 **直径** 是指树中任意两个节点之间最长路径的 **长度** 。这条路径可能经过也可能不经过根节点 `root` 。

两节点之间路径的 **长度** 由它们之间边数表示。

 

**示例 1：**

![img](https://assets.leetcode.com/uploads/2021/03/06/diamtree.jpg)

```
输入：root = [1,2,3,4,5]
输出：3
解释：3 ，取路径 [4,2,1,3] 或 [5,2,1,3] 的长度。
```

**示例 2：**

```
输入：root = [1,2]
输出：1
```

 

**提示：**

- 树中节点数目在范围 `[1, 104]` 内
- `-100 <= Node.val <= 100`





## 题解

```java
class Solution {
    //全局直径最大值
    int maxLength = Integer.MIN_VALUE;
    public int diameterOfBinaryTree(TreeNode root) {
        //遍历每个节点
        dfs(root);
        //返回结果
        return maxLength;
    }
    //递归法 计算树的高度
    //1.确定形参和返回值
    public int dfs(TreeNode cur){
        //2.确定终止条件
        if(cur == null) return 0;
        
        //3.确定单层递归逻辑
        //左边树的高度
        int leftHeight = dfs(cur.left);
        //右边树的高度
        int rightHeight = dfs(cur.right);
        //当前节点的树的直径
        int length = leftHeight + rightHeight;
        //更新全局直径
        maxLength = Math.max(maxLength,length);

        //返回树的高度
        return 1 + Math.max(leftHeight,rightHeight);
    }
}
```







# 8.[124. 二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/)

> LeetCode难度标签：难

## 8.1题目描述

二叉树中的 **路径** 被定义为一条节点序列，序列中每对相邻节点之间都存在一条边。同一个节点在一条路径序列中 **至多出现一次** 。该路径 **至少包含一个** 节点，且不一定经过根节点。

**路径和** 是路径中各节点值的总和。

给你一个二叉树的根节点 `root` ，返回其 **最大路径和** 。

 

**示例 1：**

![img](https://assets.leetcode.com/uploads/2020/10/13/exx1.jpg)

```
输入：root = [1,2,3]
输出：6
解释：最优路径是 2 -> 1 -> 3 ，路径和为 2 + 1 + 3 = 6
```

**示例 2：**

![img](https://assets.leetcode.com/uploads/2020/10/13/exx2.jpg)

```
输入：root = [-10,9,20,null,null,15,7]
输出：42
解释：最优路径是 15 -> 20 -> 7 ，路径和为 15 + 20 + 7 = 42
```

 

**提示：**

- 树中节点数目范围是 `[1, 3 * 104]`
- `-1000 <= Node.val <= 1000`

## 8.2 题解



```java
class Solution {
    //全局变量 存储最大路径和
    int maxSum = Integer.MIN_VALUE;
    public int maxPathSum(TreeNode root) {
        maxGain(root);
        return maxSum;
    }
    //递归法 三步走
    //1.确定形参和返回值
    public int maxGain(TreeNode node) {
        //2.确定终止条件
        if (node == null) {
            return 0;
        }
        //确定单层递归逻辑：递归计算左右子节点的最大贡献值
        //只有在最大贡献值大于 0 时，才会选取对应子节点
        int leftGain = Math.max(maxGain(node.left), 0);
        int rightGain = Math.max(maxGain(node.right), 0);

        //节点的最大路径和取决于该节点的值与该节点的左右子节点的最大贡献值
        int priceNewpath = node.val + leftGain + rightGain;

        // 更新答案
        maxSum = Math.max(maxSum, priceNewpath);

        // 返回节点的最大贡献值
        return node.val + Math.max(leftGain, rightGain);
    }
}
```





# 相关题目

[2246. 相邻字符不同的最长路径](https://leetcode.cn/problems/longest-path-with-different-adjacent-characters/)

[687. 最长同值路径](https://leetcode.cn/problems/longest-univalue-path/)

[1617. 统计子树中城市之间最大距离](https://leetcode.cn/problems/count-subtrees-with-max-distance-between-cities/)

[2539. 最大价值和与最小价值和的差值](https://leetcode.cn/problems/difference-between-maximum-and-minimum-price-sum/)