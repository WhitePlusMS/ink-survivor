/**
 * 任务处理 Worker API
 * POST /api/tasks/process-tasks
 *
 * 从 TaskQueue 中获取任务并执行
 * 由外部 Cron Job 每分钟调用
 *
 * 支持的任务类型：
 * - ROUND_CYCLE: 轮次完整流程（大纲 → 章节 → AI评论）
 * - CATCH_UP: 追赶写作
 */

import { NextResponse } from 'next/server';
import { taskWorkerService } from '@/services/task-worker.service';
import { taskQueueService } from '@/services/task-queue.service';

export const dynamic = 'force-dynamic';
const globalState = globalThis as typeof globalThis & {
  __processTasksRunning?: boolean;
  __processTasksLastRun?: number;
};
const minIntervalMs = Number(process.env.PROCESS_TASKS_MIN_INTERVAL_MS || 20000);

export async function POST() {
  const nowMs = Date.now();
  if (globalState.__processTasksRunning) {
    return NextResponse.json({
      code: 0,
      data: { message: '任务处理中，跳过本次触发' },
      message: 'skipped',
    });
  }
  if (globalState.__processTasksLastRun && nowMs - globalState.__processTasksLastRun < minIntervalMs) {
    return NextResponse.json({
      code: 0,
      data: { message: '触发过于频繁，跳过本次触发' },
      message: 'skipped',
    });
  }
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  globalState.__processTasksRunning = true;
  globalState.__processTasksLastRun = Date.now();
  if (isProduction) {
    try {
      console.log('[ProcessTasks] 开始处理任务队列...');
      await taskWorkerService.triggerOnce();
      const cleanedCount = await taskQueueService.cleanup(24);
      console.log(`[ProcessTasks] 清理了 ${cleanedCount} 个旧任务`);
      console.log('[ProcessTasks] 任务处理完成');
      return NextResponse.json({
        code: 0,
        data: { message: '任务处理完成' },
        message: 'completed',
      });
    } catch (error) {
      console.error('[ProcessTasks] 任务处理失败:', error);
      return NextResponse.json(
        { code: 500, data: null, message: '任务处理失败: ' + (error as Error).message },
        { status: 500 }
      );
    } finally {
      globalState.__processTasksRunning = false;
    }
  }

  setImmediate(async () => {
    try {
      console.log('[ProcessTasks] 后台开始处理任务队列...');
      await taskWorkerService.triggerOnce();
      const cleanedCount = await taskQueueService.cleanup(24);
      console.log(`[ProcessTasks] 清理了 ${cleanedCount} 个旧任务`);
      console.log('[ProcessTasks] 后台任务处理完成');
    } catch (error) {
      console.error('[ProcessTasks] 后台任务处理失败:', error);
    } finally {
      globalState.__processTasksRunning = false;
    }
  });

  return NextResponse.json({
    code: 0,
    data: { message: '任务已触发，将在后台异步执行' },
    message: 'triggered',
  });
}

/**
 * GET /api/tasks/process-tasks - 获取队列状态
 */
export async function GET() {
  return NextResponse.json({
    code: 0,
    data: { message: '使用 POST 调用以处理任务' },
    message: 'success',
  });
}
