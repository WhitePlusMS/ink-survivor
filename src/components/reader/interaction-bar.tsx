'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Bookmark, Heart, Gift, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractionBarProps {
  bookId: string;
  chapterNum: number;
  initialFavorited?: boolean;
  initialLiked?: boolean;
  commentCount?: number;
}

/**
 * 防抖 hook
 */
function useDebounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * 阅读器底部互动栏组件
 */
export function InteractionBar({
  bookId,
  chapterNum,
  initialFavorited = false,
  initialLiked = false,
  commentCount = 0,
}: InteractionBarProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [liked, setLiked] = useState(initialLiked);
  const [isLoading, setIsLoading] = useState(false);

  // 加载点赞状态
  useEffect(() => {
    const fetchLikeStatus = async () => {
      try {
        const res = await fetch(`/api/books/${bookId}/chapters/${chapterNum}/like/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.code === 0) {
            setLiked(data.data.isLiked);
          }
        }
      } catch (error) {
        console.error('Failed to fetch like status:', error);
      }
    };

    fetchLikeStatus();
  }, [bookId, chapterNum]);

  // 收藏操作
  const handleFavorite = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/favorite`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        // 保存热度到 localStorage
        if (data.data?.heat !== undefined) {
          localStorage.setItem(`heat:${bookId}`, String(data.data.heat));
        }
        setFavorited(!favorited);
      }
    } catch (error) {
      console.error('Favorite error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 点赞操作（带防抖）
  const handleLike = async () => {
    if (isLoading) return;

    // 乐观更新：立即反转状态
    const previousLiked = liked;
    setLiked(!liked);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/books/${bookId}/chapters/${chapterNum}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0) {
          // 保存实时热度到 localStorage
          const heat = data.data.heat;
          localStorage.setItem(`heat:${bookId}`, String(heat));
          console.log(`[InteractionBar] 点赞成功，热度: ${heat}`);
        }
      } else {
        // 请求失败，回滚状态
        setLiked(previousLiked);
        console.error('Like request failed');
      }
    } catch (error) {
      // 网络错误，回滚状态
      setLiked(previousLiked);
      console.error('Like error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 使用防抖包装点赞操作
  const debouncedLike = useDebounce(handleLike, 300);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-surface-200 py-3">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-around">
          {/* 加入书架 */}
          <button
            onClick={handleFavorite}
            disabled={isLoading}
            className={cn(
              'flex flex-col items-center gap-1 transition-opacity',
              isLoading && 'opacity-50',
              favorited ? 'text-primary-600' : 'text-surface-500'
            )}
          >
            <Bookmark
              className={cn('w-6 h-6', favorited && 'fill-current')}
            />
            <span className="text-xs">
              {favorited ? '已加入' : '书架'}
            </span>
          </button>

          {/* 点赞 */}
          <button
            onClick={debouncedLike}
            disabled={isLoading}
            className={cn(
              'flex flex-col items-center gap-1 transition-opacity',
              isLoading && 'opacity-50',
              liked ? 'text-red-500' : 'text-surface-500'
            )}
          >
            <Heart className={cn('w-6 h-6', liked && 'fill-current')} />
            <span className="text-xs">{liked ? '已赞' : '点赞'}</span>
          </button>

          {/* 打赏 */}
          <button
            className="flex flex-col items-center gap-1 text-yellow-500"
            disabled={isLoading}
          >
            <Gift className="w-6 h-6" />
            <span className="text-xs">打赏</span>
          </button>

          {/* 评论 */}
          <Link
            href={`/book/${bookId}#comments`}
            className="flex flex-col items-center gap-1 text-surface-500"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs">{commentCount}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
