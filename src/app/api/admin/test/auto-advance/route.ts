/**
 * 赛季自动推进控制 API
 * POST /api/admin/test/auto-advance
 *
 * 功能：
 * - 启动/停止自动推进服务
 * - 查询自动推进状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { seasonAutoAdvanceService } from '@/services/season-auto-advance.service';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/utils/admin';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证管理员权限
    const authResult = await requireAdmin();
    if (!authResult.success) {
      const response = authResult.message.includes('登录')
        ? createUnauthorizedResponse('请先登录管理员账号')
        : createForbiddenResponse();
      return NextResponse.json(response, { status: authResult.message.includes('登录') ? 401 : 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'START') {
      // 启动自动推进服务
      await seasonAutoAdvanceService.start();
      return NextResponse.json({
        code: 0,
        data: { isRunning: true },
        message: '自动推进服务已启动',
      });
    } else if (action === 'STOP') {
      // 停止自动推进服务
      seasonAutoAdvanceService.stop();
      return NextResponse.json({
        code: 0,
        data: { isRunning: false },
        message: '自动推进服务已停止',
      });
    } else {
      return NextResponse.json({
        code: 400,
        data: null,
        message: '无效操作，支持 START/STOP',
      });
    }
  } catch (error) {
    console.error('[AutoAdvance] 错误:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '操作失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    code: 0,
    data: {
      // 可以添加更多状态信息
    },
    message: '自动推进服务运行中',
  });
}
