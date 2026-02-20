'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitBranch, Loader2 } from 'lucide-react';

// 书籍类型
interface Book {
	id: string;
	title: string;
	author: {
		nickname: string;
	};
	status: string;
	currentChapter: number;
	totalChapters: number;
	chaptersPlan?: {
		number: number;
		title: string;
		summary: string;
	}[];
}

// 大纲结果
interface OutlineResult {
	success: boolean;
	title: string;
	summary: string;
	characters: {
		name: string;
		role: string;
		description: string;
	}[];
	chapters: {
		number: number;
		title: string;
		summary: string;
	}[];
}

export default function TestOutlinePage() {
	const [books, setBooks] = useState<Book[]>([]);
	const [selectedBook, setSelectedBook] = useState<string>('');
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<OutlineResult | null>(null);
	const [error, setError] = useState<string>('');
	const [logs, setLogs] = useState<string[]>([]);

	// 添加日志
	const addLog = (message: string) => {
		const timestamp = new Date().toLocaleTimeString();
		setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
		console.log(`[TestOutline] ${message}`);
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
				} else {
					setError('没有找到有大纲的书籍');
				}
			})
			.catch(err => {
				addLog(`获取书籍失败: ${err}`);
				setError('获取书籍列表失败');
			});
	}, []);

	// 测试生成大纲
	const testGenerateOutline = async () => {
		if (!selectedBook) return;

		setLoading(true);
		setError('');
		setResult(null);
		addLog(`开始生成大纲 - bookId: ${selectedBook}`);

		try {
			const response = await fetch(`/api/books/${selectedBook}/generate-outline`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					testMode: true, // 测试模式：不保存到数据库
				}),
			});

			const data = await response.json();
			addLog(`大纲生成完成: ${response.status}`);

			if (!response.ok) {
				throw new Error(data.error || data.message || '生成失败');
			}

			setResult(data.data);
			addLog(`大纲标题: ${data.data?.title}`);

			// 显示调试信息
			if (data.debug) {
				addLog(`\n========== 【System Prompt】==========\n${data.debug.systemPrompt}`);
				addLog(`\n========== 【User Prompt】==========\n${data.debug.userPrompt}`);
			}
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
				<div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
					<Link href="/admin/test" className="text-surface-700 hover:text-surface-900">
						<ArrowLeft className="w-6 h-6" />
					</Link>
					<GitBranch className="w-6 h-6 text-purple-600" />
					<h1 className="text-lg font-bold text-surface-900">大纲生成测试</h1>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-4 py-6">
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
								onChange={(e) => setSelectedBook(e.target.value)}
								className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
							>
								{books.map(book => (
									<option key={book.id} value={book.id}>
										{book.title} - {book.author.nickname}
									</option>
								))}
							</select>
						</div>

						{/* 测试按钮 */}
						<button
							onClick={testGenerateOutline}
							disabled={loading || !selectedBook}
							className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{loading ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									生成中...
								</>
							) : (
								<>
									<GitBranch className="w-5 h-5" />
									生成大纲
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
						<div className="bg-surface-50 px-6 py-4 border-b border-surface-200">
							<h2 className="text-lg font-bold text-surface-900">大纲结果</h2>
						</div>

						<div className="px-6 py-6">
							<div className="space-y-4">
								<div>
									<h3 className="font-bold text-lg">{result.title}</h3>
									<p className="text-surface-600">{result.summary}</p>
								</div>
								<div>
									<h4 className="font-semibold mb-2">角色：</h4>
									<div className="grid gap-2">
										{result.characters?.map((char, i) => (
											<div key={i} className="bg-surface-50 p-2 rounded">
												<span className="font-medium">{char.name}</span>
												<span className="text-surface-500 text-sm">（{char.role}）</span>
												<p className="text-surface-600 text-sm">{char.description}</p>
											</div>
										))}
									</div>
								</div>
								<div>
									<h4 className="font-semibold mb-2">章节：</h4>
									<div className="grid gap-2">
										{result.chapters?.map((ch, i) => (
											<div key={i} className="bg-surface-50 p-2 rounded">
												<span className="font-medium">第{ch.number}章 {ch.title}</span>
												<p className="text-surface-600 text-sm">{ch.summary}</p>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* 空状态 */}
				{!result && !loading && !error && books.length === 0 && (
					<div className="text-center py-12 text-surface-500">
						<GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
						<p>没有找到可测试的书籍</p>
					</div>
				)}
			</main>
		</div>
	);
}
