/**
 * 赛季阶段推进 API
 * POST /api/admin/test/next-phase
 *
 * 手动推进赛季到下一阶段
 *
 * 阶段流程（简化版 - 两个阶段）：
 * - AI_WORKING (AI创作期): Agent 生成大纲和章节
 * - HUMAN_READING (人类阅读期): 读者阅读章节
 *
 * 推进逻辑：
 * NONE -> AI_WORKING -> HUMAN_READING -> AI_WORKING (下一轮) -> ...
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RoundPhase } from '@/types/season';
import { outlineGenerationService } from '@/services/outline-generation.service';
import { chapterWritingService } from '@/services/chapter-writing.service';
import { readerAgentService } from '@/services/reader-agent.service';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/utils/admin';

// 阶段顺序
const PHASE_ORDER: RoundPhase[] = ['AI_WORKING', 'HUMAN_READING'];

// 获取下一阶段
function getNextPhase(currentPhase: RoundPhase): RoundPhase {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1) return 'AI_WORKING'; // 默认开始AI创作期
  if (currentIndex >= PHASE_ORDER.length - 1) {
    return 'AI_WORKING'; // 下一轮开始
  }
  return PHASE_ORDER[currentIndex + 1];
}

// 获取阶段显示名称
function getPhaseDisplayName(phase: RoundPhase): string {
  const names: Record<RoundPhase, string> = {
    NONE: '未开始',
    AI_WORKING: 'AI创作期',
    HUMAN_READING: '人类阅读期',
  };
  return names[phase] || phase;
}

// 获取阶段说明（动态获取配置的时长）
function getPhaseDescription(phase: RoundPhase, roundDuration?: number): string {
  // 使用 roundDuration 计算各阶段时长
  const totalMinutes = roundDuration || 20;
  // AI_WORKING 阶段占总时长的 40%（包含大纲和创作），HUMAN_READING 占 60%
  const aiWorkingMinutes = Math.round(totalMinutes * 0.4);
  const humanReadingMinutes = Math.round(totalMinutes * 0.6);

  const descriptions: Record<RoundPhase, string> = {
    NONE: '赛季准备中',
    AI_WORKING: `Agent 生成大纲和章节（${aiWorkingMinutes}分钟）`,
    HUMAN_READING: `读者阅读章节（${humanReadingMinutes}分钟）`,
  };
  return descriptions[phase] || phase;
}

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
    const { action = 'NEXT_PHASE' } = body;

    console.log(`[NextPhase] 收到阶段推进请求: ${action}`);

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

    // 2. 解析当前状态
    const currentRound = season.currentRound || 1;  // 轮次从 1 开始
    const currentPhase = (season.roundPhase as RoundPhase) || 'NONE';
    const maxChapters = season.maxChapters || 7;

    console.log(`[NextPhase] 当前状态: 第 ${currentRound} 轮, 阶段=${currentPhase}`);

    // 3. 根据动作推进
    let nextPhase: RoundPhase;
    let nextRound = currentRound;

    if (action === 'END_SEASON') {
      // 结束赛季
      await prisma.season.update({
        where: { id: season.id },
        data: {
          status: 'FINISHED',
          roundPhase: 'NONE',
          endTime: new Date(),
        },
      });

      return NextResponse.json({
        code: 0,
        data: {
          seasonId: season.id,
          seasonNumber: season.seasonNumber,
          action: 'SEASON_ENDED',
          message: '赛季已结束',
        },
        message: '赛季已结束',
      });
    }

    // 计算下一阶段和轮次
    if (currentPhase === 'NONE') {
      nextPhase = 'AI_WORKING';
    } else if (currentPhase === 'HUMAN_READING') {
      nextPhase = 'AI_WORKING';
      nextRound = currentRound + 1;
    } else {
      nextPhase = getNextPhase(currentPhase);
    }

    // 最大轮次 = 最大章节数（每轮创作一章）
    const maxRounds = maxChapters;

    // 4. 检查是否超过最大轮次
    if (nextRound > maxRounds) {
      // 自动结束赛季
      console.log(`[NextPhase] 已达最大轮次（第 ${maxRounds} 轮），自动结束赛季`);

      await prisma.season.update({
        where: { id: season.id },
        data: {
          status: 'FINISHED',
          roundPhase: 'NONE',
          endTime: new Date(),
        },
      });

      return NextResponse.json({
        code: 0,
        data: {
          seasonId: season.id,
          seasonNumber: season.seasonNumber,
          action: 'SEASON_ENDED',
          message: `第 ${maxRounds} 轮结束，赛季已自动结束`,
        },
        message: `第 ${maxRounds} 轮结束，赛季已自动结束`,
      });
    }

    // 5. 更新赛季状态
    await prisma.season.update({
      where: { id: season.id },
      data: {
        currentRound: nextRound,
        roundPhase: nextPhase,
        roundStartTime: new Date(),
      },
    });

    // 6. 根据阶段触发相应任务
    let taskResult: { type: string; message: string } | null = null;

    if (nextPhase === 'AI_WORKING') {
      // AI_WORKING 阶段：生成大纲和章节
      // 第1轮次生成整本书大纲，后续轮次生成下一章大纲和章节
      console.log(`[NextPhase] 触发AI创作任务 - 第 ${nextRound} 轮`);
      setTimeout(async () => {
        try {
          if (nextRound === 1) {
            // 第1轮：生成整本书的5章大纲
            await outlineGenerationService.generateOutlinesForSeason(season.id);
          } else {
            // 后续轮次：为每本书并发生成下一章大纲
            const books = await prisma.book.findMany({
              where: { seasonId: season.id, status: 'ACTIVE' },
              select: { id: true },
            });
            await Promise.all(
              books.map((book) =>
                outlineGenerationService.generateNextChapterOutline(book.id, nextRound)
              )
            );
          }
        } catch (error) {
          console.error('[NextPhase] 大纲生成任务失败:', error);
        }
      }, 100);
      taskResult = {
        type: 'OUTLINE_GENERATION',
        message: nextRound === 1
          ? '正在为所有书籍生成整本书大纲'
          : `正在为所有书籍生成第 ${nextRound} 章大纲`,
      };
    // 注意：由于阶段简化为 AI_WORKING 和 HUMAN_READING 两个阶段，
    // 大纲生成和章节创作都在 AI_WORKING 阶段完成
    // 此分支已合并到上面的 AI_WORKING 处理中
      // 逻辑：先检测落后书籍并追赶，再创作当前轮次章节，最后验证并重试失败章节
      console.log(`[NextPhase] 触发章节创作任务 - 第 ${nextRound} 轮`);
      setTimeout(async () => {
        try {
          // 1. 检测是否有落后书籍
          const allBooks1 = await prisma.book.findMany({
            where: {
              seasonId: season.id,
              status: 'ACTIVE',
            },
            include: {
              _count: { select: { chapters: true } },
            },
          });

          // 筛选 chapterCount < nextRound 的书籍
          const behindBooks = allBooks1.filter(book => book._count.chapters < nextRound);

          if (behindBooks.length > 0) {
            console.log(`[NextPhase] 发现 ${behindBooks.length} 本落后书籍，先执行追赶`);
            behindBooks.forEach(b => {
              console.log(`[NextPhase] - "${b.title}" 当前 ${b._count.chapters} 章，需补 ${nextRound - b._count.chapters} 章`);
            });

            // 执行追赶：为所有落后书籍补齐到当前轮次
            await chapterWritingService.catchUpBooks(season.id, nextRound);
            console.log(`[NextPhase] 追赶完成`);
          } else {
            // 没有落后书籍，正常创建第 nextRound 章
            console.log(`[NextPhase] 没有落后书籍，创建第 ${nextRound} 章`);
            await chapterWritingService.writeChaptersForSeason(season.id, nextRound);
          }

          // 2. 验证：检查是否所有书籍都达到了当前轮次
          console.log(`[NextPhase] 验证章节完成情况...`);
          const allBooks2 = await prisma.book.findMany({
            where: {
              seasonId: season.id,
              status: 'ACTIVE',
            },
            include: {
              _count: { select: { chapters: true } },
            },
          });

          // 筛选 chapterCount < nextRound 的书籍
          const finalCheck = allBooks2.filter(book => book._count.chapters < nextRound);

          if (finalCheck.length > 0) {
            console.log(`[NextPhase] 发现 ${finalCheck.length} 本书籍章节数未达标，进行重试`);
            finalCheck.forEach(b => {
              console.log(`[NextPhase] - "${b.title}" 当前 ${b._count.chapters} 章，需补到 ${nextRound} 章`);
            });
            // 重试：重新执行追赶
            await chapterWritingService.catchUpBooks(season.id, nextRound);
            console.log(`[NextPhase] 重试完成`);

            // 再次验证
            const allBooks3 = await prisma.book.findMany({
              where: {
                seasonId: season.id,
                status: 'ACTIVE',
              },
              include: {
                _count: { select: { chapters: true } },
              },
            });
            const reCheck = allBooks3.filter(book => book._count.chapters < nextRound).length;
            if (reCheck > 0) {
              console.warn(`[NextPhase] 警告：仍有 ${reCheck} 本书籍未完成，可能需要人工检查`);
            }
          } else {
            console.log(`[NextPhase] 验证通过：所有书籍都已达到第 ${nextRound} 章`);
          }
        } catch (error) {
          console.error('[NextPhase] 章节创作任务失败:', error);
        }
      }, 100);
      taskResult = {
        type: 'CHAPTER_WRITING',
        message: `正在为所有书籍创作第 ${nextRound} 章正文`,
      };
    } else if (nextPhase === 'HUMAN_READING') {
      // HUMAN_READING 阶段：触发 Reader Agents 阅读最新创作的章节
      // 读取当前已创作的最大章节号
      console.log(`[NextPhase] 触发 Reader Agents 阅读任务 - 第 ${nextRound} 轮`);
      setTimeout(async () => {
        try {
          // 获取当前赛季所有已发布章节
          const recentChapters = await prisma.chapter.findMany({
            where: {
              book: { seasonId: season.id },
              status: 'PUBLISHED',
            },
            select: {
              id: true,
              bookId: true,
              chapterNumber: true,
            },
          });

          if (recentChapters.length === 0) {
            console.log(`[NextPhase] 没有已发布的章节`);
            return;
          }

          // 找出所有书中已创作的最大章节号
          const maxChapterNumber = Math.max(...recentChapters.map(c => c.chapterNumber));
          console.log(`[NextPhase] 当前最大章节号: ${maxChapterNumber}`);

          // 筛选出最大章节号的章节（即最新创作的章节）
          const latestChapters = recentChapters.filter(
            (c) => c.chapterNumber === maxChapterNumber
          );

          console.log(`[NextPhase] 发现 ${latestChapters.length} 个第 ${maxChapterNumber} 章待阅读`);

          // 并发调度所有章节的 Reader Agents
          await Promise.all(
            latestChapters.map((chapter) =>
              readerAgentService.dispatchReaderAgents(chapter.id, chapter.bookId)
            )
          );
        } catch (error) {
          console.error('[NextPhase] Reader Agents 任务失败:', error);
        }
      }, 100);
      taskResult = {
        type: 'READER_ACTIONS',
        message: `正在调度 Reader Agents 阅读最新章节`,
      };
    }

    // 7. 获取参与书籍
    const books = await prisma.book.findMany({
      where: { seasonId: season.id },
      include: {
        author: { select: { nickname: true } },
        _count: { select: { chapters: true } },
      },
    });

    console.log(`[NextPhase] 推进到: 第 ${nextRound} 轮 - ${getPhaseDisplayName(nextPhase)}`);

    return NextResponse.json({
      code: 0,
      data: {
        seasonId: season.id,
        seasonNumber: season.seasonNumber,
        currentRound: nextRound,
        currentPhase: nextPhase,
        phaseDisplayName: getPhaseDisplayName(nextPhase),
        phaseDescription: getPhaseDescription(nextPhase, season.roundDuration),
        action: 'PHASE_ADVANCED',
        bookCount: books.length,
        task: taskResult,
        books: books.map(b => ({
          id: b.id,
          title: b.title,
          author: b.author.nickname,
          currentChapter: b._count.chapters,
        })),
      },
      message: `已推进到第 ${nextRound} 轮 - ${getPhaseDisplayName(nextPhase)}${taskResult ? '，' + taskResult.message : ''}`,
    });
  } catch (error) {
    console.error('[NextPhase] 错误:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '阶段推进失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// 获取当前阶段状态
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

    const currentPhase = (season.roundPhase as RoundPhase) || 'NONE';

    return NextResponse.json({
      code: 0,
      data: {
        seasonId: season.id,
        seasonNumber: season.seasonNumber,
        themeKeyword: season.themeKeyword,
        currentRound: season.currentRound ?? 1,  // 轮次从 1 开始
        currentPhase,
        phaseDisplayName: getPhaseDisplayName(currentPhase),
        phaseDescription: getPhaseDescription(currentPhase, season.roundDuration),
        startTime: season.startTime,
        endTime: season.endTime,
        signupDeadline: season.signupDeadline,
        maxChapters: season.maxChapters,
        phaseDurations: { roundDuration: season.roundDuration ?? 20 },
      },
      message: '获取成功',
    });
  } catch (error) {
    console.error('[NextPhase] 获取状态错误:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '获取状态失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
