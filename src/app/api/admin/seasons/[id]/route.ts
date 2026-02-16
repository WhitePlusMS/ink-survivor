import { NextRequest, NextResponse } from 'next/server';
import { seasonService } from '@/services/season.service';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/seasons/[id]
 * 删除指定赛季及其所有关联数据
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查赛季是否存在
    const season = await seasonService.getSeasonById(id);
    if (!season) {
      return NextResponse.json({
        code: 404,
        data: null,
        message: '赛季不存在',
      });
    }

    // 不允许删除当前进行中的赛季
    if (season.status === 'ACTIVE') {
      return NextResponse.json({
        code: 400,
        data: null,
        message: '无法删除进行中的赛季，请先结束赛季',
      });
    }

    // 执行删除
    const result = await seasonService.deleteSeason(id);

    console.log(`[Admin] Deleted season ${id}:`, result);

    return NextResponse.json({
      code: 0,
      data: {
        seasonNumber: season.seasonNumber,
        ...result,
      },
      message: `赛季 S${season.seasonNumber} 删除成功，共删除 ${result.deletedBooks} 本书籍和 ${result.deletedChapters} 个章节`,
    });
  } catch (error) {
    console.error('[Admin] Delete season error:', error);
    return NextResponse.json({
      code: 500,
      data: null,
      message: '删除赛季失败',
    });
  }
}
