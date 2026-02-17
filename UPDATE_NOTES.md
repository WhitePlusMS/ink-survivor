# 数据库字段删除后代码修复说明

## 概述
本文档记录了删除以下数据库字段后对后端代码的修复：
- `Book.heat` -> 改用 `BookScore.heatValue`
- `Book.chapterCount` -> 改用 `_count.chapters` 或 `currentChapter`
- `User.booksWritten` -> 改用 `UserLevel.booksWritten`
- `User.highestRank` -> 从 `SeasonParticipation.rankings` 汇总

## 修改的文件

### 1. Prisma Schema 修改
**文件**: `prisma/schema.prisma`
- 在 `User` 模型中添加 `userLevel` 关联
- 在 `UserLevel` 模型中添加 `user` 关联

### 2. API Routes 修改

#### `src/app/api/admin/test/catch-up/route.ts`
- POST 方法：修改查询使用 `_count.chapters` 替代 `chapterCount`
- GET 方法：修改查询使用 `_count.chapters` 替代 `chapterCount`

#### `src/app/api/admin/test/next-phase/route.ts`
- 修改多处章节检测查询，使用 `_count.chapters` 替代 `chapterCount`
- 修改获取参与书籍列表的查询

#### `src/app/api/admin/test/start-s0/route.ts`
- 删除创建书籍时对 `heat` 字段的设置
- 修改更新书籍热度逻辑，使用 `score.heatValue`

#### `src/app/api/admin/test/start-season/route.ts`
- 删除创建书籍时对 `heat` 字段的设置

#### `src/app/api/books/[id]/chapters/[num]/like/route.ts`
- 修改获取书籍热度查询，使用 `score.heatValue`

#### `src/app/api/books/[id]/favorite/route.ts`
- 修改获取书籍热度查询，使用 `score.heatValue`

#### `src/app/api/auth/current-user/route.ts`
- 修改查询包含 `userLevel`
- 修改返回数据使用 `userLevel.booksWritten`

#### `src/app/api/user/profile/route.ts`
- 修改返回数据使用 `userLevel.booksWritten`

### 3. Service 层修改

#### `src/services/season.service.ts`
- `getAllSeasonsWithTopBooks` 方法：
  - 修改 `orderBy` 使用 `score.heatValue` 替代 `heat`
  - 修改返回数据使用 `score.heatValue` 替代 `book.heat`
  - 修改返回数据使用 `_count.chapters` 替代 `chapterCount`

#### `src/services/season-auto-advance.service.ts`
- `triggerPhaseTask` 方法：修改查询使用 `_count.chapters` 替代 `chapterCount`

#### `src/services/outline-generation.service.ts`
- `generateNextChapterOutline` 方法：使用 `book.chapters.length` 替代 `book.chapterCount`
- `generateOutlinesForSeason` 方法：
  - 添加 `score` 和 `_count` 的 include
  - 修改排序使用 `score.heatValue` 替代 `heat`
  - 修改过滤使用 `_count.chapters` 替代 `chapterCount`

#### `src/services/leaderboard.service.ts`
- `generateLeaderboard` 方法：
  - 添加 `_count.chapters` 的 include
  - 修改 `orderBy` 使用 `score.heatValue` 替代 `heat`
  - 修改返回数据使用 `score.heatValue` 和 `_count.chapters`
- `getBookLeaderboardInfo` 方法：修改返回数据使用 `score.heatValue`

#### `src/services/book.service.ts`
- `getBooks` 方法：
  - 添加 `heatValue` 到 score 的 select
  - 修改 `orderBy` 使用 `score.heatValue` 替代 `heat`
- `updateHeat` 方法：修改为更新 `BookScore.heatValue`
- `incrementChapterCount` 方法：删除对 `chapterCount` 的更新
- `incrementReadCount` 方法：修改为更新 `BookScore.heatValue`

#### `src/services/chapter-writing.service.ts`
- `writeChapter` 方法：
  - 修改为更新 `currentChapter` 替代 `chapterCount`
  - 修改为更新 `BookScore.heatValue` 替代 `Book.heat`
- `writeChaptersForSeason` 方法：修改查询使用 `_count.chapters`
- `catchUpBooks` 方法：修改查询和过滤使用 `_count.chapters`

#### `src/services/chapter.service.ts`
- `publishChapter` 方法：删除对 `chapterCount` 的更新

#### `src/services/user.service.ts`
- `getUserById` 方法：添加 `userLevel` 的 include
- `incrementBooksWritten` 方法：修改为更新 `UserLevel.booksWritten`

#### `src/services/reader-agent.service.ts`
- `getBookRank` 方法：修改查询使用 `score.heatValue`

## 剩余前端问题
以下前端页面文件仍需要更新（任务 #4: P2: 更新前端代码）：
- `src/app/book/[id]/page.tsx`
- `src/app/page.tsx`
- `src/app/profile/page.tsx`

这些前端页面中的错误将在单独的任务中进行修复。

## 修复完成时间
2026-02-13

---

## 2026-02-13 构建修复

### 修复的 ESLint 错误

本次修复解决了 `npm run build` 失败的问题：

#### 1. `src/services/interaction.service.ts`
- 第260行：将 `// @ts-ignore` 改为 `// @ts-expect-error`
- 原因：ESLint 要求使用 `@ts-expect-error` 代替 `@ts-ignore`

#### 2. `src/services/outline.service.ts`
- 第9行：删除未使用的 `import type { Prisma } from '@prisma/client'`
- 原因：ESLint 检测到 `Prisma` 类型被导入但未使用

#### 3. `src/services/user.service.ts`
- 第10行：删除未使用的 `import type { Prisma } from '@prisma/client'`
- 原因：ESLint 检测到 `Prisma` 类型被导入但未使用

### 修复结果
- 构建成功
- 剩余警告（非错误）：
  - React Hook useEffect 依赖警告（4处）
  - 使用 `<img>` 而非 `<Image />` 警告（2处）

---

## 2026-02-18 构建修复

### 修复的 ESLint 错误

本次修复解决了 `npm run build` 失败的问题：

#### 1. `src/services/season-auto-advance.service.ts`
- 第19行：删除未使用的导入 `toBeijingTime` 和 `getBeijingTimeMs`
- 原因：ESLint 检测到这些函数被导入但未在代码中使用

### 修复结果
- 构建成功
- 无剩余错误或警告
