import { describe, expect, it } from 'vitest';

import { BASE_REVIEW_CAP } from '@/lib/dailyPractice';
import { MIN_SENTENCES } from '@/lib/mixedPractice';
import en from '@/messages/en.json';
import ja from '@/messages/ja.json';

import { describeNext, diffPlans, droppedLegs, explainPlan, REASON_KEYS } from '../explain';
import { DEMO_PERSONAS } from '../personas';
import { simulatePersona, whatIf } from '../simulate';

const NOW = new Date('2026-10-23T17:00:00Z');

const personaByKey = (key: string) => DEMO_PERSONAS.find((p) => p.key === key)!;

describe('explainPlan', () => {
  it("ken's review reason is plain `review`, sized to the actual review pile", () => {
    const sim = simulatePersona(personaByKey('ken'), NOW);
    const reviewReason = explainPlan(sim.today, sim.progress).find((r) => r.leg.mode === 'review')!;
    expect(reviewReason.reason).toBe('review');
    expect(reviewReason.values.count).toBe(sim.today.reviewCardIds.length);
  });

  it('emits reviewCapRaised only once dueCount actually exceeds the base cap', () => {
    const sim = simulatePersona(personaByKey('ken'), NOW);
    const bigDay = { ...sim.today, dueCount: BASE_REVIEW_CAP + 1 };
    const reviewReason = explainPlan(bigDay, sim.progress).find((r) => r.leg.mode === 'review')!;
    expect(reviewReason.reason).toBe('reviewCapRaised');
    expect(reviewReason.values).toEqual({
      count: bigDay.reviewCardIds.length,
      cap: bigDay.reviewCap,
    });
  });

  it("sora's reasons contain newWords sized to her whole session", () => {
    const sim = simulatePersona(personaByKey('sora'), NOW);
    const reasons = explainPlan(sim.today, sim.progress);
    const newWords = reasons.find((r) => r.reason === 'newWords');
    expect(newWords).toBeDefined();
    expect(newWords!.values.count).toBe(sim.today.sessionCardIds.length);
  });

  it('a plan with a kotoba-bubble leg yields sentences sized to MIN_SENTENCES', () => {
    for (const persona of DEMO_PERSONAS) {
      const sim = simulatePersona(persona, NOW);
      const hasSentenceLeg = sim.today.plan.some((leg) => leg.mode === 'kotoba-bubble');
      if (!hasSentenceLeg) continue;
      const reasons = explainPlan(sim.today, sim.progress);
      const sentenceReason = reasons.find((r) => r.reason === 'sentences');
      expect(sentenceReason).toBeDefined();
      expect(sentenceReason!.values.min).toBe(MIN_SENTENCES);
      return;
    }
    throw new Error('no persona produced a kotoba-bubble leg to assert against');
  });

  it('every ReasonKey has a message in both locale files', () => {
    for (const key of REASON_KEYS) {
      expect(en.DemoLab.reasons[key as keyof typeof en.DemoLab.reasons]).toBeTruthy();
      expect(ja.DemoLab.reasons[key as keyof typeof ja.DemoLab.reasons]).toBeTruthy();
    }
  });
});

describe('droppedLegs', () => {
  it("returns ken's exact cut legs — offered minus what the plan kept", () => {
    const sim = simulatePersona(personaByKey('ken'), NOW);
    expect(sim.today.offered.map((leg) => leg.mode)).toEqual([
      'recall',
      'kotoba-bubble',
      'endings',
      'fill',
    ]);
    expect(sim.today.plan.map((leg) => leg.mode)).toEqual([
      'review',
      'recall',
      'kotoba-bubble',
      'fill',
      'quiz',
    ]);
    expect(droppedLegs(sim.today)).toEqual([{ step: 'practice', mode: 'endings' }]);
  });
});

describe('diffPlans', () => {
  it('reports exact added and removed modes', () => {
    const before = [
      { step: 'practice' as const, mode: 'recall' as const },
      { step: 'practice' as const, mode: 'match' as const },
    ];
    const after = [
      { step: 'practice' as const, mode: 'recall' as const },
      { step: 'practice' as const, mode: 'listen' as const },
    ];
    expect(diffPlans(before, after)).toEqual({ added: ['listen'], removed: ['match'] });
  });
});

describe('describeNext', () => {
  it('a missed learning card is retried in-sitting and settles a day out', () => {
    const sim = simulatePersona(personaByKey('maya'), NOW);
    const result = whatIf(sim.progress, ['demo-card-getsuyoubi'], NOW, { personaKey: 'maya' });
    const change = result.changes.find((c) => c.cardId === 'demo-card-getsuyoubi')!;
    expect(change.strengthBefore).toBe('learning');
    expect(describeNext(change, NOW)).toEqual({ unit: 'day', value: 1 });
  });
});
