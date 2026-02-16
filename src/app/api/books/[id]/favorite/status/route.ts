// 收藏状态查询 API
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/books/:id/favorite/status - 查询收藏状态
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id: bookId } = await params;
    const authToken = cookies().get('auth_token')?.value;

    // 未登录返回未收藏状态
    if (!authToken) {
      const duration = Date.now() - startTime;
      console.log(`✓ GET /api/books/${bookId}/favorite/status 200 in ${duration}ms (not logged in)`);
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

    const duration = Date.now() - startTime;
    console.log(`✓ GET /api/books/${bookId}/favorite/status 200 in ${duration}ms`);

    return NextResponse.json({
      code: 0,
      data: { isFavorited: !!reading },
      message: 'success',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`✗ GET /api/books/:id/favorite/status 500 in ${duration}ms - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json(
      { code: 500, data: null, message: '查询失败' },
      { status: 500 }
    );
  }
}
