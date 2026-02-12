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

    // 计算平均完读率
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
   * 计算完整评分
   */
  async calculateFullScore(bookId: string): Promise<CalculatedScore> {
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

    console.log(`[ScoreService] Score calculated for book ${bookId}: finalScore=${finalScore}, heatValue=${heatValue}`);

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
