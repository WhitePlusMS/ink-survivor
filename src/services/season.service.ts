/**
 * 赛季服务
 *
 * 管理赛季的 CRUD 操作
 */

import { prisma } from '@/lib/prisma';
import { SeasonStatus } from '@/types/season';
import { Season } from '@prisma/client';

export interface SeasonResponse {
  id: string;
  seasonNumber: number;
  status: string;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  duration: number;
  startTime: Date;
  endTime: Date;
  signupDeadline: Date;
  maxChapters: number;
  minChapters: number;
  rewards: Record<string, unknown>;
  participantCount: number;
  // 轮次状态
  currentRound: number;
  currentPhase: string;
  roundStartTime: Date | null;
  // 阶段时长配置
  phaseDurations?: {
    reading: number;
    outline: number;
    writing: number;
  };
}

export class SeasonService {
  /**
   * 获取当前赛季
   */
  async getCurrentSeason(): Promise<SeasonResponse | null> {
    const season = await prisma.season.findFirst({
      where: {
        status: 'ACTIVE',
      },
      orderBy: { startTime: 'desc' },
    });

    if (!season) {
      return null;
    }

    // 实时计算参与书籍数量
    const participantCount = await prisma.book.count({
      where: { seasonId: season.id },
    });

    return this.formatSeason(season, participantCount);
  }

  /**
   * 根据 ID 获取赛季
   */
  async getSeasonById(seasonId: string): Promise<SeasonResponse | null> {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return null;
    }

    // 实时计算参与书籍数量
    const participantCount = await prisma.book.count({
      where: { seasonId: season.id },
    });

