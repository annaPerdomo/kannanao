import { describe, expect, it } from 'vitest';

import { frontHtml, frontText, printableDecks, safeImageUrl } from '@/lib/printPlan';
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
