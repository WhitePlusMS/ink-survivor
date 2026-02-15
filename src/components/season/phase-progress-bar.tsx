'use client';

import { useEffect, useState } from 'react';
import { RoundPhase } from '@/types/season';

// 阶段中文名称映射
const PHASE_NAMES: Record<RoundPhase, string> = {
  NONE: '未开始',
  READING: '阅读窗口期',
  OUTLINE: '大纲生成期',
  WRITING: '章节创作期',
};

// 阶段顺序（用于计算上一阶段和下一阶段）
const PHASE_ORDER: RoundPhase[] = ['OUTLINE', 'WRITING', 'READING'];

/**
 * 获取指定阶段的上一阶段
 */
function getPreviousPhase(currentPhase: RoundPhase): RoundPhase | null {
  if (currentPhase === 'NONE') return null;
  const index = PHASE_ORDER.indexOf(currentPhase);
  if (index <= 0) return null;
  return PHASE_ORDER[index - 1];
}

/**
 * 获取指定阶段的下一阶段
 */
function getNextPhase(currentPhase: RoundPhase): RoundPhase | null {
  if (currentPhase === 'NONE') return 'OUTLINE';
  const index = PHASE_ORDER.indexOf(currentPhase);
  if (index === -1 || index >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[index + 1];
}

/**
 * 计算阶段剩余时间
 */
function calculateRemainingTime(
  roundStartTime: string | null,
  phaseDurations: { reading: number; outline: number; writing: number },
  currentPhase: RoundPhase
): string {
  if (!roundStartTime) return '--';

  const startTime = new Date(roundStartTime).getTime();
  const now = Date.now();
  const duration = phaseDurations[currentPhase.toLowerCase() as keyof typeof phaseDurations] || 5;
  const durationMs = duration * 60 * 1000; // 转换为毫秒
  const endTime = startTime + durationMs;
  const remaining = endTime - now;

  if (remaining <= 0) return '0:00';

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 阶段进度条Props
 */
interface PhaseProgressBarProps {
  currentRound: number;
  currentPhase: RoundPhase;
  roundStartTime: string | null;
  phaseDurations: {
    reading: number;
    outline: number;
    writing: number;
  };
  seasonStatus: string;
}

/**
 * 地铁线路风格的阶段进度条组件
 * 显示上一阶段、当前阶段、下一阶段
 * 使用客户端状态实现实时倒计时
 */
export function PhaseProgressBar({
  currentRound,
  currentPhase,
  roundStartTime,
  phaseDurations,
  seasonStatus,
}: PhaseProgressBarProps) {
  // 客户端状态：剩余时间（用于实时更新）
  const [remainingTime, setRemainingTime] = useState<string>('--');

  // 初始化和每秒更新倒计时
  useEffect(() => {
    // 初始计算
    setRemainingTime(calculateRemainingTime(roundStartTime, phaseDurations, currentPhase));

    // 每秒更新
    const interval = setInterval(() => {
      setRemainingTime(calculateRemainingTime(roundStartTime, phaseDurations, currentPhase));
    }, 1000);

    return () => clearInterval(interval);
  }, [roundStartTime, phaseDurations, currentPhase]);

  // 赛季未开始或已结束时显示特殊状态
  if (seasonStatus === 'PENDING') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-center py-4">
          <div className="text-gray-500 flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            <span>赛季即将开始，请耐心等待...</span>
          </div>
        </div>
      </div>
    );
  }

  if (seasonStatus === 'FINISHED' || seasonStatus === 'CANCELLED') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-center py-4">
          <div className="text-gray-500 flex items-center gap-2">
            <span>🏁 赛季已结束</span>
          </div>
        </div>
      </div>
    );
  }

  const prevPhase = getPreviousPhase(currentPhase);
  const nextPhase = getNextPhase(currentPhase);

  // 阶段项配置
  const phaseItems: { phase: RoundPhase | null; status: 'completed' | 'current' | 'pending' }[] = [
    { phase: prevPhase, status: prevPhase ? 'completed' : 'pending' },
    { phase: currentPhase, status: 'current' },
    { phase: nextPhase, status: nextPhase ? 'pending' : 'pending' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      {/* 轮次信息 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-gray-700">
          第 <span className="text-primary-600 font-bold">{currentRound}</span> 轮
        </div>
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-mono text-primary-600 font-bold">{remainingTime}</span>
        </div>
      </div>

      {/* 地铁线路风格进度条 */}
      <div className="relative">
        {/* 连接线背景 */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full" />

        {/* 进度线（从左到右动态计算） */}
        <div
          className="absolute top-5 left-0 h-1 bg-primary-500 rounded-full transition-all duration-500"
          style={{
            width:
              currentPhase === 'NONE'
                ? '0%'
                : currentPhase === 'OUTLINE'
                ? '50%'
                : currentPhase === 'WRITING'
                ? '50%'
                : '100%',
          }}
        />

        {/* 阶段节点 */}
        <div className="relative flex justify-between">
          {phaseItems.map((item, index) => {
            const phaseName = item.phase ? PHASE_NAMES[item.phase] : '';
            const isActive = item.status === 'current';
            const isCompleted = item.status === 'completed';

            return (
              <div key={index} className="flex flex-col items-center">
                {/* 节点圆圈 */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 z-10
                    ${
                      isActive
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-110'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : isActive ? (
                    <span className="text-xs">{index + 1}</span>
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>

                {/* 阶段名称 */}
                <div
                  className={`mt-2 text-xs font-medium text-center max-w-[80px] ${
                    isActive ? 'text-primary-600' : isCompleted ? 'text-gray-500' : 'text-gray-300'
                  }`}
                >
                  {phaseName || '---'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 当前阶段提示 */}
      {currentPhase !== 'NONE' && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            <span className="text-gray-600">
              当前阶段：<span className="font-medium text-gray-900">{PHASE_NAMES[currentPhase]}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// 时钟图标组件
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// 对勾图标组件
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
