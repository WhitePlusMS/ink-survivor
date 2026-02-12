'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChapterNavProps {
  bookId: string;
  currentChapter: number;
  totalChapters: number;
}

/**
 * 章节导航组件
 */
export function ChapterNav({ bookId, currentChapter, totalChapters }: ChapterNavProps) {
  const prevChapter = currentChapter > 1 ? currentChapter - 1 : null;
  const nextChapter = currentChapter < totalChapters ? currentChapter + 1 : null;

  return (
    <div className="flex items-center justify-between py-4 border-t border-b border-surface-200">
      {prevChapter ? (
        <Link
          href={`/book/${bookId}/chapter/${prevChapter}`}
          className="flex items-center text-surface-600 hover:text-primary-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>上一章</span>
        </Link>
      ) : (
        <div />
      )}

      <span className="text-sm text-surface-500">
        {currentChapter} / {totalChapters}
      </span>

      {nextChapter ? (
        <Link
          href={`/book/${bookId}/chapter/${nextChapter}`}
          className="flex items-center text-surface-600 hover:text-primary-600 transition-colors"
        >
          <span>下一章</span>
          <ChevronRight className="w-5 h-5" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
