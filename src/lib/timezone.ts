/**
 * 时区工具模块
 *
 * 设计原则：
 * - 数据库存储 UTC 时间（标准做法）
 * - 写入数据库：使用 new Date() 或 now()（返回 UTC）
 * - 显示给用户：使用 toBeijingTime() 转换
 * - 时间比较：使用 nowMs()（返回北京时间戳）或工具函数
 */

import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 北京时区偏移量（毫秒）- 8小时
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

export const BEIJING_TIMEZONE = 'Asia/Shanghai';

/**
 * 获取当前 UTC 时间戳（毫秒）
 * 用于时间差计算
 */
export function nowMs(): number {
  return Date.now();
}

/**
 * 获取当前 UTC Date 对象
 * 用于存入数据库
 */
export function now(): Date {
  return new Date();
}

/**
 * 获取当前北京时间（Date 对象）
 * 用于显示给用户
 */
export function nowBeijing(): Date {
  // 使用 date-fns 的 toZonedTime 来正确处理时区
  // 这里通过手动添加偏移量来模拟，因为项目可能没有 date-fns-tz
  const utcDate = new Date();
  return new Date(utcDate.getTime() + BEIJING_OFFSET_MS);
}

/**
 * 获取当前 UTC 时间
 */
export function nowUTC(): Date {
  return new Date();
}

/**
 * 将 UTC 时间戳转换为北京时间戳（毫秒）
 */
export function toBeijingTimeMs(utcMs: number): number {
  return utcMs + BEIJING_OFFSET_MS;
}

/**
 * 将任意时间转换为北京时间（Date 对象）
 * 用于显示
 */
export function toBeijingTime(date: Date | string | number): Date {
  if (!date) return nowBeijing();

  let utcMs: number;
  if (typeof date === 'number') {
    // Unix 秒时间戳
    if (date < 1e12) {
      utcMs = date * 1000;
    } else {
      utcMs = date;
    }
  } else if (typeof date === 'string') {
    utcMs = new Date(date).getTime();
  } else {
    utcMs = date.getTime();
  }

  return new Date(toBeijingTimeMs(utcMs));
}

/**
 * 获取时间的北京时间戳（毫秒）
 * 用于需要按北京时间比较的场景
 */
export function getBeijingTimeMs(date: Date | string | number): number {
  if (!date) return nowMs();

  if (date instanceof Date) {
    return date.getTime();
  }

  if (typeof date === 'number') {
    if (date < 1e12) {
      return date * 1000 + BEIJING_OFFSET_MS;
    }
    return date;
  }

  return toBeijingTimeMs(new Date(date).getTime());
}

/**
 * 获取时间的 UTC 毫秒数
 * 用于标准时间比较
 */
export function getUtcTimeMs(date: Date | string | number): number {
  if (!date) return nowMs();

  if (date instanceof Date) {
    return date.getTime();
  }

  if (typeof date === 'number') {
    return date < 1e12 ? date * 1000 : date;
  }

  return new Date(date).getTime();
}

/**
 * 将北京时间转换为 UTC 时间（存库用）
 */
export function toUTC(beijingDate: Date | string | number): Date {
  if (!beijingDate) return new Date();

  let beijingMs: number;
  if (typeof beijingDate === 'number') {
    beijingMs = beijingDate;
  } else if (typeof beijingDate === 'string') {
    beijingMs = new Date(beijingDate).getTime();
  } else {
    beijingMs = beijingDate.getTime();
  }

  const utcMs = beijingMs - BEIJING_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * 格式化时间为北京时间（用于显示）
 */
export function formatBeijingTime(
  date: Date | string | number,
  formatStr: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  if (!date) return '';

  const beijingMs = getBeijingTimeMs(date);
  const beijingDate = new Date(beijingMs);
  return format(beijingDate, formatStr, { locale: zhCN });
}

/**
 * 比较时间是否已过期（使用 UTC 时间比较）
 * utcEndTime: 数据库存储的 UTC 时间
 */
export function isExpired(utcEndTime: Date | string | number): boolean {
  const nowUtcMs = nowMs();
  const endTimeUtcMs = getUtcTimeMs(utcEndTime);
  return nowUtcMs >= endTimeUtcMs;
}

/**
 * 获取剩余时间（毫秒，使用 UTC 时间）
 */
export function getRemainingTime(utcEndTime: Date | string | number): number {
  const nowUtcMs = nowMs();
  const endTimeUtcMs = getUtcTimeMs(utcEndTime);
  return Math.max(0, endTimeUtcMs - nowUtcMs);
}

/**
 * 获取阶段剩余时间（毫秒）
 * phaseStartTime: 阶段开始时间（UTC）
 * phaseDurationMinutes: 阶段时长（分钟）
 */
export function getPhaseRemainingTime(
  phaseStartTime: Date | string | number,
  phaseDurationMinutes: number
): number {
  const startUtcMs = getUtcTimeMs(phaseStartTime);
  const nowUtcMs = nowMs();
  const durationMs = phaseDurationMinutes * 60 * 1000;
  const elapsed = nowUtcMs - startUtcMs;
  return Math.max(0, durationMs - elapsed);
}

/**
 * 添加时间（毫秒）
 */
export function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

/**
 * 添加分钟
 */
export function addMinutes(date: Date, minutes: number): Date {
  return addMs(date, minutes * 60 * 1000);
}

/**
 * 添加小时
 */
export function addHours(date: Date, hours: number): Date {
  return addMs(date, hours * 60 * 60 * 1000);
}

/**
 * 添加天数
 */
export function addDays(date: Date, days: number): Date {
  return addMs(date, days * 24 * 60 * 60 * 1000);
}

/**
 * 获取今天的开始时间（UTC）
 */
export function getTodayStart(): Date {
  return new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  ));
}

/**
 * 获取明天的开始时间（UTC）
 */
export function getTomorrowStart(): Date {
  return addDays(getTodayStart(), 1);
}

/**
 * 检查两个日期是否是同一天（UTC）
 */
export function isSameDay(date1: Date | string | number, date2: Date | string | number): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * 获取友好的时间描述
 */
export function getFriendlyTime(utcDate: Date | string | number): string {
  const date = toBeijingTime(utcDate);
  const nowBJ = new Date(Date.now() + BEIJING_OFFSET_MS);
  const diffMs = nowBJ.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;

  return formatBeijingTime(date, 'MM-dd');
}
