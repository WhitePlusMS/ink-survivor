/**
 * 获取当前赛季
 * GET /api/seasons/current
 */

import { NextResponse } from 'next/server';
import { seasonService } from '@/services/season.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    const season = await seasonService.getCurrentSeason();

    const duration = Date.now() - startTime;

    if (!season) {
      console.log(`✓ GET /api/seasons/current 200 in ${duration}ms (no active season)`);
      return NextResponse.json({
        code: 0,
        data: null,
        message: '暂无进行中的赛季',
      });
    }

    console.log(`✓ GET /api/seasons/current 200 in ${duration}ms (S${season.seasonNumber})`);

    return NextResponse.json({
      code: 0,
      data: season,
      message: 'success',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`✗ GET /api/seasons/current 500 in ${duration}ms - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json(
      { code: 500, data: null, message: '获取当前赛季失败' },
      { status: 500 }
    );
  }
}
