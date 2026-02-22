/**
 * 任务执行 Worker
 *
 * 从 TaskQueue 中获取任务并执行
 * 支持多种任务类型：ROUND_CYCLE, CATCH_UP, READER_AGENT
 */

import { taskQueueService, TaskPayload } from './task-queue.service';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

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

const staleProcessingMs = Number(process.env.TASK_WORKER_STALE_MS || 10 * 60 * 1000);
const terminateStaleLock = process.env.TASK_WORKER_TERMINATE_STALE !== 'false';

let activeTaskId: string | null = null;
const taskProgress = new Map<string, { step: string; detail?: string; updatedAt: Date }>();
const setTaskProgress = (step: string, detail?: string): void => {
  if (!activeTaskId) return;
  taskProgress.set(activeTaskId, { step, detail, updatedAt: new Date() });
};

const taskHandlers: Record<string, TaskHandler> = {
  /**
   * 轮次完整流程：大纲 → 章节 → AI评论
   * 连续执行，中间不等待
   */
  ROUND_CYCLE: async (payload) => {
    const { seasonId, round } = payload;
    console.log(`[TaskWorker] 🚀 ROUND_CYCLE 开始: seasonId=${seasonId}, round=${round}`);
    setTaskProgress('ROUND_CYCLE_START', `seasonId=${seasonId}, round=${round}`);

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
    setTaskProgress('ROUND_CYCLE_BOOKS_READY', `total=${allBooks.length}, active=${activeBooks.length}`);

    // 1. 大纲生成（第1轮生成整本，后续轮优化单章）
    console.log(`[TaskWorker] 📝 步骤1: 生成大纲`);
    setTaskProgress('ROUND_CYCLE_OUTLINE_START');
    if (round === 1) {
      console.log(`[TaskWorker] 第1轮：生成整本书大纲`);
      const { outlineGenerationService } = await import('./outline-generation.service');
      await outlineGenerationService.generateOutlinesForSeason(seasonId as string);
    } else {
      console.log(`[TaskWorker] 后续轮次：为 ${activeBooks.length} 本书生成下一章大纲`);
      const { outlineGenerationService } = await import('./outline-generation.service');
      await outlineGenerationService.generateNextChapterOutlinesForBooks(
        activeBooks.map((book) => book.id),
        round as number
      );
    }
    console.log(`[TaskWorker] ✅ 大纲生成完成`);
    setTaskProgress('ROUND_CYCLE_OUTLINE_DONE');

    // 2. 章节生成（并发处理活跃书籍）
    console.log(`[TaskWorker] ✍️ 步骤2: 生成章节内容`);
    setTaskProgress('ROUND_CYCLE_CHAPTER_START');
    const { chapterWritingService } = await import('./chapter-writing.service');
    await chapterWritingService.writeChaptersForSeason(seasonId as string, round as number, activeBooks.map(b => b.id));
    console.log(`[TaskWorker] ✅ 章节生成完成`);
    setTaskProgress('ROUND_CYCLE_CHAPTER_DONE');

    // 3. AI 评论
    console.log(`[TaskWorker] 🤖 步骤3: AI评论 (由 writeChaptersForSeason 内部触发)`);
    setTaskProgress('ROUND_CYCLE_READER_TRIGGERED');

    // 4. 落后检测
    console.log(`[TaskWorker] 🔍 步骤4: 落后检测`);
    setTaskProgress('ROUND_CYCLE_BEHIND_CHECK');
    // 使用之前查询的 activeBooks 进行落后检测
    const behindBooks = activeBooks.filter(book => {
      const agentConfig = book.author.agentConfig as unknown as { maxChapters?: number } | null;
      const maxChapters = agentConfig?.maxChapters || 5;
      const currentChapters = book._count.chapters as number;
      return currentChapters < maxChapters && currentChapters < (round as number);
    });
    console.log(`[TaskWorker] 落后书籍数量: ${behindBooks.length}`);
    setTaskProgress('ROUND_CYCLE_BEHIND_RESULT', `count=${behindBooks.length}`);

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
      setTaskProgress('ROUND_CYCLE_CATCHUP_CREATED');
    } else {
      // 无落后：直接进入 HUMAN_READING
      console.log(`[TaskWorker] ✅ 无落后书籍，准备调用 advanceToNextRound 切换到 HUMAN_READING`);
      setTaskProgress('ROUND_CYCLE_ADVANCE_NEXT');
      const { seasonAutoAdvanceService } = await import('./season-auto-advance.service');
      await seasonAutoAdvanceService.advanceToNextRound(seasonId as string, round as number);
      console.log(`[TaskWorker] ✅ advanceToNextRound 调用完成`);
      setTaskProgress('ROUND_CYCLE_ADVANCE_DONE');
    }

    console.log(`[TaskWorker] 🎉 ROUND_CYCLE 任务完成: round=${round}`);
    setTaskProgress('ROUND_CYCLE_DONE');
  },

  /**
   * 追赶写作
   */
  CATCH_UP: async (payload) => {
    const { seasonId, round } = payload;
    if (!seasonId || !round) throw new Error('seasonId and round are required');

    const { chapterWritingService } = await import('./chapter-writing.service');
    console.log(`[TaskWorker] 执行追赶任务 - Season ${seasonId}, Round ${round}`);
    setTaskProgress('CATCH_UP_START', `seasonId=${seasonId}, round=${round}`);

    // 追赶所有落后书籍
    await chapterWritingService.catchUpBooks(seasonId as string, round as number);
    setTaskProgress('CATCH_UP_WRITE_DONE');

    // 追赶完成后切换阶段
    const { seasonAutoAdvanceService } = await import('./season-auto-advance.service');
    await seasonAutoAdvanceService.advanceToNextRound(seasonId as string, round as number);
    setTaskProgress('CATCH_UP_ADVANCE_DONE');
  },

  /**
   * Reader Agent 阅读
   */
  READER_AGENT: async (payload) => {
    const { chapterId, bookId } = payload;
    if (!chapterId || !bookId) throw new Error('chapterId and bookId are required');

    const { readerAgentService } = await import('./reader-agent.service');
    console.log(`[TaskWorker] 执行 Reader Agent 任务 - Chapter ${chapterId}`);
    setTaskProgress('READER_AGENT_START', `chapterId=${chapterId}`);
    await readerAgentService.dispatchReaderAgents(chapterId as string, bookId as string);
    setTaskProgress('READER_AGENT_DONE', `chapterId=${chapterId}`);
  },
};

