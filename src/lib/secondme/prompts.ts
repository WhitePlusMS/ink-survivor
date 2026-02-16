/**
 * SecondMe Agent Prompt 模板
 *
 * 用于构建不同场景的 System Prompt
 */

// 确保 constraints 是数组
function normalizeConstraints(constraints: unknown): string[] {
  if (Array.isArray(constraints)) {
    return constraints.filter((c): c is string => typeof c === 'string');
  }
  if (typeof constraints === 'string') {
    return [constraints];
  }
  return [];
}

/**
 * 构建作家角色 System Prompt
 * PRD 11.1：System Prompt 应包含性格特征 + 赛季约束
 */
export function buildAuthorSystemPrompt(params: {
  userName: string;
  writingStyle?: string;
  seasonTheme: string;
  constraints: string[];
  zoneStyle: string;
}): string {
  const normalizedConstraints = normalizeConstraints(params.constraints);
  return `你是${params.userName}，一个热爱创作的故事作家。

## 你的写作风格
${params.writingStyle || '风格多变，能驾驭多种题材'}

## 当前创作任务
你正在参加 InkSurvivor 赛季创作比赛：

**赛季主题**: ${params.seasonTheme}
**硬性限制**:
${normalizedConstraints.map(c => `- ${c}`).join('\n') || '无'}
**分区风格**: ${params.zoneStyle}

## 任务要求
请严格遵守以上限制进行创作。`;
}

/**
 * 构建大纲生成 Prompt
 */
export function buildOutlinePrompt(params: {
  seasonTheme: string;
  constraints: string[];
  zoneStyle: string;
  chapterCount?: number;  // 动态章节数，默认5
  forcedChapter?: number;
  forcedEvent?: string;
  endingType?: string;
}): string {
  const chapterCount = params.chapterCount || 5;
  const normalizedConstraints = normalizeConstraints(params.constraints);
  return `请为这个故事生成一个 ${chapterCount} 章的详细大纲。

## 硬性约束
${normalizedConstraints.map(c => `- ${c}`).join('\n') || '无'}

## 分区风格
${params.zoneStyle}

## 输出要求
严格按照以下 JSON 格式输出：

\`\`\`json
{
  "title": "故事标题（不能包含冒号）",
  "summary": "一句话简介（50字以内，不能包含冒号）",
  "characters": [
    {
      "name": "角色姓名",
      "role": "protagonist/antagonist/supporting",
      "description": "角色描述（不能包含冒号）",
      "motivation": "核心动机"
    }
  ],
  "chapters": [
    {
      "number": 1,
      "title": "章节标题（不能包含冒号）",
      "summary": "章节概要（不能包含冒号）",
      "key_events": ["事件1", "事件2"],
      "word_count_target": 2000
    }
    ${chapterCount > 1 ? `,
    {
      "number": 2,
      "title": "章节标题（不能包含冒号）",
      "summary": "章节概要（不能包含冒号）",
      "key_events": ["事件1", "事件2"],
      "word_count_target": 2000
    }` : ''}
    ${chapterCount > 2 ? `,
    {
      "number": 3,
      "title": "章节标题（不能包含冒号）",
      "summary": "章节概要（不能包含冒号）",
      "key_events": ["事件1", "事件2"],
      "word_count_target": 2000
    }` : ''}
    ${chapterCount > 3 ? `,
    {
      "number": 4,
      "title": "章节标题（不能包含冒号）",
      "summary": "章节概要（不能包含冒号）",
      "key_events": ["事件1", "事件2"],
      "word_count_target": 2000
    }` : ''}
    ${chapterCount > 4 ? `,
    {
      "number": 5,
      "title": "章节标题（不能包含冒号）",
      "summary": "章节概要（不能包含冒号）",
      "key_events": ["事件1", "事件2"],
      "word_count_target": 2000
    }` : ''}
    ${chapterCount > 5 ? `,
    {
      "number": 6,
      "title": "章节标题（不能包含冒号）",
      "summary": "章节概要（不能包含冒号）",
      "key_events": ["事件1", "事件2"],
      "word_count_target": 2000
    }` : ''}
    ${chapterCount > 6 ? `,
    {
      "number": 7,
      "title": "章节标题（不能包含冒号）",
      "summary": "章节概要（不能包含冒号）",
      "key_events": ["事件1", "事件2"],
      "word_count_target": 2000
    }` : ''}
  ],
  "themes": ["主题1", "主题2"],
  "tone": "叙事风格描述"
}
\`\`\`

请确保：
1. 生成完整的 ${chapterCount} 章大纲，章节编号从 1 到 ${chapterCount}
2. 每个字符串字段都不能包含冒号（:）
3. 不要在字符串中嵌套引号或冒号
4. 严格遵守以上 JSON 格式，key 和 value 一一对应
5. 故事有清晰的起承转合
${params.forcedChapter ? `6. 第${params.forcedChapter}章必须包含：${params.forcedEvent}` : ''}
7. 结局类型：${params.endingType || '开放结局'}

只输出 JSON 代码块，不要有任何其他内容。`;
}

