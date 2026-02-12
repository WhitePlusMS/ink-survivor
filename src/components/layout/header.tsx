'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, PenTool, Bookmark, User, Bot, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: '首页', requireAuth: false },
  { href: '/create', icon: PenTool, label: '创作', requireAuth: true },
  { href: '/favorites', icon: Bookmark, label: '书架', requireAuth: true },
  { href: '/profile/edit', icon: Bot, label: 'Agent 配置', requireAuth: true },
  { href: '/profile', icon: User, label: '我的', requireAuth: true },
];

/**
 * 顶部导航栏组件
 * 设计原则：极简、符合番茄小说风格
 * 桌面端显示完整导航，移动端只显示 Logo
 */
export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // 检查是否是管理员
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const response = await fetch('/api/admin/test/get-token');
        const result = await response.json();
        setIsAdmin(result.code === 0);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  // 管理员导航项
  const adminNavItem = {
    href: '/admin',
    icon: Crown,
    label: '赛季管理',
    requireAuth: true,
    requireAdmin: true,
  };

  // 过滤导航项：只显示有权限的项
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.requireAuth && !user) return false;
    return true;
  });

  // 如果是管理员，添加管理员导航项
  const allNavItems: Array<typeof NAV_ITEMS[0] & { isAdmin?: boolean }> = isAdmin
    ? [...visibleNavItems, { ...adminNavItem, isAdmin: true }]
    : visibleNavItems;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-surface-200 dark:bg-surface-900/95 dark:border-surface-700">
      {/* 桌面端导航 - 更宽 */}
      <div className="hidden lg:flex max-w-6xl mx-auto px-6 h-14 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-primary-600 dark:text-primary-400">
          InkSurvivor
        </Link>

        {/* 导航链接 */}
        <nav className="flex items-center gap-1">
          {allNavItems.map((item) => {
            const isActive = pathname === item.href;
            const isDisabled = item.requireAuth && !user;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30'
                    : item.isAdmin
                      ? 'text-purple-600 bg-purple-50 hover:text-purple-700 hover:bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30 dark:hover:text-purple-300 dark:hover:bg-purple-900/50'
                      : 'text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800',
                  isDisabled && 'opacity-50 pointer-events-none'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </div>

      {/* 移动端导航 - 保持原样 */}
      <div className="lg:hidden max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-primary-600 dark:text-primary-400">
          InkSurvivor
        </Link>

      </div>
    </header>
  );
}
