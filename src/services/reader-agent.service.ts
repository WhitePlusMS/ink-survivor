/**
 * Reader Agent 服务
 *
 * 在阅读窗口期调度 AI 读者阅读书籍并发表评论
 * 优化策略：
 * - 只对排名前 10 的书籍进行 AI 评论
 * - 每个章节随机选择 3-4 个 Agent 进行评论
 * - 根据每个 Agent 的 ReaderConfig 生成个性化提示词
 */

import { prisma } from '@/lib/prisma';
import { buildReaderSystemPrompt, buildReaderActionControl } from '@/lib/secondme/prompts';
import { testModeSendChat } from '@/lib/secondme/client';
import { ReaderConfig } from '@/services/user.service';
import { scoreService } from '@/services/score.service';
import { wsEvents } from '@/lib/websocket/events';
import { parseLLMJsonWithRetry } from '@/lib/utils/llm-parser';

// 评论反馈数据结构
interface ReaderFeedback {
  overall_rating: number;      // 综合评分 (1-10)
  praise: string;              // 赞扬的点
  critique: string;            // 批评的点
  will_continue: boolean;      // 是否继续阅读
  comment: string;             // 评论内容
}

export class ReaderAgentService {
  // 每个章节随机选择的 Agent 数量
  private readonly AGENTS_PER_CHAPTER = 3;
  // 只对排名前 N 的书籍进行 AI 评论
  private readonly TOP_BOOKS_COUNT = 10;

  /**
   * 调度所有启用的 Reader Agents 阅读新发布的章节
   */
  async dispatchReaderAgents(chapterId: string, bookId: string): Promise<void> {
    const startTime = Date.now();
    console.log(`[ReaderAgent] 开始调度 AI 读者 - chapter: ${chapterId}, book: ${bookId}`);

    try {
      // 1. 获取章节内容
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: {
          book: {
            include: {
              author: { select: { id: true, nickname: true } },
              score: true,
            },
          },
        },
      });

      if (!chapter) {
        console.error(`[ReaderAgent] 章节不存在: ${chapterId}`);
        return;
      }

      if (!chapter.content) {
        console.log(`[ReaderAgent] 章节内容为空，跳过评论: ${chapterId}`);
        return;
      }

      // 2. 获取启用的 Reader Agents（启用了评论功能的用户）
      const readerAgents = await this.getEnabledReaderAgents();
      if (readerAgents.length === 0) {
        console.log('[ReaderAgent] 没有启用的 Reader Agents');
        return;
      }

      // 3. 获取书籍当前排名，决定是否进行 AI 评论
      const rank = await this.getBookRank(bookId);
      if (rank === null || rank > this.TOP_BOOKS_COUNT) {
        console.log(`[ReaderAgent] 书籍排名 ${rank}，超过前 ${this.TOP_BOOKS_COUNT} 名，跳过 AI 评论`);
        return;
      }

      // 4. 随机选择 AGENTS_PER_CHAPTER 个 Agent 进行评论
      const selectedAgents = this.selectRandomAgents(readerAgents, this.AGENTS_PER_CHAPTER);
      console.log(`[ReaderAgent] 选择了 ${selectedAgents.length} 个 AI 读者进行评论`);

      // 5. 让每个 Agent 阅读并评论（并发执行）
      const commentPromises = selectedAgents.map((agent) =>
        this.agentReadAndComment({
          agentUserId: agent.userId,
          agentNickname: agent.nickname,
          readerConfig: agent.readerConfig,
          chapterId,
          bookId,
          chapterNumber: chapter.chapterNumber,
          chapterTitle: chapter.title,
          chapterContent: chapter.content,
          bookTitle: chapter.book.title,
          authorName: chapter.book.author.nickname,
          authorId: chapter.book.author.id,
        }).catch((error) => {
          console.error(`[ReaderAgent] Agent ${agent.nickname} 评论失败:`, error);
          return null;
        })
      );

      await Promise.all(commentPromises);

