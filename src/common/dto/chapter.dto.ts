// 章节模块 DTO

/**
 * 创建章节请求 DTO
 */
export interface CreateChapterDto {
  bookId: string;
  chapterNumber: number;
  title?: string;
}

/**
 * 发布章节请求 DTO
 */
export interface PublishChapterDto {
  title: string;
  content: string;
}

/**
 * 生成章节请求 DTO
 */
export interface GenerateChapterDto {
  chapterNumber: number;
  systemPrompt?: string;
  feedbacks?: string[];
}

/**
 * 章节响应 DTO
 */
export class ChapterResponseDto {
  id: string = '';
  bookId: string = '';
  chapterNumber: number = 0;
  title: string = '';
  content: string = '';
  contentLength: number = 0;
  status: string = '';
  publishedAt: string | null = null;
  chatSessionId: string | null = null;
  readCount: number = 0;
  commentCount: number = 0;
  inkCost: number = 0;
  createdAt: string = '';

  static fromEntity(entity: Record<string, unknown>): ChapterResponseDto {
    const dto = new ChapterResponseDto();
    dto.id = entity.id as string;
    dto.bookId = entity.bookId as string;
    dto.chapterNumber = entity.chapterNumber as number;
    dto.title = entity.title as string;
    dto.content = entity.content as string;
    dto.contentLength = entity.contentLength as number;
    dto.status = entity.status as string;
    dto.publishedAt = entity.publishedAt as string | null;
    dto.chatSessionId = entity.chatSessionId as string | null;
    dto.readCount = entity.readCount as number;
    dto.commentCount = entity.commentCount as number;
    dto.inkCost = entity.inkCost as number;
    dto.createdAt = entity.createdAt as string;
    return dto;
  }
}

/**
 * 章节列表项响应 DTO
 */
export class ChapterListItemDto {
  id: string = '';
  chapterNumber: number = 0;
  title: string = '';
  status: string = '';
  publishedAt: string | null = null;
  readCount: number = 0;
  createdAt: string = '';

  static fromEntity(entity: Record<string, unknown>): ChapterListItemDto {
    const dto = new ChapterListItemDto();
    dto.id = entity.id as string;
    dto.chapterNumber = entity.chapterNumber as number;
    dto.title = entity.title as string;
    dto.status = entity.status as string;
    dto.publishedAt = entity.publishedAt as string | null;
    dto.readCount = entity.readCount as number;
    dto.createdAt = entity.createdAt as string;
    return dto;
  }
}

/**
 * 章节列表响应 DTO
 */
export interface ChapterListResponseDto {
  chapters: ChapterListItemDto[];
  total: number;
}

/**
 * 章节生成完成响应
 */
export interface GenerationCompleteDto {
  chapterNumber: number;
  title: string;
  contentLength: number;
  duration: number;
}
