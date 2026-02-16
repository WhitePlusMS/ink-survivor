'use client';

/**
 * 认证上下文 Provider
 * 提供全局认证状态管理
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Settings, AlertTriangle, X } from 'lucide-react';

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
  hasAgentConfig: boolean;
  showAgentConfigModal: boolean;
  setShowAgentConfigModal: (show: boolean) => void;
  dismissAgentConfigModal: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Agent 配置弹窗状态
  const [showAgentConfigModal, setShowAgentConfigModal] = useState(false);
  // 记录上次检查时的 agentConfig 状态，用于检测变化
  const [prevAgentConfigStatus, setPrevAgentConfigStatus] = useState<boolean | null>(null);

  // 判断用户是否有 Agent 配置
  const hasAgentConfig = user?.agentConfig !== null && user?.agentConfig !== undefined;

  /**
   * 关闭 Agent 配置弹窗
   * 记录用户选择"暂不配置"，之后不再主动提示
   */
  const dismissAgentConfigModal = () => {
    setShowAgentConfigModal(false);
    // 记录当前状态，防止再次自动弹出
    if (user?.agentConfig === null) {
      setPrevAgentConfigStatus(false);
    }
  };

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
        const newUser = data.data;
        setUser(newUser);

        // 检查 Agent 配置状态
        const currentHasConfig = newUser?.agentConfig !== null && newUser?.agentConfig !== undefined;
        const prevStatus = prevAgentConfigStatus;

        // 如果用户首次加载（prevStatus 为 null）且没有 Agent 配置，弹出提示
        // 或者用户之前有配置但现在没有了，也弹出提示
        if (!currentHasConfig && (prevStatus === null || prevStatus === true)) {
          setShowAgentConfigModal(true);
          setPrevAgentConfigStatus(false);
        } else if (currentHasConfig) {
          // 用户配置了 Agent，更新状态
          setPrevAgentConfigStatus(true);
        }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        refreshUser,
        clearError,
        hasAgentConfig,
        showAgentConfigModal,
        setShowAgentConfigModal,
        dismissAgentConfigModal,
      }}
    >
      {children}
      {/* Agent 配置提示弹窗 */}
      <AgentConfigPromptModal
        isOpen={showAgentConfigModal}
        onClose={dismissAgentConfigModal}
        onGoToConfig={() => {
          setShowAgentConfigModal(false);
          router.push('/profile/edit?firstLogin=true');
        }}
      />
    </AuthContext.Provider>
  );
}

/**
 * 使用认证上下文
 * 返回默认值而非抛出错误，避免 SSR 时的问题
 */
export function useAuth(): AuthContextType {
  // 先调用 useContext（Hooks 规则：必须在最顶层调用）
  const context = useContext(AuthContext);

  // SSR 检测：服务端环境直接返回默认值
  if (typeof window === 'undefined') {
    return {
      user: null,
      isLoading: true,
      error: null,
      login: () => {},
      logout: () => {},
      refreshUser: async () => {},
      clearError: () => {},
      hasAgentConfig: true,
      showAgentConfigModal: false,
      setShowAgentConfigModal: () => {},
      dismissAgentConfigModal: () => {},
    };
  }

  // SSR 时 context 可能为 null，返回默认值
  if (!context) {
    return {
      user: null,
      isLoading: true,
      error: null,
      login: () => {},
      logout: () => {},
      refreshUser: async () => {},
      clearError: () => {},
      hasAgentConfig: true,
      showAgentConfigModal: false,
      setShowAgentConfigModal: () => {},
      dismissAgentConfigModal: () => {},
    };
  }
  return context;
}

/**
 * Agent 配置提示弹窗组件
 */
function AgentConfigPromptModal({
  isOpen,
  onClose,
  onGoToConfig,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGoToConfig: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 弹窗内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-float p-6">
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>

          {/* 图标 */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Settings className="h-8 w-8 text-amber-600" />
            </div>
          </div>

          {/* 标题 */}
          <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
            配置您的 AI 分身
          </h2>

          {/* 内容 */}
          <p className="mb-6 text-center text-gray-600">
            您还没有配置 Agent，无法参加赛季比赛。配置 Agent 后，您的 AI 分身将自动参与赛季创作。
          </p>

          {/* 警告提示 */}
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700">
              重要提示：不配置 Agent 将无法参加任何赛季比赛，也无法获得赛季奖励。
            </p>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              暂不配置
            </Button>
            <Button
              onClick={onGoToConfig}
              className="flex-1 bg-primary-600 hover:bg-primary-700"
            >
              立即配置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 获取当前用户 ID（可在服务器组件使用）
 */
export async function getCurrentUserId(): Promise<string | null> {
  // 注意：此函数用于服务器组件，需要从 cookies() 获取
  // 实际使用需要在具体组件中调用
  return null;
}
