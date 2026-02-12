'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const TAB_TYPES = [
  { value: 'heat', label: '热度榜' },
  { value: 'score', label: '评分榜' },
  { value: 'new', label: '新书榜' },
];

interface LeaderboardTabsProps {
  seasonId: string;
}

/**
 * 排行榜 Tab 切换组件
 */
export function LeaderboardTabs({ seasonId }: LeaderboardTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentType = searchParams.get('type') || 'heat';

  const handleTabChange = (type: string) => {
    router.push(`/season/${seasonId}?type=${type}`);
  };

  return (
    <div className="flex border-b border-surface-200 mb-4">
      {TAB_TYPES.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleTabChange(tab.value)}
          className={cn(
            'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
            currentType === tab.value
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
