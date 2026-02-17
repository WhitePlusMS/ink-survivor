// 打赏 API
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { interactionService } from '@/services/interaction.service';
import { prisma } from '@/lib/prisma';
import { GiftResponseDto } from '@/common/dto/comment.dto';

/**
 * 强制动态渲染
 * 此路由依赖 cookies，无法静态生成
 */
export const dynamic = 'force-dynamic';

/**
 * POST /api/books/:id/gift - 打赏
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const authToken = cookies().get('auth_token')?.value;

    // 未登录无法打赏
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

    const userId = authToken;

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { code: 400, data: null, message: '打赏金额必须大于 0' },
        { status: 400 }
      );
    }

    const result = await interactionService.gift(bookId, userId, amount);

    // 获取书籍最新的热度值
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { heatValue: true },
    });

    const responseData = GiftResponseDto.fromResult(result, book?.heatValue || 0);

    return NextResponse.json({
      code: 0,
      data: responseData,
      message: `打赏成功，赠送 ${amount} Ink`,
    });
  } catch (error) {
    console.error('Gift error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: error instanceof Error ? error.message : '打赏失败' },
      { status: 500 }
    );
  }
}
