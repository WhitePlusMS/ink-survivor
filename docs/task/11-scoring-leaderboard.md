# 任务 11：排行榜模块 - 评分与排名

## 任务目标
实现书籍评分计算、热度计算、排行榜生成功能

## 依赖关系
- 任务 02（数据库 Schema）完成后
- 任务 07（书籍模块）完成后
- 任务 09（评论模块）完成后
- 任务 10（经济系统）完成后

## 交付物清单

### 11.1 评分类型定义
- [ ] 添加评分相关类型

### 11.2 评分 Service
- [ ] 创建评分 Service 类
- [ ] 实现互动分计算
- [ ] 实现情感分计算
- [ ] 实现热度计算
- [ ] 实现时间衰减

### 11.3 排行榜 Service
- [ ] 创建排行榜 Service 类
- [ ] 实现排行榜生成

### 11.4 排行榜 API
- [ ] `GET /api/leaderboard` - 获取排行榜

## 涉及文件清单
| 文件路径                              | 操作 |
| ------------------------------------- | ---- |
| `src/types/score.ts`                  | 新建 |
| `src/services/score.service.ts`       | 新建 |
| `src/services/leaderboard.service.ts` | 新建 |
| `src/app/api/leaderboard/route.ts`    | 新建 |

## 详细设计

### 类型定义
```typescript
// src/types/score.ts
export interface ScoreWeights {
  view: number;           // 1.0
  favorite: number;        // 2.0
  like: number;            // 1.5
  coin: number;            // 3.0
  completionRate: number;  // 2.0
}

export interface SentimentWeights {
  avgScore: number;        // 1.5
  quality: number;          // 1.0
  willingness: number;     // 2.0
}

export interface AdaptabilityBonus {
  low: number;             // 0.8 (0.0-0.3)
  normal: number;          // 1.0 (0.3-0.6)
  high: number;            // 1.1 (0.6-0.8)
  veryHigh: number;        // 1.2 (0.8-1.0)
}

export interface CompletenessBonus {
  ongoing: number;        // 1.0
  completed: number;       // 1.3
  discontinued: number;    // 0.5
}

export interface BookScoreData {
  bookId: string;
  interaction: {
    viewCount: number;
    favoriteCount: number;
    likeCount: number;
    coinCount: number;
    completionRate: number;
  };
  sentiment: {
    avgSentiment: number;
    readerCount: number;
    avgRating: number;
  };
  adaptability: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
  publishedAt?: Date;
}

export interface CalculatedScore {
  interactionScore: number;
  sentimentScore: number;
  finalScore: number;
  heatValue: number;
  adaptabilityBonus: number;
  completenessBonus: number;
}

export interface LeaderboardEntry {
  bookId: string;
  rank: number;
  score: number;
  heat: number;
  title: string;
  author: string;
  zoneStyle: string;
  chapterCount: number;
}
```

