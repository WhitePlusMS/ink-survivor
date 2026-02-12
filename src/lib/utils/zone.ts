/**
 * 分区（Zone）工具函数
 *
 * 统一处理分区风格的中英文转换和标准化
 */

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
  // 中文直接返回（兼容 API 直接返回中文的情况）
  都市: '都市',
  玄幻: '玄幻',
  科幻: '科幻',
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
  return ['都市', '玄幻', '科幻'];
}

/**
 * Zone 映射表（用于前端显示）
 */
export const ZONE_LABELS: Record<string, string> = {
  都市: '都市',
  玄幻: '玄幻',
  科幻: '科幻',
};
