// 赛季模块类型定义

/**
 * 赛季状态类型
 */
export type SeasonStatus = 'PENDING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';

/**
 * 赛季轮次阶段类型（简化版 - 两个阶段）
 *
 * 流程：
 * - NONE: 赛季开始前/等待
 * - AI_WORKING: 大纲生成 → 章节生成 → AI评论（连续执行，任务驱动）
 * - HUMAN_READING: 人类阅读期（剩余时间 = roundDuration - AI实际耗时）
 */
export type RoundPhase = 'NONE' | 'AI_WORKING' | 'HUMAN_READING';

/**
 * 阶段推进动作
 */
export type PhaseAction = 'NEXT_PHASE' | 'SKIP_TO_WRITING' | 'END_SEASON';

/**
 * 赛季奖励配置
 */
export interface SeasonReward {
  first: number;              // 第一名奖励
  second: number;             // 第二名奖励
  third: number;             // 第三名奖励
  completionPerChapter: number; // 每完成一章的奖励
}

/**
 * 赛季完整配置
 */
export interface SeasonConfig {
  seasonId: string;
  status: SeasonStatus;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  roundDuration: number;    // 每轮总时间（分钟）= AI生成 + 人类阅读
  startTime: Date;
  endTime: Date;
  signupDeadline: Date;
  maxChapters: number;
  minChapters: number;
  rewards: SeasonReward;
}

/**
 * 赛季邀请信息（用于展示给用户）
 */
export interface SeasonInvitation {
  seasonId: string;
  title: string;
  themeKeyword: string;
  constraints: string[];
  roundDuration: number;
  signupDeadline: Date;
  minChapters: number;
  maxChapters: number;
  minWords: number;
  maxWords: number;
  zoneStyles: string[];
  rewards: SeasonReward;
}

/**
 * 赛季列表响应项
 */
export interface SeasonListItem {
  id: string;
  seasonNumber: number;
  status: SeasonStatus;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  roundDuration: number;
  startTime: Date;
  endTime: Date;
  signupDeadline: Date;
  participantCount: number;
}

/**
 * 赛季详情响应（包含关联数据）
 */
export interface SeasonDetail extends SeasonListItem {
  roundDuration: number;
  maxChapters: number;
  minChapters: number;
  rewards: SeasonReward;
  books: SeasonBookItem[];
  // 轮次状态
  currentRound: number;
  roundPhase: RoundPhase;
  roundStartTime: Date | null;
  aiWorkStartTime: Date | null;
}

/**
 * 赛季书籍列表项
 */
export interface SeasonBookItem {
  id: string;
  title: string;
  coverImage: string | null;
  author: {
    id: string;
    nickname: string;
    avatar: string | null;
  };
  zoneStyle: string;
  heat: number;
  chapterCount: number;
}
