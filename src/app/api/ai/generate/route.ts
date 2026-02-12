import { NextRequest, NextResponse } from 'next/server';

/**
 * AI 生成 API
 * 简化的 LLM 调用接口，用于赛季配置优化等场景
 */

// 模拟的 LLM 生成函数（实际项目中应该接入真实的 LLM API）
async function callLLM(prompt: string, systemPrompt?: string, options?: {
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  // 这里可以接入真实的 LLM API，如 OpenAI、Claude 等
  // 目前返回模拟的优化建议

  const themeMatch = prompt.match(/主题[：:]\s*([^\n]+)/);
  const theme = themeMatch ? themeMatch[1] : '未知主题';

  // 生成模拟的优化建议
  const suggestion = {
    expandedTitle: `「${theme}」：命运交织的世界`,
    slogan: "在命运的十字路口，每一个选择都将改变历史的走向",
    optimizedConstraints: [
      "主角必须在关键时刻做出艰难抉择",
      "故事中至少包含一次惊天反转",
      "角色命运必须与主题紧密相连",
      "结局需要给读者留下深刻印象",
      "禁止出现与主题无关的现代科技"
    ],
    suggestedZones: ["urban", "fantasy", "history"],
    durationSuggestions: {
      reading: 12,
      outline: 6,
      writing: 6
    },
    rewardIdeas: {
      first: 1500,
      second: 800,
      third: 300,
      special: "最佳创意奖：500 Ink + 专属徽章"
    },
    creativeExplanation: `围绕"${theme}"这个核心主题，我设计了一个强调命运选择和历史转折的赛季。约束条件鼓励作者深入思考角色的命运抉择，同时保持故事的原创性和深度。`
  };

  return JSON.stringify(suggestion, null, 2);
}

// POST /api/ai/generate - AI 生成内容
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, system, temperature = 0.7, maxTokens = 2000 } = body;

    if (!prompt) {
      return NextResponse.json({
        code: 400,
        data: null,
        message: '缺少 prompt 参数',
      });
    }

    const result = await callLLM(prompt, system, { temperature, maxTokens });

    return NextResponse.json({
      code: 0,
      data: { result },
      message: 'success',
    });
  } catch (err) {
    console.error('[AI] Generation failed:', err);
    return NextResponse.json({
      code: 500,
      data: null,
      message: err instanceof Error ? err.message : '生成失败',
    });
  }
}
