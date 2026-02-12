// WebSocket 管理器
import { WSClientEvents, EventCallback, CommentData } from '@/types/websocket';

/**
 * WebSocket 连接信息
 */
interface WSConnection {
  id: string;
  bookIds: Set<string>;
  userIds: Set<string>;
  callbacks: Map<string, Set<EventCallback>>;
}

/**
 * WebSocket 管理器单例
 * 用于管理所有 WebSocket 连接和事件订阅
 */
class WebSocketManager {
  private connections: Map<string, WSConnection> = new Map();
  private connectionCount: number = 0;

  /**
   * 创建新连接
   */
  createConnection(connectionId: string): WSConnection {
    const connection: WSConnection = {
      id: connectionId,
      bookIds: new Set(),
      userIds: new Set(),
      callbacks: new Map(),
    };
    this.connections.set(connectionId, connection);
    this.connectionCount++;

    console.log(`[WSManager] Connection created: ${connectionId}, total: ${this.connectionCount}`);
    return connection;
  }

  /**
   * 删除连接
   */
  removeConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.connectionCount--;
      console.log(`[WSManager] Connection removed: ${connectionId}, remaining: ${this.connectionCount}`);
    }
  }

  /**
   * 订阅书籍更新
   */
  subscribe(connectionId: string, bookId: string, callback: EventCallback) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.bookIds.add(bookId);

    if (!connection.callbacks.has(bookId)) {
      connection.callbacks.set(bookId, new Set());
    }
    connection.callbacks.get(bookId)!.add(callback);

    console.log(`[WSManager] Connection ${connectionId} subscribed to book: ${bookId}`);
  }

  /**
   * 取消订阅
   */
  unsubscribe(connectionId: string, bookId: string, callback?: EventCallback) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (callback) {
      connection.callbacks.get(bookId)?.delete(callback);
    } else {
      connection.callbacks.delete(bookId);
    }
    connection.bookIds.delete(bookId);

    console.log(`[WSManager] Connection ${connectionId} unsubscribed from book: ${bookId}`);
  }

  /**
   * 订阅用户通知
   */
  subscribeUser(connectionId: string, userId: string, callback: EventCallback) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.userIds.add(userId);

    if (!connection.callbacks.has(`user:${userId}`)) {
      connection.callbacks.set(`user:${userId}`, new Set());
    }
    connection.callbacks.get(`user:${userId}`)!.add(callback);
  }

  /**
   * 发布事件到特定连接
   */
  emitToConnection<K extends keyof WSClientEvents>(
    connectionId: string,
    event: K,
    data: WSClientEvents[K]
  ) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const callbacks = connection.callbacks.get(event as string) || new Set<EventCallback>();
    callbacks.forEach((cb: EventCallback) => {
      try {
        cb(data);
      } catch (error) {
        console.error(`[WSManager] Event callback error for ${event}:`, error);
      }
    });
  }

  /**
   * 发布事件到指定书籍的所有订阅者
   */
  emitToBook<K extends keyof WSClientEvents>(
    bookId: string,
    event: K,
    data: WSClientEvents[K]
  ) {
    const connections = Array.from(this.connections.values());
    for (const connection of connections) {
      if (connection.bookIds.has(bookId)) {
        const callbacks = connection.callbacks.get(bookId) || new Set<EventCallback>();
        callbacks.forEach((cb: EventCallback) => {
          try {
            cb(data);
          } catch (error) {
            console.error(`[WSManager] Event callback error for ${event}:`, error);
          }
        });
      }
    }
    console.log(`[WSManager] Emitted ${event} to book: ${bookId}`);
  }

  /**
   * 发布事件到指定用户的所有连接
   */
  emitToUser<K extends keyof WSClientEvents>(
    userId: string,
    event: K,
    data: WSClientEvents[K]
  ) {
    const connections = Array.from(this.connections.values());
    for (const connection of connections) {
      if (connection.userIds.has(userId)) {
        const callbacks = connection.callbacks.get(`user:${userId}`) || new Set<EventCallback>();
        callbacks.forEach((cb: EventCallback) => {
          try {
            cb(data);
          } catch (error) {
            console.error(`[WSManager] Event callback error for ${event}:`, error);
          }
        });
      }
    }
    console.log(`[WSManager] Emitted ${event} to user: ${userId}`);
  }

  /**
   * 发布全局事件
   */
  emitGlobal<K extends keyof WSClientEvents>(
    event: K,
    data: WSClientEvents[K]
  ) {
    const connections = Array.from(this.connections.values());
    for (const connection of connections) {
      // 发布到所有全局事件监听器
      const globalCallbacks = connection.callbacks.get('global') || new Set<EventCallback>();
      globalCallbacks.forEach((cb: EventCallback) => {
        try {
          cb(data);
        } catch (error) {
          console.error(`[WSManager] Global event callback error:`, error);
        }
      });

      // 对于倒计时事件，发送给所有连接
      if (event === 'season:countdown') {
        const callbacks = connection.callbacks.get('season:countdown') || new Set<EventCallback>();
        callbacks.forEach((cb: EventCallback) => {
          try {
            cb(data);
          } catch (error) {
            console.error(`[WSManager] Countdown event callback error:`, error);
          }
        });
      }
    }
  }

  /**
   * 处理章节生成进度
   */
  emitChapterProgress(bookId: string, chapterNum: number, progress: number) {
    this.emitToBook(bookId, 'chapter:generating', { bookId, chapterNum, progress });
  }

  /**
   * 处理章节发布
   */
  emitChapterPublished(bookId: string, chapterNum: number, title: string) {
    this.emitToBook(bookId, 'chapter:published', { bookId, chapterNum, title });
  }

  /**
   * 处理新评论
   */
  emitNewComment(bookId: string, comment: CommentData) {
    this.emitToBook(bookId, 'comment:new', { bookId, comment });
  }

  /**
   * 处理评论被采纳
   */
  emitCommentAdopted(bookId: string, commentId: string, chapter: number) {
    this.emitToBook(bookId, 'comment:adopted', { bookId, commentId, chapter });
  }

  /**
   * 处理热度变化
   */
  emitHeatUpdate(bookId: string, heat: number) {
    this.emitToBook(bookId, 'book:heat-update', { bookId, heat });
  }

  /**
   * 处理赛季倒计时
   */
  emitSeasonCountdown(remainingSeconds: number) {
    this.emitGlobal('season:countdown', { remainingSeconds });
  }

  /**
   * 处理大纲更新
   */
  emitOutlineUpdated(bookId: string, summary: string) {
    this.emitToBook(bookId, 'outline:updated', { bookId, summary });
  }

  /**
   * 发送用户通知
   */
  sendNotification(userId: string, type: string, message: string, data?: unknown) {
    this.emitToUser(userId, 'notification', { type, message, data });
  }

  /**
   * 获取连接统计
   */
  getStats() {
    let totalSubscriptions = 0;
    const connections = Array.from(this.connections.values());
    for (const connection of connections) {
      totalSubscriptions += connection.bookIds.size + connection.userIds.size;
    }

    return {
      connections: this.connectionCount,
      totalSubscriptions,
    };
  }

  /**
   * 获取指定书籍的订阅者数量
   */
  getBookSubscriberCount(bookId: string): number {
    let count = 0;
    const connections = Array.from(this.connections.values());
    for (const connection of connections) {
      if (connection.bookIds.has(bookId)) {
        count++;
      }
    }
    return count;
  }
}

// 导出单例
export const wsManager = new WebSocketManager();
