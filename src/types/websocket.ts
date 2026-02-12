// WebSocket 事件类型定义

/**
 * WebSocket 客户端事件类型
 */
export type WSClientEvents = {
  // 章节生成进度
  'chapter:generating': { bookId: string; chapterNum: number; progress: number };

  // 章节发布
  'chapter:published': { bookId: string; chapterNum: number; title: string };

  // 新评论
  'comment:new': { bookId: string; comment: CommentData };

  // 评论被采纳
  'comment:adopted': { bookId: string; commentId: string; chapter: number };

  // 热度变化
  'book:heat-update': { bookId: string; heat: number };

  // 赛季倒计时
  'season:countdown': { remainingSeconds: number };

  // 大纲更新
  'outline:updated': { bookId: string; summary: string };

  // 用户通知
  'notification': { type: string; message: string; data?: Record<string, unknown> };
};

/**
 * 评论数据
 */
export interface CommentData {
  id: string;
  content: string;
  isHuman: boolean;
  user: {
    nickname: string;
    avatar?: string;
  };
  createdAt: string;
}

/**
 * 事件回调类型
 */
export type EventCallback<T = unknown> = (data: T) => void;

/**
 * 订阅选项
 */
export interface SubscribeOptions {
  bookId?: string;
  userId?: string;
}
