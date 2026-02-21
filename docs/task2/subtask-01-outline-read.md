# 子任务 1：Outline 集中读与快照

## 目标
- 将大纲生成读库集中在单一入口，避免 prepare 内重复查询

## 修改范围
- 文件：src/services/outline-generation.service.ts
  - 函数：buildOutlineSnapshots（新增）
  - 函数：prepareOutlineGeneration（改为接收快照）
  - 函数：generateOutlinesForSeason（改为快照驱动）

## 具体调整
- 新增 OutlineReadSnapshot 结构，包含 book/author/season/zoneStyle/chaptersPlan
- buildOutlineSnapshots 一次性读取赛季书籍及关联信息并返回快照
- prepareOutlineGeneration 仅使用快照构建 prompt，不再直接查询 book/season
- generateOutlinesForSeason 使用 buildOutlineSnapshots 结果驱动后续流程

## 验收标准
- generateOutlinesForSeason 只在 buildOutlineSnapshots 内发生书籍与赛季查询
- prepareOutlineGeneration 内不再出现 prisma.book/prisma.season 读取
- 赛季第 1 轮大纲生成行为与原逻辑一致
