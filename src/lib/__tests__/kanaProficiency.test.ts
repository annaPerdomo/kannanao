import { describe, expect, it } from 'vitest';

import {
  allKana,
  getKanaEntry,
  getSet,
  isContextualKana,
  kanaDifficulty,
} from '@/lib/kanaCurriculum';
import {
  CHECK_CREDIT_PER_HIT,
  difficultyWeight,
  drillChars,
  earnedStrength,
  gradeKanaCheck,
  isKanaKnown,
  isNewLearner,
  isUnseen,
  KANA_CHECK_SIZE,
  type KanaMastery,
  type KanaProgressMap,
  kanaProgressMap,
  kanaStars,
  kanaStrength,
  kanaStrengthState,
  MAX_UNSEEN_PER_QUEUE,
  needsReviewCount,
  NEW_LEARNER_MAX_SEEN,
  pickKanaCheck,
  pickReviewQueue,
  setStars,
  STRENGTH_BANDS,
  STRONG_INTERLEAVE_RATIO,
} from '@/lib/kanaProficiency';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-09-01T09:00:00.000Z');
const YESTERDAY = new Date(Date.now() - DAY_MS).toISOString();
const TOMORROW = new Date(Date.now() + DAY_MS).toISOString();

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function mastery(correct: number, wrong = 0, nextReviewAt: string | null = TOMORROW): KanaMastery {
  return { correctCount: correct, wrongCount: wrong, nextReviewAt };
}

function progressFor(setIds: string[], level: KanaMastery) {
  return kanaProgressMap(
    setIds.flatMap((id) => getSet(id)!.entries.map((e) => ({ kana: e.kana, ...level }))),
  );
}

describe('kanaStrength', () => {
  it('should read a character with no row at all as unseen, not merely weak', () => {
    expect(kanaStrength(undefined)).toBe(0);
    expect(isUnseen(undefined)).toBe(true);
    expect(isUnseen(mastery(0, 0))).toBe(true);
    expect(isUnseen(mastery(0, 1))).toBe(false);
  });

  it('should decay with the SRS interval as the half-life', () => {
    const fresh = { ...mastery(6), lastReviewedAt: NOW.toISOString(), intervalDays: 1 };
    const stale = { ...fresh, lastReviewedAt: daysAgo(1) };
    const older = { ...fresh, lastReviewedAt: daysAgo(3) };
    expect(kanaStrength(fresh, NOW)).toBeCloseTo(1, 5);
    expect(kanaStrength(stale, NOW)).toBeCloseTo(0.5, 5);
    expect(kanaStrength(older, NOW)).toBeCloseTo(0.125, 5);
  });

  it('should keep a long-interval character strong over the same elapsed days', () => {
    const long = { ...mastery(6), lastReviewedAt: daysAgo(3), intervalDays: 30 };
    const short = { ...long, intervalDays: 1 };
    expect(kanaStrength(long, NOW)).toBeGreaterThan(0.9);
    expect(kanaStrength(long, NOW)).toBeGreaterThan(kanaStrength(short, NOW));
  });

  it('should not divide by a zero interval when the last answer was wrong', () => {
    const missed = { ...mastery(3, 3), lastReviewedAt: daysAgo(0.5), intervalDays: 0 };
    expect(kanaStrength(missed, NOW)).toBeGreaterThan(0);
    expect(kanaStrength(missed, NOW)).toBeLessThan(earnedStrength(missed));
  });

  it('should not let one miss erase a well-known character overnight', () => {
    const slipped = { ...mastery(12, 1), lastReviewedAt: daysAgo(1), intervalDays: 0 };
    expect(kanaStrength(slipped, NOW)).toBeGreaterThan(STRENGTH_BANDS[1]);
  });

  it('should scale by lifetime accuracy so a coin-flip character never reads as solid', () => {
    expect(kanaStrength(mastery(20, 20), NOW)).toBeLessThan(STRENGTH_BANDS[1]);
    expect(kanaStrength(mastery(20, 0), NOW)).toBeGreaterThan(STRENGTH_BANDS[2]);
  });

  it('should never lower strength when another correct answer arrives', () => {
    let previous = 0;
    for (let correct = 1; correct <= 10; correct += 1) {
      const strength = kanaStrength(mastery(correct, 2), NOW);
      expect(strength).toBeGreaterThanOrEqual(previous);
      previous = strength;
    }
  });

  it('should never raise strength as more time passes', () => {
    const base = { ...mastery(6), lastReviewedAt: NOW.toISOString(), intervalDays: 5 };
    let previous = Infinity;
    for (const days of [0, 1, 2, 5, 10, 40]) {
      const strength = kanaStrength({ ...base, lastReviewedAt: daysAgo(days) }, NOW);
      expect(strength).toBeLessThanOrEqual(previous);
      previous = strength;
    }
  });
});

