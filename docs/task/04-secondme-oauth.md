# 任务 04：SecondMe OAuth2 认证模块

## 任务目标
实现 SecondMe OAuth2 登录认证流程，包括授权、重定向处理、Token 管理

## 依赖关系
- 任务 01（项目初始化）完成后
- 任务 02（数据库 Schema）完成后

## 交付物清单

### 4.1 OAuth2 配置
- [ ] 配置 SecondMe OAuth2 客户端信息
- [ ] 创建 OAuth2 工具函数

### 4.2 授权入口 API
- [ ] `GET /api/auth/login` - 重定向到 SecondMe 授权页

### 4.3 回调处理 API
- [ ] `GET /api/auth/callback` - 处理授权回调，交换 Token

### 4.4 Token 管理
- [ ] Token 存储到数据库
- [ ] Token 自动刷新机制
- [ ] Token 过期检测

### 4.5 认证状态管理
- [ ] 创建认证 Context
- [ ] 获取当前用户信息

## 涉及文件清单
| 文件路径                             | 操作 |
| ------------------------------------ | ---- |
| `src/lib/secondme/oauth.ts`          | 新建 |
| `src/lib/secondme/token.ts`          | 新建 |
| `src/lib/secondme/client.ts`         | 新建 |
| `src/app/api/auth/login/route.ts`    | 新建 |
| `src/app/api/auth/callback/route.ts` | 新建 |
| `src/app/api/auth/me/route.ts`       | 新建 |
| `src/app/api/auth/refresh/route.ts`  | 新建 |
| `src/components/auth-provider.tsx`   | 新建 |
| `src/hooks/use-auth.ts`              | 新建 |

## 详细设计

### OAuth2 授权 URL 构建
```typescript
// src/lib/secondme/oauth.ts
import { SecondMeConfig } from '@/lib/config';

export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: SecondMeConfig.clientId,
    redirect_uri: SecondMeConfig.redirectUri,
    response_type: 'code',
    scope: 'user.info,user.info.shades,user.info.softmemory,chat,note.add',
  });

  return `https://app.mindos.com/gate/lab/oauth/authorize?${params}`;
}

export function generateState(): string {
  return crypto.randomUUID();
}
```

### Token 交换与存储
```typescript
// src/lib/secondme/token.ts
import { prisma } from '@/lib/prisma';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const response = await fetch('https://app.mindos.com/gate/lab/api/oauth/token/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.SECONDME_CLIENT_ID!,
      client_secret: process.env.SECONDME_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  return response.json();
}

export async function saveUserToken(userId: string, tokens: TokenResponse): Promise<void> {
  await prisma.userToken.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      scope: tokens.scope.join(','),
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      lastRefreshed: new Date(),
    },
  });
}
```

### Token 自动刷新
```typescript
// src/lib/secondme/token.ts
export async function refreshAccessToken(userId: string): Promise<void> {
  const userToken = await prisma.userToken.findUnique({ where: { userId } });
  if (!userToken) throw new Error('Token not found');

  const response = await fetch('https://app.mindos.com/gate/lab/api/oauth/token/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: userToken.refreshToken,
      client_id: process.env.SECONDME_CLIENT_ID!,
      client_secret: process.env.SECONDME_CLIENT_SECRET!,
    }),
  });

  const tokens = await response.json();

  await prisma.userToken.update({
    where: { userId },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      lastRefreshed: new Date(),
      refreshCount: { increment: 1 },
    },
  });
}
```

### API 路由实现

```typescript
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { buildAuthorizationUrl, generateState } from '@/lib/secondme/oauth';

export async function GET() {
  const state = generateState();
  // TODO: 存储 state 到 cookie 用于 CSRF 防护

  const authUrl = buildAuthorizationUrl(state);
  return NextResponse.redirect(authUrl);
}

// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, saveUserToken } from '@/lib/secondme/oauth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url));
  }

  try {
    // 1. 交换 Token
    const tokens = await exchangeCodeForToken(code);

    // 2. 获取用户信息
    const userInfo = await fetchUserInfo(tokens.access_token);

    // 3. 创建/更新用户
    const user = await prisma.user.upsert({
      where: { secondMeId: userInfo.userId },
      create: {
        secondMeId: userInfo.userId,
        nickname: userInfo.name,
        avatar: userInfo.avatar,
        email: userInfo.email,
      },
      update: {
        nickname: userInfo.name,
        avatar: userInfo.avatar,
      },
    });

    // 4. 存储 Token
    await saveUserToken(user.id, tokens);

    // 5. 设置登录态 Cookie
    const response = NextResponse.redirect(new URL('/home', req.url));
    response.cookies.set('auth_token', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', req.url));
  }
}
```

### 认证 Hook
```typescript
// src/hooks/use-auth.ts
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  nickname: string;
  avatar?: string;
  secondMeId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 获取当前用户信息
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = () => {
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

## 验证标准
- [ ] 点击登录跳转到 SecondMe 授权页
- [ ] 授权成功后正确跳转回应用
- [ ] 用户信息正确存储到数据库
- [ ] Token 刷新机制正常工作
- [ ] 刷新页面保持登录状态


重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现 SecondMe OAuth2 认证模块`。