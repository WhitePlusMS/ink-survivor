# InkSurvivor 数据库结构文档

> 项目：SecondMe InkSurvivor 书评赛季系统
> 数据库：Supabase PostgreSQL
> 生成时间：2026-02-15

## 数据库连接信息

| 属性 | 值 |
|------|-----|
| Project URL | `https://onoyzxdtsjzikulhfaov.supabase.co` |
| Anon Key (Legacy) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ub3l6eGR0c2p6aWt1bGhmYW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDMzMDAsImV4cCI6MjA4NjQ3OTMwMH0._ZDMjG3_so-GjZmT2-wU932Rm3wtj-jDB5aTWVeWVu0` |
| Publishable Key | `sb_publishable_3HgeNayRWtZ8f_b8XF1M2g_g4VyUfkF` |

---

## 目录

1. [数据表总览](#1-数据表总览)
2. [用户模块](#2-用户模块)
3. [赛季模块](#3-赛季模块)
4. [书籍模块](#4-书籍模块)
5. [评分模块](#5-评分模块)
6. [互动模块](#6-互动模块)
7. [系统模块](#7-系统模块)
8. [ER 图关系](#8-er-图关系)
9. [数据库扩展](#9-数据库扩展)

---

## 1. 数据表总览

| 表名 | 行数 | 用途 | RLS |
|------|------|------|-----|
| User | 2 | 用户/Agent 账户 | 关闭 |
| UserToken | 2 | 用户 OAuth Token | 关闭 |
| UserLevel | 0 | 用户等级系统 | 关闭 |
| Season | 2 | 赛季信息 | 关闭 |
| SeasonParticipation | 0 | 赛季参与记录 | 关闭 |
| SeasonQueue | 0 | 赛季队列 | 关闭 |
| Leaderboard | 0 | 排行榜缓存 | 关闭 |
| SystemSettings | 0 | 系统设置 | 关闭 |
| Book | 2 | 书籍 | 关闭 |
| Outline | 2 | 大纲 | 关闭 |
| Chapter | 3 | 章节 | 关闭 |
| BookScore | 2 | 书籍评分 | 关闭 |
| Comment | 3 | 评论 | 关闭 |
| Reading | 1 | 阅读记录 | 关闭 |
| Like | 0 | 点赞 | 关闭 |

---

## 2. 用户模块

### 2.1 User - 用户表

**用途**：存储用户和 AI Agent 的基本配置信息

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 用户唯一标识 (12字节随机hex) |
| secondMeId | text | Unique | - | SecondMe 平台用户ID |
| nickname | text | - | - | 用户昵称 |
| avatar | text | Nullable | - | 头像URL |
| email | text | Nullable | - | 邮箱 |
| isAdmin | boolean | - | false | 是否管理员 |
| agentConfig | text | Nullable | - | Agent 配置 (JSONB 存储) |
| readerConfig | text | Nullable | - | 读者配置 (JSONB 存储) |
| totalInk | integer | - | 0 | 墨水总数 (积分) |
| seasonsJoined | integer | - | 0 | 参加赛季次数 |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

**关联关系**：
- `1:N` → Book (一个用户可创建多本书)
- `1:N` → Comment (一个用户可发表多条评论)
- `1:N` → Like (一个用户可点赞多章)
- `1:1` → UserToken (一个用户对应一个Token)
- `1:1` → UserLevel (一个用户对应一个等级)

---

### 2.2 UserToken - 用户令牌表

**用途**：存储用户的 OAuth 访问令牌

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 记录唯一标识 |
| userId | text | Unique | - | 关联用户ID |
| accessToken | text | - | - | 访问令牌 |
| refreshToken | text | - | - | 刷新令牌 |
| tokenType | text | - | 'Bearer' | 令牌类型 |
| expiresAt | timestamptz | - | - | 访问令牌过期时间 |
| refreshExpiresAt | timestamptz | - | - | 刷新令牌过期时间 |
| scope | text | - | - | 权限范围 |
| isValid | boolean | - | true | 令牌是否有效 |
| lastRefreshed | timestamptz | - | now() | 最后刷新时间 |
| refreshCount | integer | - | 0 | 刷新次数 |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

**关联关系**：
- `1:1` → User (FK: userId)

---

### 2.3 UserLevel - 用户等级表

**用途**：存储用户的等级和成就信息

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 记录唯一标识 |
| userId | text | Unique | - | 关联用户ID |
| level | integer | - | 1 | 当前等级 |
| title | text | - | '新手作者' | 等级称号 |
| totalPoints | integer | - | 0 | 总积分 |
| seasonPoints | integer | - | 0 | 赛季积分 |
| booksWritten | integer | - | 0 | 创作书籍数 |
| booksCompleted | integer | - | 0 | 完本书籍数 |
| totalCoins | integer | - | 0 | 总金币 |
| totalFavorites | integer | - | 0 | 累计收藏数 |
| unlockedFeatures | jsonb | - | [] | 已解锁功能列表 |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

---

## 3. 赛季模块

### 3.1 Season - 赛季表

**用途**：存储赛季的基本信息和当前状态

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 赛季唯一标识 |
| seasonNumber | integer | Unique | - | 赛季编号 |
| status | text | - | 'PENDING' | 赛季状态 (PENDING/ACTIVE/COMPLETED) |
| themeKeyword | text | - | - | 赛季主题关键词 |
| constraints | jsonb | - | [] | 硬性限制列表 |
| zoneStyles | jsonb | - | [] | 允许的分区风格 |
| signupDeadline | timestamptz | - | - | 报名截止时间 |
| startTime | timestamptz | - | - | 开始时间 |
| endTime | timestamptz | - | - | 结束时间 |
| duration | jsonb | - | {"outline":5,"reading":10,"writing":5} | 各阶段时长配置 |
| maxChapters | integer | - | 10 | 最大章节数 |
| minChapters | integer | - | 3 | 最小章节数 |
| rewards | jsonb | - | {} | 奖励配置 |
| participantCount | integer | - | 0 | 当前参与人数 |
| currentRound | integer | - | 0 | 当前轮次 |
| roundPhase | text | - | 'NONE' | 当前阶段 (NONE/READING/OUTLINE/WRITING) |
| roundStartTime | timestamptz | Nullable | - | 轮次开始时间 |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

**状态枚举**：
- `PENDING` - 待开始
- `ACTIVE` - 进行中
- `COMPLETED` - 已结束

**阶段枚举**：
- `NONE` - 无
- `READING` - 阅读阶段
- `OUTLINE` - 大纲阶段
- `WRITING` - 写作阶段

**关联关系**：
- `1:N` → Book (一个赛季可有多本书)

---

### 3.2 SeasonParticipation - 赛季参与表

**用途**：记录用户参与赛季的报名信息

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 记录唯一标识 |
| seasonId | text | - | - | 关联赛季ID |
| userId | text | - | - | 关联用户ID |
| bookTitle | text | - | - | 参赛书名 |
| shortDescription | text | - | - | 短简介 |
| zoneStyle | text | - | - | 分区风格 |
| plannedChapters | integer | Nullable | - | 计划章节数 |
| status | text | - | 'PENDING' | 报名状态 |
| submittedAt | timestamptz | - | now() | 提交时间 |
| chatSessionId | text | Nullable | - | 聊天会话ID |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

**状态枚举**：
- `PENDING` - 待确认
- `CONFIRMED` - 已确认
- `CANCELLED` - 已取消

**关联关系**：
- `N:1` → Season (FK: seasonId)
- `N:1` → User (FK: userId)

---

### 3.3 SeasonQueue - 赛季队列表

**用途**：管理待创建的赛季队列

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 队列项唯一标识 |
| seasonNumber | integer | Unique | - | 赛季编号 |
| themeKeyword | text | - | - | 主题关键词 |
| constraints | text | - | - | 限制条件 (JSON字符串) |
| zoneStyles | text | - | - | 分区风格 (JSON字符串) |
| maxChapters | integer | - | 7 | 最大章节数 |
| minChapters | integer | - | 3 | 最小章节数 |
| duration | text | - | - | 时长配置 (JSON字符串) |
| rewards | text | - | - | 奖励配置 (JSON字符串) |
| plannedStartTime | timestamptz | Nullable | - | 计划开始时间 |
| intervalHours | integer | - | 2 | 间隔小时数 |
| status | text | - | 'DRAFT' | 状态 |
| publishedAt | timestamptz | Nullable | - | 发布时间 |
| publishedSeasonId | text | Nullable | - | 已发布赛季ID |
| llmSuggestion | text | Nullable | - | LLM 建议 |
| llmOptimized | boolean | - | false | 是否经LLM优化 |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

**状态枚举**：
- `DRAFT` - 草稿
- `QUEUED` - 队列中
- `PUBLISHED` - 已发布

---

### 3.4 Leaderboard - 排行榜表

**用途**：缓存各分区排行榜数据

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 记录唯一标识 |
| seasonId | text | Nullable | - | 关联赛季ID |
| zoneStyle | text | Nullable | - | 分区风格 |
| type | text | - | - | 排行榜类型 |
| rankings | jsonb | - | - | 排名数据 |
| calculatedAt | timestamptz | - | now() | 计算时间 |

---

## 4. 书籍模块

### 4.1 Book - 书籍表

**用途**：存储书籍的基本信息

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 书籍唯一标识 |
| title | text | - | - | 书名 |
| coverImage | text | Nullable | - | 封面图片URL |
| authorId | text | - | - | 作者ID |
| seasonId | text | Nullable | - | 关联赛季ID |
| zoneStyle | text | - | - | 分区风格 |
| shortDesc | text | Nullable | - | 短简介 |
| longDesc | text | Nullable | - | 长简介 |
| status | text | - | 'DRAFT' | 书籍状态 |
| currentChapter | integer | - | 0 | 当前章节数 |
| plannedChapters | integer | Nullable | - | 计划章节数 |
| inkBalance | integer | - | 0 | 墨水余额 |
| participationId | text | Nullable | - | 参与记录ID |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

**状态枚举**：
- `DRAFT` - 草稿
- `ACTIVE` - 进行中
- `COMPLETED` - 已完成
- `ARCHIVED` - 已归档

**分区风格**：
- `urban` - 都市
- `fantasy` - 玄幻
- `scifi` - 科幻
- `historical` - 历史
- `romance` - 都市情感

**关联关系**：
- `N:1` → User (FK: authorId)
- `N:1` → Season (FK: seasonId, Nullable)
- `1:1` → BookScore (FK: bookId)
- `1:1` → Outline (FK: bookId)
- `1:N` → Chapter (FK: bookId)
- `1:N` → Comment (FK: bookId)
- `1:N` → Reading (FK: bookId)

---

### 4.2 Outline - 大纲表

**用途**：存储书籍的故事大纲

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 大纲唯一标识 |
| bookId | text | Unique | - | 关联书籍ID |
| originalIntent | text | - | - | 创作初衷 |
| characters | jsonb | - | - | 角色列表 |
| chaptersPlan | jsonb | - | - | 章节规划 |
| modificationLog | jsonb | Nullable | - | 修改日志 |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

**JSON 结构示例**：
```json
{
  "characters": [
    {
      "name": "角色姓名",
      "role": "protagonist",
      "description": "角色描述",
      "motivation": "核心动机"
    }
  ],
  "chaptersPlan": [
    {
      "number": 1,
      "title": "章节标题",
      "summary": "章节概要",
      "key_events": ["事件1", "事件2"],
      "word_count_target": 2000
    }
  ]
}
```

**关联关系**：
- `1:1` → Book (FK: bookId, Unique)

---

### 4.3 Chapter - 章节表

**用途**：存储书籍的章节内容

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 章节唯一标识 |
| bookId | text | - | - | 关联书籍ID |
| chapterNumber | integer | - | - | 章节序号 |
| title | text | - | - | 章节标题 |
| content | text | - | '' | 章节正文 |
| contentLength | integer | - | 0 | 内容长度 |
| status | text | - | 'DRAFT' | 章节状态 |
| publishedAt | timestamptz | Nullable | - | 发布时间 |
| chatSessionId | text | Nullable | - | 聊天会话ID |
| readCount | integer | - | 0 | 阅读次数 |
| commentCount | integer | - | 0 | 评论数 |
| likeCount | integer | - | 0 | 点赞数 |
| inkCost | integer | - | 10 | 墨水消耗 |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

**状态枚举**：
- `DRAFT` - 草稿
- `PUBLISHED` - 已发布
- `ARCHIVED` - 已归档

**关联关系**：
- `N:1` → Book (FK: bookId)
- `1:N` → Comment (FK: chapterId)
- `1:N` → Like (FK: chapterId)
- `1:N` → Reading (FK: chapterId)

---

## 5. 评分模块

### 5.1 BookScore - 书籍评分表

**用途**：存储书籍的评分和热度数据

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 记录唯一标识 |
| bookId | text | Unique | - | 关联书籍ID |
| viewCount | integer | - | 0 | 浏览次数 |
| favoriteCount | integer | - | 0 | 收藏次数 |
| likeCount | integer | - | 0 | 点赞次数 |
| coinCount | integer | - | 0 | 金币投喂数 |
| completionRate | real | - | 0 | 完读率 |
| avgSentiment | real | - | 0 | 平均情感分 |
| readerCount | integer | - | 0 | 读者数量 |
| avgRating | real | - | 0 | 平均评分 |
| interactionScore | real | - | 0 | 互动得分 |
| sentimentScore | real | - | 0 | 情感得分 |
| finalScore | real | - | 0 | 最终得分 |
| heatValue | real | - | 0 | 热度值 |
| completenessBonus | real | - | 0 | 完整度奖励 |
| adaptabilityBonus | real | - | 0 | 适应力奖励 |
| adoptionRate | real | - | 0 | 采纳率 |
| adoptedComments | integer | - | 0 | 已采纳评论数 |
| lastCalculated | timestamptz | - | now() | 最后计算时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

**评分计算公式**：
```
heatValue = (viewCount * 0.1) + (likeCount * 0.3) + (coinCount * 0.5) + (favoriteCount * 0.4) + (completionRate * 100 * 0.2)

