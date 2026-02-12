# 任务 05：SecondMe API 客户端封装

## 任务目标
封装 SecondMe API 调用，提供统一的接口用于 Agent 通信

## 依赖关系
- 任务 04（OAuth2 认证）完成后

## 交付物清单

### 5.1 基础 API 客户端
- [ ] 创建 SecondMe API 客户端类
- [ ] 实现用户信息获取
- [ ] 实现流式聊天接口

### 5.2 流式响应处理
- [ ] SSE 流解析器
- [ ] JSON 流解析器

### 5.3 会话管理
- [ ] 会话 ID 管理
- [ ] 上下文保持

### 5.4 工具函数
- [ ] 构建 Prompt 模板
- [ ] 解析响应结果

## 涉及文件清单
| 文件路径                      | 操作 |
| ----------------------------- | ---- |
| `src/lib/secondme/client.ts`  | 新建 |
| `src/lib/secondme/stream.ts`  | 新建 |
| `src/lib/secondme/prompts.ts` | 新建 |
| `src/lib/secondme/types.ts`   | 新建 |

## 详细设计

### 类型定义
```typescript
// src/lib/secondme/types.ts
export interface SecondMeUser {
  userId: string;
  name: string;
  avatar: string;
  bio: string;
  selfIntroduction: string;
  profileCompleteness: number;
  route: string;
}

export interface ChatRequest {
  message: string;
  systemPrompt?: string;
  sessionId?: string;
  appId?: string;
  enableWebSearch?: boolean;
}

export interface ChatResponse {
  sessionId: string;
  content: string;
}

export interface ActionControl {
  instruction: string;
  outputSchema: object;
}

export interface SoftMemory {
  id: string;
  content: string;
  title: string;
  memoryType: string;
}
```

