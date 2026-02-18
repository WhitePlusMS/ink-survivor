/**
 * 单本书章节补全 API
 * POST /api/books/[id]/catch-up
 *
 * 检查书籍是否需要补全章节，并根据最新大纲补全缺失章节
 * 用户手动点击按钮触发，不走任务队列
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chapterWritingService } from '@/services/chapter-writing.service';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // 1. 获取当前登录用户
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({
        code: 401,
        data: null,
        message: '请先登录',
      });
    }

    // 2. 获取书籍信息
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: { select: { chapterNumber: true } },
        season: { select: { currentRound: true } },
      },
    });

    if (!book) {
      return NextResponse.json({
        code: 404,
        data: null,
        message: '书籍不存在',
      });
    }

    // 3. 验证是否是书籍的作者（Agent主人）
    if (book.authorId !== authToken) {
      return NextResponse.json({
        code: 403,
        data: null,
        message: '只有作者才能补全章节',
      });
    }

    // 4. 获取当前赛季轮次
    const season = await prisma.season.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
    });

    const targetRound = season?.currentRound || 1;

    // 5. 检查大纲是否存在 - chaptersPlan 是 Book 表的直接字段
    if (!book.chaptersPlan) {
      return NextResponse.json({
        code: 400,
        data: {
          hasOutline: false,
          missingChapters: [],
          message: '该书还没有大纲，无法补全章节',
        },
        message: '该书还没有大纲',
      });
    }

    // 6. 解析大纲中的章节数
    const chaptersPlan = book.chaptersPlan as unknown as Array<{ number: number }>;
    const outlineChapters = new Set(chaptersPlan.map(c => c.number));
    const maxOutlineChapter = Math.max(...Array.from(outlineChapters), 0);

    // 7. 获取当前已有的章节编号
    const existingChapters = new Set(book.chapters.map((c: { chapterNumber: number }) => c.chapterNumber));

    // 8. 计算缺失章节（基于大纲）
    const missingFromOutline: number[] = [];
    for (let i = 1; i <= maxOutlineChapter; i++) {
      if (!existingChapters.has(i)) {
        missingFromOutline.push(i);
      }
    }

    // 9. 计算落后于赛季的章节
    const missingFromSeason: number[] = [];
    for (let i = 1; i <= targetRound; i++) {
      if (!existingChapters.has(i)) {
        missingFromSeason.push(i);
      }
    }

    // 合并缺失章节（去重）
    const allMissingSet = new Set([...missingFromOutline, ...missingFromSeason]);
    const allMissingChapters = Array.from(allMissingSet).sort((a: number, b: number) => a - b);

    // 10. 如果没有缺失章节，直接返回
    if (allMissingChapters.length === 0) {
      return NextResponse.json({
        code: 0,
        data: {
          hasOutline: true,
          outlineChapters: Array.from(outlineChapters).sort((a: number, b: number) => a - b),
          existingChapters: Array.from(existingChapters).sort((a: number, b: number) => a - b),
          missingChapters: [],
          targetRound,
          maxOutlineChapter,
          needsCatchUp: false,
          message: '章节已完整，无需补全',
        },
        message: '章节已完整，无需补全',
      });
    }

    console.log(`[CatchUp] 书籍《${book.title}》缺失章节: ${allMissingChapters.join(', ')}`);

    // 11. 异步执行补全（不阻塞响应）
    // 用户手动触发的独立任务，不记录状态
    setTimeout(async () => {
      try {
        await chapterWritingService.catchUpSingleBook(bookId, targetRound);
      } catch (error) {
        console.error(`[CatchUp] 书籍《${book.title}》补全失败:`, error);
      }
    }, 100);

    // 12. 返回结果
    return NextResponse.json({
      code: 0,
      data: {
        hasOutline: true,
        outlineChapters: Array.from(outlineChapters).sort((a: number, b: number) => a - b),
        existingChapters: Array.from(existingChapters).sort((a: number, b: number) => a - b),
        missingChapters: allMissingChapters,
        targetRound,
        maxOutlineChapter,
        needsCatchUp: allMissingChapters.length > 0,
        message: `正在补全 ${allMissingChapters.length} 个缺失章节`,
      },
      message: `正在补全 ${allMissingChapters.length} 个缺失章节`,
    });
  } catch (error) {
    console.error('[CatchUp API] 错误:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '补全请求失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/books/[id]/catch-up
 *
 * 获取书籍章节补全状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    // 1. 获取书籍信息
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: { select: { chapterNumber: true }, orderBy: { chapterNumber: 'asc' } },
        season: { select: { currentRound: true } },
      },
    });

    if (!book) {
      return NextResponse.json({
        code: 404,
        data: null,
        message: '书籍不存在',
      });
    }

    // 2. 获取当前赛季轮次
    const season = await prisma.season.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
    });

    const targetRound = season?.currentRound || 1;

    // 3. 解析大纲 - chaptersPlan 是 Book 表的直接字段
    let outlineChapters: number[] = [];
    if (book.chaptersPlan) {
      const chaptersPlan = book.chaptersPlan as unknown as Array<{ number: number }>;
      outlineChapters = chaptersPlan.map((c: { number: number }) => c.number);
    }

    const existingChapters = book.chapters.map((c: { chapterNumber: number }) => c.chapterNumber);

    // 4. 计算缺失章节
    const missingChapters: number[] = [];
    const maxChapter = Math.max(targetRound, ...outlineChapters, 0);
    for (let i = 1; i <= maxChapter; i++) {
      if (!existingChapters.includes(i)) {
        missingChapters.push(i);
      }
    }

    return NextResponse.json({
      code: 0,
      data: {
        hasOutline: !!book.chaptersPlan,
        outlineChapters,
        existingChapters,
        missingChapters,
        targetRound,
        maxOutlineChapter: Math.max(...outlineChapters, 0),
        needsCatchUp: missingChapters.length > 0,
      },
      message: missingChapters.length > 0
        ? `缺少 ${missingChapters.length} 个章节`
        : '章节已完整',
    });
  } catch (error) {
    console.error('[CatchUp API] GET 错误:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取状态失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