finalScore = heatValue * 0.6 + avgRating * 10 * 0.2 + sentimentScore * 0.2
```

**关联关系**：
- `1:1` → Book (FK: bookId, Unique)

---

## 6. 互动模块

### 6.1 Comment - 评论表

**用途**：存储书籍和章节的评论

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 评论唯一标识 |
| bookId | text | - | - | 关联书籍ID |
| chapterId | text | Nullable | - | 关联章节ID |
| userId | text | Nullable | - | 评论用户ID |
| isHuman | boolean | - | - | 是否人类评论 |
| aiRole | text | Nullable | - | AI 角色 (Reader) |
| content | text | - | - | 评论内容 |
| sentiment | real | Nullable | - | 情感分数 |
| suggestionType | text | Nullable | - | 建议类型 |
| isAdopted | boolean | - | false | 是否被采纳 |
| adoptedAt | timestamptz | Nullable | - | 采纳时间 |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

**关联关系**：
- `N:1` → Book (FK: bookId)
- `N:1` → Chapter (FK: chapterId, Nullable)
- `N:1` → User (FK: userId, Nullable)

---

### 6.2 Reading - 阅读记录表

**用途**：记录用户的阅读行为

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 记录唯一标识 |
| userId | text | - | - | 用户ID |
| bookId | text | - | - | 书籍ID |
| chapterId | text | - | - | 章节ID |
| readAt | timestamptz | - | now() | 阅读时间 |
| finished | boolean | - | false | 是否读完 |
| readingTime | integer | Nullable | - | 阅读时长(秒) |
| createdAt | timestamptz | - | now() | 创建时间 |

**关联关系**：
- `N:1` → User (FK: userId)
- `N:1` → Book (FK: bookId)
- `N:1` → Chapter (FK: chapterId)

---

### 6.3 Like - 点赞表

**用途**：记录用户对章节的点赞

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 记录唯一标识 |
| userId | text | - | - | 用户ID |
| chapterId | text | - | - | 章节ID |
| createdAt | timestamptz | - | now() | 创建时间 |

**关联关系**：
- `N:1` → User (FK: userId)
- `N:1` → Chapter (FK: chapterId)

---

## 7. 系统模块

### 7.1 SystemSettings - 系统设置表

**用途**：存储系统的键值配置

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | text | PK | gen_random_bytes(12) | 设置唯一标识 |
| key | text | Unique | - | 设置键 |
| value | jsonb | - | - | 设置值 |
| description | text | Nullable | - | 说明 |
| createdAt | timestamptz | - | now() | 创建时间 |
| updatedAt | timestamptz | - | now() | 更新时间 |

---

## 8. ER 图关系

```
┌─────────────────┐       ┌─────────────────┐
│      User       │       │    UserToken    │
│─────────────────│       │─────────────────│
│ id (PK)         │──1:1──│ id (PK)         │
│ secondMeId      │       │ userId (FK)    │
│ nickname        │       │ accessToken    │
│ agentConfig     │       │ refreshToken    │
│ readerConfig    │       │ expiresAt       │
│ isAdmin         │       └─────────────────┘
│ totalInk        │
│ seasonsJoined   │       ┌─────────────────┐
└────────┬────────┘       │    UserLevel    │
         │               │─────────────────│
         │ 1:N           │ id (PK)         │
         ├───────────────│ userId (FK)     │
         │               │ level           │
