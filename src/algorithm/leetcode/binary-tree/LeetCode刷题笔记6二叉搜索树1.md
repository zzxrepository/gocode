# 1.[700. 二叉搜索树中的搜索](https://leetcode.cn/problems/search-in-a-binary-search-tree/)

## 1.1 题目描述

给定二叉搜索树（BST）的根节点 `root` 和一个整数值 `val`。

你需要在 BST 中找到节点值等于 `val` 的节点。 返回以该节点为根的子树。 如果节点不存在，则返回 `null` 。

 

**示例 1:**

![img](https://assets.leetcode.com/uploads/2021/01/12/tree1.jpg)

```
输入：root = [4,2,7,1,3], val = 2
输出：[2,1,3]
```

**示例 2:**

![img](https://assets.leetcode.com/uploads/2021/01/12/tree2.jpg)

```
输入：root = [4,2,7,1,3], val = 5
输出：[]
```

 

**提示：**

- 树中节点数在 `[1, 5000]` 范围内
- `1 <= Node.val <= 107`
- `root` 是二叉搜索树
- `1 <= val <= 107`

## 1.2 题解

### 1.2.1 深度优先搜索

#### 递归法

```java
class Solution {
    //递归法 三步走
    //1.使用题目确定的形参和返回值
    public TreeNode searchBST(TreeNode root, int val) {
        //2.确定终止条件
        if(root == null) return null;

        //3.确定单层递归逻辑
        if(val == root.val) return root;
        else if(val < root.val) return searchBST(root.left,val);
        else return searchBST(root.right,val);
    }
}
```

#### 迭代法

```java
class Solution {
    public TreeNode searchBST(TreeNode root, int val) {
        //深度优先遍历 迭代法 借助栈
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        if(root != null) stack.push(root);
        //开始迭代
        while(!stack.isEmpty()){
            TreeNode cur = stack.pop();
            if(val == cur.val) return cur;

            //由于是二叉搜索树，如果不相等只需要将左右子树中的一个子树入栈就行
            if(cur.left != null && val < cur.val){
                stack.push(cur.left);
            }else if(cur.right != null && val > cur.val){
                stack.push(cur.right);
            }
        }
        //如果迭代完没有碰到相等的，就返回null
        return null;
    }
}
```



### 1.2.2 广度优先遍历

```java
class Solution {
    public TreeNode searchBST(TreeNode root, int val) {
        //广度优先遍历 借助队列
        //创建队列
        Queue<TreeNode> queue = new LinkedList<>();
        //判断特殊情况
        if(root != null) queue.offer(root);
        //开始迭代
        while(!queue.isEmpty()){
            //获取每一层的节点数
            int size = queue.size();
            for(int i=0;i<size;i++){
                TreeNode cur = queue.poll();
                if(val == cur.val) return cur;
                //由于是二叉搜索树，如果不相等只需要将左右子树中的一个子树入队就行
                if(cur.left != null && val < cur.val){
                    queue.offer(cur.left);
                }else if(cur.right != null && val > cur.val){
                    queue.offer(cur.right);
                }
            }
        }
        //如果迭代完没有碰到相等的，就返回null
        return null;
    }
}
```

# 2.[98. 验证二叉搜索树](https://leetcode.cn/problems/validate-binary-search-tree/)

## 2.1 题目描述

给你一个二叉树的根节点 `root` ，判断其是否是一个有效的二叉搜索树。

**有效** 二叉搜索树定义如下：

- 节点的左子树只包含 **小于** 当前节点的数。

- 节点的右子树只包含 **大于** 当前节点的数。

- 所有左子树和右子树自身必须也是二叉搜索树。

 

**示例 1：**

![img](https://assets.leetcode.com/uploads/2020/12/01/tree1.jpg)

```
输入：root = [2,1,3]
输出：true
```

**示例 2：**

![img](https://assets.leetcode.com/uploads/2020/12/01/tree2.jpg)

```
输入：root = [5,1,4,null,null,3,6]
输出：false
解释：根节点的值是 5 ，但是右子节点的值是 4 。
```

 

**提示：**

- 树中节点数目范围在`[1, 104]` 内
- `-231 <= Node.val <= 231 - 1`



## 2.2 题解

### 2.2.1 前序遍历+递归

```java
class Solution {
    public boolean isValidBST(TreeNode root) {
        return isValidBST(root,Long.MIN_VALUE,Long.MAX_VALUE);
    }
    //递归法 三步走
    //1.确定形参和返回值
    public boolean isValidBST(TreeNode root,long lower,long upper){
        //2.确定终止条件
        if(root == null) return true;
        if(root.val <= lower || root.val >= upper) return false;
        //3.确定单层递归逻辑
        return isValidBST(root.left,lower,root.val) && isValidBST(root.right,root.val,upper);
    }
}
```

### 2.2.2 中序遍历

#### 1.迭代法-单层循环

```java
class Solution {
    public boolean isValidBST(TreeNode root) {
        //中序遍历 迭代法
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        //记录中序遍历上一个结点
        TreeNode pre = null;
        //记录中序遍历当前结点
        TreeNode cur = root;
        //开始迭代
        while(cur != null || !stack.isEmpty()){
            if(cur != null){
                stack.push(cur);
                cur = cur.left;
            }else{
                cur = stack.pop();
                //如果中序遍历当前节点值小于等于前一个节点值，说明不是二叉搜索树
                if(pre != null && cur.val <= pre.val) return false;
                pre = cur;
                cur = cur.right;
            }
        }
        //如果迭代过程中没有不符合条件的，就是二叉搜索树
        return true;
    }
}
```

#### 2.迭代法-双层循环

```java
class Solution {
    public boolean isValidBST(TreeNode root) {
        //中序遍历 迭代法
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        //记录中序遍历上一个结点
        TreeNode pre = null;
        //记录中序遍历当前结点
        TreeNode cur = root;
        //开始迭代
        while(cur != null || !stack.isEmpty()){
            while(cur != null){
                stack.push(cur);
                cur = cur.left;
            }

            cur = stack.pop();
            //如果中序遍历当前节点值小于等于前一个节点值，说明不是二叉搜索树
            if(pre != null && cur.val <= pre.val) return false;
            pre = cur;
            cur = cur.right;
        }
        //如果迭代过程中没有不符合条件的，就是二叉搜索树
        return true;
    }
}
```

#### 3.递归

```java
class Solution {
    //递归法 三步走
    //1.使用题目确定的形参和方法值
    //定义全局最大值
    TreeNode maxNode;
    public boolean isValidBST(TreeNode root) {
        //2.确定终止条件
        if(root == null) return true;

        //3.确定单层递归逻辑
        //左
        boolean leftFlag = isValidBST(root.left);
        if(!leftFlag) return false;

        //中
        if(maxNode != null  && root.val <= maxNode.val){
            return false;
        }
        maxNode = root;
        
        //右
        boolean rightFlag = isValidBST(root.right);
        
        //返回结果
        return rightFlag;
    }
}
```

#### 4.暴力解法

```java
class Solution {
    public boolean isValidBST(TreeNode root) {
        //递归法 三步走
        //发现中序遍历树，三个值是从小到大的就行了
        List<Integer> list = new ArrayList<>();
        inOrderTraversal(root,list);
        //判断结果
        boolean result = true;
        for(int i = 0;i<list.size()-1;i++){
            if(list.get(i) >= list.get(i+1)){
                result = false;
                break;
            }
        }
        return result;
    }

    //中序遍历 递归 三步走
    //1.确定形参和返回值
    public void inOrderTraversal(TreeNode node,List<Integer> list){
        //2.确定终止条件
        if(node == null) return;

        //3.确定单层递归的逻辑
        //左节点
        inOrderTraversal(node.left,list);
        //中间节点
        list.add(node.val);
        //右节点
        inOrderTraversal(node.right,list);
    }
}
```









# 3.[530. 二叉搜索树的最小绝对差](https://leetcode.cn/problems/minimum-absolute-difference-in-bst/)

## 3.1 题目描述

给你一个二叉搜索树的根节点 `root` ，返回 **树中任意两不同节点值之间的最小差值** 。

差值是一个正数，其数值等于两值之差的绝对值。

**示例 1：**

![img](https://assets.leetcode.com/uploads/2021/02/05/bst1.jpg)

```
输入：root = [4,2,6,1,3]
输出：1
```

**示例 2：**

![img](https://assets.leetcode.com/uploads/2021/02/05/bst2.jpg)

```
输入：root = [1,0,48,null,null,12,49]
输出：1
```

**提示：**

- 树中节点的数目范围是 `[2, 104]`
- `0 <= Node.val <= 105`

**注意：**本题与 783 https://leetcode-cn.com/problems/minimum-distance-between-bst-nodes/ 相同

## 3.2 题解

### 3.2.1 暴力解法

```java
class Solution {
    public int getMinimumDifference(TreeNode root) {
        //暴力解法
        //创建列表记录二叉搜索树的所有节点值
        List<Integer> list = new ArrayList<>();
        //递归遍历二叉树
        inOrderTraversal(root,list);
        //开始计算
        int minDiff = Integer.MAX_VALUE;
        for(int i = 0;i<list.size()-1;i++){
            //计算相邻两节点的差值
            int diff = list.get(i+1)-list.get(i);
            if(minDiff > diff) minDiff = diff;
        }
        return minDiff;
    }

    //中序遍历 递归 三步走
    //1.确定形参和返回值
    public void inOrderTraversal(TreeNode node,List<Integer> list){
        //2.确定终止条件
        if(node == null) return;

        //3.确定单层递归的逻辑
        //左节点
        inOrderTraversal(node.left,list);
        //中间节点
        list.add(node.val);
        //右节点
        inOrderTraversal(node.right,list);
    }
}
```

### 3.2.2 递归法

```java
class Solution {
    //记录全局最小差值
    int diff = Integer.MAX_VALUE;
    //记录前一个结点
    TreeNode pre = null;
    public int getMinimumDifference(TreeNode root) {
        traversal(root);
        return diff;
    }
    public void traversal(TreeNode cur){
        //确定终止条件
        if(cur == null) return;

        //确定单层递归逻辑
        //左
        traversal(cur.left);
        //中
        if(pre != null){
            diff = (cur.val - pre.val) < diff ? (cur.val - pre.val) : diff;
        }
        pre = cur;
        //右
        traversal(cur.right);
    }
}
```

### 3.2.3 迭代法

#### 迭代法-单层循环

```java
class Solution {
    public int getMinimumDifference(TreeNode root) {
        //由于是二叉搜索树
        //不同结点之间的最小差值一定存在于相邻结点之间
        //只需要遍历二叉树，并计算递归两个结点之间的值就行
        //中序遍历比较适合  迭代法
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        //记录中序遍历上一个结点
        TreeNode pre = null;
        //记录中序遍历当前结点
        TreeNode cur = root;
        //记录相邻两结点的差值
        int diff = Integer.MAX_VALUE;
        //开始迭代
        while(cur != null || !stack.isEmpty()){
            if(cur != null){
                stack.push(cur);
                cur = cur.left;
            }else{
                cur = stack.pop();
                //如果中序遍历当前节点值小于等于前一个节点值，说明不是二叉搜索树
                if(pre != null){
                    diff = (cur.val - pre.val) < diff ? (cur.val - pre.val) : diff;
                }
                pre = cur;
                cur = cur.right;
            }
        }
        //如果迭代过程中没有不符合条件的，就是二叉搜索树
        return diff;
    }
}
```

#### 迭代法-双层循环

```java
class Solution {
    public int getMinimumDifference(TreeNode root) {
        //由于是二叉搜索树
        //不同结点之间的最小差值一定存在于相邻结点之间
        //只需要遍历二叉树，并计算递归两个结点之间的值就行
        //中序遍历比较适合  迭代法
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        //记录中序遍历上一个结点
        TreeNode pre = null;
        //记录中序遍历当前结点
        TreeNode cur = root;
        //记录相邻两结点的差值
        int diff = Integer.MAX_VALUE;
        //开始迭代
        while(cur != null || !stack.isEmpty()){
            while(cur != null){
                stack.push(cur);
                cur = cur.left;
            }
            cur = stack.pop();
            //如果中序遍历当前节点值小于等于前一个节点值，说明不是二叉搜索树
            if(pre != null){
                diff = (cur.val - pre.val) < diff ? (cur.val - pre.val) : diff;
            }
            pre = cur;
            cur = cur.right;
        }
        //如果迭代过程中没有不符合条件的，就是二叉搜索树
        return diff;
    }
}
```

#### 统一迭代法

```java
class Solution {
    public int getMinimumDifference(TreeNode root) {
        //统一迭代法 借助栈
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        //根节点入栈
        stack.push(root);
        //获取当前结点
        TreeNode cur = root;
        //记录迭代的前一个结点
        TreeNode pre = null;
        //记录差值结果
        int diff = Integer.MAX_VALUE;
        //开始迭
        while(cur != null || !stack.isEmpty()){
            if(cur != null){
                //栈顶元素弹出，重新摆放顺序
                cur = stack.pop();
                //右
                if(cur.right != null) stack.push(cur.right);
                //中
                stack.push(cur);
                stack.push(null);
                //左
                if(cur.left != null) stack.push(cur.left);
                //迭代语句
                cur = cur.left;
            }else{
                //弹出最前面的null
                stack.pop();
                //获取当前结点
                cur = stack.pop();
                //计算逻辑
                if(pre != null){
                    diff = (cur.val - pre.val) < diff ? (cur.val - pre.val) : diff;
                }
                pre = cur;
                cur = cur.right;
            }
        }
        //返回结果
        return diff;
    }
}
```

# 4.[501. 二叉搜索树中的众数](https://leetcode.cn/problems/find-mode-in-binary-search-tree/)

## 4.1 题目描述

给你一个含重复值的二叉搜索树（BST）的根节点 `root` ，找出并返回 BST 中的所有众数（即，出现频率最高的元素）。

如果树中有不止一个众数，可以按 **任意顺序** 返回。

假定 BST 满足如下定义：

- 结点左子树中所含节点的值 **小于等于** 当前节点的值
- 结点右子树中所含节点的值 **大于等于** 当前节点的值
- 左子树和右子树都是二叉搜索树

**示例 1：**

![img](https://assets.leetcode.com/uploads/2021/03/11/mode-tree.jpg)

```
输入：root = [1,null,2,2]
输出：[2]
```

**示例 2：**

```
输入：root = [0]
输出：[0]
```

**提示：**

- 树中节点的数目在范围 `[1, 104]` 内
- `-105 <= Node.val <= 105`

**进阶：**你可以不使用额外的空间吗？（假设由递归产生的隐式调用栈的开销不被计算在内）

## 4.2 题解

### 4.2.1 递归法

```java
class Solution {
    //创建列表记录众数结果
    List<Integer> list = new ArrayList<>();
    //定义计数器
    int count;
    //定义最大频率
    int maxCount;
    //定义前面结点的值
    TreeNode pre = null;
    public int[] findMode(TreeNode root) {
        //递归
        traversal(root);
        //返回结果
        //获取列表的长度
        int length = list.size();
        //根据列表长度创建返回值数组
        int[] res = new int[length];
        for (int i = 0; i < length; i++) {
            res[i] = list.get(i);
        }
        return res;
    }
    //递归法 三步走
    //1.确定形参和返回值
    public void traversal(TreeNode cur){
        //2.确定终止条件
        if(cur == null) return;
        //左
        traversal(cur.left);
        //中
        //核心处理代码
        //计数
        if(pre == null || cur.val != pre.val){
            count = 1;
        }else{
            count++;
        }

        //更新结果
        if(count > maxCount){
            list.clear();
            maxCount = count;
            list.add(cur.val);
        }else if(count == maxCount){
            list.add(cur.val);
        }

        //更新指针指向前面一个元素
        pre = cur;
        //右
        traversal(cur.right);
    }
}
```





### 4.2.2 迭代法

#### 迭代法-单层循环

```java
class Solution {
    public int[] findMode(TreeNode root) {
        //由于是二叉搜索树，相等的元素一定是位于相邻的两个结点
        //中序遍历 使用迭代法 借助栈
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        //获取当前结点
        TreeNode cur = root;
        //记录前一个结点
        TreeNode pre = null;
        //创建集合
        ArrayList<Integer> list= new ArrayList<>();
        //计数器
        int count = 0;
        //记录上一次的计数器的最大值
        int maxCount = 0;
        while(cur != null || !stack.isEmpty()){
            if(cur != null){
                stack.push(cur);
                cur = cur.left;
            }else{
                //获取当前结点
                cur = stack.pop();

                //计数
                if(pre == null || cur.val != pre.val){
                    count = 1;
                }else{
                    count++;
                }

                //更新结果
                if(count > maxCount){
                    list.clear();
                    maxCount = count;
                    list.add(cur.val);
                }else if(count == maxCount){
                    list.add(cur.val);
                }

                //迭代
                pre = cur;
                cur = cur.right;
            }
        }
        //返回结果
        //获取列表的长度
        int length = list.size();
        //根据列表长度创建返回值数组
        int[] res = new int[length];
        for (int i = 0; i < length; i++) {
            res[i] = list.get(i);
        }
        return res;
    }
}
```

#### 迭代法-双层循环

```java
class Solution {
    public int[] findMode(TreeNode root) {
        //由于是二叉搜索树，相等的元素一定是位于相邻的两个结点
        //中序遍历 使用迭代法 借助栈
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        //获取当前结点
        TreeNode cur = root;
        //记录前一个结点
        TreeNode pre = null;
        //创建集合
        ArrayList<Integer> list= new ArrayList<>();
        //计数器
        int count = 0;
        //记录上一次的计数器的最大值
        int maxCount = 0;
        while(cur != null || !stack.isEmpty()){
            while(cur != null){
                stack.push(cur);
                cur = cur.left;
            }

            //获取当前结点
            cur = stack.pop();

            //计数
            if(pre == null || cur.val != pre.val){
                count = 1;
            }else{
                count++;
            }

            //更新结果
            if(count > maxCount){
                list.clear();
                maxCount = count;
                list.add(cur.val);
            }else if(count == maxCount){
                list.add(cur.val);
            }

            //迭代
            pre = cur;
            cur = cur.right;
        }
        //返回结果
        //获取列表的长度
        int length = list.size();
        //根据列表长度创建返回值数组
        int[] res = new int[length];
        for (int i = 0; i < length; i++) {
            res[i] = list.get(i);
        }
        return res;
    }
}
```

#### 统一迭代法

```java
class Solution {
    public int[] findMode(TreeNode root) {
        //统一迭代法 借助栈
        //创建栈
        Stack<TreeNode> stack = new Stack<>();
        if(root != null) stack.push(root);
        //记录前一个结点
        TreeNode pre = null;
        //创建集合
        ArrayList<Integer> list= new ArrayList<>();
        //计数器
        int count = 0;
        //记录上一次的计数器的最大值
        int maxCount = 0;
        
        //开始迭代
        while(!stack.isEmpty()){
            //获取当前结点
            TreeNode cur = stack.peek();
            if(cur != null){
                stack.pop();
                //右
                if(cur.right != null) stack.push(cur.right);
                //中
                stack.add(cur);
                stack.add(null);
                //左
                if(cur.left != null) stack.push(cur.left);
            }else{
                stack.pop();
                cur = stack.pop();
                
                //计数
                if(pre == null || cur.val != pre.val){
                    count = 1;
                }else{
                    count++;
                }

                //更新结果
                if(count > maxCount){
                    list.clear();
                    maxCount = count;
                    list.add(cur.val);
                }else if(count == maxCount){
                    list.add(cur.val);
                }

                //迭代
                pre = cur;
                cur = cur.right;
            }
        }

        //返回结果
        //获取列表的长度
        int length = list.size();
        //根据列表长度创建返回值数组
        int[] res = new int[length];
        for (int i = 0; i < length; i++) {
            res[i] = list.get(i);
        }
        return res;  
    }
}
```

### 4.2.3 暴力解法

```java
class Solution {
	public int[] findMode(TreeNode root) {
        //如果不考虑二叉搜索树，一般的解法
        //创建map集合用于记录所有元素出现的频次
		Map<Integer, Integer> map = new HashMap<>();
        //创建列表，用于记录频率出现最高的元素
		List<Integer> list = new ArrayList<>();
        //判断特殊情况
		if (root == null){
            return list.stream().mapToInt(Integer::intValue).toArray();
        }
        
		// 遍历二叉树，获得所有元素出现的次数
		searchBST(root, map);
        //根据出现的频次对map集合中的元素进行排序，并转换成列表
		List<Map.Entry<Integer, Integer>> mapList = map.entrySet().stream()
				.sorted((c1, c2) -> c2.getValue().compareTo(c1.getValue()))
				.collect(Collectors.toList());
        //获取出现最高频次的元素
		list.add(mapList.get(0).getKey());
		// 把频率最高的加入 list 可能会出现多过
		for(int i = 1; i < mapList.size(); i++){
			if (mapList.get(i).getValue() == mapList.get(0).getValue()) {
				list.add(mapList.get(i).getKey());
			} else {
				break;
			}
		}
        //将列表转化成数组返回
		return list.stream().mapToInt(Integer::intValue).toArray();
	}

    //递归法 前序遍历
	public void searchBST(TreeNode cur, Map<Integer, Integer> map) {
		if (cur == null) return;
        //如果没出现过就指定为0：map.getOrDefault(cur.val, 0)
		map.put(cur.val, map.getOrDefault(cur.val, 0) + 1);
		searchBST(cur.left, map);
		searchBST(cur.right, map);
	}
}
```

