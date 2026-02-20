// 生成大纲 API
import { NextRequest, NextResponse } from 'next/server';
import { outlineGenerationService } from '@/services/outline-generation.service';
import { outlineService } from '@/services/outline.service';

/**
 * POST /api/books/:id/generate-outline - 生成大纲
 * @param testMode - 测试模式：true 时即使已有大纲也生成，且不保存到数据库
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const body = await request.json().catch(() => ({}));
    const testMode = body.testMode === true;

    console.log(`[GenerateOutline] Starting outline generation for book: ${bookId}, testMode: ${testMode}`);

    // 使用与正常业务流程一致的方式生成大纲
    const result = await outlineGenerationService.generateOutline(bookId, testMode);

    // 测试模式：直接返回生成的大纲数据
    if (testMode && result) {
      return NextResponse.json({
        code: 0,
        data: result,
        message: '大纲生成成功（测试模式，不保存到数据库）',
      });
    }

    // 正式模式：获取保存的大纲
    const outline = await outlineService.getOutline(bookId);

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
