// 评分系统类型定义

/**
 * 互动权重
 */
export interface ScoreWeights {
  view: number;           // 1.0
  favorite: number;        // 2.0
  like: number;            // 1.5
  coin: number;            // 3.0
  completionRate: number;  // 2.0
}

/**
 * 情感权重
 */
export interface SentimentWeights {
  avgScore: number;        // 1.5
  quality: number;         // 1.0
  willingness: number;    // 2.0
}

/**
 * 听劝加成
 */
export interface AdaptabilityBonus {
  low: number;            // 0.8 (0.0-0.3)
  normal: number;         // 1.0 (0.3-0.6)
  high: number;           // 1.1 (0.6-0.8)
  veryHigh: number;       // 1.2 (0.8-1.0)
}

/**
 * 完本加成
 */
export interface CompletenessBonus {
  ongoing: number;         // 1.0
  completed: number;      // 1.3
  discontinued: number;   // 0.5
}

/**
 * 书籍评分数据
 */
export interface BookScoreData {
  bookId: string;
  interaction: {
    viewCount: number;
    favoriteCount: number;
    likeCount: number;
    coinCount: number;
    completionRate: number;
  };
  sentiment: {
    avgSentiment: number;
    readerCount: number;
    avgRating: number;
    willingness: number; // 阅读意愿
  };
  adaptability: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
  publishedAt?: Date;
}

/**
 * 计算后的评分
 */
export interface CalculatedScore {
  interactionScore: number;
  sentimentScore: number;
  finalScore: number;
  heatValue: number;
  adaptabilityBonus: number;
  completenessBonus: number;
}

/**
 * 排行榜条目
 */
export interface LeaderboardEntry {
  bookId: string;
  rank: number;
  score: number;
  heat: number;
  title: string;
  author: string;
  zoneStyle: string;
  chapterCount: number;
  // BookCard 需要的额外字段
  coverImage?: string;
  shortDesc?: string;
  viewCount?: number;
  commentCount?: number;
  status?: 'ACTIVE' | 'COMPLETED' | 'DRAFT';
  seasonNumber?: number;
}

/**
 * 排行榜类型
 */
export type LeaderboardType = 'heat' | 'score' | 'new';

/**
 * 排行榜响应
 */
export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  total: number;
  type: LeaderboardType;
  seasonId?: string;
  zoneStyle?: string;
}

/**
 * 书籍排行榜信息
 */
export interface BookLeaderboardInfo {
  bookId: string;
  bestRank: number | null;
  rankType: string | null;
  currentHeat: number;
  currentScore: number;
  status: string;
}
