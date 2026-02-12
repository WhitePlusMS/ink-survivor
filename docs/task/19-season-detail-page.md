# 任务 19：赛季详情与排行榜页面

## 任务目标
实现赛季详情页面和排行榜展示

## 依赖关系
- 任务 06（赛季 API）完成后
- 任务 11（排行榜）完成后

## 交付物清单

### 19.1 排行榜 Tab
- [ ] 热度榜
- [ ] 评分榜
- [ ] 新书榜

### 19.2 赛季详情页面
- [ ] `app/season/[id]/page.tsx` - 赛季详情

## 涉及文件清单
| 文件路径                                     | 操作 |
| -------------------------------------------- | ---- |
| `src/app/season/[id]/page.tsx`               | 新建 |
| `src/components/season/leaderboard-tabs.tsx` | 新建 |
| `src/components/season/leaderboard-list.tsx` | 新建 |

## 详细设计

### 排行榜 Tabs
```tsx
// src/components/season/leaderboard-tabs.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const TAB_TYPES = [
  { value: 'heat', label: '热度榜' },
  { value: 'score', label: '评分榜' },
  { value: 'new', label: '新书榜' },
];

interface LeaderboardTabsProps {
  seasonId: string;
}

export function LeaderboardTabs({ seasonId }: LeaderboardTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentType = searchParams.get('type') || 'heat';

  const handleTabChange = (type: string) => {
    router.push(`/season/${seasonId}?type=${type}`);
  };

  return (
    <div className="flex border-b mb-4">
      {TAB_TYPES.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleTabChange(tab.value)}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentType === tab.value
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### 排行榜列表
```tsx
// src/components/season/leaderboard-list.tsx
import Link from 'next/link';
import { Trophy, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  bookId: string;
  rank: number;
  score: number;
  heat: number;
  title: string;
  author: string;
  zoneStyle: string;
  chapterCount: number;
}

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  type: 'heat' | 'score' | 'new';
}

export function LeaderboardList({ entries, type }: LeaderboardListProps) {
  const getRankDisplay = (rank: number) => {
    if (rank === 1) return { icon: '🏆', class: 'text-yellow-500' };
    if (rank === 2) return { icon: '🥈', class: 'text-gray-400' };
    if (rank === 3) return { icon: '🥉', class: 'text-amber-600' };
    return { icon: `${rank}`, class: 'text-gray-500' };
  };

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const { icon, class: rankClass } = getRankDisplay(entry.rank);

        return (
          <Link
            key={entry.bookId}
            href={`/book/${entry.bookId}`}
            className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center gap-3">
              {/* 排名 */}
              <div className={cn('w-8 text-center', rankClass)}>
                {rank === 1 || rank === 2 || rank === 3 ? (
                  <span className="text-2xl">{icon}</span>
                ) : (
                  <span className="font-bold">{icon}</span>
                )}
              </div>

              {/* 书籍信息 */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {entry.title}
                </h3>
                <p className="text-sm text-gray-500">
                  @{entry.author} · {entry.zoneStyle}
                </p>
              </div>

              {/* 热度/评分 */}
              <div className="text-right">
                {type === 'heat' ? (
                  <div className="text-orange-500 font-medium">
                    {entry.heat.toLocaleString()}
                  </div>
                ) : (
                  <div className="text-yellow-600 font-medium">
                    {entry.score.toFixed(0)}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {entry.chapterCount} 章
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {entries.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          暂无数据
        </div>
      )}
    </div>
  );
}
```

### 赛季详情页面
```tsx
// src/app/season/[id]/page.tsx
import { notFound } from 'next/navigation';
import { seasonService } from '@/services/season.service';
import { leaderboardService } from '@/services/leaderboard.service';
import { LeaderboardTabs } from '@/components/season/leaderboard-tabs';
import { LeaderboardList } from '@/components/season/leaderboard-list';
import { Clock, Users, Trophy } from 'lucide-react';

interface SeasonPageProps {
  params: { id: string };
  searchParams: { type?: string };
}

export default async function SeasonPage({ params, searchParams }: SeasonPageProps) {
  const season = await seasonService.getSeasonById(params.id);
  if (!season) notFound();

  const type = (searchParams.type as 'heat' | 'score' | 'new') || 'heat';

  const { data: leaderboard } = await leaderboardService.getLeaderboard({
    seasonId: params.id,
    type,
    limit: 50,
  });

  // 格式化时间
  const startTime = new Date(season.startTime).toLocaleDateString();
  const endTime = new Date(season.endTime).toLocaleDateString();

  return (
    <div className="min-h-screen bg-gray-50">
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
          {JSON.parse(season.constraints).length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs opacity-80 mb-1">硬性限制：</p>
              <ul className="text-xs space-y-1 opacity-90">
                {JSON.parse(season.constraints).slice(0, 3).map((c: string, i: number) => (
                  <li key={i}>· {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 排行榜 Tab */}
        <LeaderboardTabs seasonId={params.id} />

        {/* 排行榜列表 */}
        <LeaderboardList entries={leaderboard} type={type} />
      </div>
    </div>
  );
}
```

## 验证标准
- [ ] 赛季信息正确显示
- [ ] 排行榜正确显示
- [ ] Tab 切换正常工作
重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现赛季详情页面与排行榜展示`。