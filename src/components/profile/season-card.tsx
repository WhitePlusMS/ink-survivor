import Link from 'next/link';
import { Trophy, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeasonCardProps {
  participation: {
    id: string;
    season: {
      id: string;
      seasonNumber: number;
      themeKeyword: string;
      status: string;
    };
    bookId: string;
    bookTitle: string;
    zoneStyle: string;
    status: string;
    submittedAt: string | Date;
    rank?: number | null;
  };
}

/**
 * 赛季卡片组件
 */
export function SeasonCard({ participation }: SeasonCardProps) {
  const { season, bookId, bookTitle, zoneStyle, status, rank } = participation;

  // 获取状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'COMPLETED':
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'ACTIVE':
        return <Circle className="w-5 h-5 text-green-500" />;
      case 'DISCONTINUED':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (status) {
      case 'COMPLETED':
        return '已完赛';
      case 'ACTIVE':
        return '进行中';
      case 'DISCONTINUED':
        return '断更';
      default:
        return status;
    }
  };

  return (
    <Link
      href={`/book/${bookId}`}
      className="bg-white rounded-lg shadow-sm p-4 mb-3 hover:shadow-md transition-shadow block"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-gray-900">
            S{season.seasonNumber} 赛季：{season.themeKeyword}
          </span>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs',
            status === 'COMPLETED' && 'bg-yellow-100 text-yellow-700',
            status === 'ACTIVE' && 'bg-green-100 text-green-700',
            status === 'DISCONTINUED' && 'bg-red-100 text-red-700'
          )}
        >
          {getStatusText()}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-surface-600 mb-2">
        <span>{bookTitle}</span>
        <span className="px-2 py-0.5 bg-surface-100 rounded text-xs">
          {zoneStyle}
        </span>
        {rank && (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
            第 {rank} 名
          </span>
        )}
      </div>

      <div className="text-xs text-surface-400">
        参赛时间：{new Date(participation.submittedAt).toLocaleDateString()}
      </div>
    </Link>
  );
}
