import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCardStrengths } from '@/components/Practice/KanjiMatchMode/useCardStrengths';
import type { Flashcard } from '@/types/flashcard';

let user: { id: string } | null = { id: 'user-1' };
const getCardProgressForUser = vi.fn();
const isConfigured = vi.fn(() => true);

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }));
vi.mock('@/lib/supabase', () => ({
  getCardProgressForUser: (...args: unknown[]) => getCardProgressForUser(...args),
  isConfigured: () => isConfigured(),
}));

function card(id: string): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word: '山',
    reading: 'やま',
    meaning: 'mountain',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'kanji',
    cardType: 'word',
    position: 0,
  };
}

const CARDS = [card('c1'), card('c2')];

describe('useCardStrengths', () => {
  beforeEach(() => {
    user = { id: 'user-1' };
    isConfigured.mockReturnValue(true);
    getCardProgressForUser.mockReset();
  });

  it('maps each progress row to its strength tier', async () => {
    getCardProgressForUser.mockResolvedValue([
      { cardId: 'c1', intervalDays: 0, ease: 2.5 },
      { cardId: 'c2', intervalDays: 9, ease: 2.5 },
    ]);

    const { result } = renderHook(() => useCardStrengths(CARDS));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.get('c1')).toBe('learning');
    expect(result.current?.get('c2')).toBe('strong');
    expect(getCardProgressForUser).toHaveBeenCalledWith('user-1', ['c1', 'c2']);
  });

  it('resolves to an empty map when signed out, without reading progress', async () => {
    user = null;

    const { result } = renderHook(() => useCardStrengths(CARDS));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.size).toBe(0);
    expect(getCardProgressForUser).not.toHaveBeenCalled();
  });

  it('resolves to an empty map when Supabase is not configured', async () => {
    isConfigured.mockReturnValue(false);

    const { result } = renderHook(() => useCardStrengths(CARDS));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(getCardProgressForUser).not.toHaveBeenCalled();
  });

  // Null forever would hang the session on <Loading />; an empty map deals the
  // deck's own order instead.
  it('falls back to an empty map when the progress read fails', async () => {
    getCardProgressForUser.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useCardStrengths(CARDS));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.size).toBe(0);
  });
});
