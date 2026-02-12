# 任务 02：数据库 Schema 定义

## 任务目标
根据 PRD 设计完整的 Prisma 数据库 Schema，创建数据库模型

## 依赖关系
- 任务 01（项目初始化）完成后

## 交付物清单

### 2.1 用户与认证模块 Schema
- [ ] `User` 模型 - 用户基础信息
- [ ] `UserToken` 模型 - OAuth Token 管理
- [ ] `UserLevel` 模型 - 用户等级

### 2.2 赛季模块 Schema
- [ ] `Season` 模型 - 赛季配置
- [ ] `SeasonParticipation` 模型 - 赛季参赛记录
- [ ] `Leaderboard` 模型 - 排行榜快照

### 2.3 书籍模块 Schema
- [ ] `Book` 模型 - 书籍信息
- [ ] `Outline` 模型 - 大纲信息
- [ ] `Chapter` 模型 - 章节信息

### 2.4 互动模块 Schema
- [ ] `Comment` 模型 - 评论
- [ ] `Reading` 模型 - 阅读记录
- [ ] `BookScore` 模型 - 书籍评分

### 2.5 索引优化
- [ ] 添加必要的复合索引
- [ ] 添加时间索引

## 涉及文件清单
| 文件路径               | 操作 |
| ---------------------- | ---- |
| `prisma/schema.prisma` | 新建 |

## 详细 Schema 设计

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ==================== 用户与认证 ====================

model User {
  id              String    @id @default(cuid())
  secondMeId      String    @unique
  nickname        String
  avatar          String?
  email           String?

  // Agent 配置
  agentConfig     String?

  // 统计数据
  totalInk        Int       @default(0)
  booksWritten    Int       @default(0)
  seasonsJoined   Int       @default(0)

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // 关联
  token          UserToken?
  books          Book[]
  comments       Comment[]
  readings       Reading[]
}

model UserToken {
  id              String    @id @default(cuid())
  userId          String    @unique
  accessToken     String
  refreshToken    String
  tokenType       String    @default("Bearer")
  expiresAt       DateTime
  refreshExpiresAt DateTime
  scope           String

  isValid         Boolean   @default(true)
  lastRefreshed   DateTime  @default(now())
  refreshCount    Int       @default(0)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserLevel {
  id              String    @id @default(cuid())
  userId          String    @unique

  level           Int       @default(1)
  title           String    @default("新手作者")
  totalPoints     Int       @default(0)
  seasonPoints    Int       @default(0)

  booksWritten    Int       @default(0)
  booksCompleted  Int       @default(0)
  totalCoins      Int       @default(0)
  totalFavorites  Int       @default(0)

  unlockedFeatures String[] @default([])

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// ==================== 赛季模块 ====================

model Season {
  id              String    @id @default(cuid())
  seasonNumber    Int
  status          String    @default("PENDING")  // PENDING, ACTIVE, FINISHED, CANCELLED

  themeKeyword    String
  constraints     String    // JSON 数组
  zoneStyles      String    // JSON 数组

  signupDeadline  DateTime
  startTime       DateTime
  endTime         DateTime

  duration        Int       @default(120)
  maxChapters     Int       @default(10)
  minChapters     Int       @default(3)

  rewards         String    // JSON
  participantCount Int      @default(0)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  participations  SeasonParticipation[]
  books           Book[]
}

model SeasonParticipation {
  id              String    @id @default(cuid())
  seasonId        String
  season          Season    @relation(fields: [seasonId], references: [id])
  userId          String

  bookTitle       String
  shortDescription String
  zoneStyle       String
  plannedChapters Int?

  status          String    @default("PENDING")
  submittedAt     DateTime  @default(now())
  chatSessionId   String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([seasonId, userId])
}

model Leaderboard {
  id              String    @id @default(cuid())
  seasonId        String?
  zoneStyle       String?
  type            String    // 'heat', 'score', 'new'
  rankings        String    // JSON
  calculatedAt    DateTime  @default(now())

  @@index([seasonId, zoneStyle, type])
}

// ==================== 书籍模块 ====================

model Book {
  id              String    @id @default(cuid())
  title           String
  coverImage      String?

  authorId        String
  author          User      @relation(fields: [authorId], references: [id])
  seasonId        String?
  season          Season?   @relation(fields: [seasonId], references: [id])

  zoneStyle       String
  shortDesc       String?
  longDesc        String?

  status          String    @default("DRAFT")
  currentChapter  Int       @default(0)
  plannedChapters Int?

  inkBalance      Int       @default(0)
  heat            Int       @default(0)
  chapterCount    Int       @default(0)

  participationId String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  outline         Outline?
  chapters        Chapter[]
  comments        Comment[]
  readings        Reading[]
  score           BookScore?
}

model Outline {
  id              String    @id @default(cuid())
  bookId          String    @unique
  book            Book      @relation(fields: [bookId], references: [id])

  originalIntent  String
  characters      String    // JSON
  chaptersPlan    String    // JSON 数组
  modificationLog String?   // JSON 数组

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Chapter {
  id              String    @id @default(cuid())
  bookId          String
  book            Book      @relation(fields: [bookId], references: [id])

  chapterNumber   Int
  title           String
  content         String    @default("")
  contentLength   Int       @default(0)

  status          String    @default("DRAFT")
  publishedAt     DateTime?

  chatSessionId   String?

  readCount       Int       @default(0)
  commentCount    Int       @default(0)
  inkCost         Int       @default(10)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([bookId, chapterNumber])
}

// ==================== 互动模块 ====================

model BookScore {
  id              String    @id @default(cuid())
  bookId          String    @unique
  book            Book      @relation(fields: [bookId], references: [id])

  viewCount       Int       @default(0)
  favoriteCount   Int       @default(0)
  likeCount       Int       @default(0)
  coinCount       Int       @default(0)
  completionRate  Float     @default(0)

  avgSentiment    Float     @default(0)
  readerCount     Int       @default(0)
  avgRating       Float     @default(0)

  interactionScore Float    @default(0)
  sentimentScore  Float     @default(0)
  finalScore      Float     @default(0)
  heatValue       Float     @default(0)
  completenessBonus Float   @default(0)

  adaptabilityBonus Float    @default(0)
  adoptionRate     Float    @default(0)
  adoptedComments  Int      @default(0)

  lastCalculated   DateTime @default(now())
  updatedAt       DateTime  @updatedAt
}

model Comment {
  id              String    @id @default(cuid())
  bookId          String
  book            Book      @relation(fields: [bookId], references: [id])
  chapterId       String?
  chapter         Chapter?  @relation(fields: [chapterId], references: [id])
  userId          String?
  user            User?     @relation(fields: [userId], references: [id])

  isHuman         Boolean
  aiRole          String?

  content         String

  sentiment       Float?
  suggestionType  String?

  isAdopted       Boolean   @default(false)
  adoptedAt       DateTime?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Reading {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  bookId          String
  book            Book      @relation(fields: [bookId], references: [id])
  chapterId       String
  chapter         Chapter   @relation(fields: [chapterId], references: [id])

  readAt          DateTime  @default(now())
  finished        Boolean   @default(false)
  readingTime     Int?

  createdAt       DateTime  @default(now())
}
```

## 验证标准
- [ ] `npx prisma generate` 成功
- [ ] `npx prisma db push` 成功创建数据库
- [ ] 可以通过 Prisma Studio 查看数据模型

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 定义数据库 Schema`。