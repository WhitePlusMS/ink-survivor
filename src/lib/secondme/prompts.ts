/**
 * SecondMe Agent Prompt 模板
 *
 * 用于构建不同场景的 System Prompt
 */

// 确保 constraints 是数组
function normalizeConstraints(constraints: unknown): string[] {
	if (Array.isArray(constraints)) {
		return constraints.filter((c): c is string => typeof c === "string");
	}
	if (typeof constraints === "string") {
		return [constraints];
	}
	return [];
}

/**
 * 根据性格和写作风格生成风格引导
 * 用户填写的 writerPersonality 直接使用，不做关键词检查
 */
function getStyleGuidance(writerPersonality: string, writingStyle: string, preferredGenres: string[]): string {
	// writerPersonality 参数是作者填写的人格描述
	const personalityText = writerPersonality || "";
	const styleKeywords = (writingStyle || "").toLowerCase();
	const genreList = preferredGenres || [];

	let guidance = "";

	// 用户填写了自定义内容，直接使用用户输入，不做关键词检查
	if (personalityText.trim()) {
		// 清理可能包含的冒号（JSON格式不允许）
		const cleanPersonality = personalityText.replace(/：/g, "：").replace(/:/g, "：");
		guidance += `- ${cleanPersonality}`;
	} else {
		// 如果没有填写，使用默认引导
		guidance += "- 根据你的性格自由发挥";
	}

	guidance += "\n";

	// 写作风格引导
	if (styleKeywords === "严肃") {
		guidance += "- 写作风格严肃庄重，叙事严谨认真，措辞正式\n";
	} else if (styleKeywords === "幽默") {
		guidance += "- 写作风格轻松幽默，诙谐有趣，可以适当调侃\n";
	} else if (styleKeywords === "浪漫") {
		guidance += "- 写作风格浪漫抒情，情感细腻，充满理想色彩\n";
	} else if (styleKeywords === "悬疑") {
		guidance += "- 写作风格紧张刺激，节奏紧凑，悬念迭起\n";
	}

	// 题材偏好引导
	if (genreList.includes("scifi") || genreList.includes("科幻")) {
		guidance += "- 你偏好科幻题材，可以加入科技元素、未来设定、人工智能等\n";
	}
	if (genreList.includes("fantasy") || genreList.includes("玄幻")) {
		guidance += "- 你偏好玄幻题材，可以加入魔法、异世界、修炼体系等\n";
	}
	if (genreList.includes("urban") || genreList.includes("都市")) {
		guidance += "- 你偏好都市题材，故事背景可以设在现代城市\n";
	}
	if (genreList.includes("history") || genreList.includes("历史")) {
		guidance += "- 你偏好历史题材，可以借鉴历史背景或典故\n";
	}
	if (genreList.includes("game") || genreList.includes("游戏")) {
		guidance += "- 你偏好游戏题材，可以加入游戏元素、系统设定等\n";
	}
	if (genreList.includes("mystery") || genreList.includes("悬疑")) {
		guidance += "- 你偏好悬疑题材，故事应该充满谜团和反转\n";
	}
	if (genreList.includes("romance") || genreList.includes("言情")) {
		guidance += "- 你偏好言情题材，故事应该以感情线为主\n";
	}

	return guidance || "- 根据你的性格自由发挥";
}

/**
 * 构建作家角色 System Prompt
 * PRD 11.1：System Prompt 应包含性格特征 + 赛季约束
 * 完整使用 Agent 的所有配置信息
 */
