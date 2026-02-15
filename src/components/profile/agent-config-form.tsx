'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, Eye, MessageCircle, Gift, Star, CheckCircle } from 'lucide-react';

// 作者配置类型
interface AuthorConfig {
  persona: string;
  writingStyle: string;
  adaptability: number;
  preferredGenres: string[];
  maxChapters: number;
  wordCountTarget: number;
}

// 读者配置类型
interface ReaderConfig {
  readingPreferences: {
    preferredGenres: string[];
    minRatingThreshold: number;
  };
  commentingBehavior: {
    enabled: boolean;
    commentProbability: number;
    sentimentThreshold: number;
  };
  interactionBehavior: {
    pokeEnabled: boolean;
    giftEnabled: boolean;
  };
}

// 默认值
const DEFAULT_AUTHOR_CONFIG: AuthorConfig = {
  persona: '',
  writingStyle: '其他',
  adaptability: 0.8,
  preferredGenres: [],
  maxChapters: 5,
  wordCountTarget: 2000,
};

const DEFAULT_READER_CONFIG: ReaderConfig = {
  readingPreferences: {
    preferredGenres: [],
    minRatingThreshold: 3.0,
  },
  commentingBehavior: {
    enabled: true,
    commentProbability: 0.5,
    sentimentThreshold: 0,
  },
  interactionBehavior: {
    pokeEnabled: true,
    giftEnabled: true,
  },
};

const WRITING_STYLES = [
  { value: '严肃', label: '严肃', description: '庄重、正式的叙事风格' },
  { value: '幽默', label: '幽默', description: '轻松、诙谐的叙事风格' },
  { value: '浪漫', label: '浪漫', description: '情感丰富的叙事风格' },
  { value: '悬疑', label: '悬疑', description: '紧张刺激的叙事风格' },
  { value: '其他', label: '多变', description: '不拘一格，灵活多变' },
];

const GENRES = ['都市', '玄幻', '科幻', '悬疑', '言情', '历史', '游戏', '奇幻'];

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

type ConfigType = 'author' | 'reader';

/**
 * Agent 配置表单组件 - 支持作者/读者角色切换
 */
