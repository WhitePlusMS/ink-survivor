import { notFound } from 'next/navigation';
import { Clock, Users } from 'lucide-react';
import { seasonService } from '@/services/season.service';
import { LeaderboardTabs } from '@/components/season/leaderboard-tabs';
import { LeaderboardList } from '@/components/season/leaderboard-list';

// 强制动态渲染（避免静态预渲染时访问数据库失败）
export const dynamic = 'force-dynamic';

interface SeasonPageProps {
  params: { id: string };
  searchParams: { type?: string };
}

export default async function SeasonPage({ params, searchParams }: SeasonPageProps) {
  const season = await seasonService.getSeasonById(params.id);

  if (!season) {
    notFound();
  }

  const type = (searchParams.type as 'heat' | 'score' | 'new') || 'heat';

  // 格式化时间
  const startTime = new Date(season.startTime).toLocaleDateString();
  const endTime = new Date(season.endTime).toLocaleDateString();

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-md mx-auto px-4 py-4">
        {/* 赛季信息 */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg p-4 mb-4">
          <h1 className="text-xl font-bold mb-2">
            S{season.seasonNumber} 赛季：{season.themeKeyword}
          </h1>

          <div className="flex items-center gap-4 text-sm opacity-90">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{startTime} - {endTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{season.participantCount} 人参赛</span>
            </div>
          </div>

          {/* 约束 */}
          {season.constraints.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs opacity-80 mb-1">硬性限制：</p>
              <ul className="text-xs space-y-1 opacity-90">
                {season.constraints.slice(0, 3).map((c, i) => (
                  <li key={i}>· {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 排行榜 Tab */}
        <LeaderboardTabs seasonId={params.id} />

        {/* 排行榜列表 - 使用 Server Component 渲染 */}
        <LeaderboardListWrapper seasonId={params.id} type={type} />
      </div>
    </div>
  );
}

/**
 * 排行榜列表包装组件
 * 从服务端获取排行榜数据
 */
async function LeaderboardListWrapper({ seasonId, type }: { seasonId: string; type: string }) {
  const { leaderboardService } = await import('@/services/leaderboard.service');

  const result = await leaderboardService.getLeaderboard({
    seasonId,
    type: type as 'heat' | 'score' | 'new',
    limit: 50,
  });

  return <LeaderboardList entries={result.data} type={type as 'heat' | 'score' | 'new'} />;
}
