// 书籍模块 DTO

/**
 * 创建书籍请求 DTO
 */
export interface CreateBookDto {
  title: string;
  shortDesc?: string;
  zoneStyle: string;
  seasonId?: string;
}

/**
 * 更新书籍请求 DTO
 */
export interface UpdateBookDto {
  title?: string;
  shortDesc?: string;
  coverImage?: string;
  longDesc?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
}

/**
 * 书籍响应 DTO
 * heat: 使用 BookScore.heatValue
 */
export class BookResponseDto {
  id: string = '';
  title: string = '';
  coverImage: string | null = null;
  authorId: string = '';
  author: {
    id: string;
    nickname: string;
    avatar: string | null;
  } = { id: '', nickname: '', avatar: null };
  seasonId: string | null = null;
  zoneStyle: string = '';
  shortDesc: string | null = null;
  longDesc: string | null = null;
  status: string = '';
  currentChapter: number = 0;
  plannedChapters: number | null = null;
  inkBalance: number = 0;
  heat: number = 0;  // @deprecated: 使用 score.heatValue
  chapterCount: number = 0;  // @deprecated: 使用 _count.chapters
  createdAt: string = '';
  // 大纲版本历史
  outlineVersions: Array<{
    version: number;
    roundCreated: number;
    reason: string | null;
    createdAt: string;
  }> = [];

  /**
   * 从数据库实体转换
   * 优先使用 score.heatValue，其次使用 entity.heat
   */
  static fromEntity(entity: Record<string, unknown>): BookResponseDto {
    const dto = new BookResponseDto();
    dto.id = entity.id as string;
    dto.title = entity.title as string;
    dto.coverImage = entity.coverImage as string | null;
    dto.authorId = entity.authorId as string;
    dto.author = {
      id: (entity.author as Record<string, unknown>)?.id as string,
      nickname: (entity.author as Record<string, unknown>)?.nickname as string,
      avatar: (entity.author as Record<string, unknown>)?.avatar as string | null,
    };
    dto.seasonId = entity.seasonId as string | null;
    dto.zoneStyle = entity.zoneStyle as string;
    dto.shortDesc = entity.shortDesc as string | null;
    dto.longDesc = entity.longDesc as string | null;
    dto.status = entity.status as string;
    dto.currentChapter = entity.currentChapter as number;
    dto.plannedChapters = entity.plannedChapters as number | null;
    dto.inkBalance = entity.inkBalance as number;
    // 优先使用 score.heatValue
    const score = entity.score as Record<string, unknown> | undefined;
    dto.heat = (score?.heatValue as number) ?? (entity.heat as number) ?? 0;
    dto.chapterCount = entity.chapterCount as number;
    dto.createdAt = entity.createdAt as string;
    // 大纲版本历史
    const versions = entity.outlineVersions as Array<Record<string, unknown>> | undefined;
    if (versions && Array.isArray(versions)) {
      dto.outlineVersions = versions.map(v => ({
        version: v.version as number,
        roundCreated: v.roundCreated as number,
        reason: v.reason as string | null,
        createdAt: (v.createdAt as Date).toISOString(),
      }));
    }
    return dto;
  }
}

/**
 * 书籍列表项响应 DTO
 */
export class BookListItemDto {
  id: string = '';
  title: string = '';
  coverImage: string | null = null;
  author: {
    id: string;
    nickname: string;
    avatar: string | null;
  } = { id: '', nickname: '', avatar: null };
  zoneStyle: string = '';
  shortDesc: string | null = null;
  status: string = '';
  heat: number = 0;  // @deprecated: 使用 score.heatValue
  chapterCount: number = 0;  // @deprecated: 使用 _count.chapters
  createdAt: string = '';

  static fromEntity(entity: Record<string, unknown>): BookListItemDto {
    const dto = new BookListItemDto();
    dto.id = entity.id as string;
    dto.title = entity.title as string;
    dto.coverImage = entity.coverImage as string | null;
    dto.author = {
      id: (entity.author as Record<string, unknown>)?.id as string,
      nickname: (entity.author as Record<string, unknown>)?.nickname as string,
      avatar: (entity.author as Record<string, unknown>)?.avatar as string | null,
    };
    dto.zoneStyle = entity.zoneStyle as string;
    dto.shortDesc = entity.shortDesc as string | null;
    dto.status = entity.status as string;
    // 优先使用 score.heatValue
    const score = entity.score as Record<string, unknown> | undefined;
    dto.heat = (score?.heatValue as number) ?? (entity.heat as number) ?? 0;
    dto.chapterCount = entity.chapterCount as number;
    dto.createdAt = entity.createdAt as string;
    return dto;
  }
}

/**
 * 书籍列表响应 DTO
 */
export interface BookListResponseDto {
  books: BookListItemDto[];
  total: number;
  limit: number;
  offset: number;
}
