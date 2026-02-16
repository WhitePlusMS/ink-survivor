# 数据库性能优化方案

> 基于 Vercel (Serverless) + Supabase 架构的正确优化指南

## 目录

1. [架构说明](#架构说明)
2. [问题分析](#问题分析)
3. [优化方案](#优化方案)
4. [实施步骤](#实施步骤)
5. [预期效果](#预期效果)

---

## 架构说明

### 当前部署架构

```
用户请求
    ↓
Vercel (Serverless Functions)
    ↓
Supabase Pooler (连接池) ← 免费层共享
    ↓
PostgreSQL 数据库
```

### 为什么 Serverless 需要 Pooler？

Vercel 是一个 Serverless 平台，特点是：
- **函数随用随建**：每次请求可能启动新的函数实例
- **连接无法复用**：直连会导致每个函数都创建新连接，开销巨大
- **Pooler 解决此问题**：复用数据库连接，大幅减少连接开销

> 结论：使用 Pooler 是正确的选择，无需更改连接方式。

---

## 问题分析

### 当前性能瓶颈

| 问题类型 | 具体表现 | 影响 |
|---------|---------|------|
| **N+1 查询** | 循环中执行独立数据库查询 | 查询次数线性增长 |
| **串行查询** | 可并行的查询使用 await 串行执行 | 多次网络往返 |
| **实时计算** | 每次获取赛季都重新计算参与者数量 | 不必要的重复查询 |
| **Prisma 配置** | 未优化连接参数和超时 | 连接竞争、查询堆积 |
| **字段过度获取** | 查询了不需要的字段 | 网络传输浪费 |

### 问题代码示例

#### 1. N+1 查询问题

```typescript
// season.service.ts - getAllSeasonsWithTopBooks
// 当前：每个赛季都会执行独立查询
const seasonsWithBooks = await Promise.all(
  seasons.map(async (season) => {
    const books = await prisma.book.findMany({ where: { seasonId: season.id } });
    // 每个赛季都执行一次查询
  })
);
// 10 个赛季 = 10 次独立查询
```

#### 2. 串行查询问题

```typescript
// interaction.service.ts - toggleFavorite
// 当前：4 次串行查询
const existing = await prisma.reading.findFirst({ where: { bookId, userId } });  // 查询 1
const currentScore = await prisma.book.findUnique({ where: { id: bookId } });    // 查询 2
await prisma.reading.create({ ... });                                            // 查询 3
await prisma.book.update({ ... });                                              // 查询 4
```

#### 3. 实时计算问题

```typescript
// season.service.ts - getCurrentSeason
// 当前：每次都重新计算参与者数量
const participantAuthors = await prisma.book.findMany({
  where: { seasonId: season.id },
  distinct: ['authorId'],
  select: { authorId: true },
});
// 每次 API 调用都执行一次全表查询
```

---

## 优化方案

### 方案一：解决 N+1 查询（优先级 P0）

**原理**：使用 JOIN 或批量查询替代循环中的独立查询

**优化示例**：`getAllSeasonsWithTopBooks`

```typescript
// 优化前：N+1 查询
const seasonsWithBooks = await Promise.all(
  seasons.map(async (season) => {
    const books = await prisma.book.findMany({
      where: { seasonId: season.id },
      include: { author: true },
    });
    return { season, books };
  })
);

// 优化后：批量查询 + 内存聚合
const seasonIds = seasons.map(s => s.id);
const allBooks = await prisma.book.findMany({
  where: { seasonId: { in: seasonIds } },
  include: {
    author: { select: { nickname: true } },
    _count: { select: { chapters: true, comments: true } },
  },
  orderBy: { heatValue: 'desc' },
});

// 内存中按赛季分组
const booksBySeason = new Map<string, typeof allBooks>();
for (const book of allBooks) {
  if (!booksBySeason.has(book.seasonId!)) {
    booksBySeason.set(book.seasonId!, []);
  }
  booksBySeason.get(book.seasonId!)!.push(book);
}
```

**预期提升**：10 个赛季从 10 次查询 → 1 次查询，提升 **80-90%**

---

### 方案二：合并串行查询为并行（优先级 P0）

**原理**：使用 `Promise.all` 并行执行独立的查询

**优化示例**：`toggleFavorite`

```typescript
// 优化前：4 次串行查询
const existing = await prisma.reading.findFirst({ where: { bookId, userId } });
const currentScore = await prisma.book.findUnique({ where: { id: bookId } });
await prisma.reading.create({ ... });
await prisma.book.update({ ... });

// 优化后：使用 $transaction 保证原子性
await prisma.$transaction(async (tx) => {
  const [existing, currentScore] = await Promise.all([
    tx.reading.findFirst({ where: { bookId, userId, finished: false } }),
    tx.book.findUnique({ where: { id: bookId }, select: { heatValue: true } }),
  ]);

  if (existing) {
    await tx.reading.delete({ where: { id: existing.id } });
    await tx.book.update({
      where: { id: bookId },
      data: { favoriteCount: { decrement: 1 }, heatValue: { decrement: 3 } },
    });
  } else {
    // 收藏逻辑
  }
});
```

**预期提升**：4 次查询从串行 → 并行，提升 **30-50%**

---

### 方案三：添加查询缓存（优先级 P1）

**原理**：对不频繁变化的数据添加缓存

**适用场景**：
| 数据 | 建议缓存时间 | 失效条件 |
|------|-------------|---------|
| 当前赛季信息 | 30-60 秒 | 赛季状态变更 |
| 赛季排行榜 | 5-10 分钟 | 比赛结束 |
| 热门书籍列表 | 1-5 分钟 | 热度变化 |

**实现方案**：使用 Next.js 的 `unstable_cache`

```typescript
// src/lib/cache/season-cache.ts
import { unstable_cache } from 'next/cache';
import { seasonService } from '@/services/season.service';

// 缓存当前赛季，60 秒刷新一次
export const getCachedCurrentSeason = unstable_cache(
  async () => {
    'use server';
    return await seasonService.getCurrentSeason();
  },
  ['current-season'],
  { revalidate: 60 }
);

// 缓存赛季排行榜，5 分钟刷新一次
export const getCachedSeasonLeaderboard = unstable_cache(
  async (seasonId: string) => {
    'use server';
    return await seasonService.getSeasonLeaderboard(seasonId);
  },
  ['season-leaderboard'],
  { revalidate: 300 }
);
```

**使用示例**：

```typescript
// src/app/api/seasons/status/route.ts
import { getCachedCurrentSeason } from '@/lib/cache/season-cache';

export async function GET() {
  // 首次请求：查询数据库并缓存
  // 后续请求：直接返回缓存（不查数据库）
  const season = await getCachedCurrentSeason();
  return Response.json(season);
}
```

**预期提升**：命中缓存时提升 **90%+**

---

### 方案四：Prisma 配置优化（优先级 P1）

**原理**：优化连接参数，减少连接竞争

**当前配置**：

```typescript
// src/lib/prisma.ts
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
```

**优化后**：

```typescript
// src/lib/prisma.ts
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // 优化参数
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// 关键：在 Serverless 环境下正确处理 Prisma 连接
// Vercel 会自动管理连接生命周期
```

---

### 方案五：只查询需要的字段（优先级 P2）

**原理**：减少数据传输量

**优化示例**：

```typescript
// ❌ 查询所有字段
const books = await prisma.book.findMany({
  include: { author: true, chapters: true, season: true },
});

// ✅ 只查询需要的字段
const books = await prisma.book.findMany({
  select: {
    id: true,
    title: true,
    coverImage: true,
    heatValue: true,
    author: { select: { id: true, nickname: true, avatar: true } },
    _count: { select: { chapters: true, comments: true } },
  },
});
```

---

## 实施步骤

### 第一阶段：解决 N+1 查询（P0）

- [ ] 优化 `season.service.ts` 的 `getAllSeasonsWithTopBooks`
- [ ] 优化 `user.service.ts` 的 `getUserStats`
- [ ] 审查其他可能的 N+1 场景

### 第二阶段：合并串行查询（P0）

- [ ] 优化 `interaction.service.ts` 的 `toggleFavorite`
- [ ] 优化 `interaction.service.ts` 的 `toggleLike`
- [ ] 优化 `interaction.service.ts` 的 `gift`

### 第三阶段：添加缓存（P1）

- [ ] 为 `getCurrentSeason` 添加缓存
- [ ] 为 `getSeasonLeaderboard` 添加缓存
- [ ] 为热门书籍列表添加缓存

### 第四阶段：配置优化（P1）

- [ ] 优化 Prisma 配置
- [ ] 添加字段裁剪

---

## 预期效果

| 优化项 | 预估提升 | 工作量 | 优先级 |
|-------|---------|-------|-------|
| 解决 N+1 查询 | 50-80% | 中 | P0 |
| 合并串行查询 | 30-50% | 低 | P0 |
| 查询缓存 | 90%+ (命中时) | 中 | P1 |
| 字段裁剪 | 10-20% | 低 | P2 |

**综合预期**：优化后查询延迟可从 **1000ms+ 降至 200-400ms**

---

## 附录：关键文件清单

需要修改的文件：

| 文件 | 修改内容 |
|------|---------|
| `src/services/season.service.ts` | 解决 N+1、添加缓存 |
| `src/services/user.service.ts` | 解决 N+1 |
| `src/services/interaction.service.ts` | 合并串行查询 |
| `src/services/book.service.ts` | 字段裁剪 |
| `src/lib/cache/` | 新建缓存模块 |
| `src/lib/prisma.ts` | 配置优化 |

---

## 参考资料

- [Supabase 性能调优](https://supabase.com/docs/guides/platform/performance)
- [Prisma 查询优化](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance)
- [Vercel 数据库连接](https://vercel.com/blog/the-real-serverless-compute-to-database-connection-problem-solved)