describe('kanaStars', () => {
  it('should give no stars to a character never answered', () => {
    expect(kanaStars(undefined)).toBe(0);
    expect(kanaStars(mastery(0))).toBe(0);
  });

  it('should climb through the bands as answers accumulate', () => {
    expect(kanaStars(mastery(1))).toBe(1);
    expect(kanaStars(mastery(3))).toBe(2);
    expect(kanaStars(mastery(5))).toBe(3);
  });

  it('should sit each band exactly on its threshold', () => {
    expect(kanaStars(mastery(2, 4))).toBe(0);
    expect(kanaStars(mastery(4, 6))).toBe(1);
    expect(kanaStars(mastery(9, 6))).toBe(2);
    expect(kanaStars(mastery(12, 3))).toBe(3);
  });

  it('should withhold the last star from one lucky answer that is not yet due', () => {
    expect(kanaStars(mastery(1))).toBe(1);
    expect(kanaStars(mastery(2))).toBe(2);
  });

  it('should withhold the last star from a guesser with as many wrongs as rights', () => {
    expect(kanaStars(mastery(9, 9))).toBe(1);
    expect(kanaStars(mastery(9, 12))).toBe(1);
    expect(kanaStars(mastery(9, 8))).toBe(1);
  });

  it('should keep every star through a break, however long', () => {
    const mastered = { ...mastery(8), lastReviewedAt: NOW.toISOString(), intervalDays: 2 };
    expect(kanaStars(mastered)).toBe(3);
    expect(kanaStars({ ...mastered, lastReviewedAt: daysAgo(10) })).toBe(3);
    expect(kanaStrength({ ...mastered, lastReviewedAt: daysAgo(10) }, NOW)).toBeLessThan(
      STRENGTH_BANDS[0],
    );
  });

  it('should treat three stars as knowing the character', () => {
    expect(isKanaKnown(mastery(5, 1))).toBe(true);
    expect(isKanaKnown(mastery(5, 5))).toBe(false);
    expect(isKanaKnown(undefined)).toBe(false);
  });

  it('should hold the reads-it bar at four-fifths accuracy once evidence is in', () => {
    expect(isKanaKnown(mastery(10, 3))).toBe(false);
    expect(isKanaKnown(mastery(12, 3))).toBe(true);
    expect(isKanaKnown(mastery(4))).toBe(true);
    expect(isKanaKnown(mastery(3))).toBe(false);
  });
});

describe('setStars', () => {
  it('should score a set by its weakest character, not its average', () => {
    const set = getSet('hira-a')!;
    const rows = set.entries.map((e, i) => ({
      kana: e.kana,
      ...mastery(i === 0 ? 1 : 20),
    }));
    expect(setStars('hira-a', kanaProgressMap(rows))).toBe(1);
  });

  it('should award three stars only when every character clears the bar', () => {
    expect(setStars('hira-a', progressFor(['hira-a'], mastery(5)))).toBe(3);
    expect(setStars('hira-a', progressFor(['hira-a'], mastery(5, 5)))).toBe(1);
  });

  it('should return no stars for an unknown set id', () => {
    expect(setStars('nope', new Map())).toBe(0);
  });
});

describe('drillChars', () => {
  it('should lead a replay with the characters that came due', () => {
    const set = getSet('hira-a')!;
    const rows = set.entries.map((e, i) => ({
      kana: e.kana,
      ...mastery(5, 0, i === 3 ? YESTERDAY : TOMORROW),
    }));
    expect(drillChars('hira-a', kanaProgressMap(rows))[0]).toBe(set.entries[3].kana);
  });

  it('should put the shakiest characters first when nothing is due', () => {
    const set = getSet('hira-a')!;
    const rows = set.entries.map((e, i) => ({ kana: e.kana, ...mastery(i === 4 ? 1 : 9) }));
    expect(drillChars('hira-a', kanaProgressMap(rows))[0]).toBe(set.entries[4].kana);
  });

  it('should keep curriculum order for a set the learner has never seen', () => {
    expect(drillChars('hira-a', new Map())).toEqual(getSet('hira-a')!.entries.map((e) => e.kana));
  });

  it('should return nothing for an unknown set id', () => {
    expect(drillChars('nope', new Map())).toEqual([]);
  });
});