    return this.formatSeason(season, participantCount);
  }

  /**
   * 获取所有赛季
   */
  async getAllSeasons(options?: {
    status?: SeasonStatus;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.SeasonWhereInput = {};
    if (options?.status) {
      where.status = options.status;
    }

    const [seasons, total] = await Promise.all([
      prisma.season.findMany({
        where,
        orderBy: { seasonNumber: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      prisma.season.count({ where }),
    ]);

    return {
      seasons: seasons.map(s => this.formatSeason(s)),
      total,
    };
  }

  /**
   * 获取赛季的参与记录
   */
  async getSeasonParticipations(seasonId: string) {
    return prisma.seasonParticipation.findMany({
      where: { seasonId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * 创建赛季
   */
  async createSeason(data: {
    seasonNumber: number;
    themeKeyword: string;
    constraints: string[];
    zoneStyles: string[];
    startTime: Date;
    endTime: Date;
    duration: number;
    maxChapters: number;
    minChapters: number;
    rewards: Record<string, unknown>;
  }) {
    const signupDeadline = new Date(data.startTime.getTime() + 10 * 60 * 1000);

    const season = await prisma.season.create({
      data: {
        seasonNumber: data.seasonNumber,
        themeKeyword: data.themeKeyword,
        constraints: JSON.stringify(data.constraints),
        zoneStyles: JSON.stringify(data.zoneStyles),
        startTime: data.startTime,
        endTime: data.endTime,
        signupDeadline,
        duration: data.duration,
        maxChapters: data.maxChapters,
        minChapters: data.minChapters,
        rewards: JSON.stringify(data.rewards),
      },
    });

    console.log(`[SeasonService] Created season: ${season.id}`);
    return this.formatSeason(season);
  }

  /**
   * 更新赛季状态
   */
  async updateSeasonStatus(seasonId: string, status: SeasonStatus) {
    const season = await prisma.season.update({
      where: { id: seasonId },
      data: { status },
    });

    console.log(`[SeasonService] Updated season ${seasonId} status to ${status}`);
    return this.formatSeason(season);
  }

  /**
   * 增加参与人数
   */
  async incrementParticipantCount(seasonId: string) {
    return prisma.season.update({
      where: { id: seasonId },
      data: {
        participantCount: { increment: 1 },
      },
    });
  }

  /**
   * 检查赛季是否可报名
   */
  async canJoinSeason(seasonId: string): Promise<boolean> {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) return false;
    if (season.status !== 'ACTIVE') return false;

    const now = new Date();
    return now < season.signupDeadline;
  }

  /**
   * 获取当前赛季的真实参与书籍数量
   * 实时计算，而非使用缓存的 participantCount
   */
  async getRealParticipantCount(seasonId: string): Promise<number> {
    return prisma.book.count({
      where: { seasonId },
    });
  }

  /**
   * 获取所有已结束的赛季
   */
  async getAllFinishedSeasons() {
    const seasons = await prisma.season.findMany({
      where: {
        status: { in: ['FINISHED', 'CANCELLED'] },
      },
      orderBy: { seasonNumber: 'desc' },
    });

    return seasons.map(s => this.formatSeason(s));
  }

  /**
   * 获取当前赛季的上一赛季（用于赛季说明折叠面板）
   */
  async getPreviousSeason(currentSeasonId: string) {
    const currentSeason = await prisma.season.findUnique({
      where: { id: currentSeasonId },
      select: { seasonNumber: true },
    });

    if (!currentSeason) return null;

    // 获取赛季编号比当前小的最大赛季编号
    const previousSeason = await prisma.season.findFirst({
      where: {
        seasonNumber: { lt: currentSeason.seasonNumber },
        status: 'FINISHED',
      },
      orderBy: { seasonNumber: 'desc' },
    });

    if (!previousSeason) return null;

    return this.formatSeason(previousSeason);
  }

  /**
   * 获取所有赛季及其前5名书籍（按热度排序）
   * 用于首页展示
   */
  async getAllSeasonsWithTopBooks(options?: { limitPerSeason?: number }) {
    const limitPerSeason = options?.limitPerSeason || 5;

    // 获取所有已结束的赛季
    const seasons = await prisma.season.findMany({
      where: {
        status: { in: ['FINISHED', 'CANCELLED'] },
      },
      orderBy: { seasonNumber: 'desc' },
    });

    // 为每个赛季获取前5名书籍
    const seasonsWithBooks = await Promise.all(
      seasons.map(async (season) => {
        const books = await prisma.book.findMany({
          where: { seasonId: season.id },
          include: {
            author: { select: { nickname: true } },
            score: { select: { viewCount: true, finalScore: true, avgRating: true } },
            _count: { select: { chapters: true } },
            chapters: { select: { readCount: true, commentCount: true } },
          },
          orderBy: { heat: 'desc' },
          take: limitPerSeason,
        });

        // 聚合计算整本书的观看数和评论数
        const booksWithStats = books.map((book) => {
          const chapterStats = book.chapters.reduce(
            (acc: { viewCount: number; commentCount: number }, ch: { readCount?: number; commentCount?: number }) => ({
              viewCount: acc.viewCount + (ch.readCount || 0),
              commentCount: acc.commentCount + (ch.commentCount || 0),
            }),
            { viewCount: 0, commentCount: 0 }
          );
          return {
            id: book.id,
            title: book.title,
            coverImage: book.coverImage ?? undefined,
            shortDesc: book.shortDesc ?? undefined,
            zoneStyle: book.zoneStyle,
            heat: book.heat,
            chapterCount: book._count?.chapters ?? 0,
            viewCount: chapterStats.viewCount,
            commentCount: chapterStats.commentCount,
            author: { nickname: book.author.nickname },
            score: book.score ? {
              finalScore: book.score.finalScore,
              avgRating: book.score.avgRating,
            } : undefined,
            seasonNumber: season.seasonNumber,
          };
        });

        return {
          ...this.formatSeason(season),
          books: booksWithStats,
        };
      })
    );

    return seasonsWithBooks;
  }

  /**
   * 格式化赛季数据
   * @param season 赛季数据
   * @param realParticipantCount 实时参与数量（可选，如果不传则使用数据库缓存值）
   */
  private formatSeason(season: Season, realParticipantCount?: number): SeasonResponse {
    return {
      id: season.id,
      seasonNumber: season.seasonNumber,
      status: season.status,
      themeKeyword: season.themeKeyword,
      constraints: JSON.parse(season.constraints || '[]'),
      zoneStyles: JSON.parse(season.zoneStyles || '[]'),
      duration: season.duration,
      startTime: season.startTime,
      endTime: season.endTime,
      signupDeadline: season.signupDeadline,
      maxChapters: season.maxChapters,
      minChapters: season.minChapters,
      rewards: JSON.parse(season.rewards || '{}'),
      // 优先使用实时计算的数量，否则使用数据库缓存值
      participantCount: realParticipantCount ?? season.participantCount,
      // 轮次状态（轮次从 1 开始）
      currentRound: season.currentRound ?? 1,
      currentPhase: season.roundPhase || 'NONE',
      roundStartTime: season.roundStartTime,
      // 解析阶段时长配置
      phaseDurations: JSON.parse(season.duration || '{}'),
    };
  }
}

export const seasonService = new SeasonService();
