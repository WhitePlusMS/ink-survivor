/**
 * 阅读窗口期 Reader Agent 调度任务
 * POST /api/tasks/reader-agents
 *
 * 在阅读窗口期调度 AI 读者阅读新发布的章节
 *
 * 调度策略：
 * - 只对排名前 10 的书籍进行 AI 评论
 * - 每个章节随机选择 3-4 个 Agent 进行评论
 * - 根据每个 Agent 的 ReaderConfig 生成个性化提示词
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readerAgentService } from '@/services/reader-agent.service';

export const dynamic = 'force-dynamic';

export async function POST() {
  const startTime = Date.now();
  let booksProcessed = 0;
  let chaptersProcessed = 0;
  const errors: string[] = [];

  try {
    console.log('[ReaderTask] 开始阅读窗口期 Reader Agent 调度...');

    // 1. 获取当前活跃赛季
    const season = await prisma.season.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!season) {
      return NextResponse.json({
        code: 0,
        data: { message: '没有活跃赛季，跳过调度' },
        message: '没有活跃赛季',
      });
    }

    // 2. 检查是否在阅读窗口期
    if (season.roundPhase !== 'READING') {
      console.log(`[ReaderTask] 当前阶段 ${season.roundPhase}，非阅读窗口期`);
      return NextResponse.json({
        code: 0,
        data: { message: `当前阶段 ${season.roundPhase}，非阅读窗口期` },
        message: '非阅读窗口期，跳过调度',
      });
    }

    // 3. 获取在阅读窗口期发布的章节
    const recentChapters = await prisma.chapter.findMany({
      where: {
        book: { seasonId: season.id },
        status: 'PUBLISHED',
        publishedAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000), // 最近 15 分钟内发布
        },
      },
      select: {
        id: true,
        bookId: true,
        chapterNumber: true,
      },
    });

    console.log(`[ReaderTask] 发现 ${recentChapters.length} 个新发布章节待处理`);

    // 4. 批量调度 Reader Agents
    for (const chapter of recentChapters) {
      try {
        // 获取章节数量用于计数
        const chapterData = await prisma.chapter.findUnique({
          where: { id: chapter.id },
          select: { id: true },
        });

        if (!chapterData) continue;

        await readerAgentService.dispatchReaderAgents(chapter.id, chapter.bookId);
        chaptersProcessed++;
        booksProcessed++;
      } catch (error) {
        const msg = `章节 ${chapter.chapterNumber} 处理失败: ${(error as Error).message}`;
        errors.push(msg);
        console.error(`[ReaderTask] ${msg}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ReaderTask] 完成 - 处理 ${chaptersProcessed} 章，耗时 ${duration}ms`);

    return NextResponse.json({
      code: 0,
      data: {
        seasonId: season.id,
        seasonNumber: season.seasonNumber,
        booksProcessed,
        chaptersProcessed,
        duration: `${duration}ms`,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `调度完成，处理 ${chaptersProcessed} 个章节`,
    });
  } catch (error) {
    console.error('[ReaderTask] 调度失败:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '调度失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tasks/reader-agents - 获取调度状态
 */
export async function GET() {
  try {
    // 获取活跃赛季
    const season = await prisma.season.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        seasonNumber: true,
        roundPhase: true,
        currentRound: true,
      },
    });

    // 获取今日 AI 评论统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAiComments = await prisma.comment.count({
      where: {
        isHuman: false,
        createdAt: { gte: today },
      },
    });

    // 获取今日活跃的 Reader Agents 数量
    const activeReaderAgents = await prisma.user.count({
      where: {
        readerConfig: { not: null },
      },
    });

    return NextResponse.json({
      code: 0,
      data: {
        season,
        todayAiComments,
        activeReaderAgents,
        config: {
          topBooksCount: 10,
          agentsPerChapter: 3,
        },
      },
      message: 'success',
    });
  } catch (error) {
    console.error('[ReaderTask] 获取状态失败:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取状态失败' },
      { status: 500 }
    );
  }
}
