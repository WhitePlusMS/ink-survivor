import { Clock, Users, Trophy, CalendarX } from 'lucide-react';

interface SeasonInfoProps {
  season?: {
    id: string;
    seasonNumber: number;
    themeKeyword: string;
    constraints: string[];
    zoneStyles: string[];
    signupDeadline: string | Date;
    maxChapters: number;
    minChapters: number;
    rewards: Record<string, unknown>;
    participantCount: number;
  };
}

/**
 * 赛季信息展示组件
 */
export function SeasonInfo({ season }: SeasonInfoProps) {
  if (!season) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <CalendarX className="w-8 h-8 mx-auto mb-3 text-surface-400" />
        <h3 className="font-medium text-lg mb-2 text-gray-900">暂无进行中的赛季</h3>
        <p className="text-surface-500 text-sm">请等待赛季开启后参赛</p>
      </div>
    );
  }

  // 计算报名截止时间
  const now = new Date();
  const deadline = new Date(season.signupDeadline);
  const timeLeft = Math.max(0, deadline.getTime() - now.getTime());
  const minutesLeft = Math.floor(timeLeft / (1000 * 60));

  // 提取奖励金额
  const firstReward = typeof season.rewards.first === 'number' ? season.rewards.first : 0;
  const secondReward = typeof season.rewards.second === 'number' ? season.rewards.second : 0;
  const thirdReward = typeof season.rewards.third === 'number' ? season.rewards.third : 0;

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">S{season.seasonNumber} 赛季</h3>
        <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded">
          <Clock className="w-4 h-4" />
          报名剩余 {minutesLeft} 分钟
        </div>
      </div>

      <p className="text-xl font-medium mb-2">{season.themeKeyword}</p>

      {/* 参赛规则 */}
      <div className="bg-white/10 rounded-lg p-3 text-sm mb-3">
        <p className="font-medium mb-1">参赛要求</p>
        <ul className="space-y-1 text-sm opacity-90">
          <li>章节数：{season.minChapters} - {season.maxChapters} 章</li>
          <li>分区：{season.zoneStyles.join(' / ')}</li>
        </ul>
      </div>

      {/* 约束 */}
      {season.constraints.length > 0 && (
        <div className="text-xs opacity-80 mb-3">
          <p>硬性限制：</p>
          <ul className="list-disc list-inside">
            {season.constraints.slice(0, 3).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 奖励 */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4" />
          <span>冠军 {firstReward} Ink</span>
        </div>
        {secondReward > 0 && (
          <div className="flex items-center gap-1">
            <span>亚军 {secondReward} Ink</span>
          </div>
        )}
        {thirdReward > 0 && (
          <div className="flex items-center gap-1">
            <span>季军 {thirdReward} Ink</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{season.participantCount} 人参赛</span>
        </div>
      </div>
    </div>
  );
}
