/**
 * SecondMe OAuth2 认证工具
 * 参考文档: docs/OAuth2 API 参考.md
 */

import { SECONDME_OAUTH_AUTHORIZE_URL } from '@/lib/secondme/config';

// OAuth2 范围定义
export const OAUTH_SCOPES = [
  'user.info',          // 获取用户基本信息
  'user.info.shades',   // 获取用户兴趣标签
  'user.info.softmemory', // 获取用户软记忆
  'chat',              // 聊天功能
  'note.add',          // 添加笔记
] as const;

export type OAuthScope = typeof OAUTH_SCOPES[number];

/**
 * 构建授权 URL
 * @param state 用于防止 CSRF 攻击的随机字符串
 * @param scopes 请求的权限范围
 * @returns 授权页面 URL，重定向用户完成授权
 *
 * 授权成功后，用户被重定向到 redirect_uri，包含:
 * - code: 授权码（5分钟内有效）
 * - state: 原样返回的 state 参数
 */
export function buildAuthorizationUrl(
  state: string,
  scopes: OAuthScope[] = [...OAUTH_SCOPES]
): string {
  const params = new URLSearchParams({
    client_id: process.env.SECONDME_CLIENT_ID || '',
    redirect_uri: process.env.SECONDME_REDIRECT_URI || '',
    response_type: 'code',
    scope: scopes.join(','),
  });

  return `${SECONDME_OAUTH_AUTHORIZE_URL}?${params}`;
}

/**
 * 生成安全的随机状态字符串
 */
export function generateState(): string {
  // 使用 crypto.randomUUID() 生成安全的随机 UUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 降级方案：生成随机字符串
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证状态字符串（防止 CSRF）
 * @param receivedState 从回调 URL 接收的状态
 * @param storedState 存储在 Cookie 中的状态
 */
export function verifyState(receivedState: string | null, storedState: string | null): boolean {
  if (!receivedState || !storedState) {
    return false;
  }
  return receivedState === storedState;
}

/**
 * 生成授权码挑战码（用于 PKCE，如果需要）
 */
export async function generateCodeChallenge(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateState();
  // 注意：实际实现中需要对 verifier 进行 SHA256 哈希并 Base64url 编码
  // 这里简化处理，实际使用时请根据 SecondMe 文档实现
  return {
    verifier,
    challenge: verifier, // 简化版，实际应使用 hash
  };
}
