/**
 * 章节创作服务
 *
 * WRITING 阶段：为书籍创作章节正文
 * 基于大纲和读者反馈生成个性化章节内容
 */

import { prisma } from '@/lib/prisma';
import { buildAuthorSystemPrompt, buildChapterPrompt } from '@/lib/secondme/prompts';
import { testModeSendChat } from '@/lib/secondme/client';
import { parseLLMJsonWithRetry } from '@/lib/utils/llm-parser';
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
  preferZone: string;       // 偏好分区

  // 创作参数
  adaptability: number;     // 听劝指数
  riskTolerance: 'low' | 'medium' | 'high';  // 风险偏好
  description: string;     // 显示名称
  preferredGenres: string[]; // 偏好题材
  maxChapters: number;     // 创作风格
  wordCountTarget: number; // 每章目标字数
}

// 章节数据结构
interface ChapterData {
  title: string;
  content: string;
}

export class ChapterWritingService {
  /**
   * 为单本书创作章节
   */
  async writeChapter(bookId: string, chapterNumber: number): Promise<void> {
    console.log(`[Chapter] 开始为书籍 ${bookId} 创作第 ${chapterNumber} 章`);

    // 1. 获取书籍和作者信息
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
      return;
    }

    // 获取最新大纲 - 从 Book 表获取合并的字段
    const latestOutline = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        chaptersPlan: true,
        characters: true,
      },
    });

    if (!latestOutline || !latestOutline.chaptersPlan) {
      console.error(`[Chapter] 书籍 ${bookId} 没有可用的大纲`);
      return;
    }

    // 2. 解析大纲中的本章信息 - JSONB 自动解析
    const chaptersPlan = latestOutline.chaptersPlan as unknown as Array<{
      number: number;
      title: string;
      summary: string;
      key_events: string[];
      word_count_target: number;
    }> || [];
    const chapterOutline = chaptersPlan.find(c => c.number === chapterNumber);

    if (!chapterOutline) {
      console.error(`[Chapter] 大纲中没有第 ${chapterNumber} 章的信息，大纲章节列表:`, chaptersPlan.map(c => c.number));
      return;
    }

    // 3. 解析作者配置 - 使用数据库的 writerPersonality 字段
    const rawConfig = (book.author.agentConfig as unknown as Record<string, unknown>) || {};
    const agentConfig: AgentConfig = {
      writerPersonality: (rawConfig.writerPersonality as string) || '',
      writingStyle: (rawConfig.writingStyle as string) || '多变',
      adaptability: (rawConfig.adaptability as number) ?? 0.5,
      preferZone: (rawConfig.preferZone as string) || '',
      riskTolerance: (rawConfig.riskTolerance as 'low' | 'medium' | 'high') || 'medium',
      description: (rawConfig.description as string) || book.author.nickname || '作家',
      preferredGenres: (rawConfig.preferredGenres as string[]) || [],
      maxChapters: (rawConfig.maxChapters as number) || 5,
      wordCountTarget: (rawConfig.wordCountTarget as number) || 2000,
    };

    // 4. 获取赛季信息（用于 System Prompt 中的约束）
    const season = await prisma.season.findUnique({
      where: { id: book.seasonId ?? undefined },
    });
    const seasonConstraints = season ? (season.constraints as unknown as string[]) || [] : [];
    const seasonTheme = season?.themeKeyword || '';

    // 5. 获取前几章的摘要（用于保持连贯性）
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

    // 5.1 获取上一章详细内容（用于章节生成的连贯性）
    let previousChapterContent = '';
    if (previousChapters.length > 0) {
      const latestChapter = previousChapters[0];
      if (latestChapter.content) {
        previousChapterContent = `第${latestChapter.chapterNumber}章"${latestChapter.title}"：` +
          latestChapter.content.slice(0, 300) + '...';
      }
    }

    // 6. 获取本章的读者反馈（如果有，用于优化）
    const feedbacks = await this.getChapterFeedbacks(bookId, chapterNumber - 1);

    // 7. 构建 System Prompt（包含完整 Agent 配置 + 赛季约束）
    const systemPrompt = buildAuthorSystemPrompt({
      // 显示用
      userName: agentConfig.description || '作家',

      // Agent 性格配置
      writerPersonality: agentConfig.writerPersonality || '',

      // Agent 写作偏好
      writingStyle: agentConfig.writingStyle || '多变',
      adaptability: agentConfig.adaptability ?? 0.5,
      preferredGenres: agentConfig.preferredGenres || [],

      // 赛季信息
      seasonTheme,
      constraints: seasonConstraints,
      zoneStyle: this.normalizeZoneStyle(book.zoneStyle),

      // 创作参数
      wordCountTarget: agentConfig.wordCountTarget || 2000,
    });

    // 8. 构建章节创作提示（包含 Agent 性格引导和上一章详细内容）
    const chapterPrompt = buildChapterPrompt({
      // Agent 性格配置
      writerPersonality: agentConfig.writerPersonality || '',
      selfIntro: agentConfig.selfIntro || '',
      writingStyle: agentConfig.writingStyle || '多变',
      wordCountTarget: agentConfig.wordCountTarget || 2000,

      // 大纲信息
      bookTitle: book.title,
      chapterNumber,
      outline: {
        summary: chapterOutline.summary,
        key_events: chapterOutline.key_events,
        word_count_target: chapterOutline.word_count_target,
      },

      // 前面内容
      previousSummary,
      previousChapterContent: previousChapterContent || undefined,

      // 反馈
      feedbacks,
    });

    // 8. 调用 LLM 生成章节内容（带重试机制）
    const chapterData = await parseLLMJsonWithRetry<ChapterData>(
      () => testModeSendChat(chapterPrompt, systemPrompt),
      {
        taskId: `ChapterWrite-${book.title}-ch${chapterNumber}`,
        maxRetries: 3,
      }
    );

    // 调试：打印解析结果
    console.log(`[ChapterWrite] 解析结果:`, JSON.stringify(chapterData, null, 2));

    // 9. 确保有标题和内容
    if (!chapterData.title) {
      chapterData.title = chapterOutline.title;
    }
    if (!chapterData.content) {
      console.error(`[ChapterWrite] 章节内容为空，解析结果:`, chapterData);
      throw new Error('LLM 未返回章节内容');
    }

    // 10. 发布章节
    const newChapter = await prisma.chapter.create({
      data: {
        bookId: book.id,
        chapterNumber,
        title: chapterData.title,
        content: chapterData.content,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        contentLength: chapterData.content.length,
      },
    });

    console.log(`[Chapter] 书籍《${book.title}》第 ${chapterNumber} 章发布完成`);

    // 11. 更新书籍状态
    await prisma.book.update({
      where: { id: bookId },
      data: {
        currentChapter: chapterNumber,
        status: 'ACTIVE',
      },
    });

    // 12. 更新评分 - 使用 Book 的合并字段
    await prisma.book.update({
      where: { id: bookId },
      data: {
        heatValue: { increment: 100 }, // 发布加成
        finalScore: { increment: 100 + Math.floor(Math.random() * 50) },
        viewCount: { increment: Math.floor(Math.random() * 50) },
      },
    });

    // 13. 触发 Reader Agent 调度（异步，延迟触发）
    setTimeout(async () => {
      try {
        await readerAgentService.dispatchReaderAgents(newChapter.id, bookId);
      } catch (error) {
        console.error(`[ReaderAgent] 章节 ${chapterNumber} 调度失败:`, error);
      }
    }, 100);

    // 14. 发送 WebSocket 事件通知新章节
    wsEvents.chapterPublished(bookId, newChapter.chapterNumber, newChapter.title);

    console.log(`[Chapter] 书籍《${book.title}》第 ${chapterNumber} 章创作完成`);
  }

  /**
   * 为赛季中所有需要创作章节的书籍创作章节
   */
  async writeChaptersForSeason(seasonId: string, chapterNumber: number): Promise<void> {
    console.log(`[Chapter] 开始为赛季 ${seasonId} 第 ${chapterNumber} 章创作`);

    // 1. 获取该赛季所有活跃书籍
    const allBooks = await prisma.book.findMany({
      where: {
        seasonId,
        status: 'ACTIVE',
      },
      include: {
        _count: { select: { chapters: true } },
      },
    });

    // 筛选当前章节数小于目标章节数的书籍
    const books = allBooks.filter(book => book._count.chapters < chapterNumber);

    console.log(`[Chapter] 发现 ${books.length} 本需要创作第 ${chapterNumber} 章的书籍`);

    // 2. 并发创作章节
    const promises = books.map(book =>
      this.writeChapter(book.id, chapterNumber).catch(error => {
        console.error(`[Chapter] 书籍 ${book.id} 第 ${chapterNumber} 章创作失败:`, error);
      })
    );

    await Promise.all(promises);
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
    return comments
      .filter(c => c.content && c.content.length > 10)
      .map(c => c.content)
      .slice(0, 3);
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

    // 2. 对每本落后书籍执行追赶
    const promises = books.map(async (book) => {
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
            await outlineGenerationService.generateNextChapterOutline(book.id);
          } catch (error) {
            console.error(`[CatchUp] 书籍《${book.title}》第 ${ch} 章大纲生成失败:`, error);
          }
        }

        // 2.3 并发补齐缺失章节（按章节号顺序）
        // writeChapter 内部已有 API 级 + JSON 解析级重试，无需额外重试
        const chapterPromises = [];
        for (const chapterNum of missingChapters) {
          chapterPromises.push(
            this.writeChapter(book.id, chapterNum).catch((error) => {
              console.error(`[CatchUp] 书籍《${book.title}》第 ${chapterNum} 章失败:`, error.message);
              return { success: false, chapterNum };
            })
          );
        }
        const results = await Promise.all(chapterPromises);

        // 2.4 统计失败章节，输出警告
        const failedChapters = results.filter(r => !r?.success);
        if (failedChapters.length > 0) {
          console.warn(`[CatchUp] 书籍《${book.title}》仍有 ${failedChapters.length} 章未完成:`, failedChapters);
        } else {
          console.log(`[CatchUp] 书籍《${book.title}》追赶完成 - ${missingChapters.length} 章全部创作成功`);
        }
      } catch (error) {
        console.error(`[CatchUp] 书籍《${book.title}》追赶失败:`, error);
      }
    });

    await Promise.all(promises);
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
        await outlineGenerationService.generateNextChapterOutline(bookId);
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
