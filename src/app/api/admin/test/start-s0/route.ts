/**
 * 测试功能：开始 S0 赛季（发送邀请给 Agent）
 * POST /api/admin/test/start-s0
 *
 * PRD 参赛流程：
 * 1. 系统向所有 Agent 发送完整的赛季邀请消息
 * 2. Agent 根据性格配置自主决策是否参赛
 * 3. Agent 调用 LLM 生成参赛回复「参赛 《书名》 简介 分区」
 * 4. 系统解析回复，创建书籍
 *
 * 注意：所有 LLM 调用必须走真实 SecondMe API，不允许降级到模拟数据
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { testModeSendChat, getCurrentUserToken } from '@/lib/secondme/client';
import { parseLLMJsonWithRetry } from '@/lib/utils/llm-parser';
import { normalizeZoneStyle } from '@/lib/utils/zone';
import { readerAgentService } from '@/services/reader-agent.service';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/utils/admin';

// Agent 配置接口
interface AgentConfig {
  personality: string;
  writingStyle: string;
  preferZone: string;
  adaptability: number;
  riskTolerance: 'low' | 'medium' | 'high';
  description: string;
}

/**
 * 赛季信息接口
 */
interface SeasonInfo {
  seasonNumber: number;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  rewards: Record<string, unknown>;
  minChapters: number;
  maxChapters: number;
}

/**
 * 调用 SecondMe API 获取 Agent 参赛决策
 * 使用指数退避重试机制，解析失败时最多重试 3 次
 */
async function callSecondMeForDecision(
  config: AgentConfig,
  seasonInfo: SeasonInfo
): Promise<{
  decision: string;
  bookTitle?: string;
  shortDescription?: string;
  zoneStyle?: string;
  reason: string;
}> {
  // 获取用户 Token
  const token = await getCurrentUserToken();
  if (!token) {
    throw new Error('无法获取用户 Token，请确保已登录');
  }

  // 构建消息 - 要求返回纯 JSON 格式
  const userMessage = `
## 赛季信息
- 主题：${seasonInfo.themeKeyword}
- 可选分区：${seasonInfo.zoneStyles.join('、')}
- 章节要求：${seasonInfo.minChapters} - ${seasonInfo.maxChapters} 章
- 硬性限制：${seasonInfo.constraints.join('；')}

## 奖励机制
${JSON.stringify(seasonInfo.rewards || {})}

请根据你的性格特征，决定是否参赛。

重要：直接输出 JSON，不要用 \`\`\`json 包裹，不要有任何其他文字！
JSON 格式：
{
  "decision": "join" 或 "skip",
  "bookTitle": "《书名》"（仅 decision=join 时）,
  "shortDescription": "一句话简介"（仅 decision=join 时）,
  "zoneStyle": "urban" 或 "fantasy" 或 "scifi"（仅 decision=join 时）,
  "reason": "决策理由"
}`;

  const systemPrompt = `你是一名作家，具有以下性格特征：
- 性格：${config.personality}
- 写作风格：${config.writingStyle}
- 偏好分区：${config.preferZone}
- 听劝指数：${config.adaptability}
- 风险偏好：${config.riskTolerance}

重要：直接输出 JSON 对象，不要用任何符号包裹，不要有解释性文字！`;

  // 使用带重试的 JSON 解析
  const parsed = await parseLLMJsonWithRetry<{
    decision: string;
    bookTitle?: string;
    shortDescription?: string;
    zoneStyle?: string;
    reason: string;
  }>(
    () => testModeSendChat(userMessage, systemPrompt, 'inksurvivor-season', token),
    {
      taskId: `AgentDecision-${config.description}`,
      maxRetries: 3,
    }
  );

  if (parsed.decision === 'join' && parsed.bookTitle && parsed.zoneStyle) {
    return {
      decision: 'join',
      bookTitle: parsed.bookTitle,
      shortDescription: parsed.shortDescription || '',
      zoneStyle: parsed.zoneStyle,
      reason: parsed.reason || '根据性格特征做出的决策',
    };
  }

  if (parsed.decision === 'skip') {
    return {
      decision: 'skip',
      reason: parsed.reason || '选择不参赛',
    };
  }

  throw new Error(`无法识别的决策: ${parsed.decision}`);
}

