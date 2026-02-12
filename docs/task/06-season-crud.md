# 任务 06：赛季模块 - 基础 CRUD 与 API

## 任务目标
实现赛季的基础 CRUD 操作和 API 接口

## 依赖关系
- 任务 02（数据库 Schema）完成后

## 交付物清单

### 6.1 赛季 DTO
- [ ] 创建赛季相关 DTO 类

### 6.2 赛季 Service
- [ ] 创建赛季 Service 类
- [ ] 实现 CRUD 方法

### 6.3 赛季 API 路由
- [ ] `GET /api/seasons/current` - 获取当前赛季
- [ ] `GET /api/seasons/:id` - 获取赛季详情
- [ ] `GET /api/seasons/:id/books` - 获取赛季书籍列表

### 6.4 赛季类型定义
- [ ] 添加赛季状态类型
- [ ] 添加赛季奖励类型

## 涉及文件清单
| 文件路径                                  | 操作 |
| ----------------------------------------- | ---- |
| `src/common/dto/season.dto.ts`            | 新建 |
| `src/services/season.service.ts`          | 新建 |
| `src/app/api/seasons/current/route.ts`    | 新建 |
| `src/app/api/seasons/[id]/route.ts`       | 新建 |
| `src/app/api/seasons/[id]/books/route.ts` | 新建 |
| `src/types/season.ts`                     | 新建 |

## 详细设计

### 类型定义
```typescript
// src/types/season.ts

export type SeasonStatus = 'PENDING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';

export interface SeasonReward {
  first: number;
  second: number;
  third: number;
  completionPerChapter: number;
}

export interface SeasonConfig {
  seasonId: string;
  status: SeasonStatus;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  duration: number;
  startTime: Date;
  endTime: Date;
  signupDeadline: Date;
  maxChapters: number;
  minChapters: number;
  rewards: SeasonReward;
}

export interface SeasonInvitation {
  seasonId: string;
  title: string;
  themeKeyword: string;
  constraints: string[];
  duration: number;
  signupDeadline: Date;
  minChapters: number;
  maxChapters: number;
  minWords: number;
  maxWords: number;
  zoneStyles: string[];
  rewards: SeasonReward;
}
```

### DTO 类
```typescript
// src/common/dto/season.dto.ts
import { IsString, IsNumber, IsDate, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSeasonDto {
  @IsNumber()
  seasonNumber: number;

  @IsString()
  themeKeyword: string;

  @IsArray()
  @IsString({ each: true })
  constraints: string[];

  @IsArray()
  @IsString({ each: true })
  zoneStyles: string[];

  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @IsNumber()
  duration: number = 120;

  @IsNumber()
  maxChapters: number = 10;

  @IsNumber()
  minChapters: number = 3;

  @IsOptional()
  rewards?: {
    first: number;
    second: number;
    third: number;
    completionPerChapter: number;
  };
}

export class SeasonResponseDto {
  id: string;
  seasonNumber: number;
  status: string;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  duration: number;
  startTime: Date;
  endTime: Date;
  signupDeadline: Date;
  maxChapters: number;
  minChapters: number;
  rewards: any;
  participantCount: number;
  createdAt: Date;

  static fromEntity(entity: any): SeasonResponseDto {
    return {
      id: entity.id,
      seasonNumber: entity.seasonNumber,
      status: entity.status,
      themeKeyword: entity.themeKeyword,
      constraints: JSON.parse(entity.constraints),
      zoneStyles: JSON.parse(entity.zoneStyles),
      duration: entity.duration,
      startTime: entity.startTime,
      endTime: entity.endTime,
      signupDeadline: entity.signupDeadline,
      maxChapters: entity.maxChapters,
      minChapters: entity.minChapters,
      rewards: JSON.parse(entity.rewards || '{}'),
      participantCount: entity.participantCount,
      createdAt: entity.createdAt,
    };
  }
}
```

### Service 类
```typescript
// src/services/season.service.ts
import { prisma } from '@/lib/prisma';
import { SeasonStatus } from '@/types/season';

export class SeasonService {
  /**
   * 获取当前赛季
   */
  async getCurrentSeason() {
    return prisma.season.findFirst({
      where: {
        status: 'ACTIVE',
      },
      orderBy: { startTime: 'desc' },
    });
  }

  /**
   * 获取赛季详情
   */
  async getSeasonById(seasonId: string) {
    return prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        books: {
          take: 10,
          orderBy: { heat: 'desc' },
        },
        _count: {
          select: { participations: true },
        },
      },
    });
  }

  /**
   * 获取当前赛季的书籍列表
   */
  async getSeasonBooks(seasonId: string, options?: {
    zoneStyle?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { seasonId };
    if (options?.zoneStyle) {
      where.zoneStyle = options.zoneStyle;
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          author: {
            select: { id: true, nickname: true, avatar: true },
          },
          score: true,
        },
        orderBy: { heat: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      prisma.book.count({ where }),
    ]);

    return { books, total };
  }

  /**
   * 创建赛季
   */
  async createSeason(data: {
    seasonNumber: number;
    themeKeyword: string;
    constraints: string[];
    zoneStyles: string[];
    startTime: Date;
    endTime: Date;
    duration: number;
    maxChapters: number;
    minChapters: number;
    rewards: any;
  }) {
    const signupDeadline = new Date(data.startTime.getTime() + 10 * 60 * 1000); // 报名截止：开始后10分钟

    return prisma.season.create({
      data: {
        ...data,
        constraints: JSON.stringify(data.constraints),
        zoneStyles: JSON.stringify(data.zoneStyles),
        rewards: JSON.stringify(data.rewards),
        signupDeadline,
      },
    });
  }

  /**
   * 更新赛季状态
   */
  async updateSeasonStatus(seasonId: string, status: SeasonStatus) {
    return prisma.season.update({
      where: { id: seasonId },
      data: { status },
    });
  }

  /**
   * 增加参赛人数
   */
  async incrementParticipantCount(seasonId: string) {
    return prisma.season.update({
      where: { id: seasonId },
      data: {
        participantCount: { increment: 1 },
      },
    });
  }

  /**
   * 检查赛季是否可报名
   */
  async canJoinSeason(seasonId: string): Promise<boolean> {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) return false;
    if (season.status !== 'ACTIVE') return false;

    const now = new Date();
    return now < season.signupDeadline;
  }
}

export const seasonService = new SeasonService();
```

### API 路由
```typescript
// src/app/api/seasons/current/route.ts
import { NextResponse } from 'next/server';
import { seasonService } from '@/services/season.service';

export async function GET() {
  try {
    const season = await seasonService.getCurrentSeason();

    if (!season) {
      return NextResponse.json({ data: null });
    }

    const response = {
      data: {
        id: season.id,
        seasonNumber: season.seasonNumber,
        status: season.status,
        themeKeyword: season.themeKeyword,
        constraints: JSON.parse(season.constraints),
        zoneStyles: JSON.parse(season.zoneStyles),
        duration: season.duration,
        startTime: season.startTime,
        endTime: season.endTime,
        signupDeadline: season.signupDeadline,
        maxChapters: season.maxChapters,
        minChapters: season.minChapters,
        rewards: JSON.parse(season.rewards || '{}'),
        participantCount: season.participantCount,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get current season error:', error);
    return NextResponse.json({ error: 'Failed to get current season' }, { status: 500 });
  }
}
```

## 验证标准
- [ ] API 响应格式正确
- [ ] 数据库查询正常
- [ ] DTO 验证正常工作

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现赛季模块基础 CRUD 和 API`。