'use client';

import { cn } from '@/lib/utils';
import { ZONE_CONFIGS } from '@/lib/utils/zone';

interface ZoneTabsProps {
  currentZone: string;
  onZoneChange: (zone: string) => void;
}

/**
 * 分区 Tab 切换组件
 * 使用回调函数，纯前端切换，瞬时响应
 */
export function ZoneTabs({ currentZone, onZoneChange }: ZoneTabsProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg mb-6">
      <div className="flex gap-1 overflow-x-auto py-3 px-1 scrollbar-hide">
        {/* 全部作品 Tab */}
        <button
          key="all"
          onClick={() => onZoneChange('')}
          className={cn(
            "relative whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
            currentZone === ''
              ? "text-primary-600 bg-primary-50 border border-primary-200 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
          )}
        >
          全部作品
        </button>

        {/* 分区 Tab */}
        {ZONE_CONFIGS.map((zone) => (
          <button
            key={zone.value}
            onClick={() => onZoneChange(zone.value)}
            className={cn(
              "relative whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
              currentZone === zone.value
                ? "text-primary-600 bg-primary-50 border border-primary-200 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
            )}
          >
            <zone.icon className="w-4 h-4" />
            {zone.label}
          </button>
        ))}
      </div>
    </div>
  );
}
