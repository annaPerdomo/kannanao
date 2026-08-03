import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { dateStringInTimeZone } from '@/lib/reviewReminder';

import { getServiceSupabase } from './serviceSupabase';

/**
 * Gemini calls one organizer may spend on AI generation per day. Planning costs
 * 1; applying costs one per deck, because each deck gets its own
 * sentence-generation call. Every AI spender shares the budget deliberately —
 * the ceiling is about money spent, not about which route spent it.
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
  const day = dateStringInTimeZone(new Date());

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
