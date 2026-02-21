/**
 * 大纲生成服务
 *
 * OUTLINE 阶段：为书籍生成/优化章节大纲
 * 基于读者反馈和作者性格生成个性化大纲
 */

import { prisma } from '@/lib/prisma';
import { buildAuthorSystemPrompt, buildOutlinePrompt } from '@/lib/secondme/prompts';
import { testModeSendChat, getUserTokenById } from '@/lib/secondme/client';
import { parseLLMJsonWithRetry } from '@/lib/utils/llm-parser';
import { toJsonValue } from '@/lib/utils/jsonb-utils';

// Agent 配置接口
interface AgentConfig {
  // 基础信息
  writerPersonality: string;  // 作者性格描述
  selfIntro?: string;  // 自我介绍
  interestTags?: string[];  // 兴趣标签

  // 写作偏好
  writingStyle: string;      // 写作风格：严肃/幽默/浪漫/悬疑/多变

  // 创作参数
  adaptability: number;     // 听劝指数：0-1
  preferredGenres: string[]; // 偏好题材：['都市', '玄幻', '科幻', ...]
  maxChapters: number;     // 创作风格：3=短篇, 5=中篇, 7=长篇
  wordCountTarget: number;  // 每章目标字数：1000/2000/3000
}

// 单章大纲数据结构
interface ChapterOutline {
  number: number;
  title: string;
  summary: string;
  key_events: string[];
  word_count_target: number;
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
  chapters: ChapterOutline[];
  themes: string[];
  tone: string;
}

// 大纲修改判断结果
interface OutlineModificationDecision {
  shouldModify: boolean;
  reason: string;
  changes: string[];
  targetChapter?: number; // 明确要修改第几章（1-based）
}

