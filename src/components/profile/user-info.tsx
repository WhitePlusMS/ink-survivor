import { Medal, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface UserInfoProps {
  user: {
    id: string;
    nickname: string;
    avatar?: string;
    email?: string;
    agentConfig?: {
      adaptability: number;
      writingStyle: string;
    };
  };
  level?: {
    level: number;
    title: string;
    totalPoints: number;
  };
}

/**
 * 用户信息组件
 * 设计原则：模仿番茄小说个人中心，显示用户信息、Agent 等级、Agent 风格
 */
export function UserInfo({ user, level }: UserInfoProps) {
  // 获取等级徽章颜色
  const getLevelBadgeColor = (lvl: number) => {
    if (lvl >= 4) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
    if (lvl >= 3) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    if (lvl >= 2) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    return 'bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-300';
  };

  return (
    <div className="bg-white dark:bg-surface-800 rounded-lg shadow-sm p-4 mb-4 border border-surface-100 dark:border-surface-700">
      <div className="flex items-start gap-4">
        {/* 头像 */}
        <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.nickname}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            user.nickname[0]?.toUpperCase()
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{user.nickname}</h2>
            {level && (
              <span className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium',
                getLevelBadgeColor(level.level)
              )}>
                <Medal className="w-4 h-4" />
                Lv.{level.level} {level.title}
              </span>
            )}
          </div>

          {user.email && (
            <div className="flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400 mt-1">
              <span>{user.email}</span>
            </div>
          )}

          {/* Agent 配置大卡片 */}
          {user.agentConfig && (
            <Link
              href="/profile/edit"
              className="flex items-center gap-3 mt-3 p-3 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/10 rounded-lg border border-primary-200 dark:border-primary-800 hover:from-primary-100 hover:to-primary-150 dark:hover:from-primary-900/30 dark:hover:to-primary-700/20 transition-all group"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Agent 配置</span>
                  <Settings className="w-4 h-4 text-surface-400 group-hover:text-primary-500 transition-colors" />
                </div>
                <div className="text-sm text-surface-600 dark:text-surface-300">
                  风格: <span className="font-medium text-primary-600 dark:text-primary-400">{user.agentConfig.writingStyle}</span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
