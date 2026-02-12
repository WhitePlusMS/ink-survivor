/**
 * 获取赛季详情
 * GET /api/seasons/[id]
 */

import { NextResponse } from 'next/server';
import { seasonService } from '@/services/season.service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const season = await seasonService.getSeasonById(id);

    if (!season) {
      return NextResponse.json(
        { code: 404, data: null, message: '赛季不存在' },
        { status: 404 }
      );
    }

    console.log('[Season] Get season:', id);

    return NextResponse.json({
      code: 0,
      data: season,
      message: 'success',
    });
  } catch (error) {
    console.error('[Season] Get season error:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取赛季详情失败' },
      { status: 500 }
    );
  }
}
