import { NextRequest, NextResponse } from 'next/server';
import { seasonQueueService, UpdateSeasonQueueDto } from '@/services/season-queue.service';

// GET /api/admin/season-queue/[id] - 获取单个赛季队列
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await seasonQueueService.findById(id);

    if (!item) {
      return NextResponse.json({
        code: 404,
        data: null,
        message: '赛季队列不存在',
      });
    }

    return NextResponse.json({
      code: 0,
      data: item,
      message: 'success',
    });
  } catch (err) {
    console.error('[SeasonQueue] Failed to get:', err);
    return NextResponse.json({
      code: 500,
      data: null,
      message: '获取失败',
    });
  }
}

// PUT /api/admin/season-queue/[id] - 更新赛季队列
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const dto: UpdateSeasonQueueDto = {};

    if (body.themeKeyword !== undefined) dto.themeKeyword = body.themeKeyword;
    if (body.constraints !== undefined) dto.constraints = body.constraints;
    if (body.zoneStyles !== undefined) dto.zoneStyles = body.zoneStyles;
    if (body.maxChapters !== undefined) dto.maxChapters = body.maxChapters;
    if (body.minChapters !== undefined) dto.minChapters = body.minChapters;
    if (body.roundDuration !== undefined) dto.roundDuration = body.roundDuration;
    if (body.rewards !== undefined) dto.rewards = body.rewards;
    if (body.plannedStartTime !== undefined) dto.plannedStartTime = body.plannedStartTime ? new Date(body.plannedStartTime) : null;
    if (body.intervalHours !== undefined) dto.intervalHours = body.intervalHours;
    if (body.status !== undefined) dto.status = body.status;
    if (body.llmSuggestion !== undefined) dto.llmSuggestion = body.llmSuggestion;
    if (body.llmOptimized !== undefined) dto.llmOptimized = body.llmOptimized;

    const item = await seasonQueueService.update(id, dto);

    if (!item) {
      return NextResponse.json({
        code: 404,
        data: null,
        message: '赛季队列不存在',
      });
    }

    console.log(`[SeasonQueue] Updated S${item.seasonNumber}`);
    return NextResponse.json({
      code: 0,
      data: item,
      message: '更新成功',
    });
  } catch (err) {
    console.error('[SeasonQueue] Failed to update:', err);
    return NextResponse.json({
      code: 500,
      data: null,
      message: err instanceof Error ? err.message : '更新失败',
    });
  }
}

// DELETE /api/admin/season-queue/[id] - 删除赛季队列
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await seasonQueueService.delete(id);

    if (!deleted) {
      return NextResponse.json({
        code: 500,
        data: null,
        message: '删除失败',
      });
    }

    console.log(`[SeasonQueue] Deleted ${id}`);
    return NextResponse.json({
      code: 0,
      data: null,
      message: '删除成功',
    });
  } catch (err) {
    console.error('[SeasonQueue] Failed to delete:', err);
    return NextResponse.json({
      code: 500,
      data: null,
      message: '删除失败',
    });
  }
}
