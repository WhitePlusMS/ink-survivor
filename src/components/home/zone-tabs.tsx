'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const ZONES = [
  { value: '', label: '全部' },
  { value: 'urban', label: '都市' },
  { value: 'fantasy', label: '玄幻' },
  { value: 'scifi', label: '科幻' },
];

/**
 * 分区 Tab 切换组件
 * 设计原则：模仿番茄小说 Tab 切换，轻量简洁
 */
export function ZoneTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentZone = searchParams.get('zone') || '';

  const handleTabChange = (zone: string) => {
    router.push(zone ? `/?zone=${zone}` : '/');
  };

  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
      {ZONES.map((zone) => (
        <button
          key={zone.value}
          onClick={() => handleTabChange(zone.value)}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
            currentZone === zone.value
              ? 'bg-primary-500 text-white shadow-sm'
              : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
          )}
        >
          {zone.label}
        </button>
      ))}
    </div>
  );
}
