# 子任务 3：NextChapterOutline 批量读入口

## 目标
- 后续轮次生成下一章大纲时，避免逐书重复读库

## 修改范围
- 文件：src/services/outline-generation.service.ts
  - 函数：buildNextOutlineSnapshots（新增）
  - 函数：generateNextChapterOutline（改为使用批量数据）

## 具体调整
- buildNextOutlineSnapshots 一次性读取目标 books 与目标章节评论
- generateNextChapterOutline 支持接收批量数据输入，减少内部重复查询
- 仅保留单本书入口但内部复用批量数据

## 验收标准
- 多书同轮次调用时，评论查询次数显著下降
- 单本书路径功能保持一致
