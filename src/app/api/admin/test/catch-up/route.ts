/**
 * 追赶模式 API
 * POST /api/admin/test/catch-up
 *
 * 触发追赶模式：为落后书籍补齐缺失章节
 *
 * 场景：赛季已进行到第 N 轮，但某些书籍只创作到第 M 章 (M < N)
 * 触发后：生成大纲 + 并发补齐第 M+1 到第 N 章
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chapterWritingService } from '@/services/chapter-writing.service';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/utils/admin';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证管理员权限
    const authResult = await requireAdmin();
    if (!authResult.success) {
      const response = authResult.message.includes('登录')
        ? createUnauthorizedResponse('请先登录管理员账号')
        : createForbiddenResponse();
      return NextResponse.json(response, { status: authResult.message.includes('登录') ? 401 : 403 });
    }

    const body = await request.json();
    const { targetRound } = body;

    // 1. 获取当前活跃赛季
    const season = await prisma.season.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
    });

    if (!season) {
      return NextResponse.json({
        code: 400,
        data: null,
        message: '没有正在进行的赛季',
      });
    }

    // 2. 确定目标轮次
    const currentRound = season.currentRound || 1;
    const round = targetRound || currentRound;

    console.log(`[CatchUp API] 收到追赶请求 - 当前轮次: ${currentRound}, 目标轮次: ${round}`);

    // 3. 统计需要追赶的书籍
    const behindBooks = await prisma.book.findMany({
      where: {
        seasonId: season.id,
        status: 'ACTIVE',
        chapterCount: { lt: round },
      },
      select: {
        id: true,
        title: true,
        chapterCount: true,
        author: { select: { nickname: true } },
      },
    });

    console.log(`[CatchUp API] 当前第 ${round} 轮，发现 ${behindBooks.length} 本需要追赶的书籍`);
    behindBooks.forEach(book => {
      console.log(`[CatchUp API] - "${book.title}" 当前 ${book.chapterCount} 章，需补 ${round - book.chapterCount} 章`);
    });

    if (behindBooks.length === 0) {
      return NextResponse.json({
        code: 0,
        data: {
          seasonId: season.id,
          seasonNumber: season.seasonNumber,
          currentRound,
          targetRound: round,
          bookCount: 0,
          message: '没有需要追赶的书籍',
        },
        message: '没有需要追赶的书籍',
      });
    }

    // 4. 异步触发追赶模式（不阻塞 API 响应）
    setTimeout(async () => {
      try {
        await chapterWritingService.catchUpBooks(season.id, round);
      } catch (error) {
        console.error('[CatchUp API] 追赶任务失败:', error);
      }
    }, 100);

    // 5. 返回响应
    return NextResponse.json({
      code: 0,
      data: {
        seasonId: season.id,
        seasonNumber: season.seasonNumber,
        currentRound,
        targetRound: round,
        bookCount: behindBooks.length,
        books: behindBooks.map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author.nickname,
          currentChapter: b.chapterCount,
          missingChapters: round - b.chapterCount,
        })),
        message: `正在为 ${behindBooks.length} 本书籍补齐到第 ${round} 章`,
      },
      message: `已触发追赶模式，正在为 ${behindBooks.length} 本书籍补齐到第 ${round} 章`,
    });
  } catch (error) {
    console.error('[CatchUp API] 错误:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '追赶请求失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// 获取追赶状态
export async function GET() {
  try {
    const season = await prisma.season.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
    });

    if (!season) {
      return NextResponse.json({
        code: 0,
        data: null,
        message: '没有正在进行的赛季',
      });
    }

    const currentRound = season.currentRound || 1;

    // 获取所有书籍及其章节数
    const books = await prisma.book.findMany({
      where: {
        seasonId: season.id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        title: true,
        chapterCount: true,
        author: { select: { nickname: true } },
      },
      orderBy: { chapterCount: 'asc' },
    });

    // 分类：正常进度 vs 落后
    const normalBooks = books.filter(b => b.chapterCount >= currentRound);
    const behindBooks = books.filter(b => b.chapterCount < currentRound);

    return NextResponse.json({
      code: 0,
      data: {
        seasonId: season.id,
        seasonNumber: season.seasonNumber,
        currentRound,
        totalBooks: books.length,
        normalBooks: normalBooks.length,
        behindBooks: behindBooks.length,
        // 落后书籍详情
        behindDetails: behindBooks.map(b => ({
          id: b.id,
          title: b.title,
          author: b.author.nickname,
          currentChapter: b.chapterCount,
          missingChapters: currentRound - b.chapterCount,
        })),
      },
      message: `当前第 ${currentRound} 轮，${behindBooks.length} 本书落后需追赶`,
    });
  } catch (error) {
    console.error('[CatchUp API] 获取状态错误:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取状态失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
