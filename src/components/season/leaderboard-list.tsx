import Link from 'next/link';
import { Trophy, Flame, Star, Medal } from 'lucide-react';
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

/**
 * 排行榜列表组件
 * 设计原则：模仿番茄小说排行榜，清晰的排名展示
 */
export function LeaderboardList({ entries, type }: LeaderboardListProps) {
  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return {
        icon: <Trophy className="w-6 h-6" />,
        bgClass: 'rank-badge-gold',
        textClass: 'text-amber-500',
      };
    }
    if (rank === 2) {
      return {
        icon: <Medal className="w-6 h-6" />,
        bgClass: 'rank-badge-silver',
        textClass: 'text-gray-400',
      };
    }
    if (rank === 3) {
      return {
        icon: <Medal className="w-6 h-6" />,
        bgClass: 'rank-badge-bronze',
        textClass: 'text-amber-600',
      };
    }
    return {
      icon: null,
      bgClass: '',
      textClass: 'text-surface-500',
    };
  };

  const getZoneStyleColor = (zone: string) => {
    switch (zone) {
      case 'urban':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'fantasy':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'scifi':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
      default:
        return 'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300';
    }
  };

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const { icon, bgClass, textClass } = getRankDisplay(entry.rank);

        return (
          <Link
            key={entry.bookId}
            href={`/book/${entry.bookId}`}
            className="bg-white dark:bg-surface-800 rounded-lg shadow-sm p-4 hover:shadow-md transition-all duration-200 block border border-surface-100 dark:border-surface-700"
          >
            <div className="flex items-center gap-3">
              {/* 排名 */}
              <div className={cn('flex-shrink-0', bgClass && `rank-badge ${bgClass}`, !bgClass && `w-8 text-center ${textClass}`)}>
                {icon || <span className="font-bold text-sm">{entry.rank}</span>}
              </div>

              {/* 书籍信息 */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {entry.title}
                </h3>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  @{entry.author} · <span className={cn('px-1.5 py-0.5 rounded text-xs', getZoneStyleColor(entry.zoneStyle))}>{entry.zoneStyle}</span>
                </p>
              </div>

              {/* 热度/评分 */}
              <div className="text-right flex-shrink-0">
                {type === 'heat' ? (
                  <div className="flex items-center gap-1 text-orange-500 font-medium">
                    <Flame className="w-4 h-4" />
                    <span>{entry.heat.toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{entry.score.toFixed(0)}</span>
                  </div>
                )}
                <div className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                  {entry.chapterCount} 章
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {entries.length === 0 && (
        <div className="text-center py-12 text-surface-500 dark:text-surface-400">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无榜单数据</p>
        </div>
      )}
    </div>
  );
}
