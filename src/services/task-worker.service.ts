/**
 * 任务执行 Worker
 *
 * 从 TaskQueue 中获取任务并执行
 * 支持多种任务类型：OUTLINE, WRITE_CHAPTER, READER_AGENT 等
 */

import { taskQueueService } from './task-queue.service';
import { prisma } from '@/lib/prisma';

// 任务处理器映射
type TaskHandler = (payload: Record<string, unknown>) => Promise<void>;

const taskHandlers: Record<string, TaskHandler> = {
  /**
   * 大纲生成 - 第1轮
   */
  OUTLINE: async (payload) => {
    const { seasonId } = payload;
    if (!seasonId) throw new Error('seasonId is required');

    const { outlineGenerationService } = await import('./outline-generation.service');
    console.log(`[TaskWorker] 执行大纲生成任务 - Season ${seasonId}`);
    await outlineGenerationService.generateOutlinesForSeason(seasonId as string);
  },

  /**
   * 下一章大纲生成
   */
  NEXT_OUTLINE: async (payload) => {
    const { seasonId } = payload;
    if (!seasonId) throw new Error('seasonId is required');

    const { outlineGenerationService } = await import('./outline-generation.service');
    console.log(`[TaskWorker] 执行下一章大纲任务 - Season ${seasonId}`);

    const books = await prisma.book.findMany({
      where: { seasonId: seasonId as string, status: 'ACTIVE' },
      select: { id: true },
    });

    await Promise.all(
      books.map((book) => outlineGenerationService.generateNextChapterOutline(book.id))
    );
  },

  /**
   * 章节创作
   */
  WRITE_CHAPTER: async (payload) => {
    const { seasonId, round } = payload;
    if (!seasonId || !round) throw new Error('seasonId and round are required');

    const { chapterWritingService } = await import('./chapter-writing.service');
    console.log(`[TaskWorker] 执行章节创作任务 - Season ${seasonId}, Round ${round}`);
    await chapterWritingService.writeChaptersForSeason(seasonId as string, round as number);
  },

  /**
   * 追赶写作
   */
  CATCH_UP: async (payload) => {
    const { seasonId, round } = payload;
    if (!seasonId || !round) throw new Error('seasonId and round are required');

    const { chapterWritingService } = await import('./chapter-writing.service');
    console.log(`[TaskWorker] 执行追赶任务 - Season ${seasonId}, Round ${round}`);

    // 追赶所有落后书籍
    await chapterWritingService.catchUpBooks(seasonId as string, round as number);
  },

  /**
   * Reader Agent 阅读
   */
  READER_AGENT: async (payload) => {
    const { chapterId, bookId } = payload;
    if (!chapterId || !bookId) throw new Error('chapterId and bookId are required');

    const { readerAgentService } = await import('./reader-agent.service');
    console.log(`[TaskWorker] 执行 Reader Agent 任务 - Chapter ${chapterId}`);
    await readerAgentService.dispatchReaderAgents(chapterId as string, bookId as string);
  },
};

export class TaskWorkerService {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;

  /**
   * 启动 Worker
   */
  start(intervalMs: number = 10 * 1000): void {
    if (this.isRunning) {
      console.log('[TaskWorker] Worker 已启动');
      return;
    }

    console.log('[TaskWorker] 启动任务执行 Worker...');
    this.isRunning = true;

    // 立即执行一次
    this.processTasks();

    // 定时执行
    this.interval = setInterval(() => {
      this.processTasks();
    }, intervalMs);
  }

  /**
   * 停止 Worker
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('[TaskWorker] Worker 已停止');
  }

  /**
   * 处理队列中的任务
   */
  async processTasks(): Promise<void> {
    try {
      // 获取下一个待处理任务
      const task = await taskQueueService.getNextTask();

      if (!task) {
        return;
      }

      console.log(`[TaskWorker] 开始处理任务: ${task.taskType} (${task.id})`);

      const handler = taskHandlers[task.taskType];

      if (!handler) {
        console.error(`[TaskWorker] 未找到任务处理器: ${task.taskType}`);
        await taskQueueService.fail(task.id, `Unknown task type: ${task.taskType}`);
        return;
      }

      try {
        await handler(task.payload);
        await taskQueueService.complete(task.id);
        console.log(`[TaskWorker] 任务完成: ${task.taskType} (${task.id})`);
      } catch (error) {
        console.error(`[TaskWorker] 任务执行失败: ${task.id}`, error);
        await taskQueueService.fail(task.id, (error as Error).message);
      }
    } catch (error) {
      console.error('[TaskWorker] 处理任务时发生错误:', error);
    }
  }

  /**
   * 手动触发一次任务处理（用于测试）
   */
  async triggerOnce(): Promise<void> {
    await this.processTasks();
  }
}

// 单例实例
export const taskWorkerService = new TaskWorkerService();

// 开发模式下自动启动
if (process.env.NODE_ENV !== 'production' && process.env.TASK_WORKER_ENABLED !== 'false') {
  console.log('[TaskWorker] 开发模式：自动启动 Worker');
  setTimeout(() => {
    taskWorkerService.start();
  }, 5000);
}
