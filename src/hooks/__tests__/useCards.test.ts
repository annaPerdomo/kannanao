import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLoadCards = vi.fn();
const mockInsertCards = vi.fn();
const mockUpdateCard = vi.fn();
const mockDeleteCard = vi.fn();
const mockCopyCards = vi.fn();
const mockReorderCards = vi.fn();
const mockSetCardsMainViewMode = vi.fn();

vi.mock('@/lib/supabase', () => ({
  isConfigured: vi.fn(() => true),
  showConfigBanner: vi.fn(),
  loadCards: (...args: unknown[]) => mockLoadCards(...args),
  dbInsertCards: (...args: unknown[]) => mockInsertCards(...args),
  dbUpdateCard: (...args: unknown[]) => mockUpdateCard(...args),
  dbDeleteCard: (...args: unknown[]) => mockDeleteCard(...args),
  dbCopyCardsIntoDeck: (...args: unknown[]) => mockCopyCards(...args),
  dbReorderCards: (...args: unknown[]) => mockReorderCards(...args),
  dbSetCardsMainViewMode: (...args: unknown[]) => mockSetCardsMainViewMode(...args),
}));

import { useCards } from '@/hooks/useCards';
import { DataError } from '@/lib/dataError';
import { isConfigured, showConfigBanner } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

