import Link from 'next/link';
import { Flame, BookOpen, Eye, MessageCircle, Trophy } from 'lucide-react';

interface BookCardProps {
  book: {
    id: string;
    title: string;
    coverImage?: string;
    shortDesc?: string;
    zoneStyle: string;
    heat: number;
    chapterCount: number;
    viewCount: number;
    commentCount: number;
    author: {
      nickname: string;
    };
    score?: {
      finalScore: number;
      avgRating: number;
    };
    seasonNumber?: number; // 赛季编号，用于显示赛季标签
  };
  rank?: number;
  showSeason?: boolean; // 是否显示赛季标签
}

/**
 * 书籍卡片组件
 * 设计原则：模仿番茄小说书架风格，封面+书名+简介+热度
 */
export function BookCard({ book, rank, showSeason = true }: BookCardProps) {
  const getRankBadge = () => {
    if (rank === 1) {
      return (
        <span className="rank-badge rank-badge-gold text-sm">
          <Trophy className="w-4 h-4" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="rank-badge rank-badge-silver text-sm">
          <Trophy className="w-4 h-4" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="rank-badge rank-badge-bronze text-sm">
          <Trophy className="w-4 h-4" />
        </span>
      );
    }
    return null;
  };

  const getZoneStyleColor = (zone: string) => {
    switch (zone) {
      case 'urban':
        return 'bg-blue-100 text-blue-700';
      case 'fantasy':
        return 'bg-purple-100 text-purple-700';
      case 'scifi':
        return 'bg-cyan-100 text-cyan-700';
      default:
        return 'bg-surface-100 text-surface-700';
    }
  };

  // 赛季标签颜色
  const getSeasonBadgeColor = (seasonNum: number) => {
    if (seasonNum === 0) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    return 'bg-primary-100 text-primary-700 border-primary-200';
  };

  return (
    <Link href={`/book/${book.id}`}>
      <div className="bg-white dark:bg-surface-800 rounded-lg shadow-sm p-4 mb-3 hover:shadow-md transition-all duration-200 border border-surface-100 dark:border-surface-700 card-hover">
        <div className="flex gap-3">
          {/* 封面占位 - 渐变色 */}
          <div className="w-20 h-28 bg-gradient-to-br from-primary-100 to-primary-300 dark:from-primary-900/50 dark:to-primary-800 rounded-md flex-shrink-0 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary-400 dark:text-primary-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              {rank && rank <= 3 && getRankBadge()}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                  {book.title}
                </h3>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                  @{book.author.nickname}
                </p>
              </div>
            </div>

            <p className="text-sm text-surface-600 dark:text-surface-300 mt-2 line-clamp-2">
              {book.shortDesc || '暂无简介'}
            </p>

            <div className="flex items-center gap-2 mt-3 text-sm flex-wrap">
              {/* 赛季标签 */}
              {showSeason && book.seasonNumber !== undefined && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeasonBadgeColor(book.seasonNumber)}`}>
                  S{book.seasonNumber}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getZoneStyleColor(book.zoneStyle)}`}>
                {book.zoneStyle}
              </span>
              <span className="flex items-center gap-1 text-orange-500">
                <Flame className="w-4 h-4" />
                <span className="font-medium">{book.heat.toLocaleString()}</span>
              </span>
              <span className="flex items-center gap-1 text-surface-500 dark:text-surface-400">
                <BookOpen className="w-4 h-4" />
                <span>{book.chapterCount} 章</span>
              </span>
              <span className="flex items-center gap-1 text-surface-500 dark:text-surface-400">
                <Eye className="w-4 h-4" />
                <span>{book.viewCount.toLocaleString()}</span>
              </span>
              <span className="flex items-center gap-1 text-surface-500 dark:text-surface-400">
                <MessageCircle className="w-4 h-4" />
                <span>{book.commentCount.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
