/**
 * 赛季自动推进服务
 *
 * 功能：
 * - 定时检查当前赛季状态
 * - 根据配置的阶段时长自动推进
 * - 支持手动/自动两种模式
 *
 * 阶段顺序：
 * READING (阅读窗口期) -> OUTLINE (大纲生成期) -> WRITING (章节创作期) -> READING (下一轮)
 */

import { prisma } from '@/lib/prisma';
import { RoundPhase } from '@/types/season';
import { Season } from '@prisma/client';

// 阶段顺序
const PHASE_ORDER: RoundPhase[] = ['READING', 'OUTLINE', 'WRITING'];

// 检查间隔（毫秒）
const CHECK_INTERVAL = 5000; // 每 5 秒检查一次

/**
 * 获取当前阶段剩余时间（毫秒）
 */
function getPhaseRemainingTime(season: Season, currentPhase: RoundPhase): number {
  if (!season.roundStartTime) return 0;

  // 解析阶段时长配置
  let phaseDurationMs = 10 * 60 * 1000; // 默认 10 分钟
  try {
    const durations = JSON.parse(season.duration || '{"reading":10,"outline":5,"writing":5}');
    phaseDurationMs = (durations[currentPhase.toLowerCase()] || 10) * 60 * 1000;
  } catch {
    // 使用默认值
  }

  const phaseStartTime = new Date(season.roundStartTime).getTime();
  const now = Date.now();
  const elapsed = now - phaseStartTime;
  const remaining = phaseDurationMs - elapsed;

  return Math.max(0, remaining);
}

/**
 * 获取下一阶段
 */
function getNextPhase(currentPhase: RoundPhase): RoundPhase {
  if (currentPhase === 'NONE' || currentPhase === 'WRITING') {
    return 'READING';
  }
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex >= PHASE_ORDER.length - 1) {
    return 'READING';
  }
  return PHASE_ORDER[currentIndex + 1];
}

/**
 * 获取阶段显示名称
 */
function getPhaseDisplayName(phase: RoundPhase): string {
  const names: Record<RoundPhase, string> = {
    NONE: '未开始',
    READING: '阅读窗口期',
    OUTLINE: '大纲生成期',
    WRITING: '章节创作期',
  };
  return names[phase] || phase;
}

/**
 * 赛季自动推进服务类
 */
