/**
 * 赛季队列服务
 * 管理赛季的 CRUD 操作
 * 注意：SeasonQueue 表已删除，使用 Season 表直接管理
 */

import { prisma } from '@/lib/prisma';
import { Season } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { toJsonValue } from '@/lib/utils/jsonb-utils';

export interface SeasonItem {
  id: string;
  seasonNumber: number;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  maxChapters: number;
  minChapters: number;
  duration: {
    reading: number;
    outline: number;
    writing: number;
  };
  rewards: Record<string, number>;
  startTime: Date;
  endTime: Date;
  signupDeadline: Date;
  status: string;
  currentRound: number;
  roundPhase: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSeasonDto {
  seasonNumber: number;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  maxChapters: number;
  minChapters?: number;
  duration: {
    reading: number;
    outline: number;
    writing: number;
  };
  rewards: Record<string, number>;
  startTime: Date;
  endTime: Date;
  signupDeadline?: Date;
  plannedStartTime?: Date;
  intervalHours?: number;
}

export interface UpdateSeasonDto extends Partial<CreateSeasonDto> {
  status?: 'PENDING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
  currentRound?: number;
  roundPhase?: string;
  roundStartTime?: Date;
  llmSuggestion?: string;
  llmOptimized?: boolean;
}

export class SeasonQueueService {
  /**
   * 创建赛季
   */
  async create(data: CreateSeasonDto): Promise<SeasonItem> {
    const item = await prisma.season.create({
      data: {
        seasonNumber: data.seasonNumber,
        themeKeyword: data.themeKeyword,
        constraints: toJsonValue(data.constraints),
        zoneStyles: toJsonValue(data.zoneStyles),
        maxChapters: data.maxChapters,
        minChapters: data.minChapters ?? 3,
        duration: toJsonValue(data.duration),
        rewards: toJsonValue(data.rewards),
        startTime: data.startTime,
        endTime: data.endTime,
        signupDeadline: data.signupDeadline || new Date(data.startTime.getTime() + 10 * 60 * 1000),
        status: 'PENDING',
      },
    });

    return this.formatItem(item);
  }

  /**
   * 获取所有赛季
   */
  async findAll(options?: {
    status?: string;
    orderBy?: 'asc' | 'desc';
  }): Promise<SeasonItem[]> {
    const where: Prisma.SeasonWhereInput = {};
    if (options?.status) {
      where.status = options.status;
    } else {
      // 默认只获取待发布的赛季（DRAFT 和 SCHEDULED）
      where.status = { in: ['DRAFT', 'SCHEDULED'] };
    }

    const items = await prisma.season.findMany({
      where,
      orderBy: { seasonNumber: options?.orderBy === 'asc' ? 'asc' : 'desc' },
    });

    return items.map(item => this.formatItem(item));
  }

  /**
   * 获取单个赛季
   */
  async findById(id: string): Promise<SeasonItem | null> {
    const item = await prisma.season.findUnique({ where: { id } });
    return item ? this.formatItem(item) : null;
  }

  /**
   * 根据赛季编号获取
   */
  async findBySeasonNumber(seasonNumber: number): Promise<SeasonItem | null> {
    const item = await prisma.season.findUnique({ where: { seasonNumber } });
    return item ? this.formatItem(item) : null;
  }

  /**
   * 更新赛季
   */
  async update(id: string, data: UpdateSeasonDto): Promise<SeasonItem | null> {
    const updateData: Prisma.SeasonUpdateInput = {};

    if (data.themeKeyword !== undefined) updateData.themeKeyword = data.themeKeyword;
    if (data.constraints !== undefined) updateData.constraints = toJsonValue(data.constraints);
    if (data.zoneStyles !== undefined) updateData.zoneStyles = toJsonValue(data.zoneStyles);
    if (data.maxChapters !== undefined) updateData.maxChapters = data.maxChapters;
    if (data.minChapters !== undefined) updateData.minChapters = data.minChapters;
    if (data.duration !== undefined) updateData.duration = toJsonValue(data.duration);
    if (data.rewards !== undefined) updateData.rewards = toJsonValue(data.rewards);
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.signupDeadline !== undefined) updateData.signupDeadline = data.signupDeadline;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currentRound !== undefined) updateData.currentRound = data.currentRound;
    if (data.roundPhase !== undefined) updateData.roundPhase = data.roundPhase;
    if (data.roundStartTime !== undefined) updateData.roundStartTime = data.roundStartTime;
    if (data.llmSuggestion !== undefined) (updateData as Record<string, unknown>).llmSuggestion = data.llmSuggestion;
    if (data.llmOptimized !== undefined) (updateData as Record<string, unknown>).llmOptimized = data.llmOptimized;

