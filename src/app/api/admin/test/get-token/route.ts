/**
 * 获取测试用 SecondMe Token / 检查管理员状态
 * POST /api/admin/test/get-token - 获取 Token
 * GET /api/admin/test/get-token - 检查管理员状态
 *
 * 流程：
 * 1. 使用 Client Credentials 获取授权码（服务端方式）
 * 2. 用授权码换取 Access Token
 *
 * 注意：需要用户在 SecondMe 平台已登录
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPermission } from '@/lib/utils/admin';

const API_BASE = 'https://app.mindos.com/gate/lab';

// 从环境变量读取配置
const CLIENT_ID = process.env.SECONDME_CLIENT_ID || '7b5a45e5-8f15-41a4-ad9d-311c712cfd52';
const CLIENT_SECRET = process.env.SECONDME_CLIENT_SECRET || 'ad58661f078898ab25831cd02e268078f9f15fb14e571047379b89252baaba1a';
const REDIRECT_URI = process.env.SECONDME_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

export async function POST(request: NextRequest) {
  try {
    console.log('[GetToken] 正在获取 SecondMe Token...');

    // 方式1：尝试用已存在的 Token 获取授权码
    const existingToken = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (existingToken) {
      console.log('[GetToken] 使用现有 Token 获取授权码...');

      // 调用 /api/oauth/authorize/external 获取授权码
      const authResponse = await fetch(`${API_BASE}/api/oauth/authorize/external`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${existingToken}`,
        },
        body: JSON.stringify({
          clientId: CLIENT_ID,
          redirectUri: REDIRECT_URI,
          scope: ['user.info', 'chat'],
          state: 'test-' + Date.now(),
        }),
      });

      if (authResponse.ok) {
        const authResult = await authResponse.json();
        const code = authResult.data?.code;

        if (code) {
          // 用授权码换取 Token
          const tokenResponse = await fetch(`${API_BASE}/api/oauth/token/code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: REDIRECT_URI,
              client_id: CLIENT_ID,
              client_secret: CLIENT_SECRET,
            }),
          });

          if (tokenResponse.ok) {
            const tokenResult = await tokenResponse.json();
            console.log('[GetToken] Token 获取成功！');

            return NextResponse.json({
              code: 0,
              data: {
                accessToken: tokenResult.data.accessToken,
                expiresIn: tokenResult.data.expiresIn,
                scope: tokenResult.data.scope,
              },
              message: 'Token 获取成功',
            });
          }
        }
      }

      console.log('[GetToken] 现有 Token 获取失败，尝试其他方式...');
    }

    // 方式2：返回引导用户登录的信息
    console.log('[GetToken] 需要用户授权...');

    // 构建 OAuth 授权 URL
    const authUrl = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'user.info chat',
      state: 'test-' + Date.now(),
    });

    return NextResponse.json({
      code: 1,
      data: {
        authUrl: `https://go.second.me/oauth/?${authUrl.toString()}`,
        instructions: '请访问 authUrl 完成授权，然后重新调用此接口并在 Authorization header 中携带 Token',
      },
      message: '需要用户授权',
    });

  } catch (error) {
    console.error('[GetToken] 错误:', error);
    return NextResponse.json(
      { code: 500, message: '获取 Token 失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// GET: 检查管理员状态
export async function GET() {
  try {
    const { isAdmin, userId, nickname } = await checkAdminPermission();

    if (!isAdmin) {
      return NextResponse.json({
        code: 403,
        data: null,
        message: '非管理员用户',
      });
    }

    return NextResponse.json({
      code: 0,
      data: {
        userId,
        nickname,
      },
      message: '管理员验证通过',
    });
  } catch (error) {
    console.error('[GetToken] 获取管理员状态失败:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取管理员状态失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
