# 任务 08：章节模块 - 章节生成与发布

## 任务目标
实现章节生成、流式输出、发布功能

## 依赖关系
- 任务 07（书籍模块）完成后
- 任务 05（SecondMe API）完成后

## 交付物清单

### 8.1 章节 DTO
- [ ] 创建章节相关 DTO 类

### 8.2 章节 Service
- [ ] 创建章节 Service 类
- [ ] 实现章节生成逻辑
- [ ] 实现章节发布逻辑

### 8.3 章节 API 路由
- [ ] `GET /api/books/:id/chapters` - 获取章节列表
- [ ] `GET /api/books/:id/chapters/:num` - 获取指定章节
- [ ] `POST /api/books/:id/generate-chapter` - 生成新章节

### 8.4 SSE 流式输出
- [ ] 实现 SSE 端点用于章节生成流式推送

### 8.5 章节类型定义
- [ ] 添加章节相关类型

## 涉及文件清单
| 文件路径                                           | 操作 |
| -------------------------------------------------- | ---- |
| `src/common/dto/chapter.dto.ts`                    | 新建 |
| `src/services/chapter.service.ts`                  | 新建 |
| `src/app/api/books/[id]/chapters/route.ts`         | 新建 |
| `src/app/api/books/[id]/chapters/[num]/route.ts`   | 新建 |
| `src/app/api/books/[id]/generate-chapter/route.ts` | 新建 |
| `src/app/api/stream/chapter/[bookId]/route.ts`     | 新建 |
| `src/types/chapter.ts`                             | 新建 |

## 详细设计

### 类型定义
```typescript
// src/types/chapter.ts
export type ChapterStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'SKIPPED';

export interface ChapterDetail {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  content: string;
  contentLength: number;
  status: ChapterStatus;
  publishedAt?: Date;
  chatSessionId?: string;
  readCount: number;
  commentCount: number;
  inkCost: number;
  createdAt: Date;
}

export interface ChapterGenerationRequest {
  chapterNumber: number;
  systemPrompt?: string;
  feedbacks?: string[];
}

export interface ChapterGenerationResult {
  chapterNumber: number;
  title: string;
  content: string;
  contentLength: number;
}
```

