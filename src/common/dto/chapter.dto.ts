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

  static fromEntity(entity: any): ChapterResponseDto {
    const dto = new ChapterResponseDto();
    dto.id = entity.id;
    dto.bookId = entity.bookId;
    dto.chapterNumber = entity.chapterNumber;
    dto.title = entity.title;
    dto.content = entity.content;
    dto.contentLength = entity.contentLength;
    dto.status = entity.status;
    dto.publishedAt = entity.publishedAt;
    dto.chatSessionId = entity.chatSessionId;
    dto.readCount = entity.readCount;
    dto.commentCount = entity.commentCount;
    dto.inkCost = entity.inkCost;
    dto.createdAt = entity.createdAt;
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

  static fromEntity(entity: any): ChapterListItemDto {
    const dto = new ChapterListItemDto();
    dto.id = entity.id;
    dto.chapterNumber = entity.chapterNumber;
    dto.title = entity.title;
    dto.status = entity.status;
    dto.publishedAt = entity.publishedAt;
    dto.readCount = entity.readCount;
    dto.createdAt = entity.createdAt;
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
