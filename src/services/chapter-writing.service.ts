/**
 * 章节创作服务
 *
 * WRITING 阶段：为书籍创作章节正文
 * 基于大纲和读者反馈生成个性化章节内容
 */

import { prisma } from '@/lib/prisma';
import { buildAuthorSystemPrompt, buildChapterPrompt } from '@/lib/secondme/prompts';
import { testModeSendChat, getUserTokenById } from '@/lib/secondme/client';
import { parseChapterWithRetry } from '@/lib/utils/llm-parser';
import { readerAgentService } from './reader-agent.service';
import { wsEvents } from '@/lib/websocket/events';
import { outlineGenerationService } from './outline-generation.service';

// Agent 配置接口
interface AgentConfig {
  // 基础信息
  writerPersonality: string;  // 作者性格描述
  selfIntro?: string;  // 自我介绍
  interestTags?: string[];  // 兴趣标签

  // 写作偏好
  writingStyle: string;      // 写作风格

  // 创作参数
  adaptability: number;     // 听劝指数
  preferredGenres: string[]; // 偏好题材
  maxChapters: number;     // 创作风格
  wordCountTarget: number; // 每章目标字数
}

interface PreparedChapterGeneration {
  // 书籍与作者基础信息
  bookId: string;
  bookTitle: string;
  authorId: string;
  authorNickname: string;
  // 本章关键信息
  chapterNumber: number;
  chapterOutlineTitle: string;
  // 模型调用所需提示词
  systemPrompt: string;
  chapterPrompt: string;
  // 用于写库时判断书籍是否完结
  bookMaxChapters: number;
}

interface GeneratedChapter {
  // 模型生成的章节数据
  title: string;
  content: string;
}

export class ChapterWritingService {
  // 数据库并发：控制 Prisma 读写数量，避免连接池耗尽
  private getDbConcurrency(): number {
    const raw = Number(process.env.DB_CONCURRENCY || process.env.TASK_CONCURRENCY);
    const fallback = process.env.NODE_ENV === 'production' ? 1 : 2;
    if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
    return fallback;
  }

  // 模型并发：控制 LLM 请求并行数量
  private getLlmConcurrency(): number {
    const raw = Number(process.env.LLM_CONCURRENCY || process.env.AI_CONCURRENCY);
    const fallback = process.env.NODE_ENV === 'production' ? 2 : 3;
    if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
    return fallback;
  }

