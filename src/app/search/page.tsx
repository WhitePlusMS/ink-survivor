'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Search as SearchIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookCard } from '@/components/home/book-card';
import type { Book } from '@/components/home/book-list';
import { Spinner } from '@/components/ui/spinner';

/**
 * 搜索页面
 * 设计原则：简洁的搜索体验
 */
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/books?keyword=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* 搜索框 - 使用响应式 padding */}
      <div className="sticky top-0 z-10 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-4">
        <div className="flex items-center gap-2 max-w-screen-xl mx-auto">
          <Link
            href="/"
            className="p-2 -ml-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-200"
            aria-label="返回首页"
          >
            <span aria-hidden="true">←</span>
          </Link>
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" aria-hidden="true" />
            <label htmlFor="search-input" className="sr-only">搜索书籍</label>
            <input
              id="search-input"
              type="text"
              name="keyword"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索书名、作者..."
              className="w-full pl-10 pr-20 py-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-50 dark:bg-surface-700 text-gray-900 dark:text-gray-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {query && (
              <button
                onClick={handleClear}
                aria-label="清除搜索内容"
                className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <Button onClick={handleSearch} disabled={loading || !query.trim()} aria-label="执行搜索">
            搜索
          </Button>
        </div>
      </div>

      {/* 搜索结果 - 使用响应式 padding */}
      <div className="px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-4 max-w-screen-xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : hasSearched ? (
          <>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
              {results.length} 个结果
            </p>
            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map((book, index) => (
                  <BookCard key={book.id} book={book} rank={index + 1} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <SearchIcon className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
                <p className="text-surface-500 dark:text-surface-400">未找到相关书籍</p>
                <p className="text-sm text-surface-400 dark:text-surface-500 mt-1">
                  试试其他关键词
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <SearchIcon className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400">输入关键词搜索书籍</p>
          </div>
        )}
      </div>
    </div>
  );
}
