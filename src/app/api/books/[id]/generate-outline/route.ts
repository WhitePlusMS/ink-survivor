// 生成大纲 API
import { NextRequest, NextResponse } from 'next/server';
import { outlineService } from '@/services/outline.service';
import { GenerateOutlineDto } from '@/common/dto/outline.dto';
import { GenerateOutlineParams } from '@/types/outline';

/**
 * POST /api/books/:id/generate-outline - 生成大纲
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // TODO: 从 Session 获取当前用户 ID
    const userId = 'temp-user-id';

    const body = await request.json().catch(() => ({}));
    const { forcedChapter, forcedEvent, endingType } = body as GenerateOutlineDto;

    console.log(`[GenerateOutline] Starting outline generation for book: ${bookId}`);

    const outlineParams: GenerateOutlineParams = {
      forcedChapter,
      forcedEvent,
      endingType,
    };

    const outline = await outlineService.generateOutline(bookId, userId, outlineParams);

    return NextResponse.json({
      code: 0,
      data: outline,
      message: '大纲生成成功',
    });
  } catch (error) {
    console.error('Generate outline error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '大纲生成失败' },
      { status: 500 }
    );
  }
}
