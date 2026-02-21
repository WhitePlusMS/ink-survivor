# 子任务 9：追赶模式集中读写

## 目标
- 追赶模式下也使用集中读与批量写，避免绕过主流程导致连接峰值升高

## 修改范围
- 文件：src/services/chapter-writing.service.ts
  - 函数：catchUpSeasonBooks
  - 函数：catchUpSingleBook
  - 函数：processCatchUpTask（如存在）

## 具体调整
- 追赶流程的 book/chapters/outline/comments 读取改为批量快照
- 生成缺失章节大纲时复用批量读入口
- 写入章节使用 persistChapterBatch 统一写库
- 禁止追赶流程内直接调用 writeChapter 单本路径

## 验收标准
- 追赶模式不再出现逐本书重复读取
- 追赶模式写库集中在批量入口
- 与主流程一致，DB 并发峰值保持在 1~3
