import { describe, expect, it } from 'vitest';

import {
  buildQuizQuestions,
  checkTypedAnswer,
  quizAccuracy,
  quizResultsToCsv,
  type QuizScoreRow,
  quizStars,
} from '@/lib/quiz';
import type { Flashcard } from '@/types/flashcard';

function card(id: string, over: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    deckId: 'd1',
    word: `word${id}`,
    reading: `reading${id}`,
    meaning: `meaning${id}`,
    mainViewMode: 'hiragana',
    ...over,
  } as Flashcard;
}

const deck = Array.from({ length: 20 }, (_, i) => card(String(i)));

describe('buildQuizQuestions', () => {
  it('caps at the requested count when the deck is larger', () => {
    expect(buildQuizQuestions(deck, 10)).toHaveLength(10);
  });

  it('uses all cards when the deck is smaller than the count', () => {
    const small = deck.slice(0, 4);
    expect(buildQuizQuestions(small, 10)).toHaveLength(4);
  });

  it('asks each card exactly once (no re-queue)', () => {
    const qs = buildQuizQuestions(deck, 10);
    const ids = qs.map((q) => q.card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('alternates question types starting with choice', () => {
    const qs = buildQuizQuestions(deck, 6);
    expect(qs.map((q) => q.type)).toEqual([
      'choice',
      'typed',
      'choice',
      'typed',
      'choice',
      'typed',
    ]);
  });
});

describe('checkTypedAnswer', () => {
  const c = card('x', { word: '犬', reading: 'いぬ' });
  it('accepts the written word', () => expect(checkTypedAnswer(' 犬 ', c)).toBe(true));
  it('accepts the reading', () => expect(checkTypedAnswer('いぬ', c)).toBe(true));
  it('rejects a wrong answer', () => expect(checkTypedAnswer('ねこ', c)).toBe(false));
  it('rejects an empty answer', () => expect(checkTypedAnswer('   ', c)).toBe(false));
});

describe('quizStars', () => {
  it.each([
    [100, 3],
    [90, 3],
    [89, 2],
    [70, 2],
    [69, 1],
    [0, 1],
  ])('%i%% → %i stars', (pct, stars) => {
    expect(quizStars(pct)).toBe(stars);
  });
});

describe('quizAccuracy', () => {
  it('rounds to a 0-100 integer', () => {
    expect(quizAccuracy(8, 10)).toBe(80);
    expect(quizAccuracy(2, 3)).toBe(67);
  });
  it('is 0 when nothing was answered', () => {
    expect(quizAccuracy(0, 0)).toBe(0);
  });
});

describe('quizResultsToCsv', () => {
  const rows: QuizScoreRow[] = [
    {
      memberId: 'm1',
      name: 'Aiko',
      attempts: 2,
      best: { score: 9, total: 10, accuracy: 90 },
      latest: { score: 7, total: 10, accuracy: 70, takenAt: '2026-07-12T10:30:00.000Z' },
    },
    { memberId: 'm2', name: 'Ben', attempts: 0, best: null, latest: null },
  ];

  it('emits a header plus one row per member', () => {
    const lines = quizResultsToCsv(rows, 'Chapter 1').split('\n');
    expect(lines[0]).toBe('Member,Deck,Best Score,Latest Score,Attempts,Last Taken');
    expect(lines).toHaveLength(3);
  });

  it('formats scores and trims the date to YMD', () => {
    const lines = quizResultsToCsv(rows, 'Chapter 1').split('\n');
    expect(lines[1]).toBe('Aiko,Chapter 1,9/10,7/10,2,2026-07-12');
  });

  it('leaves score/date blank for members with no attempts', () => {
    const lines = quizResultsToCsv(rows, 'Chapter 1').split('\n');
    expect(lines[2]).toBe('Ben,Chapter 1,,,0,');
  });

  it('quotes and escapes values containing commas or quotes', () => {
    const tricky: QuizScoreRow[] = [
      { memberId: 'm3', name: 'Lee, "The Ace"', attempts: 1, best: null, latest: null },
    ];
    const line = quizResultsToCsv(tricky, 'Deck, A').split('\n')[1];
    expect(line).toBe('"Lee, ""The Ace""","Deck, A",,,1,');
  });
});
