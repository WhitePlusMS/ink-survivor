-- 数据库索引优化脚本
-- 只添加索引，不改变现有表结构
-- 执行前请确认数据库连接

-- ===== Season 表 =====
CREATE INDEX IF NOT EXISTS "Season_status_idx" ON "Season"(status);

-- ===== SeasonParticipation 表 =====
CREATE INDEX IF NOT EXISTS "SeasonParticipation_seasonId_idx" ON "SeasonParticipation"(seasonId);
CREATE INDEX IF NOT EXISTS "SeasonParticipation_userId_idx" ON "SeasonParticipation"(userId);

-- ===== Book 表 =====
CREATE INDEX IF NOT EXISTS "Book_authorId_idx" ON "Book"(authorId);
CREATE INDEX IF NOT EXISTS "Book_seasonId_idx" ON "Book"(seasonId);
CREATE INDEX IF NOT EXISTS "Book_zoneStyle_idx" ON "Book"(zoneStyle);
CREATE INDEX IF NOT EXISTS "Book_status_idx" ON "Book"(status);
CREATE INDEX IF NOT EXISTS "Book_createdAt_idx" ON "Book"(createdAt);

-- ===== Chapter 表 =====
CREATE INDEX IF NOT EXISTS "Chapter_bookId_idx" ON "Chapter"(bookId);
CREATE INDEX IF NOT EXISTS "Chapter_status_idx" ON "Chapter"(status);
CREATE INDEX IF NOT EXISTS "Chapter_publishedAt_idx" ON "Chapter"(publishedAt);

-- ===== BookScore 表 (关键索引) =====
CREATE INDEX IF NOT EXISTS "BookScore_heatValue_idx" ON "BookScore"(heatValue);
CREATE INDEX IF NOT EXISTS "BookScore_finalScore_idx" ON "BookScore"(finalScore);
CREATE INDEX IF NOT EXISTS "BookScore_viewCount_idx" ON "BookScore"(viewCount);
CREATE INDEX IF NOT EXISTS "BookScore_likeCount_idx" ON "BookScore"(likeCount);

-- ===== Comment 表 =====
CREATE INDEX IF NOT EXISTS "Comment_bookId_idx" ON "Comment"(bookId);
CREATE INDEX IF NOT EXISTS "Comment_chapterId_idx" ON "Comment"(chapterId);
CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"(userId);
CREATE INDEX IF NOT EXISTS "Comment_isAdopted_idx" ON "Comment"(isAdopted);

-- ===== Leaderboard 表 (已有) =====
-- CREATE INDEX IF NOT EXISTS "Leaderboard_seasonId_zoneStyle_type_idx" ON "Leaderboard"(seasonId, zoneStyle, type);

-- 验证索引是否创建成功
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%_idx%'
ORDER BY tablename, indexname;
