// 评论模块 DTO

/**
 * 创建评论请求 DTO
 */
export interface CreateCommentDto {
  bookId: string;
  chapterId?: string;
  content: string;
  isHuman: boolean;
  aiRole?: string;
}

/**
 * 采纳评论请求 DTO
 */
export interface AdoptCommentDto {
  commentId: string;
}

/**
 * 收藏请求 DTO
 */
export interface FavoriteDto {
  bookId: string;
}

/**
 * 点赞请求 DTO
 */
export interface LikeDto {
  bookId: string;
}

/**
 * 打赏请求 DTO
 */
export interface GiftDto {
  bookId: string;
  amount: number;
}

/**
 * 催更请求 DTO
 */
export interface PokeDto {
  bookId: string;
}

/**
 * 评论响应 DTO
 */
export class CommentResponseDto {
  id: string = '';
  bookId: string = '';
  chapterId: string | null = null;
  userId: string = '';
  user: {
    id: string;
    nickname: string;
    avatar: string | null;
  } = { id: '', nickname: '', avatar: null };
  content: string = '';
  isHuman: boolean = false;
  aiRole: string | null = null;
  sentiment: number | null = null;
  suggestionType: string | null = null;
  isAdopted: boolean = false;
  adoptedAt: string | null = null;
  createdAt: string = '';
  // 章节信息（用于显示评论针对的章节）
  chapter?: {
    chapterNumber: number;
    title?: string;
  } | null = null;

  static fromEntity(entity: any): CommentResponseDto {
    const dto = new CommentResponseDto();
    dto.id = entity.id;
    dto.bookId = entity.bookId;
    dto.chapterId = entity.chapterId;
    dto.userId = entity.userId;
    dto.user = {
      id: entity.user?.id || '',
      nickname: entity.user?.nickname || '',
      avatar: entity.user?.avatar || null,
    };
    dto.content = entity.content;
    dto.isHuman = entity.isHuman;
    dto.aiRole = entity.aiRole;
    dto.sentiment = entity.sentiment;
    dto.suggestionType = entity.suggestionType;
    dto.isAdopted = entity.isAdopted;
    dto.adoptedAt = entity.adoptedAt;
    dto.createdAt = entity.createdAt;
    // 包含章节信息
    dto.chapter = entity.chapter ? {
      chapterNumber: entity.chapter.chapterNumber,
      title: entity.chapter.title || undefined,
    } : null;
    return dto;
  }
}

/**
 * 评论列表响应 DTO
 */
export interface CommentListResponseDto {
  comments: CommentResponseDto[];
  total: number;
}

/**
 * 收藏/点赞响应 DTO
 */
export class ToggleFavoriteResponseDto {
  success: boolean = false;
  favorited: boolean = false;
  heat: number = 0;

  static fromResult(result: any): ToggleFavoriteResponseDto {
    const dto = new ToggleFavoriteResponseDto();
    dto.success = result.success;
    dto.favorited = result.favorited;
    dto.heat = result.heat ?? 0;
    return dto;
  }
}

export class ToggleLikeResponseDto {
  success: boolean = false;
  liked: boolean = false;
  heat: number = 0;

  static fromResult(result: any): ToggleLikeResponseDto {
    const dto = new ToggleLikeResponseDto();
    dto.success = result.success;
    dto.liked = result.liked;
    dto.heat = result.heat ?? 0;
    return dto;
  }
}

/**
 * 打赏响应 DTO
 */
export class GiftResponseDto {
  success: boolean = false;
  amount: number = 0;

  static fromResult(result: any): GiftResponseDto {
    const dto = new GiftResponseDto();
    dto.success = result.success;
    dto.amount = result.amount;
    return dto;
  }
}

/**
 * 催更响应 DTO
 */
export class PokeResponseDto {
  success: boolean = false;

  static fromResult(result: any): PokeResponseDto {
    const dto = new PokeResponseDto();
    dto.success = result.success;
    return dto;
  }
}

/**
 * 评论统计响应 DTO
 */
export interface CommentStatsResponseDto {
  total: number;
  humanComments: number;
  aiComments: number;
  adoptedComments: number;
}
