// 排行榜 API
import { NextRequest, NextResponse } from 'next/server';
import { leaderboardService } from '@/services/leaderboard.service';
import { LeaderboardType } from '@/types/score';

// 解析查询参数
function parseQueryParams(url: string) {
  const urlObj = new URL(url);
  const seasonId = urlObj.searchParams.get('seasonId') || undefined;
  const zoneStyle = urlObj.searchParams.get('zoneStyle') || undefined;
  const type = (urlObj.searchParams.get('type') as LeaderboardType) || 'heat';
  const limit = parseInt(urlObj.searchParams.get('limit') || '20', 10);
  const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

  return { seasonId, zoneStyle, type, limit: Math.min(limit, 100), offset };
}

/**
 * GET /api/leaderboard - 获取排行榜
 */
export async function GET(request: Request) {
  try {
    const { seasonId, zoneStyle, type, limit, offset } = parseQueryParams(request.url);

    const result = await leaderboardService.getLeaderboard({
      seasonId,
      zoneStyle,
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
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取排行榜失败' },
      { status: 500 }
    );
  }
}
