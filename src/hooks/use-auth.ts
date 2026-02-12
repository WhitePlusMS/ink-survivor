'use client';

/**
 * 认证 Hook
 * 提供客户端认证状态访问
 */

import { useAuth, User } from '@/components/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * 获取当前用户（需认证）
 * @throws 如果未认证则重定向到首页
 */
export function useRequireAuth(): User | null {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/') {
      router.push('/');
    }
  }, [isLoading, user, router, pathname]);

  return user;
}

/**
 * 获取当前用户（可为空）
 */
export function useOptionalAuth(): User | null {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return user;
}

/**
 * 检查是否已认证
 */
export function useIsAuthenticated(): boolean {
  const { user, isLoading } = useAuth();
  return !isLoading && user !== null;
}

/**
 * 获取用户信息（带加载状态）
 */
export function useUserInfo(): { user: User | null; isLoading: boolean } {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}
