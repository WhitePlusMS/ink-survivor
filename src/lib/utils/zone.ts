/**
 * 分区（Zone）工具函数
 *
 * 统一处理分区风格的中英文转换和标准化
 * 所有分类配置在此集中管理
 */

import { Building, Sword, Rocket, Landmark, Gamepad2, Ghost, Heart, Sparkle } from '@/components/icons';

// 分类配置类型
export interface ZoneConfig {
  value: string;        // 英文键名
  label: string;        // 中文标签
  icon: React.ComponentType<{ className?: string }>;  // 图标组件
  bg: string;           // 背景色类名
  text: string;         // 文字色类名
}

// Zone 配置列表 - 所有分类在此统一管理
export const ZONE_CONFIGS: ZoneConfig[] = [
  { value: 'urban', label: '都市', icon: Building, bg: 'bg-blue-100', text: 'text-blue-700' },
  { value: 'fantasy', label: '玄幻', icon: Sword, bg: 'bg-purple-100', text: 'text-purple-700' },
  { value: 'scifi', label: '科幻', icon: Rocket, bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { value: 'history', label: '历史', icon: Landmark, bg: 'bg-amber-100', text: 'text-amber-700' },
  { value: 'game', label: '游戏', icon: Gamepad2, bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'mystery', label: '悬疑', icon: Ghost, bg: 'bg-gray-100', text: 'text-gray-700' },
  { value: 'romance', label: '言情', icon: Heart, bg: 'bg-pink-100', text: 'text-pink-700' },
  { value: 'fantasy_cn', label: '奇幻', icon: Sparkle, bg: 'bg-indigo-100', text: 'text-indigo-700' },
];

// Zone 值数组（用于快速查找）
export const ZONE_VALUES = ZONE_CONFIGS.map(z => z.value);

// Zone 映射：支持英文 -> 中文 和 中文 -> 中文
const zoneMap: Record<string, string> = {
  // 英文 -> 中文
  urban: '都市',
  Urban: '都市',
  fantasy: '玄幻',
  Fantasy: '玄幻',
  scifi: '科幻',
  Scifi: '科幻',
  SciFi: '科幻',
  history: '历史',
  History: '历史',
  game: '游戏',
  Game: '游戏',
  mystery: '悬疑',
  Mystery: '悬疑',
  romance: '言情',
  Romance: '言情',
  fantasy_cn: '奇幻',
  Fantasy_cn: '奇幻',
  // 中文直接返回（兼容 API 直接返回中文的情况）
  都市: '都市',
  玄幻: '玄幻',
  科幻: '科幻',
  历史: '历史',
  游戏: '游戏',
  悬疑: '悬疑',
  言情: '言情',
  奇幻: '奇幻',
};

/**
 * 标准化 Zone 值
 * 将任意格式的 zoneStyle 转换为标准中文格式
 *
 * @param zoneStyle - 原始 zoneStyle（英文或中文）
 * @returns 标准化后的中文 zoneStyle
 */
export function normalizeZoneStyle(zoneStyle: string): string {
  return zoneMap[zoneStyle] || zoneStyle;
}

/**
 * 检查是否是有效的 Zone 值
 */
export function isValidZoneStyle(zoneStyle: string): boolean {
  return zoneStyle in zoneMap;
}

/**
 * 获取所有有效的 Zone 值列表
 */
export function getValidZoneStyles(): string[] {
  return ZONE_CONFIGS.map(z => z.label);
}

/**
 * 根据 value 获取 Zone 配置
 */
export function getZoneConfig(value: string): ZoneConfig | undefined {
  return ZONE_CONFIGS.find(z => z.value === value);
}

/**
 * 根据 value 获取 Zone 标签
 */
export function getZoneLabel(value: string): string {
  const config = getZoneConfig(value);
  return config?.label || value;
}

/**
 * Zone 映射表（用于前端显示）
 * 基于 ZONE_CONFIGS 自动生成
 */
export const ZONE_LABELS: Record<string, string> = ZONE_CONFIGS.reduce((acc, z) => {
  acc[z.value] = z.label;
  acc[z.label] = z.label;
  return acc;
}, {} as Record<string, string>);

// 中文到英文的映射（用于参赛时）
export const ZONE_MAP: Record<string, string> = ZONE_CONFIGS.reduce((acc, z) => {
  acc[z.label] = z.value;
  return acc;
}, {} as Record<string, string>);
