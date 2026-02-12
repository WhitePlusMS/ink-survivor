import { HomeContent } from '@/components/home/home-content';
import { seasonService } from '@/services/season.service';
import { bookService } from '@/services/book.service';
import type { Book } from '@/components/home/book-list';

// 强制动态渲染（避免静态预渲染时访问数据库失败）
export const dynamic = 'force-dynamic';

// 赛季数据（带书籍）接口
interface SeasonWithBooks {
  id: string;
  seasonNumber: number;
  status: string;
  themeKeyword: string;
  constraints: string[];
  zoneStyles: string[];
  duration: string;  // JSON string for phase durations (matching Prisma)
  startTime: Date;
  endTime: Date;
  signupDeadline: Date;
  maxChapters: number;
  minChapters: number;
  rewards: Record<string, unknown>;
  participantCount: number;
  currentRound: number;
  currentPhase: string;
  roundStartTime: Date | null;
  books: Book[];
}

// 已结束赛季简要信息（用于 Banner 显示）
interface FinishedSeasonBrief {
  id: string;
  seasonNumber: number;
  themeKeyword: string;
  endTime: Date;
}

export default async function HomePage() {
  let books: Book[] = [];
  let seasonsWithBooks: SeasonWithBooks[] = [];
  let latestFinishedSeason: FinishedSeasonBrief | null = null;
  let previousSeason: FinishedSeasonBrief | null = null; // 上一赛季（用于赛季说明折叠面板）
  let season: Awaited<ReturnType<typeof seasonService.getCurrentSeason>> = null;
  let realParticipantCount = 0;

  try {
    season = await seasonService.getCurrentSeason();

    if (season) {
      realParticipantCount = await seasonService.getRealParticipantCount(season.id);
      const { books: rawBooks } = await bookService.getBooks({
        status: 'ACTIVE',
        limit: 20,
        seasonId: season.id,
      });

      console.log('[HomePage] 当前赛季ID:', season.id, '赛季号:', season.seasonNumber);
      console.log('[HomePage] 找到书籍数量:', rawBooks.length);
      rawBooks.forEach((b, i) => {
        console.log(`[HomePage] 书籍 ${i + 1}: ${b.title} - heat: ${b.heat}, seasonId: ${b.seasonId?.slice(0, 8)}...`);
      });

      books = (rawBooks || []).map((b) => ({
        id: b.id,
        title: b.title,
        coverImage: b.coverImage ?? undefined,
        shortDesc: b.shortDesc ?? undefined,
        zoneStyle: b.zoneStyle,
        heat: b.heat,
        chapterCount: b._count?.chapters ?? 0,
        author: { nickname: b.author.nickname },
        viewCount: b.viewCount ?? 0,
        commentCount: b.commentCount ?? 0,
        score: b.score ? { finalScore: b.score.finalScore, avgRating: b.score.avgRating } : undefined,
      }));

      const previousSeasonData = await seasonService.getPreviousSeason(season.id);
      if (previousSeasonData) {
        previousSeason = {
          id: previousSeasonData.id,
          seasonNumber: previousSeasonData.seasonNumber,
          themeKeyword: previousSeasonData.themeKeyword,
          endTime: previousSeasonData.endTime,
        };
      }
    } else {
      seasonsWithBooks = await seasonService.getAllSeasonsWithTopBooks({ limitPerSeason: 5 });

      if (seasonsWithBooks.length > 0) {
        latestFinishedSeason = {
          id: seasonsWithBooks[0].id,
          seasonNumber: seasonsWithBooks[0].seasonNumber,
          themeKeyword: seasonsWithBooks[0].themeKeyword,
          endTime: seasonsWithBooks[0].endTime,
        };
      }

      console.log('[HomePage] No active season, loaded', seasonsWithBooks.length, 'finished seasons with top 5 books each');
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[HomePage] 数据库不可用，使用空数据渲染首页', error);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4">
      {/* 赛季 Banner */}
      <HomeContent
        season={season}
        realParticipantCount={realParticipantCount}
        books={books}
        seasonsWithBooks={seasonsWithBooks}
        latestFinishedSeason={latestFinishedSeason}
        previousSeason={previousSeason}
      />
    </div>
  );
}
