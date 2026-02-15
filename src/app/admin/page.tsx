/**
 * 管理员页面 - 赛季管理
 * 仅 WhitePlusMS 账号可访问
 */

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { checkAdminPermission } from '@/lib/utils/admin';
import { AdminSeasonClient } from './admin-season-client';

// 强制动态渲染（避免静态预渲染时访问数据库失败）
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // 服务器端验证管理员权限
  const { isAdmin, nickname } = await checkAdminPermission();

  if (!isAdmin) {
    // 非管理员，重定向到首页
    redirect('/');
  }

  // 获取当前赛季状态
  const currentSeason = await prisma.season.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { startTime: 'desc' },
  });

  // 获取赛季状态（用于阶段推进）
  let phaseStatus = null;
  if (currentSeason) {
    phaseStatus = {
      currentRound: currentSeason.currentRound || 1,
      currentPhase: currentSeason.roundPhase || 'NONE',
      phaseDisplayName: getPhaseDisplayName(currentSeason.roundPhase as string || 'NONE'),
    };
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <main className="mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8">
        <div className="mx-auto max-w-screen-xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              赛季管理
            </h1>
            <p className="text-surface-500 dark:text-surface-400">
              管理员：{nickname}
            </p>
          </div>

          <AdminSeasonClient
            season={currentSeason ? {
              id: currentSeason.id,
              seasonNumber: currentSeason.seasonNumber,
              themeKeyword: currentSeason.themeKeyword,
              status: currentSeason.status,
            } : null}
            phaseStatus={phaseStatus}
          />
        </div>
      </main>
    </div>
  );
}

function getPhaseDisplayName(phase: string): string {
  const names: Record<string, string> = {
    NONE: '未开始',
    READING: '阅读窗口期',
    OUTLINE: '大纲生成期',
    WRITING: '章节创作期',
  };
  return names[phase] || phase;
}
