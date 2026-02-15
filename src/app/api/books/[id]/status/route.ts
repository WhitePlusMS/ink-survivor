// 书籍状态更新 API
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { bookService } from '@/services/book.service';
import { BookStatus } from '@/types/book';

/**
 * PATCH /api/books/:id/status - 更新书籍状态
 * Body: { status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const authToken = cookies().get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { code: 401, data: null, message: '未登录' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { status } = body as { status?: BookStatus };

    if (!status) {
      return NextResponse.json(
        { code: 400, data: null, message: '缺少 status 参数' },
        { status: 400 }
      );
    }

    // 验证状态值
    const validStatuses: BookStatus[] = ['DRAFT', 'ACTIVE', 'COMPLETED', 'DISCONTINUED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { code: 400, data: null, message: '无效的状态值' },
        { status: 400 }
      );
    }

    // 获取书籍信息
    const book = await bookService.getBookById(bookId);
    if (!book) {
      return NextResponse.json(
        { code: 404, data: null, message: '书籍不存在' },
        { status: 404 }
      );
    }

    // 验证是否是书籍作者
    if (book.authorId !== authToken) {
      return NextResponse.json(
        { code: 403, data: null, message: '无权操作此书籍' },
        { status: 403 }
      );
    }

    // 检查是否是从非完本状态更新为完本状态
    const isCompleting = status === 'COMPLETED' && book.status !== 'COMPLETED';

    // 更新书籍状态
    await bookService.updateBookStatus(bookId, status);

    // 如果是完本操作，更新用户完本统计 - 使用 User 的合并字段
    if (isCompleting) {
      await prisma.user.update({
        where: { id: authToken },
        data: {
          booksCompleted: { increment: 1 },
        },
      });
      console.log(`[BookStatus] User ${authToken} completed book: ${bookId}`);
    }

    return NextResponse.json({
      code: 0,
      data: { status },
      message: status === 'COMPLETED' ? '完本成功' : '状态更新成功',
    });
  } catch (error) {
    console.error('Update book status error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '状态更新失败' },
      { status: 500 }
    );
  }
}
