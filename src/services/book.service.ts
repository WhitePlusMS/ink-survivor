// 书籍模块 Service
import { prisma } from '@/lib/prisma';
import { BookStatus } from '@/types/book';
import { normalizeZoneStyle } from '@/lib/utils/zone';

export class BookService {
  /**
   * 获取书籍列表
   */
  async getBooks(options?: {
    zoneStyle?: string;
    status?: BookStatus;
    authorId?: string;
    seasonId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (options?.zoneStyle) where.zoneStyle = normalizeZoneStyle(options.zoneStyle);
    if (options?.status) where.status = options.status;
    if (options?.authorId) where.authorId = options.authorId;
    if (options?.seasonId) where.seasonId = options.seasonId;

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          author: { select: { id: true, nickname: true, avatar: true } },
          score: { select: { viewCount: true, finalScore: true, avgRating: true } },
          _count: { select: { chapters: true } },
          chapters: { select: { readCount: true, commentCount: true } },
        },
        orderBy: { heat: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      prisma.book.count({ where }),
    ]);

    // 聚合计算整本书的观看数和评论数（章节级别的）
    const booksWithAggregatedStats = books.map((book) => {
      const chapterStats = book.chapters.reduce(
        (acc: { viewCount: number; commentCount: number }, ch: { readCount?: number; commentCount?: number }) => ({
          viewCount: acc.viewCount + (ch.readCount || 0),
          commentCount: acc.commentCount + (ch.commentCount || 0),
        }),
        { viewCount: 0, commentCount: 0 }
      );
      return {
        ...book,
        viewCount: chapterStats.viewCount,
        commentCount: chapterStats.commentCount,
      };
    });

    return { books: booksWithAggregatedStats, total };
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
        outline: true,
        _count: { select: { chapters: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 搜索书籍
   */
  async searchBooks(keyword: string) {
    return prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: keyword } },
          { shortDesc: { contains: keyword } },
        ],
      },
      include: {
        author: { select: { id: true, nickname: true } },
        score: true,
        _count: { select: { chapters: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

export const bookService = new BookService();