    const item = await prisma.season.update({
      where: { id },
      data: updateData,
    });

    return this.formatItem(item);
  }

  /**
   * 删除赛季
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.season.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取下一个待发布的赛季
   */
  async getNextToPublish(): Promise<SeasonItem | null> {
    const item = await prisma.season.findFirst({
      where: { status: 'PENDING' },
      orderBy: { seasonNumber: 'asc' },
    });
    return item ? this.formatItem(item) : null;
  }

  /**
   * 批量发布多个赛季
   */
  async batchPublish(
    count: number,
    baseStartTime: Date
  ): Promise<{ published: SeasonItem[]; errors: string[] }> {
    const errors: string[] = [];
    const published: SeasonItem[] = [];

    // 获取待发布的赛季
    const toPublish = await prisma.season.findMany({
      where: { status: 'PENDING' },
      orderBy: { seasonNumber: 'asc' },
      take: count,
    });

    for (let i = 0; i < toPublish.length; i++) {
      try {
        const seasonItem = toPublish[i];
        const duration = seasonItem.duration as { reading?: number; outline?: number; writing?: number };
        const intervalHours = 2;
        const startTime = new Date(baseStartTime.getTime() + (intervalHours * i) * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + ((duration.reading || 10) + (duration.outline || 5) + (duration.writing || 5)) * 60 * 1000);

        // 更新赛季状态为 ACTIVE
        const season = await prisma.season.update({
          where: { id: seasonItem.id },
          data: {
            status: 'ACTIVE',
            startTime,
            endTime,
            signupDeadline: new Date(startTime.getTime() + 10 * 60 * 1000),
          },
        });

        published.push(this.formatItem(season));
        console.log(`[SeasonQueue] Published S${seasonItem.seasonNumber}: ${seasonItem.themeKeyword}`);
      } catch (err) {
        errors.push(`Failed to publish S${toPublish[i].seasonNumber}: ${(err as Error).message}`);
      }
    }

    return { published, errors };
  }

  /**
   * 复制最近赛季作为模板
   */
  async duplicateFromSeason(seasonId: string, newSeasonNumber: number): Promise<SeasonItem | null> {
    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) return null;

    // 检查新赛季编号是否已存在
    const existing = await prisma.season.findUnique({ where: { seasonNumber: newSeasonNumber } });
    if (existing) {
      throw new Error(`Season ${newSeasonNumber} already exists`);
    }

    const duration = season.duration as { reading?: number; outline?: number; writing?: number };
    return this.create({
      seasonNumber: newSeasonNumber,
      themeKeyword: season.themeKeyword,
      constraints: (season.constraints as string[]) || [],
      zoneStyles: (season.zoneStyles as string[]) || [],
      maxChapters: season.maxChapters,
      minChapters: season.minChapters,
      duration: {
        reading: duration?.reading ?? 10,
        outline: duration?.outline ?? 5,
        writing: duration?.writing ?? 5,
      },
      rewards: (season.rewards as Record<string, number>) || {},
      startTime: new Date(),
      endTime: new Date(),
    });
  }

  /**
   * 格式化数据库返回
   */
  private formatItem(item: Season): SeasonItem {
    return {
      id: item.id,
      seasonNumber: item.seasonNumber,
      themeKeyword: item.themeKeyword,
      constraints: (item.constraints as string[]) || [],
      zoneStyles: (item.zoneStyles as string[]) || [],
      maxChapters: item.maxChapters,
      minChapters: item.minChapters,
      duration: (item.duration as { reading: number; outline: number; writing: number }) || { reading: 10, outline: 5, writing: 5 },
      rewards: (item.rewards as Record<string, number>) || {},
      startTime: item.startTime,
      endTime: item.endTime,
      signupDeadline: item.signupDeadline,
      status: item.status,
      currentRound: item.currentRound,
      roundPhase: item.roundPhase,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export const seasonQueueService = new SeasonQueueService();
