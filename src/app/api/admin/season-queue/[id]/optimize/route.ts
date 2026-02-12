import { NextRequest, NextResponse } from 'next/server';
import { seasonQueueService } from '@/services/season-queue.service';

// POST /api/admin/season-queue/[id]/optimize - LLM 优化赛季配置
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { prompt } = body;

    // 获取当前赛季配置
    const item = await seasonQueueService.findById(id);
    if (!item) {
      return NextResponse.json({
        code: 404,
        data: null,
        message: '赛季队列不存在',
      });
    }

    // 构建 LLM 提示词
    const systemPrompt = `你是一个专业的创意写作比赛策划师。你需要根据给定的赛季主题，生成富有创意且吸引人的赛季配置建议。

请分析以下赛季配置，并提供优化建议：

**当前配置：**
- 赛季编号：S${item.seasonNumber}
- 主题关键词：${item.themeKeyword}
- 硬性约束：${item.constraints.join('；') || '无'}
- 可选分区：${item.zoneStyles.join('、')}
- 最大章节数：${item.maxChapters}
- 各阶段时长：阅读${item.duration.reading}分钟，大纲${item.duration.outline}分钟，创作${item.duration.writing}分钟

请提供以下优化建议：
1. **主题扩展**：为主题设计一个吸引人的副标题和一句slogan
2. **约束优化**：根据主题特点，提供3-5个更有针对性的硬性约束
3. **分区建议**：根据主题特点，建议合适的分区（可新增）
4. **时长调整建议**：根据主题复杂度，建议各阶段时长
5. **奖励创意**：设计更有吸引力的奖励方案

请用JSON格式返回，格式如下：
{
  "expandedTitle": "扩展标题",
  "slogan": "一句话slogan",
  "optimizedConstraints": ["约束1", "约束2", "约束3", "约束4", "约束5"],
  "suggestedZones": ["zone1", "zone2"],
  "durationSuggestions": {
    "reading": 建议阅读时长,
    "outline": 建议大纲时长,
    "writing": 建议创作时长
  },
  "rewardIdeas": {
    "first": 一等奖赏金,
    "second": 二等奖赏金,
    "third": 三等奖赏金,
    "special": "特殊奖项说明"
  },
  "creativeExplanation": "设计思路说明"
}`;

    // 调用 LLM API（这里使用示例调用，实际需要接入真实的 LLM 服务）
    const llmResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `${prompt || '请分析并优化这个赛季配置，提供具体的改进建议。'}\n\n主题：${item.themeKeyword}`,
        system: systemPrompt,
        temperature: 0.7,
        maxTokens: 2000,
      }),
    });

    if (!llmResponse.ok) {
      throw new Error('LLM API 调用失败');
    }

    const llmResult = await llmResponse.json();

    // 保存 LLM 建议
    await seasonQueueService.update(id, {
      llmSuggestion: typeof llmResult === 'string' ? llmResult : JSON.stringify(llmResult),
      llmOptimized: false,
    });

    console.log(`[SeasonQueue] Generated LLM suggestion for S${item.seasonNumber}`);

    return NextResponse.json({
      code: 0,
      data: {
        suggestion: llmResult,
      },
      message: '优化建议已生成',
    });
  } catch (err) {
    console.error('[SeasonQueue] LLM optimization failed:', err);
    return NextResponse.json({
      code: 500,
      data: null,
      message: err instanceof Error ? err.message : '优化失败',
    });
  }
}