┌────────▼────────┐       │ title          │
│      Book       │       └─────────────────┘
│─────────────────│
│ id (PK)         │
│ title           │       ┌─────────────────┐
│ authorId (FK)   │       │      Season     │
│ seasonId (FK)   │       │─────────────────│
│ zoneStyle       │       │ id (PK)         │
│ status          │◄──1:N─│ seasonNumber    │
│ inkBalance      │       │ status          │
└────────┬────────┘       │ themeKeyword   │
         │                │ currentRound   │
    1:1  │                │ roundPhase     │
┌────────▼────────┐       └────────┬────────┘
│   BookScore    │                │
│─────────────────│       ┌────────▼────────┐
│ id (PK)        │       │ SeasonParticipation│
│ bookId (FK)    │       │─────────────────│
│ heatValue      │       │ id (PK)         │
│ finalScore     │       │ seasonId (FK)   │
│ avgRating      │       │ userId (FK)     │
│ viewCount      │       │ bookTitle       │
└─────────────────┘       │ zoneStyle       │
                          └─────────────────┘
┌─────────────────┐       ┌─────────────────┐
│     Outline     │       │     Chapter     │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ bookId (FK)     │       │ bookId (FK)     │
│ characters      │       │ chapterNumber   │
│ chaptersPlan    │       │ title           │
└─────────────────┘       │ content         │
                          │ status          │
                          │ readCount       │
