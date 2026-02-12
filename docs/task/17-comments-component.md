# 任务 17：评论组件与评论区

## 任务目标
实现评论列表和发表评论组件

## 依赖关系
- 任务 03（UI 组件）完成后
- 任务 09（评论模块）完成后

## 交付物清单

### 17.1 评论列表组件
- [ ] 评论卡片
- [ ] 人类/AI 区分显示
- [ ] 采纳标记显示

### 17.2 发表评论组件
- [ ] 评论输入框
- [ ] 评论按钮

### 17.3 评论列表页面
- [ ] `src/components/comments/comment-list.tsx`
- [ ] `src/components/comments/comment-form.tsx`

## 涉及文件清单
| 文件路径                                   | 操作 |
| ------------------------------------------ | ---- |
| `src/components/comments/comment-list.tsx` | 新建 |
| `src/components/comments/comment-item.tsx` | 新建 |
| `src/components/comments/comment-form.tsx` | 新建 |

## 详细设计

### 评论列表
```tsx
// src/components/comments/comment-list.tsx
'use client';

import { useState } from 'react';
import { CommentItem } from './comment-item';
import { CommentForm } from './comment-form';
import { Spinner } from '@/components/ui/spinner';

interface CommentListProps {
  bookId: string;
  initialComments?: any[];
}

export function CommentList({ bookId, initialComments }: CommentListProps) {
  const [comments, setComments] = useState(initialComments || []);
  const [loading, setLoading] = useState(!initialComments);
  const [hasMore, setHasMore] = useState(true);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/comments`);
      const data = await res.json();
      setComments(data.comments);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Load comments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewComment = (comment: any) => {
    setComments(prev => [comment, ...prev]);
  };

  return (
    <div>
      {/* 发表评论 */}
      <CommentForm bookId={bookId} onSubmit={handleNewComment} />

      {/* 评论列表 */}
      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <Spinner />
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            暂无评论，快来发表看法吧
          </div>
        )}
      </div>
    </div>
  );
}
```

### 评论项
```tsx
// src/components/comments/comment-item.tsx
import { User, Bot, MapPin, Check } from 'lucide-react';
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

export function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className={cn(
      'p-4 rounded-lg',
      comment.isAdopted ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
    )}>
      {/* 用户信息 */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          comment.isHuman ? 'bg-blue-100' : 'bg-purple-100'
        )}>
          {comment.isHuman ? (
            <User className="w-4 h-4 text-blue-600" />
          ) : (
            <Bot className="w-4 h-4 text-purple-600" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              @{comment.user?.nickname || `${comment.aiRole}Reader`}
            </span>
            {comment.isHuman ? (
              <span className="text-xs text-blue-600">人类</span>
            ) : (
              <span className="text-xs text-purple-600">AI 读者</span>
            )}
          </div>
        </div>

        {/* 采纳标记 */}
        {comment.isAdopted && (
          <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
            <Check className="w-3 h-3" />
            作者已采纳
          </span>
        )}
      </div>

      {/* 评论内容 */}
      <div className="text-gray-700 text-sm">{comment.content}</div>

      {/* 章节位置 */}
      {comment.chapter && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
          <MapPin className="w-3 h-3" />
          <span>第 {comment.chapter.chapterNumber} 章</span>
        </div>
      )}

      {/* 时间 */}
      <div className="text-xs text-gray-400 mt-2">
        {new Date(comment.createdAt).toLocaleString()}
      </div>
    </div>
  );
}
```

### 评论表单
```tsx
// src/components/comments/comment-form.tsx
'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

interface CommentFormProps {
  bookId: string;
  chapterId?: string;
  onSubmit?: (comment: any) => void;
}

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
        }),
      });

      if (res.ok) {
        const comment = await res.json();
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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="说点什么..."
        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={!content.trim() || submitting}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
}
```

## 验证标准
- [ ] 评论列表正确显示
- [ ] 人类/AI 评论区分显示
- [ ] 采纳标记正确显示
- [ ] 发表评论功能正常
重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现评论模块与互动系统`。