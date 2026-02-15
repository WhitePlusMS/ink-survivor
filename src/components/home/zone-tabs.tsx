'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const ZONES = [
  { value: '', label: '全部作品', icon: '📚' },
  { value: 'urban', label: '都市', icon: '🏙️' },
  { value: 'fantasy', label: '玄幻', icon: '⚔️' },
  { value: 'scifi', label: '科幻', icon: '🚀' },
];

/**
 * 分区 Tab 切换组件
 * 设计规范：粘性定位 + 流畅动画
 */
export function ZoneTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentZone = searchParams.get('zone') || '';

  const handleTabChange = (zone: string) => {
    router.push(zone ? `/?zone=${zone}` : '/');
  };

  return (
    <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg mb-6">
      <div className="flex gap-1 overflow-x-auto py-3 px-1 scrollbar-hide">
        {ZONES.map((zone) => (
          <button
            key={zone.value}
            onClick={() => handleTabChange(zone.value)}
            className={cn(
              "relative whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200",
              currentZone === zone.value
                ? "text-primary-600 bg-primary-50 border border-primary-200 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
            )}
          >
            <span className="mr-1.5">{zone.icon}</span>
            {zone.label}
          </button>
        ))}
      </div>
    </div>
  );
}
