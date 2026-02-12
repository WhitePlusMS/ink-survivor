# 任务 10：经济系统 - Ink 货币管理

## 任务目标
实现 Ink 货币的获取、消耗、转账等经济系统功能

## 依赖关系
- 任务 07（书籍模块）完成后
- 任务 09（评论模块）完成后

## 交付物清单

### 10.1 经济类型定义
- [ ] 添加 Ink 交易类型
- [ ] 添加 Ink 记录类型

### 10.2 经济 Service
- [ ] 创建经济 Service 类
- [ ] 实现 Ink 计算规则
- [ ] 实现破产检测

### 10.3 经济 API 路由
- [ ] `GET /api/economy/balance/:bookId` - 获取书籍 Ink 余额
- [ ] `GET /api/economy/transactions/:bookId` - 获取交易记录

### 10.4 经济计算逻辑
- [ ] 章节发布消耗计算
- [ ] 互动收入计算
- [ ] 破产判定逻辑

## 涉及文件清单
| 文件路径                                             | 操作 |
| ---------------------------------------------------- | ---- |
| `src/types/economy.ts`                               | 新建 |
| `src/services/economy.service.ts`                    | 新建 |
| `src/app/api/economy/balance/[bookId]/route.ts`      | 新建 |
| `src/app/api/economy/transactions/[bookId]/route.ts` | 新建 |

## 详细设计

### 类型定义
```typescript
// src/types/economy.ts
export interface InkTransaction {
  id: string;
  bookId: string;
  type: 'EARN' | 'SPEND' | 'GIFT' | 'REWARD';
  amount: number;
  reason: string;
  source?: string;
  createdAt: Date;
}

export interface InkBalance {
  current: number;
  earned: number;
  spent: number;
  lastTransaction?: InkTransaction;
}

export interface InkConfig {
  // 消耗规则
  outlineCost: number;        // 生成大纲: -3
  chapterPublishCost: number;  // 发布章节: -5
  readerAgentCost: number;    // Reader Agent: -2
  bankruptcyProtection: number;// 破产保护: -5

  // 获取规则
  signupReward: number;       // 参赛奖励: +50
  viewReward: number;         // 阅读: +1 (上限 50/章)
  favoriteReward: number;     // 收藏: +3
  likeReward: number;         // 点赞: +2
  coinReward: number;         // 投币: +5 (按金额)
  goodReviewReward: number;    // 好评: +2 (情感 > 0.5)
  completionReward: number;   // 完读: +5 (完读率 > 80%)

  // 破产阈值
  bankruptcyThreshold: number;// -10
}

export const INK_CONFIG: InkConfig = {
  outlineCost: 3,
  chapterPublishCost: 5,
  readerAgentCost: 2,
  bankruptcyProtection: 5,

  signupReward: 50,
  viewReward: 1,
  favoriteReward: 3,
  likeReward: 2,
  coinReward: 5,
  goodReviewReward: 2,
  completionReward: 5,

  bankruptcyThreshold: -10,
};
```

### 经济 Service
```typescript
// src/services/economy.service.ts
import { prisma } from '@/lib/prisma';
import { INK_CONFIG, InkConfig } from '@/types/economy';

export class EconomyService {
  private config: InkConfig;

  constructor(config: InkConfig = INK_CONFIG) {
    this.config = config;
  }

  /**
   * 检查是否破产
   */
  async isBankrupt(bookId: string): Promise<boolean> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { inkBalance: true },
    });

    return (book?.inkBalance || 0) < this.config.bankruptcyThreshold;
  }

  /**
   * 处理章节发布
   */
  async publishChapter(bookId: string, chapterNumber: number): Promise<{ success: boolean; balance: number }> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) throw new Error('Book not found');

    // 检查是否破产
    if (await this.isBankrupt(bookId)) {
      throw new Error('Book is bankrupt');
    }

    // 计算消耗
    const totalCost = this.config.chapterPublishCost + this.config.readerAgentCost;

    // 扣除 Ink
    const newBalance = book.inkBalance - totalCost;

    await prisma.book.update({
      where: { id: bookId },
      data: { inkBalance: newBalance },
    });

    return { success: true, balance: newBalance };
  }

  /**
   * 处理阅读收入
   */
  async earnFromView(bookId: string, chapterNumber: number): Promise<void> {
    // 检查本章阅读量上限（50次）
    const chapter = await prisma.chapter.findUnique({
      where: { bookId_chapterNumber: { bookId, chapterNumber } },
    });

    if (!chapter) return;
    if ((chapter.readCount || 0) >= 50) return;

    await prisma.book.update({
      where: { id: bookId },
      data: { inkBalance: { increment: this.config.viewReward } },
    });
  }

  /**
   * 处理收藏收入
   */
  async earnFromFavorite(bookId: string): Promise<void> {
    await prisma.book.update({
      where: { id: bookId },
      data: { inkBalance: { increment: this.config.favoriteReward } },
    });
  }

  /**
   * 处理点赞收入
   */
  async earnFromLike(bookId: string): Promise<void> {
    await prisma.book.update({
      where: { id: bookId },
      data: { inkBalance: { increment: this.config.likeReward } },
    });
  }

  /**
   * 处理打赏收入
   */
  async earnFromGift(bookId: string, amount: number): Promise<void> {
    await prisma.book.update({
      where: { id: bookId },
      data: {
        inkBalance: { increment: amount },
        heat: { increment: amount * 2 },
      },
    });
  }

  /**
   * 处理好评奖励
   */
  async earnFromGoodReview(bookId: string, sentiment: number): Promise<void> {
    if (sentiment > 0.5) {
      await prisma.book.update({
        where: { id: bookId },
        data: { inkBalance: { increment: this.config.goodReviewReward } },
      });
    }
  }

  /**
   * 处理完读奖励
   */
  async earnFromCompletion(bookId: string, completionRate: number): Promise<void> {
    if (completionRate > 0.8) {
      await prisma.book.update({
        where: { id: bookId },
        data: { inkBalance: { increment: this.config.completionReward } },
      });
    }
  }

  /**
   * 处理参赛奖励
   */
  async awardSignupReward(bookId: string): Promise<void> {
    await prisma.book.update({
      where: { id: bookId },
      data: { inkBalance: { increment: this.config.signupReward } },
    });
  }

  /**
   * 获取当前余额
   */
  async getBalance(bookId: string): Promise<number> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { inkBalance: true },
    });

    return book?.inkBalance || 0;
  }

  /**
   * 获取经济状态
   */
  async getEconomyStatus(bookId: string) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { inkBalance: true, status: true },
    });

    return {
      currentBalance: book?.inkBalance || 0,
      isBankrupt: (book?.inkBalance || 0) < this.config.bankruptcyThreshold,
      bankruptcyThreshold: this.config.bankruptcyThreshold,
      safeMargin: (book?.inkBalance || 0) - this.config.bankruptcyThreshold,
      status: book?.status || 'UNKNOWN',
    };
  }

  /**
   * 处理破产
   */
  async handleBankruptcy(bookId: string): Promise<void> {
    await prisma.book.update({
      where: { id: bookId },
      data: { status: 'DISCONTINUED' },
    });
  }
}

export const economyService = new EconomyService();
```

## 验证标准
- [ ] Ink 余额正确计算
- [ ] 破产判定正确
- [ ] 各种收入/消耗正确处理

重要：该任务执行完毕后需要提交一次git commit，提交目前已经更改的所有的代码，，提交信息格式为：`feat: 实现经济系统 - Ink 货币管理`。