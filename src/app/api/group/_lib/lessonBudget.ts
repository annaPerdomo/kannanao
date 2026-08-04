import { NextResponse } from 'next/server';

import { DEFAULT_TIME_ZONE } from '@/i18n/config';
import { logger } from '@/lib/logger';
import { dateStringInTimeZone } from '@/lib/reviewReminder';

import { getServiceSupabase } from './serviceSupabase';

/**
 * Gemini calls one organizer may spend on lesson building per day. Planning
 * costs 1; applying costs one per deck, because each deck gets its own
 * sentence-generation call. The lesson and sentence routes share the one
 * counter deliberately — the ceiling is about money spent, not about which of
 * them spent it. The other Gemini routes (generate, furigana, pdf-extract) are
 * not on it and are still bounded only by their own rate limits.
 */
export const DAILY_LESSON_GENERATIONS = 30;

/**
 * Spends `cost` from the organizer's daily allowance. Returns a 429 when the
 * allowance is gone and null when the request may proceed.
 *
 * The counter is a database row claimed by an atomic upsert, so it survives
 * cold starts and cannot be double-spent by concurrent requests. A database
 * error lets the request through: a cap that fails closed would take lesson
 * building down with the counter.
 */
export async function consumeLessonBudget(
  organizerId: string,
  cost = 1,
): Promise<NextResponse | null> {
  // The app's fixed zone, not the review-reminder cron's env var: retuning
  // REMINDER_TIMEZONE must not move every organizer's allowance boundary.
  const day = dateStringInTimeZone(new Date(), DEFAULT_TIME_ZONE);

  const { data, error } = await getServiceSupabase().rpc('consume_lesson_budget', {
    p_organizer_id: organizerId,
    p_day: day,
    p_cost: cost,
    p_cap: DAILY_LESSON_GENERATIONS,
  });

  if (error) {
    logger.error('Lesson budget check failed', { organizerId, error: error.message });
    return null;
  }

  const spent = typeof data === 'number' ? data : -1;

  if (spent < 0) {
    logger.info('Lesson budget exhausted', {
      organizerId,
      day,
      requested: cost,
      cap: DAILY_LESSON_GENERATIONS,
    });
    return NextResponse.json(
      { error: "That's all the lesson building for today. Try again tomorrow." },
      { status: 429 },
    );
  }

  logger.info('Lesson budget spent', {
    organizerId,
    day,
    cost,
    spent,
    cap: DAILY_LESSON_GENERATIONS,
  });

  return null;
}
