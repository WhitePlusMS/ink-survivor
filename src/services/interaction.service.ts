// 互动模块 Service
// 优化版本：热度统一使用 BookScore.heatValue，不再更新 Book.heat
import { prisma } from '@/lib/prisma';
import { wsEvents } from '@/lib/websocket/events';

export class InteractionService {
  /**
   * 收藏书籍
   * 优化：使用事务合并串行查询，保证原子性
   */
  async toggleFavorite(bookId: string, userId: string): Promise<{ success: boolean; favorited: boolean }> {
    // 优化：并行查询已收藏状态和当前热度
    const [existing, currentScore] = await Promise.all([
      prisma.reading.findFirst({
        where: { bookId, userId, finished: false },
      }),
      prisma.book.findUnique({
        where: { id: bookId },
        select: { heatValue: true },
      }),
    ]);

    const currentHeat = currentScore?.heatValue || 0;

    // 使用事务保证原子性
    if (existing) {
      // 取消收藏
      await prisma.$transaction([
        prisma.reading.delete({ where: { id: existing.id } }),
        prisma.book.update({
          where: { id: bookId },
          data: {
            favoriteCount: { decrement: 1 },
            heatValue: { decrement: 3 },
          },
        }),
      ]);

      // 发送 WebSocket 事件
      wsEvents.heatUpdate(bookId, currentHeat - 3);

      console.log(`[InteractionService] Book ${bookId} unfavorited by user ${userId}`);
      return { success: true, favorited: false };
    } else {
      // 获取书籍的第一章
      const firstChapter = await prisma.chapter.findFirst({
        where: { bookId },
        orderBy: { chapterNumber: 'asc' },
      });

      if (!firstChapter) {
        throw new Error('Book has no chapters');
      }

      // 添加收藏
      await prisma.$transaction([
        prisma.reading.create({
          data: {
            bookId,
            userId,
            chapterId: firstChapter.id,
            finished: false,
          },
        }),
        prisma.book.update({
          where: { id: bookId },
          data: {
            favoriteCount: { increment: 1 },
            heatValue: { increment: 3 },
          },
        }),
      ]);

      // 发送 WebSocket 事件
      wsEvents.heatUpdate(bookId, currentHeat + 3);

      console.log(`[InteractionService] Book ${bookId} favorited by user ${userId}`);
      return { success: true, favorited: true };
    }
  }

