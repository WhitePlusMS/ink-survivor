/**
 * 统一日志工具
 *
 * 提供标准化的日志记录格式，包括：
 * - 请求日志
 * - 响应日志
 * - 错误日志
 * - 性能日志
 */

import { NextRequest, NextResponse } from 'next/server';

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 日志颜色（用于开发环境） */
const levelColors: Record<LogLevel, string> = {
  debug: '\x1b[36m',   // 青色
  info: '\x1b[32m',    // 绿色
  warn: '\x1b[33m',    // 黄色
  error: '\x1b[31m',   // 红色
};

const reset = '\x1b[0m';

/**
 * 格式化日志消息
 */
function formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const color = levelColors[level];

  let log = `${color}[${level.toUpperCase()}]${reset} ${timestamp} ${message}`;

  if (data) {
    // 过滤敏感信息
    const safeData = { ...data };
    if (safeData.password) safeData.password = '***';
    if (safeData.token) safeData.token = `${String(safeData.token).slice(0, 10)}...`;
    if (safeData.accessToken) safeData.accessToken = '***';
    if (safeData.refreshToken) safeData.refreshToken = '***';

    log += `\n  ${JSON.stringify(safeData, null, 2)}`;
  }

  return log;
}

/**
 * 日志输出
 */
function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const formatted = formatMessage(level, message, data);

  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

/**
 * API 日志工具类
 */
export const apiLogger = {
  /** 调试日志 */
  debug(message: string, data?: Record<string, unknown>): void {
    log('debug', message, data);
  },

  /** 信息日志 */
  info(message: string, data?: Record<string, unknown>): void {
    log('info', message, data);
  },

  /** 警告日志 */
  warn(message: string, data?: Record<string, unknown>): void {
    log('warn', message, data);
  },

  /** 错误日志 */
  error(message: string, data?: Record<string, unknown>): void {
    log('error', message, data);
  },

  /**
   * API 请求入口日志
   */
  request(req: NextRequest, extraData?: Record<string, unknown>): void {
    const startTime = Date.now();

    // 记录到请求上下文，供响应时计算耗时
    (req as unknown as { __startTime?: number }).__startTime = startTime;

    const data = {
      method: req.method,
      url: req.url,
      path: req.nextUrl?.pathname,
      query: Object.fromEntries(req.nextUrl?.searchParams || []),
      ...extraData,
    };

    log('info', `→ ${req.method} ${req.nextUrl?.pathname}`, data);
  },

  /**
   * API 响应日志
   */
  response(req: NextRequest, res: NextResponse, data?: Record<string, unknown>): void {
    const startTime = (req as unknown as { __startTime?: number }).__startTime || Date.now();
    const duration = Date.now() - startTime;

    const logData = {
      status: res.status,
      duration: `${duration}ms`,
      ...data,
    };

    const formatted = formatMessage(
      res.status >= 400 ? 'error' : 'info',
      `${res.status >= 400 ? '✗' : '✓'} ${req.method} ${req.nextUrl?.pathname} ${res.status} in ${duration}ms`,
      logData
    );

    if (duration > 1000) {
      // 超过 1 秒的请求用警告颜色
      console.warn(`${levelColors.warn}[SLOW]${reset} ${formatted}`);
    } else {
      console.log(formatted);
    }
  },

  /**
   * 带错误响应日志
   */
  errorResponse(req: NextRequest, error: unknown, extraData?: Record<string, unknown>): void {
    const startTime = (req as unknown as { __startTime?: number }).__startTime || Date.now();
    const duration = Date.now() - startTime;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    log('error', `✗ ${req.method} ${req.nextUrl?.pathname} FAILED in ${duration}ms`, {
      error: errorMessage,
      stack: errorStack,
      duration: `${duration}ms`,
      ...extraData,
    });
  },
};

/**
 * 服务日志工具类
 * 用于 Service 层的业务逻辑日志
 */
export const serviceLogger = {
  debug(message: string, data?: Record<string, unknown>): void {
    log('debug', `  [Service] ${message}`, data);
  },

  info(message: string, data?: Record<string, unknown>): void {
    log('info', `  [Service] ${message}`, data);
  },

  warn(message: string, data?: Record<string, unknown>): void {
    log('warn', `  [Service] ${message}`, data);
  },

  error(message: string, data?: Record<string, unknown>): void {
    log('error', `  [Service] ${message}`, data);
  },

  /** 记录方法调用 */
  call(method: string, params?: Record<string, unknown>): void {
    log('debug', `[Call] ${method}`, { params });
  },

  /** 记录方法返回 */
  result(method: string, result: unknown, duration?: number): void {
    const data: Record<string, unknown> = { result };
    if (duration !== undefined) {
      data.duration = `${duration}ms`;
    }
    log('debug', `[Return] ${method}`, data);
  },
};

/**
 * 性能日志工具
 */
export const perfLogger = {
  /** 开始计时 */
  start(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      if (duration > 1000) {
        log('warn', `[Perf] ${label} 耗时过长: ${duration}ms`);
      } else {
        log('info', `[Perf] ${label}: ${duration}ms`);
      }
    };
  },
};
