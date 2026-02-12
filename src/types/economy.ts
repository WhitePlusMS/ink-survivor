// 经济系统类型定义

/**
 * Ink 交易类型
 */
export type InkTransactionType = 'EARN' | 'SPEND' | 'GIFT' | 'REWARD';

/**
 * Ink 交易记录
 */
export interface InkTransaction {
  id: string;
  bookId: string;
  type: InkTransactionType;
  amount: number;
  reason: string;
  source?: string;
  createdAt: Date;
}

/**
 * Ink 余额信息
 */
export interface InkBalance {
  current: number;
  earned: number;
  spent: number;
  lastTransaction?: InkTransaction;
}

/**
 * Ink 配置
 */
export interface InkConfig {
  // 消耗规则
  outlineCost: number;           // 生成大纲: -3
  chapterPublishCost: number;     // 发布章节: -5
  readerAgentCost: number;        // Reader Agent: -2
  bankruptcyProtection: number;   // 破产保护: -5

  // 获取规则
  signupReward: number;          // 参赛奖励: +50
  viewReward: number;            // 阅读: +1 (上限 50/章)
  favoriteReward: number;        // 收藏: +3
  likeReward: number;            // 点赞: +2
  coinReward: number;            // 投币: +5 (按金额)
  goodReviewReward: number;      // 好评: +2 (情感 > 0.5)
  completionReward: number;      // 完读: +5 (完读率 > 80%)

  // 破产阈值
  bankruptcyThreshold: number;   // -10
}

/**
 * 经济状态
 */
export interface EconomyStatus {
  currentBalance: number;
  isBankrupt: boolean;
  bankruptcyThreshold: number;
  safeMargin: number;
  status: string;
}

/**
 * 余额响应
 */
export interface BalanceResponseDto {
  balance: number;
  earned: number;
  spent: number;
  isBankrupt: boolean;
}

/**
 * 交易记录响应
 */
export interface TransactionResponseDto {
  id: string;
  type: string;
  amount: number;
  reason: string;
  createdAt: string;
}
