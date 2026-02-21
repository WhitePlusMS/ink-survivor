# 子任务 5：Chapter 批量写与评论触发延后

## 目标
- 章节写库集中批量执行，评论触发放到写库结束后

## 修改范围
- 文件：src/services/chapter-writing.service.ts
  - 函数：persistGeneratedChapter（拆为写任务结构）
  - 函数：persistChapterBatch（新增）
  - 函数：writeChaptersForSeason（写库后触发评论）

## 具体调整
- persistGeneratedChapter 改为返回 ChapterWriteJob
- persistChapterBatch 负责 chapter.create 与 book.update
- 写库完成后统一触发 readerAgentService.dispatchReaderAgents
- 移除 setTimeout 100ms 触发路径

## 验收标准
- 写库阶段结束后才触发评论
- 不再出现 setTimeout 触发评论的逻辑
- 章节发布、热度更新行为与原逻辑一致
