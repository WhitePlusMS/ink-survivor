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
  try {
    console.log('[ProcessTasks] 开始处理任务队列...');

    // 触发一次任务处理
    await taskWorkerService.triggerOnce();

    // 清理已完成的任务（保留最近24小时的记录）
    const cleanedCount = await taskQueueService.cleanup(24);
    console.log(`[ProcessTasks] 清理了 ${cleanedCount} 个旧任务`);

    return NextResponse.json({
      code: 0,
      data: { message: '任务处理完成' },
      message: 'success',
    });
  } catch (error) {
    console.error('[ProcessTasks] 处理失败:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '处理失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
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
