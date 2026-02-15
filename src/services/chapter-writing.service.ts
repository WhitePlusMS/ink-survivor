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
  personality: string;
  writingStyle: string;
  preferZone: string;
  adaptability: number;
  riskTolerance: 'low' | 'medium' | 'high';
  description: string;
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

    // 3. 解析作者配置 - JSONB 自动解析
    const agentConfig: AgentConfig = book.author.agentConfig as unknown as AgentConfig || {
      persona: '作家',
      writingStyle: 'standard',
      adaptability: 5,
      preferredGenres: [],
      maxChapters: 10,
      wordCountTarget: 3000,
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
      select: { content: true, title: true },
    });

    const previousSummary = previousChapters.length > 0
      ? `前情：${previousChapters.map(c => c.title).join(' -> ')}`
      : '这是本书的第一章';

    // 5. 获取本章的读者反馈（如果有，用于优化）
    const feedbacks = await this.getChapterFeedbacks(bookId, chapterNumber - 1);

    // 6. 构建 System Prompt（包含性格 + 赛季约束，符合 PRD 11.1 规范）
    const systemPrompt = buildAuthorSystemPrompt({
      userName: agentConfig.description || '作家',
      writingStyle: agentConfig.writingStyle,
      seasonTheme,
      constraints: seasonConstraints,
      zoneStyle: this.normalizeZoneStyle(book.zoneStyle),
    });

    // 7. 构建章节创作提示
    const chapterPrompt = buildChapterPrompt({
      bookTitle: book.title,
      chapterNumber,
      outline: {
        summary: chapterOutline.summary,
        key_events: chapterOutline.key_events,
        word_count_target: chapterOutline.word_count_target,
      },
      previousSummary,
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
   * 2. 带重试地补齐第 M+1 到第 N 章
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
      const missingCount = targetRound - book._count.chapters;
      console.log(`[CatchUp] 书籍《${book.title}》当前 ${book._count.chapters} 章，需补 ${missingCount} 章`);

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

        // 2.2 并发补齐缺失章节
        // writeChapter 内部已有 API 级 + JSON 解析级重试，无需额外重试
        const chapterPromises = [];
        for (let chapterNum = book._count.chapters + 1; chapterNum <= targetRound; chapterNum++) {
          chapterPromises.push(
            this.writeChapter(book.id, chapterNum).catch((error) => {
              console.error(`[CatchUp] 书籍《${book.title}》第 ${chapterNum} 章失败:`, error.message);
              return { success: false, chapterNum };
            })
          );
        }
        const results = await Promise.all(chapterPromises);

        // 2.3 统计失败章节，输出警告
        const failedChapters = results.filter(r => !r?.success);
        if (failedChapters.length > 0) {
          console.warn(`[CatchUp] 书籍《${book.title}》仍有 ${failedChapters.length} 章未完成:`, failedChapters);
        } else {
          console.log(`[CatchUp] 书籍《${book.title}》追赶完成 - ${missingCount} 章全部创作成功`);
        }
      } catch (error) {
        console.error(`[CatchUp] 书籍《${book.title}》追赶失败:`, error);
      }
    });

    await Promise.all(promises);
    console.log(`[CatchUp] 追赶模式完成 - ${books.length} 本书籍已补齐到第 ${targetRound} 章`);
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