export class SeasonAutoAdvanceService {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * 启动自动推进服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SeasonAutoAdvance] 服务已在运行中');
      return;
    }

    console.log('[SeasonAutoAdvance] 启动自动推进服务...');
    this.isRunning = true;

    // 立即执行一次检查
    await this.checkAndAdvance();

    // 启动定时检查
    this.timer = setInterval(async () => {
      await this.checkAndAdvance();
    }, CHECK_INTERVAL);
  }

  /**
   * 停止自动推进服务
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[SeasonAutoAdvance] 服务已停止');
  }

  /**
   * 检查并推进赛季阶段
   */
  async checkAndAdvance(): Promise<void> {
    try {
      // 获取当前活跃赛季
      const season = await prisma.season.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startTime: 'desc' },
      });

      if (!season) {
        return;
      }

      // 检查是否需要结束赛季
      const now = new Date();
      if (now >= new Date(season.endTime)) {
        console.log('[SeasonAutoAdvance] 赛季已结束时间，自动结束赛季');
        await this.endSeason(season.id);
        return;
      }

      const currentPhase = (season.roundPhase as RoundPhase) || 'NONE';

      // 赛季未开始（报名期刚结束），进入第一轮
      if (currentPhase === 'NONE') {
        console.log('[SeasonAutoAdvance] 赛季未开始，进入第一轮 READING');
        await this.advancePhase(season.id, 1, 'READING');
        return;
      }

      // 计算剩余时间
      const remainingMs = getPhaseRemainingTime(season, currentPhase);
      // 如果剩余时间 > 5秒，还在当前阶段内，不推进
      if (remainingMs > 5000) {
        return;
      }

      // 计算下一轮
      let nextRound = season.currentRound || 1;
      if (currentPhase === 'WRITING') {
        nextRound = (season.currentRound || 0) + 1;
      }

      // 最大轮次 = 最大章节数（每轮创作一章）
      const maxRounds = season.maxChapters || 7;

      // 检查是否超过最大轮次
      if (nextRound > maxRounds) {
        console.log(`[SeasonAutoAdvance] 已达最大轮次（第 ${maxRounds} 轮），自动结束赛季`);
        await this.endSeason(season.id);
        return;
      }

      // 推进到下一阶段
      const nextPhase = getNextPhase(currentPhase);
      console.log(`[SeasonAutoAdvance] 阶段结束，推进到第 ${nextRound} 轮 - ${getPhaseDisplayName(nextPhase)}`);
      await this.advancePhase(season.id, nextRound, nextPhase);

    } catch (error) {
      console.error('[SeasonAutoAdvance] 检查失败:', error);
    }
  }

  /**
   * 推进阶段（内部调用）
   */
  private async advancePhase(seasonId: string, round: number, phase: RoundPhase): Promise<void> {
    try {
      const season = await prisma.season.findUnique({ where: { id: seasonId } });
      if (!season) return;

      // 更新赛季状态
      await prisma.season.update({
        where: { id: seasonId },
        data: {
          currentRound: round,
          roundPhase: phase,
          roundStartTime: new Date(),
        },
      });

      console.log(`[SeasonAutoAdvance] 已推进: 第 ${round} 轮 - ${getPhaseDisplayName(phase)}`);

      // 触发相应的任务
      await this.triggerPhaseTask(seasonId, round, phase);

    } catch (error) {
      console.error('[SeasonAutoAdvance] 推进失败:', error);
    }
  }

  /**
   * 触发阶段任务
   */
  private async triggerPhaseTask(seasonId: string, round: number, phase: RoundPhase): Promise<void> {
    // 导入服务（避免循环依赖）
    const { outlineGenerationService } = await import('./outline-generation.service');
    const { chapterWritingService } = await import('./chapter-writing.service');
    const { readerAgentService } = await import('./reader-agent.service');

    if (phase === 'OUTLINE') {
      console.log(`[SeasonAutoAdvance] 触发大纲生成任务 - 第 ${round} 轮`);

      // 第1轮生成整本书大纲，后续轮次生成下一章大纲
      if (round === 1) {
        await outlineGenerationService.generateOutlinesForSeason(seasonId);
      } else {
        const books = await prisma.book.findMany({
          where: { seasonId, status: 'ACTIVE' },
          select: { id: true },
        });
        await Promise.all(
          books.map((book) => outlineGenerationService.generateNextChapterOutline(book.id))
        );
      }
    } else if (phase === 'WRITING') {
      console.log(`[SeasonAutoAdvance] 触发章节创作任务 - 第 ${round} 轮`);

      // 检测落后书籍并追赶
      const behindBooks = await prisma.book.findMany({
        where: {
          seasonId,
          status: 'ACTIVE',
          chapterCount: { lt: round },
        },
        select: { id: true, title: true, chapterCount: true },
      });

      if (behindBooks.length > 0) {
        console.log(`[SeasonAutoAdvance] 发现 ${behindBooks.length} 本落后书籍，执行追赶`);
        await chapterWritingService.catchUpBooks(seasonId, round);
      } else {
        await chapterWritingService.writeChaptersForSeason(seasonId, round);
      }
    } else if (phase === 'READING') {
      console.log(`[SeasonAutoAdvance] 触发 Reader Agents 阅读任务 - 第 ${round} 轮`);

      // 获取最新章节
      const recentChapters = await prisma.chapter.findMany({
        where: {
          book: { seasonId },
          status: 'PUBLISHED',
        },
        select: { id: true, bookId: true, chapterNumber: true },
      });

      if (recentChapters.length === 0) {
        return;
      }

      const maxChapterNumber = Math.max(...recentChapters.map((c) => c.chapterNumber));
      const latestChapters = recentChapters.filter((c) => c.chapterNumber === maxChapterNumber);

      await Promise.all(
        latestChapters.map((chapter) =>
          readerAgentService.dispatchReaderAgents(chapter.id, chapter.bookId)
        )
      );
    }
  }

  /**
   * 结束赛季
   */
  private async endSeason(seasonId: string): Promise<void> {
    try {
      await prisma.season.update({
        where: { id: seasonId },
        data: {
          status: 'FINISHED',
          roundPhase: 'NONE',
          endTime: new Date(),
        },
      });
      console.log(`[SeasonAutoAdvance] 赛季已结束`);
    } catch (error) {
      console.error('[SeasonAutoAdvance] 结束赛季失败:', error);
    }
  }
}

// 单例实例
export const seasonAutoAdvanceService = new SeasonAutoAdvanceService();