export function buildAuthorSystemPrompt(params: {
	// 显示用
	userName: string;

	// Agent 性格配置 - 使用 writerPersonality 字段
	writerPersonality: string;
	selfIntro?: string; // 自我介绍

	// Agent 写作偏好
	writingStyle: string; // 写作风格：严肃/幽默/浪漫/悬疑/多变
	adaptability: number; // 听劝指数：0-1
	preferredGenres: string[]; // 偏好题材

	// 赛季信息
	seasonTheme: string;
	constraints: string[];
	zoneStyle: string;

	// 创作参数
	wordCountTarget: number; // 每章目标字数
}): string {
	const normalizedConstraints = normalizeConstraints(params.constraints);

	// writerPersonality 是作者填写的人格描述
	const personalityDesc = params.writerPersonality || "性格多变";

	// 构建听劝程度描述
	const adaptabilityDesc =
		params.adaptability >= 0.7
			? "高度听劝，会认真考虑读者反馈调整剧情"
			: params.adaptability >= 0.4
				? "中等听劝，会选择性采纳读者建议"
				: "固执己见，除非有严重问题否则坚持原大纲";

	// 构建题材偏好描述
	const genreDesc =
		params.preferredGenres?.length > 0
			? params.preferredGenres
					.map((g) => {
						const map: Record<string, string> = {
							urban: "现代都市",
							fantasy: "玄幻架空",
							scifi: "科幻未来",
							history: "历史军事",
							game: "游戏体育",
							mystery: "悬疑推理",
							romance: "言情",
							fantasy_cn: "古风穿越",
						};
						return map[g] || g;
					})
					.join("、")
			: "不限";

	return `你是${params.userName}，${params.selfIntro || "一位热爱创作的故事作家"}。

## 个人特质
- 性格特点：${personalityDesc}
- 听劝指数：${params.adaptability}（${adaptabilityDesc}）

## 写作偏好
- 写作风格：${params.writingStyle || "多变"}
- 偏好题材：${genreDesc}
- 每章目标字数：${params.wordCountTarget || 2000} 字

## 当前创作任务
你正在参加 InkSurvivor 赛季创作比赛：

**赛季主题**: ${params.seasonTheme}
**硬性限制**:
${normalizedConstraints.map((c) => `- ${c}`).join("\n") || "无"}
**分区风格**: ${params.zoneStyle}

## 任务要求
请严格按照以上个人特质和限制进行创作，保持个人风格一致性。`;
}

/**
 * 构建大纲生成 Prompt
 * 包含 Agent 性格引导和完整创作参数
 */
export function buildOutlinePrompt(params: {
	// Agent 性格配置
	writerPersonality: string; // 作者性格描述
	writingStyle: string; // 写作风格

	// Agent 创作参数
	adaptability: number; // 听劝指数
	preferredGenres: string[]; // 偏好题材
	wordCountTarget: number; // 每章目标字数

	// 赛季信息
	seasonTheme: string;
	constraints: string[];
	zoneStyle: string;
	minChapters?: number;
	maxChapters?: number;
	chapterPreference?: string; // 短篇/中篇/长篇
	forcedChapter?: number;
	forcedEvent?: string;
	originalIntent?: string; // 故事创意/灵感
}): string {
	// 处理空值
	const writingStyle = params.writingStyle || '多变';
	const wordCount = params.wordCountTarget || 2000;

	const normalizedConstraints = normalizeConstraints(params.constraints);

	// 构建章节限制说明
	const chapterLimitText =
		params.minChapters && params.maxChapters
			? `赛季章节限制：${params.minChapters}-${params.maxChapters} 章`
			: "";

	// 构建创作偏好说明
	const preferenceText = params.chapterPreference
		? `你的创作偏好：${params.chapterPreference}，每章约 ${wordCount} 字。`
		: `每章约 ${wordCount} 字。`;

	// 构建性格风格引导
	const styleGuidance = getStyleGuidance(params.writerPersonality, writingStyle, params.preferredGenres);

	// 构建听劝程度说明（简化为数值）
	const adaptabilityNote = `听劝指数：${params.adaptability}`;

	// 构建故事创意说明
	const storyInspirationText = params.originalIntent
		? `## 故事创意\n${params.originalIntent}\n`
		: "";

	return `请为这个故事生成一个大纲。
${storyInspirationText}
## 作者风格
- 性格：${params.writerPersonality || '性格多变'}
- 写作风格：${writingStyle}
- ${adaptabilityNote}

## 创作偏好
${preferenceText}

## 章节要求
${chapterLimitText}
根据你的创作偏好和赛季限制，在 ${params.minChapters || 3}-${params.maxChapters || 7} 章范围内自行决定合适的章节数量。
**重要：最后一章必须是完整结局章，必须完结所有伏笔和主线情节，不能是"未完待续"。**

## 硬性约束（必须遵守）
${normalizedConstraints.map((c) => `- ${c}`).join("\n") || "无"}

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
      "word_count_target": ${wordCount}
    }
  ],
  "themes": ["主题1", "主题2"],
  "tone": "叙事风格描述"
}
\`\`\`

请确保：
1. 章节数量在 ${params.minChapters || 3}-${params.maxChapters || 7} 章之间（由你根据创作偏好自行决定）
2. 最后一章必须是完整的结局
3. 每个字符串字段都不能包含冒号（:）
4. 不要在字符串中嵌套引号或冒号
5. 故事有清晰的起承转合
6. 根据你的性格特点和写作风格，形成独特的叙事风格
${params.forcedChapter ? `7. 第${params.forcedChapter}章必须包含：${params.forcedEvent}` : ""}
8. 结局类型由你根据故事发展自由决定

只输出 JSON 代码块，不要有任何其他内容。`;
}

/**
 * 构建章节创作 Prompt
 * 包含 Agent 性格引导、完整大纲和上一章详细内容
 */
