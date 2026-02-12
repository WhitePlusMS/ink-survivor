'use client';

import { useState, useEffect, useRef } from 'react';
import { Flame, Clock, Users, ChevronDown, ChevronUp, CalendarX, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Season {
  id: string;
  seasonNumber: number;
  themeKeyword: string;
  endTime: string | Date;
  participantCount: number;
  // 阶段状态
  currentRound?: number;
  currentPhase?: string; // READING, OUTLINE, WRITING
  roundStartTime?: string | Date | null; // 阶段开始时间
  phaseDurations?: {
    reading: number;
    outline: number;
    writing: number;
  };
  // 赛季详情
  constraints?: string[]; // 硬性约束
  zoneStyles?: string[]; // 可选分区
  maxChapters?: number; // 最大章节数
}

// 阶段配置
const PHASE_CONFIG: Record<string, { name: string; durationMin: number }> = {
  READING: { name: '阅读窗口期', durationMin: 10 },
  OUTLINE: { name: '大纲生成期', durationMin: 5 },
  WRITING: { name: '章节创作期', durationMin: 5 },
};

// 分区标签映射
const ZONE_LABELS: Record<string, string> = {
  urban: '都市',
  fantasy: '玄幻',
  scifi: '科幻',
  history: '历史',
  game: '游戏',
};

// 已结束赛季简要信息
interface FinishedSeasonBrief {
  id: string;
  seasonNumber: number;
  themeKeyword: string;
  endTime: string | Date;
}

interface SeasonBannerProps {
  season?: Season;
  latestFinishedSeason?: FinishedSeasonBrief;
  previousSeason?: FinishedSeasonBrief | null; // 上一赛季（用于折叠面板显示）
}

/**
 * 赛季倒计时 Banner 组件
 * 设计原则：模仿番茄小说赛季 Banner，突出主题和倒计时
 */
export function SeasonBanner({ season, latestFinishedSeason, previousSeason }: SeasonBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [phaseTimeLeft, setPhaseTimeLeft] = useState<string>('');
  const [showPrevInfo, setShowPrevInfo] = useState(false);
  const router = useRouter();
  const lastRefreshKeyRef = useRef<string>('');
  const endTime = season?.endTime;
  const seasonId = season?.id;
  const currentRound = season?.currentRound;
  const currentPhase = season?.currentPhase;
  const roundStartTime = season?.roundStartTime;
  const phaseDurations = season?.phaseDurations;

  // 计算赛季总时间倒计时
  useEffect(() => {
    if (!endTime) return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('已结束');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  // 计算阶段倒计时
  useEffect(() => {
    if (!currentPhase || currentPhase === 'NONE' || !roundStartTime) {
      setPhaseTimeLeft('');
      return;
    }

    const phase = currentPhase;
    const phaseConfig = PHASE_CONFIG[phase];
    if (!phaseConfig) {
      setPhaseTimeLeft('');
      return;
    }

    // 从配置或默认值获取阶段时长
    const durationMin = phaseDurations?.[phase.toLowerCase() as keyof typeof phaseDurations]
      || phaseConfig.durationMin;

    const updatePhaseTimeLeft = () => {
      const now = new Date().getTime();
      const start = new Date(roundStartTime).getTime();
      const phaseDurationMs = durationMin * 60 * 1000;
      const end = start + phaseDurationMs;
      const diff = end - now;

      if (diff <= 0) {
        setPhaseTimeLeft('已结束');
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setPhaseTimeLeft(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updatePhaseTimeLeft();
    const timer = setInterval(updatePhaseTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [currentPhase, roundStartTime, phaseDurations]);

  useEffect(() => {
    if (!currentPhase || currentPhase === 'NONE' || !roundStartTime) {
      return;
    }

    const phase = currentPhase;
    const phaseConfig = PHASE_CONFIG[phase];
    if (!phaseConfig) {
      return;
    }

    const durationMin = phaseDurations?.[phase.toLowerCase() as keyof typeof phaseDurations]
      || phaseConfig.durationMin;

    const start = new Date(roundStartTime).getTime();
    const end = start + durationMin * 60 * 1000;
    const now = Date.now();
    const diff = end - now;
    const refreshKey = `${seasonId}:${currentRound}:${currentPhase}:${roundStartTime}`;

    if (lastRefreshKeyRef.current === refreshKey) {
      return;
    }

    if (diff <= 0) {
      lastRefreshKeyRef.current = refreshKey;
      router.refresh();
      return;
    }

    const timer = setTimeout(() => {
      lastRefreshKeyRef.current = refreshKey;
      router.refresh();
    }, diff + 1000);

    return () => clearTimeout(timer);
  }, [seasonId, currentRound, currentPhase, roundStartTime, phaseDurations, router]);

  // 没有进行中的赛季，显示最新结束赛季信息
  if (!season && latestFinishedSeason) {
    return (
      <div className="bg-gradient-to-r from-surface-600 to-surface-700 text-white p-4 rounded-lg mb-4">
        <div className="flex items-center justify-center gap-2">
          <Flame className="w-5 h-5" />
          <span className="font-medium">
            S{latestFinishedSeason.seasonNumber} 赛季「{latestFinishedSeason.themeKeyword}」已结束！
          </span>
        </div>
      </div>
    );
  }

  // 没有进行中的赛季且无历史赛季
  if (!season) {
    return (
      <div className="bg-gradient-to-r from-surface-400 to-surface-500 text-white p-4 rounded-lg mb-4">
        <div className="flex items-center justify-center gap-2">
          <CalendarX className="w-5 h-5" />
          <span className="font-medium">暂无进行中的赛季</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 赛季主 Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5" />
            <span className="font-bold text-lg">
              S{season.seasonNumber} 赛季：{season.themeKeyword}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm bg-white/20 px-2 py-1 rounded-full">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-medium">{timeLeft}</span>
          </div>
        </div>

        {/* 阶段状态和倒计时 */}
        {season.currentPhase && season.currentPhase !== 'NONE' && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-sm opacity-90">
              <Timer className="w-4 h-4" />
              <span>
                第 {season.currentRound} 轮 - {PHASE_CONFIG[season.currentPhase]?.name || season.currentPhase}
              </span>
            </div>
            {phaseTimeLeft && (
              <div className="flex items-center gap-1 text-sm bg-amber-500/80 px-2 py-0.5 rounded-full">
                <span className="font-mono font-medium">剩余 {phaseTimeLeft}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm opacity-90">
            <Users className="w-4 h-4" />
            <span>已参赛书籍：{season.participantCount} 本</span>
          </div>
          {/* 有上一赛季时显示折叠按钮 */}
          {previousSeason && (
            <button
              onClick={() => setShowPrevInfo(!showPrevInfo)}
              className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 transition-opacity"
            >
              <span>S{previousSeason.seasonNumber} 赛季说明</span>
              {showPrevInfo ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 上一赛季折叠说明面板 */}
      {previousSeason && showPrevInfo && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4 transition-all">
          <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
            S{previousSeason.seasonNumber} 赛季：{previousSeason.themeKeyword}（已结束）
          </h4>
          <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
            <p>
              <strong>参与情况：</strong>
              上赛季精彩作品已归档至书架
            </p>
            {/* 当前赛季详情 */}
            {season && (
              <p>
                <strong>S{season.seasonNumber} 赛季「{season.themeKeyword}」：</strong>
                <br />
                约束：{season.constraints?.join('；') || '无'}
                <br />
                分区：{season.zoneStyles?.map(z => ZONE_LABELS[z] || z).join('、') || '全部'}
                <br />
                目标：创作 {season.maxChapters} 章完本
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
