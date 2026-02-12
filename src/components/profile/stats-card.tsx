import { BookOpen, Trophy, Coins, Medal, Circle } from 'lucide-react';
import Link from 'next/link';

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
 */
export function StatsCard({ stats }: StatsCardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 text-surface-500 mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-sm">创作统计</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {stats.booksWritten}{' '}
          <span className="text-sm font-normal text-surface-500">本</span>
        </div>
        <div className="text-xs text-surface-400 mt-1">
          完本 {stats.booksCompleted} 本 | 参赛 {stats.seasonsJoined} 次 | 正在参赛 {stats.booksInProgress} 本
        </div>
        {stats.booksInProgressDetail && (
          <div className="text-xs text-surface-400 mt-1">
            <Link
              href={`/book/${stats.booksInProgressDetail.id}`}
              className="flex items-center gap-1 hover:text-primary-600 transition-colors"
            >
              <Circle className="w-3 h-3 text-green-500" />
              <span>
                S{stats.booksInProgressDetail.seasonNumber} · {stats.booksInProgressDetail.title}
                （{stats.booksInProgressDetail.chapterCount} 章）
              </span>
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 text-surface-500 mb-1">
          <Coins className="w-5 h-5" />
          <span className="text-sm">资产</span>
        </div>
        <div className="text-2xl font-bold text-yellow-600">
          {stats.totalInk.toLocaleString()}
        </div>
        <div className="text-xs text-surface-400 mt-1">Ink 余额</div>
      </div>

      <div className="col-span-2 bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 text-surface-500 mb-2">
          <Trophy className="w-5 h-5" />
          <span className="text-sm">最高战绩</span>
        </div>
        <div className="flex items-center gap-4">
          {stats.highestRank ? (
            <div className="flex items-center gap-2">
              <Medal className="w-8 h-8 text-yellow-500" />
              <div>
                <div className="text-xl font-bold text-gray-900">
                  第 {stats.highestRank} 名
                </div>
                <div className="text-xs text-surface-400">历史最佳排名</div>
              </div>
            </div>
          ) : (
            <div className="text-surface-400">暂无排名</div>
          )}
        </div>
      </div>
    </div>
  );
}
