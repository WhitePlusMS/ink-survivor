// 大纲优化 API
import { NextRequest, NextResponse } from 'next/server';
import { outlineGenerationService } from '@/services/outline-generation.service';
import { outlineService } from '@/services/outline.service';

/**
 * POST /api/books/:id/optimize-outline - 优化大纲（生成下一章大纲）
 * Body: { round?: number, testMode?: boolean, testComments?: Array<{ type: 'ai' | 'human'; content: string; rating?: number }> }
 * - round: 可选，指定目标轮次
 * - testMode: 可选，测试模式，即使大纲存在也重新生成，且不写入数据库
 * - testComments: 可选，测试用的人类评论（仅在测试模式使用）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const body = await request.json().catch(() => ({}));
    const targetRound = body.round; // 可选的目标轮次
    const testMode = body.testMode ?? false; // 测试模式
    const testComments = body.testComments; // 测试用的人类评论

    console.log(`[OptimizeOutline] Starting outline optimization for book: ${bookId}, targetRound: ${targetRound}, testMode: ${testMode}`);

    // 如果是测试模式，调用服务层生成大纲但不保存
    if (testMode) {
      // 调用 generateNextChapterOutline，传入 testMode=true 和 testComments
      const result = await outlineGenerationService.generateNextChapterOutline(bookId, targetRound, true, testComments);

      if (!result) {
        return NextResponse.json({
          code: 500,
          data: null,
          message: '测试模式：生成大纲失败',
        });
      }

      return NextResponse.json({
        code: 0,
        data: result,
        message: '测试模式：大纲生成完成（未写入数据库）',
      });
    }

    // 正常模式：调用 generateNextChapterOutline 生成下一章大纲
    await outlineGenerationService.generateNextChapterOutline(bookId, targetRound);

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