function solid(kana: string): KanaMastery & { kana: string } {
  return {
    kana,
    correctCount: 12,
    wrongCount: 0,
    lastReviewedAt: daysAgo(1),
    nextReviewAt: new Date(NOW.getTime() + 20 * DAY_MS).toISOString(),
    intervalDays: 30,
    ease: 2.5,
  };
}

function shaky(kana: string, overrides: Partial<KanaMastery> = {}): KanaMastery & { kana: string } {
  return {
    kana,
    correctCount: 2,
    wrongCount: 5,
    lastReviewedAt: daysAgo(4),
    nextReviewAt: daysAgo(3),
    intervalDays: 1,
    ease: 1.4,
    ...overrides,
  };
}

/** Every character of both tracks answered well, so only the exceptions stand out. */
function everythingSolid() {
  return kanaProgressMap(allKana().map(solid));
}

describe('pickReviewQueue', () => {
  it('should lead with the character the learner is losing, not the next unread row', () => {
    const byKana = everythingSolid();
    byKana.set('ぬ', shaky('ぬ'));
    expect(pickReviewQueue(byKana, { size: 8, now: NOW })[0]).toBe('ぬ');
  });

  it('should mix both scripts by default and honour a single track', () => {
    const byKana = everythingSolid();
    byKana.set('ぬ', shaky('ぬ'));
    byKana.set('ヌ', shaky('ヌ'));
    expect(pickReviewQueue(byKana, { size: 12, now: NOW })).toEqual(
      expect.arrayContaining(['ぬ', 'ヌ']),
    );
    expect(pickReviewQueue(byKana, { size: 12, track: 'hiragana', now: NOW })).not.toContain('ヌ');
  });

  it('should stay inside one row when a set is chosen deliberately', () => {
    const queue = pickReviewQueue(new Map(), { size: 20, setId: 'hira-ka', now: NOW });
    expect(queue.every((k) => getSet('hira-ka')!.entries.some((e) => e.kana === k))).toBe(true);
  });

  it('should reach a character she has never once practised', () => {
    const byKana = everythingSolid();
    byKana.delete('ぬ');
    expect(pickReviewQueue(byKana, { size: 12, now: NOW })).toContain('ぬ');
  });

  it('should introduce brand-new characters in curriculum order, a few at a time', () => {
    const byKana = progressFor(['hira-a'], mastery(5));
    const queue = pickReviewQueue(byKana, { size: 20, now: NOW });
    expect(queue).toContain('か');
    expect(queue).not.toContain('ら');
  });

  it('should introduce only a handful of brand-new characters in one session', () => {
    const queue = pickReviewQueue(new Map(), { size: 20, now: NOW });
    expect(queue).toHaveLength(MAX_UNSEEN_PER_QUEUE);
    expect(queue.slice(0, 3)).toEqual(['あ', 'い', 'う']);
  });

  it('should interleave a minority of strong characters so the session is not all failure', () => {
    const byKana = everythingSolid();
    const weak = ['ぬ', 'ね', 'む', 'ゆ', 'ろ', 'を'];
    weak.forEach((k) => byKana.set(k, shaky(k)));
    const queue = pickReviewQueue(byKana, { size: 8, now: NOW });
    const strongCount = queue.filter((k) => !weak.includes(k)).length;
    expect(strongCount).toBe(Math.floor(8 * STRONG_INTERLEAVE_RATIO));
    expect(queue).toHaveLength(8);
    expect(queue[0]).not.toBe(queue[1]);
  });

  it('should drop the warm-up characters when the caller asks for weak ones only', () => {
    const byKana = everythingSolid();
    const weak = ['ぬ', 'ね', 'む'];
    weak.forEach((k) => byKana.set(k, shaky(k)));
    expect(pickReviewQueue(byKana, { size: 8, includeStrong: false, now: NOW })).toEqual(
      expect.arrayContaining(weak),
    );
    expect(pickReviewQueue(byKana, { size: 8, includeStrong: false, now: NOW })).toHaveLength(3);
  });

  it('should never emit the same character twice in a row', () => {
    const byKana = everythingSolid();
    ['ぬ', 'ね'].forEach((k) => byKana.set(k, shaky(k)));
    const queue = pickReviewQueue(byKana, { size: 16, now: NOW });
    expect(queue.some((kana, i) => i > 0 && kana === queue[i - 1])).toBe(false);
  });

  it('should give the same queue twice for the same progress and the same clock', () => {
    const byKana = everythingSolid();
    ['ぬ', 'ね', 'にゃ'].forEach((k) => byKana.set(k, shaky(k)));
    expect(pickReviewQueue(byKana, { size: 10, now: NOW })).toEqual(
      pickReviewQueue(byKana, { size: 10, now: NOW }),
    );
  });

  it('should return the whole pool when the session is bigger than the row', () => {
    const byKana = kanaProgressMap(getSet('hira-ka')!.entries.map((e) => solid(e.kana)));
    expect(pickReviewQueue(byKana, { size: 50, setId: 'hira-ka', now: NOW })).toHaveLength(5);
  });

  it('should surface a hard character ahead of an easy one while both are new to her', () => {
    const byKana = everythingSolid();
    const thin = { correctCount: 1, wrongCount: 0, lastReviewedAt: daysAgo(2), intervalDays: 1 };
    byKana.set('にゃ', thin);
    byKana.set('か', thin);
    const queue = pickReviewQueue(byKana, { size: 6, now: NOW });
    expect(queue.indexOf('にゃ')).toBeLessThan(queue.indexOf('か'));
  });

  it('should stop favouring a hard character once she has proved she reads it', () => {
    const byKana = everythingSolid();
    byKana.set('にゃ', {
      correctCount: 30,
      wrongCount: 1,
      lastReviewedAt: daysAgo(1),
      nextReviewAt: daysAgo(0.5),
      intervalDays: 20,
      ease: 2.6,
    });
    byKana.set('か', {
      correctCount: 6,
      wrongCount: 5,
      lastReviewedAt: daysAgo(2),
      nextReviewAt: daysAgo(1),
      intervalDays: 2,
      ease: 1.5,
    });
    const queue = pickReviewQueue(byKana, { size: 6, now: NOW });
    expect(queue.indexOf('か')).toBeLessThan(queue.indexOf('にゃ'));
  });

  it('should fade the difficulty prior as gradings accumulate', () => {
    expect(difficultyWeight(0)).toBe(1);
    expect(difficultyWeight(3)).toBeCloseTo(0.5, 5);
    expect(difficultyWeight(30)).toBeLessThan(0.1);
  });

  it('should hand back nothing for a zero-size session', () => {
    expect(pickReviewQueue(new Map(), { size: 0, now: NOW })).toEqual([]);
  });
});

