# 任务 09：评论模块 - 互动系统

## 任务目标
实现评论、收藏、点赞、打赏等互动功能

## 依赖关系
- 任务 07（书籍模块）完成后

## 交付物清单

### 9.1 评论 DTO
- [ ] 创建评论相关 DTO 类

### 9.2 评论 Service
- [ ] 创建评论 Service 类
- [ ] 实现评论 CRUD

### 9.3 评论 API 路由
- [ ] `GET /api/books/:id/comments` - 获取评论列表
- [ ] `POST /api/books/:id/comments` - 发表评论
- [ ] `POST /api/comments/:id/adopt` - 采纳评论

### 9.4 互动 Service
- [ ] 收藏功能
- [ ] 点赞功能
- [ ] 打赏功能
- [ ] 催更功能

### 9.5 互动 API 路由
- [ ] `POST /api/books/:id/favorite` - 收藏/取消收藏
- [ ] `POST /api/books/:id/like` - 点赞/取消点赞
- [ ] `POST /api/books/:id/gift` - 打赏
- [ ] `POST /api/books/:id/poke` - 催更

## 涉及文件清单
| 文件路径                                               | 操作 |
| ------------------------------------------------------ | ---- |
| `src/common/dto/comment.dto.ts`                        | 新建 |
| `src/services/comment.service.ts`                      | 新建 |
| `src/services/interaction.service.ts`                  | 新建 |
| `src/app/api/books/[id]/comments/route.ts`             | 新建 |
| `src/app/api/books/[id]/comments/[commentId]/route.ts` | 新建 |
| `src/app/api/comments/[id]/adopt/route.ts`             | 新建 |
| `src/app/api/books/[id]/favorite/route.ts`             | 新建 |
| `src/app/api/books/[id]/like/route.ts`                 | 新建 |
| `src/app/api/books/[id]/gift/route.ts`                 | 新建 |
| `src/app/api/books/[id]/poke/route.ts`                 | 新建 |
| `src/types/comment.ts`                                 | 新建 |

## 详细设计

### 类型定义
```typescript
// src/types/comment.ts
export interface CommentDetail {
  id: string;
  bookId: string;
  chapterId?: string;
  userId: string;
  user: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  content: string;
  isHuman: boolean;
  aiRole?: string;
  sentiment?: number;
  suggestionType?: string;
  isAdopted: boolean;
  adoptedAt?: Date;
  createdAt: Date;
}

export interface InteractionStats {
  favoriteCount: number;
  likeCount: number;
  coinCount: number;
  commentCount: number;
  completionRate: number;
}
```

### 评论 Service
```typescript
// src/services/comment.service.ts
import { prisma } from '@/lib/prisma';
import { CommentDetail } from '@/types/comment';

export class CommentService {
  /**
   * 获取评论列表
   */
  async getComments(bookId: string, options?: {
    chapterId?: string;
    isHuman?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { bookId };
    if (options?.chapterId) where.chapterId = options.chapterId;
    if (typeof options?.isHuman === 'boolean') where.isHuman = options.isHuman;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
          chapter: { select: { chapterNumber: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      prisma.comment.count({ where }),
    ]);

    return { comments, total };
  }

  /**
   * 发表评论
   */
  async createComment(data: {
    bookId: string;
    chapterId?: string;
    userId: string;
    content: string;
    isHuman: boolean;
    aiRole?: string;
  }) {
    const comment = await prisma.comment.create({
      data: {
        bookId: data.bookId,
        chapterId: data.chapterId,
        userId: data.userId,
        content: data.content,
        isHuman: data.isHuman,
        aiRole: data.aiRole,
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    // 更新章节评论数
    if (data.chapterId) {
      await prisma.chapter.update({
        where: { id: data.chapterId },
        data: { commentCount: { increment: 1 } },
      });
    }

    return comment;
  }

  /**
   * 采纳评论
   */
  async adoptComment(commentId: string, authorUserId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { book: true },
    });

    if (!comment) throw new Error('Comment not found');
    if (comment.book.authorId !== authorUserId) {
      throw new Error('Only author can adopt comments');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: {
        isAdopted: true,
        adoptedAt: new Date(),
      },
    });

    // 更新采纳统计
    await prisma.bookScore.update({
      where: { bookId: comment.bookId },
      data: {
        adoptedComments: { increment: 1 },
        adoptionRate: { increment: 0.01 }, // 简化计算
      },
    });

    return comment;
  }

  /**
   * 获取评论统计
   */
  async getCommentStats(bookId: string) {
    const [total, humanComments, aiComments, adoptedComments] = await Promise.all([
      prisma.comment.count({ where: { bookId } }),
      prisma.comment.count({ where: { bookId, isHuman: true } }),
      prisma.comment.count({ where: { bookId, isHuman: false } }),
      prisma.comment.count({ where: { bookId, isAdopted: true } }),
    ]);

    return { total, humanComments, aiComments, adoptedComments };
  }
}

export const commentService = new CommentService();
```

