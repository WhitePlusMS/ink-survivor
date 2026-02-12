/**
 * 刷新 Access Token
 * POST /api/auth/refresh
 *
 * 手动刷新用户的 Access Token
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getValidUserToken } from '@/lib/secondme/token';

// 标记为动态路由
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // 从 Cookie 获取用户 ID
    const authToken = cookies().get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 获取有效的 Token（如果即将过期会自动刷新）
    const token = await getValidUserToken(authToken);

    console.log('[Auth] Token refreshed for user:', authToken);

    return NextResponse.json({
      data: {
        accessToken: token.accessToken,
        expiresAt: token.expiresAt,
      },
    });
  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token', code: 'REFRESH_FAILED' },
      { status: 500 }
    );
  }
}
