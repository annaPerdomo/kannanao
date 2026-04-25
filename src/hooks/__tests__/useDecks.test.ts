import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLoadDecks = vi.fn();
const mockCreateDeck = vi.fn();
const mockDeleteDeck = vi.fn();
const mockRenameDeck = vi.fn();
const mockUpdateDeckEmoji = vi.fn();
const mockPinDeck = vi.fn();
const mockSetDeckPublic = vi.fn();

vi.mock('@/lib/supabase', () => ({
  isConfigured: vi.fn(() => true),
  showConfigBanner: vi.fn(),
  loadDecks: (...args: unknown[]) => mockLoadDecks(...args),
  dbCreateDeck: (...args: unknown[]) => mockCreateDeck(...args),
  dbDeleteDeck: (...args: unknown[]) => mockDeleteDeck(...args),
  dbRenameDeck: (...args: unknown[]) => mockRenameDeck(...args),
  dbUpdateDeckEmoji: (...args: unknown[]) => mockUpdateDeckEmoji(...args),
  dbPinDeck: (...args: unknown[]) => mockPinDeck(...args),
  dbSetDeckPublic: (...args: unknown[]) => mockSetDeckPublic(...args),
}));

const mockUser = { id: 'user-1', email: 'test@kannanao.local' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

import { useDecks } from '@/hooks/useDecks';
import type { Deck } from '@/types/deck';

// ─── Test data ────────────────────────────────────────────────────────────────

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'deck-1',
    name: 'Test Deck',
    description: '',
    createdAt: Date.now(),
    cardCount: 0,
    ownerId: 'user-1',
    isShared: false,
    emoji: '🌸',
    pinned: false,
    isPublic: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useDecks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadDecks.mockResolvedValue([]);
  });

  describe('initial load', () => {
    it('should start in loading state', () => {
      mockLoadDecks.mockReturnValue(new Promise(() => {})); // never resolves
      const { result } = renderHook(() => useDecks());
      expect(result.current.loading).toBe(true);
    });

    it('should call loadDecks with the user id', async () => {
      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockLoadDecks).toHaveBeenCalledWith('user-1');
    });

    it('should populate decks after load resolves', async () => {
      const decks = [makeDeck({ id: 'deck-1' }), makeDeck({ id: 'deck-2' })];
      mockLoadDecks.mockResolvedValue(decks);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.decks).toHaveLength(2);
    });

    it('should set loading=false after decks load', async () => {
      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  describe('createDeck', () => {
    it('should optimistically add the deck and return it', async () => {
      const newDeck = makeDeck({ id: 'new-deck', name: 'New Deck' });
      mockCreateDeck.mockResolvedValue(newDeck);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let returned: Deck | undefined;
      await act(async () => {
        returned = await result.current.createDeck('New Deck');
      });

      expect(returned).toEqual(newDeck);
      expect(result.current.decks).toContainEqual(newDeck);
    });

    it('should throw when dbCreateDeck rejects', async () => {
      mockCreateDeck.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => { await result.current.createDeck('Bad Deck'); }),
      ).rejects.toThrow('DB error');
    });
  });

  describe('deleteDeck', () => {
    it('should remove the deck from the list', async () => {
      const deck = makeDeck({ id: 'deck-del' });
      mockLoadDecks.mockResolvedValue([deck]);
      mockDeleteDeck.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { await result.current.deleteDeck('deck-del'); });

      expect(result.current.decks).toHaveLength(0);
    });

    it('should call dbDeleteDeck with the correct id', async () => {
      mockDeleteDeck.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { await result.current.deleteDeck('deck-xyz'); });

      expect(mockDeleteDeck).toHaveBeenCalledWith('deck-xyz');
    });
  });

  describe('updateDeckEmoji', () => {
    it('should apply emoji optimistically', async () => {
      const deck = makeDeck({ id: 'deck-1', emoji: '🌸' });
      mockLoadDecks.mockResolvedValue([deck]);
      mockUpdateDeckEmoji.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { await result.current.updateDeckEmoji('deck-1', '🎀'); });

      expect(result.current.decks[0].emoji).toBe('🎀');
    });

    it('should roll back emoji on error', async () => {
      const deck = makeDeck({ id: 'deck-1', emoji: '🌸' });
      mockLoadDecks.mockResolvedValue([deck]);
      mockUpdateDeckEmoji.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { await result.current.updateDeckEmoji('deck-1', '🎀'); });

      // After rollback, emoji should revert
      expect(result.current.decks[0].emoji).toBe('🌸');
    });
  });

  describe('pinDeck', () => {
    it('should optimistically update pinned state', async () => {
      const deck = makeDeck({ id: 'deck-1', pinned: false });
      mockLoadDecks.mockResolvedValue([deck]);
      mockPinDeck.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { await result.current.pinDeck('deck-1', true); });

      expect(result.current.decks[0].pinned).toBe(true);
    });

    it('should roll back pin state on error', async () => {
      const deck = makeDeck({ id: 'deck-1', pinned: false });
      mockLoadDecks.mockResolvedValue([deck]);
      mockPinDeck.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { await result.current.pinDeck('deck-1', true); });

      expect(result.current.decks[0].pinned).toBe(false);
    });
  });

  describe('renameDeck', () => {
    it('should update deck name in the list', async () => {
      const deck = makeDeck({ id: 'deck-1', name: 'Old Name' });
      mockLoadDecks.mockResolvedValue([deck]);
      mockRenameDeck.mockResolvedValue({ ...deck, name: 'New Name' });

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.renameDeck('deck-1', 'New Name');
      });

      expect(result.current.decks[0].name).toBe('New Name');
    });
  });

  describe('updateDeckCount', () => {
    it('should update cardCount for the matching deck', async () => {
      const deck = makeDeck({ id: 'deck-1', cardCount: 5 });
      mockLoadDecks.mockResolvedValue([deck]);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => { result.current.updateDeckCount('deck-1', 10); });

      expect(result.current.decks[0].cardCount).toBe(10);
    });
  });

  describe('error state', () => {
    it('should return empty decks array when load fails', async () => {
      mockLoadDecks.mockResolvedValue([]);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.decks).toHaveLength(0);
    });
  });
});
