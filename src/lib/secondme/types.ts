/**
 * SecondMe API 类型定义
 */

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
  createdAt?: string;
}

export interface Shade {
  shadeId: string;
  name: string;
  description?: string;
}

export interface NoteAddRequest {
  content: string;
  title?: string;
  memoryType?: 'TEXT' | 'IMAGE' | 'LINK';
}

export interface NoteResponse {
  noteId: number;
  createdAt: string;
}

export interface ApiResponse<T> {
  code: number;
  data?: T;
  message?: string;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope?: string[];
}

/**
 * 流式响应事件类型
 */
export enum StreamEventType {
  CONTENT = 'content',
  DONE = 'done',
  ERROR = 'error',
}

export interface StreamEvent {
  type: StreamEventType;
  data?: string | object;
}

/**
 * Reader Agent 反馈结构
 */
export interface ReaderFeedback {
  overall_rating: number;
  praise: string;
  critique: string;
  will_continue: boolean;
  comment?: string;
}
