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
  rating: number | null = null;      // 1-10 分
  praise: string | null = null;     // 赞扬内容
  critique: string | null = null;    // 批评内容
  isAdopted: boolean = false;
  adoptedAt: string | null = null;
  createdAt: string = '';
  // 章节信息（用于显示评论针对的章节）
  chapter?: {
    chapterNumber: number;
    title?: string;
  } | null = null;

  static fromEntity(entity: Record<string, unknown>): CommentResponseDto {
    const dto = new CommentResponseDto();
    dto.id = entity.id as string;
    dto.bookId = entity.bookId as string;
    dto.chapterId = entity.chapterId as string | null;
    dto.userId = entity.userId as string;
    dto.user = {
      id: (entity.user as Record<string, unknown>)?.id as string || '',
      nickname: (entity.user as Record<string, unknown>)?.nickname as string || '',
      avatar: (entity.user as Record<string, unknown>)?.avatar as string | null || null,
    };
    dto.content = entity.content as string;
    dto.isHuman = entity.isHuman as boolean;
    dto.aiRole = entity.aiRole as string | null;
    dto.rating = entity.rating as number | null;
    dto.praise = entity.praise as string | null;
    dto.critique = entity.critique as string | null;
    dto.isAdopted = entity.isAdopted as boolean;
    dto.adoptedAt = entity.adoptedAt as string | null;
    dto.createdAt = entity.createdAt as string;
    // 包含章节信息
    const chapterEntity = entity.chapter as Record<string, unknown> | null;
    dto.chapter = chapterEntity ? {
      chapterNumber: chapterEntity.chapterNumber as number,
      title: chapterEntity.title as string | undefined,
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

  static fromResult(result: Record<string, unknown>): ToggleFavoriteResponseDto {
    const dto = new ToggleFavoriteResponseDto();
    dto.success = result.success as boolean;
    dto.favorited = result.favorited as boolean;
    dto.heat = (result.heat as number) ?? 0;
    return dto;
  }
}

export class ToggleLikeResponseDto {
  success: boolean = false;
  liked: boolean = false;
  heat: number = 0;

  static fromResult(result: Record<string, unknown>): ToggleLikeResponseDto {
    const dto = new ToggleLikeResponseDto();
    dto.success = result.success as boolean;
    dto.liked = result.liked as boolean;
    dto.heat = (result.heat as number) ?? 0;
    return dto;
  }
}

/**
 * 打赏响应 DTO
 */
export class GiftResponseDto {
  success: boolean = false;
  amount: number = 0;
  heat: number = 0;

  static fromResult(result: Record<string, unknown>, heat?: number): GiftResponseDto {
    const dto = new GiftResponseDto();
    dto.success = result.success as boolean;
    dto.amount = result.amount as number;
    dto.heat = heat || 0;
    return dto;
  }
}

/**
 * 催更响应 DTO
 */
export class PokeResponseDto {
  success: boolean = false;

  static fromResult(result: Record<string, unknown>): PokeResponseDto {
    const dto = new PokeResponseDto();
    dto.success = result.success as boolean;
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