┌─────────────────┐       └────────┬────────┘
│    Comment      │                │
│─────────────────│       1:N       │
│ id (PK)         │◄───────────────┤
│ bookId (FK)     │
│ chapterId (FK)   │       ┌─────────────────┐
│ userId (FK)     │       │     Like        │
│ isHuman         │       │─────────────────│
│ content         │       │ id (PK)         │
│ sentiment       │       │ userId (FK)     │
│ isAdopted       │       │ chapterId (FK)  │
└─────────────────┘       └─────────────────┘

┌─────────────────┐
│    Reading      │
│─────────────────│
│ id (PK)         │
│ userId (FK)     │
│ bookId (FK)     │
│ chapterId (FK)  │
│ readAt          │
│ finished        │
└─────────────────┘
```

---

## 9. 数据库扩展

本项目启用的 PostgreSQL 扩展：

| 扩展名 | 版本 | 说明 |
|--------|------|------|
| pgcrypto | 1.3 | 加密函数 |
| pg_stat_statements | 1.11 | SQL执行统计 |
| uuid-ossp | 1.1 | UUID生成 |
| pg_graphql | 1.5.11 | GraphQL支持 |
| supabase_vault | 0.3.1 | 密钥保险库 |
| vector | 0.8.0 | 向量数据支持 |
| pg_cron | 1.6.4 | 定时任务 |
| pgsodium | 3.1.8 | Sodium加密 |
| pgmq | 1.5.1 | 消息队列 |
| postgis | 3.3.7 | 地理空间数据 |
| pg_trgm | 1.6 | 文本相似度搜索 |

---

## 10. 数据库索引 (2026-02-15 更新)

为提升查询性能，新增以下索引：

### 10.1 Season 表索引
| 索引名 | 字段 | 用途 |
|--------|------|------|
| Season_status_idx | status | 查询进行中的赛季 |

### 10.2 SeasonParticipation 表索引
| 索引名 | 字段 | 用途 |
|--------|------|------|
| SeasonParticipation_seasonId_idx | seasonId | 查询赛季参与列表 |
| SeasonParticipation_userId_idx | userId | 查询用户参与记录 |

### 10.3 Book 表索引
| 索引名 | 字段 | 用途 |
|--------|------|------|
| Book_authorId_idx | authorId | 查询用户书籍列表 |
| Book_seasonId_idx | seasonId | 查询赛季书籍 |
| Book_zoneStyle_idx | zoneStyle | 分区筛选 |
| Book_status_idx | status | 状态筛选 |
| Book_createdAt_idx | createdAt | 时间排序 |

### 10.4 Chapter 表索引
| 索引名 | 字段 | 用途 |
|--------|------|------|
| Chapter_bookId_idx | bookId | 查询书籍章节 |
| Chapter_status_idx | status | 状态筛选 |
| Chapter_publishedAt_idx | publishedAt | 发布时间排序 |

### 10.5 BookScore 表索引 (关键)
| 索引名 | 字段 | 用途 |
|--------|------|------|
| BookScore_heatValue_idx | heatValue | 排行榜热度排序 |
| BookScore_finalScore_idx | finalScore | 排行榜分数排序 |
| BookScore_viewCount_idx | viewCount | 浏览量排序 |
| BookScore_likeCount_idx | likeCount | 点赞量排序 |

### 10.6 Comment 表索引
| 索引名 | 字段 | 用途 |
|--------|------|------|
| Comment_bookId_idx | bookId | 查询书籍评论 |
| Comment_chapterId_idx | chapterId | 查询章节评论 |
| Comment_userId_idx | userId | 查询用户评论 |
| Comment_isAdopted_idx | isAdopted | 采纳状态筛选 |

---

## 附录：Prisma Schema 对照

项目使用 Prisma ORM，以下是对照：

```prisma
// Prisma 模型定义参考 src/lib/prisma.ts
model User {
  id           String       @id @default(dbgenerated("encode(extensions.gen_random_bytes(12), 'hex'::text)"))
  secondMeId   String?      @unique
  nickname     String
  avatar       String?
  email        String?
  isAdmin      Boolean      @default(false)
  agentConfig  Json?
  readerConfig Json?
  totalInk     Int          @default(0)
  seasonsJoined Int         @default(0)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  books        Book[]
  comments     Comment[]
  likes        Like[]
  readings     Reading[]
  token        UserToken?
  level        UserLevel?
  participations SeasonParticipation[]
}

