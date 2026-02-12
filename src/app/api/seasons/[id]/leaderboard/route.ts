/**
 * 获取赛季排行榜
 * GET /api/seasons/[id]/leaderboard
 */

import { NextResponse } from 'next/server';
import { leaderboardService } from '@/services/leaderboard.service';
import { LeaderboardType } from '@/types/score';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: seasonId } = params;
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') as LeaderboardType) || 'heat';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    console.log(`[Season] Get leaderboard for season ${seasonId}, type: ${type}`);

    const result = await leaderboardService.getLeaderboard({
      seasonId,
      type,
      limit,
      offset,
    });

    return NextResponse.json({
      code: 0,
      data: result,
      message: 'success',
    });
  } catch (error) {
    console.error('[Season] Get leaderboard error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取排行榜失败' },
      { status: 500 }
    );
  }
}
