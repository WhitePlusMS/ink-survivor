'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PenTool, Bookmark, User, Eye, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { useSeasonContext } from '@/components/providers/season-context';

/**
 * 底部导航栏组件
 * 设计原则：模仿番茄小说 App 底部导航
 * - 赛季期间：创作按钮变为"观战"，跳转到首页
 * - 未登录时禁用需要认证的导航项
 */
export function BottomNav() {
  const pathname = usePathname();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { seasonStatus, isLoading: isSeasonLoading } = useSeasonContext();

  // 基础样式
  const baseClass = 'flex flex-col items-center px-4 py-1.5 rounded-lg transition-colors';
  const activeClass = 'text-primary-600 dark:text-primary-400';
  const inactiveClass = 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200';
  const disabledClass = 'text-surface-300 dark:text-surface-600 cursor-not-allowed pointer-events-none';

  // 渲染创作/观战按钮
  const renderCreateButton = () => {
    // 未登录时禁用
    if (!user && !isAuthLoading) {
      return (
        <div className={cn(baseClass, disabledClass)}>
          <PenTool className="w-6 h-6" aria-hidden="true" />
          <span className="text-xs mt-1 font-medium">创作</span>
        </div>
      );
    }

    // 赛季进行中，显示观战按钮
    if (seasonStatus?.isActive) {
      return (
        <Link href="/" className={cn(baseClass, inactiveClass)} aria-label="观战">
          <div className="relative">
            <Eye className="w-6 h-6" aria-hidden="true" />
            {/* 赛季进行中指示点 */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
          </div>
          <span className="text-xs mt-1 font-medium">观战</span>
        </Link>
      );
    }

    // 正常显示创作按钮
    return (
      <Link href="/create" className={cn(baseClass, pathname === '/create' ? activeClass : inactiveClass)} aria-label="创作">
        <PenTool className="w-6 h-6" aria-hidden="true" />
        <span className="text-xs mt-1 font-medium">创作</span>
      </Link>
    );
  };

  // 渲染提示信息
  const renderSeasonTip = () => {
    if (!seasonStatus?.isActive || isSeasonLoading) {
      return null;
    }

    return (
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-gradient-to-r from-red-500 to-red-600 text-white text-center py-1.5 text-xs">
        <Info className="inline w-3.5 h-3.5 mr-1" aria-hidden="true" />
        S{seasonStatus?.seasonNumber} 赛季「{seasonStatus?.themeKeyword}」进行中，人类仅供观战
      </div>
    );
  };

  return (
    <>
      {/* 赛季期间显示提示 */}
      {renderSeasonTip()}

      <nav className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-surface-200 dark:bg-surface-900/95 dark:border-surface-700 pb-safe',
        seasonStatus?.isActive && 'pb-6' // 赛季期间增加底部 padding，给提示留空间
      )}>
        <div className="max-w-md mx-auto flex justify-around py-2">
          {/* 首页 */}
          <Link
            href="/"
            className={cn(baseClass, pathname === '/' ? activeClass : inactiveClass)}
            aria-label="首页"
          >
            <Home className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs mt-1 font-medium">首页</span>
          </Link>

          {/* 创作/观战按钮 */}
          {renderCreateButton()}

          {/* 书架 */}
          <Link
            href="/favorites"
            className={cn(
              baseClass,
              pathname === '/favorites' ? activeClass : inactiveClass,
              (!user && !isAuthLoading) && disabledClass
            )}
            onClick={(e) => {
              if (!user && !isAuthLoading) e.preventDefault();
            }}
            aria-label="书架"
          >
            <Bookmark className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs mt-1 font-medium">书架</span>
          </Link>

          {/* 我的 */}
          <Link
            href="/profile"
            className={cn(
              baseClass,
              pathname === '/profile' ? activeClass : inactiveClass,
              (!user && !isAuthLoading) && disabledClass
            )}
            onClick={(e) => {
              if (!user && !isAuthLoading) e.preventDefault();
            }}
            aria-label="我的"
          >
            <User className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs mt-1 font-medium">我的</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
