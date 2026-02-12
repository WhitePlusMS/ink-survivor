// 书籍详情 API
import { NextResponse } from 'next/server';
import { bookService } from '@/services/book.service';
import { BookResponseDto } from '@/common/dto/book.dto';

/**
 * GET /api/books/:id - 获取书籍详情
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const book = await bookService.getBookById(id);

    if (!book) {
      return NextResponse.json(
        { code: 404, data: null, message: '书籍不存在' },
        { status: 404 }
      );
    }

    const responseData = BookResponseDto.fromEntity(book);

    return NextResponse.json({
      code: 0,
      data: responseData,
      message: 'success',
    });
  } catch (error) {
    console.error('Get book detail error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取书籍详情失败' },
      { status: 500 }
    );
  }
}
