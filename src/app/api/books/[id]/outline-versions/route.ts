/**
 * 获取书籍大纲版本历史 API
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // 获取大纲版本历史
    const versions = await prisma.bookOutlineVersion.findMany({
      where: { bookId },
      orderBy: { version: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      code: 0,
      data: versions,
    });
  } catch (error) {
    console.error('[OutlineVersions] 获取版本失败:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取版本失败' },
      { status: 500 }
    );
  }
}
