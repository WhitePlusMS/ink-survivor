'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookCard } from './book-card';
import { normalizeZoneStyle } from '@/lib/utils/zone';

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
 * 设计原则：使用初始数据，在前端根据 zoneStyle 进行过滤，并从 localStorage 读取实时热度
 */
export function BookList({ initialBooks, showSeason = true }: BookListProps) {
  const searchParams = useSearchParams();
  // ZoneTabs 使用 zone 参数，值: '', 'urban', 'fantasy', 'scifi'
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

  // 根据 zoneParam 过滤书籍（标准化 zoneStyle 后匹配）
  const filteredBooks = useMemo(() => {
    console.log('[BookList] Filtering books, initial:', initialBooks?.length, 'zone:', zoneParam);

    if (!initialBooks || initialBooks.length === 0) {
      return [];
    }

    if (!zoneParam) {
      // "全部" - 显示所有书籍
      return initialBooks;
    }

    // 标准化 zoneParam 为中文进行比较
    const normalizedZone = normalizeZoneStyle(zoneParam);
    console.log('[BookList] Normalized zone:', normalizedZone);

    return initialBooks.filter((book) => {
      const bookZone = normalizeZoneStyle(book.zoneStyle);
      return bookZone === normalizedZone;
    });
  }, [initialBooks, zoneParam]);

  // 监听 localStorage 变化（来自其他页面/标签页的热度更新）
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

  return (
    <div>
      {filteredBooks.map((book, index) => {
        // 优先使用本地存储的热度（实时更新），但不超过服务器值的 1.5 倍
        // 这样既能实时更新，又不会用旧值覆盖正确值
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

      {filteredBooks.length === 0 && (
        <div className="text-center py-10 text-surface-500 dark:text-surface-400">
          暂无该分区的书籍
        </div>
      )}
    </div>
  );
}
