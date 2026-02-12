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
  heat: number = 0;
  chapterCount: number = 0;
  createdAt: string = '';

  /**
   * 从数据库实体转换
   */
  static fromEntity(entity: any): BookResponseDto {
    const dto = new BookResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.coverImage = entity.coverImage;
    dto.authorId = entity.authorId;
    dto.author = {
      id: entity.author.id,
      nickname: entity.author.nickname,
      avatar: entity.author.avatar,
    };
    dto.seasonId = entity.seasonId;
    dto.zoneStyle = entity.zoneStyle;
    dto.shortDesc = entity.shortDesc;
    dto.longDesc = entity.longDesc;
    dto.status = entity.status;
    dto.currentChapter = entity.currentChapter;
    dto.plannedChapters = entity.plannedChapters;
    dto.inkBalance = entity.inkBalance;
    dto.heat = entity.heat;
    dto.chapterCount = entity.chapterCount;
    dto.createdAt = entity.createdAt;
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
  heat: number = 0;
  chapterCount: number = 0;
  createdAt: string = '';

  static fromEntity(entity: any): BookListItemDto {
    const dto = new BookListItemDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.coverImage = entity.coverImage;
    dto.author = {
      id: entity.author.id,
      nickname: entity.author.nickname,
      avatar: entity.author.avatar,
    };
    dto.zoneStyle = entity.zoneStyle;
    dto.shortDesc = entity.shortDesc;
    dto.status = entity.status;
    dto.heat = entity.heat;
    dto.chapterCount = entity.chapterCount;
    dto.createdAt = entity.createdAt;
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
