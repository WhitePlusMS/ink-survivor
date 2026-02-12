// 书籍列表和创建 API
import { NextRequest, NextResponse } from 'next/server';
import { bookService } from '@/services/book.service';
import { BookListItemDto, BookResponseDto } from '@/common/dto/book.dto';
import { normalizeZoneStyle } from '@/lib/utils/zone';
import { BookStatus } from '@/types/book';

// 解析查询参数
function parseQueryParams(url: string) {
  const urlObj = new URL(url);
  const zoneStyle = urlObj.searchParams.get('zoneStyle') || undefined;
  const status = urlObj.searchParams.get('status') || undefined;
  const keyword = urlObj.searchParams.get('keyword') || undefined;
  const limit = parseInt(urlObj.searchParams.get('limit') || '20', 10);
  const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

  return { zoneStyle, status, keyword, limit: Math.min(limit, 100), offset };
}

/**
 * GET /api/books - 获取书籍列表
 * 支持参数:
 * - zoneStyle: 分区筛选
 * - status: 状态筛选
 * - keyword: 搜索关键词
 * - limit: 每页数量
 * - offset: 偏移量
 */
export async function GET(request: Request) {
  try {
    const { zoneStyle, status, keyword, limit, offset } = parseQueryParams(request.url);

    console.log('[Books] GET /api/books - params:', { zoneStyle, status, keyword, limit, offset });

    // 如果有搜索关键词，使用搜索功能
    if (keyword) {
      const books = await bookService.searchBooks(keyword);
      const bookItems = books.map((book) => BookListItemDto.fromEntity(book as unknown as Record<string, unknown>));
      return NextResponse.json({
        code: 0,
        data: bookItems,
        message: 'success',
      });
    }

    const { books, total } = await bookService.getBooks({
      zoneStyle,
      status: status as BookStatus | undefined,
      limit,
      offset,
    });

    // 标准化返回数据中的 zoneStyle
    const normalizedBooks = books.map((book) => ({
      ...book,
      zoneStyle: normalizeZoneStyle(book.zoneStyle),
    }));

    const bookItems = normalizedBooks.map((book) => BookListItemDto.fromEntity(book as unknown as Record<string, unknown>));

    console.log('[Books] Returned', bookItems.length, 'books, total:', total);

    return NextResponse.json({
      code: 0,
      data: {
        books: bookItems,
        total,
        limit,
        offset,
      },
      message: 'success',
    });
  } catch (error) {
    console.error('Get books error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取书籍列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/books - 创建新书
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: 从 Session 获取当前用户 ID
    const userId = 'temp-user-id';

    const body = await request.json();
    const { title, shortDesc, zoneStyle, seasonId } = body;

    if (!title || !zoneStyle) {
      return NextResponse.json(
        { code: 400, data: null, message: '标题和分区风格不能为空' },
        { status: 400 }
      );
    }

    const book = await bookService.createBook({
      title,
      shortDesc,
      zoneStyle,
      authorId: userId,
      seasonId,
    });

    const responseData = BookResponseDto.fromEntity(book);

    return NextResponse.json({
      code: 0,
      data: responseData,
      message: '创建成功',
    }, { status: 201 });
  } catch (error) {
    console.error('Create book error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '创建书籍失败' },
      { status: 500 }
    );
  }
}
