import { describe, expect, it } from 'vitest';

import {
  buildFlashcardSheetHtml,
  type FlashcardSheetLabels,
  type FlashcardSheetOptions,
} from '@/lib/flashcardsPrintable';
import type { LessonPlan, PlanCard, PlanDeck } from '@/types/lessonPlan';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

const LABELS: FlashcardSheetLabels = { title: 'Fold-over flashcards', fold: 'fold' };
const DEFAULT_OPTIONS: FlashcardSheetOptions = { furigana: true, pictures: true };

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
    name: 'Food words',
    description: '',
    emoji: '🍜',
    mainViewMode: 'kanji',
    cards: [card()],
    ...overrides,
  };
}

function sheet(
  plan: LessonPlan,
  options: FlashcardSheetOptions = DEFAULT_OPTIONS,
  labels: FlashcardSheetLabels = LABELS,
): Document {
  return parse(buildFlashcardSheetHtml({ locale: 'en', plan, labels, options }));
}

describe('buildFlashcardSheetHtml', () => {
  it('prints one card per non-excluded card', () => {
    const plan: LessonPlan = {
      decks: [deck({ cards: [card({ word: 'a' }), card({ word: 'b', excluded: true })] })],
    };
    expect(sheet(plan).querySelectorAll('.card')).toHaveLength(1);
  });

  it('prints one header per deck with the deck name escaped', () => {
    const plan: LessonPlan = {
      decks: [deck({ name: '<b>Food</b>' }), deck({ name: 'Animals' })],
    };
    const doc = sheet(plan);
    expect(doc.querySelectorAll('.print-brand-header')).toHaveLength(2);
    const titles = [...doc.querySelectorAll('.brand-title')].map((el) => el.textContent);
    expect(titles).toContain('🍜 <b>Food</b>');
    expect(doc.querySelector('.brand-title b')).toBeNull();
  });

  it('keeps the default font size for a short word even once ruby markup lengthens the HTML', () => {
    const plan: LessonPlan = {
      decks: [deck({ cards: [card({ word: '図書館', reading: 'としょかん' })] })],
    };
    const doc = sheet(plan, { furigana: true, pictures: false });
    expect(doc.querySelector('.jp .word')?.classList.contains('long')).toBe(false);
  });

  it('shows ruby when furigana is on, plain text when off', () => {
    const plan: LessonPlan = { decks: [deck()] };
    expect(sheet(plan, { furigana: true, pictures: false }).querySelector('ruby')).not.toBeNull();
    expect(sheet(plan, { furigana: false, pictures: false }).querySelector('ruby')).toBeNull();
  });

  it('prints the reading on the front for a hiragana-mode deck', () => {
    const plan: LessonPlan = { decks: [deck({ mainViewMode: 'hiragana' })] };
    const doc = sheet(plan, { furigana: true, pictures: false });
    expect(doc.querySelector('.jp .word')?.textContent).toBe('たべる');
  });

  it('shows no image when pictures is off', () => {
    const plan: LessonPlan = {
      decks: [deck({ cards: [card({ imageUrl: 'https://example.com/a.png' })] })],
    };
    expect(
      sheet(plan, { furigana: true, pictures: false }).querySelector('.meaning-half img'),
    ).toBeNull();
  });

  it('shows an image only for the card with a safe https URL', () => {
    const plan: LessonPlan = {
      decks: [
        deck({
          cards: [
            card({ word: 'a', imageUrl: 'https://example.com/a.png' }),
            card({ word: 'b', imageUrl: 'http://example.com/b.png' }),
            card({ word: 'c', imageUrl: null }),
          ],
        }),
      ],
    };
    const doc = sheet(plan, { furigana: true, pictures: true });
    expect(doc.querySelectorAll('.meaning-half img')).toHaveLength(1);
    expect(doc.querySelector('.meaning-half img')?.getAttribute('src')).toBe(
      'https://example.com/a.png',
    );
  });

  it('escapes a meaning containing a script tag', () => {
    const plan: LessonPlan = {
      decks: [deck({ cards: [card({ meaning: '<script>x</script>' })] })],
    };
    const doc = sheet(plan);
    expect(doc.querySelector('.meaning')?.textContent).toBe('<script>x</script>');
    expect(doc.querySelector('.meaning script')).toBeNull();
  });

  it('prints the fold label', () => {
    const plan: LessonPlan = { decks: [deck()] };
    expect(sheet(plan).querySelector('.fold')?.textContent).toBe('fold');
  });
});
