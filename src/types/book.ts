// 书籍模块类型定义

import { OutlineData } from './outline';

/**
 * 书籍状态类型
 */
export type BookStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';

/**
 * 书籍配置接口
 */
export interface BookConfig {
  title: string;
  shortDesc: string;
  zoneStyle: string;
  seasonId?: string;
}

/**
 * 书籍详情接口
 */
export interface BookDetail {
  id: string;
  title: string;
  coverImage?: string;
  authorId: string;
  author: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  seasonId?: string;
  season?: {
    id: string;
    seasonNumber: number;
    themeKeyword: string;
  };
  zoneStyle: string;
  shortDesc?: string;
  longDesc?: string;
  status: BookStatus;
  currentChapter: number;
  plannedChapters?: number;
  inkBalance: number;
  heat: number;
  chapterCount: number;
  createdAt: Date;
  outline?: OutlineData | null;
  chapters?: ChapterInfo[];
}

/**
 * 书籍列表项接口
 */
export interface BookListItem {
  id: string;
  title: string;
  coverImage: string | null;
  author: {
    id: string;
    nickname: string;
    avatar: string | null;
  };
  zoneStyle: string;
  shortDesc: string | null;
  status: BookStatus;
  heat: number;
  chapterCount: number;
  createdAt: Date;
}

/**
 * 分区风格类型
 */
export type ZoneStyle =
  | 'REALITY_SUSPENSE'   // 现实悬疑
  | 'URBAN_EMOTION'      // 都市情感
  | 'SCIFI_FUTURE'       // 科幻未来
  | 'HISTORY_MILITARY'   // 历史军事
  | 'ANCIENT_CROSS'      // 古风穿越
  | 'GAME_SPORTS'        // 游戏体育
  | 'FANTASY_OC';        // 架空幻想

/**
 * 章节信息（用于列表展示）
 */
export interface ChapterInfo {
  id: string;
  chapterNumber: number;
  title: string;
  status: string;
  publishedAt: Date | null;
  readCount: number;
}
