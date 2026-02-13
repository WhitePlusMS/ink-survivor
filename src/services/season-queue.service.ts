/**
 * 赛季队列服务
 * 管理预配置赛季的 CRUD 操作和自动发布
 * 优化版本：JSONB 类型自动解析
 */

import { prisma } from '@/lib/prisma';
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
  duration: {
    reading: number;
    outline: number;
    writing: number;
  };
  rewards: Record<string, number>;
  plannedStartTime: Date | null;
  intervalHours: number;
  status: string;
  publishedAt: Date | null;
  publishedSeasonId: string | null;
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
  duration: {
    reading: number;
    outline: number;
    writing: number;
  };
  rewards: Record<string, number>;
  plannedStartTime?: Date;
  intervalHours?: number;
}

export interface UpdateSeasonQueueDto extends Partial<CreateSeasonQueueDto> {
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'SKIPPED';
  llmSuggestion?: string;
  llmOptimized?: boolean;
}

export class SeasonQueueService {
  /**
   * 创建赛季队列条目
   * JSONB 直接传入对象
   */
  async create(data: CreateSeasonQueueDto): Promise<SeasonQueueItem> {
    const item = await prisma.seasonQueue.create({
      data: {
        seasonNumber: data.seasonNumber,
        themeKeyword: data.themeKeyword,
        // JSONB 直接传入
        constraints: toJsonValue(data.constraints),
        zoneStyles: toJsonValue(data.zoneStyles),
        maxChapters: data.maxChapters,
        minChapters: data.minChapters ?? 3,
        duration: toJsonValue(data.duration),
        rewards: toJsonValue(data.rewards),
        plannedStartTime: data.plannedStartTime,
        intervalHours: data.intervalHours ?? 2,
        status: data.plannedStartTime ? 'SCHEDULED' : 'DRAFT',
      },
    });

    return this.formatItem(item);
  }

  /**
   * 获取所有赛季队列条目
   */
  async findAll(options?: {
    status?: string;
    orderBy?: 'asc' | 'desc';
  }): Promise<SeasonQueueItem[]> {
    const where: Prisma.SeasonQueueWhereInput = {};
    if (options?.status) {
      where.status = options.status;
    }

    const items = await prisma.seasonQueue.findMany({
      where,
      orderBy: { seasonNumber: options?.orderBy === 'asc' ? 'asc' : 'desc' },
    });

    return items.map(item => this.formatItem(item));
  }

  /**
   * 获取单个赛季队列条目
   */
  async findById(id: string): Promise<SeasonQueueItem | null> {
    const item = await prisma.seasonQueue.findUnique({ where: { id } });
    return item ? this.formatItem(item) : null;
  }

  /**
   * 根据赛季编号获取
   */
  async findBySeasonNumber(seasonNumber: number): Promise<SeasonQueueItem | null> {
    const item = await prisma.seasonQueue.findUnique({ where: { seasonNumber } });
    return item ? this.formatItem(item) : null;
  }

  /**
   * 更新赛季队列条目
   * JSONB 直接传入对象
   */
  async update(id: string, data: UpdateSeasonQueueDto): Promise<SeasonQueueItem | null> {
    const updateData: Prisma.SeasonQueueUpdateInput = {};

    if (data.themeKeyword !== undefined) updateData.themeKeyword = data.themeKeyword;
    if (data.constraints !== undefined) updateData.constraints = toJsonValue(data.constraints);
    if (data.zoneStyles !== undefined) updateData.zoneStyles = toJsonValue(data.zoneStyles);
    if (data.maxChapters !== undefined) updateData.maxChapters = data.maxChapters;
    if (data.minChapters !== undefined) updateData.minChapters = data.minChapters;
    if (data.duration !== undefined) updateData.duration = toJsonValue(data.duration);
    if (data.rewards !== undefined) updateData.rewards = toJsonValue(data.rewards);
    if (data.plannedStartTime !== undefined) updateData.plannedStartTime = data.plannedStartTime;
    if (data.intervalHours !== undefined) updateData.intervalHours = data.intervalHours;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.llmSuggestion !== undefined) updateData.llmSuggestion = data.llmSuggestion;
    if (data.llmOptimized !== undefined) updateData.llmOptimized = data.llmOptimized;

    const item = await prisma.seasonQueue.update({
      where: { id },
      data: updateData,
    });

