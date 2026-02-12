// 大纲模块 DTO

/**
 * 生成大纲请求 DTO
 */
export interface GenerateOutlineDto {
  forcedChapter?: number;
  forcedEvent?: string;
  endingType?: '开放结局' | '封闭结局' | '悲剧结局' | '喜剧结局';
}

/**
 * 大纲响应 DTO
 */
export class OutlineResponseDto {
  id: string = '';
  bookId: string = '';
  originalIntent: string = '';
  characters: unknown[] = [];
  chapters: unknown[] = [];
  themes: string[] = [];
  tone: string = '';
  createdAt: string = '';
  updatedAt: string = '';

  static fromEntity(entity: Record<string, unknown>): OutlineResponseDto {
    const dto = new OutlineResponseDto();
    dto.id = entity.id;
    dto.bookId = entity.bookId;
    dto.originalIntent = entity.originalIntent;
    dto.characters = JSON.parse(entity.characters || '[]');
    dto.chapters = JSON.parse(entity.chaptersPlan || '[]');
    dto.themes = [];
    dto.tone = '';
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

/**
 * 更新章节计划请求 DTO
 */
export interface UpdateChapterPlanDto {
  title?: string;
  summary?: string;
  key_events?: string[];
  word_count_target?: number;
}
