// 章节点赞 API
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { interactionService } from '@/services/interaction.service';
import { prisma } from '@/lib/prisma';
import { ToggleLikeResponseDto } from '@/common/dto/comment.dto';

/**
 * POST /api/books/:bookId/chapters/:chapterNum/like - 章节点赞/取消点赞
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  try {
    const { id: bookId, num: chapterNum } = await params;
    const authToken = cookies().get('auth_token')?.value;

    // 未登录无法点赞
    if (!authToken) {
      return NextResponse.json(
        { code: 401, data: null, message: '请先登录' },
        { status: 401 }
      );
    }

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: authToken },
    });

    if (!user) {
      return NextResponse.json(
        { code: 401, data: null, message: '用户不存在' },
        { status: 401 }
      );
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

    const result = await interactionService.toggleLike(chapter.id, authToken);

    // 获取书籍最新的热度值
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { heat: true },
    });

    const responseData = ToggleLikeResponseDto.fromResult(result);
    responseData.heat = book?.heat || 0;

    return NextResponse.json({
      code: 0,
      data: responseData,
      message: result.liked ? '点赞成功' : '取消点赞成功',
    });
  } catch (error) {
    console.error('Toggle chapter like error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '操作失败' },
      { status: 500 }
    );
  }
}