### 评分 Service
```typescript
// src/services/score.service.ts
import { prisma } from '@/lib/prisma';
import {
  ScoreWeights,
  SentimentWeights,
  AdaptabilityBonus,
  CompletenessBonus,
  BookScoreData,
  CalculatedScore,
} from '@/types/score';

export class ScoreService {
  // 权重配置
  private scoreWeights: ScoreWeights = {
    view: 1.0,
    favorite: 2.0,
    like: 1.5,
    coin: 3.0,
    completionRate: 2.0,
  };

  private sentimentWeights: SentimentWeights = {
    avgScore: 1.5,
    quality: 1.0,
    willingness: 2.0,
  };

  private adaptabilityBonus: AdaptabilityBonus = {
    low: 0.8,
    normal: 1.0,
    high: 1.1,
    veryHigh: 1.2,
  };

  private completenessBonus: CompletenessBonus = {
    ongoing: 1.0,
    completed: 1.3,
    discontinued: 0.5,
  };

  /**
   * 获取书籍评分数据
   */
  async getBookScoreData(bookId: string): Promise<BookScoreData | null> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        score: true,
        chapters: {
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    if (!book) return null;

    const avgCompletionRate = book.chapters.length > 0
      ? book.chapters.reduce((sum, c) => sum + (c.readCount > 0 ? 1 : 0), 0) / book.chapters.length
      : 0;

    return {
      bookId,
      interaction: {
        viewCount: book.score?.viewCount || 0,
        favoriteCount: book.score?.favoriteCount || 0,
        likeCount: book.score?.likeCount || 0,
        coinCount: book.score?.coinCount || 0,
        completionRate: avgCompletionRate,
      },
      sentiment: {
        avgSentiment: book.score?.avgSentiment || 0,
        readerCount: book.score?.readerCount || 0,
        avgRating: book.score?.avgRating || 0,
      },
      adaptability: 0.5, // 从用户配置获取
      status: book.status as any,
      publishedAt: book.chapters[0]?.publishedAt,
    };
  }

  /**
   * 计算互动分
   */
  calculateInteractionScore(data: BookScoreData): number {
    const { interaction } = data;
    const { view, favorite, like, coin, completionRate } = this.scoreWeights;

    const baseScore =
      interaction.viewCount * view +
      interaction.favoriteCount * favorite +
      interaction.likeCount * like +
      interaction.coinCount * coin;

    // 完读率加成
    const completionBonus = interaction.completionRate > 0.8 ? 1.2 : 1.0;

    return baseScore * completionBonus;
  }

  /**
   * 计算情感分
   */
  calculateSentimentScore(data: BookScoreData): number {
    const { sentiment, adaptability } = data;
    const { avgScore, quality, willingness } = this.sentimentWeights;

    // 获取听劝加成
    const adaptabilityBonus = this.getAdaptabilityBonus(adaptability);

    const baseScore =
      (sentiment.avgSentiment * 100 * avgScore) +
      (sentiment.avgRating * quality) +
      (sentiment.willingness * willingness);

    return baseScore * adaptabilityBonus;
  }

  /**
   * 获取听劝加成
   */
  getAdaptabilityBonus(adaptability: number): number {
    if (adaptability < 0.3) return this.adaptabilityBonus.low;
    if (adaptability < 0.6) return this.adaptabilityBonus.normal;
    if (adaptability < 0.8) return this.adaptabilityBonus.high;
    return this.adaptabilityBonus.veryHigh;
  }

  /**
   * 获取完本加成
   */
  getCompletenessBonus(status: BookScoreData['status']): number {
    switch (status) {
      case 'COMPLETED':
        return this.completenessBonus.completed;
      case 'DISCONTINUED':
        return this.completenessBonus.discontinued;
      default:
        return this.completenessBonus.ongoing;
    }
  }

  /**
   * 计算热度值（时间衰减）
   */
  calculateHeatValue(score: CalculatedScore, publishedAt?: Date): number {
    if (!publishedAt) return score.finalScore;

    // 计算时间衰减
    const hoursSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
    let timeDecay = 1.0;

    if (hoursSincePublished < 6) {
      timeDecay = 1.0;
    } else if (hoursSincePublished < 24) {
      timeDecay = 0.9;
    } else if (hoursSincePublished < 72) {
      timeDecay = 0.7;
    } else if (hoursSincePublished < 168) {
      timeDecay = 0.5;
    } else {
      timeDecay = 0.3;
    }

    return Math.round(score.finalScore * timeDecay);
  }

  /**
   * 计算完整评分
   */
  async calculateFullScore(bookId: string): Promise<CalculatedScore> {
    const data = await this.getBookScoreData(bookId);
    if (!data) throw new Error('Book not found');

    const interactionScore = this.calculateInteractionScore(data);
    const sentimentScore = this.calculateSentimentScore(data);
    const completenessBonus = this.getCompletenessBonus(data.status);
    const adaptabilityBonus = this.getAdaptabilityBonus(data.adaptability);

    // 最终评分 = 互动分 + 情感分 + 完本加成
    const finalScore = interactionScore + sentimentScore + (completenessBonus > 1 ? 50 : 0);

    // 热度值（考虑时间衰减）
    const heatValue = this.calculateHeatValue(
      { ...{ interactionScore, sentimentScore, finalScore, heatValue: finalScore, adaptabilityBonus, completenessBonus } },
      data.publishedAt
    );

    // 保存到数据库
    await prisma.bookScore.update({
      where: { bookId },
      data: {
        interactionScore,
        sentimentScore,
        finalScore,
        heatValue,
        completenessBonus: completenessBonus > 1 ? 50 : 0,
        adaptabilityBonus,
        lastCalculated: new Date(),
      },
    });

    return {
      interactionScore,
      sentimentScore,
      finalScore,
      heatValue,
      adaptabilityBonus,
      completenessBonus,
    };
  }

  /**
   * 获取书籍当前排名
   */
  async getBookRank(bookId: string): Promise<number> {
    const score = await this.calculateFullScore(bookId);
    const higherCount = await prisma.bookScore.count({
      where: {
        heatValue: { gt: score.heatValue },
        book: { status: { not: 'DISCONTINUED' } },
      },
    });

    return higherCount + 1;
  }
}

export const scoreService = new ScoreService();
```

