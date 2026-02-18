// 书籍模块 Service
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { BookStatus } from '@/types/book';
import { normalizeZoneStyle } from '@/lib/utils/zone';

export class BookService {
  /**
   * 获取书籍列表 - 优化版本：使用数据库聚合替代代码循环
   */
  async getBooks(options?: {
    zoneStyle?: string;
    status?: BookStatus;
    authorId?: string;
    seasonId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.BookWhereInput = {};
    if (options?.zoneStyle) where.zoneStyle = normalizeZoneStyle(options.zoneStyle);
    if (options?.status) where.status = options.status;
    if (options?.authorId) where.authorId = options.authorId;
    if (options?.seasonId) where.seasonId = options.seasonId;

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          author: { select: { id: true, nickname: true, avatar: true } },
          // score 已合并到 Book 表，使用 Book 的直接字段
          _count: {
            select: {
              chapters: true,
              comments: true, // 统计所有评论（书籍评论 + 章节评论）
            },
          },
        },
        orderBy: { heatValue: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      prisma.book.count({ where }),
    ]);

    // 直接使用 _count 结果，无需代码聚合
    const booksWithStats = books.map((book) => ({
      ...book,
      chapterCount: book._count.chapters,
      commentCount: book._count.comments,
      viewCount: book.viewCount || 0,
    }));

    return { books: booksWithStats, total };
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
        // outline 字段已合并到 Book 表
        chapters: {
          orderBy: { chapterNumber: 'asc' },
        },
        // score 已合并到 Book 表，使用 Book 的直接字段
        _count: { select: { chapters: true, comments: true } },
        // 大纲版本历史
        outlineVersions: {
          orderBy: { version: 'desc' },
          select: { version: true, roundCreated: true, reason: true, createdAt: true },
        },
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
        // 初始化评分字段（默认值为0，由 schema 定义）
      },
    });

    console.log(`[BookService] Created book: ${book.id}`);
    return book;
  }

  /**
   * 更新书籍
   */
  async updateBook(bookId: string, data: {
    title?: string;
    shortDesc?: string;
    coverImage?: string;
    longDesc?: string;
    status?: BookStatus;
    plannedChapters?: number;
  }) {
    return prisma.book.update({
      where: { id: bookId },
      data,
    });
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
   * 更新书籍热度 - 使用 Book.heatValue (已合并)
   */
  async updateHeat(bookId: string, heatDelta: number) {
    await prisma.book.update({
      where: { id: bookId },
      data: { heatValue: { increment: heatDelta } },
    });
  }

  /**
   * 增加章节数
   */
  async incrementChapterCount(bookId: string) {
    return prisma.book.update({
      where: { id: bookId },
      data: {
        currentChapter: { increment: 1 },
      },
    });
  }

  /**
   * 增加阅读量 - 使用 Book 的合并字段
   */
  async incrementReadCount(bookId: string) {
    await prisma.book.update({
      where: { id: bookId },
      data: {
        heatValue: { increment: 1 },
        viewCount: { increment: 1 },
      },
    });
  }

  /**
   * 减少 Ink
   */
  async decrementInk(bookId: string, amount: number) {
    return prisma.book.update({
      where: { id: bookId },
      data: {
        inkBalance: { decrement: amount },
      },
    });
  }

  /**
   * 根据作者获取书籍
   */
  async getBooksByAuthor(authorId: string) {
    return prisma.book.findMany({
      where: { authorId },
      include: {
        season: { select: { id: true, seasonNumber: true, themeKeyword: true } },
        // outline 字段已合并到 Book 表
        _count: { select: { chapters: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

}

export const bookService = new BookService();
