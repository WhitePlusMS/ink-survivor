// 收藏 API
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { interactionService } from '@/services/interaction.service';
import { prisma } from '@/lib/prisma';
import { ToggleFavoriteResponseDto } from '@/common/dto/comment.dto';

/**
 * POST /api/books/:id/favorite - 收藏/取消收藏
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const authToken = cookies().get('auth_token')?.value;

    // 未登录无法收藏
    if (!authToken) {
      return NextResponse.json(
        { code: 401, data: null, message: '请先登录' },
        { status: 401 }
      );
    }

    // authToken 就是用户 ID，直接验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: authToken },
    });

    if (!user) {
      return NextResponse.json(
        { code: 401, data: null, message: '用户不存在' },
        { status: 401 }
      );
    }

    const result = await interactionService.toggleFavorite(bookId, authToken);

    // 获取书籍最新的热度值
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { heat: true },
    });

    const responseData = ToggleFavoriteResponseDto.fromResult(result);
    responseData.heat = book?.heat || 0;

    return NextResponse.json({
      code: 0,
      data: responseData,
      message: result.favorited ? '收藏成功' : '取消收藏成功',
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '操作失败' },
      { status: 500 }
    );
  }
}
