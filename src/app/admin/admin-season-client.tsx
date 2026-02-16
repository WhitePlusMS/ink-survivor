'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  Settings, ArrowRight, BookOpen, Play, Trash2, Sparkles, Calendar, Edit3, Save
} from 'lucide-react';
import { ZONE_CONFIGS, ZONE_VALUES } from '@/lib/utils/zone';

// 所有可用分区（用于显示，实际赛季使用全部）- 从统一配置获取
const ALL_ZONES = ZONE_CONFIGS.map(z => ({ value: z.value, label: z.label }));

interface PhaseStatus {
  currentRound: number;
  currentPhase: string;
  phaseDisplayName: string;
}

interface Season {
  id: string;
  seasonNumber: number;
  themeKeyword: string;
  status: string;
}

// 赛季队列项接口
interface SeasonQueueItem {
  id: string;
  seasonNumber: number;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  maxChapters: number;
  minChapters: number;
  duration: {
    reading: number;
    outline: number;
    writing: number;
  };
  rewards: Record<string, number>;
  plannedStartTime: string | null;
  intervalHours: number;
  status: string;
  publishedAt: string | null;
  llmSuggestion: string | null;
  llmOptimized: boolean;
}

// 赛季配置表单数据
interface SeasonConfigForm {
  seasonNumber: number;
  themeKeyword: string;
  constraints: string;
  zoneStyles: string[];
  maxChapters: number;
  minChapters: number;
  phaseDurations: {
    reading: number;
    outline: number;
    writing: number;
  };
  rewards: string;
  plannedStartTime: string;
  intervalHours: number;
}

// 分区标签映射
const ZONE_LABELS: Record<string, string> = {
  urban: '都市',
  fantasy: '玄幻',
  scifi: '科幻',
  history: '历史',
  game: '游戏',
};

// 所有分区（赛季默认使用全部）
// 所有可用分区值数组 - 从统一配置获取
// (使用 ZONE_VALUES)

// 赛季详情接口（用于历史赛季列表）
interface SeasonDetail {
  id: string;
  seasonNumber: number;
  themeKeyword: string;
  status: string;
  constraints: string[];
  zoneStyles: string[];
  maxChapters: number;
  minChapters: number;
  duration: {
    reading: number;
    outline: number;
    writing: number;
  };
  rewards: Record<string, number>;
  startTime: Date | string | null;
  endTime: Date | string | null;
  participantCount: number;
  currentRound: number;
  roundPhase: string;
  roundStartTime: Date | string | null;
}

// 阶段显示名称
function getPhaseDisplayName(phase: string): string {
  const names: Record<string, string> = {
    NONE: '未开始',
    READING: '阅读窗口期',
    OUTLINE: '大纲生成期',
    WRITING: '章节创作期',
  };
  return names[phase] || phase;
}

// 状态显示
function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    FINISHED: 'bg-gray-100 text-gray-700',
    DRAFT: 'bg-yellow-100 text-yellow-700',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    PUBLISHED: 'bg-green-100 text-green-700',
    SKIPPED: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    ACTIVE: '进行中',
    FINISHED: '已结束',
    DRAFT: '草稿',
    SCHEDULED: '待发布',
    PUBLISHED: '已发布',
    SKIPPED: '已跳过',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${styles[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  );
}

/**
 * 管理员赛季管理客户端组件
 */
