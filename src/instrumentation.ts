import { seasonAutoAdvanceService } from '@/services/season-auto-advance.service';

export const runtime = 'nodejs';

console.log('[Instrumentation] Loading instrumentation...');

export async function register() {
  console.log('[Instrumentation] Register function called');
  console.log('[Instrumentation] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Instrumentation] VERCEL:', process.env.VERCEL);
  console.log('[Instrumentation] SEASON_AUTO_ADVANCE_ENABLED:', process.env.SEASON_AUTO_ADVANCE_ENABLED);

  if (process.env.NODE_ENV === 'test') {
    console.log('[Instrumentation] Skipping in test mode');
    return;
  }
  if (process.env.VERCEL) {
    console.log('[Instrumentation] Skipping on Vercel (use cron)');
    return;
  }
  if (process.env.SEASON_AUTO_ADVANCE_ENABLED === 'false') {
    console.log('[Instrumentation] Auto-advance disabled by env');
    return;
  }

  console.log('[Instrumentation] Starting auto-advance service...');
  await seasonAutoAdvanceService.start();
  console.log('[Instrumentation] Auto-advance service started!');
}
