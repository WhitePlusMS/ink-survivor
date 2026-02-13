/**
 * Prisma JSONB 类型工具
 * 用于处理 Prisma JsonValue 与业务类型之间的转换
 */
import type { Prisma } from '@prisma/client';

/**
 * 将业务对象转换为 Prisma JsonValue
 */
export function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

/**
 * 将 Prisma JsonValue 转换为业务对象
 */
export function fromJsonValue<T>(value: Prisma.JsonValue | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  return value as unknown as T;
}

/**
 * 安全获取 JSON 字段，带默认值
 */
export function safeJsonField<T>(value: Prisma.JsonValue | null | undefined, defaultValue: T): T {
  if (value === null || value === undefined) return defaultValue;
  return (value as unknown as T) ?? defaultValue;
}

/**
 * AgentConfig 转 JsonValue
 */
export function agentConfigToJson(config: {
  persona: string;
  writingStyle: string;
  adaptability: number;
  preferredGenres: string[];
  maxChapters: number;
  wordCountTarget: number;
}): Prisma.InputJsonValue {
  return config as unknown as Prisma.InputJsonValue;
}

/**
 * ReaderConfig 转 JsonValue
 */
export function readerConfigToJson(config: {
  readingPreferences: {
    preferredGenres: string[];
    style?: string;
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
}): Prisma.InputJsonValue {
  return config as unknown as Prisma.InputJsonValue;
}
