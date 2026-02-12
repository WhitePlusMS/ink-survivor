# 任务 07：书籍模块 - 基础 CRUD 与大纲生成

## 任务目标
实现书籍的 CRUD 操作和大纲生成功能

## 依赖关系
- 任务 02（数据库 Schema）完成后
- 任务 05（SecondMe API）完成后
- 任务 06（赛季模块）完成后

## 交付物清单

### 7.1 书籍 DTO
- [ ] 创建书籍相关 DTO 类

### 7.2 书籍 Service
- [ ] 创建书籍 Service 类
- [ ] 实现书籍 CRUD
- [ ] 实现大纲生成逻辑

### 7.3 书籍 API 路由
- [ ] `GET /api/books` - 获取书籍列表
- [ ] `GET /api/books/:id` - 获取书籍详情
- [ ] `POST /api/books` - 创建新书
- [ ] `GET /api/books/:id/outline` - 获取大纲
- [ ] `POST /api/books/:id/generate-outline` - 生成大纲

### 7.4 大纲类型定义
- [ ] 添加大纲相关类型

## 涉及文件清单
| 文件路径                                           | 操作 |
| -------------------------------------------------- | ---- |
| `src/common/dto/book.dto.ts`                       | 新建 |
| `src/services/book.service.ts`                     | 新建 |
| `src/services/outline.service.ts`                  | 新建 |
| `src/app/api/books/route.ts`                       | 新建 |
| `src/app/api/books/[id]/route.ts`                  | 新建 |
| `src/app/api/books/[id]/outline/route.ts`          | 新建 |
| `src/app/api/books/[id]/generate-outline/route.ts` | 新建 |
| `src/types/book.ts`                                | 新建 |
| `src/types/outline.ts`                             | 新建 |

## 详细设计

### 类型定义
```typescript
// src/types/book.ts
export type BookStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';

export interface BookConfig {
  title: string;
  shortDesc: string;
  zoneStyle: string;
  seasonId?: string;
}

export interface BookDetail {
  id: string;
  title: string;
  coverImage?: string;
  authorId: string;
  author: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  seasonId?: string;
  zoneStyle: string;
  shortDesc?: string;
  longDesc?: string;
  status: BookStatus;
  currentChapter: number;
  plannedChapters?: number;
  inkBalance: number;
  heat: number;
  chapterCount: number;
  createdAt: Date;
}

// src/types/outline.ts
export interface Character {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  description: string;
  motivation: string;
}

export interface ChapterPlan {
  number: number;
  title: string;
  summary: string;
  key_events: string[];
  word_count_target: number;
}

export interface OutlineData {
  title: string;
  summary: string;
  characters: Character[];
  chapters: ChapterPlan[];
  themes: string[];
  tone: string;
}
```

### 书籍 Service
```typescript
// src/services/book.service.ts
import { prisma } from '@/lib/prisma';
import { BookStatus } from '@/types/book';

export class BookService {
  /**
   * 获取书籍列表
   */
  async getBooks(options?: {
    zoneStyle?: string;
    status?: BookStatus;
    authorId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (options?.zoneStyle) where.zoneStyle = options.zoneStyle;
    if (options?.status) where.status = options.status;
    if (options?.authorId) where.authorId = options.authorId;

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          author: { select: { id: true, nickname: true, avatar: true } },
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
   * 获取书籍详情
   */
  async getBookById(bookId: string) {
    return prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: { select: { id: true, nickname: true, avatar: true } },
        season: { select: { id: true, seasonNumber: true, themeKeyword: true } },
        outline: true,
        chapters: {
          orderBy: { chapterNumber: 'asc' },
        },
        score: true,
      },
    });
  }

  /**
   * 创建新书
   */
  async createBook(data: {
    title: string;
    shortDesc?: string;
    zoneStyle: string;
    authorId: string;
    seasonId?: string;
  }) {
    // 创建书籍
    const book = await prisma.book.create({
      data: {
        title: data.title,
        shortDesc: data.shortDesc,
        zoneStyle: data.zoneStyle,
        authorId: data.authorId,
        seasonId: data.seasonId,
        status: 'DRAFT',
        inkBalance: 50, // 参赛初始 Ink
      },
    });

    // 创建空的 BookScore
    await prisma.bookScore.create({
      data: { bookId: book.id },
    });

    return book;
  }

  /**
   * 更新书籍状态
   */
  async updateBookStatus(bookId: string, status: BookStatus) {
    return prisma.book.update({
      where: { id: bookId },
      data: { status },
    });
  }

  /**
   * 更新书籍热度
   */
  async updateHeat(bookId: string, heatDelta: number) {
    return prisma.book.update({
      where: { id: bookId },
      data: {
        heat: { increment: heatDelta },
      },
    });
  }

  /**
   * 增加章节数
   */
  async incrementChapterCount(bookId: string) {
    return prisma.book.update({
      where: { id: bookId },
      data: {
        chapterCount: { increment: 1 },
        currentChapter: { increment: 1 },
      },
    });
  }

  /**
   * 增加阅读量
   */
  async incrementReadCount(bookId: string) {
    await prisma.book.update({
      where: { id: bookId },
      data: { heat: { increment: 1 } },
    });

    await prisma.bookScore.update({
      where: { bookId },
      data: { viewCount: { increment: 1 } },
    });
  }
}

export const bookService = new BookService();
```

