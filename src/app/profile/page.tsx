import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { userService } from '@/services/user.service';
import { UserInfo } from '@/components/profile/user-info';
import { StatsCard } from '@/components/profile/stats-card';
import { SeasonCard } from '@/components/profile/season-card';
import { LogoutButton } from '@/components/profile/logout-button';

export default async function ProfilePage() {
  const authToken = cookies().get('auth_token')?.value;

  // 未登录则显示登录提示
  if (!authToken) {
    return (
      <div className="min-h-screen bg-surface-50">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-surface-500 mb-4">请先登录</p>
            <Link
              href="/api/auth/login"
              className="text-primary-600 text-sm mt-2 inline-block hover:text-primary-700"
            >
              立即登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const user = await userService.getUserById(authToken);
  if (!user) {
    redirect('/api/auth/login');
  }

  const agentConfig = await userService.getAgentConfig(user.id);
  const level = await userService.getUserLevel(user.id);
  const participations = await userService.getSeasonParticipations(user.id);
  const { books } = await userService.getUserBooks(user.id, { limit: 10 });

  // 获取正在参赛的书籍（当前进行中赛季的 ACTIVE 书籍）及赛季信息
  const activeSeason = await prisma.season.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, seasonNumber: true, themeKeyword: true },
  });
  const booksInProgress = activeSeason
    ? await prisma.book.findFirst({
        where: {
          authorId: user.id,
          seasonId: activeSeason.id,
          status: 'ACTIVE',
        },
        include: {
          season: { select: { seasonNumber: true, themeKeyword: true } },
          _count: { select: { chapters: true } },
        },
      })
    : null;

  const userData = {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar ?? undefined,
    email: user.email ?? undefined,
    agentConfig: agentConfig ?? undefined,
  };

  const stats = {
    booksWritten: user.booksWritten,
    booksCompleted: level?.booksCompleted || 0,
    booksInProgress: booksInProgress ? 1 : 0,
    booksInProgressDetail: booksInProgress
      ? {
          id: booksInProgress.id,
          title: booksInProgress.title,
          seasonNumber: booksInProgress.season?.seasonNumber ?? 0,
          themeKeyword: booksInProgress.season?.themeKeyword ?? '',
          chapterCount: booksInProgress._count.chapters,
        }
      : null,
    seasonsJoined: user.seasonsJoined,
    totalInk: user.totalInk,
    highestRank: user.highestRank > 0 ? user.highestRank : undefined,
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-md mx-auto px-4 py-4">
        {/* 用户信息 */}
        <UserInfo user={userData} level={level || undefined} />

        {/* 创作统计 */}
        <StatsCard stats={stats} />

        {/* 赛季战绩 - 仅在有参赛记录时显示 */}
        {participations.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">赛季战绩</h3>
              <span className="text-sm text-surface-500">
                {participations.length} 次参赛
              </span>
            </div>

            {participations.map((p) => (
              <SeasonCard key={p.id} participation={p} />
            ))}
          </div>
        )}

        {/* 我的书籍 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">我的书籍</h3>
            <Link
              href="/create"
              className="text-primary-600 text-sm hover:text-primary-700"
            >
              新建书籍
            </Link>
          </div>

          {books && books.length > 0 ? (
            <div className="space-y-2">
              {books.map((book: any) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{book.title}</h4>
                      <p className="text-sm text-surface-500">
                        {book.chapterCount} 章 | {book.status === 'COMPLETED' ? '已完结' : '连载中'}
                      </p>
                    </div>
                    <span className="text-sm text-surface-400">
                      {book.zoneStyle}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-surface-500">
              <p>暂无书籍</p>
              <Link
                href="/create"
                className="text-primary-600 text-sm mt-2 inline-block hover:text-primary-700"
              >
                立即创建
              </Link>
            </div>
          )}
        </div>

        {/* 退出登录 */}
        <div className="mt-8 pt-4 border-t border-surface-200">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
