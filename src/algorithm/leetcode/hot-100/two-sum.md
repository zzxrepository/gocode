---
title: 两数之和：哈希表解法（Go / Java）
---

# 两数之和：哈希表解法（Go / Java）

> LeetCode 第 1 题，也是 Hot 100 的经典起点。

## 题目

给定一个整数数组 `nums` 和目标值 `target`，请在数组中找出**两个不同下标**，使其对应的两个整数之和等于 `target`。题目保证存在唯一答案，且同一个元素不能重复使用。

- 力扣官方题目：[1. 两数之和](https://leetcode.cn/problems/two-sum/)

示例：`nums = [2, 7, 11, 15]`，`target = 9`，答案为 `[0, 1]`，因为 `2 + 7 = 9`。

## 思路：一次遍历 + 哈希表

遍历到当前值 `num` 时，所需的另一个值为 `target - num`：

1. 如果哈希表已经保存了这个“所需值”，立即返回它的下标和当前下标；
2. 否则，把当前值及其下标存入哈希表；
3. 这样不会重复使用当前元素，时间复杂度为 `O(n)`，空间复杂度为 `O(n)`。

## Go 版本

```go
func twoSum(nums []int, target int) []int {
	indexByValue := make(map[int]int, len(nums))

	for index, num := range nums {
		if matchedIndex, ok := indexByValue[target-num]; ok {
			return []int{matchedIndex, index}
		}

		indexByValue[num] = index
	}

	return nil
}
```

## Java 版本

```java
import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> indexByValue = new HashMap<>();

        for (int index = 0; index < nums.length; index++) {
            int num = nums[index];
            int need = target - num;

            if (indexByValue.containsKey(need)) {
                return new int[] {indexByValue.get(need), index};
            }

            indexByValue.put(num, index);
        }

        return new int[0];
    }
}
```

## 易错点

- 必须先查哈希表、后放入当前元素，否则 `target = 2 * num` 时可能错误地复用同一位置。
- 哈希表的键是“数值”，值是“下标”。
- 题目只要求返回下标，不要求返回两个数。