/**
 * 调用 SecondMe API 生成第一章
 * 使用指数退避重试机制，解析失败时最多重试 3 次
 */
async function callSecondMeForChapter(
  config: AgentConfig,
  bookTitle: string,
  seasonInfo: SeasonInfo
): Promise<{ title: string; content: string }> {
  // 获取用户 Token
  const token = await getCurrentUserToken();
  if (!token) {
    throw new Error('无法获取用户 Token，请确保已登录');
  }

  const systemPrompt = `你是一名作家，具有以下性格特征：
- 性格：${config.personality}
- 写作风格：${config.writingStyle}
- 偏好分区：${config.preferZone}
- 听劝指数：${config.adaptability}
- 风险偏好：${config.riskTolerance}`;

  const userMessage = `
请为一本名为《${bookTitle}》的小说创作第一章。

赛季主题：${seasonInfo.themeKeyword}
硬性限制：${seasonInfo.constraints.join('；')}

要求：
1. 根据你的性格特征选择合适的写作风格
2. 第一章标题：简洁有力，不超过10个字
3. 第一章内容：开头要有吸引力，300-500字，展现你的写作风格特点
4. content 中可以使用换行符 \\n 分段

重要：直接输出 JSON，不要用 \`\`\`json 包裹，不要有任何其他文字！
JSON 格式：
{
  "title": "第一章标题",
  "content": "第一章正文内容"
}`;

  // 使用带重试的 JSON 解析
  const parsed = await parseLLMJsonWithRetry<{
    title: string;
    content: string;
  }>(
    () => testModeSendChat(userMessage, systemPrompt, 'inksurvivor-chapter', token),
    {
      taskId: `ChapterGen-${config.description}-${bookTitle}`,
      maxRetries: 3,
    }
  );

  return {
    title: parsed.title || '命运的交汇',
    content: parsed.content || '',
  };
}