export class TaskWorkerService {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;
  private readonly lockKey = 779187;

  private async tryAcquireLock(tx: Prisma.TransactionClient): Promise<boolean> {
    try {
      const result = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(${this.lockKey}) as locked`;
      return result?.[0]?.locked === true;
    } catch (error) {
      if (isDbPoolError(error)) {
        return false;
      }
      throw error;
    }
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

      console.log(`[TaskWorker] 开始处理任务: ${task.taskType} (${task.id}) payload=${JSON.stringify(task.payload)}`);
      activeTaskId = task.id;
      setTaskProgress('TASK_START', `type=${task.taskType}`);

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
        setTaskProgress('TASK_DONE');
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
      if (activeTaskId) {
        taskProgress.delete(activeTaskId);
      }
      activeTaskId = null;
    }
  }

  /**
   * 处理队列中的任务
   */
  async processTasks(): Promise<void> {
    let lockResult: { locked: boolean; task: Awaited<ReturnType<typeof taskQueueService.getNextTask>> | null };
    try {
      lockResult = await withDbRetry(() => prisma.$transaction(async (tx) => {
        const locked = await this.tryAcquireLock(tx);
        if (!locked) {
          return { locked: false, task: null };
        }
        const task = await taskQueueService.getNextTask(tx);
        return { locked: true, task };
      }));
    } catch (error) {
      if (isDbPoolError(error)) {
        console.warn('[TaskWorker] 获取锁失败，数据库连接异常，跳过本次触发');
        return;
      }
      throw error;
    }
    if (!lockResult.locked) {
      let processingTask;
      let stats;
      let lockHolders;
      let currentPidResult;
      let connectionStats;
      try {
        [processingTask, stats, lockHolders, currentPidResult, connectionStats] = await Promise.all([
          prisma.taskQueue.findFirst({
            where: { status: 'PROCESSING' },
            orderBy: { startedAt: 'desc' },
          }),
          taskQueueService.getStats(),
          prisma.$queryRaw<Array<{
            pid: number;
            state: string;
            query_start: Date | null;
            query: string | null;
          }>>`
            SELECT sa.pid, sa.state, sa.query_start, sa.query
            FROM pg_stat_activity sa
            WHERE sa.pid IN (
              SELECT l.pid
              FROM pg_locks l
              WHERE l.locktype = 'advisory' AND l.objid = ${this.lockKey}
            )
          `,
          prisma.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() as pid`,
          prisma.$queryRaw<Array<{ total: number; active: number; idle: number }>>`
            SELECT
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE state = 'active')::int AS active,
              COUNT(*) FILTER (WHERE state LIKE 'idle%')::int AS idle
            FROM pg_stat_activity
            WHERE datname = current_database()
          `,
        ]);
      } catch (error) {
        if (isDbPoolError(error)) {
          console.warn('[TaskWorker] 诊断查询失败，数据库连接异常，跳过本次触发');
          return;
        }
        throw error;
      }
      const currentPid = currentPidResult?.[0]?.pid;
      const dbStats = connectionStats?.[0];
      if (dbStats) {
        console.log(`[TaskWorker][Supabase] 连接统计: total=${dbStats.total}, active=${dbStats.active}, idle=${dbStats.idle}`);
      }
      if (processingTask) {
        const progress = taskProgress.get(processingTask.id);
        const durationMs = processingTask.startedAt ? Date.now() - processingTask.startedAt.getTime() : 0;
        const durationSec = Math.max(0, Math.floor(durationMs / 1000));
        const progressText = progress
          ? `step=${progress.step}, updatedAt=${progress.updatedAt.toISOString()}${progress.detail ? `, detail=${progress.detail}` : ''}`
          : 'step=unknown';
        console.log(`[TaskWorker] 已有任务处理中，跳过本次触发: ${processingTask.taskType} (${processingTask.id}) startedAt=${processingTask.startedAt?.toISOString()} durationSec=${durationSec} attempts=${processingTask.attempts} payload=${JSON.stringify(processingTask.payload)} ${progressText}`);
        if (lockHolders.length > 0) {
          lockHolders.forEach(holder => {
            const queryText = holder.query ? holder.query.replace(/\s+/g, ' ').slice(0, 200) : '';
            console.log(`[TaskWorker] 锁占用进程: pid=${holder.pid} state=${holder.state} queryStart=${holder.query_start?.toISOString()} query=${queryText}`);
          });
          if (durationMs > staleProcessingMs) {
            const holderPids = lockHolders
              .map(holder => holder.pid)
              .filter(pid => pid && pid !== currentPid);
            if (terminateStaleLock) {
              for (const pid of holderPids) {
                try {
                  await prisma.$executeRaw`SELECT pg_terminate_backend(${pid}::int)`;
                  console.warn(`[TaskWorker] 已终止锁占用进程: pid=${pid}`);
                } catch (error) {
                  console.warn(`[TaskWorker] 终止锁占用进程失败: pid=${pid}`, error);
                }
              }
            }
            await withDbRetry(() => taskQueueService.fail(processingTask.id, `stale processing timeout: ${durationSec}s`));
            console.warn(`[TaskWorker] 已重置超时任务: ${processingTask.id}`);
          }
        } else if (durationMs > staleProcessingMs) {
          await withDbRetry(() => taskQueueService.fail(processingTask.id, `stale processing without lock: ${durationSec}s`));
          console.warn(`[TaskWorker] 已重置无锁超时任务: ${processingTask.id}`);
        } else {
          console.log('[TaskWorker] 未找到锁占用进程');
        }
      } else {
        console.log('[TaskWorker] 已有任务处理中，跳过本次触发: 未找到处理中任务');
        if (lockHolders.length > 0) {
          lockHolders.forEach(holder => {
            const queryText = holder.query ? holder.query.replace(/\s+/g, ' ').slice(0, 200) : '';
            console.log(`[TaskWorker] 锁占用进程(无处理中任务): pid=${holder.pid} state=${holder.state} queryStart=${holder.query_start?.toISOString()} query=${queryText}`);
          });
        } else {
          console.log('[TaskWorker] 未找到锁占用进程(无处理中任务)');
        }
      }
      console.log(`[TaskWorker] 任务统计: pending=${stats.pending}, processing=${stats.processing}, completed=${stats.completed}, failed=${stats.failed}`);
      return;
    }

    try {
      const task = lockResult.task;

      if (!task) {
        const stats = await taskQueueService.getStats();
        console.log(`[TaskWorker] 队列为空，任务统计: pending=${stats.pending}, processing=${stats.processing}, completed=${stats.completed}, failed=${stats.failed}`);
        return;
      }

      console.log(`[TaskWorker] 开始处理任务: ${task.taskType} (${task.id}) payload=${JSON.stringify(task.payload)}`);
      activeTaskId = task.id;
      setTaskProgress('TASK_START', `type=${task.taskType}`);

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
        setTaskProgress('TASK_DONE');
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
      if (activeTaskId) {
        taskProgress.delete(activeTaskId);
      }
      activeTaskId = null;
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
