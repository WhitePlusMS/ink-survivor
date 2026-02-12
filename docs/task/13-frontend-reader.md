# 任务 13：前端页面 - 阅读器

## 任务目标
实现阅读器页面，支持章节阅读、阅读进度、互动操作

## 依赖关系
- 任务 03（UI 组件）完成后
- 任务 08（章节 API）完成后
- 任务 09（评论模块）完成后

## 交付物清单

### 13.1 阅读器页面布局
- [ ] 页面布局结构
- [ ] 返回导航

### 13.2 阅读器组件
- [ ] 章节内容展示组件
- [ ] 阅读进度组件
- [ ] 底部交互栏

### 13.3 互动操作
- [ ] 收藏按钮
- [ ] 点赞按钮
- [ ] 打赏按钮
- [ ] 催更按钮

### 13.4 阅读器页面
- [ ] `app/book/[id]/chapter/[num]/page.tsx` - 章节阅读页
- [ ] `app/book/[id]/page.tsx` - 书籍详情页

## 涉及文件清单
| 文件路径                                    | 操作 |
| ------------------------------------------- | ---- |
| `src/app/book/[id]/page.tsx`                | 新建 |
| `src/app/book/[id]/chapter/[num]/page.tsx`  | 新建 |
| `src/components/reader/reader-content.tsx`  | 新建 |
| `src/components/reader/chapter-nav.tsx`     | 新建 |
| `src/components/reader/interaction-bar.tsx` | 新建 |
| `src/components/reader/progress-bar.tsx`    | 新建 |

## 详细设计

### 章节内容展示
```tsx
// src/components/reader/reader-content.tsx
interface ReaderContentProps {
  content: string;
  title: string;
  chapterNumber: number;
}

export function ReaderContent({ content, title, chapterNumber }: ReaderContentProps) {
  return (
    <article className="prose prose-stone max-w-none">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          第 {chapterNumber} 章 {title}
        </h1>
      </header>

      <div className="leading-relaxed text-gray-800 space-y-4">
        {content.split('\n').map((paragraph, index) => (
          <p key={index} className="indent-4">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
```

### 章节导航
```tsx
// src/components/reader/chapter-nav.tsx
'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChapterNavProps {
  bookId: string;
  currentChapter: number;
  totalChapters: number;
}

export function ChapterNav({ bookId, currentChapter, totalChapters }: ChapterNavProps) {
  const prevChapter = currentChapter > 1 ? currentChapter - 1 : null;
  const nextChapter = currentChapter < totalChapters ? currentChapter + 1 : null;

  return (
    <div className="flex items-center justify-between py-4 border-t border-b">
      {prevChapter ? (
        <Link
          href={`/book/${bookId}/chapter/${prevChapter}`}
          className="flex items-center text-gray-600 hover:text-primary-600"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>上一章</span>
        </Link>
      ) : (
        <div />
      )}

      <span className="text-sm text-gray-500">
        {currentChapter} / {totalChapters}
      </span>

      {nextChapter ? (
        <Link
          href={`/book/${bookId}/chapter/${nextChapter}`}
          className="flex items-center text-gray-600 hover:text-primary-600"
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
```

### 互动栏
```tsx
// src/components/reader/interaction-bar.tsx
'use client';

import { useState } from 'react';
import { Bookmark, Heart, Gift, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractionBarProps {
  bookId: string;
  initialFavorited?: boolean;
  initialLiked?: boolean;
  commentCount?: number;
  onFavorite?: () => Promise<void>;
  onLike?: () => Promise<void>;
  onGift?: () => Promise<void>;
}

export function InteractionBar({
  bookId,
  initialFavorited = false,
  initialLiked = false,
  commentCount = 0,
}: InteractionBarProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [liked, setLiked] = useState(initialLiked);

  const handleFavorite = async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/favorite`, {
        method: 'POST',
      });
      if (res.ok) {
        setFavorited(!favorited);
      }
    } catch (error) {
      console.error('Favorite error:', error);
    }
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        setLiked(!liked);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-around">
          {/* 收藏 */}
          <button
            onClick={handleFavorite}
            className={cn(
              'flex flex-col items-center gap-1',
              favorited ? 'text-primary-600' : 'text-gray-500'
            )}
          >
            <Bookmark className={cn('w-6 h-6', favorited && 'fill-current')} />
            <span className="text-xs">{favorited ? '已收藏' : '收藏'}</span>
          </button>

          {/* 点赞 */}
          <button
            onClick={handleLike}
            className={cn(
              'flex flex-col items-center gap-1',
              liked ? 'text-red-500' : 'text-gray-500'
            )}
          >
            <Heart className={cn('w-6 h-6', liked && 'fill-current')} />
            <span className="text-xs">{liked ? '已赞' : '点赞'}</span>
          </button>

          {/* 打赏 */}
          <button className="flex flex-col items-center gap-1 text-yellow-500">
            <Gift className="w-6 h-6" />
            <span className="text-xs">打赏</span>
          </button>

          {/* 评论 */}
          <Link
            href={`/book/${bookId}#comments`}
            className="flex flex-col items-center gap-1 text-gray-500"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs">{commentCount}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 书籍详情页
