// 大纲模块 Service
import { prisma } from '@/lib/prisma';
import { SecondMeClient } from '@/lib/secondme/client';
import { buildOutlinePrompt } from '@/lib/secondme/prompts';
import { parseLLMJsonWithRetry } from '@/lib/utils/llm-parser';
import { OutlineData, ChapterPlan, GenerateOutlineParams } from '@/types/outline';

export class OutlineService {
  /**
   * 生成大纲
   */
  async generateOutline(bookId: string, userId: string, params?: GenerateOutlineParams): Promise<OutlineData> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { season: true },
    });

    if (!book) {
      throw new Error('Book not found');
    }

    const secondMe = new SecondMeClient(userId);

    // 获取用户信息作为作家角色
    let userName = '作家';
    try {
      const userInfo = await secondMe.getUserInfo();
      userName = userInfo.name || '作家';
    } catch (error) {
      console.warn('[OutlineService] Failed to get user info, using default name');
    }

    // 构建 Prompt
    const prompt = buildOutlinePrompt({
      seasonTheme: book.season?.themeKeyword || '自由创作',
      constraints: book.season ? JSON.parse(book.season.constraints || '[]') : [],
      zoneStyle: book.zoneStyle,
      forcedChapter: params?.forcedChapter,
      forcedEvent: params?.forcedEvent,
      endingType: params?.endingType,
    });

    // 设置作家角色
    const systemPrompt = `你是${userName}，一个热爱创作的故事作家。请根据以下要求生成一个完整的故事大纲。`;

    console.log(`[OutlineService] Generating outline for book: ${bookId}`);

    // 流式生成大纲
    let outlineContent = '';
    for await (const chunk of secondMe.streamChat({
      message: prompt,
      systemPrompt,
    })) {
      outlineContent += chunk;
    }

    // 解析 JSON（使用统一的解析器，带重试机制）
    let outlineData: OutlineData;
    try {
      outlineData = await parseLLMJsonWithRetry<OutlineData>(
        async () => outlineContent,
        {
          taskId: `Outline-${bookId}`,
          maxRetries: 2,
        }
      );
    } catch (parseError) {
      console.error('[OutlineService] Failed to parse outline JSON:', parseError);
      throw new Error('Failed to parse generated outline');
    }

    // 保存大纲
    await this.saveOutline(bookId, outlineData);

    console.log(`[OutlineService] Outline generated for book: ${bookId}`);
    return outlineData;
  }

  /**
   * 保存大纲到数据库
   */
  async saveOutline(bookId: string, outline: OutlineData) {
    // 更新或创建 Outline
    await prisma.outline.upsert({
      where: { bookId },
      create: {
        bookId,
        originalIntent: outline.summary,
        characters: JSON.stringify(outline.characters),
        chaptersPlan: JSON.stringify(outline.chapters),
      },
      update: {
        originalIntent: outline.summary,
        characters: JSON.stringify(outline.characters),
        chaptersPlan: JSON.stringify(outline.chapters),
      },
    });

    // 更新书籍状态和计划章节数
    await prisma.book.update({
      where: { id: bookId },
      data: {
        longDesc: outline.summary,
        plannedChapters: outline.chapters.length,
      },
    });

    console.log(`[OutlineService] Outline saved for book: ${bookId}`);
  }

  /**
   * 获取大纲
   */
  async getOutline(bookId: string) {
    return prisma.outline.findUnique({
      where: { bookId },
    });
  }

  /**
   * 获取解析后的大纲数据
   */
  async getParsedOutline(bookId: string): Promise<OutlineData | null> {
    const outline = await this.getOutline(bookId);
    if (!outline) return null;

    return {
      title: '',
      summary: outline.originalIntent,
      characters: JSON.parse(outline.characters || '[]'),
      chapters: JSON.parse(outline.chaptersPlan || '[]'),
      themes: [],
      tone: '',
    };
  }

  /**
   * 更新大纲章节
   */
  async updateChapterPlan(
    bookId: string,
    chapterNumber: number,
    plan: Partial<ChapterPlan>
  ) {
    const outline = await prisma.outline.findUnique({ where: { bookId } });
    if (!outline) throw new Error('Outline not found');

    const chapters = JSON.parse(outline.chaptersPlan) as ChapterPlan[];
    const index = chapters.findIndex((c) => c.number === chapterNumber);
    if (index === -1) throw new Error('Chapter not found');

    chapters[index] = { ...chapters[index], ...plan };

    // 记录修改日志
    const mods = JSON.parse(outline.modificationLog || '[]');
    mods.push({
      chapterNumber,
      updatedAt: new Date().toISOString(),
      changes: plan,
    });

    return prisma.outline.update({
      where: { bookId },
      data: {
        chaptersPlan: JSON.stringify(chapters),
        modificationLog: JSON.stringify(mods),
      },
    });
  }

  /**
   * 添加修改日志
   */
  async addModificationLog(
    bookId: string,
    chapterNumber: number,
    changes: Partial<ChapterPlan>
  ) {
    const outline = await prisma.outline.findUnique({ where: { bookId } });
    if (!outline) return;

    const mods = JSON.parse(outline.modificationLog || '[]');
    mods.push({
      chapterNumber,
      updatedAt: new Date().toISOString(),
      changes,
    });

    await prisma.outline.update({
      where: { bookId },
      data: {
        modificationLog: JSON.stringify(mods),
      },
    });
  }
}

export const outlineService = new OutlineService();
