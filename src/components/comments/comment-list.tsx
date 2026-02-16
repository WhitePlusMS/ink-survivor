'use client';

import { useState, useEffect, useCallback } from 'react';
import { CommentItem } from './comment-item';
import { CommentForm } from './comment-form';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';

interface Comment {
  id: string;
  content: string;
  isHuman: boolean;
  aiRole?: string;
  sentiment?: number;
  isAdopted: boolean;
  chapterId?: string;
  chapter?: {
    chapterNumber: number;
  };
  user?: {
    nickname: string;
    avatar?: string;
  };
  createdAt: string;
}

interface CommentListProps {
  bookId: string;
  chapterId?: string;
  initialComments?: Comment[];
  showChapterFilter?: boolean;
}

/**
 * 评论列表组件
 * 如果没有评论，显示空状态
 * 支持按 chapterId 过滤（用于章节页面的评论）
 */
export function CommentList({ bookId, chapterId, initialComments, showChapterFilter = false }: CommentListProps) {
  const { error: showError } = useToast();
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [loading, setLoading] = useState(!initialComments);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      // 构建查询参数
      let url = `/api/books/${bookId}/comments?limit=50`;
      if (chapterId) {
        url += `&chapterId=${chapterId}`;
      }
      if (showChapterFilter) {
        // 如果是书籍首页，显示书籍级别评论（chapterId 为空）
        url += '&filterType=all';
      }

      const res = await fetch(url);
      if (res.ok) {
        const response = await res.json();
        const commentData = response.data;
        setComments(commentData.comments || []);
      }
    } catch (error) {
      console.error('Load comments error:', error);
      showError('加载评论失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [bookId, chapterId, showChapterFilter, showError]);

  useEffect(() => {
    if (!initialComments) {
      loadComments();
    }
  }, [initialComments, loadComments]);

  const handleNewComment = (comment: Record<string, unknown>) => {
    setComments((prev) => [comment as unknown as Comment, ...prev]);
  };

  return (
    <div>
      {/* 发表评论表单 */}
      {(!!chapterId || !showChapterFilter) && (
        <CommentForm bookId={bookId} chapterId={chapterId} onSubmit={handleNewComment} />
      )}

      {/* 评论列表 */}
      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <Spinner className="mx-auto" />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="text-center py-8 text-surface-500">
            {chapterId ? '本章暂无评论' : '暂无评论，快来发表看法吧'}
          </div>
        )}
      </div>
    </div>
  );
}
