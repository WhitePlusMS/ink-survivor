// 排行榜 Service
import { prisma } from '@/lib/prisma';
import { scoreService } from './score.service';
import { LeaderboardEntry, LeaderboardType, LeaderboardResponse } from '@/types/score';
import { normalizeZoneStyle } from '@/lib/utils/zone';

export class LeaderboardService {
  /**
   * 生成排行榜
   */
  async generateLeaderboard(options?: {
    seasonId?: string;
    zoneStyle?: string;
    type: LeaderboardType;
    limit?: number;
  }) {
    const { seasonId, zoneStyle, type, limit = 50 } = options || {};

    // 构建查询条件
    const where: any = {
      status: { not: 'DISCONTINUED' },
    };
    if (seasonId) where.seasonId = seasonId;
    if (zoneStyle) where.zoneStyle = normalizeZoneStyle(zoneStyle);

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
    const saveData: any = {
      type,
      rankings: JSON.stringify(rankings),
    };
    if (seasonId) saveData.seasonId = seasonId;
    if (zoneStyle) saveData.zoneStyle = normalizeZoneStyle(zoneStyle);

    await prisma.leaderboard.create({
      data: saveData,
    });

    console.log(`[LeaderboardService] Generated ${type} leaderboard with ${rankings.length} entries`);
    return rankings;
  }

  /**
   * 获取排行榜
   */
  async getLeaderboard(options?: {
    seasonId?: string;
    zoneStyle?: string;
    type: LeaderboardType;
    limit?: number;
    offset?: number;
  }): Promise<LeaderboardResponse> {
    const { limit = 20, offset = 0 } = options || {};

    // 标准化 zoneStyle
    const normalizedZoneStyle = options?.zoneStyle
      ? normalizeZoneStyle(options.zoneStyle)
      : undefined;

    // 先尝试获取最近的快照
    const snapshot = await prisma.leaderboard.findFirst({
      where: {
        seasonId: options?.seasonId,
        zoneStyle: normalizedZoneStyle,
        type: options?.type,
      },
      orderBy: { calculatedAt: 'desc' },
    });

    let rankings: LeaderboardEntry[] = [];
    if (snapshot) {
      rankings = JSON.parse(snapshot.rankings);
    } else {
      // 生成新的排行榜
      const generateOptions = options?.zoneStyle
        ? { ...options, zoneStyle: normalizedZoneStyle }
        : options;
      rankings = await this.generateLeaderboard(generateOptions);
    }

    // 分页
    return {
      data: rankings.slice(offset, offset + limit),
      total: rankings.length,
      type: options?.type || 'heat',
      seasonId: options?.seasonId,
      zoneStyle: normalizedZoneStyle,
    };
  }

  /**
   * 获取指定赛季的排行榜
   */
  async getSeasonLeaderboard(seasonId: string, type: LeaderboardType = 'heat') {
    return this.getLeaderboard({ seasonId, type });
  }

  /**
   * 获取指定分区的排行榜
   */
  async getZoneLeaderboard(zoneStyle: string, type: LeaderboardType = 'heat') {
    return this.getLeaderboard({ zoneStyle, type });
  }

  /**
   * 获取新书排行榜
   */
  async getNewBooksLeaderboard(limit: number = 20) {
    return this.getLeaderboard({ type: 'new', limit });
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

    let bestRank: number | null = null;
    let rankType: string | null = null;

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

  /**
   * 刷新书籍排行榜位置
   */
  async refreshBookRank(bookId: string) {
    await scoreService.calculateFullScore(bookId);
    return this.getBookLeaderboardInfo(bookId);
  }
}

export const leaderboardService = new LeaderboardService();
