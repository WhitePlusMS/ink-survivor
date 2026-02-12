/**
 * 退出登录
 * POST /api/auth/logout
 *
 * 清除用户登录状态
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const userId = cookies().get('auth_token')?.value;

    // 清除 auth_token Cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    console.log('[Auth] User logged out:', userId);
    return response;
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
  }
}
