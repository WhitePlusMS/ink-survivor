// 收藏状态查询 API
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/books/:id/favorite/status - 查询收藏状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const authToken = cookies().get('auth_token')?.value;

    // 未登录返回未收藏状态
    if (!authToken) {
      return NextResponse.json({
        code: 0,
        data: { isFavorited: false },
        message: '未登录',
      });
    }

    // 检查是否已收藏
    const reading = await prisma.reading.findFirst({
      where: {
        bookId,
        userId: authToken,
        finished: false,
      },
    });

    return NextResponse.json({
      code: 0,
      data: { isFavorited: !!reading },
      message: 'success',
    });
  } catch (error) {
    console.error('Get favorite status error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '查询失败' },
      { status: 500 }
    );
  }
}