/**
 * 构建章节创作 Prompt
 */
export function buildChapterPrompt(params: {
  bookTitle: string;
  chapterNumber: number;
  outline: {
    summary: string;
    key_events: string[];
    word_count_target: number;
  };
  previousSummary: string;
  feedbacks?: string[];
}): string {
  return `请撰写《${params.bookTitle}》第 ${params.chapterNumber} 章。

## 本章大纲
${params.outline.summary}

## 前文回顾
${params.previousSummary}

${params.feedbacks?.length ? `## 读者反馈（已采纳）
${params.feedbacks.join('\n')}` : ''}

## 要求
- 目标字数：${params.outline.word_count_target}字
- 保持与前文风格一致
- 推进剧情发展
- 对话自然，符合角色性格

## 输出格式 (JSON)
严格按照以下 JSON 格式输出：

\`\`\`json
{
  "title": "章节标题（不能包含冒号）",
  "content": "章节正文内容..."
}
\`\`\`

请确保：
1. 标题简洁明了，能概括本章核心内容（不能包含冒号）
2. 正文直接开始，不需要章节标题
3. 字数达到 ${params.outline.word_count_target} 字左右
4. 严格遵守 JSON 格式，key 和 value 一一对应

只输出 JSON 代码块，不要有任何其他内容。`;
}

/**
 * 构建 Reader Agent Prompt
 */
export function buildReaderSystemPrompt(params: {
  readerName: string;
  personality?: string;  // 性格描述
  preferences: {
    genres: string[];
    style?: string;
    minRating: number;
  };
}): string {
  const personalitySection = params.personality
    ? `## 你的性格特点
${params.personality}

`
    : '';

  return `你是${params.readerName}，一位热爱阅读的读者。
${personalitySection}## 你的阅读偏好
- 喜欢的题材：${params.preferences.genres.join('、')}
- 评价风格：${params.preferences.style || '客观中肯'}
- 最低评分阈值：${params.preferences.minRating}/10

## 任务
你正在阅读一本网络小说，请根据阅读内容给出评价。

## 评价维度（满分10分）
- 剧情节奏 (1-10)
- 角色塑造 (1-10)
- 文笔风格 (1-10)
- 创新程度 (1-10)

## 输出格式
{
  "overall_rating": 综合评分,
  "praise": "赞扬的点（正面反馈）",
  "critique": "批评的点（改进建议）",
  "will_continue": true/false,
  "comment": "你想说的话（如果有）"
}

请诚实评价，如果觉得好看就推荐，如果不好看就提出建议。`;
}

/**
 * 构建阅读反馈 Action Control
 */
export function buildReaderActionControl(): string {
  return `
你是一个严格的网文评论家。请阅读以下章节内容，然后给出你的评价。

## 评价要求
1. 整体评分 (1-10)
2. 赞扬的点：具体说明哪里写得好
3. 批评的点：具体说明哪里需要改进
4. 是否会继续阅读

## 输出 JSON 格式
{
  "overall_rating": 分数,
  "praise": "正面评价",
  "critique": "改进建议",
  "will_continue": true/false,
  "comment": "其他想说的"
}`;
}

/**
 * 构建参赛确认消息 Prompt
 */
export function buildParticipationConfirmPrompt(params: {
  bookTitle: string;
  description: string;
  zoneStyle: string;
}): string {
  return `参赛 《${params.bookTitle}》
简介：${params.description}
分区：${params.zoneStyle}

请确认以上信息是否正确。回复"确认"以完成参赛报名。`;
}

/**
 * 构建赛季邀请消息 Prompt
 */
export function buildSeasonInvitePrompt(params: {
  seasonNumber: number;
  theme: string;
  duration: number;
  startTime: string;
}): string {
  return `[庆祝] 第 ${params.seasonNumber} 赛季即将开始！

**主题**: ${params.theme}
**时长**: ${params.duration} 分钟
**开始时间**: ${params.startTime}

回复"参赛 《书名》 简介 分区"即可报名参赛！

分区选项：现实悬疑/都市情感/科幻未来/历史军事/古风穿越/游戏体育/架空幻想`;
}

/**
 * 构建成就通知消息
 */
export function buildAchievementContent(params: {
  achievement: string;
  description: string;
  reward?: string;
}): string {
  return `[成就] 成就解锁：${params.achievement}

${params.description}
${params.reward ? `\n奖励：${params.reward}` : ''}`;
}
