# 任务 21：用户服务与 DTO

## 任务目标
创建用户相关的 Service 和 DTO，统一管理用户数据

## 依赖关系
- 任务 02（数据库 Schema）完成后

## 交付物清单

### 21.1 用户 Service
- [ ] 创建用户 Service 类
- [ ] 实现用户 CRUD

### 21.2 用户 DTO
- [ ] 创建用户相关 DTO

### 21.3 用户 API
- [ ] `GET /api/user/profile` - 获取用户资料
- [ ] `PUT /api/user/agent-config` - 更新 Agent 配置
- [ ] `GET /api/user/books` - 获取我的书籍

## 涉及文件清单
| 文件路径                                 | 操作 |
| ---------------------------------------- | ---- |
| `src/services/user.service.ts`           | 新建 |
| `src/common/dto/user.dto.ts`             | 新建 |
| `src/app/api/user/profile/route.ts`      | 新建 |
| `src/app/api/user/agent-config/route.ts` | 新建 |
| `src/app/api/user/books/route.ts`        | 新建 |
| `src/app/api/user/favorites/route.ts`    | 新建 |

## 详细设计

### 用户 Service
```typescript
// src/services/user.service.ts
import { prisma } from '@/lib/prisma';

export class UserService {
  /**
   * 根据 ID 获取用户
   */
  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        token: { select: { scope: true } },
      },
    });
  }

  /**
   * 根据 SecondMe ID 获取用户
   */
  async getUserBySecondMeId(secondMeId: string) {
    return prisma.user.findUnique({
      where: { secondMeId },
    });
  }

  /**
   * 创建或更新用户
   */
  async upsertUser(data: {
    secondMeId: string;
    nickname: string;
    avatar?: string;
    email?: string;
  }) {
    return prisma.user.upsert({
      where: { secondMeId: data.secondMeId },
      create: {
        secondMeId: data.secondMeId,
        nickname: data.nickname,
        avatar: data.avatar,
        email: data.email,
      },
      update: {
        nickname: data.nickname,
        avatar: data.avatar,
      },
    });
  }

  /**
   * 更新 Agent 配置
   */
  async updateAgentConfig(
    userId: string,
    config: {
      persona: string;
      writingStyle: string;
      adaptability: number;
      preferredGenres: string[];
      maxChapters: number;
      wordCountTarget: number;
    }
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        agentConfig: JSON.stringify(config),
      },
    });
  }

  /**
   * 获取用户的赛季参赛记录
   */
  async getSeasonParticipations(userId: string) {
    return prisma.seasonParticipation.findMany({
      where: { userId },
      include: {
        season: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * 获取用户的收藏
   */
  async getUserFavorites(userId: string) {
    const readings = await prisma.reading.findMany({
      where: {
        userId,
        finished: false,
      },
      include: {
        book: {
          include: {
            author: { select: { nickname: true } },
            score: true,
          },
        },
      },
    });

    return readings.map(r => r.book);
  }

  /**
   * 获取用户的书籍
   */
  async getUserBooks(userId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { authorId: userId };
    if (options?.status) where.status = options.status;

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          season: { select: { seasonNumber: true, themeKeyword: true } },
          score: true,
          _count: { select: { chapters: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      prisma.book.count({ where }),
    ]);

    return { books, total };
  }

  /**
   * 更新用户统计数据
   */
  async updateStats(userId: string, updates: {
    booksWritten?: number;
    booksCompleted?: number;
    seasonsJoined?: number;
    totalInk?: number;
  }) {
    return prisma.user.update({
      where: { id: userId },
      data: updates,
    });
  }
}

export const userService = new UserService();
```

### 用户 API 路由
```typescript
// src/app/api/user/profile/route.ts
import { NextResponse } from 'next/server';
import { userService } from '@/services/user.service';

// TODO: 从 Session 获取当前用户 ID
const CURRENT_USER_ID = 'temp-user-id';

export async function GET() {
  try {
    const user = await userService.getUserById(CURRENT_USER_ID);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email,
        agentConfig: user.agentConfig ? JSON.parse(user.agentConfig) : null,
        totalInk: user.totalInk,
        booksWritten: user.booksWritten,
        seasonsJoined: user.seasonsJoined,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}
```

```typescript
// src/app/api/user/agent-config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/services/user.service';

const CURRENT_USER_ID = 'temp-user-id';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { persona, writingStyle, adaptability, preferredGenres, maxChapters, wordCountTarget } = body;

    await userService.updateAgentConfig(CURRENT_USER_ID, {
      persona,
      writingStyle,
      adaptability,
      preferredGenres,
      maxChapters,
      wordCountTarget,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update agent config error:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
```

## 验证标准
- [ ] 用户数据正确获取
- [ ] Agent 配置正确更新
- [ ] 书籍列表正确返回
重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现用户服务与 API 路由`。