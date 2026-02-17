/**
 * 赛季自动推进服务
 *
 * 功能：
 * - 定时检查当前赛季状态
 * - 根据配置的阶段时长自动推进
 * - 支持手动/自动两种模式
 *
 * 阶段顺序（简化版）：
 * AI_WORKING (任务驱动) -> HUMAN_READING (剩余时间) -> AI_WORKING (下一轮)
 *
 * 注意：AI 任务通过 TaskQueue 异步执行，不阻塞 API 响应
 * AI_WORKING 阶段由 ROUND_CYCLE 任务完成后自动切换，不依赖定时器
 */

import { prisma } from '@/lib/prisma';
import { RoundPhase } from '@/types/season';
import { Season } from '@prisma/client';
import { isExpired, getPhaseRemainingTime as getPhaseRemainingTimeBeijing, now, nowMs, getUtcTimeMs } from '@/lib/timezone';
import { taskQueueService } from './task-queue.service';
import { taskWorkerService } from './task-worker.service';

// 阶段顺序（简化版：AI_WORKING -> HUMAN_READING）
const PHASE_ORDER: RoundPhase[] = ['AI_WORKING', 'HUMAN_READING'];

// 检查间隔（毫秒）
const CHECK_INTERVAL = 60 * 1000; // 每 60 秒检查一次

function getPhaseDurationMs(season: Season, phase: RoundPhase): number {
  const roundDurationMs = (season.roundDuration || 20) * 60 * 1000;
  const minReadingTimeMs = 5 * 60 * 1000; // 最少人类阅读时间 5 分钟

  // AI_WORKING 阶段：最大时间 = roundDuration - 最少人类阅读时间
  if (phase === 'AI_WORKING') {
    return Math.max(roundDurationMs - minReadingTimeMs, 5 * 60 * 1000); // 最少 5 分钟
  }

  // HUMAN_READING 阶段：使用剩余时间 = roundDuration - AI实际耗时
  if (phase === 'HUMAN_READING') {
    const aiWorkStartTime = season.aiWorkStartTime;

    // aiWorkStartTime 记录的是 AI_WORKING 阶段的开始时间
    // roundStartTime 记录的是当前阶段的开始时间
    if (aiWorkStartTime && season.roundStartTime) {
      const aiWorkMs = new Date(season.roundStartTime).getTime() - new Date(aiWorkStartTime).getTime();
      const readingMs = roundDurationMs - aiWorkMs;
      return Math.max(readingMs, minReadingTimeMs); // 确保最少 5 分钟
    }

    // 如果没有记录 AI 工作时间，默认使用 roundDuration - 5分钟
    return roundDurationMs - minReadingTimeMs;
  }

  return roundDurationMs;
}

function getPhaseRemainingTime(season: Season, currentPhase: RoundPhase): number {
  if (!season.roundStartTime) return 0;
  const phaseDurationMs = getPhaseDurationMs(season, currentPhase);
  const phaseStartTime = new Date(season.roundStartTime);
  return getPhaseRemainingTimeBeijing(phaseStartTime, phaseDurationMs / 60 / 1000);
}

/**
 * 获取下一阶段
 */
function getNextPhase(currentPhase: RoundPhase): RoundPhase {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1) {
    return 'AI_WORKING';
  }
  if (currentIndex >= PHASE_ORDER.length - 1) {
    // HUMAN_READING 结束后回到 AI_WORKING（下一轮）
    return 'AI_WORKING';
  }
  return PHASE_ORDER[currentIndex + 1];
}

/**
 * 获取阶段显示名称
 */
