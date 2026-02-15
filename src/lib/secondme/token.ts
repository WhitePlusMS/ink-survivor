/**
 * SecondMe Token 管理
 * 处理 Token 交换、存储、刷新和过期检测
 * 参考文档: docs/OAuth2 API 参考.md
 */

import { prisma } from '@/lib/prisma';
import { SECONDME_CONFIG, SECONDME_OAUTH_TOKEN, SECONDME_OAUTH_REFRESH } from './config';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string | string[];
}

/**
 * 交换授权码获取 Token
 * @param code 授权码
 *
 * 注意: 必须使用 application/x-www-form-urlencoded 格式
 * 响应格式: { code: 0, data: { accessToken, refreshToken, tokenType, expiresIn, scope } }
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri?: string
): Promise<TokenResponse> {
  const response = await fetch(SECONDME_OAUTH_TOKEN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri || process.env.SECONDME_REDIRECT_URI || '',
      client_id: process.env.SECONDME_CLIENT_ID || '',
      client_secret: process.env.SECONDME_CLIENT_SECRET || '',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Token] Exchange failed:', response.status, error);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Token] Exchange successful, expiresIn:', data.data?.expiresIn);

  return {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
    tokenType: data.data.tokenType,
    expiresIn: data.data.expiresIn,
    scope: data.data.scope,
  };
}

/**
 * 刷新 Access Token
 * @param refreshToken 刷新令牌
 * @param userId 用户 ID（用于更新数据库）
 *
 * 注意: 每次刷新都会生成新的 Refresh Token，旧的将失效（Token 轮换）
 */
export async function refreshAccessToken(
  refreshToken: string,
  userId: string
): Promise<TokenResponse> {
  const response = await fetch(SECONDME_OAUTH_REFRESH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.SECONDME_CLIENT_ID || '',
      client_secret: process.env.SECONDME_CLIENT_SECRET || '',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Token] Refresh failed:', response.status, error);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Token] Refresh successful for user:', userId);

  return {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
    tokenType: data.data.tokenType,
    expiresIn: data.data.expiresIn,
    scope: data.data.scope,
  };
}

/**
 * 存储用户 Token - 使用 User 表的合并字段
 * @param userId 用户 ID
 * @param tokens Token 响应
 */
export async function saveUserToken(userId: string, tokens: TokenResponse): Promise<void> {
  const scope = Array.isArray(tokens.scope)
    ? tokens.scope.join(',')
    : tokens.scope || '';

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      tokenRefreshExpiresAt: new Date(
        Date.now() + SECONDME_CONFIG.TOKEN.REFRESH_TOKEN_EXPIRY_SECONDS * 1000
      ),
      tokenScope: scope,
      tokenIsValid: true,
      tokenLastRefreshed: new Date(),
      tokenRefreshCount: { increment: 1 },
    },
  });

  console.log('[Token] Saved for user:', userId);
}

/**
 * 获取用户 Token（如果即将过期则自动刷新）
 * @param userId 用户 ID
 */
export async function getValidUserToken(userId: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
    },
  });

  if (!user || !user.accessToken) {
    throw new Error('User token not found');
  }

  // 检查 Token 是否即将过期
  const expiresIn = user.tokenExpiresAt!.getTime() - Date.now();
  const threshold = SECONDME_CONFIG.TOKEN.REFRESH_THRESHOLD_MINUTES * 60 * 1000;

  if (expiresIn < threshold) {
    console.log('[Token] Expiring soon, refreshing for user:', userId);
    const newTokens = await refreshAccessToken(user.refreshToken!, userId);
    await saveUserToken(userId, newTokens);

    return {
      accessToken: newTokens.accessToken,
      expiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
    };
  }

  return {
    accessToken: user.accessToken,
    expiresAt: user.tokenExpiresAt!,
  };
}

/**
 * 检查 Token 是否有效
 * @param userId 用户 ID
 */
export async function isTokenValid(userId: string): Promise<boolean> {
  try {
    const token = await getValidUserToken(userId);
    return token.expiresAt.getTime() > Date.now();
  } catch {
    return false;
  }
}

/**
 * 删除用户 Token（登出时使用）- 使用 User 表的合并字段
 * @param userId 用户 ID
 */
export async function deleteUserToken(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: null,
      refreshToken: null,
      tokenIsValid: false,
    },
  }).catch(() => {
    // 如果不存在，忽略错误
    console.log('[Token] Token delete skipped (not found) for user:', userId);
  });

  console.log('[Token] User token deleted for user:', userId);
}

/**
 * 获取 Token 剩余有效时间（秒）
 * @param userId 用户 ID
 */
export async function getTokenTTL(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenExpiresAt: true },
  });

  if (!user || !user.tokenExpiresAt) {
    return 0;
  }

  const remaining = user.tokenExpiresAt.getTime() - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
}