describe('kanaStrengthState', () => {
  it('should call a character new only when it has never been answered', () => {
    expect(kanaStrengthState(undefined, NOW)).toBe('new');
    expect(kanaStrengthState(mastery(0, 1), NOW)).toBe('learning');
  });

  it('should separate a character going rusty from one never learned', () => {
    const learned = { ...mastery(12), lastReviewedAt: daysAgo(0), intervalDays: 10 };
    expect(kanaStrengthState(learned, NOW)).toBe('solid');
    expect(kanaStrengthState({ ...learned, lastReviewedAt: daysAgo(20) }, NOW)).toBe('rusty');
  });

  it('should not promote a shaky character to rusty just because time passed', () => {
    const shakyOld = { ...mastery(4, 4), lastReviewedAt: daysAgo(30), intervalDays: 1 };
    expect(kanaStrengthState(shakyOld, NOW)).toBe('learning');
  });
});

describe('needsReviewCount', () => {
  it('should count what the Review button will actually work on', () => {
    const byKana = everythingSolid();
    ['ぬ', 'ね', 'む'].forEach((k) => byKana.set(k, shaky(k)));
    expect(needsReviewCount(byKana, { now: NOW })).toBe(3);
  });

  it('should not call never-seen characters a brush-up', () => {
    expect(needsReviewCount(new Map(), { now: NOW })).toBe(0);
  });

  it('should say nothing is waiting when every character is fresh', () => {
    expect(needsReviewCount(everythingSolid(), { now: NOW })).toBe(0);
  });
});

describe('isNewLearner', () => {
  it('should treat a learner with almost no answers as new', () => {
    expect(isNewLearner(new Map())).toBe(true);
    expect(isNewLearner(progressFor(['hira-a'], mastery(3)))).toBe(true);
  });

  it('should stop guiding once there are enough answers to order practice by', () => {
    const answered = kanaProgressMap(
      allKana('hiragana')
        .slice(0, NEW_LEARNER_MAX_SEEN)
        .map((kana) => ({ kana, ...mastery(1) })),
    );
    expect(isNewLearner(answered)).toBe(false);
  });

  it('should not count a character that only has an empty row', () => {
    expect(isNewLearner(progressFor(['hira-a', 'hira-ka'], mastery(0, 0)))).toBe(true);
  });
});

