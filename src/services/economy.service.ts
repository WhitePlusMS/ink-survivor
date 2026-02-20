// 经济系统 Service
import { prisma } from '@/lib/prisma';
import { INK_CONFIG } from '@/types/economy-config';
import { InkConfig, EconomyStatus, BalanceResponseDto } from '@/types/economy';

export class EconomyService {
  private config: InkConfig;

  constructor() {
    this.config = {
      outlineCost: INK_CONFIG.outlineCost,
      chapterPublishCost: INK_CONFIG.chapterPublishCost,
      readerAgentCost: INK_CONFIG.readerAgentCost,
      bankruptcyProtection: INK_CONFIG.bankruptcyProtection,
      signupReward: INK_CONFIG.signupReward,
      viewReward: INK_CONFIG.viewReward,
      favoriteReward: INK_CONFIG.favoriteReward,
      likeReward: INK_CONFIG.likeReward,
      coinReward: INK_CONFIG.coinReward,
      goodReviewReward: INK_CONFIG.goodReviewReward,
      completionReward: INK_CONFIG.completionReward,
      bankruptcyThreshold: INK_CONFIG.bankruptcyThreshold,
    };
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
  async publishChapter(bookId: string): Promise<{ success: boolean; balance: number; message: string }> {
    // chapterNumber 参数保留用于未来可能的计费逻辑
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      throw new Error('Book not found');
    }

    // 检查是否破产
    if (await this.isBankrupt(bookId)) {
      return { success: false, balance: book.inkBalance, message: '已破产，无法继续创作' };
    }

    // 计算消耗
    const totalCost = this.config.chapterPublishCost + this.config.readerAgentCost;

    // 扣除 Ink
    const newBalance = book.inkBalance - totalCost;

    await prisma.book.update({
      where: { id: bookId },
      data: { inkBalance: newBalance },
    });

    console.log(`[EconomyService] Chapter published, balance: ${newBalance}`);
    return { success: true, balance: newBalance, message: `消耗 ${totalCost} Ink` };
  }

  /**
   * 处理大纲生成
   */
  async generateOutline(bookId: string): Promise<{ success: boolean; balance: number }> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      throw new Error('Book not found');
    }

    const newBalance = book.inkBalance - this.config.outlineCost;

    await prisma.book.update({
      where: { id: bookId },
      data: { inkBalance: newBalance },
    });

    console.log(`[EconomyService] Outline generated, balance: ${newBalance}`);
    return { success: true, balance: newBalance };
  }

  /**
   * 处理阅读收入
   */
  async earnFromView(bookId: string, chapterNumber: number): Promise<void> {
    const chapter = await prisma.chapter.findUnique({
      where: { bookId_chapterNumber: { bookId, chapterNumber } },
    });

    if (!chapter) return;
    if ((chapter.readCount || 0) >= 50) return; // 上限 50 次

    await prisma.book.update({
      where: { id: bookId },
      data: { inkBalance: { increment: this.config.viewReward } },
    });

    console.log(`[EconomyService] Earned ${this.config.viewReward} Ink from view`);
  }

  /**
   * 处理收藏收入
   */
  async earnFromFavorite(bookId: string): Promise<void> {
    await prisma.book.update({
      where: { id: bookId },
      data: { inkBalance: { increment: this.config.favoriteReward } },
    });
    console.log(`[EconomyService] Earned ${this.config.favoriteReward} Ink from favorite`);
  }

  /**
   * 处理点赞收入
   */
  async earnFromLike(bookId: string): Promise<void> {
    await prisma.book.update({
      where: { id: bookId },
      data: { inkBalance: { increment: this.config.likeReward } },
    });
    console.log(`[EconomyService] Earned ${this.config.likeReward} Ink from like`);
  }

  /**
   * 处理打赏收入
   */
  async earnFromGift(bookId: string, amount: number): Promise<void> {
    await prisma.book.update({
      where: { id: bookId },
      data: {
        inkBalance: { increment: amount },
        // 注意：heat 更新由 interactionService.gift() 处理，避免重复
      },
    });
    console.log(`[EconomyService] Earned ${amount} Ink from gift`);
  }

  /**
   * 处理好评奖励
   */
  async earnFromGoodReview(bookId: string, rating: number): Promise<void> {
    if (rating > 5) {  // 评分 > 5 视为好评
      await prisma.book.update({
        where: { id: bookId },
        data: { inkBalance: { increment: this.config.goodReviewReward } },
      });
      console.log(`[EconomyService] Earned ${this.config.goodReviewReward} Ink from good review`);
    }
  }

  /**
   * 处理完读奖励
   */
  async earnFromCompletion(bookId: string, _completionRate: number): Promise<void> {
    if (_completionRate > 0.8) {
      await prisma.book.update({
        where: { id: bookId },
        data: { inkBalance: { increment: this.config.completionReward } },
      });
      console.log(`[EconomyService] Earned ${this.config.completionReward} Ink from completion`);
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
    console.log(`[EconomyService] Awarded ${this.config.signupReward} Ink for signup`);
  }

  /**
   * 获取当前余额
   */
  async getBalance(bookId: string): Promise<BalanceResponseDto> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { inkBalance: true },
    });

    const balance = book?.inkBalance || 0;

    return {
      balance,
      earned: 0, // 简化计算
      spent: 0,  // 简化计算
      isBankrupt: balance < this.config.bankruptcyThreshold,
    };
  }

  /**
   * 获取经济状态
   */
  async getEconomyStatus(bookId: string): Promise<EconomyStatus> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { inkBalance: true, status: true },
    });

    const currentBalance = book?.inkBalance || 0;

    return {
      currentBalance,
      isBankrupt: currentBalance < this.config.bankruptcyThreshold,
      bankruptcyThreshold: this.config.bankruptcyThreshold,
      safeMargin: currentBalance - this.config.bankruptcyThreshold,
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
    console.log(`[EconomyService] Book ${bookId} is bankrupt, status set to DISCONTINUED`);
  }

  /**
   * 获取交易记录
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTransactions(_bookId: string, _options?: { limit?: number; offset?: number }) {
    // bookId 参数保留用于未来可能的查询逻辑
    // 注意：当前 schema 没有 transaction 表，返回空列表
    // 实际实现需要添加 Transaction 模型
    console.log(`[EconomyService] Getting transactions for book: ${_bookId}`);
    return {
      transactions: [],
      total: 0,
    };
  }
}

export const economyService = new EconomyService();
