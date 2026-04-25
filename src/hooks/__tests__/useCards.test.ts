import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLoadCards = vi.fn();
const mockInsertCards = vi.fn();
const mockUpdateCard = vi.fn();
const mockDeleteCard = vi.fn();
const mockCopyCards = vi.fn();

vi.mock('@/lib/supabase', () => ({
  isConfigured: vi.fn(() => true),
  showConfigBanner: vi.fn(),
  loadCards: (...args: unknown[]) => mockLoadCards(...args),
  dbInsertCards: (...args: unknown[]) => mockInsertCards(...args),
  dbUpdateCard: (...args: unknown[]) => mockUpdateCard(...args),
  dbDeleteCard: (...args: unknown[]) => mockDeleteCard(...args),
  dbCopyCardsIntoDeck: (...args: unknown[]) => mockCopyCards(...args),
}));

import { useCards } from '@/hooks/useCards';
import type { Flashcard } from '@/types/flashcard';

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
});
