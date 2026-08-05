import { describe, expect, it } from 'vitest';

import {
  enLabelFontSize,
  jpLabelFontSize,
  NARROW_COLS,
  NARROW_PAIRS_PER_ROUND,
  PHONE_BOARD_ROWS,
  PHONE_COLS,
  PHONE_PAIRS_PER_ROUND,
} from '@/components/Practice/MatchMode';
import { REVIEW_MIX } from '@/hooks/usePracticeQueue';

const px = (rem: string) => parseFloat(rem) * 16;

// ─── tile labels ──────────────────────────────────────────────────────────────

describe('jpLabelFontSize', () => {
  it('gives a short word the full size on both boards', () => {
    expect(jpLabelFontSize('ねこ')).toEqual({ xs: '1.1rem', sm: '1.1rem' });
  });

  it('steps down sooner on the narrower phone tile', () => {
    // にゅうきょしゃ needs four lines at 1.1rem in a third-of-a-row tile.
    const size = jpLabelFontSize('にゅうきょしゃ');
    expect(px(size.xs)).toBeLessThan(px(size.sm));
  });

  it('counts kana and kanji as double-width, so romaji is not punished', () => {
    // Same glyph count, but the romaji is half as wide on screen.
    expect(px(jpLabelFontSize('としょかん').xs)).toBeLessThan(px(jpLabelFontSize('tosho').xs));
  });

  it('never grows as the label grows', () => {
    const sizes = ['は', 'ねこ', 'かならず', 'にゅうきょしゃ', 'もえるごみです'].map((w) =>
      px(jpLabelFontSize(w).xs),
    );
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });
});

describe('enLabelFontSize', () => {
  it('keeps a one-word gloss readable', () => {
    expect(enLabelFontSize('homework').xs).toBe('0.85rem');
  });

  it('shrinks the long comma-separated glosses that used to overflow', () => {
    const long = enLabelFontSize('burnable garbage, combustible waste');
    expect(px(long.xs)).toBeLessThan(px(enLabelFontSize('homework').xs));
  });

  it('leaves the roomier tablet board at one size', () => {
    expect(enLabelFontSize('homework').sm).toBe(
      enLabelFontSize('burnable garbage, combustible waste').sm,
    );
  });
});

// ─── pairs per round ──────────────────────────────────────────────────────────

describe('pairs per round', () => {
  // A played round is `pairs + REVIEW_MIX`; sizing the board against `pairs`
  // alone is what made rounds 2+ scroll.
  const playedTiles = (pairs: number) => (pairs + REVIEW_MIX) * 2;

  it('keeps every round inside the board, review cards included', () => {
    expect(playedTiles(PHONE_PAIRS_PER_ROUND)).toBeLessThanOrEqual(PHONE_BOARD_ROWS * PHONE_COLS);
    expect(playedTiles(NARROW_PAIRS_PER_ROUND)).toBeLessThanOrEqual(PHONE_BOARD_ROWS * NARROW_COLS);
  });

  it('deals a whole number of rows on each phone board', () => {
    expect(playedTiles(PHONE_PAIRS_PER_ROUND) % PHONE_COLS).toBe(0);
    expect(playedTiles(NARROW_PAIRS_PER_ROUND) % NARROW_COLS).toBe(0);
  });

  it('still deals a real round once the review cards are subtracted', () => {
    expect(NARROW_PAIRS_PER_ROUND).toBeGreaterThan(1);
  });

  it('gives the narrowest phones fewer pairs, since their tiles are wider', () => {
    expect(NARROW_PAIRS_PER_ROUND).toBeLessThan(PHONE_PAIRS_PER_ROUND);
  });
});
