import { describe, expect, it } from 'vitest';

import { planAssignmentQuest } from '@/lib/assignmentQuest';
import { MIXED_GAME_MIN_CARDS } from '@/lib/mixedPractice';

const plan = (requiredMode: string | null, cardCount = 12) =>
  planAssignmentQuest({ cardCount, requiredMode });

describe('planAssignmentQuest', () => {
  it('gives a legacy assignment a single study leg', () => {
    expect(plan(null)).toEqual([{ step: 'goal', mode: 'study' }]);
  });

  it('treats an unknown mode as no goal at all', () => {
    expect(plan('macarena')).toEqual([{ step: 'goal', mode: 'study' }]);
  });

  it('collapses a study goal into one leg — the warm-up is the goal', () => {
    expect(plan('study')).toEqual([{ step: 'goal', mode: 'study' }]);
  });

  it('walks warm-up → a mixed block → goal for a normal goal mode', () => {
    expect(plan('quiz')).toEqual([
      { step: 'warmup', mode: 'study' },
      { step: 'practice', mode: 'recall' },
      { step: 'practice', mode: 'match' },
      { step: 'goal', mode: 'quiz' },
    ]);
  });

  it('never repeats the goal mode inside the middle block', () => {
    expect(plan('match')).toEqual([
      { step: 'warmup', mode: 'study' },
      { step: 'practice', mode: 'recall' },
      { step: 'goal', mode: 'match' },
    ]);
  });

  it('shrinks the middle block on a deck too small for a match grid', () => {
    expect(plan('listen', MIXED_GAME_MIN_CARDS - 1)).toEqual([
      { step: 'warmup', mode: 'study' },
      { step: 'practice', mode: 'recall' },
      { step: 'goal', mode: 'listen' },
    ]);
  });

  // The block is planned before any card progress is loaded — it must offer only
  // the rungs that need none, or two leg pages would disagree on the plan.
  it('leaves the progress-gated exercises out of a quest', () => {
    const modes = plan('quiz').map((leg) => leg.mode);
    expect(modes).not.toContain('listen');
    expect(modes).not.toContain('fill');
  });

  it('always starts on flip study, so the first leg needs no deck data', () => {
    for (const mode of [null, 'study', 'match', 'quiz', 'reading']) {
      expect(plan(mode, 0)[0].mode).toBe('study');
    }
  });

  it('always ends on the goal mode', () => {
    for (const mode of ['fill', 'recall', 'kotoba-bubble', 'listen', 'reading', 'quiz']) {
      const legs = plan(mode);
      expect(legs[legs.length - 1]).toEqual({ step: 'goal', mode });
    }
  });
});
