/**
 * API 路由日志包装器
 *
 * 使用方法:
 * import { withLogger } from '@/lib/api-logger';
 *
 * export const GET = withLogger(handler, '获取用户信息');
 * export const POST = withLogger(handler, '创建书籍');
 */
import { NextRequest, NextResponse } from 'next/server';

type RouteHandler = (req: NextRequest, context?: Record<string, unknown>) => Promise<NextResponse>;

/**
 * 带日志的路由处理函数包装器
 */
export function withLogger(handler: RouteHandler, operationName?: string): RouteHandler {
  return async (req: NextRequest, context?: Record<string, unknown>) => {
    const operation = operationName || req.nextUrl?.pathname || 'API';
    const startTime = Date.now();

    // 记录请求
    console.log(`→ ${req.method} ${req.nextUrl?.pathname} - ${operation}`);

    try {
      // 执行处理函数
      const response = await handler(req, context);

      // 记录响应
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[SLOW] ✓ ${req.method} ${req.nextUrl?.pathname} ${response.status} in ${duration}ms`);
      } else {
        console.log(`✓ ${req.method} ${req.nextUrl?.pathname} ${response.status} in ${duration}ms`);
      }

      return response;
    } catch (error) {
      // 记录错误
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`✗ ${req.method} ${req.nextUrl?.pathname} FAILED in ${duration}ms - ${message}`);

      // 返回错误响应
      const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
      return NextResponse.json(
        { code: 500, data: null, message: errorMessage },
        { status: 500 }
      );
    }
  };
}

/**
 * 带日志的 GET 请求包装器
 */
export function withGetLogger(handler: RouteHandler, operationName?: string): RouteHandler {
  return withLogger(handler, operationName);
}

/**
 * 带日志的 POST 请求包装器
 */
export function withPostLogger(handler: RouteHandler, operationName?: string): RouteHandler {
  return withLogger(handler, operationName);
}

/**
 * 带日志的 PUT 请求包装器
 */
export function withPutLogger(handler: RouteHandler, operationName?: string): RouteHandler {
  return withLogger(handler, operationName);
}

/**
 * 带日志的 DELETE 请求包装器
 */
export function withDeleteLogger(handler: RouteHandler, operationName?: string): RouteHandler {
  return withLogger(handler, operationName);
}
