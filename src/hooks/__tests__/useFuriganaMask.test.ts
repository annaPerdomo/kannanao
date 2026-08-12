import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Flashcard } from '@/types/flashcard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

const getCardProgressForUser = vi.fn();
vi.mock('@/lib/supabase', () => ({
  getCardProgressForUser: (...args: unknown[]) => getCardProgressForUser(...args),
  isConfigured: () => true,
}));

import { useFuriganaMask } from '@/hooks/useFuriganaMask';

function card(id: string, mainViewMode: Flashcard['mainViewMode']): Flashcard {
  return {
    id,
    deckId: 'd1',
    word: '貸す',
    reading: 'かす',
    meaning: 'to lend',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode,
    cardType: 'word',
    position: 0,
  };
}

/** interval ≥ 3 and ease ≥ 2.0 is what cardStrength calls strong. */
const progressRow = (cardId: string, intervalDays: number, ease = 2.5) => ({
  cardId,
  correctCount: 3,
  wrongCount: 0,
  lastReviewedAt: null,
  nextReviewAt: '2026-01-01',
  intervalDays,
  ease,
});

describe('useFuriganaMask', () => {
  beforeEach(() => {
    getCardProgressForUser.mockReset();
  });

  it('masks strong cards and leaves learning/new cards visible', async () => {
    getCardProgressForUser.mockResolvedValue([
      progressRow('strong', 5),
      progressRow('learning', 0),
    ]);
    const cards = [card('strong', 'kanji'), card('learning', 'kanji'), card('new', 'kanji')];
    const { result } = renderHook(() => useFuriganaMask(cards));

    await waitFor(() => expect(result.current('strong')).toBe(true));
    expect(result.current('learning')).toBe(false);
    expect(result.current('new')).toBe(false);
  });

  it('only fetches rows for kanji-mode cards', async () => {
    getCardProgressForUser.mockResolvedValue([]);
    renderHook(() => useFuriganaMask([card('k1', 'kanji'), card('h1', 'hiragana')]));

    await waitFor(() => expect(getCardProgressForUser).toHaveBeenCalledWith('u1', ['k1']));
  });

  it('fetches nothing when no card is in kanji mode', () => {
    const { result } = renderHook(() => useFuriganaMask([card('h1', 'hiragana')]));

    expect(getCardProgressForUser).not.toHaveBeenCalled();
    expect(result.current('h1')).toBe(false);
  });

  it('shows furigana while the fetch is still in flight', () => {
    getCardProgressForUser.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFuriganaMask([card('strong', 'kanji')]));

    expect(result.current('strong')).toBe(false);
  });
});
