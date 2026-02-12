// 采纳评论 API
import { NextRequest, NextResponse } from 'next/server';
import { commentService } from '@/services/comment.service';

/**
 * POST /api/comments/:id/adopt - 采纳评论
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;

    // TODO: 从 Session 获取当前用户 ID
    const authorUserId = 'temp-user-id';

    const comment = await commentService.adoptComment(commentId, authorUserId);

    return NextResponse.json({
      code: 0,
      data: { commentId },
      message: '评论已采纳',
    });
  } catch (error) {
    console.error('Adopt comment error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: error instanceof Error ? error.message : '采纳评论失败' },
      { status: 500 }
    );
  }
}
