import { BookOpen, Trophy, Coins, Medal } from 'lucide-react';

interface BooksInProgressDetail {
  id: string;
  title: string;
  seasonNumber: number;
  themeKeyword: string;
  chapterCount: number;
}

interface StatsCardProps {
  stats: {
    booksWritten: number;
    booksCompleted: number;
    booksInProgress: number;
    booksInProgressDetail: BooksInProgressDetail | null;
    seasonsJoined: number;
    totalInk: number;
    highestRank?: number;
  };
}

/**
 * 创作统计卡片组件
 * 设计规范：渐变背景卡片 + 数据可视化
 */
export function StatsCard({ stats }: StatsCardProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* 创作数据 */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-5 shadow-card">
        <div className="mb-3">
          <BookOpen className="h-6 w-6 text-blue-500" />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {stats.booksWritten}
        </div>
        <div className="text-xs text-gray-600">完本书籍</div>
      </div>

      {/* 参赛次数 */}
      <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 shadow-card">
        <div className="mb-3">
          <Trophy className="h-6 w-6 text-yellow-500" />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {stats.seasonsJoined}
        </div>
        <div className="text-xs text-gray-600">参加赛季</div>
      </div>

      {/* Ink 余额 */}
      <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-5 shadow-card">
        <div className="mb-3">
          <Coins className="h-6 w-6 text-purple-500" />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {stats.totalInk.toLocaleString()}
        </div>
        <div className="text-xs text-gray-600">累计 Ink</div>
      </div>

      {/* 最高排名 */}
      <div className="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-5 shadow-card">
        <div className="mb-3">
          <Medal className="h-6 w-6 text-orange-500" />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {stats.highestRank ? `#${stats.highestRank}` : '--'}
        </div>
        <div className="text-xs text-gray-600">最高排名</div>
      </div>
    </div>
  );
}
