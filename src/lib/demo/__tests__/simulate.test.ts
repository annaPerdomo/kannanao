import { describe, expect, it } from 'vitest';

import { cardStrength, countStrengths } from '@/lib/cardStrength';
import {
  BASE_REVIEW_CAP,
  dailyReviewCap,
  pickFocusDeck,
  planDailyPractice,
} from '@/lib/dailyPractice';
import { endingItems } from '@/lib/grammarEndings';
import { groupWordInsights, isTricky } from '@/lib/handoutWords';
import { MIXED_SESSION_CARDS } from '@/lib/mixedPractice';
import { hashSeed, seededShuffle } from '@/lib/printPlan';
import { QUIZ_DEFAULT_COUNT } from '@/lib/quiz';

import { DEMO_CARDS, DEMO_DECK, DEMO_SENTENCES, demoAssignment } from '../deck';
import { DEMO_PERSONAS, type DemoPersona } from '../personas';
import {
  groupProgressRows,
  planForDay,
  PROGRESS_WRITES,
  simulatePersona,
  whatIf,
} from '../simulate';

const NOW = new Date('2026-10-23T17:00:00Z');

const personaByKey = (key: string) => DEMO_PERSONAS.find((p) => p.key === key)!;

describe('persona intent', () => {
  it('maya keeps Monday and Tuesday tricky', () => {
    const sim = simulatePersona(personaByKey('maya'), NOW);
    const monday = sim.progress.find((r) => r.cardId === 'demo-card-getsuyoubi')!;
    const tuesday = sim.progress.find((r) => r.cardId === 'demo-card-kayoubi')!;
    expect(isTricky(monday.correctCount, monday.wrongCount)).toBe(true);
    expect(isTricky(tuesday.correctCount, tuesday.wrongCount)).toBe(true);
  });

  it("ken's break raises the review pile and the cap to the exact value dailyReviewCap predicts", () => {
    const sim = simulatePersona(personaByKey('ken'), NOW);
    expect(sim.today.dueCount).toBeGreaterThan(0);
    expect(sim.today.reviewCap).toBeGreaterThan(BASE_REVIEW_CAP);
    expect(sim.today.reviewCap).toBe(dailyReviewCap(sim.today.daysAway));
    expect(sim.today.reviewCap).toBe(40);
  });

  it("sora's empty history plans exactly like planDailyPractice on no progress", () => {
    const sora = personaByKey('sora');
    const sim = simulatePersona(sora, NOW);
    const today = sim.today.date;
    const focus = pickFocusDeck([demoAssignment(NOW)], [DEMO_DECK], today);
    const expected = planDailyPractice({
      dueCount: 0,
      focus,
      cards: DEMO_CARDS,
      progress: [],
      ttsReady: true,
      sentenceCount: DEMO_SENTENCES.length,
      now: NOW,
    });
    expect(sim.today.plan).toEqual(expected);
    expect(sim.today.sessionCardIds).toHaveLength(Math.min(DEMO_CARDS.length, MIXED_SESSION_CARDS));
    expect(
      sim.today.sessionCardIds.every((id) => {
        const row = sim.progress.find((r) => r.cardId === id);
        return cardStrength(row) === 'new';
      }),
    ).toBe(true);
  });

  it('hana has at least 10 strong cards and a goal-step production leg', () => {
    const sim = simulatePersona(personaByKey('hana'), NOW);
    const strongCount = sim.progress.filter((r) => cardStrength(r) === 'strong').length;
    expect(strongCount).toBeGreaterThanOrEqual(10);
    expect(sim.today.plan.some((leg) => leg.step === 'goal' && leg.mode !== 'quiz')).toBe(true);
  });

  it('leo has at least 3 tricky cards and is mostly learning, not strong', () => {
    const sim = simulatePersona(personaByKey('leo'), NOW);
    const trickyCount = sim.progress.filter((r) => isTricky(r.correctCount, r.wrongCount)).length;
    expect(trickyCount).toBeGreaterThanOrEqual(3);
    const counts = countStrengths(
      sim.progress.map((r) => r.cardId),
      sim.progress,
    );
    expect(counts.learning).toBeGreaterThanOrEqual(8);
    expect(counts.learning).toBeGreaterThan(counts.strong);
  });
});

describe('whatIf', () => {
  it('marking Monday wrong keeps it below strong and raises its wrong count', () => {
    const sim = simulatePersona(personaByKey('maya'), NOW);
    const before = sim.progress.find((r) => r.cardId === 'demo-card-getsuyoubi');
    const result = whatIf(sim.progress, ['demo-card-getsuyoubi'], NOW, { personaKey: 'maya' });
    const change = result.changes.find((c) => c.cardId === 'demo-card-getsuyoubi')!;
    expect(change.strengthAfter).not.toBe('strong');
    expect(change.after.wrongCount).toBeGreaterThan(before?.wrongCount ?? 0);
  });

  it('marking every card right never downgrades and moves at least one card', () => {
    const sim = simulatePersona(personaByKey('maya'), NOW);
    const result = whatIf(sim.progress, [], NOW, { personaKey: 'maya' });
    const rank = { new: 0, learning: 1, strong: 2 } as const;
    expect(result.changes.length).toBeGreaterThan(0);
    for (const change of result.changes) {
      expect(rank[change.strengthAfter]).toBeGreaterThanOrEqual(rank[change.strengthBefore]);
    }
  });

  it('throws when a miss was never asked by a writing leg that day', () => {
    expect(() => whatIf([], ['demo-card-does-not-exist'], NOW)).toThrow();
  });
});

