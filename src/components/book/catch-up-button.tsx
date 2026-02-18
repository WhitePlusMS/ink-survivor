'use client';

import { useState, useCallback, useRef } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CatchUpButtonProps {
  bookId: string;
  isAuthor: boolean;
}

interface CatchUpStatus {
  hasOutline: boolean;
  missingChapters: number[];
  targetRound: number;
  outlineChapters?: number[];      // GET 请求返回
  existingChapters?: number[];     // GET 请求返回
  currentChapters?: number[];      // POST 请求返回
  maxOutlineChapter?: number;      // POST 请求返回
  needsCatchUp?: boolean;
}

export function CatchUpButton({ bookId, isAuthor }: CatchUpButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<CatchUpStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 首次加载时获取状态
  const fetchStatus = useCallback(async () => {
    if (!isAuthor) return;

    try {
      const res = await fetch(`/api/books/${bookId}/catch-up`, {
        method: 'GET',
      });
      const data = await res.json();
      if (data.code === 0) {
        setStatus(data.data);
      }
    } catch (err) {
      console.error('获取补全状态失败:', err);
    }
  }, [bookId, isAuthor]);

  // 页面加载时获取状态
  if (isAuthor && !status) {
    fetchStatus();
  }

  // 如果不是作者，不显示按钮
  if (!isAuthor) {
    return null;
  }

  const handleCatchUp = async () => {
    // 防抖：如果正在加载，直接返回
    if (loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/books/${bookId}/catch-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();

      if (data.code === 0) {
        setStatus(data.data);
        if (data.data.missingChapters.length > 0) {
          setSuccess(`正在补全 ${data.data.missingChapters.length} 个缺失章节...`);
        } else {
          setSuccess('章节已完整，无需补全');
        }
      } else {
        setError(data.message || '补全失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('补全失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 判断是否需要显示按钮
  const needsCatchUp = status?.needsCatchUp || (status?.missingChapters && status.missingChapters.length > 0);
  // 按钮是否禁用：加载中、成功、无需补全
  const isButtonDisabled = loading || !!success || !needsCatchUp;

  return (
    <div className="mt-3">
      <button
        ref={buttonRef}
        onClick={handleCatchUp}
        disabled={isButtonDisabled}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          // 加载中、成功或无需补全时：灰色、不可点击
          isButtonDisabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95',
          // 成功状态
          success && 'bg-green-50 text-green-600'
        )}
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>补全中...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </>
        ) : (
          <>
            <RefreshCw className={cn('w-4 h-4', needsCatchUp && 'animate-spin-slow')} />
            <span>
              {needsCatchUp
                ? `补全章节 (缺 ${status?.missingChapters?.length || 0} 章)`
                : '章节已完整'}
            </span>
          </>
        )}
      </button>

      {/* 错误提示 */}
      {error && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}

      {/* 章节状态信息 */}
      {status && !error && (
        <div className="mt-2 text-xs text-gray-500">
          {status.missingChapters.length > 0 ? (
            <span>
              当前 {status.existingChapters?.join(', ') || status.currentChapters?.join(', ') || '无'} 章，
              大纲 {status.outlineChapters?.length || status.maxOutlineChapter || 0} 章，赛季 {status.targetRound} 轮
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
