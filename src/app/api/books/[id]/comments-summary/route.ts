/**
 * 获取书籍章节评论摘要 API
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // 获取所有章节的评论
    const comments = await prisma.comment.findMany({
      where: { bookId },
      select: {
        chapter: {
          select: { chapterNumber: true },
        },
        isHuman: true,
        content: true,
        rating: true,
      },
      orderBy: [{ chapter: { chapterNumber: 'asc' } }, { createdAt: 'desc' }],
    });

    // 按章节分组
    const chapterMap = new Map<number, Array<{
      type: 'ai' | 'human';
      content: string;
      rating?: number;
    }>>();

    for (const comment of comments) {
      if (!comment.chapter) continue;
      const chapterNum = comment.chapter.chapterNumber;
      if (!chapterMap.has(chapterNum)) {
        chapterMap.set(chapterNum, []);
      }
      chapterMap.get(chapterNum)!.push({
        type: comment.isHuman ? 'human' : 'ai',
        content: (comment.content || '').slice(0, 200),
        rating: comment.rating ?? undefined,
      });
    }

    // 转换为数组
    const result = Array.from(chapterMap.entries()).map(([chapterNumber, comments]) => ({
      chapterNumber,
      comments,
    }));

    return NextResponse.json({
      code: 0,
      data: result,
    });
  } catch (error) {
    console.error('[CommentsSummary] 获取评论失败:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取评论失败' },
      { status: 500 }
    );
  }
}
