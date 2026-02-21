# 子任务 7：Reader 批量写与副作用保持一致

## 目标
- 评论写库集中批量执行，并保持 ws 与评分/奖励副作用一致

## 修改范围
- 文件：src/services/reader-agent.service.ts
  - 函数：persistReaderComment（拆为写任务结构）
  - 函数：persistReaderCommentBatch（新增）
  - 函数：dispatchReaderAgents（写库阶段改为批量）

## 具体调整
- persistReaderComment 改为返回 ReaderWriteJob
- persistReaderCommentBatch 统一执行 comment.create 与 chapter.update
- 保留 wsEvents.newComment、scoreService.calculateFullScore、awardInkForComment
- 删除旧的逐条写入路径

## 验收标准
- 评论入库数量与原逻辑一致
- ws 通知、热度更新、奖励逻辑仍按原触发
- 写库阶段仅在 persistReaderCommentBatch 中执行