describe('pickKanaCheck', () => {
  it("should ask a minute's worth of questions, not the whole chart", () => {
    expect(pickKanaCheck()).toHaveLength(KANA_CHECK_SIZE);
    expect(pickKanaCheck(10)).toHaveLength(10);
    expect(pickKanaCheck(0)).toEqual([]);
  });

  it('should never ask about a character that has no sound of its own', () => {
    expect(pickKanaCheck(KANA_CHECK_SIZE).some(isContextualKana)).toBe(false);
    expect(pickKanaCheck(500).some(isContextualKana)).toBe(false);
  });

  it('should sample both scripts and all three kinds of row', () => {
    const sample = pickKanaCheck();
    const kinds = new Set(sample.map((k) => getSet(getKanaEntry(k)!.setId)!.kind));
    const tracks = new Set(sample.map((k) => getKanaEntry(k)!.track));
    expect([...tracks].sort()).toEqual(['hiragana', 'katakana']);
    expect([...kinds].sort()).toEqual(['base', 'combo', 'marked']);
  });

  it('should spread the questions over rows rather than exhaust one', () => {
    const rows = pickKanaCheck().map((k) => getKanaEntry(k)!.setId);
    expect(new Set(rows).size).toBe(rows.length);
  });

  it("should spend a row's one question on its hardest character — き, not か", () => {
    const sample = pickKanaCheck();
    expect(sample).toContain('き');
    expect(sample).not.toContain('か');
  });

  it('should never ask the same character twice, and never run past the chart', () => {
    const everything = pickKanaCheck(500);
    expect(new Set(everything).size).toBe(everything.length);
    expect(everything.length).toBe(allKana().filter((k) => !isContextualKana(k)).length);
  });

  it('should give the same questions every run, so a check is reproducible', () => {
    expect(pickKanaCheck()).toEqual(pickKanaCheck());
  });
});

describe('gradeKanaCheck', () => {
  const empty: KanaProgressMap = new Map();

  it('should record the character she was actually asked', () => {
    expect(gradeKanaCheck('き', true, empty).correct[0]).toBe('き');
    expect(gradeKanaCheck('き', false, empty)).toEqual({ correct: [], wrong: ['き'] });
  });

  it('should credit a few of the row she just read, never the whole row', () => {
    const { correct } = gradeKanaCheck('き', true, empty);
    expect(correct.length).toBe(1 + CHECK_CREDIT_PER_HIT);
    expect(getSet('hira-ka')!.entries.map((e) => e.kana)).toEqual(
      expect.arrayContaining(correct.slice(1)),
    );
  });

  it('should credit nothing at all for a miss', () => {
    expect(gradeKanaCheck('き', false, empty).correct).toEqual([]);
  });

  it('should never credit a character harder than the one she read', () => {
    const { correct } = gradeKanaCheck('か', true, empty);
    expect(correct).not.toContain('き');
    expect(correct.every((k) => kanaDifficulty(k) <= kanaDifficulty('か'))).toBe(true);
  });

  it('should leave real evidence alone rather than seed over it', () => {
    const answered = kanaProgressMap(
      getSet('hira-ka')!
        .entries.filter((e) => e.kana !== 'き')
        .map((e) => ({ kana: e.kana, correctCount: 1, wrongCount: 3 })),
    );
    expect(gradeKanaCheck('き', true, answered).correct).toEqual(['き']);
  });

  it('should never claim a character she was not shown is known', () => {
    const byKana: KanaProgressMap = new Map();
    for (const kana of gradeKanaCheck('き', true, byKana).correct) {
      byKana.set(kana, {
        correctCount: 1,
        wrongCount: 0,
        lastReviewedAt: new Date().toISOString(),
      });
    }
    for (const progress of byKana.values()) {
      expect(isKanaKnown(progress)).toBe(false);
      expect(kanaStrengthState(progress)).toBe('learning');
    }
  });

  it('should leave a missed character looking new, not failing', () => {
    const missed: KanaMastery = { correctCount: 0, wrongCount: 1, intervalDays: 0 };
    expect(kanaStars(missed)).toBe(0);
    expect(kanaStrengthState(missed)).toBe('learning');
  });

  it('should shrug at a character that is in no row at all', () => {
    expect(gradeKanaCheck('新', true, empty).correct).toEqual(['新']);
  });
});
