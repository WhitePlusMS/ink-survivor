import { NextRequest, NextResponse } from 'next/server';
import { seasonQueueService } from '@/services/season-queue.service';

// POST /api/admin/season-queue/publish - 批量发布赛季
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count = 1, baseStartTime } = body;

    if (!baseStartTime) {
      return NextResponse.json({
        code: 400,
        data: null,
        message: '缺少基准开始时间',
      });
    }

    const startTime = new Date(baseStartTime);
    const result = await seasonQueueService.batchPublish(count, startTime);

    if (result.errors.length > 0) {
      return NextResponse.json({
        code: 206,
        data: {
          published: result.published,
          errors: result.errors,
        },
        message: `发布完成，${result.published.length} 个成功，${result.errors.length} 个失败`,
      });
    }

    console.log(`[SeasonQueue] Batch published ${result.published.length} seasons`);

    return NextResponse.json({
      code: 0,
      data: result.published,
      message: `成功发布 ${result.published.length} 个赛季`,
    });
  } catch (err) {
    console.error('[SeasonQueue] Batch publish failed:', err);
    return NextResponse.json({
      code: 500,
      data: null,
      message: err instanceof Error ? err.message : '批量发布失败',
    });
  }
}