export class OutlineGenerationService {
  /**
   * 为单本书生成大纲（整本书的 5 章大纲）
   * @param bookId - 书籍ID
   * @param testMode - 测试模式：true 时跳过数据库检查，且不保存到数据库，直接返回大纲数据
   */
  async generateOutline(bookId: string, testMode: boolean = false): Promise<{
    title: string;
    summary: string;
    characters: unknown[];
    chapters: unknown[];
  } | null> {
    console.log(`[Outline] 开始为书籍 ${bookId} 生成大纲${testMode ? ' (测试模式)' : ''}`);

    // 1. 获取书籍和作者信息
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: { select: { id: true, nickname: true, agentConfig: true } },
      },
    });

    if (!book) {
      console.error(`[Outline] 书籍不存在: ${bookId}`);
      return null;
    }

    // 非测试模式：检查是否已有大纲
    if (!testMode) {
      const existingBook = await prisma.book.findUnique({
        where: { id: bookId },
        select: { chaptersPlan: true },
      });

      if (existingBook && existingBook.chaptersPlan) {
        console.log(`[Outline] 书籍《${book.title}》已有大纲，跳过生成`);
        return null;
      }
    }

    // 2. 解析作者配置 - 使用数据库的 writerPersonality 字段
    const rawConfig = book.author.agentConfig as unknown as Record<string, unknown>;
    const agentConfig: AgentConfig = {
      writerPersonality: (rawConfig.writerPersonality as string) || '',
      writingStyle: (rawConfig.writingStyle as string) || '多变',
      adaptability: (rawConfig.adaptability as number) ?? 0.5,
      preferredGenres: (rawConfig.preferredGenres as string[]) || [],
      maxChapters: (rawConfig.maxChapters as number) || 5,
      wordCountTarget: (rawConfig.wordCountTarget as number) || 2000,
    };

    // 3. 获取赛季信息
    const season = await prisma.season.findUnique({
      where: { id: book.seasonId ?? undefined },
    });

    if (!season) {
      console.error(`[Outline] 赛季不存在: ${book.seasonId}`);
      return null;
    }

    const seasonInfo = {
      themeKeyword: season.themeKeyword,
      // Prisma JSONB 字段已自动解析，直接使用类型断言
      constraints: season.constraints as unknown as string[],
      zoneStyles: season.zoneStyles as unknown as string[],
      maxChapters: season.maxChapters || 7,
      minChapters: season.minChapters || 3,
    };

    // 获取用户的个人倾向（3=短篇，5=中篇，7=长篇）
    const userPreferredChapters = agentConfig.maxChapters || 5;

    // 构建章节倾向描述（只传递风格倾向，让AI自己决定章节数）
    const chapterPreferenceText = userPreferredChapters <= 3
      ? '短篇小说风格（精简干练，节奏快）'
      : userPreferredChapters >= 7
        ? '长篇小说风格（宏大叙事，细节丰富）'
        : '中篇小说风格（平衡适当，详略得当）';

    // 4. 构建 System Prompt（包含完整 Agent 配置 + 赛季约束）
    const systemPrompt = buildAuthorSystemPrompt({
      // 显示用
      userName: book.author.nickname || '作家',

      // Agent 性格配置
      writerPersonality: agentConfig.writerPersonality || '',

      // Agent 写作偏好
      writingStyle: agentConfig.writingStyle || '多变',
      adaptability: agentConfig.adaptability ?? 0.5,
      preferredGenres: agentConfig.preferredGenres || [],

      // 赛季信息
      seasonTheme: seasonInfo.themeKeyword,
      constraints: seasonInfo.constraints,
      zoneStyle: this.normalizeZoneStyle(book.zoneStyle),

      // 创作参数
      wordCountTarget: agentConfig.wordCountTarget || 2000,
    });

    // 5. 构建大纲生成提示（包含 Agent 性格引导）
    const outlinePrompt = buildOutlinePrompt({
      // Agent 性格配置
      writerPersonality: agentConfig.writerPersonality || '',
      writingStyle: agentConfig.writingStyle || '多变',

      // Agent 创作参数
      adaptability: agentConfig.adaptability ?? 0.5,
      preferredGenres: agentConfig.preferredGenres || [],
      wordCountTarget: agentConfig.wordCountTarget || 2000,

      // 赛季信息
      seasonTheme: seasonInfo.themeKeyword,
      constraints: seasonInfo.constraints,
      zoneStyle: this.normalizeZoneStyle(book.zoneStyle),
      minChapters: seasonInfo.minChapters,
      maxChapters: seasonInfo.maxChapters,
      chapterPreference: chapterPreferenceText,
    });

    // 6. 调用 LLM 生成大纲（带重试机制）
    // 使用书籍作者的 token
    const authorToken = await getUserTokenById(book.author.id);
    if (!authorToken) {
      throw new Error(`无法获取作者 ${book.author.nickname} 的 Token`);
    }

    const outlineData = await parseLLMJsonWithRetry<BookOutline>(
      () => testModeSendChat(outlinePrompt, systemPrompt, 'inksurvivor-outline', authorToken),
      {
        taskId: `OutlineGen-${book.title}`,
        maxRetries: 3,
      }
    );

    // 8. 保存大纲 - 测试模式不保存到数据库
    if (testMode) {
      console.log(`[Outline] 测试模式：跳过保存，直接返回大纲数据`);
      return {
        title: outlineData.title,
        summary: outlineData.summary,
        characters: outlineData.characters,
        chapters: outlineData.chapters,
      };
    }

    // 正式模式：保存到数据库
    await prisma.book.update({
      where: { id: book.id },
      data: {
        originalIntent: outlineData.summary,
        chaptersPlan: toJsonValue(outlineData.chapters),
        characters: toJsonValue(outlineData.characters),
      },
    });

    // 9. 保存初始大纲版本
    await this.saveOutlineVersion(book.id, 1, '初始版本');

    console.log(`[Outline] 书籍《${book.title}》大纲生成完成 - ${outlineData.chapters.length} 章`);
    console.log(`[Outline] 大纲章节列表:`, outlineData.chapters.map(c => c.number));
    return null;
  }

  /**
   * 为单本书生成或优化特定章节的大纲
   * 每次 OUTLINE 阶段只处理一本书的下一章
   *
   * 新逻辑（第2轮及以后）：
   * 1. 获取上一章的读者评论（Top 3 AI + 人类评论）
   * 2. 调用 LLM 判断"是否根据反馈修改大纲"
   * 3. 结合 adaptability（听劝程度）决定
   * 4. 如果改 → 修改大纲 → 保存新版本 → 生成第 N 章大纲
   * 5. 如果不改 → 直接生成第 N 章大纲
   * @param bookId - 书籍ID
   * @param targetRound - 目标轮次（可选，不传则根据章节数计算）
   * @param testMode - 测试模式：true 时即使大纲存在也重新生成，且不写入数据库，返回生成的大纲
   * @param testComments - 测试用的人类评论（可选，仅在测试模式使用）
   */
  async generateNextChapterOutline(bookId: string, targetRound?: number, testMode?: boolean, testComments?: Array<{ type: 'ai' | 'human'; content: string; rating?: number }>): Promise<{
    title: string;
    summary: string;
    characters: unknown[];
    chapters: unknown[];
    originalChapters?: unknown[]; // 优化前的大纲（用于对比）
  } | null> {
    console.log(`[Outline] 开始为书籍 ${bookId} 生成下一章大纲${testMode ? ' (测试模式)' : ''}`);

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
      return null;
    }

    // 计算目标章节号：如果传入了 targetRound 则使用，否则基于已有章节数计算
    // 第N轮应该生成第N章大纲
    const currentChapterCount = book.chapters.length;
    const nextChapterNumber = targetRound ?? currentChapterCount + 1;

    console.log(`[Outline] 书籍《${book.title}》当前 ${currentChapterCount} 章，目标轮次 ${targetRound ?? '未指定'}，生成第 ${nextChapterNumber} 章大纲`);

    // 1.1 检查是否已完成所有章节（超过 maxChapters 则跳过）
    const agentConfig: AgentConfig = book.author.agentConfig as unknown as AgentConfig;
    const maxChapters = agentConfig.maxChapters || 5;
    if (nextChapterNumber > maxChapters) {
      console.log(`[Outline] 书籍《${book.title}》已完成所有 ${maxChapters} 章，跳过大纲生成`);
      return null;
    }

    // 2. 获取现有大纲 - 从 Book 表获取
    const existingBook = await prisma.book.findUnique({
      where: { id: bookId },
      select: { chaptersPlan: true, originalIntent: true, characters: true },
    });

    if (!existingBook || !existingBook.chaptersPlan) {
      // 如果没有大纲先生成整本大纲
      await this.generateOutline(bookId);
      return null;
    }

    // 解析现有大纲
    const chaptersPlan = existingBook.chaptersPlan as unknown as ChapterOutline[];

    // 检查该章节是否已有大纲（测试模式下跳过检查）
    const existingChapterOutline = chaptersPlan.find((c) => c.number === nextChapterNumber);
    if (existingChapterOutline && !testMode) {
      console.log(`[Outline] 第 ${nextChapterNumber} 章大纲已存在`);
      return null;
    }
    if (existingChapterOutline && testMode) {
      console.log(`[Outline] 测试模式：第 ${nextChapterNumber} 章大纲已存在，仍重新生成`);
    }

    // 4. 获取赛季信息
    const season = await prisma.season.findUnique({
      where: { id: book.seasonId ?? undefined },
    });

    if (!season) {
      console.error(`[Outline] 赛季不存在: ${book.seasonId}`);
      return null;
    }

    const seasonInfo = {
      themeKeyword: season.themeKeyword,
      constraints: season.constraints as unknown as string[],
    };

    // ===== 获取评论（用于生成大纲的参考）=====
    // 如果是测试模式且有测试评论，则使用测试评论；否则从数据库获取
    let allComments: Array<{ type: 'ai' | 'human'; content: string; rating?: number }> = [];
    if (testMode && testComments && testComments.length > 0) {
      allComments = testComments;
      console.log(`[Outline] 测试模式：使用传入的测试评论 ${allComments.length} 条`);
    } else {
      for (let ch = 1; ch <= currentChapterCount; ch++) {
        const chapterComments = await this.getAllChapterComments(bookId, ch);
        allComments.push(...chapterComments);
      }
    }

    // ===== 直接生成下一章大纲（只调1次LLM）=====
    // 获取上一章的详细内容（用于保持连贯性）
    let previousChapterContent = '';
    if (currentChapterCount > 0) {
      const previousChapter = await prisma.chapter.findFirst({
        where: { bookId, chapterNumber: currentChapterCount },
        select: { title: true, content: true },
      });
      if (previousChapter?.content) {
        previousChapterContent = `第${currentChapterCount}章"${previousChapter.title}"：` +
          previousChapter.content.slice(0, 300) + '...';
      }
    }

    // 构建 System Prompt
    const systemPrompt = buildAuthorSystemPrompt({
      userName: book.author.nickname || '作家',
      writerPersonality: agentConfig.writerPersonality || '',
      writingStyle: agentConfig.writingStyle || '多变',
      adaptability: agentConfig.adaptability ?? 0.5,
      preferredGenres: agentConfig.preferredGenres || [],
      seasonTheme: seasonInfo.themeKeyword,
      constraints: seasonInfo.constraints,
      zoneStyle: this.normalizeZoneStyle(book.zoneStyle),
      wordCountTarget: agentConfig.wordCountTarget || 2000,
    });

    // 构建单章大纲生成提示（直接生成，包含评论作为参考）
    // 将评论转换为字符串数组
    const feedbacksStrings: string[] = allComments.map(c =>
      c.rating ? `[${c.type.toUpperCase()}] ${c.content} (评分: ${c.rating}/10)` : `[${c.type.toUpperCase()}] ${c.content}`
    );

    // 获取当前目标章节已有的简要大纲（用于约束不能完全重写）
    const existingChapter = chaptersPlan.find(c => c.number === nextChapterNumber);

    const chapterPrompt = this.buildSingleChapterPrompt({
      bookTitle: book.title,
      chapterNumber: nextChapterNumber,
      previousChapterSummary: currentChapterCount > 0
        ? this.getChapterSummary(chaptersPlan, currentChapterCount)
        : '这是本书的第一章',
      previousChapterContent: previousChapterContent || undefined,
      existingChapterOutline: existingChapter ? {
        title: existingChapter.title,
        summary: existingChapter.summary,
      } : undefined,
      feedbacks: feedbacksStrings,  // 使用转换后的字符串数组
      isLastChapter: nextChapterNumber >= (season.maxChapters || 5),
    });

    // 调用 LLM 生成章节大纲（只调1次）
    const authorToken = await getUserTokenById(book.author.id);
    if (!authorToken) {
      console.error(`[Outline] 无法获取作者 ${book.author.nickname} 的 Token`);
      return null;
    }

    let response: string;
    try {
      response = await testModeSendChat(chapterPrompt, systemPrompt, 'inksurvivor-outline', authorToken);
    } catch (error) {
      console.error(`[Outline] LLM 调用失败:`, error);
      return null;
    }

    // 解析响应
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
      return null;
    }

    // 替换目标章节大纲（如果已存在则替换，否则新增）
    const targetChapter = nextChapterNumber;
    const otherChapters = chaptersPlan.filter(c => c.number !== targetChapter);
    const finalChapters = [...otherChapters, newChapterOutline].sort((a, b) => a.number - b.number);

    // 测试模式：返回生成的大纲
    if (testMode) {
      console.log(`[Outline] 测试模式：第 ${targetChapter} 章大纲生成完成（直接替换旧大纲）`);
      return {
        title: book.title,
        summary: existingBook?.originalIntent || '',
        characters: (existingBook?.characters as unknown[]) || [],
        chapters: finalChapters,
        originalChapters: chaptersPlan,
      };
    }

    // 正常模式：保存到数据库
    await prisma.book.update({
      where: { id: bookId },
      data: {
        chaptersPlan: toJsonValue(finalChapters),
      },
    });
    console.log(`[Outline] 书籍《${book.title}》第 ${nextChapterNumber} 章大纲生成完成`);

    // 正常模式也返回生成的大纲（可选）
    return null;
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
      include: {
        // score 已合并到 Book 表，使用 Book 的直接字段
        _count: { select: { chapters: true } },
      },
      // 按热度排序，优先处理热门书籍 - 使用 Book 的 heatValue 字段
      orderBy: { heatValue: 'desc' },
    });

    console.log(`[Outline] 发现 ${books.length} 本活跃书籍`);

    // 2. 只为第一章的书籍生成大纲（后续轮次按需处理）
    const booksNeedingOutline = books.filter((b) => (b._count?.chapters ?? 0) === 0);

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
    return comments
      .map((c) => c.content)
      .filter((c): c is string => c !== null);
  }

  /**
   * 获取某章节的所有评论（AI + 人类）
   * 返回格式：{ type: 'ai' | 'human', content: string, rating?: number }[]
   */
  private async getAllChapterComments(bookId: string, chapterNumber: number): Promise<Array<{ type: 'ai' | 'human'; content: string; rating?: number }>> {
    if (chapterNumber <= 0) return [];

    const comments = await prisma.comment.findMany({
      where: {
        bookId,
        chapter: { chapterNumber },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return comments
      .filter((c) => c.content !== null)
      .map((c) => ({
        type: c.isHuman ? 'human' as const : 'ai' as const,
        content: c.content!,
        rating: c.rating ?? undefined, // 直接使用 1-10 分
      }));
  }

  /**
   * 判断是否需要根据反馈修改大纲
   * 基于 adaptability（听劝程度）和读者反馈决定
   */
  private async shouldModifyOutline(
    bookId: string,
    currentRound: number,
    adaptability: number,
    existingOutline: BookOutline | null,
    recentComments: Array<{ type: 'ai' | 'human'; content: string; rating?: number }>
  ): Promise<OutlineModificationDecision> {
    console.log(`[Outline] 判断是否需要修改大纲 - adaptability: ${adaptability}, 评论数: ${recentComments.length}`);

    // 如果没有评论或者 adaptability 很低，倾向于不修改
    if (recentComments.length === 0) {
      return {
        shouldModify: false,
        reason: '暂无读者反馈，暂不需要修改大纲',
        changes: [],
      };
    }

    // 获取书籍作者信息以获取 token
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { author: { select: { id: true, nickname: true } } },
    });
    if (!book) {
      return { shouldModify: false, reason: '书籍不存在', changes: [] };
    }

    const authorToken = await getUserTokenById(book.author.id);
    if (!authorToken) {
      console.error(`[Outline] 无法获取作者 ${book.author.nickname} 的 Token`);
      return { shouldModify: false, reason: '无法获取 Token', changes: [] };
    }

    // 构建判断 prompt
    const systemPrompt = '你是本书的作者，你需要判断是否需要根据读者反馈修改故事大纲。';
    const prompt = this.buildModificationDecisionPrompt({
      adaptability,
      currentRound,
      existingOutline,
      recentComments,
    });

    try {
      const response = await testModeSendChat(prompt, systemPrompt, 'inksurvivor-outline', authorToken);
      const decision = await parseLLMJsonWithRetry<OutlineModificationDecision>(
        () => Promise.resolve(response),
        {
          taskId: `OutlineDecision-${bookId}-round${currentRound}`,
          maxRetries: 2,
        }
      );

      console.log(`[Outline] 大纲修改判断结果: shouldModify=${decision.shouldModify}, reason=${decision.reason}`);
      return decision;
    } catch (error) {
      console.error(`[Outline] 判断大纲修改失败，默认不修改:`, error);
      return {
        shouldModify: false,
        reason: '判断过程出错，暂不修改大纲',
        changes: [],
      };
    }
  }

  /**
   * 构建大纲修改判断的 prompt
   */
  private buildModificationDecisionPrompt(params: {
    adaptability: number;
    currentRound: number;
    existingOutline: BookOutline | null;
    recentComments: Array<{ type: 'ai' | 'human'; content: string; rating?: number }>;
  }): string {
    const adaptabilityLevel = params.adaptability >= 0.7 ? '高度听劝' : params.adaptability >= 0.4 ? '中等听劝' : '固执己见';

    // 格式化评论
    const aiComments = params.recentComments.filter(c => c.type === 'ai').slice(0, 3);
    const humanComments = params.recentComments.filter(c => c.type === 'human').slice(0, 5);

    let outlineInfo = '';
    if (params.existingOutline) {
      outlineInfo = `
## 当前大纲概要
- 书名：${params.existingOutline.title}
- 主线：${params.existingOutline.summary}
- 章节数：${params.existingOutline.chapters.length} 章
- 主题：${params.existingOutline.themes.join(', ')}
- 风格：${params.existingOutline.tone}
- 关键人物：${params.existingOutline.characters.map(c => c.name).join(', ')}
`;
    }

    return `## 任务
判断是否需要根据读者反馈修改故事大纲，并确定要修改哪一章。

## 作者信息
- 听劝指数：${params.adaptability}（${adaptabilityLevel}，0-1 之间，越高越应该听取读者意见）
- 当前轮次：第 ${params.currentRound} 轮

${outlineInfo}
## 读者反馈

### AI 读者评论（选 Top 3）
${aiComments.map((c, i) => `${i + 1}. ${c.content}${c.rating !== undefined ? `（评分: ${c.rating}/10）` : ''}`).join('\n')}

### 人类读者评论（选 Top 5）
${humanComments.length > 0 ? humanComments.map((c, i) => `${i + 1}. ${c.content}`).join('\n') : '暂无人类评论'}

## 修改规则

### 绝对不能修改（核心资产）
- 故事主线/主题
- 关键人物（名字、性格、核心设定）
- 故事核心冲突
- 已建立的背景设定
- **章节总数（保持不变）**

### 可以根据反馈调整
- 具体事件安排
- 章节的情节走向
- 配角命运/戏份
- 悬念设置
- 章节顺序

### 听劝程度参考
- 高度听劝（>=0.7）：应该认真考虑读者反馈，适当调整情节
- 中等听劝（0.4-0.7）：选择性采纳反馈，只修改确实有问题的部分
- 固执己见（<0.4）：除非有严重问题，否则保持原大纲

## 输出格式 (JSON)
{
  "shouldModify": true/false,
  "targetChapter": 2,  // 如果需要修改，指定要修改第几章（基于读者反馈中最相关的那一章），必须是一个具体数字
  "reason": "判断原因（50字以内）",
  "changes": ["如果要修改，说明具体改什么"]  // 例如：["调整该章的情节走向", "增加女配角的戏份"]
}

只输出 JSON，不要有其他内容。`;
  }

  /**
   * 根据反馈修改大纲
   * 只修改第 currentRound 章及以后的大纲，保留已完成的章节大纲
   */
  private async modifyOutline(
    bookId: string,
    currentRound: number,
    agentConfig: AgentConfig,
    existingOutline: BookOutline,
    decision: OutlineModificationDecision
  ): Promise<ChapterOutline[]> {
    console.log(`[Outline] 开始修改大纲，修改范围：第 ${currentRound} 章及以后`);

    // 获取赛季信息和作者信息
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        author: { select: { id: true, nickname: true } },
      },
    });
    if (!book?.seasonId) {
      throw new Error('书籍不存在或无赛季信息');
    }

    const season = await prisma.season.findUnique({ where: { id: book.seasonId } });
    if (!season) {
      throw new Error('赛季不存在');
    }

    // 获取作者的 token
    const authorToken = await getUserTokenById(book.author.id);
    if (!authorToken) {
      throw new Error(`无法获取作者 ${book.author.nickname} 的 Token`);
    }

    // 构建修改大纲的 prompt（包含完整 Agent 配置）
    const systemPrompt = buildAuthorSystemPrompt({
      // 显示用
      userName: book.author.nickname || '作家',

      // Agent 性格配置
      writerPersonality: agentConfig.writerPersonality || '',

      // Agent 写作偏好
      writingStyle: agentConfig.writingStyle || '多变',
      adaptability: agentConfig.adaptability ?? 0.5,
      preferredGenres: agentConfig.preferredGenres || [],

      // 赛季信息
      seasonTheme: season.themeKeyword,
      constraints: season.constraints as unknown as string[],
      zoneStyle: this.normalizeZoneStyle(book.zoneStyle),

      // 创作参数
      wordCountTarget: agentConfig.wordCountTarget || 2000,
    });

    const prompt = this.buildModifyOutlinePrompt({
      targetChapter: decision.targetChapter || currentRound,
      existingOutline,
      changes: decision.changes,
      reason: decision.reason,
    });

    try {
      const response = await testModeSendChat(prompt, systemPrompt, 'inksurvivor-outline', authorToken);
      const modifiedChapter = await parseLLMJsonWithRetry<ChapterOutline>(
        () => Promise.resolve(response),
        {
          taskId: `OutlineModify-${bookId}-ch${decision.targetChapter}`,
          maxRetries: 2,
        }
      );

      console.log(`[Outline] 第 ${decision.targetChapter} 章大纲修改完成: ${modifiedChapter.title}`);

      // 只返回修改后的目标章节
      return [modifiedChapter];
    } catch (error) {
      console.error(`[Outline] 大纲修改失败:`, error);
      throw error;
    }
  }

  /**
   * 构建大纲修改的 prompt
   */
  private buildModifyOutlinePrompt(params: {
    targetChapter: number;
    existingOutline: BookOutline;
    changes: string[];
    reason: string;
  }): string {
    // 获取目标章节的当前大纲
    const targetChapterOutline = params.existingOutline.chapters.find(c => c.number === params.targetChapter);

    // 准备前后章节作为上下文（用于保持连贯性）
    const previousChapter = params.existingOutline.chapters.find(c => c.number === params.targetChapter - 1);
    const nextChapter = params.existingOutline.chapters.find(c => c.number === params.targetChapter + 1);

    return `## 任务
根据读者反馈，修改第 ${params.targetChapter} 章的大纲。

## 修改原因
${params.reason}
需要修改的具体点：
${params.changes.map(c => `- ${c}`).join('\n')}

## 修改约束
- **只能修改第 ${params.targetChapter} 章的大纲**
- 其他章节的大纲必须保持原样
- 章节总数保持 ${params.existingOutline.chapters.length} 章不变

## 上下文（用于保持连贯性）

### 第 ${params.targetChapter - 1} 章（上一章）${previousChapter ? `"${previousChapter.title}": ${previousChapter.summary}` : '（无）'}

### 第 ${params.targetChapter} 章（待修改）
标题：${targetChapterOutline?.title || '无'}
概要：${targetChapterOutline?.summary || '无'}
关键事件：${targetChapterOutline?.key_events?.join(', ') || '无'}
字数目标：${targetChapterOutline?.word_count_target || 2000}

### 第 ${params.targetChapter + 1} 章（下一章）${nextChapter ? `"${nextChapter.title}": ${nextChapter.summary}` : '（无）'}

## 关键人物（不能修改）
${params.existingOutline.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

## 修改规则
1. **绝对不能修改**：人物、章节总数、已建立的背景设定
2. **可以调整**：该章节的情节走向、具体事件、悬念设置
3. 必须保持与上下文的连贯性

## 输出格式 (JSON)
只输出修改后的第 ${params.targetChapter} 章大纲：
{
  "number": ${params.targetChapter},
  "title": "新标题（如果需要）",
  "summary": "新概要（100-150字）",
  "key_events": ["事件1", "事件2"],
  "word_count_target": 2000
}

只输出 JSON，不要有其他内容。`;
  }

  /**
   * 保存大纲版本到数据库
   */
  private async saveOutlineVersion(
    bookId: string,
    roundCreated: number,
    reason?: string
  ): Promise<number> {
    // 获取当前版本号
    const latestVersion = await prisma.bookOutlineVersion.findFirst({
      where: { bookId },
      orderBy: { version: 'desc' },
    });

    const newVersion = (latestVersion?.version ?? 0) + 1;

    // 获取当前 Book 的大纲
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { originalIntent: true, characters: true, chaptersPlan: true },
    });

    // 创建新版本
    await prisma.bookOutlineVersion.create({
      data: {
        bookId,
        version: newVersion,
        roundCreated,
        originalIntent: book?.originalIntent ?? null,
        characters: toJsonValue(book?.characters),
        chaptersPlan: toJsonValue(book?.chaptersPlan),
        reason: reason ?? null,
      },
    });

    console.log(`[Outline] 保存大纲版本 v${newVersion} - 轮次: ${roundCreated}, 原因: ${reason ?? '初始版本'}`);
    return newVersion;
  }

  /**
   * 获取最新大纲版本号
   */
  private async getLatestOutlineVersion(bookId: string): Promise<number> {
    const latestVersion = await prisma.bookOutlineVersion.findFirst({
      where: { bookId },
      orderBy: { version: 'desc' },
    });
    return latestVersion?.version ?? 0;
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
   * 增加上一章详细内容用于保持连贯性
   */
  private buildSingleChapterPrompt(params: {
    bookTitle: string;
    chapterNumber: number;
    previousChapterSummary: string;      // 简略：章节标题列表
    previousChapterContent?: string;     // 新增：上一章正文摘要
    existingChapterOutline?: {           // 新增：当前章节已有的简要大纲
      title: string;
      summary: string;
    };
    feedbacks?: string[];
    isLastChapter: boolean;
  }): string {
    return `请为《${params.bookTitle}》第 ${params.chapterNumber} 章生成详细大纲。

## 前文回顾
${params.previousChapterContent || params.previousChapterSummary}

${params.existingChapterOutline ? `## 当前章节大纲（必须在此基础上优化，不能完全重写）
- 标题：${params.existingChapterOutline.title}
- 概要：${params.existingChapterOutline.summary}

**重要：只能在原大纲基础上进行微调优化，不能改变剧情走向、不能更换人物、不能改变章节主题。**` : ''}

${params.feedbacks && params.feedbacks.length > 0 ? `## 读者反馈（根据反馈调整细节，但不能偏离原大纲）
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