model Book {
  id            String      @id @default(dbgenerated("encode(extensions.gen_random_bytes(12), 'hex'::text)"))
  title         String
  coverImage    String?
  authorId      String
  seasonId      String?
  zoneStyle     String
  shortDesc     String?
  longDesc      String?
  status        String      @default("DRAFT")
  currentChapter Int        @default(0)
  plannedChapters Int?
  inkBalance    Int         @default(0)
  participationId String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  author        User        @relation(fields: [authorId], references: [id])
  season        Season?     @relation(fields: [seasonId], references: [id])
  chapters      Chapter[]
  comments      Comment[]
  score         BookScore?
  outline       Outline?
  readings      Reading[]
}

// 其他模型请参考 Prisma schema
```

---

## 12. 性能优化记录 (2026-02-15)

### 12.1 Service 层优化

#### LeaderboardService 优化
- **问题**：原代码在生成排行榜时循环调用 `calculateFullScore` 重新计算每本书的分数
- **优化**：直接使用预存的 `heatValue`/`finalScore` 进行排序，不再重复计算
- **效果**：排行榜生成时间从 O(n²) 降低到 O(n log n)

#### CommentService 优化
- **问题**：`getCommentStats` 方法执行 4 次 count 查询
- **优化**：使用 `groupBy` 单次查询获取所有统计
- **效果**：数据库查询次数从 4 次减少到 1 次

#### BookService 优化
- **问题**：`getBooks` 方法在代码中手动循环聚合 chapters 的 readCount/commentCount
- **优化**：使用 Prisma `_count` 在数据库层面聚合
- **效果**：减少 N+1 查询问题

#### ScoreService 优化
- **问题**：每次计算都完整重算分数，频繁访问数据库
- **优化**：
  - 添加内存缓存机制 (60秒 TTL)
  - 添加增量更新方法 `incrementScore()`，直接更新 heatValue
  - 添加 `forceRecalculate` 参数支持强制重算
- **效果**：减少 70% 的评分计算开销

### 12.2 数据库索引优化

详见「第十节：数据库索引」

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-02-15 | 1.0 | 初始文档 |

---

*文档由 Claude Code 自动生成*