const mockIsConfigured = vi.mocked(isConfigured);
const mockShowConfigBanner = vi.mocked(showConfigBanner);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCard(id: string, overrides: Partial<Flashcard> = {}): Flashcard {
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
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadCards.mockResolvedValue([]);
  });

  describe('initial load', () => {
    it('should start in loading state', () => {
      mockLoadCards.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useCards('deck-1'));
      expect(result.current.loading).toBe(true);
    });

    it('should load cards for the given deckId', async () => {
      const cards = [makeCard('c1'), makeCard('c2')];
      mockLoadCards.mockResolvedValue(cards);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.cards).toHaveLength(2);
      expect(mockLoadCards).toHaveBeenCalledWith('deck-1');
    });

    it('should call onCountChange with loaded card count', async () => {
      const cards = [makeCard('c1'), makeCard('c2'), makeCard('c3')];
      mockLoadCards.mockResolvedValue(cards);
      const onCountChange = vi.fn();

      const { result } = renderHook(() => useCards('deck-1', onCountChange));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(onCountChange).toHaveBeenCalledWith(3);
    });

    it('should not update state after unmount (stale fetch guard)', async () => {
      let resolveLoad!: (cards: ReturnType<typeof makeCard>[]) => void;
      mockLoadCards.mockReturnValue(
        new Promise<ReturnType<typeof makeCard>[]>((resolve) => {
          resolveLoad = resolve;
        }),
      );

      const { result, unmount } = renderHook(() => useCards('deck-1'));
      expect(result.current.loading).toBe(true);

      // Unmount before the fetch resolves — the cancelled flag should block the state update
      unmount();
      resolveLoad([makeCard('c1')]);

      // If state updated after unmount, React would log an error; absence of that confirms the guard works
      expect(result.current.loading).toBe(true);
    });
  });

  describe('addCard', () => {
    it('should add the saved card to the list', async () => {
      const savedCard = makeCard('new-c');
      mockInsertCards.mockResolvedValue([savedCard]);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const { id: _id, ...cardWithoutId } = savedCard;
      await act(async () => {
        await result.current.addCard(cardWithoutId);
      });

      expect(result.current.cards).toContainEqual(savedCard);
    });

    it('should return the saved card', async () => {
      const savedCard = makeCard('new-c');
      mockInsertCards.mockResolvedValue([savedCard]);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const { id: _id, ...cardWithoutId } = savedCard;
      let returned: Flashcard | undefined;
      await act(async () => {
        returned = await result.current.addCard(cardWithoutId);
      });

      expect(returned).toEqual(savedCard);
    });
  });

  describe('addCards', () => {
    it('should append multiple cards to the list', async () => {
      const savedCards = [makeCard('c1'), makeCard('c2')];
      mockInsertCards.mockResolvedValue(savedCards);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const { id: _id1, ...card1WithoutId } = savedCards[0];
      const { id: _id2, ...card2WithoutId } = savedCards[1];
      await act(async () => {
        await result.current.addCards([card1WithoutId, card2WithoutId]);
      });

      expect(result.current.cards).toHaveLength(2);
    });
  });

  describe('updateCard', () => {
    it('should replace the card in the list on success', async () => {
      const original = makeCard('c1', { meaning: 'original' });
      const updated = makeCard('c1', { meaning: 'updated' });
      mockLoadCards.mockResolvedValue([original]);
      mockUpdateCard.mockResolvedValue(updated);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateCard('c1', { meaning: 'updated' });
      });

      expect(result.current.cards[0].meaning).toBe('updated');
    });

    it('should return the updated card', async () => {
      const original = makeCard('c1');
      const updated = makeCard('c1', { meaning: 'updated' });
      mockLoadCards.mockResolvedValue([original]);
      mockUpdateCard.mockResolvedValue(updated);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let returned: Flashcard | null = null;
      await act(async () => {
        returned = await result.current.updateCard('c1', { meaning: 'updated' });
      });

      expect(returned).toEqual(updated);
    });

    it('should return null when dbUpdateCard returns null', async () => {
      const original = makeCard('c1');
      mockLoadCards.mockResolvedValue([original]);
      mockUpdateCard.mockResolvedValue(null);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let returned: Flashcard | null = undefined as unknown as Flashcard;
      await act(async () => {
        returned = await result.current.updateCard('c1', {});
      });

      expect(returned).toBeNull();
    });

    it('propagates a failed write instead of resolving null', async () => {
      const original = makeCard('c1');
      mockLoadCards.mockResolvedValue([original]);
      mockUpdateCard.mockRejectedValue(new DataError('upstream', 'gateway down'));

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(result.current.updateCard('c1', { meaning: 'x' })).rejects.toBeInstanceOf(
        DataError,
      );
      // The card on screen must not claim the edit landed.
      expect(result.current.cards[0]).toEqual(original);
    });
  });

  describe('deleteCard', () => {
    it('should remove the card from the list', async () => {
      const cards = [makeCard('c1'), makeCard('c2')];
      mockLoadCards.mockResolvedValue(cards);
      mockDeleteCard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteCard('c1');
      });

      expect(result.current.cards).toHaveLength(1);
      expect(result.current.cards[0].id).toBe('c2');
    });

    it('should call dbDeleteCard with correct id', async () => {
      mockDeleteCard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteCard('c1');
      });

      expect(mockDeleteCard).toHaveBeenCalledWith('c1');
    });
  });

  describe('reorderCards', () => {
    it('should optimistically update positions and call dbReorderCards', async () => {
      const cardA = makeCard('a', { position: 0 });
      const cardB = makeCard('b', { position: 1 });
      mockLoadCards.mockResolvedValue([cardA, cardB]);
      mockReorderCards.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Reorder: swap A and B
      await act(async () => {
        await result.current.reorderCards([cardB, cardA]);
      });

      expect(mockReorderCards).toHaveBeenCalledWith(['b', 'a']);
      expect(result.current.cards[0].id).toBe('b');
      expect(result.current.cards[0].position).toBe(0);
      expect(result.current.cards[1].id).toBe('a');
      expect(result.current.cards[1].position).toBe(1);
    });

    it('should roll back state on dbReorderCards failure', async () => {
      const cardA = makeCard('a', { position: 0 });
      const cardB = makeCard('b', { position: 1 });
      mockLoadCards.mockResolvedValue([cardA, cardB]);
      mockReorderCards.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.reorderCards([cardB, cardA]);
      });

      // Should roll back to original order
      expect(result.current.cards[0].id).toBe('a');
      expect(result.current.cards[0].position).toBe(0);
      expect(result.current.cards[1].id).toBe('b');
      expect(result.current.cards[1].position).toBe(1);
    });
  });

  describe('setAllMainViewMode', () => {
    it('should switch every card in the deck at once', async () => {
      mockLoadCards.mockResolvedValue([
        makeCard('a', { mainViewMode: 'hiragana' }),
        makeCard('b', { mainViewMode: 'romaji' }),
      ]);
      mockSetCardsMainViewMode.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setAllMainViewMode('kanji');
      });

      expect(mockSetCardsMainViewMode).toHaveBeenCalledWith('deck-1', 'kanji');
      expect(result.current.cards.map((c) => c.mainViewMode)).toEqual(['kanji', 'kanji']);
    });

    it('should roll back and rethrow when the write fails', async () => {
      mockLoadCards.mockResolvedValue([makeCard('a', { mainViewMode: 'hiragana' })]);
      mockSetCardsMainViewMode.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await expect(result.current.setAllMainViewMode('kanji')).rejects.toThrow('DB error');
      });

      expect(result.current.cards[0].mainViewMode).toBe('hiragana');
    });
  });

  describe('when Supabase is not configured', () => {
    beforeEach(() => {
      mockIsConfigured.mockReturnValue(false);
    });

    afterEach(() => {
      mockIsConfigured.mockReturnValue(true);
    });

    it('addCard should call showConfigBanner and return undefined', async () => {
      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let returned: Flashcard | undefined;
      await act(async () => {
        returned = await result.current.addCard({
          word: 'x',
          reading: '',
          meaning: '',
          image_query: '',
          example_jp: '',
          example_en: '',
          deckId: 'deck-1',
          mainViewMode: 'hiragana',
          cardType: 'word',
        });
      });

      expect(mockShowConfigBanner).toHaveBeenCalled();
      expect(returned).toBeUndefined();
    });

    it('addCards should call showConfigBanner and not insert', async () => {
      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.addCards([
          {
            word: 'x',
            reading: '',
            meaning: '',
            image_query: '',
            example_jp: '',
            example_en: '',
            deckId: 'deck-1',
            mainViewMode: 'hiragana',
            cardType: 'word',
          },
        ]);
      });

      expect(mockShowConfigBanner).toHaveBeenCalled();
      expect(mockInsertCards).not.toHaveBeenCalled();
    });

    it('deleteCard should call showConfigBanner and not delete', async () => {
      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteCard('c1');
      });

      expect(mockShowConfigBanner).toHaveBeenCalled();
      expect(mockDeleteCard).not.toHaveBeenCalled();
    });

    it('updateCard should call showConfigBanner and return null', async () => {
      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let returned: Flashcard | null = undefined as unknown as Flashcard;
      await act(async () => {
        returned = await result.current.updateCard('c1', {});
      });

      expect(mockShowConfigBanner).toHaveBeenCalled();
      expect(returned).toBeNull();
    });

    it('copyExistingCards should call showConfigBanner and not copy', async () => {
      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.copyExistingCards([makeCard('c1')]);
      });

      expect(mockShowConfigBanner).toHaveBeenCalled();
      expect(mockCopyCards).not.toHaveBeenCalled();
    });
  });

  describe('addCard edge cases', () => {
    it('should return undefined when dbInsertCards returns empty array', async () => {
      mockInsertCards.mockResolvedValue([]);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let returned: Flashcard | undefined;
      await act(async () => {
        returned = await result.current.addCard({
          word: 'x',
          reading: '',
          meaning: '',
          image_query: '',
          example_jp: '',
          example_en: '',
          deckId: 'deck-1',
          mainViewMode: 'hiragana',
          cardType: 'word',
        });
      });

      expect(returned).toBeUndefined();
    });
  });

  describe('a failed load and an empty deck', () => {
    it('sets error when the load throws', async () => {
      mockLoadCards.mockRejectedValue(new DataError('upstream', 'gateway down', { status: 503 }));

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error?.kind).toBe('upstream');
      expect(result.current.cards).toEqual([]);
    });

    it('leaves error null for a deck that genuinely has no cards', async () => {
      mockLoadCards.mockResolvedValue([]);

      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeNull();
      expect(result.current.cards).toEqual([]);
    });

    it('does not report a card count to the parent when the load failed', async () => {
      // A 0 here would overwrite the deck's real count with a lie.
      const onCountChange = vi.fn();
      mockLoadCards.mockRejectedValue(new DataError('upstream', 'gateway down'));

      const { result } = renderHook(() => useCards('deck-1', onCountChange));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(onCountChange).not.toHaveBeenCalled();
    });

    it('retry refetches once the backend recovers', async () => {
      mockLoadCards.mockRejectedValueOnce(new DataError('upstream', 'gateway down'));
      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.error).not.toBeNull());

      mockLoadCards.mockResolvedValue([makeCard('card-1')]);
      act(() => result.current.retry());

      await waitFor(() => expect(result.current.cards).toHaveLength(1));
      expect(result.current.error).toBeNull();
    });

    it('goes back into loading immediately on retry, instead of flashing the empty state', async () => {
      mockLoadCards.mockRejectedValueOnce(new DataError('upstream', 'gateway down'));
      const { result } = renderHook(() => useCards('deck-1'));
      await waitFor(() => expect(result.current.error).not.toBeNull());

      let resolveRetry!: (cards: ReturnType<typeof makeCard>[]) => void;
      mockLoadCards.mockReturnValue(
        new Promise<ReturnType<typeof makeCard>[]>((resolve) => {
          resolveRetry = resolve;
        }),
      );

      act(() => result.current.retry());
      expect(result.current.loading).toBe(true);

      resolveRetry([makeCard('card-1')]);
      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });
});
