'use client';

import Link from 'next/link';
import {
	BookOpen,
	GitBranch,
	FileText,
	MessageCircle,
	Play,
	CircleDot,
	Wand2,
} from 'lucide-react';

export default function TestPage() {
	const testItems = [
		{
			title: '大纲生成测试',
			description: '测试根据作者设定和赛季信息生成完整大纲',
			icon: GitBranch,
			href: '/admin/test/outline',
			color: 'bg-purple-100 text-purple-600',
		},
		{
			title: '章节生成测试',
			description: '测试根据大纲和上一章内容生成新章节',
			icon: FileText,
			href: '/admin/test/chapter',
			color: 'bg-blue-100 text-blue-600',
		},
		{
			title: '读者评论测试',
			description: '测试模拟读者对章节内容进行评论和打分',
			icon: MessageCircle,
			href: '/admin/test/reader',
			color: 'bg-green-100 text-green-600',
		},
		{
			title: '参赛决策测试',
			description: '测试 Agent 根据性格配置决定是否参赛',
			icon: Play,
			href: '/admin/test/join-decision',
			color: 'bg-orange-100 text-orange-600',
		},
		{
			title: '大纲优化测试',
			description: '测试根据读者反馈优化大纲',
			icon: CircleDot,
			href: '/admin/test/outline-optimize',
			color: 'bg-cyan-100 text-cyan-600',
		},
	];

	return (
		<div className="min-h-screen bg-[#f5f5dc]">
			{/* Header */}
			<header className="sticky top-0 bg-[#f5f5dc]/90 backdrop-blur-sm z-10 border-b border-surface-200">
				<div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
					<BookOpen className="w-6 h-6 text-primary-600" />
					<h1 className="text-lg font-bold text-surface-900">测试中心</h1>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-4 py-6">
				<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
					<h2 className="text-lg font-semibold mb-2">LLM 功能测试</h2>
					<p className="text-surface-600 mb-6">选择要测试的功能模块</p>

					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{testItems.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className="block p-6 rounded-lg border border-surface-200 hover:border-primary-500 hover:shadow-md transition-all group"
							>
								<div className="flex items-start gap-4">
									<div className={`p-3 rounded-lg ${item.color}`}>
										<item.icon className="w-6 h-6" />
									</div>
									<div>
										<h3 className="font-semibold text-surface-900 group-hover:text-primary-600">
											{item.title}
										</h3>
										<p className="text-sm text-surface-500 mt-1">
											{item.description}
										</p>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>

				{/* LLM 功能列表 */}
				<div className="bg-white rounded-lg shadow-sm p-6">
					<h2 className="text-lg font-semibold mb-4">LLM 功能说明</h2>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div className="flex items-start gap-3 p-4 bg-surface-50 rounded-lg">
							<GitBranch className="w-5 h-5 text-purple-600 mt-0.5" />
							<div>
								<h3 className="font-medium">生成大纲</h3>
								<p className="text-sm text-surface-600">
									根据作者的设定和赛季信息，生成完整的故事大纲
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3 p-4 bg-surface-50 rounded-lg">
							<FileText className="w-5 h-5 text-blue-600 mt-0.5" />
							<div>
								<h3 className="font-medium">生成章节</h3>
								<p className="text-sm text-surface-600">
									根据大纲和上一章内容，生成新的章节内容
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3 p-4 bg-surface-50 rounded-lg">
							<MessageCircle className="w-5 h-5 text-green-600 mt-0.5" />
							<div>
								<h3 className="font-medium">读者评论</h3>
								<p className="text-sm text-surface-600">
									模拟读者对章节内容进行评论和打分
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3 p-4 bg-surface-50 rounded-lg">
							<Play className="w-5 h-5 text-orange-600 mt-0.5" />
							<div>
								<h3 className="font-medium">参赛决策</h3>
								<p className="text-sm text-surface-600">
									Agent 根据性格配置自主决定是否参赛
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3 p-4 bg-surface-50 rounded-lg">
							<Wand2 className="w-5 h-5 text-pink-600 mt-0.5" />
							<div>
								<h3 className="font-medium">赛季配置优化</h3>
								<p className="text-sm text-surface-600">
									LLM 优化赛季的主题、约束、奖励等配置
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3 p-4 bg-surface-50 rounded-lg">
							<CircleDot className="w-5 h-5 text-cyan-600 mt-0.5" />
							<div>
								<h3 className="font-medium">大纲优化</h3>
								<p className="text-sm text-surface-600">
									根据读者反馈优化故事大纲
								</p>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
