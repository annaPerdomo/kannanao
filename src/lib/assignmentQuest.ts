/**
 * Assignment quest planning — pure, so the step sequence can be unit tested
 * without a browser. The quest is one practice chain (see `practiceChain.ts`)
 * that ends on the mode the teacher asked for.
 */
import { type GoalMode, isGoalMode } from './assignmentMastery';
import { planMixedPractice } from './mixedPractice';
import type { ChainLeg } from './practiceChain';

/**
 * The legs for an assignment, in order. Deterministic on (deck size, goal) so
 * every leg page derives the identical plan — the banner would otherwise
 * renumber itself between steps. That is also why the middle block gets no
 * per-card progress: it is planned before any is loaded, and re-planned on
 * every leg page.
 */
export function planAssignmentQuest({
  cardCount,
  requiredMode,
}: {
  cardCount: number;
  requiredMode: string | null;
}): ChainLeg[] {
  const goal = isGoalMode(requiredMode) ? requiredMode : null;
  if (goal === null || goal === 'study') return [{ step: 'goal', mode: 'study' }];

  const middle = planMixedPractice({
    support: {
      cardCount,
      fillCards: 0,
      readingCards: 0,
      readingUnlocked: false,
      ttsReady: false,
    },
    counts: { new: cardCount, learning: 0, strong: 0 },
    // The warm-up below is already the study leg, and the goal is the finale.
    exclude: ['study', goal] satisfies GoalMode[],
  });

  return [{ step: 'warmup', mode: 'study' }, ...middle, { step: 'goal', mode: goal }];
}
