// 指定章节 API
import { NextResponse } from 'next/server';
import { chapterService } from '@/services/chapter.service';
import { ChapterResponseDto } from '@/common/dto/chapter.dto';

/**
 * GET /api/books/:id/chapters/:num - 获取指定章节
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  try {
    const { id: bookId, num } = await params;
    const chapterNumber = parseInt(num, 10);

    if (isNaN(chapterNumber) || chapterNumber < 1) {
      return NextResponse.json(
        { code: 400, data: null, message: '无效的章节编号' },
        { status: 400 }
      );
    }

    const chapter = await chapterService.getChapter(bookId, chapterNumber);

    if (!chapter) {
      return NextResponse.json(
        { code: 404, data: null, message: '章节不存在' },
        { status: 404 }
      );
    }

    // 增加阅读量（异步执行，不阻塞响应）
    chapterService.incrementReadCount(chapter.id).catch((error) => {
      console.error('[Chapter API] Failed to increment read count:', error);
    });

    const responseData = ChapterResponseDto.fromEntity(chapter);

    return NextResponse.json({
      code: 0,
      data: responseData,
      message: 'success',
    });
  } catch (error) {
    console.error('Get chapter error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取章节失败' },
      { status: 500 }
    );
  }
}
