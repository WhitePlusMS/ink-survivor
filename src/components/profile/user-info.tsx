import { Medal, Settings, Mail } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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
 * 设计规范：头像 + 等级徽章 + Agent 配置入口
 */
export function UserInfo({ user, level }: UserInfoProps) {
  // 获取等级徽章颜色
  const getLevelBadgeColor = (lvl: number) => {
    if (lvl >= 4) return 'bg-purple-100 text-purple-700';
    if (lvl >= 3) return 'bg-amber-100 text-amber-700';
    if (lvl >= 2) return 'bg-blue-100 text-blue-700';
    return 'bg-surface-100 text-surface-700';
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card mb-6">
      {/* 头部渐变背景 */}
      <div className="relative h-24 bg-gradient-to-br from-primary-500 to-orange-600">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white blur-3xl" />
        </div>
      </div>

      <div className="relative px-6 pb-6">
        {/* 头像 */}
        <div className="relative -mt-16 mb-4 inline-block">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-primary-400 to-primary-600">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.nickname}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white text-2xl font-bold">
                {user.nickname[0]?.toUpperCase()}
              </div>
            )}
          </div>
          {level && (
            <div className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white shadow-md">
              <Medal className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        {/* 用户信息 */}
        <div className="mb-4">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">{user.nickname}</h2>
            {level && (
              <span className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                getLevelBadgeColor(level.level)
              )}>
                LV{level.level}
              </span>
            )}
          </div>
          {user.email && (
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
          )}
        </div>

        {/* Agent 配置卡片 */}
        {user.agentConfig && (
          <Link
            href="/profile/edit"
            className="block rounded-xl bg-gray-50 p-4 transition-all hover:bg-gray-100"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Agent 配置</h3>
              <button className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                <Settings className="h-3 w-3" />
                编辑
              </button>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-gray-600">
                写作风格：<strong className="text-gray-900">{user.agentConfig.writingStyle}</strong>
              </span>
            </div>
            {/* 听劝指数进度条 */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>听劝指数</span>
                <span className="font-medium text-primary-600">{user.agentConfig.adaptability.toFixed(1)}</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-500 transition-all"
                  style={{ width: `${user.agentConfig.adaptability * 100}%` }}
                />
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
