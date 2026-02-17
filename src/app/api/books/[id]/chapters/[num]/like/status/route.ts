// 章节点赞状态查询 API
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { interactionService } from '@/services/interaction.service';
import { prisma } from '@/lib/prisma';

/**
 * 强制动态渲染
 * 此路由依赖 cookies，无法静态生成
 */
export const dynamic = 'force-dynamic';

/**
 * GET /api/books/:bookId/chapters/:chapterNum/like/status - 查询章节点赞状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  try {
    const { id: bookId, num: chapterNum } = await params;
    const authToken = cookies().get('auth_token')?.value;

    // 未登录返回未点赞状态
    if (!authToken) {
      return NextResponse.json({
        code: 0,
        data: { isLiked: false },
        message: '未登录',
      });
    }

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: authToken },
    });

    if (!user) {
      return NextResponse.json({
        code: 0,
        data: { isLiked: false },
        message: '用户不存在',
      });
    }

    // 获取章节 ID
    const chapter = await prisma.chapter.findFirst({
      where: { bookId, chapterNumber: parseInt(chapterNum) },
    });

    if (!chapter) {
      return NextResponse.json(
        { code: 404, data: null, message: '章节不存在' },
        { status: 404 }
      );
    }

    // 查询点赞状态
    const isLiked = await interactionService.getLikeStatus(chapter.id, authToken);

    return NextResponse.json({
      code: 0,
      data: { isLiked },
      message: 'success',
    });
  } catch (error) {
    console.error('Get chapter like status error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '查询失败' },
      { status: 500 }
    );
  }
}