```tsx
// src/app/book/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Share2, Flame, BookOpen, MessageCircle } from 'lucide-react';
import { bookService } from '@/services/book.service';
import { chapterService } from '@/services/chapter.service';
import { OutlineDisplay } from '@/components/book/outline-display';
import { CommentList } from '@/components/comments/comment-list';

interface BookPageProps {
  params: { id: string };
}

export default async function BookPage({ params }: BookPageProps) {
  const book = await bookService.getBookById(params.id);
  if (!book) notFound();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="flex-1 truncate font-semibold">{book.title}</h1>
          <button className="text-gray-600">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 书籍信息 */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex gap-4 mb-4">
          {/* 封面占位 */}
          <div className="w-24 h-32 bg-gradient-to-b from-gray-200 to-gray-300 rounded-md flex-shrink-0" />

          <div>
            <h2 className="text-lg font-bold">{book.title}</h2>
            <p className="text-sm text-gray-500">@{book.author.nickname}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                {book.zoneStyle}
              </span>
              <span className="text-sm text-gray-500">
                {book.status === 'COMPLETED' ? '已完结' : '连载中'}
              </span>
            </div>
          </div>
        </div>

        {/* 统计数据 */}
        <div className="flex items-center gap-6 py-3 border-t border-b">
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-5 h-5" />
            <span className="font-medium">{book.heat}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {book.chapterCount} 章
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {book._count?.comments || 0}
            </span>
          </div>
        </div>

        {/* 简介 */}
        {book.shortDesc && (
          <div className="py-4">
            <h3 className="font-medium mb-2">简介</h3>
            <p className="text-gray-600 text-sm">{book.shortDesc}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 py-4">
          <Link
            href={`/book/${params.id}/chapter/1`}
            className="flex-1 py-3 bg-primary-600 text-white text-center rounded-lg font-medium"
          >
            开始阅读
          </Link>
          <button className="px-4 py-3 border border-gray-300 rounded-lg">
            加入书架
          </button>
        </div>
      </div>

      {/* 大纲 */}
      <div className="max-w-md mx-auto px-4 py-4 border-t">
        <h3 className="font-medium mb-4">大纲</h3>
        {book.outline && <OutlineDisplay outline={book.outline} />}
      </div>

      {/* 章节列表 */}
      <div className="max-w-md mx-auto px-4 py-4 border-t">
        <h3 className="font-medium mb-4">章节列表</h3>
        <div className="space-y-2">
          {book.chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/book/${params.id}/chapter/${chapter.chapterNumber}`}
              className="flex items-center justify-between py-3 border-b"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-900">
                  第 {chapter.chapterNumber} 章
                </span>
                <span className="text-gray-500 text-sm">{chapter.title}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {chapter.status === 'PUBLISHED' && (
                  <>
                    <Flame className="w-4 h-4" />
                    <span>{chapter.readCount}</span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 评论区域 */}
      <div id="comments" className="max-w-md mx-auto px-4 py-4 border-t">
        <h3 className="font-medium mb-4">评论</h3>
        <CommentList bookId={params.id} />
      </div>
    </div>
  );
}
```

### 章节阅读页
```tsx
// src/app/book/[id]/chapter/[num]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { chapterService } from '@/services/chapter.service';
import { ReaderContent } from '@/components/reader/reader-content';
import { ChapterNav } from '@/components/reader/chapter-nav';
import { InteractionBar } from '@/components/reader/interaction-bar';

interface ChapterPageProps {
  params: { id: string; num: string };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const chapterNum = parseInt(params.num);
  const chapter = await chapterService.getChapter(params.id, chapterNum);

  if (!chapter) notFound();

  // 更新阅读量
  await chapterService.incrementReadCount(chapter.id);

  return (
    <div className="min-h-screen bg-[#f5f5dc]">
      {/* Header */}
      <header className="sticky top-0 bg-[#f5f5dc]/90 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/book/${params.id}`} className="text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <Link
            href={`/book/${params.id}`}
            className="flex-1 truncate text-sm text-gray-600"
          >
            <BookOpen className="w-4 h-4 inline mr-1" />
            {chapter.book.title}
          </Link>
        </div>
      </header>

      {/* 阅读内容 */}
      <article className="max-w-2xl mx-auto px-4 py-6">
        <ReaderContent
          content={chapter.content}
          title={chapter.title}
          chapterNumber={chapter.chapterNumber}
        />
      </article>

      {/* 章节导航 */}
      <div className="max-w-2xl mx-auto px-4">
        <ChapterNav
          bookId={params.id}
          currentChapter={chapter.chapterNumber}
          totalChapters={chapter.book.chapterCount || 10}
        />
      </div>

      {/* 互动栏 */}
      <InteractionBar
        bookId={params.id}
        commentCount={chapter.commentCount}
      />
    </div>
  );
}
```

## 验证标准
- [ ] 章节内容正确显示
- [ ] 阅读器样式符合番茄小说风格（米黄色背景）
- [ ] 收藏、点赞功能正常
- [ ] 章节导航正常

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现章节阅读器页面与互动功能`。