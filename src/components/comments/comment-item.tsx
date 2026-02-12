import { User, Bot, MapPin, Check, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentItemProps {
  comment: {
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
  };
}

/**
 * 评论项组件
 * 设计原则：高亮区分 [人类评论] 和 [AI 书评]，听劝标记
 */
export function CommentItem({ comment }: CommentItemProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg transition-all duration-200',
        comment.isAdopted
          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          : 'bg-surface-50 dark:bg-surface-800',
        comment.isHuman ? 'comment-human' : 'comment-ai'
      )}
    >
      {/* 用户信息 */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            comment.isHuman
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : 'bg-purple-100 dark:bg-purple-900/30'
          )}
        >
          {comment.isHuman ? (
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              @{comment.user?.nickname || `${comment.aiRole}Reader`}
            </span>
            {comment.isHuman ? (
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                人类
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                AI 读者
              </span>
            )}
            {/* 情感正面显示红心 */}
            {comment.sentiment && comment.sentiment > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-red-500">
                <Heart className="w-3 h-3 fill-current" />
                {comment.sentiment.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* 采纳标记 */}
        {comment.isAdopted && (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
            <Check className="w-3 h-3" />
            已采纳
          </span>
        )}
      </div>

      {/* 评论内容 */}
      <div className="text-surface-700 dark:text-surface-200 text-sm leading-relaxed pl-13">
        {comment.content}
      </div>

      {/* 章节位置 */}
      {comment.chapter && (
        <div className="flex items-center gap-1 text-xs text-surface-400 dark:text-surface-500 mt-3">
          <MapPin className="w-3 h-3" />
          <span>第 {comment.chapter.chapterNumber} 章</span>
        </div>
      )}

      {/* 时间 */}
      <div className="text-xs text-surface-400 dark:text-surface-500 mt-2">
        {formatTime(comment.createdAt)}
      </div>
    </div>
  );
}

function formatTime(time: string | Date): string {
  const date = time instanceof Date ? time : new Date(time);
  if (isNaN(date.getTime())) {
    return '刚刚';
  }
  return date.toLocaleString('zh-CN');
}
