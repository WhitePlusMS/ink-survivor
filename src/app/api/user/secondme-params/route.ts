/**
 * 获取当前登录用户的 SecondMe 参数
 * GET /api/admin/test/user-params
 *
 * 返回用户的基本信息、兴趣标签和软记忆
 */

import { NextResponse } from 'next/server';
import { getCurrentUserToken } from '@/lib/secondme/client';
import { SECONDME_CONFIG } from '@/lib/secondme/config';

/**
 * 强制动态渲染
 * 此路由依赖 cookies，无法静态生成
 */
export const dynamic = 'force-dynamic';

const API_BASE = SECONDME_CONFIG.BASE_URL;

export async function GET() {
  try {
    console.log('[UserParams] 获取当前用户 SecondMe 参数...');

    // 获取当前用户的 Access Token
    const token = await getCurrentUserToken();

    if (!token) {
      return NextResponse.json({
        code: 401,
        data: null,
        message: '未获取到用户 Token，请确保已登录',
      });
    }

    console.log('[UserParams] Token 获取成功');

    // 并发获取用户信息、兴趣标签和软记忆
    const [userInfoRes, shadesRes, softMemoryRes] = await Promise.all([
      // 用户基本信息
      fetch(`${API_BASE}${SECONDME_CONFIG.API.USER_INFO}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      // 兴趣标签
      fetch(`${API_BASE}${SECONDME_CONFIG.API.USER_SHADES}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      // 软记忆
      fetch(`${API_BASE}${SECONDME_CONFIG.API.USER_SOFTMEMORY}?pageNo=1&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    // 解析响应
    let userInfo = null;
    let shades: unknown[] = [];
    let softMemory: unknown[] = [];

    if (userInfoRes.ok) {
      const data = await userInfoRes.json();
      userInfo = data.data;
      console.log('[UserParams] 用户信息获取成功');
    } else {
      console.error('[UserParams] 用户信息获取失败:', userInfoRes.statusText);
    }

    if (shadesRes.ok) {
      const data = await shadesRes.json();
      shades = data.data?.shades || [];
      console.log('[UserParams] 兴趣标签获取成功:', shades.length);
    } else {
      console.error('[UserParams] 兴趣标签获取失败:', shadesRes.statusText);
    }

    if (softMemoryRes.ok) {
      const data = await softMemoryRes.json();
      softMemory = data.data?.list || [];
      console.log('[UserParams] 软记忆获取成功:', softMemory.length);
    } else {
      console.error('[UserParams] 软记忆获取失败:', softMemoryRes.statusText);
    }

    return NextResponse.json({
      code: 0,
      data: {
        userInfo,
        shades,
        softMemory,
      },
      message: '用户参数获取成功',
    });
  } catch (error) {
    console.error('[UserParams] 错误:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取用户参数失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