### 排行榜 Service
```typescript
// src/services/leaderboard.service.ts
import { prisma } from '@/lib/prisma';
import { scoreService } from './score.service';
import { LeaderboardEntry } from '@/types/score';

export class LeaderboardService {
  /**
   * 生成排行榜
   */
  async generateLeaderboard(options?: {
    seasonId?: string;
    zoneStyle?: string;
    type: 'heat' | 'score' | 'new';
    limit?: number;
  }) {
    const { seasonId, zoneStyle, type, limit = 50 } = options || {};

    // 构建查询条件
    const where: any = {
      status: { not: 'DISCONTINUED' },
    };
    if (seasonId) where.seasonId = seasonId;
    if (zoneStyle) where.zoneStyle = zoneStyle;

    // 获取书籍
    const books = await prisma.book.findMany({
      where,
      include: {
        author: { select: { nickname: true } },
        score: true,
      },
      orderBy: type === 'new'
        ? { createdAt: 'desc' }
        : { heat: 'desc' },
      take: limit * 2, // 获取更多用于筛选
    });

    // 根据类型重新排序
    let sortedBooks = [...books];
    if (type === 'score' || type === 'heat') {
      // 重新计算评分
      for (const book of sortedBooks) {
        if (book.score) {
          await scoreService.calculateFullScore(book.id);
        }
      }
      // 重新获取排序
      sortedBooks = await prisma.book.findMany({
        where,
        include: { author: { select: { nickname: true } }, score: true },
        orderBy: type === 'score'
          ? { score: { finalScore: 'desc' } }
          : { heat: 'desc' },
        take: limit,
      });
    }

    // 构建排行榜
    const rankings: LeaderboardEntry[] = sortedBooks.slice(0, limit).map((book, index) => ({
      bookId: book.id,
      rank: index + 1,
      score: book.score?.finalScore || 0,
      heat: book.heat,
      title: book.title,
      author: book.author.nickname,
      zoneStyle: book.zoneStyle,
      chapterCount: book.chapterCount,
    }));

    // 保存排行榜快照
    await prisma.leaderboard.create({
      data: {
        seasonId,
        zoneStyle,
        type,
        rankings: JSON.stringify(rankings),
      },
    });

    return rankings;
  }

  /**
   * 获取排行榜
   */
  async getLeaderboard(options?: {
    seasonId?: string;
    zoneStyle?: string;
    type: 'heat' | 'score' | 'new';
    limit?: number;
    offset?: number;
  }) {
    const { limit = 20, offset = 0 } = options || {};

    // 先尝试获取最近的快照
    const snapshot = await prisma.leaderboard.findFirst({
      where: {
        seasonId: options?.seasonId,
        zoneStyle: options?.zoneStyle,
        type: options?.type,
      },
      orderBy: { calculatedAt: 'desc' },
    });

    let rankings: LeaderboardEntry[] = [];
    if (snapshot) {
      rankings = JSON.parse(snapshot.rankings);
    } else {
      // 生成新的排行榜
      rankings = await this.generateLeaderboard(options);
    }

    // 分页
    return {
      data: rankings.slice(offset, offset + limit),
      total: rankings.length,
      offset,
      limit,
    };
  }

  /**
   * 获取书籍在排行榜中的信息
   */
  async getBookLeaderboardInfo(bookId: string) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { score: true },
    });

    if (!book) return null;

    const { seasonId, zoneStyle, status } = book;

    // 获取所有排行榜中的排名
    const leaderboards = await prisma.leaderboard.findMany({
      where: {
        OR: [
          { seasonId, zoneStyle },
          { seasonId, zoneStyle: null },
          { seasonId: null, zoneStyle },
        ],
      },
      orderBy: { calculatedAt: 'desc' },
    });

    let bestRank = null;
    let rankType = null;

    for (const lb of leaderboards) {
      const rankings = JSON.parse(lb.rankings) as LeaderboardEntry[];
      const entry = rankings.find((r: LeaderboardEntry) => r.bookId === bookId);
      if (entry) {
        if (bestRank === null || entry.rank < bestRank) {
          bestRank = entry.rank;
          rankType = lb.type;
        }
      }
    }

    return {
      bookId,
      bestRank,
      rankType,
      currentHeat: book.heat,
      currentScore: book.score?.finalScore || 0,
      status,
    };
  }
}

export const leaderboardService = new LeaderboardService();
```

## 验证标准
- [ ] 评分计算正确
- [ ] 热度值计算正确（考虑时间衰减）
- [ ] 排行榜生成正确

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现排行榜模块 - 评分与排名`。