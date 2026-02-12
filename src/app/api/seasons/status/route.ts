/**
 * 获取赛季状态（轻量级 API）
 * 用于前端判断赛季是否进行中
 * GET /api/seasons/status
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const season = await prisma.season.findFirst({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        seasonNumber: true,
        themeKeyword: true,
        endTime: true,
        participantCount: true,
      },
      orderBy: { startTime: 'desc' },
    });

    if (!season) {
      return NextResponse.json({
        code: 0,
        data: { isActive: false },
        message: '暂无进行中的赛季',
      });
    }

    // 检查是否还在进行中（结束时间 > 当前时间）
    const isActive = new Date(season.endTime) > new Date();

    return NextResponse.json({
      code: 0,
      data: {
        isActive,
        seasonNumber: season.seasonNumber,
        themeKeyword: season.themeKeyword,
        participantCount: season.participantCount,
      },
      message: isActive ? '赛季进行中' : '赛季已结束',
    });
  } catch (error) {
    console.error('[SeasonStatus] Get season status error:', error);
    return NextResponse.json(
      { code: 500, data: { isActive: false }, message: '获取赛季状态失败' },
      { status: 500 }
    );
  }
}
