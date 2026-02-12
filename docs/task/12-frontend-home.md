# 任务 12：前端页面 - 首页与书架

## 任务目标
实现首页（书架）页面，展示赛季信息和书籍列表

## 依赖关系
- 任务 03（UI 组件）完成后
- 任务 06（赛季 API）完成后
- 任务 07（书籍 API）完成后

## 交付物清单

### 12.1 首页布局
- [ ] 页面布局结构
- [ ] 底部 Tab 导航

### 12.2 赛季倒计时组件
- [ ] 倒计时显示组件
- [ ] 赛季信息 Banner

### 12.3 书架组件
- [ ] 书籍卡片组件
- [ ] 书籍列表组件
- [ ] 分区 Tab 切换

### 12.4 首页页面
- [ ] `app/page.tsx` - 首页

## 涉及文件清单
| 文件路径                                | 操作 |
| --------------------------------------- | ---- |
| `src/app/layout.tsx`                    | 修改 |
| `src/app/page.tsx`                      | 新建 |
| `src/components/home/season-banner.tsx` | 新建 |
| `src/components/home/book-card.tsx`     | 新建 |
| `src/components/home/book-list.tsx`     | 新建 |
| `src/components/home/zone-tabs.tsx`     | 新建 |
| `src/components/layout/bottom-nav.tsx`  | 新建 |
| `src/components/layout/header.tsx`      | 新建 |

## 详细设计

### 页面布局
```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'InkSurvivor',
  description: '赛季制 AI 创作平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="pb-16">
              {children}
            </main>
            <BottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 赛季倒计时 Banner
```tsx
// src/components/home/season-banner.tsx
'use client';

import { useState, useEffect } from 'react';
import { Flame, Clock } from 'lucide-react';

interface SeasonBannerProps {
  season?: {
    id: string;
    seasonNumber: number;
    themeKeyword: string;
    endTime: Date;
    participantCount: number;
  };
}

export function SeasonBanner({ season }: SeasonBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!season) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(season.endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('已结束');
        clearInterval(timer);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [season]);

  if (!season) {
    return (
      <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white p-4 rounded-lg mb-4">
        <div className="text-center">
          <Flame className="inline-block w-5 h-5 mr-2" />
          <span className="font-medium">暂无进行中的赛季</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Flame className="w-5 h-5 mr-2" />
          <span className="font-bold">S{season.seasonNumber} 赛季：{season.themeKeyword}</span>
        </div>
        <div className="flex items-center text-sm opacity-90">
          <Clock className="w-4 h-4 mr-1" />
          {timeLeft}
        </div>
      </div>
      <div className="text-sm opacity-90">
        已参赛书籍：{season.participantCount} 本
      </div>
    </div>
  );
}
```

### 书籍卡片
```tsx
// src/components/home/book-card.tsx
import Link from 'next/link';
import { Flame, BookOpen, MessageCircle, Star } from 'lucide-react';

interface BookCardProps {
  book: {
    id: string;
    title: string;
    coverImage?: string;
    shortDesc?: string;
    zoneStyle: string;
    heat: number;
    chapterCount: number;
    author: {
      nickname: string;
    };
    score?: {
      finalScore: number;
      avgRating: number;
    };
  };
  rank?: number;
}

export function BookCard({ book, rank }: BookCardProps) {
  const getRankIcon = () => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <Link href={`/book/${book.id}`}>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-3 hover:shadow-md transition-shadow">
        <div className="flex gap-3">
          {/* 封面占位 */}
          <div className="w-20 h-28 bg-gradient-to-b from-gray-200 to-gray-300 rounded-md flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              {rank && rank <= 3 && (
                <span className="text-xl">{getRankIcon()}</span>
              )}
              <div>
                <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                <p className="text-sm text-gray-500">@{book.author.nickname}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {book.shortDesc || '暂无简介'}
            </p>

            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                {book.zoneStyle}
              </span>
              <span className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                {book.heat}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {book.chapterCount} 章
              </span>
              {book.score && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {book.score.avgRating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

### 书籍列表
```tsx
// src/components/home/book-list.tsx
'use client';

import { useState, useEffect } from 'react';
import { BookCard } from './book-card';
import { Spinner } from '@/components/ui/spinner';

interface BookListProps {
  initialBooks?: any[];
  zoneStyle?: string;
}

export function BookList({ initialBooks, zoneStyle }: BookListProps) {
  const [books, setBooks] = useState(initialBooks || []);
  const [loading, setLoading] = useState(!initialBooks);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!initialBooks) return;
    setBooks(initialBooks);
  }, [initialBooks]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (zoneStyle) params.set('zoneStyle', zoneStyle);
      params.set('offset', offset.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/books?${params}`);
      const data = await res.json();

      setBooks(prev => [...prev, ...data.data]);
      setOffset(prev => prev + 20);
      setHasMore(data.data.length === 20);
    } catch (error) {
      console.error('Load books error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {books.map((book, index) => (
        <BookCard key={book.id} book={book} rank={index + 1} />
      ))}

      {books.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          暂无书籍
        </div>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full py-3 text-primary-600 hover:bg-gray-100 rounded-lg"
        >
          {loading ? <Spinner /> : '加载更多'}
        </button>
      )}
    </div>
  );
}
```

### 分区 Tab
```tsx
// src/components/home/zone-tabs.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const ZONES = [
  { value: '', label: '全部' },
  { value: 'urban', label: '都市' },
  { value: 'fantasy', label: '玄幻' },
  { value: 'scifi', label: '科幻' },
];

export function ZoneTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentZone = searchParams.get('zone') || '';

  const handleTabChange = (zone: string) => {
    router.push(zone ? `/?zone=${zone}` : '/');
  };

  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
      {ZONES.map((zone) => (
        <button
          key={zone.value}
          onClick={() => handleTabChange(zone.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
            currentZone === zone.value
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {zone.label}
        </button>
      ))}
    </div>
  );
}
```

### 首页页面
```tsx
// src/app/page.tsx
import { SeasonBanner } from '@/components/home/season-banner';
import { BookList } from '@/components/home/book-list';
import { ZoneTabs } from '@/components/home/zone-tabs';
import { seasonService } from '@/services/season.service';
import { bookService } from '@/services/book.service';

export default async function HomePage() {
  // 获取当前赛季
  const seasons = await seasonService.getCurrentSeason();

  // 获取书籍列表
  const { books } = await bookService.getBooks({
    zoneStyle: undefined,
    status: 'ACTIVE',
    limit: 20,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4">
      {/* 赛季 Banner */}
      <SeasonBanner season={seasons ? {
        id: seasons.id,
        seasonNumber: seasons.seasonNumber,
        themeKeyword: seasons.themeKeyword,
        endTime: seasons.endTime,
        participantCount: seasons.participantCount,
      } : undefined} />

      {/* 分区 Tab */}
      <ZoneTabs />

      {/* 书籍列表 */}
      <BookList initialBooks={books} />
    </div>
  );
}
```

### 底部导航
```tsx
// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PenTool, Bookmark, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: '首页' },
  { href: '/create', icon: PenTool, label: '创作' },
  { href: '/favorites', icon: Bookmark, label: '收藏' },
  { href: '/profile', icon: User, label: '我的' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
      <div className="max-w-md mx-auto flex justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center px-4 py-1',
                isActive ? 'text-primary-600' : 'text-gray-500'
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

## 验证标准
- [ ] 首页显示正确
- [ ] 赛季倒计时正常工作
- [ ] 书籍列表正确显示
- [ ] Tab 切换正常工作

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现首页与书架页面`。