export function AdminSeasonClient({
  isAdmin,
  season,
  phaseStatus,
  allSeasons,
}: {
  isAdmin: boolean;
  season: Season | null;
  phaseStatus: PhaseStatus | null;
  allSeasons?: SeasonDetail[];
}) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'init' | 'start' | 'nextPhase' | 'endSeason' | null>(null);
  // 非管理员默认显示历史赛季 Tab
  const [activeTab, setActiveTab] = useState<'queue' | 'immediate' | 'history'>(isAdmin ? 'queue' : 'history');

  // 赛季队列状态
  const [seasonQueue, setSeasonQueue] = useState<SeasonQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<SeasonQueueItem | null>(null);
  const [optimizingItem, setOptimizingItem] = useState<string | null>(null);

  // 赛季配置表单状态
  const [configForm, setConfigForm] = useState<SeasonConfigForm>({
    seasonNumber: 1,
    themeKeyword: '',
    constraints: '',
    zoneStyles: ZONE_VALUES,
    maxChapters: 7,
    minChapters: 3,
    phaseDurations: {
      reading: 10,
      outline: 5,
      writing: 5,
    },
    rewards: '{"first": 1000, "second": 500, "third": 200}',
    plannedStartTime: '',
    intervalHours: 2,
  });

  // 获取赛季队列
  const fetchSeasonQueue = async () => {
    setQueueLoading(true);
    try {
      const response = await fetch('/api/admin/season-queue');
      const result = await response.json();
      if (result.code === 0) {
        setSeasonQueue(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch season queue:', err);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasonQueue();
  }, []);

  // 获取下一个可用赛季编号
  const getNextSeasonNumber = () => {
    if (seasonQueue.length === 0) {
      // 从数据库获取当前最大赛季编号
      return (season?.seasonNumber || 0) + 1;
    }
    const maxNum = Math.max(...seasonQueue.map(q => q.seasonNumber), season?.seasonNumber || 0);
    return maxNum + 1;
  };

  // 重置表单
  const resetForm = () => {
    setConfigForm({
      seasonNumber: getNextSeasonNumber(),
      themeKeyword: '',
      constraints: '',
      zoneStyles: ZONE_VALUES,
      maxChapters: 7,
      minChapters: 3,
      phaseDurations: { reading: 10, outline: 5, writing: 5 },
      rewards: '{"first": 1000, "second": 500, "third": 200}',
      plannedStartTime: '',
      intervalHours: 2,
    });
    setEditingItem(null);
  };

  // 保存到队列
  const handleSaveToQueue = async () => {
    if (!configForm.themeKeyword.trim()) {
      alert('请输入赛季主题');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        seasonNumber: configForm.seasonNumber,
        themeKeyword: configForm.themeKeyword,
        constraints: configForm.constraints.split('\n').filter(Boolean),
        zoneStyles: configForm.zoneStyles,
        maxChapters: configForm.maxChapters,
        minChapters: configForm.minChapters,
        duration: configForm.phaseDurations,
        rewards: JSON.parse(configForm.rewards || '{}'),
        plannedStartTime: configForm.plannedStartTime || null,
        intervalHours: configForm.intervalHours,
      };

      let response;
      if (editingItem) {
        // 更新
        response = await fetch(`/api/admin/season-queue/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // 创建
        response = await fetch('/api/admin/season-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();
      if (result.code === 0) {
        alert(editingItem ? '更新成功' : '已添加到队列');
        fetchSeasonQueue();
        resetForm();
      } else {
        alert(result.message || '操作失败');
      }
    } catch (err) {
      alert('操作失败: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 立即创建赛季
  const handleCreateNow = async () => {
    if (!configForm.themeKeyword.trim()) {
      alert('请输入赛季主题');
      return;
    }

    setIsProcessing(true);
    setActionType('start');
    try {
      const response = await fetch('/api/admin/test/start-season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonNumber: configForm.seasonNumber,
          themeKeyword: configForm.themeKeyword,
          constraints: configForm.constraints.split('\n').filter(Boolean),
          zoneStyles: configForm.zoneStyles,
          maxChapters: configForm.maxChapters,
          phaseDurations: configForm.phaseDurations,
          rewards: JSON.parse(configForm.rewards || '{}'),
        }),
      });
      const result = await response.json();
      if (result.code === 0) {
        alert(`赛季开始！${result.data.joinCount || 0} 个 Agent 参赛`);
        router.refresh();
      } else {
        alert(result.message || '开始失败');
      }
    } catch (err) {
      alert('开始失败: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  // 编辑队列中的赛季
  const handleEdit = (item: SeasonQueueItem) => {
    setConfigForm({
      seasonNumber: item.seasonNumber,
      themeKeyword: item.themeKeyword,
      constraints: item.constraints.join('\n'),
      zoneStyles: item.zoneStyles,
      maxChapters: item.maxChapters,
      minChapters: item.minChapters,
      phaseDurations: item.duration,
      rewards: JSON.stringify(item.rewards),
      plannedStartTime: item.plannedStartTime ? new Date(item.plannedStartTime).toISOString().slice(0, 16) : '',
      intervalHours: item.intervalHours,
    });
    setEditingItem(item);
    setActiveTab('queue');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 删除队列中的赛季
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个赛季配置吗？')) return;

    try {
      const response = await fetch(`/api/admin/season-queue/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.code === 0) {
        fetchSeasonQueue();
        if (editingItem?.id === id) {
          resetForm();
        }
      } else {
        alert(result.message || '删除失败');
      }
    } catch (err) {
      alert('删除失败: ' + (err as Error).message);
    }
  };

  // LLM 优化
  const handleLLMOptimize = async (item: SeasonQueueItem) => {
    setOptimizingItem(item.id);
    try {
      const response = await fetch(`/api/admin/season-queue/${item.id}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '' }),
      });
      const result = await response.json();
      if (result.code === 0) {
        alert('优化建议已生成！请查看详情');
        fetchSeasonQueue();
      } else {
        alert(result.message || '优化失败');
      }
    } catch (err) {
      alert('优化失败: ' + (err as Error).message);
    } finally {
      setOptimizingItem(null);
    }
  };

  // 批量发布
  const handleBatchPublish = async (count: number) => {
    if (!confirm(`确定要立即发布 ${count} 个赛季吗？`)) return;

    setIsProcessing(true);
    try {
      const baseTime = new Date().toISOString();
      const response = await fetch('/api/admin/season-queue/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, baseStartTime: baseTime }),
      });
      const result = await response.json();
      if (result.code === 0) {
        const published = result.data as unknown[];
        alert(`成功发布 ${published.length} 个赛季！`);
        fetchSeasonQueue();
        router.refresh();
      } else {
        alert(result.message || '发布失败');
      }
    } catch (err) {
      alert('发布失败: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 初始化 S0
  const handleInitS0 = async () => {
    setIsProcessing(true);
    setActionType('init');
    try {
      const response = await fetch('/api/admin/test/init-s0', { method: 'POST' });
      const result = await response.json();
      if (result.code === 0) {
        alert(`初始化成功！${result.data.agentsCreated || 0} 个 Agent 已就绪`);
        router.refresh();
      } else {
        alert(result.message || '初始化失败');
      }
    } catch (err) {
      alert('初始化失败: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  // 推进阶段
  const handleNextPhase = async () => {
    setIsProcessing(true);
    setActionType('nextPhase');
    try {
      const response = await fetch('/api/admin/test/next-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'NEXT_PHASE' }),
      });
      const result = await response.json();
      if (result.code === 0) {
        alert(`推进成功！当前: 第 ${result.data?.currentRound} 轮 - ${result.data?.phaseDisplayName}`);
        router.refresh();
      } else {
        alert(result.message || '推进失败');
      }
    } catch (err) {
      alert('推进失败: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  // 结束赛季
  const handleEndSeason = async () => {
    if (!confirm('确定要结束当前赛季吗？')) return;
    setIsProcessing(true);
    setActionType('endSeason');
    try {
      const response = await fetch('/api/admin/test/next-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'END_SEASON' }),
      });
      const result = await response.json();
      if (result.code === 0) {
        alert('赛季已结束！');
        router.refresh();
      } else {
        alert(result.message || '结束失败');
      }
    } catch (err) {
      alert('结束失败: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  // 配置表单变更处理
  const handleConfigChange = (field: keyof SeasonConfigForm, value: string | number) => {
    setConfigForm(prev => ({ ...prev, [field]: value }));
  };

  // 阶段时长变更处理
  const handlePhaseDurationChange = (phase: keyof SeasonConfigForm['phaseDurations'], value: number) => {
    setConfigForm(prev => ({
      ...prev,
      phaseDurations: { ...prev.phaseDurations, [phase]: value },
    }));
  };


  return (
    <div className="space-y-6">
      {/* 当前赛季状态 */}
      {season ? (
        <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-medium bg-white/20 rounded-full">
                S{season.seasonNumber}
              </span>
              <span className="font-semibold text-lg">{season.themeKeyword}</span>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-white/20 rounded-full">
              进行中
            </span>
          </div>
          {phaseStatus && (
            <div className="text-sm opacity-90">
              第 <span className="font-bold">{phaseStatus.currentRound}</span> 轮 -{' '}
              <span className="font-bold">{phaseStatus.phaseDisplayName}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-surface-100 dark:bg-surface-800 rounded-lg text-center">
          <p className="text-surface-600 dark:text-surface-400">
            当前没有进行中的赛季
          </p>
        </div>
      )}

      {/* Tab 切换 - 仅管理员显示完整 Tab */}
      {isAdmin && (
        <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'queue'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-surface-600 hover:text-surface-900'
            }`}
          >
            赛季队列管理
          </button>
          <button
            onClick={() => { resetForm(); setActiveTab('immediate'); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'immediate'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-surface-600 hover:text-surface-900'
            }`}
          >
            立即创建赛季
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-surface-600 hover:text-surface-900'
            }`}
          >
            历史赛季 ({allSeasons?.length || 0})
          </button>
        </div>
      )}

      {/* 非管理员只显示历史赛季 Tab 标题 */}
      {!isAdmin && (
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            历史赛季 ({allSeasons?.length || 0})
          </h2>
        </div>
      )}

      {/* 赛季队列管理 Tab */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* 配置表单 */}
          <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {editingItem ? `编辑 S${editingItem.seasonNumber}` : '添加新赛季到队列'}
              </h3>
              {editingItem && (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  取消编辑
                </Button>
              )}
            </div>

            <div className="grid gap-4">
              {/* 赛季编号 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    赛季编号
                  </label>
                  <Input
                    type="number"
                    value={configForm.seasonNumber}
                    onChange={(e) => handleConfigChange('seasonNumber', parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    间隔时间 (小时)
                  </label>
                  <Input
                    type="number"
                    value={configForm.intervalHours}
                    onChange={(e) => handleConfigChange('intervalHours', parseInt(e.target.value) || 2)}
                    min={1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* 赛季主题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  赛季主题 *
                </label>
                <Input
                  value={configForm.themeKeyword}
                  onChange={(e) => handleConfigChange('themeKeyword', e.target.value)}
                  placeholder="如：赛博朋克、科幻未来、古风穿越"
                  className="w-full"
                />
              </div>

              {/* 硬性约束 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  硬性约束 (每行一条)
                </label>
                <Textarea
                  value={configForm.constraints}
                  onChange={(e) => handleConfigChange('constraints', e.target.value)}
                  placeholder="不能出现真实地名&#10;主角必须有成长弧线"
                  rows={2}
                  className="w-full"
                />
              </div>

              {/* 全部分区提示 */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <Sparkles className="w-4 h-4" />
                  <span>本赛季支持所有分区：{ALL_ZONES.map(z => z.label).join('、')}</span>
                </div>
              </div>

              {/* 最大章节数和阶段时长 */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    最大章节
                  </label>
                  <Input
                    type="number"
                    value={configForm.maxChapters}
                    onChange={(e) => handleConfigChange('maxChapters', parseInt(e.target.value) || 7)}
                    min={1}
                    max={20}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    阅读期(分)
                  </label>
                  <Input
                    type="number"
                    value={configForm.phaseDurations.reading}
                    onChange={(e) => handlePhaseDurationChange('reading', parseInt(e.target.value) || 10)}
                    min={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    大纲期(分)
                  </label>
                  <Input
                    type="number"
                    value={configForm.phaseDurations.outline}
                    onChange={(e) => handlePhaseDurationChange('outline', parseInt(e.target.value) || 5)}
                    min={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    创作期(分)
                  </label>
                  <Input
                    type="number"
                    value={configForm.phaseDurations.writing}
                    onChange={(e) => handlePhaseDurationChange('writing', parseInt(e.target.value) || 5)}
                    min={1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* 计划开始时间和奖励 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    计划开始时间
                  </label>
                  <Input
                    type="datetime-local"
                    value={configForm.plannedStartTime}
                    onChange={(e) => handleConfigChange('plannedStartTime', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    奖励 (JSON)
                  </label>
                  <Input
                    value={configForm.rewards}
                    onChange={(e) => handleConfigChange('rewards', e.target.value)}
                    className="w-full font-mono text-sm"
                  />
                </div>
              </div>

              {/* 保存按钮 */}
              <Button onClick={handleSaveToQueue} disabled={isProcessing} className="w-full gap-2">
                {isProcessing ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {editingItem ? '更新配置' : '添加到队列'}
              </Button>
            </div>
          </div>

          {/* 赛季队列列表 */}
          <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                赛季队列 ({seasonQueue.length})
              </h3>
              {seasonQueue.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchPublish(1)}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    <Play className="w-3 h-3" />
                    发布1个
                  </Button>
                  {seasonQueue.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBatchPublish(seasonQueue.length)}
                      disabled={isProcessing}
                      className="gap-1"
                    >
                      <Play className="w-3 h-3" />
                      发布全部
                    </Button>
                  )}
                </div>
              )}
            </div>

            {queueLoading ? (
              <div className="text-center py-8">
                <Spinner className="w-6 h-6 mx-auto" />
                <p className="text-sm text-surface-500 mt-2">加载中...</p>
              </div>
            ) : seasonQueue.length === 0 ? (
              <div className="text-center py-8 text-surface-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>队列为空，点击上方添加赛季</p>
              </div>
            ) : (
              <div className="space-y-3">
                {seasonQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">S{item.seasonNumber}</span>
                          <span className="font-semibold">{item.themeKeyword}</span>
                          {getStatusBadge(item.status)}
                          {item.llmOptimized && (
                            <Sparkles className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div className="text-xs text-surface-500 dark:text-surface-400 space-y-1">
                          <div>
                            约束：{Array.isArray(item.constraints) && item.constraints.length > 0 ? item.constraints.slice(0, 2).join('；') : '无'}
                            {Array.isArray(item.constraints) && item.constraints.length > 2 && ` 等${item.constraints.length}条`}
                          </div>
                          <div className="flex gap-4">
                            <span>分区：{Array.isArray(item.zoneStyles) ? item.zoneStyles.map(z => ZONE_LABELS[z] || z).join('、') : '无'}</span>
                            <span>章节：{item.maxChapters}</span>
                            <span>
                              时长：
                              {item.duration?.reading + item.duration?.outline + item.duration?.writing || 0}分钟/轮
                            </span>
                          </div>
                          {item.plannedStartTime && (
                            <div>
                              计划开始：{new Date(item.plannedStartTime).toLocaleString()}
                              <span className="ml-2">(间隔{item.intervalHours}小时)</span>
                            </div>
                          )}
                        </div>
                        {/* LLM 建议显示 */}
                        {item.llmSuggestion && (
                          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-800 dark:text-amber-200">
                            <div className="flex items-center gap-1 mb-1">
                              <Sparkles className="w-3 h-3" />
                              <span className="font-medium">AI 优化建议</span>
                            </div>
                            <pre className="whitespace-pre-wrap font-sans">
                              {(() => {
                                try {
                                  const parsed = JSON.parse(item.llmSuggestion!) as Record<string, unknown>;
                                  const explanation = (parsed as Record<string, unknown>)?.creativeExplanation;
                                  return typeof explanation === 'string' ? explanation : item.llmSuggestion;
                                } catch {
                                  return item.llmSuggestion;
                                }
                              })()}
                            </pre>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          className="w-8 h-8"
                          title="编辑"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleLLMOptimize(item)}
                          disabled={optimizingItem === item.id}
                          className="w-8 h-8"
                          title="AI 优化"
                        >
                          {optimizingItem === item.id ? (
                            <Spinner className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-amber-500" />
                          )}
                        </Button>
                        {item.status !== 'PUBLISHED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            className="w-8 h-8 text-red-500"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 立即创建 Tab */}
      {activeTab === 'immediate' && (
        <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Play className="w-4 h-4 text-green-600" />
            立即创建赛季
          </h3>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  赛季编号
                </label>
                <Input
                  type="number"
                  value={configForm.seasonNumber}
                  onChange={(e) => handleConfigChange('seasonNumber', parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  最大章节数
                </label>
                <Input
                  type="number"
                  value={configForm.maxChapters}
                  onChange={(e) => handleConfigChange('maxChapters', parseInt(e.target.value) || 7)}
                  min={1}
                  max={20}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                赛季主题 *
              </label>
              <Input
                value={configForm.themeKeyword}
                onChange={(e) => handleConfigChange('themeKeyword', e.target.value)}
                placeholder="如：赛博朋克、科幻未来、古风穿越"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                硬性约束 (每行一条)
              </label>
              <Textarea
                value={configForm.constraints}
                onChange={(e) => handleConfigChange('constraints', e.target.value)}
                placeholder="不能出现真实地名&#10;主角必须有成长弧线"
                rows={2}
                className="w-full"
              />
            </div>

            {/* 全部分区提示 */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Sparkles className="w-4 h-4" />
                <span>本赛季支持所有分区：{ALL_ZONES.map(z => z.label).join('、')}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  阅读期(分钟)
                </label>
                <Input
                  type="number"
                  value={configForm.phaseDurations.reading}
                  onChange={(e) => handlePhaseDurationChange('reading', parseInt(e.target.value) || 10)}
                  min={1}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  大纲期(分钟)
                </label>
                <Input
                  type="number"
                  value={configForm.phaseDurations.outline}
                  onChange={(e) => handlePhaseDurationChange('outline', parseInt(e.target.value) || 5)}
                  min={1}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  创作期(分钟)
                </label>
                <Input
                  type="number"
                  value={configForm.phaseDurations.writing}
                  onChange={(e) => handlePhaseDurationChange('writing', parseInt(e.target.value) || 5)}
                  min={1}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                奖励配置 (JSON)
              </label>
              <Input
                value={configForm.rewards}
                onChange={(e) => handleConfigChange('rewards', e.target.value)}
                className="w-full font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleCreateNow}
              disabled={isProcessing || !configForm.themeKeyword.trim()}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              {isProcessing && actionType === 'start' ? (
                <>
                  <Spinner className="w-4 h-4" />
                  创建中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  立即创建并开始赛季
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 历史赛季 Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {allSeasons && allSeasons.length > 0 ? (
            <div className="space-y-3">
              {allSeasons.map((s) => (
                <div
                  key={s.id}
                  className="p-4 bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">S{s.seasonNumber}</span>
                      <span className="text-lg font-semibold">{s.themeKeyword}</span>
                      {getStatusBadge(s.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-surface-500 dark:text-surface-400">开始时间</div>
                      <div className="font-medium">
                        {s.startTime ? new Date(s.startTime).toLocaleString('zh-CN') : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-surface-500 dark:text-surface-400">结束时间</div>
                      <div className="font-medium">
                        {s.endTime ? new Date(s.endTime).toLocaleString('zh-CN') : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-surface-500 dark:text-surface-400">参赛书籍</div>
                      <div className="font-medium">{s.participantCount} 本</div>
                    </div>
                    <div>
                      <div className="text-surface-500 dark:text-surface-400">最大章节</div>
                      <div className="font-medium">{s.maxChapters} 章</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-surface-500 dark:text-surface-400">阅读期</div>
                      <div className="font-medium">{s.duration?.reading || 10} 分钟</div>
                    </div>
                    <div>
                      <div className="text-surface-500 dark:text-surface-400">大纲期</div>
                      <div className="font-medium">{s.duration?.outline || 5} 分钟</div>
                    </div>
                    <div>
                      <div className="text-surface-500 dark:text-surface-400">创作期</div>
                      <div className="font-medium">{s.duration?.writing || 5} 分钟</div>
                    </div>
                    <div>
                      <div className="text-surface-500 dark:text-surface-400">当前状态</div>
                      <div className="font-medium">
                        {s.status === 'ACTIVE'
                          ? `第 ${s.currentRound} 轮 - ${getPhaseDisplayName(s.roundPhase)}`
                          : getPhaseDisplayName(s.roundPhase)}
                      </div>
                    </div>
                  </div>

                  {/* 约束和分区 */}
                  <div className="mt-3 text-sm">
                    <div className="text-surface-500 dark:text-surface-400 mb-1">
                      约束: {Array.isArray(s.constraints) && s.constraints.length > 0 ? s.constraints.join('；') : '无'}
                    </div>
                    <div className="text-surface-500 dark:text-surface-400">
                      分区: {Array.isArray(s.zoneStyles) ? s.zoneStyles.map(z => ZONE_LABELS[z] || z).join('、') : '无'}
                    </div>
                  </div>

                  {/* 奖励 */}
                  {s.rewards && Object.keys(s.rewards).length > 0 && (
                    <div className="mt-3 text-sm">
                      <div className="text-surface-500 dark:text-surface-400">奖励:</div>
                      <div className="flex gap-3 mt-1">
                        {s.rewards.first && <span className="text-yellow-600">🥇 {s.rewards.first} Ink</span>}
                        {s.rewards.second && <span className="text-gray-500">🥈 {s.rewards.second} Ink</span>}
                        {s.rewards.third && <span className="text-amber-700">🥉 {s.rewards.third} Ink</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-surface-500">
              暂无历史赛季
            </div>
          )}
        </div>
      )}

      {/* 赛季控制按钮 - 仅管理员显示 */}
      {season && isAdmin && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleNextPhase}
            disabled={isProcessing}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {isProcessing && actionType === 'nextPhase' ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            推进阶段
          </Button>

          <Button
            onClick={handleEndSeason}
            disabled={isProcessing}
            variant="outline"
            className="gap-2 border-red-400 text-red-600 hover:bg-red-50"
          >
            {isProcessing && actionType === 'endSeason' ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
            结束赛季
          </Button>
        </div>
      )}

      {/* 初始化 S0 - 仅管理员显示 */}
      {isAdmin && (
        <Button
          onClick={handleInitS0}
          disabled={isProcessing}
          variant="outline"
          className="w-full gap-2 border-purple-300 text-purple-700 hover:bg-purple-100"
        >
          {isProcessing && actionType === 'init' ? (
            <>
              <Spinner className="w-4 h-4" />
              初始化中...
            </>
          ) : (
            <>
              <Settings className="w-4 h-4" />
              初始化 S0 测试环境
            </>
          )}
        </Button>
      )}
    </div>
  );
}
