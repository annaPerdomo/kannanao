import { expect, test } from '@playwright/test';

import { DEMO_CARDS, demoUuid, planForDay } from '@/lib/demo';
import { CHAIN_STORAGE_KEY } from '@/lib/practiceChain';
import type { CardProgress } from '@/lib/supabase';

import { signIn } from '../helpers/signIn';

test.describe.configure({ timeout: 180_000 });

interface RawCardProgressRow {
  card_id: string;
  correct_count: number;
  wrong_count: number;
  last_reviewed_at: string | null;
  next_review_at: string;
  interval_days: number;
  ease: number;
}

test('demo-maya real launcher matches the simulator', async ({ page }) => {
  test.skip(!process.env.DEMO_PASSWORD, 'DEMO_PASSWORD not set — skipping demo learner check');

  // This check only reads: abort any write a leg page's mount effects
  // attempt, so a dry run can never touch production.
  await page.route('**/rest/v1/**', (route) => {
    const method = route.request().method();
    return method === 'GET' || method === 'HEAD' ? route.continue() : route.abort();
  });

  // Real voice loading is a race; stub it so ttsReady is always false here
  // and below, matching deterministically instead of flaking.
  await page.addInitScript(() => {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.getVoices = () => [];
    }
  });

  // card_progress keys off the real (demoUuid'd) card id; map it back to the
  // simulator's own id so planForDay (which only knows DEMO_CARDS) can read it.
  const idByUuid = new Map(DEMO_CARDS.map((card) => [demoUuid(card.id), card.id]));

  await signIn(page, 'demo-maya', process.env.DEMO_PASSWORD);

  const progressResponse = page.waitForResponse(
    (res) =>
      res.url().includes('/rest/v1/card_progress') &&
      res.url().includes('card_id=in.') &&
      res.request().method() === 'GET',
    { timeout: 30_000 },
  );
  await page.goto('/review/start');
  const rawRows: RawCardProgressRow[] = await (await progressResponse).json();
  await page.screenshot({ path: 'test-results/demo-shots/learner.png', fullPage: true });

  const progress: CardProgress[] = rawRows.flatMap((row) => {
    const cardId = idByUuid.get(row.card_id);
    if (!cardId) return [];
    return [
      {
        cardId,
        correctCount: row.correct_count,
        wrongCount: row.wrong_count,
        lastReviewedAt: row.last_reviewed_at,
        nextReviewAt: row.next_review_at,
        intervalDays: row.interval_days,
        ease: row.ease,
      },
    ];
  });

  // The chain is already written — the leg route it's replace()-ing into
  // never needs to load for this check.
  const chainHandle = await page.waitForFunction(
    (key) => sessionStorage.getItem(key),
    CHAIN_STORAGE_KEY,
    { timeout: 30_000 },
  );
  const chainRaw = await chainHandle.jsonValue();
  const chain = JSON.parse(chainRaw ?? '{}') as { legs?: { mode: string }[] };
  const realModes = (chain.legs ?? []).map((leg) => leg.mode);

  const now = new Date();
  const expectedModes = planForDay(progress, now, { ttsReady: false }).plan.map((leg) => leg.mode);

  expect(
    realModes,
    'The real /review/start launcher and planForDay(progress, now, { ttsReady: false }) ' +
      'disagree. planForDay only models the demo deck and the single demo assignment — if ' +
      'demo-maya has kana due, or any assignment besides "Days of the week", the simulator ' +
      "can't see it and this is that gap, not a planner regression. Otherwise this is real " +
      'drift between the launcher and the simulator.',
  ).toEqual(expectedModes);
});
