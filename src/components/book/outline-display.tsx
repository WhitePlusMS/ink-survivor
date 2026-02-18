'use client';

import { Star, Trophy, User, UserMinus, UserPlus, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Character {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  description: string;
  motivation?: string;
}

interface ChapterPlan {
  number: number;
  title: string;
  summary: string;
  key_events?: string[];
}

interface OutlineVersion {
  version: number;
  roundCreated: number;
  reason: string | null;
  createdAt: string;
}

interface OutlineDisplayProps {
  outline: {
    originalIntent?: string;
    characters?: string;
    chaptersPlan?: string;
    summary?: string;
    characters_json?: Character[] | string;
    chapters?: ChapterPlan[] | string;
  };
  /** 大纲版本历史 */
  versions?: OutlineVersion[];
  /** 默认折叠，设为 false 可默认展开 */
  defaultCollapsed?: boolean;
  /** 是否显示版本选择器 */
  showVersionSelector?: boolean;
}

interface ParsedOutline {
  summary?: string;
  characters?: Character[];
  chapters?: ChapterPlan[];
}

/**
 * 大纲展示组件
 * 设计原则：模仿番茄小说详情页，清晰展示故事简介、角色设定、章节大纲
 * 默认折叠，需要用户点击展开
 */

export function OutlineDisplay({
  outline,
  versions = [],
  defaultCollapsed = true,
  showVersionSelector = true,
}: OutlineDisplayProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [versionOutline, setVersionOutline] = useState<ParsedOutline | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);

  // 默认显示最新版本（版本列表中的第一个）
  const currentVersion = selectedVersion ?? (versions.length > 0 ? versions[0].version : null);

  // 当用户选择版本时，获取该版本的大纲
  useEffect(() => {
    if (!showVersionSelector || versions.length === 0 || !currentVersion) {
      setVersionOutline(null);
      return;
    }

    // 如果选择的是最新版本，使用传入的 outline
    if (currentVersion === versions[0]?.version) {
      setVersionOutline(null);
      return;
    }

    // 获取指定版本的大纲
    const fetchVersionOutline = async () => {
      setLoadingVersion(true);
      try {
        // 从 API 获取指定版本的大纲
        // 这里需要书籍 ID，但组件没有传入，所以简化处理：
        // 如果有多个版本，说明修改过大纲，显示提示信息
        setVersionOutline({
          summary: `(大纲版本 ${currentVersion}) 详细大纲请查看完整版本`,
          characters: [],
          chapters: [],
        });
      } catch (error) {
        console.error('获取大纲版本失败:', error);
      } finally {
        setLoadingVersion(false);
      }
    };

    fetchVersionOutline();
  }, [currentVersion, versions, showVersionSelector]);

  // 解析大纲数据
  const parseOutline = (): ParsedOutline => {
    const result: ParsedOutline = {};

    // 如果有版本大纲数据，使用版本大纲
    if (versionOutline) {
      return versionOutline;
    }

    // 解析 summary/originalIntent
    result.summary = outline.originalIntent || outline.summary;

    // 解析 characters
    if (outline.characters) {
      try {
        result.characters = JSON.parse(outline.characters);
      } catch {
        result.characters = [];
      }
    } else if (outline.characters_json) {
      try {
        const chars = typeof outline.characters_json === 'string'
          ? JSON.parse(outline.characters_json)
          : outline.characters_json;
        result.characters = Array.isArray(chars) ? chars : [];
      } catch {
        result.characters = [];
      }
    }

    // 解析 chapters
    if (outline.chaptersPlan) {
      try {
        result.chapters = JSON.parse(outline.chaptersPlan);
      } catch {
        result.chapters = [];
      }
    } else if (outline.chapters) {
      try {
        const chaps = typeof outline.chapters === 'string'
          ? JSON.parse(outline.chapters)
          : outline.chapters;
        result.chapters = Array.isArray(chaps) ? chaps : [];
      } catch {
        result.chapters = [];
      }
    }

    return result;
  };

  const data = parseOutline();

  // 获取角色图标
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'protagonist':
        return { icon: <UserPlus className="w-4 h-4" />, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
      case 'antagonist':
        return { icon: <UserMinus className="w-4 h-4" />, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
      default:
        return { icon: <User className="w-4 h-4" />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    }
  };

  // 检查章节是否有采纳标记
  const hasAdoptedFlag = (chapter: ChapterPlan) => {
    return chapter.key_events?.some((e) =>
      e.includes('已采纳') || e.includes('读者反馈')
    );
  };

  return (
    <div className="space-y-4">
      {/* 展开/收起按钮 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-surface-500 hover:text-surface-700 transition-colors"
      >
        {isCollapsed ? (
          <>
            <ChevronDown className="w-4 h-4" />
            展开大纲
          </>
        ) : (
          <>
            <ChevronUp className="w-4 h-4" />
            收起大纲
          </>
        )}
      </button>

      {/* 大纲版本选择器 - 无论是否有多个版本都显示版本信息 */}
      {showVersionSelector && versions.length > 0 && !isCollapsed && (
        <div className="flex items-center gap-2 px-2 py-2 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
          <History className="w-4 h-4 text-surface-500" />
          {versions.length > 1 ? (
            <>
              <span className="text-sm text-surface-600 dark:text-surface-300">大纲版本：</span>
              <select
                value={currentVersion || ''}
                onChange={(e) => setSelectedVersion(parseInt(e.target.value, 10))}
                className="flex-1 text-sm bg-transparent border-none focus:outline-none text-surface-700 dark:text-surface-200"
              >
                {versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    第 {v.version} 版 {v.reason ? `（${v.reason}）` : ''}
                  </option>
                ))}
              </select>
              {loadingVersion && (
                <span className="text-xs text-surface-400">加载中...</span>
              )}
            </>
          ) : (
            <span className="text-sm text-surface-600 dark:text-surface-300">
              第 {versions[0].version} 版 {versions[0].reason ? `（${versions[0].reason}）` : ''}
            </span>
          )}
        </div>
      )}

      {/* 如果有多个版本且不是最新版本，显示提示 */}
      {showVersionSelector && versions.length > 1 && currentVersion !== versions[0]?.version && !isCollapsed && !loadingVersion && (
        <div className="text-xs text-amber-600 dark:text-amber-400 px-2">
          * 正在查看历史版本的大纲，当前实际大纲可能已更新
        </div>
      )}

      {/* 折叠时显示提示 */}
      {isCollapsed && (
        <div className="text-center py-4 text-surface-400 text-sm">
          点击上方按钮查看故事简介、角色设定和章节大纲
        </div>
      )}

      {/* 折叠状态不显示内容 */}
      {isCollapsed && (
        <div className="hidden">
          {/* 保持数据结构以便展开后渲染 */}
        </div>
      )}

      {/* 展开状态显示完整内容 */}
      {!isCollapsed && (
        <>
          {/* 故事简介 */}
          {data.summary && (
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
              <h4 className="font-medium mb-2 text-surface-700 dark:text-surface-200 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary-500" />
                故事简介
              </h4>
              <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                {data.summary}
              </p>
            </div>
          )}

          {/* 角色设定 */}
          {data.characters && data.characters.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 text-surface-700 dark:text-surface-200 flex items-center gap-2">
                <Star className="w-4 h-4 text-primary-500" />
                角色设定
              </h4>
              <div className="space-y-3">
                {data.characters.map((char, index) => {
                  const { icon, color, bg } = getRoleIcon(char.role);
                  return (
                    <div
                      key={index}
                      className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('p-1 rounded', bg, color)}>
                          {icon}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{char.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 rounded">
                          {char.role === 'protagonist' ? '主角' : char.role === 'antagonist' ? '反派' : '配角'}
                        </span>
                      </div>
                      <p className="text-sm text-surface-600 dark:text-surface-300">{char.description}</p>
                      {char.motivation && (
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 flex items-center gap-1">
                          <span className="text-surface-400">动机：</span>
                          {char.motivation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 章节大纲 */}
          {data.chapters && data.chapters.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 text-surface-700 dark:text-surface-200 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary-500" />
                章节大纲
              </h4>
              <div className="space-y-3">
                {data.chapters.map((chapter) => {
                  const isAdopted = hasAdoptedFlag(chapter);
                  return (
                    <div
                      key={chapter.number}
                      className={cn(
                        'bg-white dark:bg-surface-800 border rounded-lg p-3 transition-all duration-200',
                        isAdopted
                          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                          : 'border-surface-200 dark:border-surface-700'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-sm font-medium',
                          isAdopted
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                        )}>
                          第 {chapter.number} 章
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{chapter.title}</span>
                        {isAdopted && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <Star className="w-3 h-3 fill-current" />
                            采纳
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-surface-600 dark:text-surface-300 mb-2">
                        {chapter.summary}
                      </p>
                      {chapter.key_events && chapter.key_events.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {chapter.key_events.map((event, i) => (
                            <span
                              key={i}
                              className={cn(
                                'text-xs px-2 py-0.5 rounded',
                                event.includes('已采纳')
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300'
                              )}
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
