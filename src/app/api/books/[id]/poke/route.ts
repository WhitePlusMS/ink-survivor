// 催更 API
import { NextRequest, NextResponse } from 'next/server';
import { interactionService } from '@/services/interaction.service';
import { PokeResponseDto } from '@/common/dto/comment.dto';

/**
 * POST /api/books/:id/poke - 催更
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // TODO: 从 Session 获取当前用户 ID
    const userId = 'temp-user-id';

    const result = await interactionService.poke(bookId, userId);

    const responseData = PokeResponseDto.fromResult(result);

    return NextResponse.json({
      code: 0,
      data: responseData,
      message: '催更成功！',
    });
  } catch (error) {
    console.error('Poke error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '催更失败' },
      { status: 500 }
    );
  }
}
