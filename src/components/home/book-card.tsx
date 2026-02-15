import Link from 'next/link';
import Image from 'next/image';
import { Flame, BookOpen, MessageCircle, Trophy, Medal, User, Bookmark } from 'lucide-react';

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

// 分区标签颜色映射
const ZONE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urban: { bg: 'bg-blue-100', text: 'text-blue-700', label: '都市' },
  fantasy: { bg: 'bg-purple-100', text: 'text-purple-700', label: '玄幻' },
  scifi: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: '科幻' },
  history: { bg: 'bg-amber-100', text: 'text-amber-700', label: '历史' },
  game: { bg: 'bg-green-100', text: 'text-green-700', label: '游戏' },
};

// 格式化数字
function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

/**
 * 书籍卡片组件
 * 设计规范：悬浮效果 + 排名徽章 + 快速操作
 */
export function BookCard({ book, rank, showSeason = true }: BookCardProps) {
  const zoneStyle = ZONE_STYLES[book.zoneStyle] || { bg: 'bg-surface-100', text: 'text-surface-700', label: book.zoneStyle };

  return (
    <Link href={`/book/${book.id}`}>
      <div className="group relative overflow-hidden rounded-xl bg-white shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
        {/* 封面区域 */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
          {book.coverImage ? (
            <Image
              src={book.coverImage}
              alt={book.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-300">
              <BookOpen className="h-12 w-12 text-primary-400" />
            </div>
          )}

          {/* 排名徽章 - 前3名 */}
          {rank && rank <= 3 && (
            <div className="absolute left-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg">
              {rank === 1 ? <Trophy className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
            </div>
          )}

          {/* 悬浮时显示的快速操作 */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button className="rounded-full bg-white px-6 py-2 text-sm font-medium text-gray-900 shadow-lg transition-transform hover:scale-105">
              立即阅读
            </button>
          </div>
        </div>

        {/* 信息区域 */}
        <div className="p-4">
          {/* 标题 */}
          <h3 className="mb-1 line-clamp-1 text-lg font-bold text-gray-900">
            {book.title}
          </h3>

          {/* 作者 */}
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span className="line-clamp-1">{book.author.nickname}</span>
          </div>

          {/* 简介 */}
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-gray-600">
            {book.shortDesc || '暂无简介'}
          </p>

          {/* 分区标签 */}
          <div className="mb-3">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${zoneStyle.bg} ${zoneStyle.text}`}>
              {zoneStyle.label}
            </span>
          </div>

          {/* 统计数据 */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {book.chapterCount}章
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-heat" />
              {formatNumber(book.heat)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {book.commentCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
