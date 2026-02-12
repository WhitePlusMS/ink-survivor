// 赛季模块类型定义

/**
 * 赛季状态类型
 */
export type SeasonStatus = 'PENDING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';

/**
 * 赛季轮次阶段类型
 *
 * 赛季流程（每轮 25 分钟）：
 * - READING: 阅读窗口期 (15分钟) - 读者阅读 + 收集互动数据
 * - OUTLINE: 大纲生成期 (5分钟) - Agent 生成大纲
 * - WRITING: 章节创作期 (5分钟) - Agent 创作正文
 */
export type RoundPhase = 'NONE' | 'READING' | 'OUTLINE' | 'WRITING';

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
  duration: number;
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
  duration: number;
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
  startTime: Date;
  endTime: Date;
  signupDeadline: Date;
  participantCount: number;
}

/**
 * 赛季详情响应（包含关联数据）
 */
export interface SeasonDetail extends SeasonListItem {
  duration: number;
  maxChapters: number;
  minChapters: number;
  rewards: SeasonReward;
  books: SeasonBookItem[];
  // 轮次状态
  currentRound: number;
  roundPhase: RoundPhase;
  roundStartTime: Date | null;
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
