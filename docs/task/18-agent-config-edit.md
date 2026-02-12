# 任务 18：Agent 配置编辑页面

## 任务目标
实现 Agent 配置编辑页面，让用户自定义创作风格

## 依赖关系
- 任务 03（UI 组件）完成后

## 交付物清单

### 18.1 Agent 配置表单
- [ ] 性格描述输入
- [ ] 写作风格选择
- [ ] 听劝指数滑块
- [ ] 创作偏好设置

### 18.2 配置页面
- [ ] `app/profile/edit/page.tsx` - 编辑页面

## 涉及文件清单
| 文件路径                                       | 操作 |
| ---------------------------------------------- | ---- |
| `src/app/profile/edit/page.tsx`                | 新建 |
| `src/components/profile/agent-config-form.tsx` | 新建 |

## 详细设计

### Agent 配置表单
```tsx
// src/components/profile/agent-config-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AgentConfig {
  persona: string;
  writingStyle: 'serious' | 'humor' | 'romance' | 'mystery' | 'other';
  adaptability: number;
  preferredGenres: string[];
  maxChapters: number;
  wordCountTarget: number;
  budgetPerChapter: number;
}

const WRITING_STYLES = [
  { value: 'serious', label: '严肃', description: '庄重、正式的叙事风格' },
  { value: 'humor', label: '幽默', description: '轻松、诙谐的叙事风格' },
  { value: 'romance', label: '浪漫', description: '情感丰富的叙事风格' },
  { value: 'mystery', label: '悬疑', description: '紧张刺激的叙事风格' },
  { value: 'other', label: '多变风格多变，不拘', description: '一格' },
];

const GENRES = [
  '都市', '玄幻', '科幻', '悬疑', '言情', '历史', '游戏', '奇幻'
];

const CHAPTER_COUNTS = [
  { value: 3, label: '3 章（短篇）' },
  { value: 5, label: '5 章（中篇）' },
  { value: 7, label: '7 章（长篇）' },
];

const WORD_COUNTS = [
  { value: 1000, label: '1,000 字' },
  { value: 2000, label: '2,000 字' },
  { value: 3000, label: '3,000 字' },
];

export function AgentConfigForm({ initialConfig }: { initialConfig?: AgentConfig }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AgentConfig>(initialConfig || {
    persona: '',
    writingStyle: 'other',
    adaptability: 0.8,
    preferredGenres: [],
    maxChapters: 5,
    wordCountTarget: 2000,
    budgetPerChapter: 20,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/user/agent-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      router.back();
    } catch (error) {
      console.error('Save config error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 性格描述 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          性格描述
        </label>
        <textarea
          value={config.persona}
          onChange={(e) => setConfig({ ...config, persona: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="描述你的创作性格，例如：一个幽默风趣的都市小说作家，善于刻画普通人的生活细节..."
        />
        <p className="text-xs text-gray-400 mt-1">200字以内</p>
      </div>

      {/* 写作风格 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          写作风格
        </label>
        <div className="grid grid-cols-2 gap-2">
          {WRITING_STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              onClick={() => setConfig({ ...config, writingStyle: style.value as any })}
              className={`p-3 border rounded-lg text-left transition-all ${
                config.writingStyle === style.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{style.label}</div>
              <div className="text-xs text-gray-500 mt-1">{style.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 听劝指数 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          听劝指数：{config.adaptability.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.adaptability}
          onChange={(e) => setConfig({ ...config, adaptability: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>坚持己见</span>
          <span>极度听劝</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          越高越容易采纳读者意见，用于动态修正剧情
        </p>
      </div>

      {/* 偏好题材 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          偏好题材（可多选）
        </label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => {
                const genres = config.preferredGenres.includes(genre)
                  ? config.preferredGenres.filter(g => g !== genre)
                  : [...config.preferredGenres, genre];
                setConfig({ ...config, preferredGenres: genres });
              }}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                config.preferredGenres.includes(genre)
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* 单书章节数 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          单书章节数
        </label>
        <div className="space-y-2">
          {CHAPTER_COUNTS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="maxChapters"
                checked={config.maxChapters === option.value}
                onChange={() => setConfig({ ...config, maxChapters: option.value })}
                className="text-primary-600"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 每章目标字数 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          每章目标字数
        </label>
        <div className="grid grid-cols-3 gap-2">
          {WORD_COUNTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setConfig({ ...config, wordCountTarget: option.value })}
              className={`py-2 border rounded-lg text-sm transition-all ${
                config.wordCountTarget === option.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存配置'}
      </button>
    </div>
  );
}
```

### 编辑页面
```tsx
// src/app/profile/edit/page.tsx
import { AgentConfigForm } from '@/components/profile/agent-config-form';
import { userService } from '@/services/user.service';

const CURRENT_USER_ID = 'temp-user-id';

export default async function EditProfilePage() {
  const user = await userService.getUserById(CURRENT_USER_ID);

  const initialConfig = user.agentConfig
    ? JSON.parse(user.agentConfig)
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-4">
        <h1 className="text-xl font-bold mb-4">Agent 配置</h1>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <AgentConfigForm initialConfig={initialConfig} />
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>这些配置会影响 AI 的创作风格和决策。</p>
        </div>
      </div>
    </div>
  );
}
```

## 验证标准
- [ ] 配置表单正确显示
- [ ] 各项配置可修改
- [ ] 保存功能正常
重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现 Agent 配置编辑页面与表单`。