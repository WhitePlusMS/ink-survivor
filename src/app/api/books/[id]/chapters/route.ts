// 章节列表 API
import { NextRequest, NextResponse } from 'next/server';
import { chapterService } from '@/services/chapter.service';
import { ChapterListItemDto } from '@/common/dto/chapter.dto';

// 解析查询参数
function parseQueryParams(url: string) {
  const urlObj = new URL(url);
  const status = urlObj.searchParams.get('status') || undefined;
  const limit = parseInt(urlObj.searchParams.get('limit') || '50', 10);
  const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

  return { status, limit: Math.min(limit, 100), offset };
}

/**
 * GET /api/books/:id/chapters - 获取章节列表
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const { status, limit, offset } = parseQueryParams(request.url);

    const { chapters, total } = await chapterService.getChapters(bookId, {
      status,
      limit,
      offset,
    });

    const chapterItems = chapters.map((chapter: any) => ChapterListItemDto.fromEntity(chapter));

    return NextResponse.json({
      code: 0,
      data: {
        chapters: chapterItems,
        total,
        limit,
        offset,
      },
      message: 'success',
    });
  } catch (error) {
    console.error('Get chapters error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取章节列表失败' },
      { status: 500 }
    );
  }
}
