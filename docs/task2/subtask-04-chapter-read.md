# 子任务 4：Chapter 集中读与快照

## 目标
- 将章节生成阶段读库集中到单一入口，减少 prepare 内重复查询

## 修改范围
- 文件：src/services/chapter-writing.service.ts
  - 函数：buildChapterSnapshots（新增）
  - 函数：prepareChapterGeneration（改为接收快照）
  - 函数：writeChaptersForSeason（改为快照驱动）

## 具体调整
- 新增 ChapterReadSnapshot 结构，包含 book/author/season/chaptersPlan/recentChapters/recentComments
- buildChapterSnapshots 一次性读取赛季书籍、章节与上一章评论
- prepareChapterGeneration 使用快照生成 prompt
- writeChaptersForSeason 使用快照完成准备阶段

## 验收标准
- writeChaptersForSeason 读库集中在 buildChapterSnapshots
- prepareChapterGeneration 内不再出现 prisma.book/prisma.season/prisma.chapter 读取
- 指定轮次章节生成结果与原逻辑一致
