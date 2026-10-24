import type { SupabaseClient } from '@supabase/supabase-js';

import { buildDemoSeed } from '@/lib/demo';
import { logger } from '@/lib/logger';

import { ensureAccount } from './ensureAccount';
import { insertAssignments, insertDeckAndCards, insertGroup, insertLearnerHistory } from './insert';
import { demoGroupIsRecent, wipeDemoData } from './wipe';

export type ResetDemoResult =
  | { ok: true; skipped: 'recent' }
  | { ok: true; learners: number; cards: number; progressRows: number };

/** Rebuilds the demo teacher, demo group and demo learners from the simulator. Idempotent. */
export async function resetDemo(sb: SupabaseClient, now: Date): Promise<ResetDemoResult> {
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error('DEMO_PASSWORD is not set');

  const seed = buildDemoSeed(now);

  const teacherId = await ensureAccount(sb, password, {
    username: seed.organizer.username,
    displayName: seed.organizer.displayName,
    accountType: 'organizer',
  });

  // A second cron invocation (retry, overlapping schedule) must not race the
  // wipe/insert of the one already in flight or just finished.
  if (await demoGroupIsRecent(sb, teacherId, now)) {
    logger.info('Demo reset skipped — a run finished in the last 5 minutes', {
      route: '/api/cron/demo-reset',
    });
    return { ok: true, skipped: 'recent' };
  }

  const learnerIds = new Map<string, string>();
  for (const learner of seed.learners) {
    const id = await ensureAccount(sb, password, {
      username: learner.username,
      displayName: learner.displayName,
      accountType: 'member',
    });
    learnerIds.set(learner.username, id);
  }

  await wipeDemoData(sb, teacherId, [...learnerIds.values()]);

  const groupId = await insertGroup(sb, teacherId, seed, learnerIds);
  const deckId = await insertDeckAndCards(sb, teacherId, seed);
  await insertAssignments(sb, teacherId, groupId, deckId, seed, learnerIds);

  let progressRows = 0;
  for (const learner of seed.learners) {
    const learnerId = learnerIds.get(learner.username);
    if (!learnerId) continue;
    progressRows += await insertLearnerHistory(sb, deckId, learner, learnerId, now);
  }

  logger.info('Demo reset complete', {
    route: '/api/cron/demo-reset',
    learners: seed.learners.length,
    cards: seed.cards.length,
    progressRows,
  });

  return { ok: true, learners: seed.learners.length, cards: seed.cards.length, progressRows };
}
