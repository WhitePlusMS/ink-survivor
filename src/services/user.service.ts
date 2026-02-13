/**
 * 用户服务
 *
 * 统一管理用户数据的 CRUD 操作
 * 优化版本：JSONB 类型自动解析
 */

import { prisma } from '@/lib/prisma';
import { agentConfigToJson, readerConfigToJson, fromJsonValue } from '@/lib/utils/jsonb-utils';
import type { Prisma } from '@prisma/client';

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
      include: {
        token: { select: { scope: true, expiresAt: true, refreshCount: true } },
        userLevel: true,
      },
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
   */
  async getSeasonParticipations(userId: string) {
    return prisma.seasonParticipation.findMany({
      where: { userId },
      include: {
        season: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
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
            score: true,
          },
        },
      },
    });

    return readings.map((r) => r.book);
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
          score: true,
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
   * 增加书籍创作数量
   * 使用 UserLevel.booksWritten
   */
  async incrementBooksWritten(userId: string) {
    // 先检查 UserLevel 是否存在
    const userLevel = await prisma.userLevel.findUnique({
      where: { userId },
    });

    if (userLevel) {
      // 更新已有的 UserLevel
      return prisma.userLevel.update({
        where: { userId },
        data: {
          booksWritten: { increment: 1 },
        },
      });
    } else {
      // 创建新的 UserLevel
      return prisma.userLevel.create({
        data: {
          userId,
          booksWritten: 1,
        },
      });
    }
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
    return prisma.userLevel.upsert({
      where: { userId },
      create: {
        userId,
        level: data.level || 1,
        title: data.title || '新手作者',
        totalPoints: data.totalPoints || 0,
        seasonPoints: data.seasonPoints || 0,
      },
      update: {
        level: data.level,
        title: data.title,
        totalPoints: data.totalPoints,
        seasonPoints: data.seasonPoints,
      },
    });
  }

  /**
   * 获取用户等级
   */
  async getUserLevel(userId: string) {
    return prisma.userLevel.findUnique({
      where: { userId },
    });
  }
}

export const userService = new UserService();
