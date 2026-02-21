/**
 * 任务执行 Worker
 *
 * 从 TaskQueue 中获取任务并执行
 * 支持多种任务类型：ROUND_CYCLE, CATCH_UP, READER_AGENT
 */

import { taskQueueService, TaskPayload } from './task-queue.service';
import { prisma } from '@/lib/prisma';

// 任务处理器映射
type TaskHandler = (payload: Record<string, unknown>) => Promise<void>;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const isDbPoolError = (error: unknown): boolean => {
  const code = (error as { code?: string }).code;
  return code === 'P2024' || code === 'P1017';
};
const withDbRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  const maxRetries = process.env.NODE_ENV === 'test' ? 0 : 2;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (isDbPoolError(error) && attempt < maxRetries) {
        const delay = 500 * (attempt + 1);
        attempt += 1;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
};

const taskHandlers: Record<string, TaskHandler> = {
  /**
   * 轮次完整流程：大纲 → 章节 → AI评论
   * 连续执行，中间不等待
   */
  ROUND_CYCLE: async (payload) => {
    const { seasonId, round } = payload;
    console.log(`[TaskWorker] 🚀 ROUND_CYCLE 开始: seasonId=${seasonId}, round=${round}`);

    if (!seasonId || !round) throw new Error('seasonId and round are required');

    // 查询当前赛季的所有活跃书籍（已完成的书籍不再参与）
    const allBooks = await withDbRetry(() => prisma.book.findMany({
      where: { seasonId: seasonId as string, status: 'ACTIVE' },
      include: {
        author: { select: { agentConfig: true } },
        _count: { select: { chapters: true } },
      },
    }));

    // 过滤掉已完成所有章节的书籍
    const activeBooks = allBooks.filter(book => {
      const agentConfig = book.author.agentConfig as unknown as { maxChapters?: number } | null;
      const maxChapters = agentConfig?.maxChapters || 5;
      const currentChapters = book._count.chapters as number;
      return currentChapters < maxChapters;
    });

    console.log(`[TaskWorker] 找到 ${allBooks.length} 本书籍，其中 ${activeBooks.length} 本需要继续创作`);

    // 1. 大纲生成（第1轮生成整本，后续轮优化单章）
    console.log(`[TaskWorker] 📝 步骤1: 生成大纲`);
    if (round === 1) {
      console.log(`[TaskWorker] 第1轮：生成整本书大纲`);
      const { outlineGenerationService } = await import('./outline-generation.service');
      await outlineGenerationService.generateOutlinesForSeason(seasonId as string);
    } else {
      console.log(`[TaskWorker] 后续轮次：为 ${activeBooks.length} 本书生成下一章大纲`);
      const { outlineGenerationService } = await import('./outline-generation.service');
      for (const book of activeBooks) {
        await outlineGenerationService.generateNextChapterOutline(book.id, round as number);
      }
    }
    console.log(`[TaskWorker] ✅ 大纲生成完成`);

    // 2. 章节生成（并发处理活跃书籍）
    console.log(`[TaskWorker] ✍️ 步骤2: 生成章节内容`);
    const { chapterWritingService } = await import('./chapter-writing.service');
    await chapterWritingService.writeChaptersForSeason(seasonId as string, round as number, activeBooks.map(b => b.id));
    console.log(`[TaskWorker] ✅ 章节生成完成`);

    // 3. AI 评论
    // 注意：chapterWritingService.writeChapter 内部已通过 setTimeout 调用 readerAgentService
    console.log(`[TaskWorker] 🤖 步骤3: AI评论 (由 writeChapter 内部触发)`);

    // 4. 落后检测
    console.log(`[TaskWorker] 🔍 步骤4: 落后检测`);
    // 使用之前查询的 activeBooks 进行落后检测
    const behindBooks = activeBooks.filter(book => {
      const agentConfig = book.author.agentConfig as unknown as { maxChapters?: number } | null;
      const maxChapters = agentConfig?.maxChapters || 5;
      const currentChapters = book._count.chapters as number;
      return currentChapters < maxChapters && currentChapters < (round as number);
    });
    console.log(`[TaskWorker] 落后书籍数量: ${behindBooks.length}`);

    if (behindBooks.length > 0) {
      // 有落后：创建 CATCH_UP 任务
      console.log(`[TaskWorker] ⚠️ 有 ${behindBooks.length} 本书落后，创建 CATCH_UP 任务`);
      const payload: TaskPayload = {
        seasonId: String(seasonId),
        round: Number(round),
        bookIds: behindBooks.map((b: { id: string }) => b.id),
      };
      await taskQueueService.create({
        taskType: 'CATCH_UP',
        payload,
        priority: 5,
      });
      console.log(`[TaskWorker] CATCH_UP 任务已创建`);
    } else {
      // 无落后：直接进入 HUMAN_READING
      console.log(`[TaskWorker] ✅ 无落后书籍，准备调用 advanceToNextRound 切换到 HUMAN_READING`);
      const { seasonAutoAdvanceService } = await import('./season-auto-advance.service');
      await seasonAutoAdvanceService.advanceToNextRound(seasonId as string, round as number);
      console.log(`[TaskWorker] ✅ advanceToNextRound 调用完成`);
    }

    console.log(`[TaskWorker] 🎉 ROUND_CYCLE 任务完成: round=${round}`);
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

    // 追赶完成后切换阶段
    const { seasonAutoAdvanceService } = await import('./season-auto-advance.service');
    await seasonAutoAdvanceService.advanceToNextRound(seasonId as string, round as number);
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
  private readonly lockKey = 779187;

  private async tryAcquireLock(): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_lock(${this.lockKey}) as locked`;
      return result?.[0]?.locked === true;
    } catch (error) {
      if (isDbPoolError(error)) {
        return false;
      }
      throw error;
    }
  }

  private async releaseLock(): Promise<void> {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${this.lockKey})`;
  }

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
   * 处理特定任务（根据任务ID）
   */
  async processTaskById(taskId: string): Promise<void> {
    try {
      // 获取指定任务
      const task = await withDbRetry(() => taskQueueService.getTaskById(taskId));

      if (!task) {
        console.error(`[TaskWorker] 任务不存在: ${taskId}`);
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
        await withDbRetry(() => taskQueueService.complete(task.id));
        console.log(`[TaskWorker] 任务完成: ${task.taskType} (${task.id})`);
      } catch (error) {
        console.error(`[TaskWorker] 任务执行失败: ${task.id}`, error);
        if (isDbPoolError(error)) {
          return;
        }
        await withDbRetry(() => taskQueueService.fail(task.id, (error as Error).message));
      }
    } catch (error) {
      console.error('[TaskWorker] 处理任务时发生错误:', error);
    }
  }

  /**
   * 处理队列中的任务
   */
  async processTasks(): Promise<void> {
    const locked = await this.tryAcquireLock();
    if (!locked) {
      console.log('[TaskWorker] 已有任务处理中，跳过本次触发');
      return;
    }

    try {
      // 获取下一个待处理任务
      const task = await withDbRetry(() => taskQueueService.getNextTask());

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
        await withDbRetry(() => taskQueueService.complete(task.id));
        console.log(`[TaskWorker] 任务完成: ${task.taskType} (${task.id})`);
      } catch (error) {
        console.error(`[TaskWorker] 任务执行失败: ${task.id}`, error);
        if (isDbPoolError(error)) {
          return;
        }
        await withDbRetry(() => taskQueueService.fail(task.id, (error as Error).message));
      }
    } catch (error) {
      console.error('[TaskWorker] 处理任务时发生错误:', error);
    } finally {
      try {
        await this.releaseLock();
      } catch (error) {
        console.error('[TaskWorker] 释放任务锁失败:', error);
      }
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
