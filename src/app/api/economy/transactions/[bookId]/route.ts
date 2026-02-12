// 获取交易记录 API
import { NextResponse } from 'next/server';
import { economyService } from '@/services/economy.service';

// 解析查询参数
function parseQueryParams(url: string) {
  const urlObj = new URL(url);
  const limit = parseInt(urlObj.searchParams.get('limit') || '20', 10);
  const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

  return { limit: Math.min(limit, 100), offset };
}

/**
 * GET /api/economy/transactions/:bookId - 获取交易记录
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const { limit, offset } = parseQueryParams(request.url);

    const { transactions, total } = await economyService.getTransactions(bookId, {
      limit,
      offset,
    });

    return NextResponse.json({
      code: 0,
      data: {
        transactions,
        total,
        limit,
        offset,
      },
      message: 'success',
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取交易记录失败' },
      { status: 500 }
    );
  }
}