  /**
   * 章节点赞
   * 热度统一通过 BookScore.heatValue 管理
   */
  async toggleLike(chapterId: string, userId: string): Promise<{ success: boolean; liked: boolean }> {
    // 先查询章节信息
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { bookId: true },
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // 并行查询当前热度值和点赞状态
    const [heatData, existing] = await Promise.all([
      prisma.book.findUnique({
        where: { id: chapter.bookId },
        select: { heatValue: true },
      }),
      prisma.like.findUnique({
        where: {
          userId_chapterId: { userId, chapterId },
        },
      }),
    ]);

    const currentHeat = heatData?.heatValue || 0;

    // 使用事务保证原子性
    if (existing) {
      // 取消点赞
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existing.id } }),
        prisma.chapter.update({
          where: { id: chapterId },
          data: { likeCount: { decrement: 1 } },
        }),
        prisma.book.update({
          where: { id: chapter.bookId },
          data: {
            likeCount: { decrement: 1 },
            heatValue: { decrement: 1.5 },
          },
        }),
      ]);

      // 发送 WebSocket 事件
      wsEvents.heatUpdate(chapter.bookId, currentHeat - 1.5);

      console.log(`[InteractionService] Chapter ${chapterId} unliked by user ${userId}`);
      return { success: true, liked: false };
    } else {
      // 添加点赞
      await prisma.$transaction([
        prisma.like.create({
          data: { userId, chapterId },
        }),
        prisma.chapter.update({
          where: { id: chapterId },
          data: { likeCount: { increment: 1 } },
        }),
        prisma.book.update({
          where: { id: chapter.bookId },
          data: {
            likeCount: { increment: 1 },
            heatValue: { increment: 1.5 },
          },
        }),
      ]);

      // 发送 WebSocket 事件
      wsEvents.heatUpdate(chapter.bookId, currentHeat + 1.5);

      console.log(`[InteractionService] Chapter ${chapterId} liked by user ${userId}`);
      return { success: true, liked: true };
    }
  }

  /**
   * 获取用户对章节的点赞状态
   */
  async getLikeStatus(chapterId: string, userId: string): Promise<boolean> {
    const like = await prisma.like.findUnique({
      where: {
        userId_chapterId: { userId, chapterId },
      },
    });
    return !!like;
  }

  /**
   * 打赏 Ink
   * 优化：并行查询 + 事务保证原子性
   */
  async gift(bookId: string, fromUserId: string, amount: number): Promise<{ success: boolean; amount: number }> {
    // 并行查询打赏者和书籍信息（书籍查询包含热度值）
    const [sender, book] = await Promise.all([
      prisma.user.findUnique({
        where: { id: fromUserId },
        select: { totalInk: true },
      }),
      prisma.book.findUnique({
        where: { id: bookId },
        select: { authorId: true, heatValue: true },
      }),
    ]);

    if (!sender || sender.totalInk < amount) {
      throw new Error('Insufficient Ink');
    }

    if (!book) {
      throw new Error('Book not found');
    }

    const currentHeat = book.heatValue || 0;

    // 使用事务保证原子性
    await prisma.$transaction([
      // 扣除打赏者余额
      prisma.user.update({
        where: { id: fromUserId },
        data: { totalInk: { decrement: amount } },
      }),
      // 增加书籍拥有者余额
      prisma.user.update({
        where: { id: book.authorId },
        data: { totalInk: { increment: amount } },
      }),
      // 更新打赏统计和热度
      prisma.book.update({
        where: { id: bookId },
        data: {
          coinCount: { increment: amount },
          heatValue: { increment: amount * 2 },
        },
      }),
    ]);

    // 发送 WebSocket 事件
    wsEvents.heatUpdate(bookId, currentHeat + amount * 2);

    console.log(`[InteractionService] Gifted ${amount} Ink from ${fromUserId} to book ${bookId}`);
    return { success: true, amount };
  }

  /**
   * 催更
   * 热度统一通过 BookScore.heatValue 管理
   */
  async poke(bookId: string, userId: string): Promise<{ success: boolean }> {
    // 获取当前热度值
    const currentScore = await prisma.book.findUnique({
      where: { id: bookId },
      select: { heatValue: true },
    });
    const currentHeat = currentScore?.heatValue || 0;

    // 更新热度 +1
    await prisma.book.update({
      where: { id: bookId },
      data: { heatValue: { increment: 1 } },
    });

    // 发送 WebSocket 事件
    wsEvents.heatUpdate(bookId, currentHeat + 1);

    console.log(`[InteractionService] Book ${bookId} poked by user ${userId}`);
    return { success: true };
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
        // @ts-expect-error - 复合唯一键
        userId_chapterId: { userId: data.userId, chapterId: data.chapterId },
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
   * 完成阅读
   * 热度统一通过 BookScore.heatValue 管理
   */
  async finishReading(bookId: string, chapterId: string, userId: string) {
    await prisma.reading.updateMany({
      where: {
        userId,
        chapterId,
        finished: false,
      },
      data: {
        finished: true,
        readAt: new Date(),
      },
    });

    await prisma.chapter.update({
      where: { id: chapterId },
      data: { readCount: { increment: 1 } },
    });

    // 获取当前热度值
    const currentScore = await prisma.book.findUnique({
      where: { id: bookId },
      select: { heatValue: true },
    });
    const currentHeat = currentScore?.heatValue || 0;

    // 更新热度 +1
    await prisma.book.update({
      where: { id: bookId },
      data: { heatValue: { increment: 1 } },
    });

    // 发送 WebSocket 事件
    wsEvents.heatUpdate(bookId, currentHeat + 1);
  }

  /**
   * 获取互动统计
   */
  async getInteractionStats(bookId: string) {
    const score = await prisma.book.findUnique({
      where: { id: bookId },
    });

    const readingCount = await prisma.reading.count({
      where: { bookId, finished: true },
    });

    return {
      heatValue: score?.heatValue || 0,  // 使用 heatValue
      favoriteCount: score?.favoriteCount || 0,
      likeCount: score?.likeCount || 0,
      coinCount: score?.coinCount || 0,
      readCount: readingCount,
      completionRate: score?.completionRate || 0,
    };
  }

  /**
   * 获取用户收藏的书籍
   */
  async getUserFavorites(userId: string, options?: {
    limit?: number;
    offset?: number;
  }) {
    return prisma.reading.findMany({
      where: { userId, finished: false },
      include: {
        book: {
          include: {
            author: { select: { id: true, nickname: true, avatar: true } },
            // score 已合并到 Book 表，使用 Book 的直接字段
          },
        },
      },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });
  }

  /**
   * 获取用户阅读历史
   */
  async getUserReadingHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
  }) {
    return prisma.reading.findMany({
      where: { userId, finished: true },
      include: {
        book: { select: { id: true, title: true, coverImage: true } },
        chapter: { select: { chapterNumber: true, title: true } },
      },
      orderBy: { readAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });
  }
}

export const interactionService = new InteractionService();
