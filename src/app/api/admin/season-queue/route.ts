import { NextRequest, NextResponse } from 'next/server';
import { seasonQueueService, CreateSeasonDto } from '@/services/season-queue.service';

export const dynamic = 'force-dynamic';

// GET /api/admin/season-queue - 获取所有赛季队列
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const orderBy = searchParams.get('orderBy') as 'asc' | 'desc' | undefined;

    const items = await seasonQueueService.findAll({ status, orderBy });

    return NextResponse.json({
      code: 0,
      data: items,
      message: 'success',
    });
  } catch (err) {
    console.error('[SeasonQueue] Failed to list:', err);
    return NextResponse.json({
      code: 500,
      data: null,
      message: '获取赛季队列失败',
    });
  }
}

// POST /api/admin/season-queue - 创建赛季队列
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 计算开始和结束时间
    const startTime = body.startTime ? new Date(body.startTime) : new Date();
    const maxChapters = body.maxChapters || 7;
    const roundDuration = body.roundDuration || 20;
    // 赛季总时长 = 每轮时长 * 最大章节数 + 报名截止时间
    const totalMinutes = roundDuration * maxChapters + 10;
    const endTime = body.endTime ? new Date(body.endTime) : new Date(startTime.getTime() + totalMinutes * 60 * 1000);

    console.log('[SeasonQueue] 创建赛季配置:', {
      seasonNumber: body.seasonNumber,
      themeKeyword: body.themeKeyword,
      maxChapters,
      minChapters: body.minChapters,
      roundDuration,
      rewards: body.rewards,
    });

    const dto: CreateSeasonDto = {
      seasonNumber: body.seasonNumber,
      themeKeyword: body.themeKeyword,
      constraints: body.constraints || [],
      zoneStyles: body.zoneStyles || [],
      maxChapters: body.maxChapters || 7,
      minChapters: body.minChapters || 3,
      roundDuration,
      rewards: body.rewards || { first: 1000, second: 500, third: 200 },
      startTime,
      endTime,
    };

    const item = await seasonQueueService.create(dto);

    console.log(`[SeasonQueue] Created S${item.seasonNumber}: ${item.themeKeyword}`);
    return NextResponse.json({
      code: 0,
      data: item,
      message: '创建成功',
    });
  } catch (err) {
    console.error('[SeasonQueue] Failed to create:', err);
    return NextResponse.json({
      code: 500,
      data: null,
      message: err instanceof Error ? err.message : '创建失败',
    });
  }
}
