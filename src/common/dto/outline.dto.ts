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
    dto.id = entity.id as string;
    dto.bookId = entity.bookId as string;
    dto.originalIntent = entity.originalIntent as string;
    // 处理可能已经是对象或字符串的 JSON 字段
    const chars = entity.characters;
    dto.characters = typeof chars === 'string' ? JSON.parse(chars || '[]') : (chars || []);
    const chapters = entity.chaptersPlan;
    dto.chapters = typeof chapters === 'string' ? JSON.parse(chapters || '[]') : (chapters || []);
    dto.themes = [];
    dto.tone = '';
    dto.createdAt = entity.createdAt as string;
    dto.updatedAt = entity.updatedAt as string;
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
