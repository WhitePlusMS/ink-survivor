// 获取书籍大纲 API
import { NextResponse } from 'next/server';
import { outlineService } from '@/services/outline.service';
import { OutlineResponseDto } from '@/common/dto/outline.dto';

/**
 * GET /api/books/:id/outline - 获取大纲
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // 检查书籍是否存在
    const outline = await outlineService.getOutline(bookId);
    if (!outline) {
      return NextResponse.json(
        { code: 404, data: null, message: '大纲不存在' },
        { status: 404 }
      );
    }

    const responseData = OutlineResponseDto.fromEntity(outline);

    return NextResponse.json({
      code: 0,
      data: responseData,
      message: 'success',
    });
  } catch (error) {
    console.error('Get outline error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取大纲失败' },
      { status: 500 }
    );
  }
}