function getPhaseDisplayName(phase: RoundPhase): string {
  const names: Record<RoundPhase, string> = {
    NONE: '等待开始',
    AI_WORKING: 'AI工作中',
    HUMAN_READING: '人类阅读期',
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

      // 检查是否需要结束赛季（使用北京时间）
      if (isExpired(season.endTime)) {
        console.log('[SeasonAutoAdvance] 赛季已结束时间（北京时区），自动结束赛季');
        await this.endSeason(season.id);
        return;
      }

      let currentPhase = (season.roundPhase as RoundPhase) || 'NONE';
      let currentRound = season.currentRound || 1;
      // phaseStartTime 保持 UTC，用于时间比较
      let phaseStartTime = season.roundStartTime || season.startTime || now();

      const transitions: Array<{ round: number; phase: RoundPhase; startTime: Date }> = [];

      if (currentPhase === 'NONE') {
        console.log('[SeasonAutoAdvance] 赛季未开始，进入第一轮 AI_WORKING');
        currentPhase = 'AI_WORKING';
        currentRound = 1;
        transitions.push({ round: currentRound, phase: currentPhase, startTime: phaseStartTime });
      }

      const maxRounds = season.maxChapters || 7;
      const maxTransitions = maxRounds * PHASE_ORDER.length + 2;
      let safety = 0;
      const nowUtcMs = nowMs(); // UTC 毫秒数

      while (safety < maxTransitions) {
        const durationMs = getPhaseDurationMs(season, currentPhase);
        // 使用 getUtcTimeMs 获取阶段的 UTC 毫秒数
        const phaseStartTimeMs = getUtcTimeMs(phaseStartTime);
        const phaseEndTimeMs = phaseStartTimeMs + durationMs;
        const timeLeft = phaseEndTimeMs - nowUtcMs;
        console.log(`[SeasonAutoAdvance] Loop: phase=${currentPhase}, round=${currentRound}, durationMs=${durationMs}, phaseStartTimeMs=${phaseStartTimeMs}, nowUtcMs=${nowUtcMs}, timeLeft=${timeLeft}`);

        if (timeLeft > 5000) {
          console.log('[SeasonAutoAdvance] Time left > 5s, breaking loop');
          break;
        }

        let nextRound = currentRound;
        if (currentPhase === 'HUMAN_READING') {
          // HUMAN_READING 阶段结束后，进入下一轮的 AI_WORKING
          nextRound = currentRound + 1;
        }

        // 关键修改：当 AI_WORKING 阶段结束后，如果已达最大轮次，则结束赛季
        // 而不是等到 HUMAN_READING 结束后才结束
        if (currentPhase === 'AI_WORKING' && nextRound > maxRounds) {
          console.log(`[SeasonAutoAdvance] 第 ${currentRound} 轮 AI工作已完成，已达最大轮次（第 ${maxRounds} 轮），自动结束赛季`);
          await this.endSeason(season.id);
          return;
        }

        // 如果是 HUMAN_READING 阶段结束后已达最大轮次，也结束
        if (nextRound > maxRounds) {
          console.log(`[SeasonAutoAdvance] 已达最大轮次（第 ${maxRounds} 轮），自动结束赛季`);
          await this.endSeason(season.id);
          return;
        }

        const nextPhase = getNextPhase(currentPhase);
        phaseStartTime = new Date(phaseEndTimeMs);
        currentPhase = nextPhase;
        currentRound = nextRound;
        transitions.push({ round: currentRound, phase: currentPhase, startTime: phaseStartTime });
        safety += 1;
      }

      if (transitions.length === 0) {
        const remainingMs = getPhaseRemainingTime(season, currentPhase);
        if (remainingMs > 5000) {
          return;
        }
      }

      for (const transition of transitions) {
        await this.advancePhase(season.id, transition.round, transition.phase, transition.startTime);
      }
    } catch (error) {
      console.error('[SeasonAutoAdvance] 检查失败:', error);
    }
  }

  /**
   * 推进阶段（内部调用）
   */
  private async advancePhase(
    seasonId: string,
    round: number,
    phase: RoundPhase,
    roundStartTime?: Date
  ): Promise<void> {
    try {
      const season = await prisma.season.findUnique({ where: { id: seasonId } });
      if (!season) return;

      // 更新赛季状态
      await prisma.season.update({
        where: { id: seasonId },
        data: {
          currentRound: round,
          roundPhase: phase,
          roundStartTime: roundStartTime || new Date(),
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
   *
   * 简化版：只有 AI_WORKING 和 HUMAN_READING 两个阶段
   * - AI_WORKING: 创建 ROUND_CYCLE 任务并立即执行，完成后自动调用 advanceToNextRound
   * - HUMAN_READING: 不需要触发任务，等待人类阅读
   */
  private async triggerPhaseTask(seasonId: string, round: number, phase: RoundPhase): Promise<void> {
    console.log(`[SeasonAutoAdvance] triggerPhaseTask: seasonId=${seasonId}, round=${round}, phase=${phase}`);

    if (phase === 'AI_WORKING') {
      console.log(`[SeasonAutoAdvance] 🎯 进入 AI_WORKING 阶段，创建 ROUND_CYCLE 任务 - 第 ${round} 轮`);

      // 进入 AI_WORKING 阶段时，记录开始时间
      const now = new Date();
      console.log(`[SeasonAutoAdvance] 📝 记录 aiWorkStartTime: ${now.toISOString()}`);
      await prisma.season.update({
        where: { id: seasonId },
        data: {
          aiWorkStartTime: now,
        },
      });

      // 创建任务到队列
      const task = await taskQueueService.create({
        taskType: 'ROUND_CYCLE',
        payload: { seasonId, round },
        priority: 10,
      });
      console.log(`[SeasonAutoAdvance] ✅ ROUND_CYCLE 任务已创建: ${task.id}`);

      // 立即执行刚创建的任务（不等待 Worker 轮询）
      await taskWorkerService.processTaskById(task.id);
    } else if (phase === 'HUMAN_READING') {
      console.log(`[SeasonAutoAdvance] 📖 进入 HUMAN_READING 阶段，不需要触发任务，等待人类阅读超时后自动推进`);
    } else {
      console.log(`[SeasonAutoAdvance] ⚠️ 未知阶段: ${phase}`);
    }
  }

  /**
   * 推进到下一阶段（AI_WORKING -> HUMAN_READING）
   * 由 ROUND_CYCLE 任务完成后调用
   */
  public async advanceToNextRound(seasonId: string, round: number): Promise<void> {
    console.log(`[SeasonAutoAdvance] advanceToNextRound called: seasonId=${seasonId}, round=${round}`);

    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    console.log(`[SeasonAutoAdvance] 当前赛季状态: phase=${season?.roundPhase}, currentRound=${season?.currentRound}`);

    if (!season || season.roundPhase !== 'AI_WORKING') {
      console.log(`[SeasonAutoAdvance] 跳过：当前阶段不是 AI_WORKING`);
      return;
    }

    // 计算阅读时长 = roundDuration - AI工作时长
    const roundDurationMs = (season.roundDuration || 20) * 60 * 1000;
    const aiWorkMs = season.aiWorkStartTime
      ? new Date().getTime() - new Date(season.aiWorkStartTime).getTime()
      : 0;
    const readingDurationMs = Math.max(roundDurationMs - aiWorkMs, 0);

    console.log(`[SeasonAutoAdvance] 时间计算: roundDuration=${roundDurationMs}ms, aiWorkMs=${aiWorkMs}ms, readingDurationMs=${readingDurationMs}ms`);

    // 更新阶段为 HUMAN_READING，设置阅读开始时间
    await prisma.season.update({
      where: { id: seasonId },
      data: {
        roundPhase: 'HUMAN_READING',
        roundStartTime: new Date(), // 阅读开始时间（即 AI 工作结束时间）
        // 注意：currentRound 在 HUMAN_READING 阶段结束后才增加
      },
    });

    console.log(`[SeasonAutoAdvance] ✅ 第 ${round} 轮 AI工作完成，已切换到 HUMAN_READING 阶段（阅读时长: ${readingDurationMs / 60000}分钟）`);
  }

  /**
   * 结束赛季
   */
  private async endSeason(seasonId: string): Promise<void> {
    try {
      // 1. 更新赛季状态
      await prisma.season.update({
        where: { id: seasonId },
        data: {
          status: 'FINISHED',
          roundPhase: 'NONE',
          endTime: new Date(),
        },
      });

      // 2. 将所有参赛书籍状态更新为 COMPLETED
      await prisma.book.updateMany({
        where: {
          seasonId,
          status: 'ACTIVE',
        },
        data: {
          status: 'COMPLETED',
        },
      });

      console.log(`[SeasonAutoAdvance] 赛季已结束，已将 ${await prisma.book.count({ where: { seasonId, status: 'COMPLETED' } })} 本书籍标记为完结`);
    } catch (error) {
      console.error('[SeasonAutoAdvance] 结束赛季失败:', error);
    }
  }
}

// 单例实例
export const seasonAutoAdvanceService = new SeasonAutoAdvanceService();

// 模式选择：
// - 开发模式：使用轮询（每5秒检查）
// - 生产模式（Vercel）：使用 Cron 触发，不启动轮询
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
const useCron = process.env.USE_CRON === 'true' || isProduction;

if (process.env.NODE_ENV === 'test' || process.env.SEASON_AUTO_ADVANCE_ENABLED === 'false') {
  // 明确禁用
  console.log('[SeasonAutoAdvance] 自动推进已禁用');
} else if (useCron) {
  // 生产模式：使用 Cron 触发，不启动轮询
  console.log('[SeasonAutoAdvance] 生产模式：使用 Cron 触发，不启动轮询');
} else {
  // 开发模式：使用轮询
  console.log(`[SeasonAutoAdvance] ${process.env.NODE_ENV} 模式：自动启动轮询服务`);
  setTimeout(() => {
    seasonAutoAdvanceService.start().catch((err) => {
      console.error('[SeasonAutoAdvance] 启动失败:', err);
    });
  }, 3000);
}
