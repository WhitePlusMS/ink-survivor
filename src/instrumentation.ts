import { seasonAutoAdvanceService } from '@/services/season-auto-advance.service';

export const runtime = 'nodejs';

export async function register() {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  if (process.env.VERCEL) {
    return;
  }
  if (process.env.SEASON_AUTO_ADVANCE_ENABLED === 'false') {
    return;
  }
  await seasonAutoAdvanceService.start();
}
