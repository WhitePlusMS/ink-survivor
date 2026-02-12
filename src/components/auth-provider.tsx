'use client';

/**
 * 认证上下文 Provider
 * 提供全局认证状态管理
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  secondMeId: string;
  nickname: string;
  avatar?: string;
  email?: string;
  totalInk: number;
  booksWritten: number;
  seasonsJoined: number;
  agentConfig: Record<string, unknown> | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 刷新用户信息
   */
  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/current-user');
      console.log('[AuthProvider] /api/auth/current-user status:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('[AuthProvider] User data:', data.data?.id);
        setUser(data.data);
        setError(null);
      } else {
        console.log('[AuthProvider] Not authenticated, status:', res.status);
        setUser(null);
      }
    } catch (err) {
      console.error('[AuthProvider] Fetch error:', err);
      setUser(null);
    }
  };

  /**
   * 清除错误状态
   */
  const clearError = () => {
    setError(null);
    // 清除 URL 中的错误参数
    const url = new URL(window.location.href);
    if (url.searchParams.has('error')) {
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  };

  /**
   * 初始化时获取用户信息
   */
  useEffect(() => {
    // 先检查 URL 中是否有错误参数
    const url = new URL(window.location.href);
    const errorParam = url.searchParams.get('error');
    if (errorParam) {
      setError(`认证失败: ${errorParam}`);
      console.log('[AuthProvider] Error from URL:', errorParam);
    }

    refreshUser().finally(() => setIsLoading(false));
  }, []);

  /**
   * 登录 - 跳转到授权页面
   */
  const login = () => {
    window.location.href = '/api/auth/login';
  };

  /**
   * 登出 - 清除 Cookie 并跳转首页
   */
  const logout = () => {
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, refreshUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 使用认证上下文
 * @throws 如果在 AuthProvider 外使用
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * 获取当前用户 ID（可在服务器组件使用）
 */
export async function getCurrentUserId(): Promise<string | null> {
  // 注意：此函数用于服务器组件，需要从 cookies() 获取
  // 实际使用需要在具体组件中调用
  return null;
}
