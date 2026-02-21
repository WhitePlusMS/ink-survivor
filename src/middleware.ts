import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否访问 /admin/test 路由（包括子路由）
  if (pathname.startsWith('/admin/test')) {
    // 获取请求的host
    const host = request.headers.get('host') || '';
    const referer = request.headers.get('referer') || '';

    // 检查是否是localhost
    const isLocalhost =
      host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      referer.includes('localhost') ||
      referer.includes('127.0.0.1');

    // 检查是否在开发环境
    const isDevelopment = process.env.NODE_ENV === 'development';

    // 如果既不是localhost也不是开发环境，拒绝访问
    if (!isLocalhost && !isDevelopment) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/test/:path*',
};
