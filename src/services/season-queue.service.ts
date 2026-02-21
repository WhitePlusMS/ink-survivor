/**
 * 赛季队列服务
 * 管理待发布赛季的队列
 * 使用 Season 表，状态为 DRAFT 或 SCHEDULED
 */

import { prisma } from '@/lib/prisma';
import { Season } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { toJsonValue } from '@/lib/utils/jsonb-utils';

export interface SeasonQueueItem {
  id: string;
  seasonNumber: number;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  maxChapters: number;
  minChapters: number;
  roundDuration: number;
  rewards: Record<string, number>;
  plannedStartTime: Date | null;
  intervalHours: number;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  publishedAt: Date | null;
  llmSuggestion: string | null;
  llmOptimized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSeasonQueueDto {
  seasonNumber: number;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  maxChapters: number;
  minChapters?: number;
  roundDuration: number;
  rewards: Record<string, number>;
  plannedStartTime?: Date | null;
  intervalHours?: number;
}

export interface UpdateSeasonQueueDto extends Partial<CreateSeasonQueueDto> {
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  llmSuggestion?: string;
  llmOptimized?: boolean;
}

export class SeasonQueueService {
  /**
   * 创建赛季到队列
   */
  async create(data: CreateSeasonQueueDto): Promise<SeasonQueueItem> {
    const season = await prisma.season.create({
      data: {
        seasonNumber: data.seasonNumber,
        themeKeyword: data.themeKeyword,
        constraints: toJsonValue(data.constraints),
        zoneStyles: toJsonValue(data.zoneStyles),
        maxChapters: data.maxChapters,
        minChapters: data.minChapters ?? 3,
        roundDuration: data.roundDuration,
        rewards: toJsonValue(data.rewards),
        startTime: new Date(), // 临时时间，发布时更新
        endTime: new Date(),
        signupDeadline: new Date(),
        status: 'DRAFT',
      },
    });

    console.log(`[SeasonQueue] Created S${season.seasonNumber}: ${season.themeKeyword}`);
    return this.formatItem(season);
  }

  /**
   * 获取所有待发布的赛季队列
   */
  async findAll(options?: {
    status?: string;
    orderBy?: 'asc' | 'desc';
  }): Promise<SeasonQueueItem[]> {
    const where: Prisma.SeasonWhereInput = {};

    // 默认获取 DRAFT 和 SCHEDULED 状态的赛季
    if (options?.status) {
      where.status = options.status;
    } else {
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
  async findById(id: string): Promise<SeasonQueueItem | null> {
    const item = await prisma.season.findUnique({ where: { id } });
    return item ? this.formatItem(item) : null;
  }

  /**
   * 根据赛季编号获取
   */
  async findBySeasonNumber(seasonNumber: number): Promise<SeasonQueueItem | null> {
    const item = await prisma.season.findUnique({ where: { seasonNumber } });
    return item ? this.formatItem(item) : null;
  }

  /**
   * 更新赛季队列
   */
  async update(id: string, data: UpdateSeasonQueueDto): Promise<SeasonQueueItem | null> {
    const updateData: Prisma.SeasonUpdateInput = {};

    if (data.themeKeyword !== undefined) updateData.themeKeyword = data.themeKeyword;
    if (data.constraints !== undefined) updateData.constraints = toJsonValue(data.constraints);
    if (data.zoneStyles !== undefined) updateData.zoneStyles = toJsonValue(data.zoneStyles);
    if (data.maxChapters !== undefined) updateData.maxChapters = data.maxChapters;
    if (data.minChapters !== undefined) updateData.minChapters = data.minChapters;
    if (data.roundDuration !== undefined) updateData.roundDuration = data.roundDuration;
    if (data.rewards !== undefined) updateData.rewards = toJsonValue(data.rewards);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.llmSuggestion !== undefined) {
      (updateData as Record<string, unknown>).llmSuggestion = data.llmSuggestion;
    }
    if (data.llmOptimized !== undefined) {
      (updateData as Record<string, unknown>).llmOptimized = data.llmOptimized;
    }

    const item = await prisma.season.update({
      where: { id },
      data: updateData,
    });

    console.log(`[SeasonQueue] Updated S${item.seasonNumber}`);
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
   * 发布单个赛季
   */
  async publish(id: string, startTime: Date): Promise<SeasonQueueItem | null> {
    const item = await prisma.season.findUnique({ where: { id } });
    if (!item) return null;

    const roundDuration = item.roundDuration ?? 20;
    const maxChapters = item.maxChapters ?? 7;
    // 赛季总时长 = 每轮时长 * 最大章节数 + 报名截止时间
    const totalMinutes = roundDuration * maxChapters + 10;
    const endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);
    const signupDeadline = new Date(startTime.getTime() + 10 * 60 * 1000);

    const updated = await prisma.season.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startTime,
        endTime,
        signupDeadline,
      },
    });

    console.log(`[SeasonQueue] Published S${updated.seasonNumber} at ${startTime.toISOString()}`);
    return this.formatItem(updated);
  }

  /**
   * 批量发布多个赛季
   */
  async batchPublish(
    count: number,
    baseStartTime: Date
  ): Promise<{ published: SeasonQueueItem[]; errors: string[] }> {
    const errors: string[] = [];
    const published: SeasonQueueItem[] = [];

    // 获取待发布的赛季（DRAFT 或 SCHEDULED）
    const toPublish = await prisma.season.findMany({
      where: { status: { in: ['DRAFT', 'SCHEDULED'] } },
      orderBy: { seasonNumber: 'asc' },
      take: count,
    });

    for (let i = 0; i < toPublish.length; i++) {
      try {
        const seasonItem = toPublish[i];
        const intervalHours = 2;
        const startTime = new Date(baseStartTime.getTime() + (intervalHours * i) * 60 * 60 * 1000);

        const roundDuration = seasonItem.roundDuration ?? 20;
        const maxChapters = seasonItem.maxChapters ?? 7;
        const totalMinutes = roundDuration * maxChapters + 10;
        const endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);
        const signupDeadline = new Date(startTime.getTime() + 10 * 60 * 1000);

        // 更新赛季状态为 ACTIVE
        const season = await prisma.season.update({
          where: { id: seasonItem.id },
          data: {
            status: 'ACTIVE',
            startTime,
            endTime,
            signupDeadline,
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
   * 格式化数据库返回
   */
  private formatItem(item: Season): SeasonQueueItem {
    return {
      id: item.id,
      seasonNumber: item.seasonNumber,
      themeKeyword: item.themeKeyword,
      constraints: (item.constraints as string[]) || [],
      zoneStyles: (item.zoneStyles as string[]) || [],
      maxChapters: item.maxChapters,
      minChapters: item.minChapters,
      roundDuration: item.roundDuration ?? 20,
      rewards: (item.rewards as Record<string, number>) || {},
      plannedStartTime: item.startTime,
      intervalHours: 2,
      status: item.status as 'DRAFT' | 'SCHEDULED' | 'PUBLISHED',
      publishedAt: item.status === 'ACTIVE' ? item.updatedAt : null,
      llmSuggestion: (item as unknown as { llmSuggestion?: string }).llmSuggestion || null,
      llmOptimized: (item as unknown as { llmOptimized?: boolean }).llmOptimized || false,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export const seasonQueueService = new SeasonQueueService();
