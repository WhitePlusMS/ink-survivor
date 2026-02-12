/**
 * 获取用户的收藏列表
 * GET /api/user/favorites
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userService } from '@/services/user.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authToken = cookies().get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const favorites = await userService.getUserFavorites(authToken);

    console.log('[User] Favorites fetched for user:', authToken, 'count:', favorites.length);

    return NextResponse.json({
      data: favorites,
    });
  } catch (error) {
    console.error('[User] Get favorites error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
