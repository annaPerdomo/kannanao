import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoadCards = vi.fn();
const mockIsConfigured = vi.fn(() => true);

vi.mock('@/lib/supabase', () => ({
  loadCards: (...args: unknown[]) => mockLoadCards(...args),
  isConfigured: () => mockIsConfigured(),
}));

import { useDeckWords } from '@/hooks/useDeckWords';
import type { Flashcard } from '@/types/flashcard';

function makeCard(id: string): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word: `word-${id}`,
    reading: `reading-${id}`,
    meaning: `meaning-${id}`,
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
  };
}

describe('useDeckWords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
    mockLoadCards.mockResolvedValue([makeCard('1'), makeCard('2')]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns words on success', async () => {
    const { result } = renderHook(() => useDeckWords('deck-1', true));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.words).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(mockLoadCards).toHaveBeenCalledWith('deck-1');
  });

  it('sets an error on rejection', async () => {
    mockLoadCards.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useDeckWords('deck-1', true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('boom');
    expect(result.current.words).toEqual([]);
  });

  it('does not call loadCards when enabled is false', () => {
    renderHook(() => useDeckWords('deck-1', false));

    expect(mockLoadCards).not.toHaveBeenCalled();
  });

  it('does not call loadCards when deckId is null', () => {
    renderHook(() => useDeckWords(null, true));

    expect(mockLoadCards).not.toHaveBeenCalled();
  });

  it('ignores a stale deck-1 response that resolves after switching to deck-2', async () => {
    let resolveDeck1: (cards: Flashcard[]) => void;
    let resolveDeck2: (cards: Flashcard[]) => void;
    const deck1Promise = new Promise<Flashcard[]>((resolve) => {
      resolveDeck1 = resolve;
    });
    const deck2Promise = new Promise<Flashcard[]>((resolve) => {
      resolveDeck2 = resolve;
    });
    mockLoadCards.mockImplementation((deckId: string) =>
      deckId === 'deck-1' ? deck1Promise : deck2Promise,
    );

    const { result, rerender } = renderHook(({ deckId }) => useDeckWords(deckId, true), {
      initialProps: { deckId: 'deck-1' },
    });

    rerender({ deckId: 'deck-2' });

    await act(async () => {
      resolveDeck2([makeCard('deck2-1')]);
      await deck2Promise;
    });
    await act(async () => {
      resolveDeck1([makeCard('deck1-1')]);
      await deck1Promise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.words).toEqual([makeCard('deck2-1')]);
  });
});
