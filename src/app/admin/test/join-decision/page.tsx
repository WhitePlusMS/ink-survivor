'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';

// 参赛决策结果
interface JoinDecisionResult {
	success: boolean;
	decision: 'join' | 'skip';
	bookTitle?: string;
	shortDescription?: string;
	zoneStyle?: string;
	reason?: string;
}

// 单个用户决策
interface UserDecision {
	userId: string;
	userName: string;
	decision: string;
	bookTitle?: string;
	shortDescription?: string;
	zoneStyle?: string;
	reason?: string;
	success: boolean;
	rawResponse?: string; // 原始 LLM 响应用于调试
}

// 批量决策结果
interface BatchDecisionResult {
	seasonTheme: string;
	totalUsers: number;
	joinCount: number;
	skipCount: number;
	results: UserDecision[];
}

export default function TestJoinDecisionPage() {
	const [testMode, setTestMode] = useState(true);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<BatchDecisionResult | null>(null);
	const [error, setError] = useState<string>('');
	const [logs, setLogs] = useState<string[]>([]);

	// 添加日志
	const addLog = (message: string) => {
		const timestamp = new Date().toLocaleTimeString();
		setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
		console.log(`[TestJoinDecision] ${message}`);
	};

	// 测试参赛决策（批量测试所有有 Agent 配置的用户）
	const testJoinDecision = async () => {
		setLoading(true);
		setError('');
		setResult(null);
		addLog(`开始测试所有 Agent 的参赛决策${testMode ? '（测试模式）' : ''}`);

		try {
			// 调用参赛决策 API
			const response = await fetch('/api/admin/test/join-decision', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					testMode,
				}),
			});

			const data = await response.json();
			addLog(`参赛决策完成: ${response.status}`);

			if (!response.ok) {
				throw new Error(data.message || '决策失败');
			}

			setResult(data.data);
			addLog(`总计：${data.data.totalUsers} 个用户，${data.data.joinCount} 个参赛，${data.data.skipCount} 个弃权`);

			// 显示每个用户的原始 LLM 响应
			for (const r of data.data.results) {
				if (r.rawResponse) {
					addLog(`\n========== 【${r.userName} 原始返回】==========\n${r.rawResponse}`);
				}
			}
		} catch (err) {
			addLog(`错误: ${err}`);
			setError(err instanceof Error ? err.message : '测试失败');
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
					<Play className="w-6 h-6 text-orange-600" />
					<h1 className="text-lg font-bold text-surface-900">参赛决策测试</h1>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-4 py-6">
				{/* 控制面板 */}
				<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
					<h2 className="text-lg font-semibold mb-4">测试控制</h2>

					<div className="flex flex-wrap gap-4 items-end">
						{/* 测试模式开关 */}
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id="testMode"
								checked={testMode}
								onChange={(e) => setTestMode(e.target.checked)}
								className="w-4 h-4 text-orange-600 rounded"
							/>
							<label htmlFor="testMode" className="text-sm text-surface-700">
								测试模式（使用模拟赛季数据）
							</label>
						</div>

						{/* 测试按钮 */}
						<button
							onClick={testJoinDecision}
							disabled={loading}
							className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{loading ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									测试中...
								</>
							) : (
								<>
									<Play className="w-5 h-5" />
									测试所有 Agent 决策
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
					<div className="flex-1 min-h-[300px] overflow-y-auto font-mono text-xs text-green-400 space-y-1">
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
							<h2 className="text-lg font-bold text-surface-900">参赛决策结果</h2>
							<p className="text-sm text-surface-600">赛季主题：{result.seasonTheme}</p>
						</div>

						<div className="px-6 py-4">
							<div className="flex gap-4 mb-4">
								<div className="text-center">
									<div className="text-2xl font-bold">{result.totalUsers}</div>
									<div className="text-sm text-surface-500">总用户数</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-green-600">{result.joinCount}</div>
									<div className="text-sm text-surface-500">参赛</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-red-600">{result.skipCount}</div>
									<div className="text-sm text-surface-500">弃权</div>
								</div>
							</div>

							<div className="space-y-3">
								{result.results.map((r, i) => (
									<div key={i} className={`p-3 rounded-lg border ${r.decision === 'join' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
										<div className="flex items-center gap-2 mb-1">
											<span className="font-medium">{r.userName}</span>
											<span className={`text-sm ${r.decision === 'join' ? 'text-green-600' : 'text-red-600'}`}>
												{r.decision === 'join' ? '参赛' : '弃权'}
											</span>
										</div>
										{r.decision === 'join' && r.bookTitle && (
											<div className="text-sm">
												<span className="font-medium">《{r.bookTitle}》</span>
												{r.shortDescription && <span className="text-surface-600"> - {r.shortDescription}</span>}
											</div>
										)}
										{r.reason && <div className="text-sm text-surface-500 mt-1">原因：{r.reason}</div>}
									</div>
								))}
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
