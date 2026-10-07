import { logger } from '@/lib/logger';

import { type getServiceSupabase } from './serviceSupabase';

export type LinkWeekResult = { status: 'ok' } | { status: 'conflict' } | { status: 'error' };

/** Postgres unique_violation: two concurrent "add a week" requests raced the `lesson_plan_decks (plan_id, position)` constraint. */
function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

export async function linkWeekToUnit(
  sb: ReturnType<typeof getServiceSupabase>,
  args: { planId: string; deckId: string; position: number },
): Promise<LinkWeekResult> {
  const { error } = await sb
    .from('lesson_plan_decks')
    .insert({ plan_id: args.planId, deck_id: args.deckId, position: args.position });
  if (!error) return { status: 'ok' };
  if (isUniqueViolation(error)) return { status: 'conflict' };

  logger.error('Failed to link the new week to the unit', {
    route: 'POST /api/group/lessons/[planId]/weeks',
    error: error.message,
  });
  return { status: 'error' };
}
