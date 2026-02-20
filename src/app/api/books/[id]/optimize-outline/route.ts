// 大纲优化 API
import { NextRequest, NextResponse } from 'next/server';
import { outlineGenerationService } from '@/services/outline-generation.service';
import { outlineService } from '@/services/outline.service';

/**
 * POST /api/books/:id/optimize-outline - 优化大纲（生成下一章大纲）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    console.log(`[OptimizeOutline] Starting outline optimization for book: ${bookId}`);

    // 调用 generateNextChapterOutline 生成下一章大纲
    await outlineGenerationService.generateNextChapterOutline(bookId);

    // 获取优化后的大纲
    const outline = await outlineService.getOutline(bookId);

    return NextResponse.json({
      code: 0,
      data: outline,
      message: '大纲优化成功',
    });
  } catch (error) {
    console.error('Optimize outline error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '大纲优化失败' },
      { status: 500 }
    );
  }
}
