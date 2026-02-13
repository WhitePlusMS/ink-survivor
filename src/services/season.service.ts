/**
 * 赛季服务
 *
 * 管理赛季的 CRUD 操作
 * 优化版本：使用 JSONB 类型，Prisma 自动解析
 */

import { prisma } from '@/lib/prisma';
import { SeasonStatus } from '@/types/season';
import { Season } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { toJsonValue } from '@/lib/utils/jsonb-utils';

export interface SeasonResponse {
  id: string;
  seasonNumber: number;
  status: string;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  duration: Prisma.JsonValue;  // JSONB 类型，Prisma 自动解析
  startTime: Date;
  endTime: Date;
  signupDeadline: Date;
  maxChapters: number;
  minChapters: number;
  rewards: Prisma.JsonValue;
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
    const participantAuthors = await prisma.book.findMany({
      where: { seasonId: season.id },
      distinct: ['authorId'],
      select: { authorId: true },
    });
    const participantCount = participantAuthors.length;

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
    const participantAuthors = await prisma.book.findMany({
      where: { seasonId: season.id },
      distinct: ['authorId'],
      select: { authorId: true },
    });
    const participantCount = participantAuthors.length;

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
   * JSONB 类型直接传入对象，Prisma 自动处理
   */
  async createSeason(data: {
    seasonNumber: number;
    themeKeyword: string;
    constraints: string[];
    zoneStyles: string[];
    startTime: Date;
    endTime: Date;
    duration: Prisma.JsonValue;  // JSONB
    maxChapters: number;
    minChapters: number;
    rewards: Prisma.JsonValue;
  }) {
    const signupDeadline = new Date(data.startTime.getTime() + 10 * 60 * 1000);

    const season = await prisma.season.create({
      data: {
        seasonNumber: data.seasonNumber,
        themeKeyword: data.themeKeyword,
        // JSONB 类型直接传入数组/对象
        constraints: toJsonValue(data.constraints),
        zoneStyles: toJsonValue(data.zoneStyles),
        startTime: data.startTime,
        endTime: data.endTime,
        signupDeadline,
        duration: toJsonValue(data.duration),
        maxChapters: data.maxChapters,
        minChapters: data.minChapters,
        rewards: toJsonValue(data.rewards),
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
    const participantAuthors = await prisma.book.findMany({
      where: { seasonId },
      distinct: ['authorId'],
      select: { authorId: true },
    });
    return participantAuthors.length;
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
   * 使用 BookScore.heatValue 作为热度来源
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
            score: { select: { heatValue: true, viewCount: true, finalScore: true, avgRating: true } },
            _count: { select: { chapters: true } },
            chapters: { select: { readCount: true, commentCount: true } },
          },
          // 使用 score.heatValue 排序
          orderBy: { score: { heatValue: 'desc' } },
          take: limitPerSeason,
        });

        // 聚合计算整本书的观看数和评论数
        const booksWithStats = books.map((book) => {
          const chapterReadCount = book.chapters.reduce((sum: number, ch: { readCount?: number }) => sum + (ch.readCount || 0), 0);
          const chapterCommentCount = book.chapters.reduce((sum: number, ch: { commentCount?: number }) => sum + (ch.commentCount || 0), 0);

          return {
            id: book.id,
            title: book.title,
            coverImage: book.coverImage ?? undefined,
            shortDesc: book.shortDesc ?? undefined,
            zoneStyle: book.zoneStyle,
            // 使用 score.heatValue
            heat: book.score?.heatValue ?? 0,
            chapterCount: book._count?.chapters ?? 0,
            viewCount: chapterReadCount,
            commentCount: chapterCommentCount,
            author: { nickname: book.author.nickname },
            score: book.score ? {
              heatValue: book.score.heatValue,
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
   * JSONB 类型直接使用，Prisma 已自动解析
   * @param season 赛季数据
   * @param realParticipantCount 实时参与数量（可选，如果不传则使用数据库缓存值）
   */
  private formatSeason(season: Season, realParticipantCount?: number): SeasonResponse {
    return {
      id: season.id,
      seasonNumber: season.seasonNumber,
      status: season.status,
      themeKeyword: season.themeKeyword,
      // JSONB 类型，Prisma 自动解析为对应类型
      constraints: (season.constraints as string[]) || [],
      zoneStyles: (season.zoneStyles as string[]) || [],
      duration: season.duration,
      startTime: season.startTime,
      endTime: season.endTime,
      signupDeadline: season.signupDeadline,
      maxChapters: season.maxChapters,
      minChapters: season.minChapters,
      rewards: (season.rewards as Prisma.JsonValue) || {},
      // 优先使用实时计算的数量，否则使用数据库缓存值
      participantCount: realParticipantCount ?? season.participantCount,
      // 轮次状态（轮次从 1 开始）
      currentRound: season.currentRound ?? 1,
      currentPhase: season.roundPhase || 'NONE',
      roundStartTime: season.roundStartTime,
      // JSONB 自动解析，无需再次 JSON.parse
      phaseDurations: season.duration as { reading: number; outline: number; writing: number } || {
        reading: 10,
        outline: 5,
        writing: 5,
      },
    };
  }
}

export const seasonService = new SeasonService();
