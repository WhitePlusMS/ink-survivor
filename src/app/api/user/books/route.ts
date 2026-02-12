/**
 * 获取用户的书籍列表
 * GET /api/user/books
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userService } from '@/services/user.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authToken = cookies().get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : undefined;

    const result = await userService.getUserBooks(authToken, { status, limit, offset });

    console.log('[User] Books fetched for user:', authToken, 'count:', result.total);

    return NextResponse.json({
      data: {
        books: result.books,
        total: result.total,
        limit: limit || 20,
        offset: offset || 0,
      },
    });
  } catch (error) {
    console.error('[User] Get books error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
