'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CircleDot, Loader2, History } from 'lucide-react';

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

// 大纲版本
interface OutlineVersion {
	id: string;
	version: number;
	roundCreated: number;
	reason: string | null;
	createdAt: string;
	chaptersPlan: {
		number: number;
		title: string;
		summary: string;
	}[];
}

// 章节评论
interface ChapterComment {
	chapterNumber: number;
	comments: {
		type: 'ai' | 'human';
		content: string;
		rating?: number;
	}[];
}

// 优化结果
interface OptimizeResult {
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
	originalChapters?: {  // 优化前的大纲（用于对比）
		number: number;
		title: string;
		summary: string;
	}[];
}

export default function TestOutlineOptimizePage() {
	const [books, setBooks] = useState<Book[]>([]);
	const [selectedBook, setSelectedBook] = useState<string>('');
	const [targetRound, setTargetRound] = useState<number>(0); // 0 = 自动计算
	const [testMode, setTestMode] = useState<boolean>(true); // 测试模式默认开启
	const [testComments, setTestComments] = useState<string>(''); // 测试用的人类评论
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<OptimizeResult | null>(null);
	const [error, setError] = useState<string>('');
	const [logs, setLogs] = useState<string[]>([]);

	// 当前书籍详情
	const [bookDetail, setBookDetail] = useState<{
		versions: OutlineVersion[];
		comments: ChapterComment[];
	} | null>(null);
	const [showDetail, setShowDetail] = useState(false);

	// 添加日志
	const addLog = (message: string) => {
		const timestamp = new Date().toLocaleTimeString();
		setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
		console.log(`[TestOutlineOptimize] ${message}`);
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

	// 获取书籍详情（版本历史、评论）
	const fetchBookDetail = async (bookId: string) => {
		try {
			// 获取大纲版本历史
			const versionsRes = await fetch(`/api/books/${bookId}/outline-versions`);
			const versionsData = await versionsRes.json();

			// 获取章节评论
			const commentsRes = await fetch(`/api/books/${bookId}/comments-summary`);
			const commentsData = await commentsRes.json();

			setBookDetail({
				versions: versionsData.data || [],
				comments: commentsData.data || [],
			});
			addLog(`获取到 ${versionsData.data?.length || 0} 个大纲版本，${commentsData.data?.length || 0} 章评论`);
		} catch (err) {
			addLog(`获取书籍详情失败: ${err}`);
		}
	};

	// 切换书籍时重置
	const handleBookChange = (bookId: string) => {
		setSelectedBook(bookId);
		setResult(null);
		setBookDetail(null);
		setShowDetail(false);
	};

	// 切换详情显示
	const toggleDetail = () => {
		if (!showDetail && selectedBook) {
			fetchBookDetail(selectedBook);
		}
		setShowDetail(!showDetail);
	};

	// 测试大纲优化
	const testOutlineOptimize = async () => {
		if (!selectedBook) return;

		setLoading(true);
		setError('');
		setResult(null);
		setLogs([]);
		addLog(`========== 开始大纲优化测试 ==========`);
		addLog(`书籍ID: ${selectedBook}`);
		addLog(`目标轮次: ${targetRound === 0 ? '自动计算' : targetRound}`);
		addLog(`测试模式: ${testMode ? '开启（不写入数据库）' : '关闭'}`);

		try {
			// 构建请求体
			const requestBody: Record<string, unknown> = {
				testMode,
			};
			if (targetRound > 0) {
				requestBody.round = targetRound;
			}
			// 添加测试评论（仅在测试模式且有评论时）
			if (testMode && testComments.trim()) {
				requestBody.testComments = [
					{ type: 'human' as const, content: testComments.trim() }
				];
			}

			addLog(`调用 API: POST /api/books/${selectedBook}/optimize-outline`);
			addLog(`请求参数: ${JSON.stringify(requestBody)}`);

			// 调用大纲优化 API
			const response = await fetch(`/api/books/${selectedBook}/optimize-outline`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
			});

			const data = await response.json();
			addLog(`API 返回状态: ${response.status}`);

			if (!response.ok) {
				throw new Error(data.message || '优化失败');
			}

			setResult(data.data);
			addLog(`大纲优化成功`);
			addLog(`书名: ${data.data?.title}`);
			addLog(`章节数: ${data.data?.chapters?.length || 0}`);

			// 显示当前书籍的关键信息
			const selectedBookData = books.find(b => b.id === selectedBook);
			if (selectedBookData) {
				addLog(`当前章节数: ${selectedBookData.currentChapter}`);
				addLog(`大纲章节数: ${selectedBookData.totalChapters}`);
			}

			addLog(`========== 测试完成 ==========`);

			// 刷新书籍详情
			if (selectedBook) {
				fetchBookDetail(selectedBook);
			}
		} catch (err) {
			addLog(`错误: ${err}`);
			setError(err instanceof Error ? err.message : '优化失败');
		} finally {
			setLoading(false);
		}
	};

	// 获取当前选中的书籍
	const currentBook = books.find(b => b.id === selectedBook);

	return (
		<div className="min-h-screen bg-[#f5f5dc]">
			{/* Header */}
			<header className="sticky top-0 bg-[#f5f5dc]/90 backdrop-blur-sm z-10 border-b border-surface-200">
				<div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
					<Link href="/admin/test" className="text-surface-700 hover:text-surface-900">
						<ArrowLeft className="w-6 h-6" />
					</Link>
					<CircleDot className="w-6 h-6 text-cyan-600" />
					<h1 className="text-lg font-bold text-surface-900">大纲优化测试</h1>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-4 py-6">
				{/* 控制面板 */}
				<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
					<h2 className="text-lg font-semibold mb-4">测试控制</h2>

					<div className="flex flex-wrap gap-4 items-end">
						{/* 选择书籍 */}
						<div className="flex-1 min-w-[250px]">
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
										{book.title} - {book.author.nickname} (已写{book.currentChapter}章/大纲{book.totalChapters}章)
									</option>
								))}
							</select>
						</div>

						{/* 目标轮次 */}
						<div className="w-[150px]">
							<label className="block text-sm font-medium text-surface-700 mb-1">
								目标轮次
							</label>
							<input
								type="number"
								min="0"
								value={targetRound}
								onChange={(e) => setTargetRound(parseInt(e.target.value) || 0)}
								className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
								placeholder="0=自动"
							/>
							<p className="text-xs text-surface-500 mt-1">0 = 根据当前章节自动计算</p>
						</div>

						{/* 测试模式 */}
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="testMode"
								checked={testMode}
								onChange={(e) => setTestMode(e.target.checked)}
								className="w-4 h-4 text-cyan-600 rounded"
							/>
							<label htmlFor="testMode" className="text-sm text-surface-700">
								测试模式
							</label>
							<span className="text-xs text-surface-500">(不写入数据库)</span>
						</div>

						{/* 测试评论输入框（仅在测试模式显示） */}
						{testMode && (
							<div className="w-full">
								<label className="block text-sm font-medium text-surface-700 mb-1">
									人类评论（仅测试用）
								</label>
								<input
									type="text"
									value={testComments}
									onChange={(e) => setTestComments(e.target.value)}
									className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
									placeholder="输入测试用的人类评论..."
								/>
								<p className="text-xs text-surface-500 mt-1">不输入则使用数据库中的真实评论</p>
							</div>
						)}

						{/* 详情按钮 */}
						<button
							onClick={toggleDetail}
							className="px-4 py-2 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 flex items-center gap-2"
						>
							<History className="w-4 h-4" />
							{showDetail ? '隐藏详情' : '查看详情'}
						</button>

						{/* 测试按钮 */}
						<button
							onClick={testOutlineOptimize}
							disabled={loading || !selectedBook}
							className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{loading ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									优化中...
								</>
							) : (
								<>
									<CircleDot className="w-5 h-5" />
									执行大纲优化
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

				{/* 书籍详情区域 */}
				{showDetail && bookDetail && currentBook && (
					<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
						<h3 className="text-lg font-semibold mb-4">书籍详情 - {currentBook.title}</h3>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* 基本信息 */}
							<div className="bg-surface-50 p-4 rounded-lg">
								<h4 className="font-medium mb-2">基本信息</h4>
								<div className="text-sm space-y-1">
									<p>作者: {currentBook.author.nickname}</p>
									<p>状态: {currentBook.status}</p>
									<p>已写章节: {currentBook.currentChapter}</p>
									<p>大纲章节: {currentBook.totalChapters}</p>
								</div>
							</div>

							{/* 大纲版本历史 */}
							<div className="bg-surface-50 p-4 rounded-lg">
								<h4 className="font-medium mb-2">大纲版本 ({bookDetail.versions.length})</h4>
								<div className="text-sm max-h-[200px] overflow-y-auto">
									{bookDetail.versions.length === 0 ? (
										<p className="text-surface-500">暂无版本历史</p>
									) : (
										bookDetail.versions.map(v => (
											<div key={v.id} className="border-b border-surface-200 py-2 last:border-0">
												<p className="font-medium">v{v.version} - 第{v.roundCreated}轮</p>
												<p className="text-surface-500 text-xs">{v.reason || '初始版本'}</p>
												<p className="text-xs text-surface-400">{new Date(v.createdAt).toLocaleString()}</p>
											</div>
										))
									)}
								</div>
							</div>
						</div>

						{/* 评论摘要 */}
						<div className="mt-4 bg-surface-50 p-4 rounded-lg">
							<h4 className="font-medium mb-2">章节评论 ({bookDetail.comments.length}章有评论)</h4>
							<div className="text-sm max-h-[200px] overflow-y-auto">
								{bookDetail.comments.length === 0 ? (
									<p className="text-surface-500">暂无评论</p>
								) : (
									bookDetail.comments.map(ch => (
										<div key={ch.chapterNumber} className="border-b border-surface-200 py-2 last:border-0">
											<p className="font-medium">第{ch.chapterNumber}章 ({ch.comments.length}条评论)</p>
											{ch.comments.slice(0, 2).map((c, i) => (
												<p key={i} className="text-xs text-surface-600 truncate">
													{c.type === 'ai' ? '[AI]' : '[人类]'} {c.content}
												</p>
											))}
										</div>
									))
								)}
							</div>
						</div>
					</div>
				)}

				{/* 日志区域 */}
				<div className="bg-surface-900 rounded-lg p-4 mb-6">
					<h3 className="text-sm font-semibold text-surface-300 mb-2">控制台日志</h3>
					<div className="flex-1 min-h-[400px] overflow-y-auto font-mono text-xs text-green-400 space-y-1">
						{logs.length === 0 ? (
							<div className="text-surface-500">点击&quot;执行大纲优化&quot;按钮开始测试...</div>
						) : (
							logs.map((log, i) => (
								<div key={i} className="whitespace-pre-wrap">{log}</div>
							))
						)}
					</div>
				</div>

				{/* 结果展示 */}
				{result && (
					<div className="bg-white rounded-lg shadow-sm overflow-hidden">
						<div className="bg-surface-50 px-6 py-4 border-b border-surface-200">
							<h2 className="text-lg font-bold text-surface-900">大纲优化结果</h2>
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

								{/* 章节对比展示 */}
								<div>
									<h4 className="font-semibold mb-2">章节大纲对比：</h4>

									{/* 有优化前大纲时显示对比 */}
									{result.originalChapters && result.originalChapters.length > 0 ? (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* 优化前 */}
											<div className="border border-red-200 rounded-lg p-3">
												<h5 className="font-medium text-red-600 mb-2">优化前</h5>
												<div className="space-y-2">
													{result.originalChapters.map((ch, i) => (
														<div key={i} className="bg-red-50 p-2 rounded text-sm">
															<span className="font-medium">第{ch.number}章 {ch.title}</span>
															<p className="text-surface-600 text-xs mt-1">{ch.summary}</p>
														</div>
													))}
												</div>
											</div>

											{/* 优化后 */}
											<div className="border border-green-200 rounded-lg p-3">
												<h5 className="font-medium text-green-600 mb-2">优化后</h5>
												<div className="space-y-2">
													{result.chapters.map((ch, i) => (
														<div key={i} className="bg-green-50 p-2 rounded text-sm">
															<span className="font-medium">第{ch.number}章 {ch.title}</span>
															<p className="text-surface-600 text-xs mt-1">{ch.summary}</p>
														</div>
													))}
												</div>
											</div>
										</div>
									) : (
										/* 无优化前大纲时只显示当前大纲 */
										<div className="grid gap-2">
											{result.chapters?.map((ch, i) => (
												<div key={i} className="bg-surface-50 p-2 rounded">
													<span className="font-medium">第{ch.number}章 {ch.title}</span>
													<p className="text-surface-600 text-sm">{ch.summary}</p>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* 空状态 */}
				{!result && !loading && !error && books.length === 0 && (
					<div className="text-center py-12 text-surface-500">
						<CircleDot className="w-12 h-12 mx-auto mb-4 opacity-50" />
						<p>没有找到可测试的书籍</p>
					</div>
				)}
			</main>
		</div>
	);
}
