// 排行榜 Service
import { prisma } from '@/lib/prisma';
import { scoreService } from './score.service';
import { LeaderboardEntry, LeaderboardType, LeaderboardResponse } from '@/types/score';
import { normalizeZoneStyle } from '@/lib/utils/zone';
import type { Prisma } from '@prisma/client';

export class LeaderboardService {
  /**
   * 生成排行榜 - 优化版本
   * 直接使用预存的 heatValue/finalScore 排序，不再循环计算
   * 注意：Leaderboard 表已删除，使用实时查询
   */
  async generateLeaderboard(options?: {
    seasonId?: string;
    zoneStyle?: string;
    type: LeaderboardType;
    limit?: number;
  }) {
    const { seasonId, zoneStyle, type, limit = 50 } = options || {};

    // 构建查询条件
    const where: Prisma.BookWhereInput = {
      status: { not: 'DISCONTINUED' },
    };
    if (seasonId) where.seasonId = seasonId;
    if (zoneStyle) where.zoneStyle = normalizeZoneStyle(zoneStyle);

    // 根据类型确定排序字段 - 使用 Book 的合并字段
    let orderBy: Prisma.BookOrderByWithRelationInput;
    switch (type) {
      case 'new':
        orderBy = { createdAt: 'desc' };
        break;
      case 'score':
        orderBy = { finalScore: 'desc' };
        break;
      case 'heat':
      default:
        orderBy = { heatValue: 'desc' };
        break;
    }

    // 直接查询并排序，不重复计算分数
    const books = await prisma.book.findMany({
      where,
      include: {
        author: { select: { nickname: true } },
        // score 已合并到 Book 表，使用 Book 的直接字段
        _count: { select: { chapters: true } },
      },
      orderBy,
      take: limit,
    });

    // 构建排行榜 - 使用 Book 的直接字段
    const rankings: LeaderboardEntry[] = books
      .map((book, index) => ({
        bookId: book.id,
        rank: index + 1,
        score: book.finalScore || 0,
        heat: book.heatValue || 0,
        title: book.title,
        author: book.author.nickname,
        zoneStyle: book.zoneStyle,
        chapterCount: book._count?.chapters ?? 0,
      }));

    console.log(`[LeaderboardService] Generated ${type} leaderboard with ${rankings.length} entries`);
    return rankings;
  }

  /**
   * 获取排行榜 - 实时查询，不使用缓存
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

    // 实时生成排行榜
    const generateOptions = options?.zoneStyle
      ? { ...options, zoneStyle: normalizedZoneStyle }
      : options;
    const rankings = await this.generateLeaderboard(generateOptions);

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
      // score 已合并到 Book 表，使用 Book 的直接字段
    });

    if (!book) return null;

    const { status } = book;

    // 获取所有书籍按热度排序
    const allBooks = await prisma.book.findMany({
      where: {
        status: { not: 'DISCONTINUED' },
      },
      orderBy: { heatValue: 'desc' },
      select: { id: true },
    });

    // 找到当前书籍的排名
    const rankIndex = allBooks.findIndex(b => b.id === bookId);
    const bestRank = rankIndex >= 0 ? rankIndex + 1 : null;

    return {
      bookId,
      bestRank,
      rankType: 'heat',
      currentHeat: book.heatValue || 0,
      currentScore: book.finalScore || 0,
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
