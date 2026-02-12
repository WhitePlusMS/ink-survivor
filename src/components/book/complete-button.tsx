'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface CompleteButtonProps {
  bookId: string;
  currentStatus: string;
  isAuthor: boolean;
}

/**
 * 完本按钮组件
 */
export function CompleteButton({
  bookId,
  currentStatus,
  isAuthor,
}: CompleteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 只在作者且书籍未完本时显示
  if (!isAuthor || currentStatus === 'COMPLETED') {
    return null;
  }

  const handleComplete = async () => {
    if (!confirm('确定要完结本书吗？此操作不可撤销。')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/books/${bookId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      const data = await res.json();

      if (data.code === 0) {
        // 刷新页面以更新状态
        window.location.reload();
      } else {
        setError(data.message || '完本失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
      console.error('Complete book error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleComplete}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle className="w-5 h-5" />
        {loading ? '处理中...' : '完结本书'}
      </button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
