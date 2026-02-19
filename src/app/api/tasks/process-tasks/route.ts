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

export async function POST() {
  // Fire-and-forget: 立即返回，任务在后台异步执行
  // 避免 Vercel 函数超时
  setImmediate(async () => {
    try {
      console.log('[ProcessTasks] 后台开始处理任务队列...');

      // 触发一次任务处理
      await taskWorkerService.triggerOnce();

      // 清理已完成的任务（保留最近24小时的记录）
      const cleanedCount = await taskQueueService.cleanup(24);
      console.log(`[ProcessTasks] 清理了 ${cleanedCount} 个旧任务`);

      console.log('[ProcessTasks] 后台任务处理完成');
    } catch (error) {
      console.error('[ProcessTasks] 后台任务处理失败:', error);
    }
  });

  // 立即返回，不等待任务完成
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