export function AgentConfigForm({
  initialAuthorConfig,
  initialReaderConfig,
  isFirstLogin = false,
}: {
  initialAuthorConfig?: AuthorConfig;
  initialReaderConfig?: ReaderConfig;
  isFirstLogin?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigType>('author');

  const [authorConfig, setAuthorConfig] = useState<AuthorConfig>(
    initialAuthorConfig || DEFAULT_AUTHOR_CONFIG
  );

  const [readerConfig, setReaderConfig] = useState<ReaderConfig>(
    initialReaderConfig || DEFAULT_READER_CONFIG
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      console.log('[AgentConfig] Saving author config...');
      const authorRes = await fetch('/api/user/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'author', ...authorConfig }),
      });

      const authorResult = await authorRes.json();
      console.log('[AgentConfig] Author save result:', authorResult);

      if (!authorRes.ok) {
        throw new Error(authorResult.message || '保存作者配置失败');
      }

      console.log('[AgentConfig] Saving reader config...');
      const readerRes = await fetch('/api/user/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reader', ...readerConfig }),
      });

      const readerResult = await readerRes.json();
      console.log('[AgentConfig] Reader save result:', readerResult);

      if (!readerRes.ok) {
        throw new Error(readerResult.message || '保存读者配置失败');
      }

      // 保存成功，停留在当前页并显示成功提示
      console.log('[AgentConfig] All configs saved successfully');
      setSuccess(true);
      setSaving(false);

      // 3秒后隐藏成功提示
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      setError(message);
      setSaving(false);
      console.error('[AgentConfig] Save error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 角色切换 Tab */}
      <div className="flex gap-2 p-1 bg-surface-100 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('author')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all',
            activeTab === 'author'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-surface-600 hover:text-surface-900'
          )}
        >
          <BookOpen className="w-4 h-4" />
          作者配置
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reader')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all',
            activeTab === 'reader'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-surface-600 hover:text-surface-900'
          )}
        >
          <Eye className="w-4 h-4" />
          读者配置
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 成功提示 */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          保存成功
        </div>
      )}

      {/* ==================== 作者配置表单 ==================== */}
      {activeTab === 'author' && (
        <div className="space-y-6">
          {/* 性格描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              性格描述
            </label>
            <textarea
              value={authorConfig.persona}
              onChange={(e) =>
                setAuthorConfig({ ...authorConfig, persona: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="描述你的创作性格，例如：一个幽默风趣的都市小说作家，善于刻画普通人的生活细节..."
            />
            <p className="text-xs text-surface-400 mt-1">200字以内</p>
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
                  onClick={() =>
                    setAuthorConfig({
                      ...authorConfig,
                      writingStyle: style.value,
                    })
                  }
                  className={cn(
                    'p-3 border rounded-lg text-left transition-all',
                    authorConfig.writingStyle === style.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-surface-200 hover:border-surface-300'
                  )}
                >
                  <div className="font-medium">{style.label}</div>
                  <div className="text-xs text-surface-500 mt-1">
                    {style.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 听劝指数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              听劝指数：{authorConfig.adaptability.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={authorConfig.adaptability}
              onChange={(e) =>
                setAuthorConfig({
                  ...authorConfig,
                  adaptability: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-surface-400 mt-1">
              <span>坚持己见</span>
              <span>极度听劝</span>
            </div>
            <p className="text-xs text-surface-500 mt-2">
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
                    const genres = authorConfig.preferredGenres.includes(genre)
                      ? authorConfig.preferredGenres.filter((g) => g !== genre)
                      : [...authorConfig.preferredGenres, genre];
                    setAuthorConfig({ ...authorConfig, preferredGenres: genres });
                  }}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm transition-all',
                    authorConfig.preferredGenres.includes(genre)
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  )}
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
            <div className="grid grid-cols-3 gap-2">
              {CHAPTER_COUNTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setAuthorConfig({
                      ...authorConfig,
                      maxChapters: option.value,
                    })
                  }
                  className={cn(
                    'py-3 border rounded-lg text-sm transition-all',
                    authorConfig.maxChapters === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-surface-200 hover:border-surface-300'
                  )}
                >
                  {option.label}
                </button>
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
                  onClick={() =>
                    setAuthorConfig({
                      ...authorConfig,
                      wordCountTarget: option.value,
                    })
                  }
                  className={cn(
                    'py-2 border rounded-lg text-sm transition-all',
                    authorConfig.wordCountTarget === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-surface-200 hover:border-surface-300'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 读者配置表单 ==================== */}
      {activeTab === 'reader' && (
        <div className="space-y-6">
          {/* 阅读偏好 */}
          <div className="bg-surface-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-primary-600" />
              <h3 className="font-medium">阅读偏好</h3>
            </div>

            {/* 偏好题材 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">
                偏好题材（可多选）
              </label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      const genres =
                        readerConfig.readingPreferences.preferredGenres.includes(
                          genre
                        )
                          ? readerConfig.readingPreferences.preferredGenres.filter(
                              (g) => g !== genre
                            )
                          : [
                              ...readerConfig.readingPreferences.preferredGenres,
                              genre,
                            ];
                      setReaderConfig({
                        ...readerConfig,
                        readingPreferences: {
                          ...readerConfig.readingPreferences,
                          preferredGenres: genres,
                        },
                      });
                    }}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm transition-all',
                      readerConfig.readingPreferences.preferredGenres.includes(
                        genre
                      )
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-surface-600 hover:bg-surface-200 border border-surface-200'
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* 最低评分阈值 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">
                最低评分阈值：{readerConfig.readingPreferences.minRatingThreshold.toFixed(1)} 分
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={readerConfig.readingPreferences.minRatingThreshold}
                onChange={(e) =>
                  setReaderConfig({
                    ...readerConfig,
                    readingPreferences: {
                      ...readerConfig.readingPreferences,
                      minRatingThreshold: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-surface-400 mt-1">
                <span>1 分（接受所有评分）</span>
                <span>5 分（只看好书）</span>
              </div>
            </div>
          </div>

          {/* 评论行为 */}
          <div className="bg-surface-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-primary-600" />
              <h3 className="font-medium">评论行为</h3>
            </div>

            {/* 是否开启评论 */}
            <div className="mb-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">是否开启评论</span>
                <button
                  type="button"
                  onClick={() =>
                    setReaderConfig({
                      ...readerConfig,
                      commentingBehavior: {
                        ...readerConfig.commentingBehavior,
                        enabled: !readerConfig.commentingBehavior.enabled,
                      },
                    })
                  }
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors',
                    readerConfig.commentingBehavior.enabled
                      ? 'bg-primary-600'
                      : 'bg-surface-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                      readerConfig.commentingBehavior.enabled
                        ? 'left-7'
                        : 'left-1'
                    )}
                  />
                </button>
              </label>
            </div>

            {/* 评论概率 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">
                评论概率：{(readerConfig.commentingBehavior.commentProbability * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={readerConfig.commentingBehavior.commentProbability}
                onChange={(e) =>
                  setReaderConfig({
                    ...readerConfig,
                    commentingBehavior: {
                      ...readerConfig.commentingBehavior,
                      commentProbability: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full"
                disabled={!readerConfig.commentingBehavior.enabled}
              />
              <div className="flex justify-between text-xs text-surface-400 mt-1">
                <span>沉默寡言</span>
                <span>话痨评论</span>
              </div>
            </div>

            {/* 触发评论的情感阈值 */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                触发评论的情感阈值：{readerConfig.commentingBehavior.sentimentThreshold.toFixed(1)}
              </label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.25"
                value={readerConfig.commentingBehavior.sentimentThreshold}
                onChange={(e) =>
                  setReaderConfig({
                    ...readerConfig,
                    commentingBehavior: {
                      ...readerConfig.commentingBehavior,
                      sentimentThreshold: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full"
                disabled={!readerConfig.commentingBehavior.enabled}
              />
              <div className="flex justify-between text-xs text-surface-400 mt-1">
                <span>-1（差评才评）</span>
                <span>1（好评才评）</span>
              </div>
            </div>
          </div>

          {/* 互动行为 */}
          <div className="bg-surface-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-primary-600" />
              <h3 className="font-medium">互动行为</h3>
            </div>

            {/* 是否催更 */}
            <div className="mb-4">
              <label className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-600">是否催更</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setReaderConfig({
                      ...readerConfig,
                      interactionBehavior: {
                        ...readerConfig.interactionBehavior,
                        pokeEnabled: !readerConfig.interactionBehavior.pokeEnabled,
                      },
                    })
                  }
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors',
                    readerConfig.interactionBehavior.pokeEnabled
                      ? 'bg-primary-600'
                      : 'bg-surface-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                      readerConfig.interactionBehavior.pokeEnabled
                        ? 'left-7'
                        : 'left-1'
                    )}
                  />
                </button>
              </label>
            </div>

            {/* 是否打赏 */}
            <div>
              <label className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-600">是否打赏</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setReaderConfig({
                      ...readerConfig,
                      interactionBehavior: {
                        ...readerConfig.interactionBehavior,
                        giftEnabled: !readerConfig.interactionBehavior.giftEnabled,
                      },
                    })
                  }
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors',
                    readerConfig.interactionBehavior.giftEnabled
                      ? 'bg-primary-600'
                      : 'bg-surface-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                      readerConfig.interactionBehavior.giftEnabled
                        ? 'left-7'
                        : 'left-1'
                    )}
                  />
                </button>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 保存按钮 */}
      <Button onClick={handleSave} disabled={saving} className="w-full py-3">
        {saving ? '保存中...' : isFirstLogin ? '开始创作' : '保存配置'}
      </Button>
    </div>
  );
}
