import { describe, expect, it } from 'vitest';

import {
  fillEmptyFields,
  goalFromLessonTitle,
  pageTextGoal,
  planCardsToGenerated,
  quizletCardsToPending,
} from '@/lib/lessonAi';
import type { Flashcard, GeneratedCard } from '@/types/flashcard';
import type { PlanCard } from '@/types/lessonPlan';

function planCard(overrides: Partial<PlanCard> = {}): PlanCard {
  return {
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    exampleJp: '猫がいます',
    exampleEn: 'There is a cat',
    jlptLevel: 'N5',
    ...overrides,
  };
}

function flashcard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'c1',
    deckId: 'd1',
    word: '猫',
    reading: '',
    meaning: '',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    ...overrides,
  };
}

function generatedCard(overrides: Partial<GeneratedCard> = {}): GeneratedCard {
  return {
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    image_query: 'cat',
    example_jp: '猫がいます',
    example_en: 'There is a cat',
    card_type: 'word',
    jlpt_level: 'N5',
    ...overrides,
  };
}

describe('pageTextGoal', () => {
  it('returns a fixed, non-empty goal', () => {
    expect(pageTextGoal().length).toBeGreaterThan(0);
    expect(pageTextGoal()).toBe(pageTextGoal());
  });
});

describe('goalFromLessonTitle', () => {
  it('strips an English week ordinal', () => {
    expect(goalFromLessonTitle('Week 3 — At the restaurant')).toBe('At the restaurant');
  });

  it('strips a Japanese week ordinal', () => {
    expect(goalFromLessonTitle('第3週 — レストランで')).toBe('レストランで');
  });

  it('returns an empty string for a blank or null title', () => {
    expect(goalFromLessonTitle(null)).toBe('');
    expect(goalFromLessonTitle('   ')).toBe('');
  });

  it('returns the title unchanged when it has no ordinal prefix', () => {
    expect(goalFromLessonTitle('At the restaurant')).toBe('At the restaurant');
  });
});

describe('planCardsToGenerated', () => {
  it('maps fields to GeneratedCard shape and drops excluded cards', () => {
    const cards = [planCard(), planCard({ word: '犬', excluded: true })];
    const generated = planCardsToGenerated(cards);
    expect(generated).toHaveLength(1);
    expect(generated[0]).toMatchObject({
      word: '猫',
      reading: 'ねこ',
      meaning: 'cat',
      example_jp: '猫がいます',
      example_en: 'There is a cat',
      card_type: 'word',
      jlpt_level: 'N5',
    });
  });
});

describe('quizletCardsToPending', () => {
  it('maps the kept draft card fields and derives mainViewMode', () => {
    const pending = quizletCardsToPending([
      {
        word: '食べる',
        reading: 'たべる',
        meaning: 'to eat',
        exampleJp: '',
        exampleEn: '',
        imageQuery: '',
        imageUrl: null,
        jlptLevel: null,
        include: true,
        cardType: 'word',
      },
    ]);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ word: '食べる', reading: 'たべる', mainViewMode: 'kanji' });
  });
});

describe('fillEmptyFields', () => {
  it('fills only the empty fields, keeping the teacher’s own entries', () => {
    const card = flashcard({ meaning: 'my own meaning', reading: '', example_jp: '' });
    const filled = fillEmptyFields(card, generatedCard());
    expect(filled.meaning).toBe('my own meaning');
    expect(filled.reading).toBe('ねこ');
    expect(filled.example_jp).toBe('猫がいます');
  });
});
