// 章节模块 Service
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SecondMeClient } from '@/lib/secondme/client';
import { buildChapterPrompt } from '@/lib/secondme/prompts';
import { userService } from './user.service';

export class ChapterService {
  /**
   * 获取章节列表
   */
  async getChapters(bookId: string, options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.ChapterWhereInput = { bookId };
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
    type: string;
    data?: Record<string, unknown>;
  }> {
    // 使用 Book 的合并字段获取大纲
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        title: true,
        chaptersPlan: true,
        season: true,
      },
    });

    if (!book) {
      yield { type: 'error', data: { message: 'Book not found' } };
      return;
    }

    // 使用 Book 的 chaptersPlan 字段
    const chaptersPlan = book.chaptersPlan as unknown as Array<{
      number: number;
      title: string;
      summary: string;
      key_events: string[];
      word_count_target: number;
    }> | null;

    if (!chaptersPlan) {
      yield { type: 'error', data: { message: 'Outline not found' } };
      return;
    }

    const chapterPlan = chaptersPlan.find((c: Record<string, unknown>) => c.number === chapterNumber);

    if (!chapterPlan) {
      yield { type: 'error', data: { message: 'Chapter plan not found' } };
      return;
    }

    const secondMe = new SecondMeClient(authorUserId);
    let userName = '作家';
    let selfIntro = '';
    try {
      const userInfo = await secondMe.getUserInfo();
      userName = userInfo.name || '作家';
      selfIntro = userInfo.selfIntroduction || '';
    } catch {
      console.warn('[ChapterService] Failed to get user info');
    }

    // 获取 Agent 配置
    const agentConfig = await userService.getAgentConfig(authorUserId);

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
      // Agent 性格配置
      personality: agentConfig?.persona || '',
      selfIntro,
      writingStyle: agentConfig?.writingStyle || '多变',
      wordCountTarget: agentConfig?.wordCountTarget || 2000,

      // 大纲信息
      bookTitle: book.title,
      chapterNumber,
      outline: {
        summary: chapterPlan.summary,
        key_events: chapterPlan.key_events,
        word_count_target: chapterPlan.word_count_target,
      },

      // 前面内容
      previousSummary,
    });

    // 流式生成
    yield { type: 'start', data: { chapterNumber } };

    let content = '';
    const startTime = Date.now();

    for await (const chunk of secondMe.streamChat({
      message: prompt,
      systemPrompt: `你是${userName}，正在创作《${book.title}》。`,
    })) {
      content += chunk;
      yield { type: 'chunk', data: { content: chunk } };
    }

    // 生成章节标题
    const title = chapterPlan.title || `第 ${chapterNumber} 章`;

    // 发布章节
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
        inkBalance: { decrement: inkCost },
      },
    });

    console.log(`[ChapterService] Chapter ${chapterNumber} published for book: ${bookId}`);
  }

  /**
   * 更新章节
   */
  async updateChapter(
    bookId: string,
    chapterNumber: number,
    data: {
      title?: string;
      content?: string;
    }
  ) {
    return prisma.chapter.update({
      where: {
        bookId_chapterNumber: { bookId, chapterNumber },
      },
      data: {
        ...data,
        contentLength: data.content?.length || 0,
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
   * 增加评论数
   */
  async incrementCommentCount(chapterId: string) {
    return prisma.chapter.update({
      where: { id: chapterId },
      data: { commentCount: { increment: 1 } },
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

  /**
   * 获取下一章编号
   */
  async getNextChapterNumber(bookId: string): Promise<number> {
    const lastChapter = await prisma.chapter.findFirst({
      where: { bookId },
      orderBy: { chapterNumber: 'desc' },
    });

    return (lastChapter?.chapterNumber || 0) + 1;
  }
}

export const chapterService = new ChapterService();
