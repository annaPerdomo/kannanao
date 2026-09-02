import { describe, expect, it } from 'vitest';

import {
  companionSetIds,
  gapSetIds,
  type GroupKanaReadiness,
  hasKanaSignal,
  MAX_COMPANION_KANA_SETS,
  planKanaGaps,
  readingKanaGaps,
} from '@/lib/kanaGaps';
import type { PlanCard, PlanDeck } from '@/types/lessonPlan';

const MEMBERS = [
  { id: 'm1', name: 'Ken', started: true },
  { id: 'm2', name: 'Mai', started: true },
  { id: 'm3', name: 'Sam', started: false },
];

function readiness(shakyBy: Record<string, number[]>): GroupKanaReadiness {
  return { members: MEMBERS, shakyBy };
}

function card(overrides: Partial<PlanCard> = {}): PlanCard {
  return {
    word: '新しい',
    reading: 'あたらしい',
    meaning: 'new',
    exampleJp: '',
    exampleEn: '',
    jlptLevel: 'N5',
    ...overrides,
  };
}

function deck(cards: PlanCard[], overrides: Partial<PlanDeck> = {}): PlanDeck {
  return {
    name: 'Week 1',
    description: '',
    emoji: '📘',
    mainViewMode: 'hiragana',
    cards,
    ...overrides,
  };
}

describe('hasKanaSignal', () => {
  it('should stay silent when nobody in the group has used Learn Kana', () => {
    expect(hasKanaSignal({ members: [MEMBERS[2]], shakyBy: {} })).toBe(false);
    expect(hasKanaSignal({ members: [], shakyBy: {} })).toBe(false);
  });

  it('should speak up once one member has real data', () => {
    expect(hasKanaSignal(readiness({ ら: [0] }))).toBe(true);
  });

  it('should stay silent with no readiness at all', () => {
    expect(hasKanaSignal(null)).toBe(false);
  });
});

describe('readingKanaGaps', () => {
  it('should flag only the characters someone is still working on', () => {
    const gaps = readingKanaGaps('あたらしい', readiness({ ら: [1] }));
    expect(gaps.map((g) => g.kana)).toEqual(['ら']);
    expect(gaps[0].shaky.map((m) => m.name)).toEqual(['Mai']);
    expect(gaps[0].setId).toBe('hira-ra');
  });

  it('should list a member with no data apart, never as behind', () => {
    const [gap] = readingKanaGaps('ら', readiness({ ら: [0] }));
    expect(gap.shaky.map((m) => m.id)).toEqual(['m1']);
    expect(gap.untried.map((m) => m.id)).toEqual(['m3']);
  });

  it('should report a repeated character once', () => {
    const gaps = readingKanaGaps('ららら', readiness({ ら: [0] }));
    expect(gaps).toHaveLength(1);
  });

  it('should say nothing about a reading the group can already read', () => {
    expect(readingKanaGaps('ねこ', readiness({ ら: [0] }))).toEqual([]);
  });
});

describe('planKanaGaps and companionSetIds', () => {
  const decks = [deck([card({ reading: 'あたらしい' }), card({ reading: 'ねこ' })])];

  it('should return an empty list per card when there is no signal', () => {
    expect(planKanaGaps(decks, readiness({}))).toEqual([[[], []]]);
    expect(planKanaGaps(decks, null)).toEqual([[[], []]]);
  });

  it('should stay index-aligned with every card', () => {
    const gaps = planKanaGaps(decks, readiness({ ら: [0] }));
    expect(gaps[0][0].map((g) => g.kana)).toEqual(['ら']);
    expect(gaps[0][1]).toEqual([]);
  });

  it('should only propose rows from cards that will be created', () => {
    const mixed = [
      deck([card({ reading: 'ら' }), card({ reading: 'む', excluded: true })]),
      deck([card({ reading: 'ぱ' })], { excluded: true }),
    ];
    const gaps = planKanaGaps(mixed, readiness({ ら: [0], む: [0], ぱ: [0] }));
    expect(companionSetIds(mixed, gaps)).toEqual(['hira-ra']);
  });

  it('should read a kana-only word off the word itself when the reading is blank', () => {
    const kanaOnly = [deck([card({ word: 'ねこ', reading: '' })])];
    const gaps = planKanaGaps(kanaOnly, readiness({ ね: [0] }));
    expect(gaps[0][0].map((g) => g.kana)).toEqual(['ね']);
    expect(companionSetIds(kanaOnly, gaps)).toEqual(['hira-na']);
  });

  it('should cap the rows it proposes so the callout and the apply route agree', () => {
    const rows = 'あかさたなはまや';
    const wide = [deck([card({ reading: rows })])];
    const shakyBy = Object.fromEntries([...rows].map((kana) => [kana, [0]]));
    const proposed = companionSetIds(wide, planKanaGaps(wide, readiness(shakyBy)));
    expect(proposed).toHaveLength(MAX_COMPANION_KANA_SETS);
    expect(proposed[0]).toBe('hira-a');
  });

  it('should return rows in curriculum order without duplicates', () => {
    const gaps = readingKanaGaps('らぱらり', readiness({ ら: [0], り: [0], ぱ: [0] }));
    expect(gapSetIds(gaps)).toEqual(['hira-ra', 'hira-pa']);
  });
});
