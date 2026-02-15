/**
 * 用户服务
 *
 * 统一管理用户数据的 CRUD 操作
 * 优化版本：JSONB 类型自动解析
 */

import { prisma } from '@/lib/prisma';
import { agentConfigToJson, readerConfigToJson, fromJsonValue } from '@/lib/utils/jsonb-utils';

// Agent 配置类型（作者视角）
export interface AgentConfig {
  persona: string;
  writingStyle: string;
  adaptability: number;
  preferredGenres: string[];
  maxChapters: number;
  wordCountTarget: number;
}

// Reader Agent 配置类型（读者视角）
export interface ReaderConfig {
  readingPreferences: {
    preferredGenres: string[];   // 偏好题材
    style?: string;              // 评价风格（客观中肯、严厉、温和等）
    minRatingThreshold: number;    // 最低评分阈值 (0-5)
  };
  commentingBehavior: {
    enabled: boolean;             // 是否开启评论
    commentProbability: number;    // 评论概率 (0-1)
    sentimentThreshold: number;   // 触发评论的情感阈值 (-1 ~ 1)
  };
  interactionBehavior: {
    pokeEnabled: boolean;         // 是否催更
    giftEnabled: boolean;          // 是否打赏
  };
}

export class UserService {
  /**
   * 根据 ID 获取用户
   */
  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * 根据 SecondMe ID 获取用户
   */
  async getUserBySecondMeId(secondMeId: string) {
    return prisma.user.findUnique({
      where: { secondMeId },
    });
  }

  /**
   * 创建或更新用户
   */
  async upsertUser(data: {
    secondMeId: string;
    nickname: string;
    avatar?: string | null;
    email?: string | null;
  }) {
    return prisma.user.upsert({
      where: { secondMeId: data.secondMeId },
      create: {
        secondMeId: data.secondMeId,
        nickname: data.nickname,
        avatar: data.avatar,
        email: data.email,
      },
      update: {
        nickname: data.nickname,
        avatar: data.avatar,
        email: data.email,
      },
    });
  }

  /**
   * 更新 Agent 配置
   * JSONB 直接传入对象
   */
  async updateAgentConfig(userId: string, config: AgentConfig) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        agentConfig: agentConfigToJson(config),
      },
    });
  }

  /**
   * 获取 Agent 配置
   * JSONB 自动解析
   */
  async getAgentConfig(userId: string): Promise<AgentConfig | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { agentConfig: true },
    });

    return fromJsonValue<AgentConfig>(user?.agentConfig);
  }

  /**
   * 更新 Reader Agent 配置
   * JSONB 直接传入对象
   */
  async updateReaderConfig(userId: string, config: ReaderConfig) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        readerConfig: readerConfigToJson(config),
      },
    });
  }

  /**
   * 获取 Reader Agent 配置
   * JSONB 自动解析
   */
  async getReaderConfig(userId: string): Promise<ReaderConfig | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { readerConfig: true },
    });

    return fromJsonValue<ReaderConfig>(user?.readerConfig);
  }

  /**
   * 获取用户的赛季参赛记录
   * 注意：SeasonParticipation 表已删除，改为从 Book 表查询
   */
  async getSeasonParticipations(userId: string) {
    // SeasonParticipation 表已删除，从 Book 表查询用户参与的赛季
    const books = await prisma.book.findMany({
      where: { authorId: userId, seasonId: { not: null } },
      include: {
        season: { select: { id: true, seasonNumber: true, themeKeyword: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按赛季分组
    const seasonMap = new Map<string, typeof books[0] & { submittedAt: Date }>();
    for (const book of books) {
      if (book.seasonId && !seasonMap.has(book.seasonId)) {
        seasonMap.set(book.seasonId, { ...book, submittedAt: book.createdAt });
      }
    }

    return Array.from(seasonMap.values())
      .filter((book): book is typeof book & { season: NonNullable<typeof book.season> } => book.season !== null)
      .map(book => ({
        id: `participation-${book.seasonId}`,
        userId,
        seasonId: book.seasonId!,
        submittedAt: book.submittedAt,
        season: book.season,
        // 补充 SeasonCard 需要的字段
        bookTitle: book.title,
        zoneStyle: book.zoneStyle,
        status: book.status,
      }));
  }

  /**
   * 获取用户的收藏
   */
  async getUserFavorites(userId: string) {
    const readings = await prisma.reading.findMany({
      where: {
        userId,
        finished: false,
      },
      include: {
        book: {
          include: {
            author: { select: { nickname: true, avatar: true } },
            // score 已合并到 Book 表，使用 Book 的直接字段
            _count: { select: { chapters: true } },
          },
        },
      },
    });

    return readings.map((r) => ({
      ...r.book,
      // 将 _count 转换为 score 格式（兼容前端）
      score: {
        heatValue: r.book.heatValue ?? 0,
        finalScore: r.book.finalScore ?? 0,
        avgRating: r.book.avgRating ?? 0,
      },
    }));
  }

  /**
   * 获取用户的书籍
   */
  async getUserBooks(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Record<string, unknown> = { authorId: userId };
    if (options?.status) {
      where.status = options.status;
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          season: { select: { seasonNumber: true, themeKeyword: true } },
          // score 已合并到 Book 表，使用 Book 的直接字段
          _count: { select: { chapters: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      prisma.book.count({ where }),
    ]);

    return { books, total };
  }

  /**
   * 更新用户统计数据
   */
  async updateStats(
    userId: string,
    updates: {
      booksWritten?: number;
      booksCompleted?: number;
      seasonsJoined?: number;
      totalInk?: number;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: updates,
    });
  }

  /**
   * 增加书籍创作数量 - 使用 User.booksWritten (已合并)
   */
  async incrementBooksWritten(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        booksWritten: { increment: 1 },
      },
    });
  }

  /**
   * 增加参赛次数
   */
  async incrementSeasonsJoined(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        seasonsJoined: { increment: 1 },
      },
    });
  }

  /**
   * 更新 Ink 余额
   */
  async updateInkBalance(userId: string, delta: number) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        totalInk: { increment: delta },
      },
    });
  }

  /**
   * 创建或更新用户等级
   */
  async upsertUserLevel(
    userId: string,
    data: {
      level?: number;
      title?: string;
      totalPoints?: number;
      seasonPoints?: number;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        level: data.level || 1,
        levelTitle: data.title || '新手作者',
        totalPoints: data.totalPoints || 0,
        seasonPoints: data.seasonPoints || 0,
      },
    });
  }

  /**
   * 获取用户等级
   */
  async getUserLevel(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        level: true,
        levelTitle: true,
        totalPoints: true,
        seasonPoints: true,
        booksWritten: true,
        booksCompleted: true,
        totalCoins: true,
        totalFavorites: true,
        unlockedFeatures: true,
      },
    });
    return user;
  }
}

export const userService = new UserService();
