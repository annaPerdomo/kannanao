import { describe, expect, it } from 'vitest';

import { getSet, HIRAGANA_SETS, KATAKANA_SETS } from '@/lib/kanaCurriculum';
import {
  buildIslands,
  drillChars,
  isKanaKnown,
  isTrackUnlocked,
  type KanaMastery,
  kanaProgressMap,
  kanaStars,
  setStars,
  TRACK_UNLOCK_SETS,
  trackUnlockProgress,
  unlockedKana,
} from '@/lib/kanaProficiency';

const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString();
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString();

function mastery(correct: number, wrong = 0, nextReviewAt: string | null = TOMORROW): KanaMastery {
  return { correctCount: correct, wrongCount: wrong, nextReviewAt };
}

function progressFor(setIds: string[], level: KanaMastery) {
  return kanaProgressMap(
    setIds.flatMap((id) => getSet(id)!.entries.map((e) => ({ kana: e.kana, ...level }))),
  );
}

describe('kanaStars', () => {
  it('should give no stars to a character never answered', () => {
    expect(kanaStars(undefined)).toBe(0);
    expect(kanaStars(mastery(0))).toBe(0);
  });

  it('should step through the thresholds at 1, 3 and 5 correct', () => {
    expect(kanaStars(mastery(1))).toBe(1);
    expect(kanaStars(mastery(2))).toBe(1);
    expect(kanaStars(mastery(3))).toBe(2);
    expect(kanaStars(mastery(4))).toBe(2);
    expect(kanaStars(mastery(5))).toBe(3);
  });

  it('should withhold the last star from a guesser with as many wrongs as rights', () => {
    expect(kanaStars(mastery(9, 9))).toBe(2);
    expect(kanaStars(mastery(9, 12))).toBe(2);
    expect(kanaStars(mastery(9, 8))).toBe(3);
  });

  it('should treat three stars as knowing the character', () => {
    expect(isKanaKnown(mastery(5, 1))).toBe(true);
    expect(isKanaKnown(mastery(5, 5))).toBe(false);
    expect(isKanaKnown(undefined)).toBe(false);
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
    expect(setStars('hira-a', progressFor(['hira-a'], mastery(5, 5)))).toBe(2);
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