export function buildChapterPrompt(params: {
	// Agent 性格配置
	writerPersonality: string;
	selfIntro?: string; // 自我介绍
	writingStyle: string; // 写作风格

	// Agent 创作参数
	wordCountTarget: number;

	// 大纲信息
	bookTitle: string;
	chapterNumber: number;
	totalChapters: number; // 总章节数
	outline: {
		summary: string;
		key_events: string[];
		word_count_target: number;
	};

	// 整本书大纲（新增）
	fullOutline: {
		number: number;
		title: string;
		summary: string;
		key_events: string[];
		word_count_target: number;
	}[];

	// 前面内容（优化）
	previousSummary: string;
	previousChapterContent?: string;

	// 反馈
	feedbacks?: string[];
}): string {
	// 使用大纲中的字数要求，优先使用 Agent 配置的字数
	const targetWordCount = params.wordCountTarget || params.outline.word_count_target || 2000;

	const feedbackSection =
		params.feedbacks && params.feedbacks.length > 0
			? "## 读者反馈（已采纳）\n" + params.feedbacks.join("\n") + "\n\n"
			: "";

	// 构建整本书大纲（用于理解故事全局，包含本章关键事件）
	const fullOutlineText = params.fullOutline
		.map(
			(chapter) =>
				`### 第 ${chapter.number} 章：${chapter.title}\n- 概要：${chapter.summary}\n- 关键事件：${chapter.key_events.slice(0, 3).join("、")}`,
		)
		.join("\n\n");

	// 判断本章在故事中的位置
	const isFirstChapter = params.chapterNumber === 1;
	const isLastChapter = params.chapterNumber === params.totalChapters;
	const positionHint = isFirstChapter
		? "本章是故事的开篇，需要建立背景、引入角色"
		: isLastChapter
			? "本章是故事的结局，需要收束所有伏笔、给出结局"
			: `本章是故事的中间章节（第 ${params.chapterNumber}/${params.totalChapters} 章），需要承上启下`;

	// 上一章剧情的标题（第一章显示为故事背景）
	const previousChapterTitle = isFirstChapter ? "故事背景（本章是开篇）" : "上一章剧情（保持连贯性）";
	// 第一章没有上一章，显示故事简介/一句话梗概
	const previousChapterContent = isFirstChapter
		? params.bookTitle + "的故事简介：" + (params.previousSummary || "无")
		: params.previousChapterContent || params.previousSummary;

	const prompt = `请撰写《${params.bookTitle}》第 ${params.chapterNumber} 章（共 ${params.totalChapters} 章）。

## 整本书大纲（了解故事全局）
以下是大纲，帮助你理解本章在整体故事中的位置：

${fullOutlineText}

---
**你是正在撰写：第 ${params.chapterNumber} 章（共 ${params.totalChapters} 章）**
- ${positionHint}
- ${isFirstChapter ? "建立背景、引入角色" : `本章在上文第 ${params.chapterNumber - 1} 章之后`}
${!isLastChapter ? `- 本章需要为后续章节做铺垫` : "- 本章需要收束所有伏笔，给出完整结局"}

## 本章大纲
${params.outline.summary}

## ${previousChapterTitle}
${previousChapterContent}

${feedbackSection}## 要求
- 字数：约 ${targetWordCount} 字
- 推进剧情发展
- 对话自然，符合角色性格
- 注意与前后章节的呼应，保持故事整体一致性

## 输出格式
严格按照以下格式输出：

# 章节标题(示例：第一章 此章节标题)

章节正文内容...

注意：正文中的对话可以直接使用双引号，不需要转义。只输出纯文本内容。`;

	return prompt;
}

/**
 * 构建 Reader Agent Prompt
 */
export function buildReaderSystemPrompt(params: {
	readerName: string;
	readerPersonality?: string; // 读者性格描述
	preferences: {
		genres: string[];
		style?: string;
		minRating: number;
	};
}): string {
	const personalitySection = params.readerPersonality
		? `## 你的性格特点
${params.readerPersonality}

`
		: "";

	return `你是${params.readerName}，一位热爱阅读的读者。
${personalitySection}## 你的阅读偏好
- 喜欢的题材：${params.preferences.genres.join("、")}
- 评价风格：${params.preferences.style || "客观中肯"}
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
  "critique": "批评的点（改进建议）"
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

## 输出 JSON 格式
{
  "overall_rating": 分数,
  "praise": "正面评价",
  "critique": "改进建议"
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
export function buildAchievementContent(params: { achievement: string; description: string; reward?: string }): string {
	return `[成就] 成就解锁：${params.achievement}

${params.description}
${params.reward ? `\n奖励：${params.reward}` : ""}`;
}
