# 任务 14：前端页面 - 个人中心

## 任务目标
实现个人中心页面，展示用户信息、Agent 配置、赛季战绩

## 依赖关系
- 任务 03（UI 组件）完成后
- 任务 04（OAuth2）完成后

## 交付物清单

### 14.1 用户信息组件
- [ ] 头像显示
- [ ] 用户信息展示
- [ ] 等级标识

### 14.2 Agent 配置组件
- [ ] 性格设定
- [ ] 听劝指数滑块
- [ ] 写作风格选择

### 14.3 赛季战绩组件
- [ ] 赛季卡片
- [ ] 赛季统计

### 14.4 个人中心页面
- [ ] `app/profile/page.tsx` - 个人中心
- [ ] `app/profile/edit/page.tsx` - 编辑页面

## 涉及文件清单
| 文件路径                                  | 操作 |
| ----------------------------------------- | ---- |
| `src/app/profile/page.tsx`                | 新建 |
| `src/app/profile/edit/page.tsx`           | 新建 |
| `src/components/profile/user-info.tsx`    | 新建 |
| `src/components/profile/agent-config.tsx` | 新建 |
| `src/components/profile/season-card.tsx`  | 新建 |
| `src/components/profile/season-stats.tsx` | 新建 |

## 详细设计

### 用户信息组件
```tsx
// src/components/profile/user-info.tsx
import { Star, Mail } from 'lucide-react';

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

export function UserInfo({ user, level }: UserInfoProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-start gap-4">
        {/* 头像 */}
        <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          {user.avatar ? (
            <img src={user.avatar} alt={user.nickname} className="w-full h-full rounded-full" />
          ) : (
            user.nickname[0].toUpperCase()
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">{user.nickname}</h2>
            {level && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                <Star className="w-4 h-4" />
                Lv.{level.level} {level.title}
              </span>
            )}
          </div>

          {user.email && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Mail className="w-4 h-4" />
              {user.email}
            </div>
          )}

          {user.agentConfig && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <span>听劝指数: {user.agentConfig.adaptability}</span>
              <span>|</span>
              <span>风格: {user.agentConfig.writingStyle}</span>
            </div>
          )}
        </div>

        {/* 设置按钮 */}
        <a href="/profile/edit" className="text-gray-500 hover:text-gray-700">
          <Settings className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}
```

### 创作统计
```tsx
// src/components/profile/stats-card.tsx
import { BookOpen, Trophy, Coins, Medal } from 'lucide-react';

interface StatsCardProps {
  stats: {
    booksWritten: number;
    booksCompleted: number;
    seasonsJoined: number;
    totalInk: number;
    highestRank?: number;
  };
}

export function StatsCard({ stats }: StatsCardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 text-gray-500 mb-1">
          <BookOpen className="w-5 h-5" />
          <span className="text-sm">创作统计</span>
        </div>
        <div className="text-2xl font-bold">
          {stats.booksWritten} <span className="text-sm font-normal text-gray-500">本</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          完本 {stats.booksCompleted} 本 | 参赛 {stats.seasonsJoined} 次
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 text-gray-500 mb-1">
          <Coins className="w-5 h-5" />
          <span className="text-sm">资产</span>
        </div>
        <div className="text-2xl font-bold text-yellow-600">
          {stats.totalInk.toLocaleString()}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Ink 余额
        </div>
      </div>

      <div className="col-span-2 bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          <Trophy className="w-5 h-5" />
          <span className="text-sm">最高战绩</span>
        </div>
        <div className="flex items-center gap-4">
          {stats.highestRank ? (
            <div className="flex items-center gap-2">
              <Medal className="w-8 h-8 text-yellow-500" />
              <div>
                <div className="text-xl font-bold">第 {stats.highestRank} 名</div>
                <div className="text-xs text-gray-400">历史最佳排名</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">暂无排名</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 赛季战绩卡片
```tsx
// src/components/profile/season-card.tsx
import Link from 'next/link';
import { Trophy, Medal, BookOpen, Coins, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeasonCardProps {
  participation: {
    id: string;
    season: {
      id: string;
      seasonNumber: number;
      themeKeyword: string;
      status: string;
    };
    bookTitle: string;
    zoneStyle: string;
    status: string;
    submittedAt: Date;
  };
}

export function SeasonCard({ participation }: SeasonCardProps) {
  const { season, bookTitle, zoneStyle, status } = participation;

  // 获取状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'COMPLETED':
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'ACTIVE':
        return <Circle className="w-5 h-5 text-green-500" />;
      case 'DISCONTINUED':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (status) {
      case 'COMPLETED':
        return '冠军';
      case 'ACTIVE':
        return '进行中';
      case 'DISCONTINUED':
        return '断更';
      default:
        return status;
    }
  };

  return (
    <Link
      href={`/profile/season/${season.id}`}
      className="bg-white rounded-lg shadow-sm p-4 mb-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">
            S{season.seasonNumber} 赛季：{season.themeKeyword}
          </span>
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs',
          status === 'COMPLETED' && 'bg-yellow-100 text-yellow-700',
          status === 'ACTIVE' && 'bg-green-100 text-green-700',
          status === 'DISCONTINUED' && 'bg-red-100 text-red-700'
       getStatusText()}
 )}>
          {        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <BookOpen className="w-4 h-4" />
        <span>{bookTitle}</span>
        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
          {zoneStyle}
        </span>
      </div>

      <div className="text-xs text-gray-400">
        参赛时间：{new Date(participation.submittedAt).toLocaleDateString()}
      </div>
    </Link>
  );
}
```

### 个人中心页面
```tsx
// src/app/profile/page.tsx
import { notFound } from 'next/navigation';
import { userService } from '@/services/user.service';
import { UserInfo } from '@/components/profile/user-info';
import { StatsCard } from '@/components/profile/stats-card';
import { SeasonCard } from '@/components/profile/season-card';

// TODO: 从 Session 获取当前用户 ID
const CURRENT_USER_ID = 'temp-user-id';

export default async function ProfilePage() {
  const user = await userService.getUserById(CURRENT_USER_ID);
  if (!user) notFound();

  const stats = {
    booksWritten: user.booksWritten || 0,
    booksCompleted: user.booksCompleted || 0,
    seasonsJoined: user.seasonsJoined || 0,
    totalInk: user.totalInk || 0,
    highestRank: 3, // TODO: 从数据库获取
  };

  const participations = await userService.getSeasonParticipations(CURRENT_USER_ID);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-4">
        {/* 用户信息 */}
        <UserInfo user={user} />

        {/* 创作统计 */}
        <StatsCard stats={stats} />

        {/* 赛季战绩 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">赛季战绩</h3>
            <span className="text-sm text-gray-500">{participations.length} 次参赛</span>
          </div>

          {participations.length > 0 ? (
            participations.map((p) => (
              <SeasonCard key={p.id} participation={p} />
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
              暂无参赛记录
            </div>
          )}
        </div>

        {/* 我的书籍 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">我的书籍</h3>
            <a href="/create" className="text-primary-600 text-sm">
              新建书籍
            </a>
          </div>

          {/* TODO: 添加我的书籍列表 */}
        </div>
      </div>
    </div>
  );
}
```

## 验证标准
- [ ] 用户信息正确显示
- [ ] 统计数据正确
- [ ] 赛季卡片正确显示
- [ ] Agent 配置可编辑

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现个人中心页面与组件`。