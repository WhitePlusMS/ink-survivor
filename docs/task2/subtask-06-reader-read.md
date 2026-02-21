# 子任务 6：Reader 集中读与快照

## 目标
- 评论阶段读库集中在单一入口，减少每个 Agent 的重复查询

## 修改范围
- 文件：src/services/reader-agent.service.ts
  - 函数：buildReaderSnapshot（新增）
  - 函数：dispatchReaderAgents（改为快照驱动）
  - 函数：prepareReaderComment（使用快照数据）

## 具体调整
- 新增 ReaderReadSnapshot，包含 chapter/book/author/已有 AI 评论 userIds/读者列表/排名
- dispatchReaderAgents 使用 buildReaderSnapshot 取数
- prepareReaderComment 使用 snapshot.existingAiCommentUserIds 做去重判断，减少 comment.findFirst

## 验收标准
- dispatchReaderAgents 仅在快照入口读取章节与读者列表
- AI 重复评论校验不再触发 per-agent comment 查询
- 评论生成逻辑与原结果一致
