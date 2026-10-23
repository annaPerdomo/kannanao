import { describe, expect, it } from 'vitest';

import {
  frontHtml,
  frontText,
  hashSeed,
  printableDecks,
  safeImageUrl,
  seededShuffle,
  shuffleAvoidingIdentity,
} from '@/lib/printPlan';
import type { LessonPlan, PlanCard, PlanDeck } from '@/types/lessonPlan';

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

describe('printableDecks', () => {
  it('drops a deck marked excluded', () => {
    const plan: LessonPlan = { decks: [deck({ excluded: true }), deck({ name: 'Week two' })] };
    expect(printableDecks(plan).map((d) => d.name)).toEqual(['Week two']);
  });

  it('drops a card marked excluded', () => {
    const plan: LessonPlan = {
      decks: [deck({ cards: [card({ word: 'a' }), card({ word: 'b', excluded: true })] })],
    };
    expect(printableDecks(plan)[0].cards.map((c) => c.word)).toEqual(['a']);
  });

  it('drops a deck left with no cards after excluding its cards', () => {
    const plan: LessonPlan = { decks: [deck({ cards: [card({ excluded: true })] })] };
    expect(printableDecks(plan)).toEqual([]);
  });

  it('does not mutate the input plan', () => {
    const plan: LessonPlan = { decks: [deck({ cards: [card({ excluded: true }), card()] })] };
    const before = JSON.parse(JSON.stringify(plan));
    printableDecks(plan);
    expect(plan).toEqual(before);
  });
});

describe('frontText', () => {
  it('uses the reading in hiragana mode when present', () => {
    expect(frontText(deck({ mainViewMode: 'hiragana' }), card())).toBe('たべる');
  });

  it('falls back to the word in hiragana mode with no reading', () => {
    expect(frontText(deck({ mainViewMode: 'hiragana' }), card({ reading: '' }))).toBe('食べる');
  });

  it('uses the word in kanji mode', () => {
    expect(frontText(deck({ mainViewMode: 'kanji' }), card())).toBe('食べる');
  });

  it('uses the word in romaji mode', () => {
    expect(frontText(deck({ mainViewMode: 'romaji' }), card())).toBe('食べる');
  });
});

describe('frontHtml', () => {
  it('adds ruby when furigana is on and the front is the kanji word', () => {
    const html = frontHtml(deck({ mainViewMode: 'kanji' }), card(), true);
    expect(html).toContain('<ruby>');
  });

  it('skips ruby when furigana is off', () => {
    const html = frontHtml(deck({ mainViewMode: 'kanji' }), card(), false);
    expect(html).not.toContain('<ruby>');
    expect(html).toBe('食べる');
  });

  it('skips ruby for a pure-kana word even with furigana on', () => {
    const html = frontHtml(
      deck({ mainViewMode: 'kanji' }),
      card({ word: 'すし', reading: 'すし' }),
      true,
    );
    expect(html).not.toContain('<ruby>');
    expect(html).toBe('すし');
  });

  it('skips ruby in hiragana mode, where the front is already the reading', () => {
    const html = frontHtml(deck({ mainViewMode: 'hiragana' }), card(), true);
    expect(html).not.toContain('<ruby>');
    expect(html).toBe('たべる');
  });

  it('escapes the text', () => {
    const html = frontHtml(deck({ mainViewMode: 'hiragana' }), card({ reading: '<b>x</b>' }), true);
    expect(html).toContain('&lt;b&gt;');
  });
});

describe('safeImageUrl', () => {
  it('accepts an https URL', () => {
    expect(safeImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it('rejects an http URL', () => {
    expect(safeImageUrl('http://example.com/a.png')).toBeNull();
  });

  it('rejects a javascript URL', () => {
    expect(safeImageUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects an empty or missing URL', () => {
    expect(safeImageUrl('')).toBeNull();
    expect(safeImageUrl(null)).toBeNull();
    expect(safeImageUrl(undefined)).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(safeImageUrl('not a url')).toBeNull();
  });
});

describe('hashSeed', () => {
  it('returns different hashes for different strings', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });

  it('is stable for the same string', () => {
    expect(hashSeed('week one:match')).toBe(hashSeed('week one:match'));
  });
});

describe('seededShuffle', () => {
  const items = Array.from({ length: 8 }, (_, i) => i);

  it('returns the same order for the same seed', () => {
    expect(seededShuffle(items, 42)).toEqual(seededShuffle(items, 42));
  });

  it('returns a different order for a different seed', () => {
    expect(seededShuffle(items, 1)).not.toEqual(seededShuffle(items, 2));
  });

  it('does not mutate the input', () => {
    const before = [...items];
    seededShuffle(items, 42);
    expect(items).toEqual(before);
  });

  it('returns a permutation of the input', () => {
    const shuffled = seededShuffle(items, 42);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
  });
});

describe('shuffleAvoidingIdentity', () => {
  function findIdentitySeed(items: readonly string[]): number {
    for (let seed = 0; seed < 10_000; seed++) {
      if (seededShuffle(items, seed).join() === items.join()) return seed;
    }
    throw new Error('no identity seed found in range');
  }

  it('rotates by one when the underlying shuffle would return the input order', () => {
    const items = ['a', 'b'];
    const seed = findIdentitySeed(items);
    expect(seededShuffle(items, seed)).toEqual(items);
    expect(shuffleAvoidingIdentity(items, seed)).toEqual(['b', 'a']);
  });

  it('matches seededShuffle when that is not the identity order', () => {
    const items = ['a', 'b', 'c'];
    const seed = 42;
    expect(seededShuffle(items, seed)).not.toEqual(items);
    expect(shuffleAvoidingIdentity(items, seed)).toEqual(seededShuffle(items, seed));
  });

  it('never rotates a single-item list', () => {
    expect(shuffleAvoidingIdentity(['a'], 0)).toEqual(['a']);
  });

  it('returns a permutation of the input', () => {
    const numbers = Array.from({ length: 8 }, (_, i) => i);
    const shuffled = shuffleAvoidingIdentity(numbers, 7);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(numbers);
  });
});
