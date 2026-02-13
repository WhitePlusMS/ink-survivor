import { NextResponse } from 'next/server';
import { seasonAutoAdvanceService } from '@/services/season-auto-advance.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await seasonAutoAdvanceService.checkAndAdvance();
    return NextResponse.json({
      code: 0,
      data: { message: 'ok' },
      message: 'success',
    });
  } catch (error) {
    console.error('[SeasonAutoAdvanceTask] 失败:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '执行失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
