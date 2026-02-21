'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: {
    nickname: string;
  };
  currentChapter: number;
  status: string;
  totalChapters: number;
}

interface ChapterData {
  success: boolean;
  bookId: string;
  bookTitle: string;
  chapterNumber: number;
  title: string;
  content: string;
  contentLength: number;
  author: string;
}

export default function TestChapterPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [targetChapter, setTargetChapter] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChapterData | null>(null);
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[TestChapter] ${message}`);
  };

  // 获取书籍列表
  useEffect(() => {
    fetch('/api/admin/test/books')
      .then(res => res.json())
      .then(data => {
        addLog(`获取到 ${data.length} 本书籍`);
        if (Array.isArray(data) && data.length > 0) {
          setBooks(data);
          setSelectedBook(data[0].id);
          setTargetChapter(1);
        } else {
          setError('没有找到有大纲的书籍');
        }
      })
      .catch(err => {
        console.error('[TestChapter] 获取书籍失败:', err);
        setError('获取书籍列表失败');
      });
  }, []);

  // 切换书籍时重置章节选择
  const handleBookChange = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    setSelectedBook(bookId);
    if (book) {
      setTargetChapter(1); // 重置为第1章
    }
  };

  // 生成章节
  const generateChapter = async () => {
    if (!selectedBook) return;

    setLoading(true);
    setError('');
    setResult(null);
    addLog(`开始生成章节 - bookId: ${selectedBook}, chapter: ${targetChapter}`);

    try {
      const response = await fetch('/api/admin/test/generate-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBook,
          chapterNumber: targetChapter,
        }),
      });

      const data = await response.json();
      addLog(`章节生成完成: ${response.status}`);

      if (!response.ok) {
        throw new Error(data.error || '生成失败');
      }

      setResult(data);
      addLog(`章节标题: ${data.title}, 字数: ${data.contentLength}`);
    } catch (err) {
      addLog(`错误: ${err}`);
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5dc]">
      {/* Header */}
      <header className="sticky top-0 bg-[#f5f5dc]/90 backdrop-blur-sm z-10 border-b border-surface-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="text-surface-700 hover:text-surface-900">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <FileText className="w-6 h-6 text-blue-600" />
          <h1 className="text-lg font-bold text-surface-900">章节生成测试</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">测试控制</h2>

          <div className="flex flex-wrap gap-4 items-end">
            {/* 选择书籍 */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                选择书籍
              </label>
              <select
                value={selectedBook}
                onChange={(e) => handleBookChange(e.target.value)}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {books.map(book => (
                  <option key={book.id} value={book.id}>
                    {book.title} - {book.author.nickname} ({book.totalChapters}章)
                  </option>
                ))}
              </select>
            </div>

            {/* 选择章节号 */}
            <div className="w-32">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                章节号
              </label>
              <select
                value={targetChapter}
                onChange={(e) => setTargetChapter(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {selectedBook && (() => {
                  const book = books.find(b => b.id === selectedBook);
                  const total = book?.totalChapters || 0;
                  return Array.from({ length: total }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>
                      第 {num} 章
                    </option>
                  ));
                })()}
              </select>
            </div>

            {/* 生成按钮 */}
            <button
              onClick={generateChapter}
              disabled={loading || !selectedBook}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  生成章节
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* 日志区域 */}
        <div className="bg-surface-900 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-2">控制台日志</h3>
          <div className="flex-1 min-h-[400px] overflow-y-auto font-mono text-xs text-green-400 space-y-1">
            {logs.length === 0 ? (
              <div className="text-surface-500">点击测试按钮开始...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))
            )}
          </div>
        </div>

        {/* 结果展示 */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* 结果头部 */}
            <div className="bg-surface-50 px-6 py-4 border-b border-surface-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-surface-900">{result.title}</h2>
                  <p className="text-sm text-surface-500 mt-1">
                    《{result.bookTitle}》第 {result.chapterNumber} 章 · 作者：{result.author} · {result.contentLength} 字
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  生成成功
                </span>
              </div>
            </div>

            {/* 章节内容 */}
            <div className="px-6 py-6">
              <div className="prose prose-lg max-w-none whitespace-pre-wrap text-surface-800 leading-relaxed">
                {result.content}
              </div>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!result && !loading && !error && books.length === 0 && (
          <div className="text-center py-12 text-surface-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>没有找到可测试的书籍</p>
          </div>
        )}
      </main>
    </div>
  );
}
