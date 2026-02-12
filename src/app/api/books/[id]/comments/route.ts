// 评论列表 API
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { commentService } from '@/services/comment.service';
import { CommentResponseDto } from '@/common/dto/comment.dto';

// 解析查询参数
function parseQueryParams(url: string) {
  const urlObj = new URL(url);
  const chapterId = urlObj.searchParams.get('chapterId') || undefined;
  const isHuman = urlObj.searchParams.get('isHuman');
  const limit = parseInt(urlObj.searchParams.get('limit') || '50', 10);
  const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

  return {
    chapterId,
    isHuman: isHuman === 'true' ? true : isHuman === 'false' ? false : undefined,
    limit: Math.min(limit, 100),
    offset,
  };
}

/**
 * GET /api/books/:id/comments - 获取评论列表
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const { chapterId, isHuman, limit, offset } = parseQueryParams(request.url);

    const { comments, total } = await commentService.getComments(bookId, {
      chapterId,
      isHuman,
      limit,
      offset,
    });

    const commentItems = comments.map((comment) => CommentResponseDto.fromEntity(comment as unknown as Record<string, unknown>));

    return NextResponse.json({
      code: 0,
      data: {
        comments: commentItems,
        total,
        limit,
        offset,
      },
      message: 'success',
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取评论列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/books/:id/comments - 发表评论
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // 从 Cookie 获取当前登录用户
    const authToken = cookies().get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { code: 401, data: null, message: '请先登录' },
        { status: 401 }
      );
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: authToken },
      select: { id: true, nickname: true },
    });

    if (!user) {
      return NextResponse.json(
        { code: 404, data: null, message: '用户不存在' },
        { status: 404 }
      );
    }

    const userId = user.id;
    console.log(`[Comments] User ${user.nickname} (${userId}) posting comment`);

    const body = await request.json();
    const { chapterId, content, isHuman, aiRole } = body;

    if (!content) {
      return NextResponse.json(
        { code: 400, data: null, message: '评论内容不能为空' },
        { status: 400 }
      );
    }

    const comment = await commentService.createComment({
      bookId,
      chapterId,
      userId,
      content,
      isHuman: isHuman !== false,
      aiRole,
    });

    const responseData = CommentResponseDto.fromEntity(comment);

    return NextResponse.json({
      code: 0,
      data: responseData,
      message: '评论成功',
    }, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '评论失败' },
      { status: 500 }
    );
  }
}
