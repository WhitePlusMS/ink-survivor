/**
 * OAuth2 登录入口
 * GET /api/auth/login
 *
 * 重定向用户到 SecondMe 授权页面
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizationUrl, generateState } from '@/lib/secondme/oauth';
import { cookies } from 'next/headers';

// 标记为动态路由
export const dynamic = 'force-dynamic';

/**
 * 构建重定向 URL（处理相对路径）
 */
function buildRedirectUrl(req: NextRequest, path: string): string {
  const url = new URL(req.url);
  return `${url.origin}${path}`;
}

export async function GET(req: NextRequest) {
  try {
    // 生成安全的随机状态字符串
    const state = generateState();

    // 存储状态到 Cookie 用于 CSRF 防护
    cookies().set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 分钟有效
      path: '/',
    });

    // 构建授权 URL 并重定向
    const authUrl = buildAuthorizationUrl(state);
    console.log('[Auth] Redirecting to:', authUrl.substring(0, 80) + '...');

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return NextResponse.redirect(new URL(buildRedirectUrl(req, '/?error=auth_init_failed')));
  }
}
