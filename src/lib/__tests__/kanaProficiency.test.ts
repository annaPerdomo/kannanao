import { describe, expect, it } from 'vitest';

import { allKana, getSet, HIRAGANA_SETS, KATAKANA_SETS } from '@/lib/kanaCurriculum';
import {
  buildIslands,
  difficultyWeight,
  drillChars,
  earnedStrength,
  isKanaKnown,
  isTrackUnlocked,
  isUnseen,
  type KanaMastery,
  kanaProgressMap,
  kanaStars,
  kanaStrength,
  MAX_UNSEEN_PER_QUEUE,
  pickReviewQueue,
  setStars,
  STRENGTH_BANDS,
  STRONG_INTERLEAVE_RATIO,
  TRACK_UNLOCK_SETS,
  trackUnlockProgress,
  unlockedKana,
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

describe('buildIslands', () => {
  it('should open only the first row for a brand-new learner', () => {
    const islands = buildIslands('hiragana', new Map());
    expect(islands).toHaveLength(HIRAGANA_SETS.length);
    expect(islands[0].status).toBe('next');
    expect(islands.slice(1).every((i) => i.status === 'locked')).toBe(true);
  });

  it('should open the next row once the one before it has a single star', () => {
    const islands = buildIslands('hiragana', progressFor(['hira-a'], mastery(1)));
    expect(islands[0].status).toBe('next');
    expect(islands[1].status).toBe('available');
    expect(islands[2].status).toBe('locked');
  });

  it('should mark a fully starred row mastered and point at the row after it', () => {
    const islands = buildIslands('hiragana', progressFor(['hira-a'], mastery(5)));
    expect(islands[0].status).toBe('mastered');
    expect(islands[1].status).toBe('next');
    expect(islands[2].status).toBe('locked');
  });

  it('should label reachable rows past the current one as available', () => {
    const byKana = progressFor(['hira-a', 'hira-ka'], mastery(1));
    const islands = buildIslands('hiragana', byKana);
    expect(islands.map((i) => i.status).slice(0, 4)).toEqual([
      'next',
      'available',
      'available',
      'locked',
    ]);
  });

  it('should keep an opened row open after a week away, only marking it due', () => {
    const stale = {
      ...mastery(6, 0, daysAgo(1)),
      lastReviewedAt: daysAgo(7),
      intervalDays: 1,
    };
    const islands = buildIslands('hiragana', progressFor(['hira-a'], stale), NOW);
    expect(islands[0].status).toBe('mastered');
    expect(islands[1].status).toBe('next');
    expect(islands[0].dueCount).toBe(5);
  });

  it('should count characters whose spaced review has come around', () => {
    const byKana = progressFor(['hira-a'], mastery(5, 0, YESTERDAY));
    expect(buildIslands('hiragana', byKana)[0].dueCount).toBe(5);
    expect(buildIslands('hiragana', progressFor(['hira-a'], mastery(5)))[0].dueCount).toBe(0);
  });
});

describe('track unlocking', () => {
  it('should always allow hiragana', () => {
    expect(isTrackUnlocked('hiragana', new Map())).toBe(true);
  });

  it('should keep katakana shut until the first three hiragana rows are starred', () => {
    const two = progressFor(['hira-a', 'hira-ka'], mastery(1));
    expect(isTrackUnlocked('katakana', two)).toBe(false);
    expect(trackUnlockProgress(two)).toBe(2);

    const three = progressFor(['hira-a', 'hira-ka', 'hira-sa'], mastery(1));
    expect(isTrackUnlocked('katakana', three)).toBe(true);
    expect(trackUnlockProgress(three)).toBe(TRACK_UNLOCK_SETS);
  });

  it('should not require finishing hiragana to start katakana', () => {
    const three = progressFor(['hira-a', 'hira-ka', 'hira-sa'], mastery(1));
    expect(isTrackUnlocked('katakana', three)).toBe(true);
    expect(buildIslands('hiragana', three).some((i) => i.status === 'locked')).toBe(true);
    expect(buildIslands('katakana', three)[0].status).toBe('next');
    expect(KATAKANA_SETS[0].entries[0].kana).toBe('ア');
  });
});

describe('unlockedKana', () => {
  it('should offer only reached characters as a decoy pool', () => {
    const pool = unlockedKana('hiragana', progressFor(['hira-a'], mastery(5)));
    expect(pool).toContain('あ');
    expect(pool).toContain('か');
    expect(pool).not.toContain('さ');
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

  it('should never hand a beginner a character the journey has not opened', () => {
    const byKana = progressFor(['hira-a'], mastery(1));
    const queue = pickReviewQueue(byKana, { size: 20, now: NOW });
    const open = unlockedKana('hiragana', byKana);
    expect(queue.every((k) => open.includes(k))).toBe(true);
    expect(queue).not.toContain('ア');
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
