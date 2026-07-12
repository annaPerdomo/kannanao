import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useQuizFlow } from '@/hooks/useQuizFlow';
import type { Flashcard } from '@/types/flashcard';

const cards = Array.from(
  { length: 6 },
  (_, i) => ({ id: String(i), deckId: 'd1', word: `w${i}`, meaning: `m${i}` }) as Flashcard,
);

describe('useQuizFlow', () => {
  it('starts on the first question with a zeroed score', () => {
    const { result } = renderHook(() => useQuizFlow(cards, 4));
    expect(result.current.total).toBe(4);
    expect(result.current.index).toBe(0);
    expect(result.current.score).toBe(0);
    expect(result.current.phase).toBe('playing');
    expect(result.current.current).toBeDefined();
  });

  it('advances without re-queueing and increments score only on correct', () => {
    const { result } = renderHook(() => useQuizFlow(cards, 4));

    act(() => result.current.answer(true));
    expect(result.current.index).toBe(1);
    expect(result.current.score).toBe(1);

    act(() => result.current.answer(false));
    expect(result.current.index).toBe(2);
    expect(result.current.score).toBe(1); // wrong answer did not bump score
  });

  it('finishes after exactly `total` answers — no wrong-card retries', () => {
    const { result } = renderHook(() => useQuizFlow(cards, 4));
    // Answer all 4 wrong; a practice queue would re-queue them, a quiz must not.
    act(() => result.current.answer(false));
    act(() => result.current.answer(false));
    act(() => result.current.answer(false));
    expect(result.current.phase).toBe('playing');
    act(() => result.current.answer(false));
    expect(result.current.phase).toBe('done');
    expect(result.current.score).toBe(0);
    expect(result.current.current).toBeUndefined();
  });

  it('keeps a perfect score when every answer is correct', () => {
    const { result } = renderHook(() => useQuizFlow(cards, 4));
    for (let i = 0; i < 4; i++) act(() => result.current.answer(true));
    expect(result.current.phase).toBe('done');
    expect(result.current.score).toBe(4);
  });
});
