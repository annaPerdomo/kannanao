import { describe, expect, it } from 'vitest';

import {
  buildTypingFrames,
  CARD_W,
  DEMO_CARDS,
  DEMO_SENTENCE,
  DESK_W,
  HERO_WORDS,
  TIMELINE,
  TYPING_FRAMES,
} from '../constants';

describe('buildTypingFrames', () => {
  it('types a word one character at a time before committing it', () => {
    expect(buildTypingFrames(['ab'])).toEqual([
      { committed: 0, typing: 'a' },
      { committed: 0, typing: 'ab' },
      { committed: 1, typing: '' },
      { committed: 1, typing: '' },
    ]);
  });

  it('carries committed words forward across the whole script', () => {
    const frames = buildTypingFrames(['ab', 'c']);
    expect(frames.at(-1)).toEqual({ committed: 2, typing: '' });
    // The second word starts typing only after the first is committed.
    expect(frames[4]).toEqual({ committed: 1, typing: 'c' });
  });

  it('returns nothing to type when there are no words', () => {
    expect(buildTypingFrames([])).toEqual([]);
  });
});

describe('hero demo timeline', () => {
  it('finishes typing before the generating stage starts', () => {
    // 55ms per frame; overrun and the demo cuts itself off mid-word.
    expect(TYPING_FRAMES.length * 55).toBeLessThan(TIMELINE.generating);
  });

  it('runs its stages in order and loops after the answer lands', () => {
    expect(TIMELINE.generating).toBeLessThan(TIMELINE.cards);
    expect(TIMELINE.cards).toBeLessThan(TIMELINE.phoneIn);
    expect(TIMELINE.phoneIn).toBeLessThan(TIMELINE.practice);
    expect(TIMELINE.practice).toBeLessThan(TIMELINE.answer);
    expect(TIMELINE.answer).toBeLessThan(TIMELINE.loop);
  });

  it('holds the phone back until every card has landed', () => {
    const lastCardAt = TIMELINE.cards + (DEMO_CARDS.length - 1) * TIMELINE.cardStagger;
    expect(TIMELINE.phoneIn).toBeGreaterThan(lastCardAt);
  });
});

describe('educator deck demo data', () => {
  it('types the meaning of every card it generates', () => {
    // One list read two ways — a hardcoded word list drifts.
    expect(HERO_WORDS).toEqual(DEMO_CARDS.map((card) => card.meaning));
  });

  it('holds exactly one grid row of cards', () => {
    // A fifth card wraps, and the crop slices it in half at the fold.
    const GAP = 16;
    const PAGE_PADDING = 48;
    const row = DEMO_CARDS.length * CARD_W + (DEMO_CARDS.length - 1) * GAP;
    expect(row).toBeLessThanOrEqual(DESK_W - PAGE_PADDING);
  });
});

describe('sentence builder demo data', () => {
  it('offers the correct particle among the bubbles', () => {
    expect(DEMO_SENTENCE.options).toContain(DEMO_SENTENCE.particle);
  });
});
