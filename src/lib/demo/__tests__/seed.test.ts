import { describe, expect, it } from 'vitest';

import { LAPSE_INTERVAL_DAYS } from '@/lib/srs';

import { isDemoUsername } from '../identity';
import { DEMO_PERSONAS } from '../personas';
import { buildDemoSeed, lapseCountsFor, progressTotalsFor } from '../seed';
import { simulatePersona } from '../simulate';

const NOW = new Date('2026-10-23T17:00:00Z');

describe('buildDemoSeed', () => {
  it('has exactly the six personas as learners', () => {
    const seed = buildDemoSeed(NOW);
    expect(seed.learners).toHaveLength(6);
    expect(seed.learners.map((l) => l.username)).toEqual(DEMO_PERSONAS.map((p) => p.username));
  });

  it("each learner's progress matches simulatePersona directly", () => {
    const seed = buildDemoSeed(NOW);
    for (const persona of DEMO_PERSONAS) {
      const sim = simulatePersona(persona, NOW);
      const learner = seed.learners.find((l) => l.username === persona.username)!;
      expect(learner.progress).toEqual(sim.progress);
      expect(learner.days).toEqual(sim.days);
    }
  });

  it('the organizer username passes isDemoUsername', () => {
    const seed = buildDemoSeed(NOW);
    expect(isDemoUsername(seed.organizer.username)).toBe(true);
  });

  it('every learner username passes isDemoUsername', () => {
    const seed = buildDemoSeed(NOW);
    for (const learner of seed.learners) {
      expect(isDemoUsername(learner.username)).toBe(true);
    }
  });
});

describe('lapseCountsFor', () => {
  it("matches a hand-rolled recount of leo's missed-when-settled answers", () => {
    const leo = DEMO_PERSONAS.find((p) => p.key === 'leo')!;
    const sim = simulatePersona(leo, NOW);

    const expected = new Map<string, number>();
    for (const day of sim.days) {
      const missed = new Set(day.answers.filter((a) => !a.correct).map((a) => a.cardId));
      for (const change of day.changes) {
        if (!missed.has(change.cardId)) continue;
        if ((change.before?.intervalDays ?? 0) >= LAPSE_INTERVAL_DAYS) {
          expected.set(change.cardId, (expected.get(change.cardId) ?? 0) + 1);
        }
      }
    }

    expect(lapseCountsFor(sim.days)).toEqual(expected);
  });

  it('is empty for a persona with no history', () => {
    const sora = DEMO_PERSONAS.find((p) => p.key === 'sora')!;
    const sim = simulatePersona(sora, NOW);
    expect(lapseCountsFor(sim.days)).toEqual(new Map());
  });

  it('counts a miss only once the card had already settled past LAPSE_INTERVAL_DAYS', () => {
    const baseDay = {
      date: '2026-10-01',
      now: '2026-10-01T10:00:00.000Z',
      daysAway: null,
      dueCount: 0,
      kanaDue: false,
      reviewCap: 0,
      reviewCardIds: [],
      plan: [],
      offered: [],
      sessionCardIds: [],
    };

    const settledMiss = {
      ...baseDay,
      answers: [{ cardId: 'card-a', correct: false }],
      changes: [
        {
          cardId: 'card-a',
          before: {
            cardId: 'card-a',
            correctCount: 5,
            wrongCount: 0,
            lastReviewedAt: '2026-09-20T10:00:00.000Z',
            nextReviewAt: '2026-10-01T10:00:00.000Z',
            intervalDays: LAPSE_INTERVAL_DAYS,
            ease: 2.5,
          },
          after: {
            cardId: 'card-a',
            correctCount: 5,
            wrongCount: 1,
            lastReviewedAt: '2026-10-01T10:00:00.000Z',
            nextReviewAt: '2026-10-01T10:10:00.000Z',
            intervalDays: 0,
            ease: 2.3,
          },
          strengthBefore: 'strong' as const,
          strengthAfter: 'new' as const,
        },
      ],
    };

    const freshMiss = {
      ...baseDay,
      answers: [{ cardId: 'card-b', correct: false }],
      changes: [
        {
          cardId: 'card-b',
          before: undefined,
          after: {
            cardId: 'card-b',
            correctCount: 0,
            wrongCount: 1,
            lastReviewedAt: '2026-10-01T10:00:00.000Z',
            nextReviewAt: '2026-10-01T10:10:00.000Z',
            intervalDays: 0,
            ease: 2.5,
          },
          strengthBefore: 'new' as const,
          strengthAfter: 'new' as const,
        },
      ],
    };

    expect(lapseCountsFor([settledMiss])).toEqual(new Map([['card-a', 1]]));
    expect(lapseCountsFor([freshMiss])).toEqual(new Map());
  });
});

describe('progressTotalsFor', () => {
  it("computes maya's level from her total xp", () => {
    const maya = DEMO_PERSONAS.find((p) => p.key === 'maya')!;
    const sim = simulatePersona(maya, NOW);
    const totals = progressTotalsFor(sim.days, NOW);
    expect(totals.totalXp).toBeGreaterThan(0);
    expect(totals.level).toBeGreaterThanOrEqual(1);
  });
});
