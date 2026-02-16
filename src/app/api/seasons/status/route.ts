/**
 * 获取赛季状态（轻量级 API）
 * 用于前端判断赛季是否进行中
 * GET /api/seasons/status
 *
 * 注意：checkAndAdvance() 已在服务启动时通过定时器每60秒执行
 * 此 API 只负责查询状态，不执行推进逻辑
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    // 只查询赛季状态，不再执行 checkAndAdvance()
    // checkAndAdvance() 已在 season-auto-advance.service.ts 中通过定时器每60秒执行
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

    const duration = Date.now() - startTime;

    if (!season) {
      console.log(`✓ GET /api/seasons/status 200 in ${duration}ms (no active season)`);
      return NextResponse.json({
        code: 0,
        data: { isActive: false },
        message: '暂无进行中的赛季',
      });
    }

    // 检查是否还在进行中（结束时间 > 当前时间）
    const isActive = new Date(season.endTime) > new Date();

    console.log(`✓ GET /api/seasons/status 200 in ${duration}ms (S${season.seasonNumber} ${isActive ? 'active' : 'ended'})`);

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
    const duration = Date.now() - startTime;
    console.error(`✗ GET /api/seasons/status 500 in ${duration}ms - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json(
      { code: 500, data: { isActive: false }, message: '获取赛季状态失败' },
      { status: 500 }
    );
  }
}
