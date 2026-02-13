import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Share2, Flame, BookOpen, MessageCircle } from 'lucide-react';
import { bookService } from '@/services/book.service';
import { OutlineDisplay } from '@/components/book/outline-display';
import { CommentList } from '@/components/comments/comment-list';
import { FavoriteButton } from '@/components/book/favorite-button';
import { CompleteButton } from '@/components/book/complete-button';
import { cookies } from 'next/headers';
import { safeJsonField } from '@/lib/utils/jsonb-utils';
import type { Character, ChapterPlan } from '@/types/outline';

interface BookPageProps {
  params: { id: string };
}

export default async function BookPage({ params }: BookPageProps) {
  const book = await bookService.getBookById(params.id);

  if (!book) {
    notFound();
  }

  // 从 score.heatValue 获取热度，从 _count.chapters 获取章节数
  const heatValue = book.score?.heatValue ?? 0;
  const chapterCount = book._count?.chapters ?? 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-surface-200 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-surface-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="flex-1 truncate font-semibold">{book.title}</h1>
          <button className="text-surface-600">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 书籍信息 */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex gap-4 mb-4">
          {/* 封面占位 */}
          <div className="w-24 h-32 bg-gradient-to-b from-surface-200 to-surface-300 rounded-md flex-shrink-0" />

          <div>
            <h2 className="text-lg font-bold">{book.title}</h2>
            <p className="text-sm text-surface-500">@{book.author.nickname}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-surface-100 rounded text-xs">
                {book.zoneStyle}
              </span>
              <span className="text-sm text-surface-500">
                {book.status === 'COMPLETED' ? '已完结' : '连载中'}
              </span>
            </div>
          </div>
        </div>

        {/* 统计数据 */}
        <div className="flex items-center gap-6 py-3 border-t border-b border-surface-100">
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="w-5 h-5" />
            <span className="font-medium">{heatValue}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-5 h-5 text-surface-400" />
            <span className="text-sm text-surface-600">
              {chapterCount} 章
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-5 h-5 text-surface-400" />
            <span className="text-sm text-surface-600">
              {book._count?.comments || 0}
            </span>
          </div>
        </div>

        {/* 简介 */}
        {book.shortDesc && (
          <div className="py-4">
            <h3 className="font-medium mb-2 text-surface-700">简介</h3>
            <p className="text-surface-600 text-sm">{book.shortDesc}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 py-4">
          <Link
            href={`/book/${params.id}/chapter/1`}
            className="flex-1 py-3 bg-primary-600 text-white text-center rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            开始阅读
          </Link>
          <FavoriteButton bookId={params.id} />
        </div>

        {/* 完本按钮（仅作者可见） */}
        <CompleteButton
          bookId={params.id}
          currentStatus={book.status}
          isAuthor={book.authorId === cookies().get('auth_token')?.value}
        />
      </div>

      {/* 大纲 */}
      {book.outline && (
        <div className="max-w-md mx-auto px-4 py-4 border-t border-surface-100">
          <h3 className="font-medium mb-4 text-surface-700">大纲</h3>
          <OutlineDisplay
            outline={{
              summary: book.outline.originalIntent,
              characters_json: safeJsonField<Character[]>(book.outline.characters, []),
              chapters: safeJsonField<ChapterPlan[]>(book.outline.chaptersPlan, []),
            }}
          />
        </div>
      )}

      {/* 章节列表 */}
      <div className="max-w-md mx-auto px-4 py-4 border-t border-surface-100">
        <h3 className="font-medium mb-4 text-surface-700">章节列表</h3>
        <div className="space-y-2">
          {book.chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/book/${params.id}/chapter/${chapter.chapterNumber}`}
              className="flex items-center justify-between py-3 border-b border-surface-100 hover:bg-surface-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-surface-900">
                  第 {chapter.chapterNumber} 章
                </span>
                <span className="text-surface-500 text-sm">
                  {chapter.title}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-surface-500">
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
      <div id="comments" className="max-w-md mx-auto px-4 py-4 border-t border-surface-100">
        <h3 className="font-medium mb-4 text-surface-700">评论</h3>
        <CommentList bookId={params.id} />
      </div>
    </div>
  );
}