describe('determinism', () => {
  it('replaying the same persona and now gives the identical simulation', () => {
    const maya = personaByKey('maya');
    expect(simulatePersona(maya, NOW)).toEqual(simulatePersona(maya, NOW));
  });

  it('shifting now by 3 days shifts every day by exactly 3 days', () => {
    const maya = personaByKey('maya');
    const base = simulatePersona(maya, NOW);
    const shiftedNow = new Date(NOW.getTime() + 3 * 86_400_000);
    const shifted = simulatePersona(maya, shiftedNow);
    expect(shifted.days).toHaveLength(base.days.length);
    base.days.forEach((day, i) => {
      const d0 = Date.parse(`${day.date}T00:00:00Z`);
      const d1 = Date.parse(`${shifted.days[i].date}T00:00:00Z`);
      expect((d1 - d0) / 86_400_000).toBe(3);
    });
  });
});

describe('misses are only ever asked words', () => {
  it("every persona day's misses are a subset of that day's answered ids", () => {
    for (const p of DEMO_PERSONAS) {
      const sim = simulatePersona(p, NOW);
      const oldestFirst = [...p.history].sort((a, b) => b.daysAgo - a.daysAgo);
      sim.days.forEach((day, i) => {
        const answeredIds = new Set(day.answers.map((a) => a.cardId));
        for (const miss of oldestFirst[i].misses) expect(answeredIds.has(miss)).toBe(true);
      });
    }
  });

  it('throws when simulating a persona whose miss was never asked', () => {
    const bogus: DemoPersona = {
      key: 'bogus',
      username: 'demo-bogus',
      displayName: 'Bogus',
      featured: false,
      history: [{ daysAgo: 1, misses: ['demo-card-does-not-exist'] }],
    };
    expect(() => simulatePersona(bogus, NOW)).toThrow();
  });
});

describe('PROGRESS_WRITES', () => {
  it('drives exactly which cards a day answers, including the quiz stand-in', () => {
    const drillIds = new Set(
      endingItems(DEMO_CARDS)
        .filter((item) => item.drillsCard)
        .map((item) => item.card.id),
    );

    for (const p of DEMO_PERSONAS) {
      const sim = simulatePersona(p, NOW);
      for (const day of sim.days) {
        const expected = new Set(day.reviewCardIds);
        for (const leg of day.plan) {
          if (leg.mode === 'review') continue;
          const writes = PROGRESS_WRITES[leg.mode];
          if (writes === 'none') continue;
          let cardIds = leg.cardIds;
          if (!cardIds) {
            if (leg.step !== 'goal') cardIds = day.sessionCardIds;
            else if (leg.mode === 'quiz') {
              const seed = hashSeed(`${p.key}${day.date}`);
              cardIds = seededShuffle(DEMO_CARDS, seed)
                .slice(0, QUIZ_DEFAULT_COUNT)
                .map((c) => c.id);
            } else cardIds = DEMO_CARDS.map((c) => c.id);
          }
          const writable = writes === 'drill' ? cardIds.filter((id) => drillIds.has(id)) : cardIds;
          writable.forEach((id) => expected.add(id));
        }
        const actual = new Set(day.answers.map((a) => a.cardId));
        expect(actual).toEqual(expected);
      }
    }
  });

  it('kotoba-bubble and kana-journey write nothing', () => {
    expect(PROGRESS_WRITES['kotoba-bubble']).toBe('none');
    expect(PROGRESS_WRITES['kana-journey']).toBe('none');
  });
});

describe('groupWordInsights over every persona', () => {
  it("reports Monday's seen and tricky counts across personas", () => {
    const sims = DEMO_PERSONAS.map((p) => simulatePersona(p, NOW));
    const rows = groupProgressRows(sims);
    const insights = groupWordInsights(DEMO_CARDS, rows);
    const monday = insights.find((i) => i.card.id === 'demo-card-getsuyoubi')!;
    const studiedPersonas = DEMO_PERSONAS.filter((p) => p.history.length > 0).length;
    expect(monday.seenCount).toBe(studiedPersonas);
    expect(monday.trickyCount).toBeGreaterThanOrEqual(2);
  });
});

describe('planForDay', () => {
  it('reports null daysAway with no progress', () => {
    const plan = planForDay([], NOW);
    expect(plan.daysAway).toBeNull();
    expect(plan.dueCount).toBe(0);
  });
});
