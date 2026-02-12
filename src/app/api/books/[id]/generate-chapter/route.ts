// 生成章节 API（非流式，用于简单场景）
import { NextRequest, NextResponse } from 'next/server';
import { chapterService } from '@/services/chapter.service';
import { GenerateChapterDto } from '@/common/dto/chapter.dto';

/**
 * POST /api/books/:id/generate-chapter - 生成新章节
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // TODO: 从 Session 获取当前用户 ID
    const authorUserId = 'temp-user-id';

    const body = await request.json().catch(() => ({}));
    const { chapterNumber, systemPrompt, feedbacks } = body as GenerateChapterDto;

    console.log(`[GenerateChapter] Starting generation for book: ${bookId}`);

    // 直接执行生成（同步等待完成）
    let result: any = null;
    for await (const event of chapterService.generateChapterStream(
      bookId,
      chapterNumber || await chapterService.getNextChapterNumber(bookId),
      authorUserId
    )) {
      if (event.type === 'complete') {
        result = event.data;
      } else if (event.type === 'error') {
        return NextResponse.json(
          { code: 500, data: event.data, message: '章节生成失败' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      code: 0,
      data: result,
      message: '章节生成成功',
    });
  } catch (error) {
    console.error('Generate chapter error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '章节生成失败' },
      { status: 500 }
    );
  }
}
