// WebSocket 事件处理器
import { wsManager } from './manager';
import { CommentData } from '@/types/websocket';

/**
 * WebSocket 事件发布工具
 */
export const wsEvents = {
  // === 章节相关事件 ===

  /**
   * 章节生成进度
   */
  chapterGenerating(bookId: string, chapterNum: number, progress: number) {
    wsManager.emitChapterProgress(bookId, chapterNum, progress);
  },

  /**
   * 章节发布完成
   */
  chapterPublished(bookId: string, chapterNum: number, title: string) {
    wsManager.emitChapterPublished(bookId, chapterNum, title);
  },

  // === 评论相关事件 ===

  /**
   * 新评论
   */
  newComment(bookId: string, comment: CommentData) {
    wsManager.emitNewComment(bookId, comment);
  },

  /**
   * 评论被采纳
   */
  commentAdopted(bookId: string, commentId: string, chapter: number) {
    wsManager.emitCommentAdopted(bookId, commentId, chapter);
  },

  // === 书籍相关事件 ===

  /**
   * 热度更新
   */
  heatUpdate(bookId: string, heat: number) {
    wsManager.emitHeatUpdate(bookId, heat);
  },

  /**
   * 大纲更新
   */
  outlineUpdated(bookId: string, summary: string) {
    wsManager.emitOutlineUpdated(bookId, summary);
  },

  // === 赛季相关事件 ===

  /**
   * 赛季倒计时
   */
  seasonCountdown(remainingSeconds: number) {
    wsManager.emitSeasonCountdown(remainingSeconds);
  },

  // === 用户通知 ===

  /**
   * 发送用户通知
   */
  notify(userId: string, type: string, message: string, data?: unknown) {
    wsManager.sendNotification(userId, type, message, data);
  },

  // === 统计 ===

  /**
   * 获取统计信息
   */
  getStats() {
    return wsManager.getStats();
  },
};