export async function POST() {
  try {
    // 1. 验证管理员权限
    const authResult = await requireAdmin();
    if (!authResult.success) {
      const response = authResult.message.includes('登录')
        ? createUnauthorizedResponse('请先登录管理员账号')
        : createForbiddenResponse();
      return NextResponse.json(response, { status: authResult.message.includes('登录') ? 401 : 403 });
    }

    console.log('[TestStartS0] 开始 S0 测试赛季...');

    // 1. 获取 S0 赛季
    const season = await prisma.season.findFirst({
      where: { seasonNumber: 0 },
    });

    if (!season) {
      return NextResponse.json({
        code: 400,
        data: null,
        message: '请先点击"初始化 S0 赛季"按钮',
      });
    }

    // 2. 重置倒计时为 10 小时
    const now = new Date();
    const signupDeadline = new Date(now.getTime() + 10 * 60 * 1000);
    const endTime = new Date(now.getTime() + 10 * 60 * 60 * 1000);

    await prisma.season.update({
      where: { id: season.id },
      data: {
        startTime: now,
        endTime: endTime,
        signupDeadline: signupDeadline,
        status: 'ACTIVE',
        participantCount: 0,
      },
    });

    console.log('[TestStartS0] S0 赛季已重置，10 小时倒计时开始');

    // 3. 获取所有 Agent
    const agents = await prisma.user.findMany({
      where: {
        agentConfig: { not: null },
      },
    });

    if (agents.length === 0) {
      return NextResponse.json({
        code: 400,
        data: null,
        message: '没有找到 Agent，请先点击"初始化 S0 赛季"',
      });
    }

    // 赛季信息
    const seasonInfo: SeasonInfo = {
      seasonNumber: season.seasonNumber,
      themeKeyword: season.themeKeyword,
      constraints: JSON.parse(season.constraints || '[]'),
      zoneStyles: JSON.parse(season.zoneStyles || '[]'),
      rewards: JSON.parse(season.rewards || '{}'),
      minChapters: season.minChapters || 3,
      maxChapters: season.maxChapters || 7,
    };

    // 4. 并发获取所有 Agent 的参赛决策
    console.log(`[TestStartS0] 向 ${agents.length} 个 Agent 并发发送赛季邀请...`);

    // 第一阶段：并发获取决策
    const decisionPromises = agents.map(async (agent) => {
      const config: AgentConfig = JSON.parse(agent.agentConfig || '{}');
      try {
        const llmResponse = await callSecondMeForDecision(config, seasonInfo);
        return {
          agent,
          config,
          success: true,
          decision: llmResponse.decision,
          bookTitle: llmResponse.bookTitle,
          shortDescription: llmResponse.shortDescription,
          zoneStyle: llmResponse.zoneStyle,
          reason: llmResponse.reason,
        };
      } catch (error) {
        console.error(`[TestStartS0] Agent ${agent.nickname} 决策失败:`, error);
        return {
          agent,
          config,
          success: false,
          decision: 'skip',
          reason: `决策失败: ${(error as Error).message}`,
        };
      }
    });

    const decisions = await Promise.allSettled(decisionPromises);

    // 解析决策结果
    const joinResults: Array<{
      agent: typeof agents[0];
      config: AgentConfig;
      bookTitle: string;
      shortDescription: string;
      zoneStyle: string;
      reason: string;
    }> = [];
    const skipResults: Array<{ agent: string; action: string; reason: string; success: boolean }> = [];
    const usedTitles = new Set<string>();

    for (let i = 0; i < decisions.length; i++) {
      const result = decisions[i];
      const agent = agents[i];

      if (result.status === 'fulfilled' && result.value.success && result.value.decision === 'join') {
        const { bookTitle, zoneStyle, reason } = result.value;

        if (bookTitle && zoneStyle) {
          // 清理书名格式并确保唯一
          const cleanTitle = bookTitle.replace(/《|》/g, '');
          let finalTitle = cleanTitle;
          let counter = 1;
          while (usedTitles.has(finalTitle)) {
            finalTitle = `${cleanTitle}_${counter++}`;
          }
          usedTitles.add(finalTitle);

          joinResults.push({
            agent,
            config: result.value.config,
            bookTitle: finalTitle,
            shortDescription: result.value.shortDescription || '',
            zoneStyle,
            reason,
          });

          console.log(`[TestStartS0]   → ${agent.nickname} 参赛：《${finalTitle}》`);
          continue;
        }
      }

      // 弃权或失败的
      const reason = result.status === 'fulfilled'
        ? result.value.reason
        : `异常: ${result.reason}`;
      skipResults.push({
        agent: agent.nickname,
        action: '弃权',
        reason,
        success: false,
      });
      console.log(`[TestStartS0]   → ${agent.nickname} 弃权：${reason}`);
    }

    // 5. 并发创建书籍（决策通过的）
    console.log(`[TestStartS0] 并发创建 ${joinResults.length} 本书籍...`);

    // 定义创建书籍的结果类型
    interface BookResultSuccess {
      agent: typeof agents[0];
      book: { id: string };
      config: AgentConfig;
      bookTitle: string;
      zoneCn: string;
      reason: string;
      success: true;
    }
    interface BookResultFail {
      agent: typeof agents[0];
      bookTitle: string;
      reason: unknown;
      success: false;
    }
    type BookResult = BookResultSuccess | BookResultFail;

    const bookPromises: Promise<BookResult>[] = joinResults.map(async (joinResult) => {
      const { agent, config, bookTitle, shortDescription, zoneStyle, reason } = joinResult;
      const zoneCn = normalizeZoneStyle(zoneStyle);

      try {
        // 创建书籍
        const book = await prisma.book.create({
          data: {
            title: bookTitle,
            shortDesc: shortDescription || '暂无简介',
            zoneStyle: zoneCn,
            authorId: agent.id,
            seasonId: season.id,
            status: 'ACTIVE',
            inkBalance: 50,
            heat: 0,
          },
        });

        // 创建评分记录
        await prisma.bookScore.create({
          data: {
            bookId: book.id,
            finalScore: 0,
            avgRating: 0,
            viewCount: 0,
            favoriteCount: 0,
            likeCount: 0,
            coinCount: 0,
            completionRate: 0,
          },
        });

        return { agent, book, config, bookTitle, zoneCn, reason, success: true as const };
      } catch (error) {
        console.error(`[TestStartS0]   创建书籍《${bookTitle}》失败:`, error);
        return { agent, bookTitle, reason: error, success: false as const };
      }
    });

    const books = await Promise.allSettled(bookPromises);

    // 6. 并发生成第一章
    const chapterPromises: Promise<{
      agent: string;
      bookTitle: string;
      zoneStyle?: string;
      reason: string;
      success: boolean;
      action?: string;
    }>[] = [];

    for (const bookResult of books) {
      if (bookResult.status === 'fulfilled' && bookResult.value.success) {
        const { agent, book, config, bookTitle, zoneCn, reason } = bookResult.value as BookResultSuccess;

        chapterPromises.push(
          (async () => {
            try {
              console.log(`[TestStartS0]   并发生成《${bookTitle}》第一章...`);
              const chapter = await callSecondMeForChapter(config, bookTitle, seasonInfo);

              await prisma.chapter.create({
                data: {
                  bookId: book.id,
                  chapterNumber: 1,
                  title: chapter.title,
                  content: chapter.content,
                  status: 'PUBLISHED',
                  publishedAt: new Date(),
                  contentLength: chapter.content.length,
                },
              });

              // 触发 Reader Agent 调度（异步，不阻塞响应）
              setTimeout(async () => {
                try {
                  // 获取刚创建的章节 ID
                  const newChapter = await prisma.chapter.findFirst({
                    where: { bookId: book.id, chapterNumber: 1 },
                    select: { id: true },
                  });
                  if (newChapter) {
                    await readerAgentService.dispatchReaderAgents(newChapter.id, book.id);
                  }
                } catch (error) {
                  console.error(`[ReaderAgent] 章节1调度失败:`, error);
                }
              }, 100);

              // 更新书籍热度
              await prisma.book.update({
                where: { id: book.id },
                data: { heat: 100, chapterCount: 1 },
              });

              return {
                agent: agent.nickname,
                action: '参赛',
                bookTitle,
                zoneStyle: zoneCn,
                reason,
                success: true,
              };
            } catch (error) {
              console.error(`[TestStartS0]   生成第一章《${bookTitle}》失败:`, error);
              return {
                agent: agent.nickname,
                bookTitle,
                reason: `生成失败: ${(error as Error).message}`,
                success: false,
              };
            }
          })()
        );
      }
    }

    const chapterResults = await Promise.all(chapterPromises);

    // 7. 统计结果
    const results: Array<{
      agent?: string;
      action?: string;
      bookTitle?: string;
      zoneStyle?: string;
      reason?: string;
      success: boolean;
    }> = [];
    let joinCount = 0;
    let skipCount = skipResults.length;

    for (const result of chapterResults) {
      if (result.success) {
        joinCount++;
        results.push(result);
      } else {
        skipCount++;
        results.push({
          agent: result.agent,
          action: '弃权',
          reason: result.reason,
          success: false,
        });
      }
    }

    // 添加弃权的结果
    results.push(...skipResults);

    // 8. 更新赛季参与人数
    const participantCount = await prisma.book.count({
      where: { seasonId: season.id },
    });

    await prisma.season.update({
      where: { id: season.id },
      data: { participantCount },
    });

    console.log(`[TestStartS0] 赛季开始完成！参赛: ${joinCount}, 弃权: ${skipCount}`);

    return NextResponse.json({
      code: 0,
      data: {
        seasonId: season.id,
        seasonNumber: season.seasonNumber,
        themeKeyword: season.themeKeyword,
        totalAgents: agents.length,
        joinCount,
        skipCount,
        participantCount,
        results,
      },
      message: `S0 赛季开始！${joinCount} 个 Agent 参赛，${skipCount} 个弃权`,
    });
  } catch (error) {
    console.error('[TestStartS0] 错误:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '开始赛季失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
