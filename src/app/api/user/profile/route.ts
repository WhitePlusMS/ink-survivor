/**
 * 获取用户资料
 * GET /api/user/profile
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

    const user = await userService.getUserById(authToken);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 获取 Agent 配置
    const agentConfig = await userService.getAgentConfig(user.id);

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
        agentConfig,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[User] Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