      const duration = Date.now() - startTime;
      console.log(`[ReaderAgent] 调度完成 - 耗时: ${duration}ms`);
    } catch (error) {
      console.error('[ReaderAgent] 调度失败:', error);
    }
  }

  /**
   * 获取所有启用了评论功能的 Reader Agents
   * 返回类型确保 readerConfig 不为 null
   */
  private async getEnabledReaderAgents(): Promise<Array<{
    userId: string;
    nickname: string;
    readerConfig: ReaderConfig;
  }>> {
    // 查询所有用户，然后在代码中过滤 readerConfig 不为 null 的
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nickname: true,
        readerConfig: true,
      },
    });

    // 过滤出启用了评论功能且配置有效的用户
    const validAgents: Array<{
      userId: string;
      nickname: string;
      readerConfig: ReaderConfig;
    }> = [];

    for (const user of users) {
      if (user.readerConfig) {
        // JSONB 自动解析，直接使用类型断言
        const config = user.readerConfig as unknown as ReaderConfig;
        // 只返回启用了评论功能的用户
        if (config?.commentingBehavior?.enabled === true) {
          validAgents.push({
            userId: user.id,
            nickname: user.nickname,
            readerConfig: config,
          });
        }
      }
    }

    return validAgents;
  }

  /**
   * 获取书籍在当前赛季的排名
   * 直接按热度计算，替代依赖 leaderboard 表
   */
  private async getBookRank(bookId: string): Promise<number | null> {
    try {
      // 获取当前赛季
      const season = await prisma.season.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });

      if (!season) {
        console.warn('[ReaderAgent] 没有进行中的赛季');
        return null;
      }

      // 获取该赛季所有书籍按热度排序
      const books = await prisma.book.findMany({
        where: { seasonId: season.id },
        include: {
          score: { select: { heatValue: true } },
        },
        orderBy: { score: { heatValue: 'desc' } },
      });

      // 查找书籍排名
      const rankIndex = books.findIndex((book) => book.id === bookId);
      return rankIndex === -1 ? null : rankIndex + 1;
    } catch (error) {
      console.error('[ReaderAgent] 获取书籍排名失败:', error);
      return null;
    }
  }

  /**
   * 随机选择指定数量的 Agent
   */
  private selectRandomAgents<T>(agents: T[], count: number): T[] {
    const shuffled = [...agents].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, agents.length));
  }

  /**
   * 单个 Agent 阅读并评论章节
   * 注意：AI Agent 评论过的章节会跳过，人类用户可以重复评论
   */
  private async agentReadAndComment(params: {
    agentUserId: string;
    agentNickname: string;
    readerConfig: ReaderConfig;
    chapterId: string;
    bookId: string;
    chapterNumber: number;
    chapterTitle: string;
    chapterContent: string;
    bookTitle: string;
    authorName: string;
    authorId: string;
  }): Promise<void> {
    const { agentUserId, agentNickname, readerConfig, chapterId, bookId, chapterNumber, chapterTitle, chapterContent, bookTitle, authorName } = params;
    if (agentUserId === params.authorId) {
      console.log(`[ReaderAgent] Agent ${agentNickname} 是作者本人，跳过评分`);
      return;
    }

    // 0. 检查 AI Agent 是否已评论过（跳过重复评论）
    const isAiAgent = await this.isAiAgent(agentUserId);
    if (isAiAgent) {
      const existingComment = await prisma.comment.findFirst({
        where: {
          chapterId,
          userId: agentUserId,
          isHuman: false,  // AI 评论
        },
      });
      if (existingComment) {
        console.log(`[ReaderAgent] Agent ${agentNickname} 已评论过第 ${chapterNumber} 章，跳过`);
        return;
      }
    }
    // 人类用户可以重复评论，不做检查

    // 根据配置判断是否发表评论（评论概率）
    if (Math.random() > readerConfig.commentingBehavior.commentProbability) {
      console.log(`[ReaderAgent] Agent ${agentNickname} 随机跳过了评论`);
      return;
    }

    console.log(`[ReaderAgent] Agent ${agentNickname} 正在阅读《${bookTitle}》第 ${chapterNumber} 章...`);

    // 1. 构建个性化 System Prompt
    const systemPrompt = buildReaderSystemPrompt({
      readerName: agentNickname,
      preferences: {
        genres: readerConfig.readingPreferences.preferredGenres,
        style: undefined, // 可扩展
        minRating: readerConfig.readingPreferences.minRatingThreshold,
      },
    });

    // 2. 构建消息：包含章节内容和 Action Control
    const actionControl = buildReaderActionControl();
    const message = `你正在阅读《${bookTitle}》第 ${chapterNumber} 章 "${chapterTitle}"，作者：${authorName}。

## 章节内容
${chapterContent.slice(0, 4000)} ${chapterContent.length > 4000 ? '...(内容截断)' : ''}

${actionControl}`;

    // 3. 调用 LLM 生成评论（带重试机制）
    const feedback = await parseLLMJsonWithRetry<ReaderFeedback>(
      () => testModeSendChat(message, systemPrompt),
      {
        taskId: `ReaderAgent-${agentNickname}-${bookTitle}-ch${chapterNumber}`,
        maxRetries: 3,
      }
    );

    // 5. 根据情感阈值判断是否触发评论
    const sentimentScore = this.calculateSentiment(feedback);
    if (sentimentScore < readerConfig.commentingBehavior.sentimentThreshold) {
      console.log(`[ReaderAgent] Agent ${agentNickname} 情感分数 ${sentimentScore} 低于阈值，跳过评论`);
      return;
    }

    // 6. 构建评论内容
    const commentContent = this.buildCommentContent(feedback);

    // 7. 保存评论到数据库
    const comment = await prisma.comment.create({
      data: {
        bookId,
        chapterId,
        userId: agentUserId,
        content: commentContent,
        isHuman: false,
        aiRole: 'Reader',
        sentiment: sentimentScore,
      },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    console.log(`[ReaderAgent] Agent ${agentNickname} 评论完成 - 评分: ${feedback.overall_rating}/10`);

    // 8. 更新章节评论数
    await prisma.chapter.update({
      where: { id: chapterId },
      data: { commentCount: { increment: 1 } },
    });

    // 9. 发送 WebSocket 事件
    wsEvents.newComment(bookId, {
      id: comment.id,
      content: comment.content,
      isHuman: false,
      user: {
        nickname: agentNickname,
      },
      createdAt: comment.createdAt.toISOString(),
    });

    // 10. 重新计算书籍热度（评分会影响情感分和最终得分）
    try {
      const scoreResult = await scoreService.calculateFullScore(bookId);
      console.log(`[ReaderAgent] 热度已更新 - book: ${bookId}, heatValue: ${scoreResult.heatValue}, avgRating: ${feedback.overall_rating}/10`);
      wsEvents.heatUpdate(bookId, scoreResult.heatValue);
    } catch (error) {
      console.error(`[ReaderAgent] 热度计算失败:`, error);
    }
  }

  /**
   * 根据 LLM 反馈计算情感分数 (-1 ~ 1)
   */
  private calculateSentiment(feedback: ReaderFeedback): number {
    // 基于评分计算：1-10 分映射到 -1 ~ 1
    // 1分 -> -1, 5分 -> 0, 10分 -> 1
    return (feedback.overall_rating - 5) / 5;
  }

  /**
   * 判断用户是否是 AI Agent
   * 有 agentConfig 的是 AI Agent
   */
  private async isAiAgent(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { agentConfig: true },
    });
    return !!user?.agentConfig;
  }

  /**
   * 构建评论内容
   */
  private buildCommentContent(feedback: ReaderFeedback): string {
    const parts: string[] = [];

    // 添加评论内容
    if (feedback.comment) {
      parts.push(feedback.comment);
    }

    // 添加赞扬
    if (feedback.praise) {
      parts.push(`👍 ${feedback.praise}`);
    }

    // 添加批评
    if (feedback.critique) {
      parts.push(`💡 ${feedback.critique}`);
    }

    return parts.join('\n') || '这本书还不错，继续加油！';
  }
}

export const readerAgentService = new ReaderAgentService();
