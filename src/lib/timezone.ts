/**
 * 时区工具模块
 *
 * 统一使用北京时间 (Asia/Shanghai, UTC+8)
 * 项目所有时间操作都基于北京时间
 *
 * 原则：
 * - 数据库存储 UTC 时间（标准做法）
 * - 读取数据库时间时转换为北京时间
 * - 显示给用户的时间都是北京时间
 * - 时间比较时统一使用北京时间戳
 */

import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 北京时区偏移量（毫秒）- 8小时
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

// 北京时区
export const BEIJING_TIMEZONE = 'Asia/Shanghai';

/**
 * 获取当前北京时间戳（毫秒）
 * 这是 UTC 时间戳 + 8小时
 */
export function nowMs(): number {
  return Date.now() + BEIJING_OFFSET_MS;
}

/**
 * 获取当前北京时间（Date 对象）
 * 注意：这个 Date 对象的时间戳是北京时间转换后的
 */
export function now(): Date {
  return new Date(nowMs());
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
 * 支持：Date 对象、ISO 字符串、Unix 时间戳（毫秒）
 */
export function toBeijingTime(date: Date | string | number): Date {
  if (!date) return now();

  let utcMs: number;
  if (typeof date === 'number') {
    // Unix 时间戳（毫秒）
    utcMs = date;
  } else if (typeof date === 'string') {
    // ISO 字符串或普通字符串
    utcMs = new Date(date).getTime();
  } else {
    utcMs = date.getTime();
  }

  return new Date(toBeijingTimeMs(utcMs));
}

/**
 * 获取时间的北京时间戳（毫秒）
 */
export function getBeijingTimeMs(date: Date | string | number): number {
  if (!date) return nowMs();

  let utcMs: number;
  if (typeof date === 'number') {
    utcMs = date;
  } else if (typeof date === 'string') {
    utcMs = new Date(date).getTime();
  } else {
    utcMs = date.getTime();
  }

  return toBeijingTimeMs(utcMs);
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

  // 北京时间转 UTC
  const utcMs = beijingMs - BEIJING_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * 格式化时间为北京时间
 */
export function formatBeijingTime(
  date: Date | string | number,
  formatStr: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  if (!date) return '';

  const d = typeof date === 'string' || typeof date === 'number'
    ? new Date(date)
    : date;

  const beijingDate = new Date(toBeijingTimeMs(d.getTime()));
  return format(beijingDate, formatStr, { locale: zhCN });
}

/**
 * 比较时间是否已过期（使用北京时间）
 */
export function isExpired(utcEndTime: Date | string | number): boolean {
  const nowBeijingMs = nowMs();
  const endTimeBeijingMs = getBeijingTimeMs(utcEndTime);
  return nowBeijingMs >= endTimeBeijingMs;
}

/**
 * 获取剩余时间（毫秒，使用北京时间）
 */
export function getRemainingTime(utcEndTime: Date | string | number): number {
  const nowBeijingMs = nowMs();
  const endTimeBeijingMs = getBeijingTimeMs(utcEndTime);
  return Math.max(0, endTimeBeijingMs - nowBeijingMs);
}

/**
 * 获取阶段剩余时间（毫秒，使用北京时间）
 */
export function getPhaseRemainingTime(
  phaseStartTime: Date | string | number,
  phaseDurationMinutes: number
): number {
  const startBeijingMs = getBeijingTimeMs(phaseStartTime);
  const nowBeijingMs = nowMs();
  const durationMs = phaseDurationMinutes * 60 * 1000;
  const elapsed = nowBeijingMs - startBeijingMs;
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
 * 获取今天的开始时间（北京时间）
 */
export function getTodayStart(): Date {
  const nowBeijing = now();
  return new Date(nowBeijing.getFullYear(), nowBeijing.getMonth(), nowBeijing.getDate());
}

/**
 * 获取明天的开始时间（北京时间）
 */
export function getTomorrowStart(): Date {
  return addDays(getTodayStart(), 1);
}

/**
 * 检查两个日期是否是同一天（北京时间）
 */
export function isSameDay(date1: Date | string | number, date2: Date | string | number): boolean {
  const d1 = toBeijingTime(date1);
  const d2 = toBeijingTime(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 获取友好的时间描述
 */
export function getFriendlyTime(utcDate: Date | string | number): string {
  const date = toBeijingTime(utcDate);
  const nowBeijing = now();
  const diffMs = nowBeijing.getTime() - date.getTime();

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
