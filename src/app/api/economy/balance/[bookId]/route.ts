// 获取书籍 Ink 余额 API
import { NextResponse } from 'next/server';
import { economyService } from '@/services/economy.service';

/**
 * GET /api/economy/balance/:bookId - 获取书籍 Ink 余额
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

    const balance = await economyService.getBalance(bookId);
    const status = await economyService.getEconomyStatus(bookId);

    return NextResponse.json({
      code: 0,
      data: {
        ...balance,
        bankruptcyThreshold: status.bankruptcyThreshold,
        safeMargin: status.safeMargin,
        status: status.status,
      },
      message: 'success',
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取余额失败' },
      { status: 500 }
    );
  }
}
