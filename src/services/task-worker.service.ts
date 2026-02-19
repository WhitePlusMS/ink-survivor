/**
 * 任务执行 Worker
 *
 * 从 TaskQueue 中获取任务并执行
 * 支持多种任务类型：OUTLINE, WRITE_CHAPTER, READER_AGENT 等
 */

import { taskQueueService, TaskPayload } from './task-queue.service';
import { prisma } from '@/lib/prisma';

// 任务处理器映射
type TaskHandler = (payload: Record<string, unknown>) => Promise<void>;

const taskHandlers: Record<string, TaskHandler> = {
  /**
   * 轮次完整流程：大纲 → 章节 → AI评论
   * 连续执行，中间不等待
   */
  ROUND_CYCLE: async (payload) => {
    const { seasonId, round } = payload;
    console.log(`[TaskWorker] 🚀 ROUND_CYCLE 开始: seasonId=${seasonId}, round=${round}`);

    if (!seasonId || !round) throw new Error('seasonId and round are required');

    // 查询当前赛季的所有书籍
    const books = await prisma.book.findMany({
      where: { seasonId: seasonId as string, status: 'ACTIVE' },
      select: { id: true },
    });
    console.log(`[TaskWorker] 找到 ${books.length} 本活跃书籍`);

    // 1. 大纲生成（第1轮生成整本，后续轮优化单章）
    console.log(`[TaskWorker] 📝 步骤1: 生成大纲`);
    if (round === 1) {
      console.log(`[TaskWorker] 第1轮：生成整本书大纲`);
      const { outlineGenerationService } = await import('./outline-generation.service');
      await outlineGenerationService.generateOutlinesForSeason(seasonId as string);
    } else {
      console.log(`[TaskWorker] 后续轮次：为 ${books.length} 本书生成下一章大纲`);
      const { outlineGenerationService } = await import('./outline-generation.service');
      for (const book of books) {
        await outlineGenerationService.generateNextChapterOutline(book.id, round as number);
      }
    }
    console.log(`[TaskWorker] ✅ 大纲生成完成`);

    // 2. 章节生成（并发处理所有书籍）
    console.log(`[TaskWorker] ✍️ 步骤2: 生成章节内容`);
    const { chapterWritingService } = await import('./chapter-writing.service');
    await chapterWritingService.writeChaptersForSeason(seasonId as string, round as number);
    console.log(`[TaskWorker] ✅ 章节生成完成`);

    // 3. AI 评论
    // 注意：chapterWritingService.writeChapter 内部已通过 setTimeout 调用 readerAgentService
    console.log(`[TaskWorker] 🤖 步骤3: AI评论 (由 writeChapter 内部触发)`);

    // 4. 落后检测
    console.log(`[TaskWorker] 🔍 步骤4: 落后检测`);
    const allBooks = await prisma.book.findMany({
      where: { seasonId: seasonId as string, status: 'ACTIVE' },
      include: { _count: { select: { chapters: true } } },
    });
    const behindBooks = allBooks.filter(book => (book._count.chapters as number) < (round as number));
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
      const task = await taskQueueService.getTaskById(taskId);

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