### SecondMe API 客户端
```typescript
// src/lib/secondme/client.ts
import { SecondMeUser, ChatRequest, SoftMemory } from './types';
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://app.mindos.com/gate/lab';

export class SecondMeClient {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * 获取有效的 Access Token（自动刷新）
   */
  private async getValidToken(): Promise<string> {
    const userToken = await prisma.userToken.findUnique({
      where: { userId: this.userId },
    });

    if (!userToken) throw new Error('User token not found');

    // 如果 Token 即将过期，刷新它
    const expiresIn = userToken.expiresAt.getTime() - Date.now();
    if (expiresIn < 5 * 60 * 1000) {
      // 刷新 Token
      const response = await fetch(`${BASE_URL}/api/oauth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: userToken.refreshToken,
          client_id: process.env.SECONDME_CLIENT_ID!,
          client_secret: process.env.SECONDME_CLIENT_SECRET!,
        }),
      });

      const tokens = await response.json();

      await prisma.userToken.update({
        where: { userId: this.userId },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          lastRefreshed: new Date(),
        },
      });

      return tokens.access_token;
    }

    return userToken.accessToken;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<SecondMeUser> {
    const token = await this.getValidToken();

    const response = await fetch(`${BASE_URL}/api/secondme/user/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * 获取用户兴趣标签
   */
  async getShades(): Promise<string[]> {
    const token = await this.getValidToken();

    const response = await fetch(`${BASE_URL}/api/secondme/user/shades`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    return data.data || [];
  }

  /**
   * 获取用户软记忆
   */
  async getSoftMemory(keyword?: string): Promise<SoftMemory[]> {
    const token = await this.getValidToken();

    const params = new URLSearchParams({
      pageNo: '1',
      pageSize: '20',
    });
    if (keyword) params.append('keyword', keyword);

    const response = await fetch(
      `${BASE_URL}/api/secondme/user/softmemory?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await response.json();
    return data.data?.list || [];
  }

  /**
   * 写入笔记/记忆
   */
  async writeNote(content: string, title?: string): Promise<number> {
    const token = await this.getValidToken();

    const response = await fetch(`${BASE_URL}/api/secondme/note/add`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        title: title || 'InkSurvivor 创作记录',
        memoryType: 'TEXT',
      }),
    });

    const data = await response.json();
    return data.data?.noteId;
  }

  /**
   * 流式发送消息（核心：Agent 对话）
   */
  async *streamChat(request: ChatRequest): AsyncGenerator<string> {
    const token = await this.getValidToken();

    const response = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-App-Id': request.appId || 'inksurvivor',
      },
      body: JSON.stringify({
        message: request.message,
        systemPrompt: request.systemPrompt,
        sessionId: request.sessionId,
        enableWebSearch: request.enableWebSearch || false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.statusText}`);
    }

    // 解析 SSE 流
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }

  /**
   * 流式动作判断（用于反馈分析）
   */
  async *streamAction(message: string, actionControl: string): AsyncGenerator<any> {
    const token = await this.getValidToken();

    const response = await fetch(`${BASE_URL}/api/secondme/act/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        actionControl: `${actionControl}\n输出 JSON 对象，不要解释。`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Act API error: ${response.statusText}`);
    }

    // 解析 JSON 流
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value);

      // 尝试解析完整的 JSON 对象
      try {
        const obj = JSON.parse(buffer);
        yield obj;
        buffer = '';
      } catch {
        // 等待更多数据
        continue;
      }
    }
  }
}
```

### Prompt 模板构建
```typescript
// src/lib/secondme/prompts.ts

/**
 * 构建作家角色 System Prompt
 */
export function buildAuthorSystemPrompt(params: {
  userName: string;
  writingStyle?: string;
  seasonTheme: string;
  constraints: string[];
  zoneStyle: string;
}): string {
  return `你是${params.userName}，一个热爱创作的故事作家。

## 你的写作风格
${params.writingStyle || '风格多变，能驾驭多种题材'}

## 当前创作任务
你正在参加 InkSurvivor 赛季创作比赛：

**赛季主题**: ${params.seasonTheme}
**硬性限制**:
${params.constraints.map(c => `- ${c}`).join('\n')}

**分区风格**: ${params.zoneStyle}

## 任务要求
请严格遵守以上限制进行创作。
`;
}

/**
 * 构建大纲生成 Prompt
 */
export function buildOutlinePrompt(params: {
  seasonTheme: string;
  constraints: string[];
  zoneStyle: string;
  forcedChapter?: number;
  forcedEvent?: string;
  endingType?: string;
}): string {
  return `请为这个故事生成一个 5 章的详细大纲。

## 输出格式 (JSON)
{
  "title": "故事标题",
  "summary": "一句话简介（50字以内）",
  "characters": [
    {
      "name": "主角姓名",
      "role": "protagonist/antagonist/supporting",
      "description": "角色描述",
      "motivation": "核心动机"
    }
  ],
  "chapters": [
    {
      "number": 1,
      "title": "章节标题",
      "summary": "章节概要（100-150字）",
      "key_events": ["关键事件1", "关键事件2"],
      "word_count_target": 2000
    }
  ],
  "themes": ["主题1", "主题2"],
  "tone": "叙事风格描述"
}

请确保：
1. 严格遵守硬性限制
2. 故事有清晰的起承转合
${params.forcedChapter ? `3. 第${params.forcedChapter}章必须包含：${params.forcedEvent}` : ''}
4. 结局类型：${params.endingType || '开放结局'}

现在开始创作，只输出 JSON，不要有其他内容。`;
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
- 直接开始正文，不要有章节标题

请直接开始写正文...`;
}

/**
 * 构建 Reader Agent Prompt
 */
export function buildReaderSystemPrompt(params: {
  readerName: string;
  preferences: {
    genres: string[];
    style?: string;
    minRating: number;
  };
}): string {
  return `你是${params.readerName}，一位热爱阅读的读者。

## 你的阅读偏好
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
```

## 验证标准
- [ ] Token 自动刷新正常工作
- [ ] 流式聊天能正确获取内容
- [ ] JSON 解析正确
- [ ] Prompt 模板格式正确

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 封装 SecondMe API 客户端`。