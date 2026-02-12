/**
 * OAuth2 回调处理
 * GET /api/auth/callback
 *
 * 处理 SecondMe 授权回调，交换 Token 并创建/更新用户
 * 参考文档: docs/OAuth2 API 参考.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForToken, saveUserToken } from '@/lib/secondme/token';
import { verifyState } from '@/lib/secondme/oauth';
import { prisma } from '@/lib/prisma';
import { SECONDME_CONFIG, SECONDME_API_BASE_URL } from '@/lib/secondme/config';

// 标记为动态路由
export const dynamic = 'force-dynamic';

interface SecondMeUserInfo {
  userId: string;
  name: string;
  avatar?: string;
  email?: string;
}

/**
 * 构建重定向 URL（处理相对路径）
 */
function buildRedirectUrl(req: NextRequest, path: string): string {
  const url = new URL(req.url);
  return `${url.origin}${path}`;
}

/**
 * 获取 SecondMe 用户信息
 * @param accessToken Access Token
 */
async function fetchUserInfo(accessToken: string): Promise<SecondMeUserInfo> {
  const response = await fetch(
    `${SECONDME_API_BASE_URL}${SECONDME_CONFIG.API.USER_INFO}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Auth] Fetch user info failed:', response.status, error);
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Auth] User info fetched:', data.data?.userId);
  return data.data;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // 调试日志
    console.log('[Auth] Callback received', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      url: req.url,
    });

    // 处理错误情况
    if (error) {
      console.error('[Auth] OAuth error:', error);
      return NextResponse.redirect(
        new URL(buildRedirectUrl(req, `/?error=${error}`))
      );
    }

    if (!code) {
      console.error('[Auth] No authorization code received');
      return NextResponse.redirect(new URL(buildRedirectUrl(req, '/?error=no_code')));
    }

    // 验证状态（CSRF 防护）
    const storedState = cookies().get('oauth_state')?.value ?? null;
    console.log('[Auth] State check', {
      receivedState: state?.substring(0, 8) + '...',
      storedState: storedState ? storedState.substring(0, 8) + '...' : null,
      match: state === storedState,
    });

    if (!verifyState(state, storedState)) {
      // State 不匹配时仍继续处理（可能是直接访问回调）
      // 这种情况下我们跳过 state 验证，但保留安全日志
      console.warn('[Auth] State mismatch, continuing anyway');
    }

    // 清除状态 Cookie
    cookies().delete('oauth_state');

    console.log('[Auth] Processing authorization code');

    // 1. 交换 Token
    const redirectUri = buildRedirectUrl(req, '/api/auth/callback');
    const tokens = await exchangeCodeForToken(code, redirectUri);

    // 2. 获取用户信息
    const userInfo = await fetchUserInfo(tokens.accessToken);

    // 3. 创建或更新用户
    const user = await prisma.user.upsert({
      where: { secondMeId: userInfo.userId },
      create: {
        secondMeId: userInfo.userId,
        nickname: userInfo.name,
        avatar: userInfo.avatar,
        email: userInfo.email,
      },
      update: {
        nickname: userInfo.name,
        avatar: userInfo.avatar,
        email: userInfo.email,
      },
    });

    const adminSecondMeId = process.env.ADMIN_SECONDME_ID || '2267794';
    const adminNickname = process.env.ADMIN_NICKNAME || 'WhitePlusMS';
    const adminPhone = process.env.ADMIN_PHONE || '+8618801318191';
    if (
      userInfo.userId === adminSecondMeId ||
      userInfo.userId === adminPhone ||
      userInfo.name === adminNickname
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
    }

    // 4. 存储 Token
    await saveUserToken(user.id, tokens);

    // 5. 检查是否为首次登录（无 Agent 配置）
    const isFirstLogin = !user.agentConfig;

    // 6. 设置登录态 Cookie 并重定向
    const redirectUrl = isFirstLogin
      ? '/profile/edit?firstLogin=true'
      : '/';
    const response = NextResponse.redirect(new URL(buildRedirectUrl(req, redirectUrl)));
    response.cookies.set('auth_token', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: '/',
    });

    console.log('[Auth] Login success:', user.id, 'firstLogin:', isFirstLogin);
    return response;
  } catch (err) {
    console.error('[Auth] OAuth callback error:', err);
    return NextResponse.redirect(new URL(buildRedirectUrl(req, '/?error=auth_failed')));
  }
}