### 章节 Service
```typescript
// src/services/chapter.service.ts
import { prisma } from '@/lib/prisma';
import { SecondMeClient } from '@/lib/secondme/client';
import { buildChapterPrompt } from '@/lib/secondme/prompts';
import { Readable } from 'stream';

export class ChapterService {
  /**
   * 获取章节列表
   */
  async getChapters(bookId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { bookId };
    if (options?.status) where.status = options.status;

    const [chapters, total] = await Promise.all([
      prisma.chapter.findMany({
        where,
        orderBy: { chapterNumber: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.chapter.count({ where }),
    ]);

    return { chapters, total };
  }

  /**
   * 获取指定章节
   */
  async getChapter(bookId: string, chapterNumber: number) {
    return prisma.chapter.findUnique({
      where: {
        bookId_chapterNumber: { bookId, chapterNumber },
      },
      include: {
        book: { select: { title: true, authorId: true } },
      },
    });
  }

  /**
   * 创建章节草稿
   */
  async createDraft(bookId: string, chapterNumber: number, title?: string) {
    return prisma.chapter.create({
      data: {
        bookId,
        chapterNumber,
        title: title || `第 ${chapterNumber} 章`,
        status: 'DRAFT',
      },
    });
  }

  /**
   * 生成并发布章节（流式）
   */
  async *generateChapterStream(
    bookId: string,
    chapterNumber: number,
    authorUserId: string
  ): AsyncGenerator<{
    type: 'start' | 'chunk' | 'complete' | 'error';
    data?: any;
  }> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { outline: true, season: true },
    });

    if (!book) {
      yield { type: 'error', data: { message: 'Book not found' } };
      return;
    }

    const outline = book.outline;
    if (!outline) {
      yield { type: 'error', data: { message: 'Outline not found' } };
      return;
    }

    const chaptersPlan = JSON.parse(outline.chaptersPlan) as any[];
    const chapterPlan = chaptersPlan.find(c => c.number === chapterNumber);

    if (!chapterPlan) {
      yield { type: 'error', data: { message: 'Chapter plan not found' } };
      return;
    }

    const secondMe = new SecondMeClient(authorUserId);
    const userInfo = await secondMe.getUserInfo();

    // 获取前几章的概要用于上下文
    const previousChapters = await prisma.chapter.findMany({
      where: { bookId, chapterNumber: { lt: chapterNumber } },
      orderBy: { chapterNumber: 'desc' },
      take: 3,
    });

    // 构建 Prompt
    const previousSummary = previousChapters
      .reverse()
      .map(c => `第 ${c.chapterNumber} 章：${c.title}`)
      .join('\n');

    const prompt = buildChapterPrompt({
      bookTitle: book.title,
      chapterNumber,
      outline: {
        summary: chapterPlan.summary,
        key_events: chapterPlan.key_events,
        word_count_target: chapterPlan.word_count_target,
      },
      previousSummary,
    });

    // 流式生成
    yield { type: 'start', data: { chapterNumber } };

    let content = '';
    const startTime = Date.now();

    for await (const chunk of secondMe.streamChat({
      message: prompt,
      systemPrompt: `你是${userInfo.name}，正在创作《${book.title}》。`,
      // 保持上下文使用同一个 sessionId
    })) {
      content += chunk;
      yield { type: 'chunk', data: { content: chunk } };
    }

    // 生成章节标题
    const title = chapterPlan.title || `第 ${chapterNumber} 章`;

    // 保存章节
    await this.publishChapter(bookId, chapterNumber, title, content);

    const duration = Date.now() - startTime;
    yield {
      type: 'complete',
      data: {
        chapterNumber,
        title,
        contentLength: content.length,
        duration,
      },
    };
  }

  /**
   * 发布章节
   */
  async publishChapter(
    bookId: string,
    chapterNumber: number,
    title: string,
    content: string
  ) {
    const inkCost = 10; // 章节发布消耗

    // 更新或创建章节
    await prisma.chapter.upsert({
      where: {
        bookId_chapterNumber: { bookId, chapterNumber },
      },
      create: {
        bookId,
        chapterNumber,
        title,
        content,
        contentLength: content.length,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        inkCost,
      },
      update: {
        title,
        content,
        contentLength: content.length,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        inkCost,
      },
    });

    // 更新书籍状态
    await prisma.book.update({
      where: { id: bookId },
      data: {
        currentChapter: chapterNumber,
        chapterCount: { increment: 1 },
        inkBalance: { decrement: inkCost },
      },
    });
  }

  /**
   * 增加阅读量
   */
  async incrementReadCount(chapterId: string) {
    return prisma.chapter.update({
      where: { id: chapterId },
      data: { readCount: { increment: 1 } },
    });
  }

  /**
   * 跳过章节
   */
  async skipChapter(bookId: string, chapterNumber: number) {
    return prisma.chapter.upsert({
      where: {
        bookId_chapterNumber: { bookId, chapterNumber },
      },
      create: {
        bookId,
        chapterNumber,
        title: `第 ${chapterNumber} 章（跳过）`,
        content: '',
        contentLength: 0,
        status: 'SKIPPED',
      },
      update: {
        status: 'SKIPPED',
      },
    });
  }
}

export const chapterService = new ChapterService();
```

### SSE API 路由
```typescript
// src/app/api/stream/chapter/[bookId]/route.ts
import { NextRequest } from 'next/server';
import { chapterService } from '@/services/chapter.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  const { bookId } = params;
  const { searchParams } = new URL(request.url);
  const chapterNumber = parseInt(searchParams.get('chapter') || '1');

  // TODO: 从 Session 获取当前用户 ID
  const authorUserId = 'temp-user-id';

  // 创建 SSE 流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        for await (const event of chapterService.generateChapterStream(
          bookId,
          chapterNumber,
          authorUserId
        )) {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
        }
      } catch (error) {
        const errorData = `data: ${JSON.stringify({
          type: 'error',
          data: { message: error instanceof Error ? error.message : 'Unknown error' }
        })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## 验证标准
- [ ] 章节生成成功
- [ ] SSE 流式输出正常
- [ ] 章节发布后数据正确

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现章节生成与发布功能`。