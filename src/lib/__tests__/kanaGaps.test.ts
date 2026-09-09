import { describe, expect, it } from 'vitest';

import {
  companionSetIds,
  gapSetIds,
  type GroupKanaReadiness,
  hasKanaSignal,
  isKanaReadingAnswer,
  KANA_LEAD_DAYS,
  MAX_COMPANION_KANA_SETS,
  MAX_LESSON_KANA_ROWS_PER_WEEK,
  planKanaGaps,
  planLessonKana,
  prefillReadingLevelAnswer,
  readingKanaGaps,
  type ReadingLevelInput,
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

describe('isKanaReadingAnswer', () => {
  it('should accept only the three known answers', () => {
    expect(isKanaReadingAnswer('not-yet')).toBe(true);
    expect(isKanaReadingAnswer('learning')).toBe(true);
    expect(isKanaReadingAnswer('yes')).toBe(true);
    expect(isKanaReadingAnswer('fluent')).toBe(false);
    expect(isKanaReadingAnswer(undefined)).toBe(false);
  });
});

describe('prefillReadingLevelAnswer', () => {
  it('should fall back to learning with no started members to read from', () => {
    expect(prefillReadingLevelAnswer([])).toBe('learning');
  });

  it('should say not-yet once nearly everyone who has started is still new', () => {
    expect(prefillReadingLevelAnswer(['new', 'new', 'new', 'new', 'new'])).toBe('not-yet');
  });

  it('should not let one new joiner send a fluent class back to the start', () => {
    expect(prefillReadingLevelAnswer(['reads', 'reads', 'reads', 'reads', 'reads', 'new'])).toBe(
      'yes',
    );
  });

  it('should say yes once nearly every started member reads', () => {
    expect(prefillReadingLevelAnswer(['reads', 'reads'])).toBe('yes');
  });

  it('should say learning for anything in between', () => {
    expect(prefillReadingLevelAnswer(['reads', 'learning'])).toBe('learning');
  });
});

describe('planLessonKana', () => {
  const NOT_YET: ReadingLevelInput = { hiragana: 'not-yet', katakana: 'not-yet' };
  const LEARNING: ReadingLevelInput = { hiragana: 'learning', katakana: 'learning' };
  const YES: ReadingLevelInput = { hiragana: 'yes', katakana: 'yes' };

  const FIRST_DUE = '2026-09-15';
  const TODAY = '2026-09-01';
  const LEAD_DUE = '2026-09-12'; // FIRST_DUE minus KANA_LEAD_DAYS

  function oneWeekPlan(reading: string): PlanDeck[] {
    return [deck([card({ reading })])];
  }

  it('rolls a beginner week past the plan rather than piling it on one date', () => {
    const result = planLessonKana(oneWeekPlan('あかさたなはまや'), null, NOT_YET, FIRST_DUE, TODAY);
    expect(result.weeks.length).toBeGreaterThan(1);
    for (const week of result.weeks) {
      expect(week.setIds.length).toBeLessThanOrEqual(MAX_LESSON_KANA_ROWS_PER_WEEK);
    }
    const dates = result.weeks.map((w) => w.dueDate);
    expect(new Set(dates).size).toBe(dates.length);
  });

  describe('the answer × signal matrix', () => {
    it('no signal + not-yet: every sound is new for everyone', () => {
      const result = planLessonKana(oneWeekPlan('ら'), null, NOT_YET, FIRST_DUE, TODAY);
      expect(result.weeks).toEqual([{ index: 1, dueDate: LEAD_DUE, setIds: ['hira-ra'] }]);
    });

    it('no signal + learning: the same rows as not-yet', () => {
      const result = planLessonKana(oneWeekPlan('ら'), null, LEARNING, FIRST_DUE, TODAY);
      expect(result.weeks).toEqual([{ index: 1, dueDate: LEAD_DUE, setIds: ['hira-ra'] }]);
    });

    it('no signal + yes: no rows, the educator already answered', () => {
      const result = planLessonKana(oneWeekPlan('ら'), null, YES, FIRST_DUE, TODAY);
      expect(result.weeks).toEqual([]);
    });

    it('with signal + yes: suppresses the row even though data says it is shaky', () => {
      const result = planLessonKana(
        oneWeekPlan('ら'),
        readiness({ ら: [1] }),
        YES,
        FIRST_DUE,
        TODAY,
      );
      expect(result.weeks).toEqual([]);
    });

    it('with signal + not-yet: widens to a row the data says is already known', () => {
      // No shakyBy entry at all — the data alone would call this row done.
      const result = planLessonKana(oneWeekPlan('ら'), readiness({}), NOT_YET, FIRST_DUE, TODAY);
      expect(result.weeks).toEqual([{ index: 1, dueDate: LEAD_DUE, setIds: ['hira-ra'] }]);
    });

    it('with signal + learning: data decides — known rows drop out', () => {
      const result = planLessonKana(oneWeekPlan('ら'), readiness({}), LEARNING, FIRST_DUE, TODAY);
      expect(result.weeks).toEqual([]);
    });

    it('with signal + learning: a row someone is still shaky on stays in', () => {
      const result = planLessonKana(
        oneWeekPlan('ら'),
        readiness({ ら: [1] }),
        LEARNING,
        FIRST_DUE,
        TODAY,
      );
      expect(result.weeks).toEqual([{ index: 1, dueDate: LEAD_DUE, setIds: ['hira-ra'] }]);
    });
  });

  describe('the lead rule', () => {
    it('lands KANA_LEAD_DAYS before the deck due date', () => {
      const result = planLessonKana(oneWeekPlan('ら'), null, NOT_YET, FIRST_DUE, TODAY);
      expect(result.weeks[0].dueDate).toBe(LEAD_DUE);
      expect(KANA_LEAD_DAYS).toBe(3);
    });

    it('never lands before today', () => {
      // One day between today and the due date; three days of lead would be in the past.
      const result = planLessonKana(oneWeekPlan('ら'), null, NOT_YET, '2026-09-02', '2026-09-01');
      expect(result.weeks[0].dueDate).toBe('2026-09-01');
    });
  });

  describe('the cap and rollover rules', () => {
    it('hands out at most MAX_LESSON_KANA_ROWS_PER_WEEK rows a week, the rest rolling forward', () => {
      const decks: PlanDeck[] = [
        deck([card({ reading: 'あかさたなは' })], { name: 'Week 1' }),
        // Both characters here belong to rows already queued from week 1.
        deck([card({ reading: 'ねこ' })], { name: 'Week 2' }),
      ];

      const result = planLessonKana(decks, null, NOT_YET, FIRST_DUE, TODAY);

      expect(MAX_LESSON_KANA_ROWS_PER_WEEK).toBe(4);
      expect(result.weeks).toEqual([
        { index: 1, dueDate: LEAD_DUE, setIds: ['hira-a', 'hira-ka', 'hira-sa', 'hira-ta'] },
        { index: 2, dueDate: '2026-09-19', setIds: ['hira-na', 'hira-ha'] },
      ]);
    });
  });

  describe('the once rule', () => {
    it('schedules a row shared by two weeks only in the first one', () => {
      const decks: PlanDeck[] = [
        deck([card({ reading: 'ら' })], { name: 'Week 1' }),
        deck([card({ reading: 'ら' })], { name: 'Week 2' }),
      ];

      const result = planLessonKana(decks, null, NOT_YET, FIRST_DUE, TODAY);
      expect(result.weeks).toEqual([{ index: 1, dueDate: LEAD_DUE, setIds: ['hira-ra'] }]);
    });
  });

  it('skips a skipped deck entirely, never giving it a week number', () => {
    const decks: PlanDeck[] = [
      deck([card({ reading: 'ら' })], { excluded: true }),
      deck([card({ reading: 'ぱ' })]),
    ];
    const result = planLessonKana(decks, null, NOT_YET, FIRST_DUE, TODAY);
    expect(result.weeks).toEqual([{ index: 1, dueDate: LEAD_DUE, setIds: ['hira-pa'] }]);
  });
});