### 大纲生成 Service
```typescript
// src/services/outline.service.ts
import { prisma } from '@/lib/prisma';
import { SecondMeClient } from '@/lib/secondme/client';
import { buildOutlinePrompt } from '@/lib/secondme/prompts';
import { OutlineData } from '@/types/outline';

export class OutlineService {
  /**
   * 生成大纲
   */
  async generateOutline(bookId: string, userId: string): Promise<OutlineData> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { season: true },
    });

    if (!book) throw new Error('Book not found');

    const secondMe = new SecondMeClient(userId);
    const userInfo = await secondMe.getUserInfo();

    // 构建 Prompt
    const prompt = buildOutlinePrompt({
      seasonTheme: book.season?.themeKeyword || '自由创作',
      constraints: book.season ? JSON.parse(book.season.constraints) : [],
      zoneStyle: book.zoneStyle,
    });

    // 设置作家角色
    const systemPrompt = `你是${userInfo.name}，一个热爱创作的故事作家。`;

    // 流式生成大纲
    let outlineContent = '';
    for await (const chunk of secondMe.streamChat({
      message: prompt,
      systemPrompt,
    })) {
      outlineContent += chunk;
    }

    // 解析 JSON
    const outlineData = JSON.parse(outlineContent) as OutlineData;

    // 保存大纲
    await this.saveOutline(bookId, outlineData);

    return outlineData;
  }

  /**
   * 保存大纲到数据库
   */
  async saveOutline(bookId: string, outline: OutlineData) {
    // 更新或创建 Outline
    await prisma.outline.upsert({
      where: { bookId },
      create: {
        bookId,
        originalIntent: outline.summary,
        characters: JSON.stringify(outline.characters),
        chaptersPlan: JSON.stringify(outline.chapters),
      },
      update: {
        originalIntent: outline.summary,
        characters: JSON.stringify(outline.characters),
        chaptersPlan: JSON.stringify(outline.chapters),
      },
    });

    // 更新书籍状态
    await prisma.book.update({
      where: { id: bookId },
      data: {
        longDesc: outline.summary,
        plannedChapters: outline.chapters.length,
      },
    });
  }

  /**
   * 获取大纲
   */
  async getOutline(bookId: string) {
    return prisma.outline.findUnique({
      where: { bookId },
    });
  }

  /**
   * 更新大纲章节
   */
  async updateChapterPlan(bookId: string, chapterNumber: number, plan: Partial<ChapterPlan>) {
    const outline = await prisma.outline.findUnique({ where: { bookId } });
    if (!outline) throw new Error('Outline not found');

    const chapters = JSON.parse(outline.chaptersPlan) as ChapterPlan[];
    const index = chapters.findIndex(c => c.number === chapterNumber);
    if (index === -1) throw new Error('Chapter not found');

    chapters[index] = { ...chapters[index], ...plan };

    // 记录修改日志
    const mods = JSON.parse(outline.modificationLog || '[]');
    mods.push({
      chapterNumber,
      updatedAt: new Date(),
      changes: plan,
    });

    return prisma.outline.update({
      where: { bookId },
      data: {
        chaptersPlan: JSON.stringify(chapters),
        modificationLog: JSON.stringify(mods),
      },
    });
  }
}

export const outlineService = new OutlineService();
```

### API 路由
```typescript
// src/app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { bookService } from '@/services/book.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneStyle = searchParams.get('zoneStyle') || undefined;
    const status = searchParams.get('status') as any || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { books, total } = await bookService.getBooks({
      zoneStyle,
      status,
      limit,
      offset,
    });

    return NextResponse.json({
      data: books,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error('Get books error:', error);
    return NextResponse.json({ error: 'Failed to get books' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: 从 Session 获取当前用户 ID
    const userId = 'temp-user-id';

    const body = await request.json();
    const { title, shortDesc, zoneStyle, seasonId } = body;

    const book = await bookService.createBook({
      title,
      shortDesc,
      zoneStyle,
      authorId: userId,
      seasonId,
    });

    return NextResponse.json({ data: book }, { status: 201 });
  } catch (error) {
    console.error('Create book error:', error);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}
```

## 验证标准
- [ ] 书籍创建成功
- [ ] 大纲生成成功
- [ ] API 响应格式正确

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现书籍模块基础 CRUD 与大纲生成`。