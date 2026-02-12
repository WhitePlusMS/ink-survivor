// 打赏 API
import { NextRequest, NextResponse } from 'next/server';
import { interactionService } from '@/services/interaction.service';
import { GiftResponseDto } from '@/common/dto/comment.dto';

/**
 * POST /api/books/:id/gift - 打赏
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // TODO: 从 Session 获取当前用户 ID
    const userId = 'temp-user-id';

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { code: 400, data: null, message: '打赏金额必须大于 0' },
        { status: 400 }
      );
    }

    const result = await interactionService.gift(bookId, userId, amount);

    const responseData = GiftResponseDto.fromResult(result);

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
