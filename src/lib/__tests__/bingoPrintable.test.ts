import { describe, expect, it } from 'vitest';

import { type BingoLabels, bingoPool, bingoSize, buildBingoHtml } from '@/lib/bingoPrintable';
import type { LessonPlan, PlanCard, PlanDeck } from '@/types/lessonPlan';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

const LABELS: BingoLabels = {
  title: 'Bingo',
  name: 'Name',
  date: 'Date',
  free: 'FREE',
  callerTitle: "Bingo — caller's list",
  callerHint: 'Read the meaning aloud and tick it off.',
  called: 'Called',
};

function card(overrides: Partial<PlanCard> = {}): PlanCard {
  return {
    word: '食べる',
    reading: 'たべる',
    meaning: 'to eat',
    exampleJp: '',
    exampleEn: '',
    jlptLevel: 'N5',
    ...overrides,
  };
}

function deck(overrides: Partial<PlanDeck> = {}): PlanDeck {
  return {
    name: 'Week one',
    description: '',
    emoji: '📘',
    mainViewMode: 'kanji',
    cards: [card()],
    ...overrides,
  };
}

function wordsOfCount(count: number): PlanCard[] {
  return Array.from({ length: count }, (_, i) =>
    card({ word: `word${i}`, reading: `reading${i}`, meaning: `meaning${i}` }),
  );
}

function planOf(count: number): LessonPlan {
  return { decks: [deck({ cards: wordsOfCount(count) })] };
}

function planWithTestCards(testCards: PlanCard[]): LessonPlan {
  const filler = Array.from({ length: 24 - testCards.length }, (_, i) =>
    card({ word: `w${i}`, reading: `w${i}`, meaning: `filler${i}` }),
  );
  return { decks: [deck({ cards: [...testCards, ...filler] })] };
}

describe('bingoSize', () => {
  it.each([
    [8, null],
    [9, 3],
    [15, 3],
    [16, 4],
    [23, 4],
    [24, 5],
    [60, 5],
  ])('maps pool size %d to %s', (poolSize, expected) => {
    expect(bingoSize(poolSize)).toBe(expected);
  });
});

describe('bingoPool', () => {
  it('dedupes by front text, first wins, and skips a card whose meaning is already in the pool', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          cards: [
            card({ word: '犬', reading: 'いぬ', meaning: 'dog' }),
            card({ word: '犬', reading: 'いぬ', meaning: 'different meaning' }),
            card({ word: '猫', reading: 'ねこ', meaning: 'dog' }),
            card({ word: '鳥', reading: 'とり', meaning: 'bird' }),
          ],
        }),
      ],
    };

    const pool = bingoPool(plan, false);
    expect(pool.map((w) => w.front)).toEqual(['犬', '鳥']);
    expect(pool.map((w) => w.meaning)).toEqual(['dog', 'bird']);
  });

  it('skips excluded cards and decks', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          cards: [
            card({ word: '犬', reading: 'いぬ', meaning: 'dog' }),
            card({ word: '猫', reading: 'ねこ', meaning: 'cat', excluded: true }),
          ],
        }),
        deck({ name: 'excluded deck', excluded: true, cards: [card({ word: '鳥' })] }),
      ],
    };

    const pool = bingoPool(plan, false);
    expect(pool.map((w) => w.front)).toEqual(['犬']);
  });

  it('dedupes meanings case-insensitively and after trimming, keeping the first word and its original text', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          cards: [
            card({ word: '犬', reading: 'いぬ', meaning: 'dog' }),
            card({ word: '猫', reading: 'ねこ', meaning: 'Dog ' }),
            card({ word: '鳥', reading: 'とり', meaning: 'dog' }),
            card({ word: '魚', reading: 'さかな', meaning: 'fish' }),
          ],
        }),
      ],
    };

    const pool = bingoPool(plan, false);
    expect(pool.map((w) => w.front)).toEqual(['犬', '魚']);
    expect(pool.map((w) => w.meaning)).toEqual(['dog', 'fish']);
  });
});

