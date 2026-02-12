/**
 * 大纲生成服务
 *
 * OUTLINE 阶段：为书籍生成/优化章节大纲
 * 基于读者反馈和作者性格生成个性化大纲
 */

import { prisma } from '@/lib/prisma';
import { buildAuthorSystemPrompt, buildOutlinePrompt } from '@/lib/secondme/prompts';
import { testModeSendChat } from '@/lib/secondme/client';
import { parseLLMJsonWithRetry } from '@/lib/utils/llm-parser';

// Agent 配置接口
interface AgentConfig {
  personality: string;
  writingStyle: string;
  preferZone: string;
  adaptability: number;
  riskTolerance: 'low' | 'medium' | 'high';
  description: string;
}

// 大纲数据结构（整本书的大纲）
interface BookOutline {
  title: string;
  summary: string;
  characters: Array<{
    name: string;
    role: string;
    description: string;
    motivation: string;
  }>;
  chapters: Array<{
    number: number;
    title: string;
    summary: string;
    key_events: string[];
    word_count_target: number;
  }>;
  themes: string[];
  tone: string;
}

// 单章大纲数据结构
interface ChapterOutline {
  number: number;
  title: string;
  summary: string;
  key_events: string[];
  word_count_target: number;
}

export class OutlineGenerationService {
  /**
   * 为单本书生成大纲（整本书的 5 章大纲）
   */
  async generateOutline(bookId: string): Promise<void> {
    console.log(`[Outline] 开始为书籍 ${bookId} 生成大纲`);

    // 1. 获取书籍和作者信息
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: { select: { id: true, nickname: true, agentConfig: true } },
      },
    });

    if (!book) {
      console.error(`[Outline] 书籍不存在: ${bookId}`);
      return;
    }

    // 检查是否已有大纲
    const existingOutline = await prisma.outline.findUnique({
      where: { bookId },
    });

    if (existingOutline) {
      console.log(`[Outline] 书籍《${book.title}》已有大纲，跳过生成`);
      return;
    }

    // 2. 解析作者配置
    const agentConfig: AgentConfig = JSON.parse(book.author.agentConfig || '{}');

    // 3. 获取赛季信息
    const season = await prisma.season.findUnique({
      where: { id: book.seasonId ?? undefined },
    });

    if (!season) {
      console.error(`[Outline] 赛季不存在: ${book.seasonId}`);
      return;
    }

    const seasonInfo = {
      themeKeyword: season.themeKeyword,
      constraints: JSON.parse(season.constraints || '[]') as string[],
      zoneStyles: JSON.parse(season.zoneStyles || '[]') as string[],
      maxChapters: season.maxChapters || 5,
    };

    // 4. 构建 System Prompt（包含性格 + 赛季约束，符合 PRD 11.1）
    const systemPrompt = buildAuthorSystemPrompt({
      userName: agentConfig.description || '作家',
      writingStyle: agentConfig.writingStyle,
      seasonTheme: seasonInfo.themeKeyword,
      constraints: seasonInfo.constraints,
      zoneStyle: this.normalizeZoneStyle(book.zoneStyle),
    });

    // 5. 构建大纲生成提示（生成整本书的 N 章大纲，根据赛季最大章节数）
    const chapterCount = Math.min(seasonInfo.maxChapters, 7); // 最多7章
    const outlinePrompt = buildOutlinePrompt({
      seasonTheme: seasonInfo.themeKeyword,
      constraints: seasonInfo.constraints,
      zoneStyle: this.normalizeZoneStyle(book.zoneStyle),
      chapterCount: chapterCount,  // 动态章节数
      endingType: '开放结局',
    });

    // 6. 调用 LLM 生成大纲（带重试机制）
    const outlineData = await parseLLMJsonWithRetry<BookOutline>(
      () => testModeSendChat(outlinePrompt, systemPrompt),
      {
        taskId: `OutlineGen-${book.title}`,
        maxRetries: 3,
      }
    );

    // 8. 保存大纲（使用 upsert，如果已存在则更新）
    await prisma.outline.upsert({
      where: { bookId },
      create: {
        bookId: book.id,
        originalIntent: outlineData.summary,
        chaptersPlan: JSON.stringify(outlineData.chapters),
        characters: JSON.stringify(outlineData.characters),
      },
      update: {
        originalIntent: outlineData.summary,
        chaptersPlan: JSON.stringify(outlineData.chapters),
        characters: JSON.stringify(outlineData.characters),
      },
    });

    console.log(`[Outline] 书籍《${book.title}》大纲生成完成 - ${outlineData.chapters.length} 章`);
    console.log(`[Outline] 大纲章节列表:`, outlineData.chapters.map(c => c.number));
  }

  /**
   * 为单本书生成或优化特定章节的大纲
   * 每次 OUTLINE 阶段只处理一本书的下一章
   */
  async generateNextChapterOutline(bookId: string): Promise<void> {
    console.log(`[Outline] 开始为书籍 ${bookId} 生成下一章大纲`);

    // 1. 获取书籍信息和当前章节数
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
      console.error(`[Outline] 书籍不存在: ${bookId}`);
      return;
    }

    const currentChapterCount = book.chapterCount;
    const nextChapterNumber = currentChapterCount + 1;

    console.log(`[Outline] 书籍《${book.title}》当前 ${currentChapterCount} 章，生成第 ${nextChapterNumber} 章大纲`);

    // 2. 获取现有大纲
    const existingOutline = await prisma.outline.findUnique({
      where: { bookId },
    });

    if (!existingOutline) {
      // 如果没有大纲先生成整本大纲
      await this.generateOutline(bookId);
      return;
    }

    // 解析现有大纲
    const chaptersPlan = JSON.parse(existingOutline.chaptersPlan || '[]') as ChapterOutline[];

    // 检查该章节是否已有大纲
    const existingChapterOutline = chaptersPlan.find((c) => c.number === nextChapterNumber);
    if (existingChapterOutline) {
      console.log(`[Outline] 第 ${nextChapterNumber} 章大纲已存在`);
      return;
    }

    // 3. 解析作者配置
    const agentConfig: AgentConfig = JSON.parse(book.author.agentConfig || '{}');

    // 4. 获取赛季信息
    const season = await prisma.season.findUnique({
      where: { id: book.seasonId ?? undefined },
    });

    if (!season) {
      console.error(`[Outline] 赛季不存在: ${book.seasonId}`);
      return;
    }

    const seasonInfo = {
      themeKeyword: season.themeKeyword,
      constraints: JSON.parse(season.constraints || '[]') as string[],
    };

    // 5. 获取上一章的读者反馈
    const recentFeedbacks = await this.getChapterFeedbacks(bookId, currentChapterCount);

    // 6. 构建 System Prompt（包含性格 + 赛季约束）
    const systemPrompt = buildAuthorSystemPrompt({
      userName: agentConfig.description || '作家',
      writingStyle: agentConfig.writingStyle,
      seasonTheme: seasonInfo.themeKeyword,
      constraints: seasonInfo.constraints,
      zoneStyle: this.normalizeZoneStyle(book.zoneStyle),
    });

    // 7. 构建单章大纲生成提示
    const chapterPrompt = this.buildSingleChapterPrompt({
      bookTitle: book.title,
      chapterNumber: nextChapterNumber,
      previousChapterSummary: currentChapterCount > 0
        ? this.getChapterSummary(chaptersPlan, currentChapterCount)
        : '这是本书的第一章',
      feedbacks: recentFeedbacks,
      isLastChapter: nextChapterNumber >= 5,
    });

    // 8. 调用 LLM 生成章节大纲
    let response: string;
    try {
      response = await testModeSendChat(chapterPrompt, systemPrompt);
      console.log(`[Outline] LLM 返回: ${response.substring(0, 200)}...`);
    } catch (error) {
      console.error(`[Outline] LLM 调用失败:`, error);
      return;
    }

    // 9. 解析响应（使用统一的 JSON 解析器，带重试机制）
    let newChapterOutline: ChapterOutline;
    try {
      newChapterOutline = await parseLLMJsonWithRetry<ChapterOutline>(
        () => Promise.resolve(response),
        {
          taskId: `Outline-${book.title}-ch${nextChapterNumber}`,
          maxRetries: 2,
        }
      );
    } catch (error) {
      console.error(`[Outline] 解析章节大纲失败:`, error);
      return;
    }

    // 10. 更新大纲中的章节计划
    const updatedChapters = [...chaptersPlan, newChapterOutline]
      .sort((a, b) => a.number - b.number);

    await prisma.outline.update({
      where: { bookId },
      data: {
        chaptersPlan: JSON.stringify(updatedChapters),
      },
    });

    console.log(`[Outline] 书籍《${book.title}》第 ${nextChapterNumber} 章大纲生成完成`);
  }

  /**
   * 为赛季中所有活跃书籍生成下一章大纲
   * 每次 OUTLINE 阶段为一本书生成下一章大纲
   */
  async generateOutlinesForSeason(seasonId: string): Promise<void> {
    console.log(`[Outline] 开始为赛季 ${seasonId} 生成下一章大纲`);

    // 1. 获取该赛季所有活跃书籍
    const books = await prisma.book.findMany({
      where: {
        seasonId,
        status: 'ACTIVE',
      },
      orderBy: { heat: 'desc' }, // 按热度排序，优先处理热门书籍
      select: { id: true, title: true, chapterCount: true },
    });

    console.log(`[Outline] 发现 ${books.length} 本活跃书籍`);

    // 2. 只为第一章的书籍生成大纲（后续轮次按需处理）
    const booksNeedingOutline = books.filter((b) => b.chapterCount === 0);

    if (booksNeedingOutline.length === 0) {
      console.log(`[Outline] 所有书籍已有大纲`);
      return;
    }

    console.log(`[Outline] 需要生成大纲的书籍: ${booksNeedingOutline.length} 本`);

    // 3. 并发为这些书籍生成大纲
    const promises = booksNeedingOutline.map((book) =>
      this.generateOutline(book.id).catch((error) => {
        console.error(`[Outline] 书籍《${book.title}》大纲生成失败:`, error);
      })
    );

    await Promise.all(promises);
    console.log(`[Outline] 赛季 ${seasonId} 大纲生成完成`);
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
        isHuman: false, // 只取 AI Reader 的评论
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 提取评论内容作为反馈
    return comments.map((c) => c.content).filter(Boolean);
  }

  /**
   * 获取章节概要
   */
  private getChapterSummary(chapters: ChapterOutline[], chapterNumber: number): string {
    const chapter = chapters.find((c) => c.number === chapterNumber);
    return chapter?.summary || '';
  }

  /**
   * 构建单章大纲生成提示
   */
  private buildSingleChapterPrompt(params: {
    bookTitle: string;
    chapterNumber: number;
    previousChapterSummary: string;
    feedbacks?: string[];
    isLastChapter: boolean;
  }): string {
    return `请为《${params.bookTitle}》第 ${params.chapterNumber} 章生成详细大纲。

## 前文回顾
${params.previousChapterSummary}

${params.feedbacks && params.feedbacks.length > 0 ? `## 读者反馈（供参考）
${params.feedbacks.map((f) => `- ${f}`).join('\n')}` : ''}

## 输出格式 (JSON)
{
  "number": ${params.chapterNumber},
  "title": "章节标题（简洁有力，不超过10字）",
  "summary": "章节概要（100-150字）",
  "key_events": ["关键事件1", "关键事件2"],
  "word_count_target": 2000
}

${params.isLastChapter ? '注意：这是最后一章，需要有完结感。' : '注意：结尾需要留有悬念。'}

现在开始创作，只输出 JSON，不要有其他内容。`;
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

export const outlineGenerationService = new OutlineGenerationService();
