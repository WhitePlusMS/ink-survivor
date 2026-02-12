/**
 * 获取当前赛季
 * GET /api/seasons/current
 */

import { NextResponse } from 'next/server';
import { seasonService } from '@/services/season.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const season = await seasonService.getCurrentSeason();

    if (!season) {
      return NextResponse.json({
        code: 0,
        data: null,
        message: '暂无进行中的赛季',
      });
    }

    console.log('[Season] Current season:', season.id);

    return NextResponse.json({
      code: 0,
      data: season,
      message: 'success',
    });
  } catch (error) {
    console.error('[Season] Get current season error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取当前赛季失败' },
      { status: 500 }
    );
  }
}
