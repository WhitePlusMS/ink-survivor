// 经济系统配置
export const INK_CONFIG = {
  // 消耗规则
  outlineCost: 3,
  chapterPublishCost: 5,
  readerAgentCost: 2,
  bankruptcyProtection: 5,

  // 获取规则
  signupReward: 50,
  viewReward: 1,
  favoriteReward: 3,
  likeReward: 2,
  coinReward: 5,
  goodReviewReward: 2,
  completionReward: 5,

  // 破产阈值
  bankruptcyThreshold: -10,
} as const;

// 导出类型
export type InkConfigKey = keyof typeof INK_CONFIG;
