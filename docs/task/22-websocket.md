# 任务 22：WebSocket 实时通信与进度推送

## 任务目标
实现 WebSocket/SSE 实时通信，支持章节生成进度推送

## 依赖关系
- 任务 08（章节生成）完成后

## 交付物清单

### 22.1 WebSocket 事件类型
- [ ] 定义事件接口

### 22.2 WebSocket 服务
- [ ] WebSocket 管理器
- [ ] 事件广播

### 22.3 实时事件处理
- [ ] 章节生成进度
- [ ] 新评论通知
- [ ] 热度变化

## 涉及文件清单
| 文件路径                       | 操作 |
| ------------------------------ | ---- |
| `src/types/websocket.ts`       | 新建 |
| `src/lib/websocket/manager.ts` | 新建 |
| `src/lib/websocket/events.ts`  | 新建 |

## 详细设计

### 事件类型
```typescript
// src/types/websocket.ts

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
};

export interface CommentData {
  id: string;
  content: string;
  isHuman: boolean;
  user: {
    nickname: string;
  };
  createdAt: string;
}
```

### WebSocket 管理器
```typescript
// src/lib/websocket/manager.ts
import { WSClientEvents } from '@/types/websocket';

type EventCallback<T = any> = (data: T) => void;

class WebSocketManager {
  private connections: Map<string, Set<EventCallback>> = new Map();
  private eventHandlers: Map<string, Set<EventCallback>> = new Map();

  /**
   * 订阅书籍更新
   */
  subscribe(bookId: string, callback: EventCallback) {
    if (!this.connections.has(bookId)) {
      this.connections.set(bookId, new Set());
    }
    this.connections.get(bookId)!.add(callback);

    return () => {
      this.connections.get(bookId)?.delete(callback);
    };
  }

  /**
   * 取消订阅
   */
  unsubscribe(bookId: string, callback: EventCallback) {
    this.connections.get(bookId)?.delete(callback);
  }

  /**
   * 发布事件
   */
  emit<K extends keyof WSClientEvents>(event: K, data: WSClientEvents[K]) {
    const subscribers = this.connections.get(event as string) || new Set();

    // 对于书籍相关事件，发送给该书籍的所有订阅者
    if (event.includes('bookId') || event.includes('book')) {
      for (const [bookId, callbacks] of this.connections) {
        callbacks.forEach(cb => cb(data));
      }
    }

    // 全局事件
    if (event === 'season:countdown') {
      for (const callbacks of this.connections.values()) {
        callbacks.forEach(cb => cb(data));
      }
    }
  }

  /**
   * 处理章节生成进度
   */
  emitChapterProgress(bookId: string, chapterNum: number, progress: number) {
    this.emit('chapter:generating', { bookId, chapterNum, progress });
  }

  /**
   * 处理章节发布
   */
  emitChapterPublished(bookId: string, chapterNum: number, title: string) {
    this.emit('chapter:published', { bookId, chapterNum, title });
  }

  /**
   * 处理新评论
   */
  emitNewComment(bookId: string, comment: any) {
    this.emit('comment:new', { bookId, comment });
  }

  /**
   * 处理热度变化
   */
  emitHeatUpdate(bookId: string, heat: number) {
    this.emit('book:heat-update', { bookId, heat });
  }
}

export const wsManager = new WebSocketManager();
```

## 验证标准
- [ ] WebSocket 连接正常
- [ ] 事件正确推送
- [ ] 订阅/取消订阅正常
重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现 WebSocket 实时通信与事件推送`。