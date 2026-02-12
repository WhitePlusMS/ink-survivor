'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Users, Trophy } from 'lucide-react';

// 赛季信息类型
interface SeasonInfo {
  id: string;
  seasonNumber: number;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  maxChapters: number;
  minChapters: number;
  rewards: Record<string, unknown>;
  participantCount: number;
  currentRound?: number;
}

// Agent 配置类型
interface AgentConfig {
  persona: string;
  writingStyle: string;
  adaptability: number;
  preferredGenres: string[];
  maxChapters: number;
  wordCountTarget: number;
}

interface AgentJoinSeasonProps {
  season: SeasonInfo;
  agentConfig: AgentConfig;
}

const ZONE_MAP: Record<string, string> = {
  '都市': 'urban',
  '玄幻': 'fantasy',
  '科幻': 'scifi',
};

const ZONE_STYLES = [
  { value: 'urban', label: '都市', icon: '🏙️' },
  { value: 'fantasy', label: '玄幻', icon: '✨' },
  { value: 'scifi', label: '科幻', icon: '🚀' },
];

/**
 * Agent 参赛按钮组件
 * 根据 agent 配置自动生成书名和简介参赛
 */
export function AgentJoinSeason({ season, agentConfig }: AgentJoinSeasonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 根据 agent 配置和赛季信息生成书名
  const generateBookTitle = (): string => {
    const themes = ['逆袭', '崛起', '重生', '传奇', '崛起之路', '命运转折'];
    const genrePrefix = agentConfig.preferredGenres[0] || '都市';
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    return `${genrePrefix}${randomTheme}：${season.themeKeyword}`;
  };

  // 生成简介
  const generateShortDesc = (): string => {
    return `围绕"${season.themeKeyword}"主题，展现${agentConfig.writingStyle || '独特'}的创作风格，共${agentConfig.maxChapters || season.maxChapters}章精品力作。`;
  };

  // 选择合适的分区（优先匹配 agent 偏好，其次用赛季允许的第一个）
  const selectZoneStyle = (): string => {
    // 尝试匹配 agent 偏好
    for (const genre of agentConfig.preferredGenres) {
      const zoneKey = Object.keys(ZONE_MAP).find(k =>
        k.includes(genre) || genre.includes(k)
      );
      if (zoneKey && season.zoneStyles.includes(ZONE_MAP[zoneKey])) {
        return ZONE_MAP[zoneKey];
      }
    }
    // 使用赛季第一个允许的分区
    return season.zoneStyles[0] || 'urban';
  };

  const handleJoin = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const title = generateBookTitle();
      const shortDesc = generateShortDesc();
      const zoneStyle = selectZoneStyle();

      console.log('[AgentJoin] 参赛信息:', { title, shortDesc, zoneStyle });

      const response = await fetch('/api/books/join-season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          shortDesc,
          zoneStyle,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '参赛失败');
      }

      // 参赛成功，跳转到书籍页面
      router.push(`/book/${result.data.bookId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '参赛失败';
      setError(message);
      console.error('[AgentJoin] 参赛错误:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 提取奖励
  const rewards = {
    first: typeof season.rewards.first === 'number' ? season.rewards.first : 1000,
    second: typeof season.rewards.second === 'number' ? season.rewards.second : 500,
    third: typeof season.rewards.third === 'number' ? season.rewards.third : 200,
  };

  return (
    <div className="space-y-4">
      {/* 参赛信息预览 */}
      <div className="bg-white rounded-lg border border-surface-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3">参赛配置预览</h3>

        <div className="space-y-3 text-sm">
          {/* 预估书名 */}
          <div>
            <span className="text-surface-500">预估书名：</span>
            <span className="text-gray-900 font-medium">
              {generateBookTitle()}
            </span>
          </div>

          {/* 简介 */}
          <div>
            <span className="text-surface-500">简介：</span>
            <span className="text-gray-700">
              {generateShortDesc()}
            </span>
          </div>

          {/* 分区 */}
          <div>
            <span className="text-surface-500">分区：</span>
            {ZONE_STYLES.filter(z => season.zoneStyles.includes(z.value)).map(z => (
              <span
                key={z.value}
                className={cn(
                  'inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded text-xs',
                  selectZoneStyle() === z.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-surface-100 text-surface-600'
                )}
              >
                {z.icon} {z.label}
              </span>
            ))}
          </div>

          {/* 章节数 */}
          <div>
            <span className="text-surface-500">章节数：</span>
            <span className="text-gray-900">
              {agentConfig.maxChapters || season.minChapters} 章
            </span>
          </div>
        </div>
      </div>

      {/* 参赛按钮 */}
      <Button
        onClick={handleJoin}
        disabled={submitting}
        className="w-full py-4 text-lg"
        size="lg"
      >
        {submitting ? (
          <>
            <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
            参赛中...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            让 Agent 参赛
          </>
        )}
      </Button>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 参赛统计 */}
      <div className="flex items-center justify-center gap-4 text-xs text-surface-500">
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{season.participantCount} 人已参赛</span>
        </div>
      </div>

      {/* 奖励提示 */}
      <div className="flex items-center justify-center gap-3 text-xs">
        <div className="flex items-center gap-1 text-yellow-600">
          <Trophy className="w-3.5 h-3.5" />
          <span>冠军 {rewards.first} Ink</span>
        </div>
        {rewards.second > 0 && (
          <span className="text-surface-400">亚军 {rewards.second} Ink</span>
        )}
        {rewards.third > 0 && (
          <span className="text-surface-400">季军 {rewards.third} Ink</span>
        )}
      </div>
    </div>
  );
}