### 互动 Service
```typescript
// src/services/interaction.service.ts
import { prisma } from '@/lib/prisma';

export class InteractionService {
  /**
   * 收藏书籍
   */
  async toggleFavorite(bookId: string, userId: string): Promise<{ favorited: boolean }> {
    const existing = await prisma.reading.findFirst({
      where: { bookId, userId, finished: false },
    });

    if (existing) {
      // 取消收藏
      await prisma.reading.delete({ where: { id: existing.id } });
      await prisma.book.update({
        where: { id: bookId },
        data: { heat: { decrement: 2 } },
      });
      await prisma.bookScore.update({
        where: { bookId },
        data: { favoriteCount: { decrement: 1 } },
      });
      return { favorited: false };
    } else {
      // 添加收藏
      await prisma.reading.create({
        data: {
          bookId,
          userId,
          finished: false,
        },
      });
      await prisma.book.update({
        where: { id: bookId },
        data: { heat: { increment: 3 } },
      });
      await prisma.bookScore.update({
        where: { bookId },
        data: { favoriteCount: { increment: 1 } },
      });
      return { favorited: true };
    }
  }

  /**
   * 点赞书籍
   */
  async toggleLike(bookId: string, userId: string): Promise<{ liked: boolean }> {
    // TODO: 实现点赞记录（可以简化为每次都增加）
    await prisma.book.update({
      where: { id: bookId },
      data: { heat: { increment: 1 } },
    });
    await prisma.bookScore.update({
      where: { bookId },
      data: { likeCount: { increment: 1 } },
    });
    return { liked: true };
  }

  /**
   * 打赏 Ink
   */
  async gift(bookId: string, fromUserId: string, amount: number) {
    // 检查打赏者余额
    const sender = await prisma.user.findUnique({
      where: { id: fromUserId },
    });

    if (!sender || sender.totalInk < amount) {
      throw new Error('Insufficient Ink');
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) throw new Error('Book not found');

    // 扣除打赏者余额
    await prisma.user.update({
      where: { id: fromUserId },
      data: { totalInk: { decrement: amount } },
    });

    // 增加书籍拥有者余额
    await prisma.user.update({
      where: { id: book.authorId },
      data: { totalInk: { increment: amount } },
    });

    // 增加书籍热度
    await prisma.book.update({
      where: { id: bookId },
      data: { heat: { increment: amount * 2 } },
    });

    // 更新打赏统计
    await prisma.bookScore.update({
      where: { bookId },
      data: { coinCount: { increment: amount } },
    });

    return { gifted: true, amount };
  }

  /**
   * 催更
   */
  async poke(bookId: string, userId: string) {
    await prisma.book.update({
      where: { id: bookId },
      data: { heat: { increment: 1 } },
    });

    return { poked: true };
  }

  /**
   * 记录阅读
   */
  async recordReading(data: {
    bookId: string;
    chapterId: string;
    userId: string;
    finished: boolean;
    readingTime?: number;
  }) {
    const reading = await prisma.reading.upsert({
      where: {
        id: data.userId + '_' + data.chapterId, // 简化：一个用户一章一个记录
      },
      create: {
        bookId: data.bookId,
        chapterId: data.chapterId,
        userId: data.userId,
        finished: data.finished,
        readingTime: data.readingTime,
        readAt: new Date(),
      },
      update: {
        finished: data.finished,
        readingTime: data.readingTime,
        readAt: new Date(),
      },
    });

    // 更新阅读量
    if (data.finished) {
      await prisma.chapter.update({
        where: { id: data.chapterId },
        data: { readCount: { increment: 1 } },
      });
    }

    return reading;
  }

  /**
   * 获取互动统计
   */
  async getInteractionStats(bookId: string) {
    const score = await prisma.bookScore.findUnique({
      where: { bookId },
    });

    const readingCount = await prisma.reading.count({
      where: { bookId, finished: true },
    });

    return {
      favoriteCount: score?.favoriteCount || 0,
      likeCount: score?.likeCount || 0,
      coinCount: score?.coinCount || 0,
      readCount: readingCount,
      completionRate: score?.completionRate || 0,
    };
  }
}

export const interactionService = new InteractionService();
```

## 验证标准
- [ ] 发表评论成功
- [ ] 收藏、点赞、打赏功能正常
- [ ] 采纳评论功能正常

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现评论模块与互动系统`。