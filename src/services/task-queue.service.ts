/**
 * 任务队列服务
 *
 * 管理异步任务的创建、处理和执行
 * 支持多种任务类型：OUTLINE, WRITE_CHAPTER, READER_AGENT 等
 */

import { prisma } from '@/lib/prisma';
import { now } from '@/lib/timezone';
import { Prisma } from '@prisma/client';

export type TaskType =
  | 'OUTLINE'           // 大纲生成
  | 'NEXT_OUTLINE'     // 下一章大纲
  | 'WRITE_CHAPTER'    // 章节创作
  | 'CATCH_UP'         // 追赶写作
  | 'READER_AGENT'     // Reader Agent 阅读
  | 'SEASON_END';      // 赛季结束

export type TaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TaskPayload {
  seasonId?: string;
  bookId?: string;
  chapterId?: string;
  round?: number;
  [key: string]: unknown;
}

export interface CreateTaskDto {
  taskType: TaskType;
  payload: TaskPayload;
  priority?: number;
  maxAttempts?: number;
}

export interface TaskItem {
  id: string;
  taskType: TaskType;
  payload: TaskPayload;
  status: TaskStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskQueueService {
  /**
   * 创建新任务
   */
  async create(dto: CreateTaskDto): Promise<TaskItem> {
    const task = await prisma.taskQueue.create({
      data: {
        taskType: dto.taskType,
        payload: dto.payload as Prisma.InputJsonValue,
        status: 'PENDING',
        priority: dto.priority ?? 0,
        attempts: 0,
        maxAttempts: dto.maxAttempts ?? 3,
      },
    });

    console.log(`[TaskQueue] Created task: ${task.taskType} (${task.id})`);
    return this.formatTask(task);
  }

  /**
   * 批量创建任务
   */
  async createBatch(tasks: CreateTaskDto[]): Promise<TaskItem[]> {
    const createdTasks = await prisma.taskQueue.createManyAndReturn({
      data: tasks.map((dto) => ({
        taskType: dto.taskType,
        payload: dto.payload as Prisma.InputJsonValue,
        status: 'PENDING',
        priority: dto.priority ?? 0,
        attempts: 0,
        maxAttempts: dto.maxAttempts ?? 3,
      })),
    });

    console.log(`[TaskQueue] Created ${createdTasks.length} tasks`);
    return createdTasks.map((t) => this.formatTask(t));
  }

  /**
   * 获取下一个待处理任务
   */
  async getNextTask(lockDurationMs: number = 5 * 60 * 1000): Promise<TaskItem | null> {
    const nowDate = now();

    // 查找状态为 PENDING 或 PROCESSING 但已超时的任务
    const task = await prisma.taskQueue.findFirst({
      where: {
        OR: [
          { status: 'PENDING' },
          {
            status: 'PROCESSING',
            startedAt: {
              lt: new Date(nowDate.getTime() - lockDurationMs),
            },
          },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 1,
    });

    if (!task) {
      return null;
    }

    // 标记为处理中
    await prisma.taskQueue.update({
      where: { id: task.id },
      data: {
        status: 'PROCESSING',
        startedAt: nowDate,
        attempts: { increment: 1 },
      },
    });

    return this.formatTask(task);
  }

  /**
   * 标记任务完成
   */
  async complete(taskId: string): Promise<void> {
    await prisma.taskQueue.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: now(),
      },
    });
    console.log(`[TaskQueue] Task completed: ${taskId}`);
  }

  /**
   * 标记任务失败
   */
  async fail(taskId: string, errorMessage: string): Promise<void> {
    const task = await prisma.taskQueue.findUnique({ where: { id: taskId } });
    if (!task) return;

    // 如果还有重试次数，重置为 PENDING
    if (task.attempts < task.maxAttempts) {
      await prisma.taskQueue.update({
        where: { id: taskId },
        data: {
          status: 'PENDING',
          errorMessage,
          startedAt: null,
        },
      });
      console.log(`[TaskQueue] Task failed, will retry: ${taskId} (attempt ${task.attempts}/${task.maxAttempts})`);
    } else {
      await prisma.taskQueue.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          errorMessage,
          completedAt: now(),
        },
      });
      console.error(`[TaskQueue] Task failed permanently: ${taskId}`, errorMessage);
    }
  }

  /**
   * 获取任务统计
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      prisma.taskQueue.count({ where: { status: 'PENDING' } }),
      prisma.taskQueue.count({ where: { status: 'PROCESSING' } }),
      prisma.taskQueue.count({ where: { status: 'COMPLETED' } }),
      prisma.taskQueue.count({ where: { status: 'FAILED' } }),
    ]);

    return { pending, processing, completed, failed };
  }

  /**
   * 清理已完成的任务（可选）
   */
  async cleanup(olderThanHours: number = 24): Promise<number> {
    const result = await prisma.taskQueue.deleteMany({
      where: {
        status: { in: ['COMPLETED', 'FAILED'] },
        createdAt: {
          lt: new Date(now().getTime() - olderThanHours * 60 * 60 * 1000),
        },
      },
    });

    console.log(`[TaskQueue] Cleaned up ${result.count} old tasks`);
    return result.count;
  }

  /**
   * 获取待处理任务列表
   */
  async getPendingTasks(limit: number = 50): Promise<TaskItem[]> {
    const tasks = await prisma.taskQueue.findMany({
      where: { status: 'PENDING' },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: limit,
    });

    return tasks.map((t) => this.formatTask(t));
  }

  /**
   * 格式化任务返回
   */
  private formatTask(task: {
    id: string;
    taskType: string;
    payload: Prisma.JsonValue;
    status: string;
    priority: number;
    attempts: number;
    maxAttempts: number;
    errorMessage?: string | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): TaskItem {
    return {
      id: task.id,
      taskType: task.taskType as TaskType,
      payload: task.payload as TaskPayload,
      status: task.status as TaskStatus,
      priority: task.priority,
      attempts: task.attempts,
      maxAttempts: task.maxAttempts,
      errorMessage: task.errorMessage ?? undefined,
      startedAt: task.startedAt ?? undefined,
      completedAt: task.completedAt ?? undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}

export const taskQueueService = new TaskQueueService();
