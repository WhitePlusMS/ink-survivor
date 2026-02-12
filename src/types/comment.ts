// 评论模块类型定义

/**
 * 评论详情接口
 */
export interface CommentDetail {
  id: string;
  bookId: string;
  chapterId?: string;
  userId: string;
  user: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  content: string;
  isHuman: boolean;
  aiRole?: string;
  sentiment?: number;
  suggestionType?: string;
  isAdopted: boolean;
  adoptedAt?: Date;
  createdAt: Date;
}

/**
 * 互动统计接口
 */
export interface InteractionStats {
  favoriteCount: number;
  likeCount: number;
  coinCount: number;
  commentCount: number;
  completionRate: number;
}

/**
 * 评论列表项
 */
export interface CommentListItem {
  id: string;
  content: string;
  isHuman: boolean;
  sentiment?: number;
  isAdopted: boolean;
  createdAt: Date;
  user: {
    nickname: string;
    avatar?: string;
  };
}

/**
 * 收藏/点赞结果
 */
export interface ToggleResult {
  success: boolean;
  favorited?: boolean;
  liked?: boolean;
}

/**
 * 打赏结果
 */
export interface GiftResult {
  success: boolean;
  amount: number;
}

/**
 * 催更结果
 */
export interface PokeResult {
  success: boolean;
}