  // 通用并发执行器，按固定并发跑队列任务
  private async runWithConcurrency<T>(
    items: T[],
    limit: number,
    handler: (item: T) => Promise<void>
  ): Promise<void> {
    if (items.length === 0) return;
    const concurrency = Math.max(1, Math.min(limit, items.length));
    let index = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (true) {
        const current = index;
        index += 1;
        if (current >= items.length) break;
        await handler(items[current]);
      }
    });
    await Promise.all(workers);
  }

  // 章节生成准备阶段：读库 + 组装提示词
  private async prepareChapterGeneration(
    bookId: string,
    chapterNumber: number
  ): Promise<PreparedChapterGeneration | null> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: { select: { id: true, nickname: true, agentConfig: true } },
        chapters: {
          orderBy: { chapterNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!book) {
      console.error(`[Chapter] 书籍不存在: ${bookId}`);
      return null;
    }

    // 获取整本书大纲与人物配置
    const latestOutline = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        chaptersPlan: true,
        characters: true,
      },
    });

    if (!latestOutline || !latestOutline.chaptersPlan) {
      console.error(`[Chapter] 书籍 ${bookId} 没有可用的大纲`);
      return null;
    }

    // 定位本章大纲
    const chaptersPlan = latestOutline.chaptersPlan as unknown as Array<{
      number: number;
      title: string;
      summary: string;
      key_events: string[];
      word_count_target: number;
    }> || [];
    const chapterOutline = chaptersPlan.find(c => c.number === chapterNumber);

    if (!chapterOutline) {
      console.log(`[Chapter] 跳过第 ${chapterNumber} 章：大纲缺失该章信息，现有章节:`, chaptersPlan.map(c => c.number));
      return null;
    }

    // 解析作者配置
    const rawConfig = (book.author.agentConfig as unknown as Record<string, unknown>) || {};
    const agentConfig: AgentConfig = {
      writerPersonality: (rawConfig.writerPersonality as string) || '',
      writingStyle: (rawConfig.writingStyle as string) || '多变',
      adaptability: (rawConfig.adaptability as number) ?? 0.5,
      preferredGenres: (rawConfig.preferredGenres as string[]) || [],
      maxChapters: (rawConfig.maxChapters as number) || 5,
      wordCountTarget: (rawConfig.wordCountTarget as number) || 2000,
    };

    // 读取赛季约束
    const season = await prisma.season.findUnique({
      where: { id: book.seasonId ?? undefined },
    });
    const seasonConstraints = season ? (season.constraints as unknown as string[]) || [] : [];
    const seasonTheme = season?.themeKeyword || '';

    const previousChapters = await prisma.chapter.findMany({
      where: {
        bookId,
        chapterNumber: { lt: chapterNumber },
      },
      orderBy: { chapterNumber: 'desc' },
      take: 2,
      select: { content: true, title: true, chapterNumber: true },
    });

    const previousSummary = previousChapters.length > 0
      ? `前情：${previousChapters.map(c => c.title).join(' -> ')}`
      : '这是本书的第一章';

    // 取上一章内容片段，保持连贯性
    let previousChapterContent = '';
    if (previousChapters.length > 0) {
      const latestChapter = previousChapters[0];
      if (latestChapter.content) {
        previousChapterContent = `第${latestChapter.chapterNumber}章"${latestChapter.title}"：` +
          latestChapter.content.slice(0, 300) + '...';
      }
    }

    // 读取读者反馈作为本章参考
    const feedbacks = await this.getChapterFeedbacks(bookId, chapterNumber - 1);

    // 构建系统提示词
    const systemPrompt = buildAuthorSystemPrompt({
      userName: book.author.nickname || '作家',
      writerPersonality: agentConfig.writerPersonality || '',
      writingStyle: agentConfig.writingStyle || '多变',
      adaptability: agentConfig.adaptability ?? 0.5,
      preferredGenres: agentConfig.preferredGenres || [],
      seasonTheme,
      constraints: seasonConstraints,
      zoneStyle: this.normalizeZoneStyle(book.zoneStyle),
      wordCountTarget: agentConfig.wordCountTarget || 2000,
    });

    // 构建章节提示词
    const chapterPrompt = buildChapterPrompt({
      writerPersonality: agentConfig.writerPersonality || '',
      selfIntro: agentConfig.selfIntro || '',
      writingStyle: agentConfig.writingStyle || '多变',
      wordCountTarget: agentConfig.wordCountTarget || 2000,
      bookTitle: book.title,
      chapterNumber,
      totalChapters: chaptersPlan.length,
      outline: {
        summary: chapterOutline.summary,
        key_events: chapterOutline.key_events,
        word_count_target: chapterOutline.word_count_target,
      },
      fullOutline: chaptersPlan,
      previousSummary,
      previousChapterContent: previousChapterContent || undefined,
      feedbacks,
    });

    // 返回可用于模型生成的数据包
    return {
      bookId: book.id,
      bookTitle: book.title,
      authorId: book.author.id,
      authorNickname: book.author.nickname,
      chapterNumber,
      chapterOutlineTitle: chapterOutline.title,
      systemPrompt,
      chapterPrompt,
      bookMaxChapters: agentConfig.maxChapters || 5,
    };
  }

  // 模型生成阶段：只做 LLM 调用与解析
  private async generateChapterContent(prepared: PreparedChapterGeneration): Promise<GeneratedChapter> {
    const authorToken = await getUserTokenById(prepared.authorId);
    if (!authorToken) {
      throw new Error(`无法获取作者 ${prepared.authorNickname} 的 Token`);
    }

    // 调用 LLM 并带重试
    const chapterData = await parseChapterWithRetry(
      () => testModeSendChat(prepared.chapterPrompt, prepared.systemPrompt, 'inksurvivor-writer', authorToken),
      prepared.chapterOutlineTitle,
      {
        taskId: `ChapterWrite-${prepared.bookTitle}-ch${prepared.chapterNumber}`,
        maxRetries: 3,
      }
    );

    console.log(`[ChapterWrite] 解析结果 - title: ${chapterData.title}, contentLength: ${chapterData.content.length}`);

    if (!chapterData.content) {
      console.error(`[ChapterWrite] 章节内容为空`);
      throw new Error('LLM 未返回章节内容');
    }

    return chapterData;
  }

  // 写库阶段：落库 + 书籍状态 + 评分 + WebSocket 通知
  private async persistGeneratedChapter(
    prepared: PreparedChapterGeneration,
    chapterData: GeneratedChapter
  ): Promise<void> {
    const newChapter = await prisma.chapter.create({
      data: {
        bookId: prepared.bookId,
        chapterNumber: prepared.chapterNumber,
        title: chapterData.title,
        content: chapterData.content,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        contentLength: chapterData.content.length,
      },
    });

    console.log(`[Chapter] 书籍《${prepared.bookTitle}》第 ${prepared.chapterNumber} 章发布完成`);

    // 标记是否完结
    const isCompleted = prepared.chapterNumber >= prepared.bookMaxChapters;

    // 更新书籍当前章节与状态
    await prisma.book.update({
      where: { id: prepared.bookId },
      data: {
        currentChapter: prepared.chapterNumber,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
      },
    });

    if (isCompleted) {
      console.log(`[Chapter] 书籍《${prepared.bookTitle}》已完成所有 ${prepared.bookMaxChapters} 章，标记为 COMPLETED`);
    }

    // 更新热度与评分
    await prisma.book.update({
      where: { id: prepared.bookId },
      data: {
        heatValue: { increment: 100 },
        finalScore: { increment: 100 + Math.floor(Math.random() * 50) },
        viewCount: { increment: Math.floor(Math.random() * 50) },
      },
    });

    // 异步触发读者 Agent 评论
    setTimeout(async () => {
      try {
        await readerAgentService.dispatchReaderAgents(newChapter.id, prepared.bookId);
      } catch (error) {
        console.error(`[ReaderAgent] 章节 ${prepared.chapterNumber} 调度失败:`, error);
      }
    }, 100);

    // 通知前端章节已发布
    wsEvents.chapterPublished(prepared.bookId, newChapter.chapterNumber, newChapter.title);

    console.log(`[Chapter] 书籍《${prepared.bookTitle}》第 ${prepared.chapterNumber} 章创作完成`);
  }

  /**
   * 为单本书创作章节
   */
  async writeChapter(bookId: string, chapterNumber: number): Promise<void> {
    console.log(`[Chapter] 开始为书籍 ${bookId} 创作第 ${chapterNumber} 章`);
    // 单本书写作仍保持顺序：准备 -> 生成 -> 写库
    const prepared = await this.prepareChapterGeneration(bookId, chapterNumber);
    if (!prepared) {
      return;
    }
    const chapterData = await this.generateChapterContent(prepared);
    await this.persistGeneratedChapter(prepared, chapterData);
  }

  /**
   * 为赛季中所有需要创作章节的书籍创作章节
   * @param seasonId - 赛季ID
   * @param chapterNumber - 目标章节号
   * @param bookIds - 可选，指定书籍ID列表（用于过滤）
   */
  async writeChaptersForSeason(seasonId: string, chapterNumber: number, bookIds?: string[]): Promise<void> {
    console.log(`[Chapter] 开始为赛季 ${seasonId} 第 ${chapterNumber} 章创作`);

    // 1. 获取该赛季所有活跃书籍
    const whereCondition: { seasonId: string; status: string; id?: { in: string[] } } = {
      seasonId,
      status: 'ACTIVE',
    };
    if (bookIds && bookIds.length > 0) {
      whereCondition.id = { in: bookIds };
    }

    const allBooks = await prisma.book.findMany({
      where: whereCondition,
      include: {
        _count: { select: { chapters: true } },
      },
    });

    // 筛选当前章节数小于目标章节数的书籍
    const books = allBooks.filter(book => book._count.chapters < chapterNumber);

    console.log(`[Chapter] 发现 ${books.length} 本需要创作第 ${chapterNumber} 章的书籍`);

    // 三段式并发：准备(读库) -> LLM生成 -> 写库
    const dbConcurrency = this.getDbConcurrency();
    const llmConcurrency = this.getLlmConcurrency();
    const preparedJobs: PreparedChapterGeneration[] = [];

    // 1) 读库准备阶段
    await this.runWithConcurrency(books, dbConcurrency, async (book) => {
      const prepared = await this.prepareChapterGeneration(book.id, chapterNumber);
      if (prepared) {
        preparedJobs.push(prepared);
      }
    });

    // 2) 模型生成阶段
    const generatedJobs: Array<{ prepared: PreparedChapterGeneration; chapterData: GeneratedChapter }> = [];
    await this.runWithConcurrency(preparedJobs, llmConcurrency, async (prepared) => {
      const chapterData = await this.generateChapterContent(prepared).catch(error => {
        console.error(`[Chapter] 书籍 ${prepared.bookId} 第 ${chapterNumber} 章创作失败:`, error);
        return null;
      });
      if (chapterData) {
        generatedJobs.push({ prepared, chapterData });
      }
    });

    // 3) 写库阶段
    await this.runWithConcurrency(generatedJobs, dbConcurrency, async (job) => {
      await this.persistGeneratedChapter(job.prepared, job.chapterData).catch(error => {
        console.error(`[Chapter] 书籍 ${job.prepared.bookId} 第 ${chapterNumber} 章发布失败:`, error);
      });
    });
    console.log(`[Chapter] 赛季 ${seasonId} 第 ${chapterNumber} 章创作完成`);
  }

  /**
   * 获取某章节的读者反馈
   */
  private async getChapterFeedbacks(bookId: string, chapterNumber: number): Promise<string[]> {
    if (chapterNumber <= 0) return [];

    const comments = await prisma.comment.findMany({
      where: {
        bookId,
        chapter: { chapterNumber },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 提取评论内容作为反馈
    const filtered = comments.filter(c => c.content !== null && c.content.length > 10);
    return filtered.map(c => c.content as string).slice(0, 3);
  }

  /**
   * 追赶模式：为落后书籍补齐缺失章节
   *
   * 场景：赛季已进行到第 N 轮，但某些书籍只创作到第 M 章 (M < N)
   * 逻辑：
   * 1. 生成大纲（如没有）
   * 2. 检测真正缺失的章节（可能不是连续的，如只有3、4、5章，缺失1、2章）
   * 3. 带重试地补齐缺失章节 + 当前轮次章节
   */
  async catchUpBooks(seasonId: string, targetRound: number): Promise<void> {
    console.log(`[CatchUp] 开始追赶模式 - 赛季: ${seasonId}, 目标轮次: ${targetRound}`);

    // 1. 获取落后书籍（章节数 < 目标轮次）
    const allBooks = await prisma.book.findMany({
      where: {
        seasonId,
        status: 'ACTIVE',
      },
      include: {
        _count: { select: { chapters: true } },
        chapters: { select: { chapterNumber: true } }, // 获取所有章节编号
        author: { select: { agentConfig: true } },
      },
    });

    // 筛选当前章节数小于目标轮次的书籍
    const books = allBooks.filter(book => book._count.chapters < targetRound);

    if (books.length === 0) {
      console.log(`[CatchUp] 没有需要追赶的书籍`);
      return;
    }

    console.log(`[CatchUp] 发现 ${books.length} 本需要追赶的书籍`);

    const concurrency = this.getDbConcurrency();
    await this.runWithConcurrency(books, concurrency, async (book) => {
      // 获取当前已有的章节编号集合
      const existingChapterNumbers = new Set(book.chapters.map(c => c.chapterNumber));
      // 计算缺失章节：1到targetRound中不存在的章节
      const missingChapters: number[] = [];
      for (let i = 1; i <= targetRound; i++) {
        if (!existingChapterNumbers.has(i)) {
          missingChapters.push(i);
        }
      }

      console.log(`[CatchUp] 书籍《${book.title}》当前 ${book._count.chapters} 章，已有章节: ${Array.from(existingChapterNumbers).sort((a, b) => a - b).join(', ')}，缺失章节: ${missingChapters.join(', ')}`);

      if (missingChapters.length === 0) {
        console.log(`[CatchUp] 书籍《${book.title}》没有缺失章节需要补`);
        return;
      }

      try {
        // 2.1 检查是否有大纲 - 从 Book 表获取
        const existingBook = await prisma.book.findUnique({
          where: { id: book.id },
          select: { chaptersPlan: true },
        });

        if (!existingBook || !existingBook.chaptersPlan) {
          console.log(`[CatchUp] 书籍《${book.title}》没有大纲，生成整本书大纲`);
          await outlineGenerationService.generateOutline(book.id);
        }

        // 2.2 检查大纲是否包含所有缺失章节的大纲，如果没有则先生成
        const chaptersPlan = existingBook?.chaptersPlan as unknown as Array<{ number: number }> || [];
        const outlineChapterNumbers = new Set(chaptersPlan.map(c => c.number));
        const needGenerateOutline: number[] = [];
        for (const ch of missingChapters) {
          if (!outlineChapterNumbers.has(ch)) {
            needGenerateOutline.push(ch);
          }
        }

        // 为缺失章节生成大纲
        for (const ch of needGenerateOutline) {
          console.log(`[CatchUp] 书籍《${book.title}》缺失第 ${ch} 章大纲，生成中...`);
          try {
            await outlineGenerationService.generateNextChapterOutline(book.id, ch);
          } catch (error) {
            console.error(`[CatchUp] 书籍《${book.title}》第 ${ch} 章大纲生成失败:`, error);
          }
        }

        // 2.3 并发补齐缺失章节（按章节号顺序）
        // writeChapter 内部已有 API 级 + JSON 解析级重试，无需额外重试
        const chapterConcurrency = process.env.NODE_ENV === 'production' ? 1 : Math.min(2, concurrency);
        const results: Array<{ success?: boolean; chapterNum: number } | void> = [];
        await this.runWithConcurrency(missingChapters, chapterConcurrency, async (chapterNum) => {
          const result = await this.writeChapter(book.id, chapterNum)
            .then(() => ({ success: true, chapterNum }))
            .catch((error) => {
              console.error(`[CatchUp] 书籍《${book.title}》第 ${chapterNum} 章失败:`, error.message);
              return { success: false, chapterNum };
            });
          results.push(result);
        });

        // 2.4 统计失败章节，输出警告
        const failedChapters = results.filter(r => r && !r.success);
        if (failedChapters.length > 0) {
          console.warn(`[CatchUp] 书籍《${book.title}》仍有 ${failedChapters.length} 章未完成:`, failedChapters);
        } else {
          console.log(`[CatchUp] 书籍《${book.title}》追赶完成 - ${missingChapters.length} 章全部创作成功`);
        }
      } catch (error) {
        console.error(`[CatchUp] 书籍《${book.title}》追赶失败:`, error);
      }
    });
    console.log(`[CatchUp] 追赶模式完成 - ${books.length} 本书籍已处理`);
  }

  /**
   * 单本书的章节补全
   *
   * 用于书籍详情页的"补全章节"按钮
   * 根据最新大纲检测缺失章节并补全
   */
  async catchUpSingleBook(bookId: string, targetRound: number): Promise<void> {
    console.log(`[CatchUpSingle] 开始为书籍 ${bookId} 补全章节，目标轮次: ${targetRound}`);

    // 1. 获取书籍信息
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: { select: { chapterNumber: true } },
        author: { select: { agentConfig: true } },
      },
    });

    if (!book) {
      console.error(`[CatchUpSingle] 书籍不存在: ${bookId}`);
      return;
    }

    // 2. 检查大纲是否存在 - chaptersPlan 是 Book 表的直接字段
    if (!book.chaptersPlan) {
      console.log(`[CatchUpSingle] 书籍《${book.title}》没有大纲，先生成整本书大纲`);
      await outlineGenerationService.generateOutline(bookId);
    }

    // 重新获取大纲
    const existingBook = await prisma.book.findUnique({
      where: { id: bookId },
      select: { chaptersPlan: true },
    });

    const chaptersPlan = (existingBook?.chaptersPlan as unknown as Array<{ number: number }>) || [];
    const outlineChapterNumbers = new Set(chaptersPlan.map((c: { number: number }) => c.number));
    const maxOutlineChapter = Math.max(...Array.from(outlineChapterNumbers), 0);

    // 3. 获取当前已有的章节编号
    const existingChapterNumbers = new Set(book.chapters.map((c: { chapterNumber: number }) => c.chapterNumber));

    // 4. 计算真正缺失的章节（1到max中不存在的）
    const missingChapters: number[] = [];
    const maxChapter = Math.max(targetRound, maxOutlineChapter);
    for (let i = 1; i <= maxChapter; i++) {
      if (!existingChapterNumbers.has(i)) {
        missingChapters.push(i);
      }
    }

    if (missingChapters.length === 0) {
      console.log(`[CatchUpSingle] 书籍《${book.title}》没有缺失章节`);
      return;
    }

    console.log(`[CatchUpSingle] 书籍《${book.title}》缺失章节: ${missingChapters.join(', ')}`);

    // 5. 检查大纲是否包含缺失章节的大纲
    const needGenerateOutline: number[] = [];
    for (const ch of missingChapters) {
      if (!outlineChapterNumbers.has(ch)) {
        needGenerateOutline.push(ch);
      }
    }

    // 为缺失章节生成大纲（按顺序生成）
    for (const ch of needGenerateOutline) {
      console.log(`[CatchUpSingle] 书籍《${book.title}》缺失第 ${ch} 章大纲，生成中...`);
      try {
        await outlineGenerationService.generateNextChapterOutline(bookId, ch);
      } catch (error) {
        console.error(`[CatchUpSingle] 书籍《${book.title}》第 ${ch} 章大纲生成失败:`, error);
      }
    }

    // 6. 按章节顺序补写章节
    for (const chapterNum of missingChapters) {
      try {
        await this.writeChapter(bookId, chapterNum);
      } catch (error) {
        console.error(`[CatchUpSingle] 书籍《${book.title}》第 ${chapterNum} 章失败:`, (error as Error).message);
      }
    }

    console.log(`[CatchUpSingle] 书籍《${book.title}》补全完成 - ${missingChapters.length} 章`);
  }

  /**
   * 标准化分区风格
   */
  private normalizeZoneStyle(zoneStyle: string): string {
    const zoneMap: Record<string, string> = {
      urban: '现代都市',
      fantasy: '玄幻架空',
      scifi: '科幻未来',
    };
    return zoneMap[zoneStyle.toLowerCase()] || zoneStyle;
  }
}

export const chapterWritingService = new ChapterWritingService();
