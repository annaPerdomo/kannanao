import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Gemini calls one organizer may spend on lesson building per day. Planning
 * costs 1; applying costs one per deck, because each deck gets its own
 * sentence-generation call. Plan and apply share the budget deliberately —
 * the ceiling is about money spent, not about which route spent it.
 */
export const DAILY_LESSON_GENERATIONS = 30;

interface BudgetEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, BudgetEntry>();

/**
 * Spends `cost` from the organizer's daily allowance. Returns a 429 when the
 * allowance is gone and null when the request may proceed.
 */
export function consumeLessonBudget(organizerId: string, cost = 1): NextResponse | null {
  const now = Date.now();
  const entry = store.get(organizerId);

  if (!entry || now - entry.windowStart >= DAY_MS) {
    store.set(organizerId, { count: cost, windowStart: now });
    return null;
  }

  if (entry.count + cost <= DAILY_LESSON_GENERATIONS) {
    entry.count += cost;
    return null;
  }

  logger.info('Lesson budget exhausted', {
    organizerId,
    spent: entry.count,
    requested: cost,
    cap: DAILY_LESSON_GENERATIONS,
  });

  const retryAfterSecs = Math.ceil((DAY_MS - (now - entry.windowStart)) / 1000);
  return NextResponse.json(
    { error: "That's all the lesson building for today. Try again tomorrow." },
    { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } },
  );
}

/** Visible for testing — clears every organizer's allowance. */
export function _resetLessonBudget() {
  store.clear();
}
