// 章节模块类型定义

/**
 * 章节状态类型
 */
export type ChapterStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'SKIPPED';

/**
 * 章节详情接口
 */
export interface ChapterDetail {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  content: string;
  contentLength: number;
  status: ChapterStatus;
  publishedAt?: Date;
  chatSessionId?: string;
  readCount: number;
  commentCount: number;
  inkCost: number;
  createdAt: Date;
}

/**
 * 章节列表项接口
 */
export interface ChapterListItem {
  id: string;
  chapterNumber: number;
  title: string;
  status: ChapterStatus;
  publishedAt: Date | null;
  readCount: number;
  createdAt: Date;
}

/**
 * 章节生成请求
 */
export interface ChapterGenerationRequest {
  chapterNumber: number;
  systemPrompt?: string;
  feedbacks?: string[];
}

/**
 * 章节生成结果
 */
export interface ChapterGenerationResult {
  chapterNumber: number;
  title: string;
  content: string;
  contentLength: number;
  duration: number;
}

/**
 * SSE 事件类型
 */
export type SSEEventType = 'start' | 'chunk' | 'complete' | 'error' | 'done';

/**
 * SSE 事件数据
 */
export interface SSEEventData {
  type: SSEEventType;
  data?: {
    chapterNumber?: number;
    content?: string;
    title?: string;
    contentLength?: number;
    duration?: number;
    message?: string;
  };
}

/**
 * 流式生成进度
 */
export interface GenerationProgress {
  bookId: string;
  chapterNumber: number;
  progress: number;      // 0-100
  contentLength: number;
  startedAt: Date;
}
