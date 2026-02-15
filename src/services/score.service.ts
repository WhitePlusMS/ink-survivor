// 评分计算 Service
import { prisma } from '@/lib/prisma';
import {
  ScoreWeights,
  SentimentWeights,
  AdaptabilityBonus,
  CompletenessBonus,
  BookScoreData,
  CalculatedScore,
} from '@/types/score';

// 简单的内存缓存：bookId -> { score, timestamp }
const scoreCache = new Map<string, { score: CalculatedScore; timestamp: number }>();
const CACHE_TTL = 60000; // 缓存有效期 60 秒

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
   * 检查缓存是否有效
   */
  private isCacheValid(bookId: string): boolean {
    const cached = scoreCache.get(bookId);
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_TTL;
  }

  /**
   * 获取缓存的分数
   */
  private getCachedScore(bookId: string): CalculatedScore | null {
    if (this.isCacheValid(bookId)) {
      return scoreCache.get(bookId)!.score;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache(bookId: string, score: CalculatedScore): void {
    scoreCache.set(bookId, { score, timestamp: Date.now() });
  }

  /**
   * 增量更新分数 - 当有互动发生时调用，避免完整重算
   */
  async incrementScore(bookId: string, type: 'view' | 'like' | 'favorite' | 'coin' | 'comment'): Promise<void> {
    const weightMap: Record<string, { heat: number; interaction: number }> = {
      view: { heat: 1.0, interaction: 1.0 },
      like: { heat: 1.5, interaction: 1.5 },
      favorite: { heat: 2.0, interaction: 2.0 },
      coin: { heat: 3.0, interaction: 3.0 },
      comment: { heat: 0.5, interaction: 0.5 },
    };

    const weights = weightMap[type];
    if (!weights) return;

    // 直接增量更新 heatValue 和 interactionScore - 使用 Book 的合并字段
    await prisma.book.update({
      where: { id: bookId },
      data: {
        heatValue: { increment: weights.heat },
        interactionScore: { increment: weights.interaction },
        scoreLastCalculated: new Date(),
      },
    });

    // 清除缓存
    scoreCache.delete(bookId);
    console.log(`[ScoreService] Incremented ${type} for book ${bookId}`);
  }

  /**
   * 获取书籍评分数据
   */
  async getBookScoreData(bookId: string): Promise<BookScoreData | null> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        // score 已合并到 Book 表，使用 Book 的直接字段
        chapters: {
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    if (!book) return null;

    // 计算平均完读率
    const avgCompletionRate = book.chapters.length > 0
      ? book.chapters.reduce((sum: number, c) => sum + (c.readCount > 0 ? 1 : 0), 0) / book.chapters.length
      : 0;

    return {
      bookId,
      interaction: {
        viewCount: book.viewCount || 0,
        favoriteCount: book.favoriteCount || 0,
        likeCount: book.likeCount || 0,
        coinCount: book.coinCount || 0,
        completionRate: avgCompletionRate,
      },
      sentiment: {
        avgSentiment: book.avgSentiment || 0,
        readerCount: book.readerCount || 0,
        avgRating: book.avgRating || 0,
        willingness: 0.5, // 从用户配置获取，简化处理
      },
      adaptability: 0.5,
      status: book.status as BookScoreData['status'],
      publishedAt: book.chapters[0]?.publishedAt || undefined,
    };
  }

  /**
   * 计算互动分
   */
  calculateInteractionScore(data: BookScoreData): number {
    const { interaction } = data;
    const { view, favorite, like, coin } = this.scoreWeights;

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
   * 计算热度值（时间衰减 + 新书加成）
   * 注意：新书加成暂时固定为 1.0
   */
  calculateHeatValue(score: CalculatedScore, publishedAt?: Date): number {
    if (!publishedAt) return score.finalScore;

    const hoursSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);

    // 新书加成：暂时固定为 1.0（禁用）
    const newBookBonus = 1.0;

    // 时间衰减
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

    const heatValue = score.finalScore * newBookBonus * timeDecay;
    console.log(`[ScoreService] HeatValue calculated: finalScore=${score.finalScore}, newBookBonus=${newBookBonus}, timeDecay=${timeDecay}, result=${heatValue}`);

    return Math.round(heatValue);
  }

  /**
   * 计算完整评分 - 优化版本：使用缓存
   */
  async calculateFullScore(bookId: string, forceRecalculate = false): Promise<CalculatedScore> {
    // 如果不强制重算且缓存有效，直接返回缓存
    if (!forceRecalculate) {
      const cached = this.getCachedScore(bookId);
      if (cached) {
        return cached;
      }
    }

    const data = await this.getBookScoreData(bookId);
    if (!data) {
      throw new Error('Book not found');
    }

    const interactionScore = this.calculateInteractionScore(data);
    const sentimentScore = this.calculateSentimentScore(data);
    const completenessBonus = this.getCompletenessBonus(data.status);
    const adaptabilityBonusValue = this.getAdaptabilityBonus(data.adaptability);

    // 最终评分 = 互动分 + 情感分 + 完本加成
    const finalScore = interactionScore + sentimentScore + (completenessBonus > 1 ? 50 : 0);

    // 热度值（考虑时间衰减）
    const heatValue = this.calculateHeatValue(
      { interactionScore, sentimentScore, finalScore, heatValue: finalScore, adaptabilityBonus: adaptabilityBonusValue, completenessBonus },
      data.publishedAt
    );

    // 保存到数据库 - 使用 Book 的合并字段
    await prisma.book.update({
      where: { id: bookId },
      data: {
        interactionScore,
        sentimentScore,
        finalScore,
        heatValue,
        completenessBonus: completenessBonus > 1 ? 50 : 0,
        adaptabilityBonus: adaptabilityBonusValue,
        scoreLastCalculated: new Date(),
      },
    });

    const result = {
      interactionScore,
      sentimentScore,
      finalScore,
      heatValue,
      adaptabilityBonus: adaptabilityBonusValue,
      completenessBonus,
    };

    // 设置缓存
    this.setCache(bookId, result);

    console.log(`[ScoreService] Score calculated for book ${bookId}: finalScore=${finalScore}, heatValue=${heatValue}`);

    return result;
  }

  /**
   * 获取书籍当前排名
   */
  async getBookRank(bookId: string): Promise<number> {
    const score = await this.calculateFullScore(bookId);
    const higherCount = await prisma.book.count({
      where: {
        heatValue: { gt: score.heatValue },
        status: { not: 'DISCONTINUED' },
      },
    });

    return higherCount + 1;
  }

  /**
   * 获取互动分
   */
  getInteractionScore(data: BookScoreData): number {
    return this.calculateInteractionScore(data);
  }

  /**
   * 获取情感分
   */
  getSentimentScore(data: BookScoreData): number {
    return this.calculateSentimentScore(data);
  }
}

export const scoreService = new ScoreService();