describe('buildBingoHtml', () => {
  it('clamps copies: 0 to 1, 99 to 40, 2.7 to 2', () => {
    const plan = planOf(24);
    const zero = parse(
      buildBingoHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: false, copies: 0 },
      }),
    );
    expect(zero.querySelectorAll('.bingo-card')).toHaveLength(1);

    const many = parse(
      buildBingoHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: false, copies: 99 },
      }),
    );
    expect(many.querySelectorAll('.bingo-card')).toHaveLength(40);

    const fractional = parse(
      buildBingoHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: false, copies: 2.7 },
      }),
    );
    expect(fractional.querySelectorAll('.bingo-card')).toHaveLength(2);
  });

  it('gives a size-5 card exactly 24 words and one free cell', () => {
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan: planOf(24),
        labels: LABELS,
        options: { furigana: false, copies: 1 },
      }),
    );
    const grid = doc.querySelector('.bingo-grid');
    expect(grid?.querySelectorAll('td.free')).toHaveLength(1);
    expect(grid?.querySelector('td.free')?.textContent).toBe('FREE');
    expect(grid?.querySelectorAll('td:not(.free)')).toHaveLength(24);
  });

  it('draws every card from the pool, with no word repeated within one card', () => {
    const plan = planOf(24);
    const pool = bingoPool(plan, false).map((w) => w.front);
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: false, copies: 3 },
      }),
    );

    for (const grid of doc.querySelectorAll('.bingo-grid')) {
      const words = [...grid.querySelectorAll('td:not(.free)')].map((td) => td.textContent);
      expect(new Set(words).size).toBe(words.length);
      for (const word of words) expect(pool).toContain(word);
    }
  });

  it('gives 10 copies 10 distinct arrangements', () => {
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan: planOf(24),
        labels: LABELS,
        options: { furigana: false, copies: 10 },
      }),
    );

    const arrangements = [...doc.querySelectorAll('.bingo-grid')].map((grid) =>
      [...grid.querySelectorAll('td')].map((td) => td.textContent).join('|'),
    );
    expect(new Set(arrangements).size).toBe(10);
  });

  it('lists every pool word exactly once on the caller sheet', () => {
    const plan = planOf(16);
    const pool = bingoPool(plan, false).map((w) => w.front);
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: false, copies: 1 },
      }),
    );

    const calledWords = [...doc.querySelectorAll('.caller-table td.jp')].map(
      (td) => td.textContent,
    );
    expect(calledWords.sort()).toEqual([...pool].sort());
  });

  it('escapes a meaning containing HTML on the caller sheet', () => {
    const plan: LessonPlan = {
      decks: [
        deck({ cards: wordsOfCount(9).map((c) => ({ ...c, meaning: `<b>${c.meaning}</b>` })) }),
      ],
    };
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: false, copies: 1 },
      }),
    );

    const meaningTexts = [...doc.querySelectorAll('.caller-table td.meaning')].map(
      (td) => td.textContent,
    );
    expect(meaningTexts).toContain('<b>meaning0</b>');
    expect(doc.querySelector('.caller-table td.meaning b')).toBeNull();
  });

  it('produces identical HTML for the same input', () => {
    const plan = planOf(24);
    const a = buildBingoHtml({
      locale: 'en',
      plan,
      labels: LABELS,
      options: { furigana: true, copies: 5 },
    });
    const b = buildBingoHtml({
      locale: 'en',
      plan,
      labels: LABELS,
      options: { furigana: true, copies: 5 },
    });
    // brandHeaderHtml's gradient id counter is global, so strip it before comparing.
    const normalize = (html: string) => html.replace(/print-brand-rule-\d+/g, 'print-brand-rule');
    expect(normalize(a)).toBe(normalize(b));
  });

  it('shows one empty-state header and no cards when the pool is too small', () => {
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan: planOf(5),
        labels: LABELS,
        options: { furigana: false, copies: 10 },
      }),
    );
    expect(doc.querySelectorAll('.bingo-card')).toHaveLength(0);
    expect(doc.querySelectorAll('.caller-table')).toHaveLength(0);
  });

  it('shrinks a word longer than the 5×5 limit of 3 characters', () => {
    const plan = planWithTestCards([
      card({ word: 'abcd', reading: 'abcd', meaning: 'four chars' }),
    ]);
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: false, copies: 1 },
      }),
    );
    const cell = [...doc.querySelectorAll('.bingo-grid td')].find(
      (td) => td.textContent === 'abcd',
    );
    expect(cell?.classList.contains('shrink')).toBe(true);
  });

  it('does not shrink a 3-character word even when furigana lengthens its HTML', () => {
    const plan = planWithTestCards([
      card({ word: '食べる', reading: 'たべる', meaning: 'to eat' }),
    ]);
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: true, copies: 1 },
      }),
    );
    const cell = [...doc.querySelectorAll('.bingo-grid td')].find((td) => td.querySelector('ruby'));
    expect(cell).toBeDefined();
    expect(cell?.classList.contains('shrink')).toBe(false);
  });

  it('escapes a word containing a less-than sign on the cards', () => {
    const plan = planWithTestCards([
      card({ word: '<b>x</b>', reading: '<b>x</b>', meaning: 'tag' }),
    ]);
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan,
        labels: LABELS,
        options: { furigana: false, copies: 1 },
      }),
    );
    const cell = [...doc.querySelectorAll('.bingo-grid td')].find(
      (td) => td.textContent === '<b>x</b>',
    );
    expect(cell).toBeDefined();
    expect(cell?.querySelector('b')).toBeNull();
  });

  it('breaks the page before card 2 but not cards 0 or 1, and starts the cards block on its own page', () => {
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan: planOf(24),
        labels: LABELS,
        options: { furigana: false, copies: 3 },
      }),
    );
    const cards = [...doc.querySelectorAll('.bingo-card')];
    expect(cards.map((c) => c.classList.contains('page-break'))).toEqual([false, false, true]);
    expect(doc.querySelector('.sheet.caller + .cards-wrap')).not.toBeNull();
  });

  it('fills a 3×3 card with 9 cells and no free cell', () => {
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan: planOf(9),
        labels: LABELS,
        options: { furigana: false, copies: 1 },
      }),
    );
    const grid = doc.querySelector('.bingo-grid');
    expect(grid?.querySelectorAll('td')).toHaveLength(9);
    expect(grid?.querySelectorAll('td.free')).toHaveLength(0);
  });

  it('fills a 4×4 card with 16 cells and no free cell', () => {
    const doc = parse(
      buildBingoHtml({
        locale: 'en',
        plan: planOf(16),
        labels: LABELS,
        options: { furigana: false, copies: 1 },
      }),
    );
    const grid = doc.querySelector('.bingo-grid');
    expect(grid?.querySelectorAll('td')).toHaveLength(16);
    expect(grid?.querySelectorAll('td.free')).toHaveLength(0);
  });
});