    return this.formatItem(item);
  }

  /**
   * 删除赛季队列条目
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.seasonQueue.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取下一个待发布的赛季
   */
  async getNextToPublish(): Promise<SeasonQueueItem | null> {
    const item = await prisma.seasonQueue.findFirst({
      where: { status: 'SCHEDULED' },
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
  ): Promise<{ published: SeasonQueueItem[]; errors: string[] }> {
    const errors: string[] = [];
    const published: SeasonQueueItem[] = [];

    // 获取待发布的赛季
    const toPublish = await prisma.seasonQueue.findMany({
      where: { status: 'SCHEDULED' },
      orderBy: { seasonNumber: 'asc' },
      take: count,
    });

    for (let i = 0; i < toPublish.length; i++) {
      try {
        const queueItem = toPublish[i];
        const startTime = new Date(baseStartTime.getTime() + (queueItem.intervalHours * i) * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + this.calculateTotalDuration(queueItem.duration) * 60 * 1000);

        // 创建实际赛季 - JSONB 直接传入
        const season = await prisma.season.create({
          data: {
            seasonNumber: queueItem.seasonNumber,
            themeKeyword: queueItem.themeKeyword,
            constraints: toJsonValue(queueItem.constraints),
            zoneStyles: toJsonValue(queueItem.zoneStyles),
            maxChapters: queueItem.maxChapters,
            minChapters: queueItem.minChapters,
            duration: toJsonValue(queueItem.duration),
            rewards: toJsonValue(queueItem.rewards),
            startTime,
            endTime,
            signupDeadline: new Date(startTime.getTime() + 10 * 60 * 1000), // 报名截止 = 开始后10分钟
            status: 'ACTIVE',
          },
        });

        // 更新队列状态
        await prisma.seasonQueue.update({
          where: { id: queueItem.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: startTime,
            publishedSeasonId: season.id,
          },
        });

        published.push(this.formatItem(queueItem));
        console.log(`[SeasonQueue] Published S${queueItem.seasonNumber}: ${queueItem.themeKeyword}`);
      } catch (err) {
        errors.push(`Failed to publish S${toPublish[i].seasonNumber}: ${(err as Error).message}`);
      }
    }

    return { published, errors };
  }

  /**
   * 复制最近赛季作为模板
   * JSONB 自动解析
   */
  async duplicateFromSeason(seasonId: string, newSeasonNumber: number): Promise<SeasonQueueItem | null> {
    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) return null;

    // 检查新赛季编号是否已存在
    const existing = await prisma.seasonQueue.findUnique({ where: { seasonNumber: newSeasonNumber } });
    if (existing) {
      throw new Error(`Season ${newSeasonNumber} already exists in queue`);
    }

    // JSONB 自动解析
    return this.create({
      seasonNumber: newSeasonNumber,
      themeKeyword: season.themeKeyword,
      constraints: (season.constraints as string[]) || [],
      zoneStyles: (season.zoneStyles as string[]) || [],
      maxChapters: season.maxChapters,
      minChapters: season.minChapters,
      duration: (season.duration as { reading: number; outline: number; writing: number }) || { reading: 10, outline: 5, writing: 5 },
      rewards: (season.rewards as Record<string, number>) || {},
      intervalHours: 2,
    });
  }

  /**
   * 计算总时长（分钟）
   * JSONB 自动解析
   */
  private calculateTotalDuration(duration: { reading: number; outline: number; writing: number } | Prisma.JsonValue): number {
    const dur = duration as { reading?: number; outline?: number; writing?: number };
    return (dur.reading || 0) + (dur.outline || 0) + (dur.writing || 0) || 20;
  }

  /**
   * 格式化数据库返回
   * JSONB 自动解析
   */
  // eslint-disable-next-line max-len
  private formatItem(item: Prisma.SeasonQueueGetPayload<{ select: { id: true; seasonNumber: true; themeKeyword: true; constraints: true; zoneStyles: true; maxChapters: true; minChapters: true; duration: true; rewards: true; plannedStartTime: true; intervalHours: true; status: true; publishedAt: true; publishedSeasonId: true; llmSuggestion: true; llmOptimized: true; createdAt: true; updatedAt: true; } }>): SeasonQueueItem {
    return {
      id: item.id,
      seasonNumber: item.seasonNumber,
      themeKeyword: item.themeKeyword,
      // JSONB 自动解析
      constraints: (item.constraints as string[]) || [],
      zoneStyles: (item.zoneStyles as string[]) || [],
      maxChapters: item.maxChapters,
      minChapters: item.minChapters,
      duration: (item.duration as { reading: number; outline: number; writing: number }) || { reading: 10, outline: 5, writing: 5 },
      rewards: (item.rewards as Record<string, number>) || {},
      plannedStartTime: item.plannedStartTime,
      intervalHours: item.intervalHours,
      status: item.status,
      publishedAt: item.publishedAt,
      publishedSeasonId: item.publishedSeasonId,
      llmSuggestion: item.llmSuggestion,
      llmOptimized: item.llmOptimized,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export const seasonQueueService = new SeasonQueueService();
