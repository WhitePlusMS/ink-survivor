/**
 * 时区工具模块
 *
 * 统一使用北京时间 (Asia/Shanghai, UTC+8)
 * 项目所有时间操作都基于北京时间
 */

import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 北京时区偏移量（毫秒）
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

// 北京时间偏移量常量
const OFFSET = BEIJING_OFFSET_MS;

// 获取当前北京时间
export function now(): Date {
  return new Date(Date.now() + OFFSET);
}

// 获取当前北京时间的毫秒时间戳
export function nowMs(): number {
  return Date.now() + OFFSET;
}

// 将 UTC 时间转换为北京时间
export function toBeijingTime(utcDate: Date | string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.getTime() + OFFSET);
}

// 将北京时间转换为 UTC 时间（存库用）
export function toUTC(beijingDate: Date | string): Date {
  const date = typeof beijingDate === 'string' ? new Date(beijingDate) : beijingDate;
  return new Date(date.getTime() - OFFSET);
}

// 格式化北京时间
export function formatBeijingTime(
  date: Date | string,
  formatStr: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const beijingDate = toBeijingTime(d);
  return format(beijingDate, formatStr, { locale: zhCN });
}

// 比较时间是否已过期（使用北京时间）
export function isExpired(utcEndTime: Date | string): boolean {
  const nowBeijing = now();
  const endTime = typeof utcEndTime === 'string' ? new Date(utcEndTime) : utcEndTime;
  const endTimeBeijing = toBeijingTime(endTime);
  return nowBeijing >= endTimeBeijing;
}

// 获取剩余时间（毫秒，使用北京时间）
export function getRemainingTime(utcEndTime: Date | string): number {
  const nowBeijing = now();
  const endTime = typeof utcEndTime === 'string' ? new Date(utcEndTime) : utcEndTime;
  const endTimeBeijing = toBeijingTime(endTime);
  return Math.max(0, endTimeBeijing.getTime() - nowBeijing.getTime());
}

// 添加时间（毫秒）
export function addMs(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

// 添加分钟
export function addMinutes(date: Date, minutes: number): Date {
  return addMs(date, minutes * 60 * 1000);
}

// 添加小时
export function addHours(date: Date, hours: number): Date {
  return addMs(date, hours * 60 * 60 * 1000);
}

// 添加天数
export function addDays(date: Date, days: number): Date {
  return addMs(date, days * 24 * 60 * 60 * 1000);
}

// 获取阶段剩余时间（毫秒，使用北京时间）
export function getPhaseRemainingTime(
  phaseStartTime: Date | string,
  phaseDurationMinutes: number
): number {
  const startTime = typeof phaseStartTime === 'string' ? new Date(phaseStartTime) : phaseStartTime;
  const startTimeBeijing = toBeijingTime(startTime);
  const nowBeijing = now();
  const durationMs = phaseDurationMinutes * 60 * 1000;
  const elapsed = nowBeijing.getTime() - startTimeBeijing.getTime();
  return Math.max(0, durationMs - elapsed);
}
