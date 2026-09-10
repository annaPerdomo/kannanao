import { describe, expect, it } from 'vitest';

import { memberReading, toKanaProgressMap } from '@/app/api/group/_lib/memberReading';
import { allKana } from '@/lib/kanaCurriculum';
import { isKanaKnown, type KanaMastery, kanaStars, kanaStrengthState } from '@/lib/kanaProficiency';

const now = new Date('2026-09-01T00:00:00.000Z');

function mastered(overrides: Partial<KanaMastery> = {}): KanaMastery {
  return { correctCount: 12, wrongCount: 0, lastReviewedAt: now.toISOString(), ...overrides };
}

describe('memberReading', () => {
  it('reports an empty map as new, unseen, with the full character set', () => {
    const reading = memberReading(new Map());

    expect(reading.hiragana.stage).toBe('new');
    expect(reading.hiragana.known).toBe(0);
    expect(reading.hiragana.seen).toBe(0);
    expect(reading.hiragana.characters).toHaveLength(allKana('hiragana').length);
    expect(reading.katakana.characters).toHaveLength(allKana('katakana').length);
    expect(reading.lastPracticedAt).toBeNull();
  });

  it("reports 'reads' with known === total once every hiragana character is known", () => {
    const byKana = toKanaProgressMap(
      allKana('hiragana').map((kana) => ({
        kana,
        correct_count: 12,
        wrong_count: 0,
        last_reviewed_at: now.toISOString(),
      })),
    );

    const reading = memberReading(byKana, now);

    expect(reading.hiragana.stage).toBe('reads');
    expect(reading.hiragana.known).toBe(reading.hiragana.total);
  });

  it('matches the proficiency helpers for a partially known map', () => {
    const chars = allKana('hiragana');
    const byKana = toKanaProgressMap([
      {
        kana: chars[0],
        correct_count: 12,
        wrong_count: 0,
        last_reviewed_at: '2026-08-30T00:00:00Z',
      },
      {
        kana: chars[1],
        correct_count: 1,
        wrong_count: 1,
        last_reviewed_at: '2026-08-31T00:00:00Z',
      },
    ]);

    const reading = memberReading(byKana, now);

    const first = reading.hiragana.characters.find((c) => c.kana === chars[0])!;
    const second = reading.hiragana.characters.find((c) => c.kana === chars[1])!;
    const untouched = reading.hiragana.characters.find((c) => c.kana === chars[2])!;

    expect(first.stars).toBe(kanaStars(mastered()));
    expect(first.state).toBe(
      kanaStrengthState(mastered({ lastReviewedAt: '2026-08-30T00:00:00Z' }), now),
    );
    expect(second.stars).toBe(kanaStars({ correctCount: 1, wrongCount: 1 }));
    expect(untouched.stars).toBe(0);
    expect(untouched.state).toBe('new');
    expect(reading.hiragana.seen).toBe(2);
    expect(reading.hiragana.known).toBe(isKanaKnown(mastered()) ? 1 : 0);
  });

  it('reads intervalDays off the row so a well-scheduled character comes out solid, not rusty', () => {
    const threeDaysAgo = '2026-08-29T00:00:00.000Z';
    const withInterval = toKanaProgressMap([
      {
        kana: 'あ',
        correct_count: 12,
        wrong_count: 0,
        last_reviewed_at: threeDaysAgo,
        interval_days: 14,
      },
    ]);
    const withoutInterval = toKanaProgressMap([
      { kana: 'あ', correct_count: 12, wrong_count: 0, last_reviewed_at: threeDaysAgo },
    ]);

    expect(memberReading(withInterval, now).hiragana.characters[0].state).toBe('solid');
    expect(memberReading(withoutInterval, now).hiragana.characters[0].state).toBe('rusty');
  });

  it('takes lastPracticedAt as the latest lastReviewedAt across both tracks', () => {
    const byKana = toKanaProgressMap([
      { kana: 'あ', correct_count: 1, wrong_count: 0, last_reviewed_at: '2026-08-01T00:00:00Z' },
      { kana: 'ア', correct_count: 1, wrong_count: 0, last_reviewed_at: '2026-08-15T00:00:00Z' },
    ]);

    const reading = memberReading(byKana, now);

    expect(reading.lastPracticedAt).toBe('2026-08-15T00:00:00Z');
  });
});
