'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

interface CommentFormProps {
  bookId: string;
  chapterId?: string;
  onSubmit?: (comment: Record<string, unknown>) => void;
}

/**
 * 评论表单组件
 */
export function CommentForm({ bookId, chapterId, onSubmit }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/books/${bookId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          chapterId,
          isHuman: true, // 人类用户评论
        }),
      });

      if (res.ok) {
        const response = await res.json();
        const comment = response.data; // 从 data 字段提取评论
        console.log('[CommentForm] Submitted comment:', comment);
        onSubmit?.(comment);
        setContent('');
      }
    } catch (error) {
      console.error('Submit comment error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2" aria-label="发表评论">
      <label htmlFor="comment-input" className="sr-only">评论内容</label>
      <input
        id="comment-input"
        type="text"
        name="comment"
        autoComplete="off"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="说点什么..."
        className="flex-1 px-4 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={!content.trim() || submitting}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
}
