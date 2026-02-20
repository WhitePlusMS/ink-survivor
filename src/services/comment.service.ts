// 评论模块 Service
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { wsEvents } from '@/lib/websocket/events';

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
    const where: Prisma.CommentWhereInput = { bookId };
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
   * 获取指定章节的评论
   */
  async getChapterComments(chapterId: string) {
    return prisma.comment.findMany({
      where: { chapterId },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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

    // 发送 WebSocket 事件
    if (comment.user) {
      wsEvents.newComment(data.bookId, {
        id: comment.id,
        content: comment.content || '',
        isHuman: comment.isHuman,
        user: {
          nickname: comment.user.nickname,
          avatar: comment.user.avatar || undefined,
        },
        createdAt: comment.createdAt.toISOString(),
      });
    }

    console.log(`[CommentService] Comment created: ${comment.id}`);
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

    if (!comment) {
      throw new Error('Comment not found');
    }
    if (comment.book.authorId !== authorUserId) {
      throw new Error('Only author can adopt comments');
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        isAdopted: true,
        adoptedAt: new Date(),
      },
    });

    // 更新采纳统计 - 使用 Book 的合并字段
    await prisma.book.update({
      where: { id: comment.bookId },
      data: {
        adoptedComments: { increment: 1 },
        adoptionRate: { increment: 0.01 },
      },
    });

    // 发送 WebSocket 事件
    wsEvents.commentAdopted(
      comment.bookId,
      commentId,
      comment.chapterId ? (await prisma.chapter.findUnique({ where: { id: comment.chapterId } }))?.chapterNumber || 0 : 0
    );

    console.log(`[CommentService] Comment adopted: ${commentId}`);
    return updatedComment;
  }

  /**
   * 删除评论
   */
  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new Error('Only author can delete comment');
    }

    // 更新章节评论数
    if (comment.chapterId) {
      await prisma.chapter.update({
        where: { id: comment.chapterId },
        data: { commentCount: { decrement: 1 } },
      });
    }

    return prisma.comment.delete({
      where: { id: commentId },
    });
  }

  /**
   * 获取评论统计 - 优化版本：单次聚合查询
   */
  async getCommentStats(bookId: string) {
    // 使用 groupBy 单次查询获取所有统计
    const result = await prisma.comment.groupBy({
      by: ['isHuman', 'isAdopted'],
      where: { bookId },
      _count: true,
    });

    let total = 0;
    let humanComments = 0;
    let aiComments = 0;
    let adoptedComments = 0;

    for (const row of result) {
      const count = row._count;
      total += count;
      if (row.isHuman) {
        humanComments += count;
      } else {
        aiComments += count;
      }
      if (row.isAdopted) {
        adoptedComments += count;
      }
    }

    return {
      total,
      humanComments,
      aiComments,
      adoptedComments,
    };
  }

  /**
   * 获取用户的所有评论
   */
  async getUserComments(userId: string, options?: {
    limit?: number;
    offset?: number;
  }) {
    return prisma.comment.findMany({
      where: { userId },
      include: {
        book: { select: { id: true, title: true } },
        chapter: { select: { chapterNumber: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });
  }
}

export const commentService = new CommentService();
