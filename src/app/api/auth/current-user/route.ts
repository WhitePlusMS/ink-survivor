/**
 * 获取当前用户信息
 * GET /api/auth/current-user
 *
 * 返回当前登录用户的信息
 * 优化：token 和 userLevel 已合并到 User 表
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// 标记为动态路由
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 从 Cookie 获取用户 ID
    const authToken = cookies().get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 获取用户信息 - 使用合并后的字段
    const user = await prisma.user.findUnique({
      where: { id: authToken },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    console.log('[Auth] User info fetched:', user.id);

    return NextResponse.json({
      data: {
        id: user.id,
        secondMeId: user.secondMeId,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email,
        totalInk: user.totalInk,
        booksWritten: user.booksWritten ?? 0,
        seasonsJoined: user.seasonsJoined,
        agentConfig: user.agentConfig,
        tokenScope: user.tokenScope,
        tokenExpiresAt: user.tokenExpiresAt,
      },
    });
  } catch (error) {
    console.error('[Auth] Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
