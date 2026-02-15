'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookCard } from './book-card';
import { normalizeZoneStyle } from '@/lib/utils/zone';
import { BookOpen } from '@/components/icons';

export interface BookListProps {
  initialBooks?: Book[];
  showSeason?: boolean; // 是否在书籍卡片上显示赛季标签
}

export interface Book {
  id: string;
  title: string;
  coverImage?: string;
  shortDesc?: string;
  zoneStyle: string;
  heat: number;
  chapterCount: number;
  viewCount: number;      // 整本书的观看数（所有章节之和）
  commentCount: number;  // 整本书的评论数（所有章节之和）
  author: {
    nickname: string;
  };
  score?: {
    finalScore: number;
    avgRating: number;
  };
  seasonNumber?: number; // 赛季编号，用于显示赛季标签
}

/**
 * 书籍列表组件
 * 设计规范：瀑布流网格布局
 */
export function BookList({ initialBooks, showSeason = true }: BookListProps) {
  const searchParams = useSearchParams();
  const zoneParam = searchParams.get('zone') || '';

  // 本地状态存储从 localStorage 读取的实时热度
  const [localHeats, setLocalHeats] = useState<Record<string, number>>({});

  // 从 localStorage 读取实时热度
  useEffect(() => {
    const heats: Record<string, number> = {};
    initialBooks?.forEach((book) => {
      const stored = localStorage.getItem(`heat:${book.id}`);
      if (stored) {
        const heat = parseInt(stored, 10);
        if (!isNaN(heat)) {
          heats[book.id] = heat;
        }
      }
    });
    setLocalHeats(heats);
  }, [initialBooks]);

  // 根据 zoneParam 过滤书籍
  const filteredBooks = useMemo(() => {
    if (!initialBooks || initialBooks.length === 0) {
      return [];
    }

    if (!zoneParam) {
      return initialBooks;
    }

    const normalizedZone = normalizeZoneStyle(zoneParam);
    return initialBooks.filter((book) => {
      const bookZone = normalizeZoneStyle(book.zoneStyle);
      return bookZone === normalizedZone;
    });
  }, [initialBooks, zoneParam]);

  // 监听 localStorage 变化
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('heat:')) {
        const bookId = e.key.replace('heat:', '');
        if (e.newValue) {
          setLocalHeats((prev) => ({
            ...prev,
            [bookId]: parseInt(e.newValue!, 10),
          }));
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 按热度排序
  const sortedBooks = useMemo(() => {
    return [...filteredBooks].sort((a, b) => b.heat - a.heat);
  }, [filteredBooks]);

  return (
    <div>
      {/* 网格布局 - 瀑布流 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedBooks.map((book, index) => {
          const localHeat = localHeats[book.id];
          const displayHeat = (localHeat !== undefined && localHeat > book.heat)
            ? localHeat
            : book.heat;

          return (
            <BookCard
              key={book.id}
              book={{
                ...book,
                heat: displayHeat,
              }}
              rank={index + 1}
              showSeason={showSeason}
            />
          );
        })}
      </div>

      {sortedBooks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-surface-500">
          <BookOpen className="mb-4 w-10 h-10" />
          <p>暂无该分区的书籍</p>
        </div>
      )}
    </div>
  );
}
