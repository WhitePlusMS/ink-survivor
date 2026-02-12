// 互动模块 Service
import { prisma } from '@/lib/prisma';
import { wsEvents } from '@/lib/websocket/events';

export class InteractionService {
  /**
   * 收藏书籍
   */
  async toggleFavorite(bookId: string, userId: string): Promise<{ success: boolean; favorited: boolean }> {
    // 检查是否已收藏
    const existing = await prisma.reading.findFirst({
      where: { bookId, userId, finished: false },
    });

    if (existing) {
      // 取消收藏
      await prisma.reading.delete({ where: { id: existing.id } });
      await prisma.book.update({
        where: { id: bookId },
        data: { heat: { decrement: 3 } },
      });
      await prisma.bookScore.update({
        where: { bookId },
        data: { favoriteCount: { decrement: 1 } },
      });

      // 发送 WebSocket 事件
      const book = await prisma.book.findUnique({ where: { id: bookId } });
      if (book) {
        wsEvents.heatUpdate(bookId, book.heat - 3);
      }

      console.log(`[InteractionService] Book ${bookId} unfavorited by user ${userId}`);
      return { success: true, favorited: false };
    } else {
      // 获取书籍的第一章（收藏时需要一个有效的 chapterId）
      const firstChapter = await prisma.chapter.findFirst({
        where: { bookId },
        orderBy: { chapterNumber: 'asc' },
      });

      // 如果书籍没有章节，抛出错误
      if (!firstChapter) {
        throw new Error('Book has no chapters');
      }

      // 添加收藏
      await prisma.reading.create({
        data: {
          bookId,
          userId,
          chapterId: firstChapter.id,
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

      // 发送 WebSocket 事件
      const book = await prisma.book.findUnique({ where: { id: bookId } });
      if (book) {
        wsEvents.heatUpdate(bookId, book.heat + 3);
      }

      console.log(`[InteractionService] Book ${bookId} favorited by user ${userId}`);
      return { success: true, favorited: true };
    }
  }

  /**
   * 章节点赞
   */
  async toggleLike(chapterId: string, userId: string): Promise<{ success: boolean; liked: boolean }> {
    // 获取章节信息（需要 bookId）
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { bookId: true },
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // 检查用户是否已对该章节点赞
    const existing = await prisma.like.findUnique({
      where: {
        userId_chapterId: { userId, chapterId },
      },
    });

    if (existing) {
      // 已点赞，取消点赞
      await prisma.like.delete({ where: { id: existing.id } });
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { likeCount: { decrement: 1 } },
      });
      // 更新书籍热度（-1.5）和点赞统计
      await prisma.book.update({
        where: { id: chapter.bookId },
        data: { heat: { decrement: 1.5 } },
      });
      await prisma.bookScore.update({
        where: { bookId: chapter.bookId },
        data: { likeCount: { decrement: 1 } },
      });

      // 发送 WebSocket 事件
      const book = await prisma.book.findUnique({ where: { id: chapter.bookId } });
      if (book) {
        wsEvents.heatUpdate(chapter.bookId, book.heat - 1.5);
      }

      console.log(`[InteractionService] Chapter ${chapterId} unliked by user ${userId}`);
      return { success: true, liked: false };
    } else {
      // 未点赞，添加点赞
      await prisma.like.create({
        data: { userId, chapterId },
      });
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { likeCount: { increment: 1 } },
      });
      // 更新书籍热度（+1.5）和点赞统计
      await prisma.book.update({
        where: { id: chapter.bookId },
        data: { heat: { increment: 1.5 } },
      });
      await prisma.bookScore.update({
        where: { bookId: chapter.bookId },
        data: { likeCount: { increment: 1 } },
      });

      // 发送 WebSocket 事件
      const book = await prisma.book.findUnique({ where: { id: chapter.bookId } });
      if (book) {
        wsEvents.heatUpdate(chapter.bookId, book.heat + 1.5);
      }

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
   */
  async gift(bookId: string, fromUserId: string, amount: number): Promise<{ success: boolean; amount: number }> {
    // 检查打赏者余额
    const sender = await prisma.user.findUnique({
      where: { id: fromUserId },
    });

    if (!sender || sender.totalInk < amount) {
      throw new Error('Insufficient Ink');
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { author: true },
    });

    if (!book) {
      throw new Error('Book not found');
    }

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

    // 发送 WebSocket 事件
    wsEvents.heatUpdate(bookId, book.heat + amount * 2);

    console.log(`[InteractionService] Gifted ${amount} Ink from ${fromUserId} to book ${bookId}`);
    return { success: true, amount };
  }

  /**
   * 催更
   */
  async poke(bookId: string, userId: string): Promise<{ success: boolean }> {
    await prisma.book.update({
      where: { id: bookId },
      data: { heat: { increment: 1 } },
    });

    // 发送 WebSocket 事件
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (book) {
      wsEvents.heatUpdate(bookId, book.heat + 1);
    }

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
        id: `${data.userId}_${data.chapterId}`,
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

    // 更新书籍热度 +1
    await prisma.book.update({
      where: { id: bookId },
      data: { heat: { increment: 1 } },
    });

    // 发送 WebSocket 事件
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (book) {
      wsEvents.heatUpdate(bookId, book.heat + 1);
    }
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
