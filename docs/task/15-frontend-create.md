# 任务 15：创建新书与参赛页面

## 任务目标
实现创建新书、参与赛季的页面

## 依赖关系
- 任务 03（UI 组件）完成后
- 任务 06（赛季 API）完成后
- 任务 07（书籍 API）完成后

## 交付物清单

### 15.1 创建书籍表单
- [ ] 书名输入
- [ ] 简介输入
- [ ] 分区选择

### 15.2 参赛信息
- [ ] 当前赛季信息展示
- [ ] 参赛规则说明

### 15.3 创建页面
- [ ] `app/create/page.tsx` - 创建新书

## 涉及文件清单
| 文件路径                                | 操作 |
| --------------------------------------- | ---- |
| `src/app/create/page.tsx`               | 新建 |
| `src/components/create/book-form.tsx`   | 新建 |
| `src/components/create/season-info.tsx` | 新建 |

## 详细设计

### 赛季信息展示
```tsx
// src/components/create/season-info.tsx
import { Clock, Users, Trophy, Coins } from 'lucide-react';

interface SeasonInfoProps {
  season?: {
    id: string;
    seasonNumber: number;
    themeKeyword: string;
    constraints: string[];
    zoneStyles: string[];
    duration: number;
    signupDeadline: Date;
    maxChapters: number;
    minChapters: number;
    rewards: {
      first: number;
      second: number;
      third: number;
      completionPerChapter: number;
    };
    participantCount: number;
  };
}

export function SeasonInfo({ season }: SeasonInfoProps) {
  if (!season) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h3 className="font-medium text-lg mb-2">暂无进行中的赛季</h3>
        <p className="text-gray-500 text-sm">请等待赛季开启后参赛</p>
      </div>
    );
  }

  // 计算报名截止时间
  const now = new Date();
  const deadline = new Date(season.signupDeadline);
  const timeLeft = Math.max(0, deadline.getTime() - now.getTime());
  const minutesLeft = Math.floor(timeLeft / (1000 * 60));

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">S{season.seasonNumber} 赛季</h3>
        <div className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded">
          <Clock className="w-4 h-4" />
          报名剩余 {minutesLeft} 分钟
        </div>
      </div>

      <p className="text-xl font-medium mb-2">{season.themeKeyword}</p>

      {/* 参赛规则 */}
      <div className="bg-white/10 rounded-lg p-3 text-sm mb-3">
        <p className="font-medium mb-1">参赛要求</p>
        <ul className="space-y-1 text-sm opacity-90">
          <li>章节数：{season.minChapters} - {season.maxChapters} 章</li>
          <li>分区：{season.zoneStyles.join(' / ')}</li>
        </ul>
      </div>

      {/* 约束 */}
      {season.constraints.length > 0 && (
        <div className="text-xs opacity-80 mb-3">
          <p>硬性限制：</p>
          <ul className="list-disc list-inside">
            {season.constraints.slice(0, 3).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 奖励 */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Trophy className="w-4 h-4" />
          <span>冠军 {season.rewards.first} Ink</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{season.participantCount} 人参赛</span>
        </div>
      </div>
    </div>
  );
}
```

### 创建书籍表单
```tsx
// src/components/create/book-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { BookOpen, FileText } from 'lucide-react';

interface CreateBookFormProps {
  seasonId?: string;
  onSubmit: (data: CreateBookData) => Promise<void>;
}

interface CreateBookData {
  title: string;
  shortDesc: string;
  zoneStyle: string;
}

const ZONE_STYLES = [
  { value: 'urban', label: '都市', description: '现代都市背景的故事' },
  { value: 'fantasy', label: '玄幻', description: '奇幻架空世界观' },
  { value: 'scifi', label: '科幻', description: '科技未来背景' },
];

export function CreateBookForm({ seasonId, onSubmit }: CreateBookFormProps) {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateBookData>();
  const [selectedZone, setSelectedZone] = useState('');

  const handleFormSubmit = async (data: CreateBookData) => {
    try {
      await onSubmit({ ...data, zoneStyle: selectedZone });
      router.push('/profile');
    } catch (error) {
      console.error('Create book error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* 书名 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          书名
        </label>
        <div className="relative">
          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            {...register('title', {
              required: '请输入书名',
              minLength: { value: 2, message: '书名至少2个字符' },
              maxLength: { value: 30, message: '书名最多30个字符' },
            })}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="输入书名"
          />
        </div>
        {errors.title && (
          <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* 简介 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          一句话简介
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <textarea
            {...register('shortDesc', {
              required: '请输入简介',
              maxLength: { value: 100, message: '简介最多100字符' },
            })}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            rows={3}
            placeholder="用一句话概括你的故事"
          />
        </div>
        {errors.shortDesc && (
          <p className="text-red-500 text-sm mt-1">{errors.shortDesc.message}</p>
        )}
      </div>

      {/* 分区选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择分区
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ZONE_STYLES.map((zone) => (
            <button
              key={zone.value}
              type="button"
              onClick={() => setSelectedZone(zone.value)}
              className={`p-3 border rounded-lg text-center transition-all ${
                selectedZone === zone.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{zone.label}</div>
              <div className="text-xs text-gray-500 mt-1">{zone.description}</div>
            </button>
          ))}
        </div>
        <input type="hidden" {...register('zoneStyle', { required: '请选择分区' })} />
        {errors.zoneStyle && (
          <p className="text-red-500 text-sm mt-1">{errors.zoneStyle.message}</p>
        )}
      </div>

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={isSubmitting || !selectedZone}
        className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '创建中...' : seasonId ? '参赛创作' : '创建书籍'}
      </button>
    </form>
  );
}
```

### 创建页面
```tsx
// src/app/create/page.tsx
import { redirect } from 'next/navigation';
import { seasonService } from '@/services/season.service';
import { bookService } from '@/services/book.service';
import { SeasonInfo } from '@/components/create/season-info';
import { CreateBookForm } from '@/components/create/book-form';

// TODO: 从 Session 获取当前用户 ID
const CURRENT_USER_ID = 'temp-user-id';

export default async function CreatePage() {
  const season = await seasonService.getCurrentSeason();

  const handleCreate = async (data: {
    title: string;
    shortDesc: string;
    zoneStyle: string;
  }) => {
    'use server';

    // 创建书籍
    const book = await bookService.createBook({
      title: data.title,
      shortDesc: data.shortDesc,
      zoneStyle: data.zoneStyle,
      authorId: CURRENT_USER_ID,
      seasonId: season?.id,
    });

    // 如果有赛季，参赛
    if (season) {
      await seasonService.incrementParticipantCount(season.id);
      // TODO: 发送参赛通知给 Agent
    }

    redirect(`/book/${book.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-4">
        <h1 className="text-xl font-bold mb-4">创建新书</h1>

        {/* 赛季信息 */}
        {season && (
          <div className="mb-6">
            <SeasonInfo season={season} />
          </div>
        )}

        {/* 创建表单 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <CreateBookForm seasonId={season?.id} onSubmit={handleCreate} />
        </div>

        {/* 提示信息 */}
        <div className="mt-4 text-sm text-gray-500">
          <p>创建书籍后可以开始创作，参赛赛季可获得额外奖励。</p>
        </div>
      </div>
    </div>
  );
}
```

## 验证标准
- [ ] 创建表单提交成功
- [ ] 赛季信息正确显示
- [ ] 分区选择正常工作
重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 创建新书与参赛页面`。