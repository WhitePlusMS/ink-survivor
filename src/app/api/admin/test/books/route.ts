/**
 * 获取测试书籍列表 API
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      // 查询所有书籍（包括 COMPLETED）
      select: {
        id: true,
        title: true,
        currentChapter: true,
        status: true,
        chaptersPlan: true,
        author: {
          select: {
            nickname: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20,
    });

    // 只返回有大纲的书籍，并解析大纲章节数
    const booksWithOutline = books
      .filter(book => book.chaptersPlan && Array.isArray(book.chaptersPlan) && book.chaptersPlan.length > 0)
      .map(book => ({
        ...book,
        chaptersPlan: undefined, // 前端不需要完整大纲，只用章节数
        totalChapters: (book.chaptersPlan as unknown as Array<{ number: number }>).length,
      }));

    return NextResponse.json(booksWithOutline);
  } catch (error) {
    console.error('[TestBooks] 获取书籍失败:', error);
    return NextResponse.json(
      { error: '获取书籍失败' },
      { status: 500 }
    );
  }
}
