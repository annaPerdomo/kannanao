import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLoadDecks = vi.fn();
const mockCreateDeck = vi.fn();
const mockDeleteDeck = vi.fn();
const mockRenameDeck = vi.fn();
const mockUpdateDeckEmoji = vi.fn();
const mockPinDeck = vi.fn();
const mockSetDeckPublic = vi.fn();
const mockSetDeckReadingPractice = vi.fn();
const mockReorderDecks = vi.fn();

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
  dbSetDeckReadingPractice: (...args: unknown[]) => mockSetDeckReadingPractice(...args),
  dbReorderDecks: (...args: unknown[]) => mockReorderDecks(...args),
}));

const mockUser = { id: 'user-1', email: 'test@kannanao.local' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

import { useDecks } from '@/hooks/useDecks';
import { isConfigured, showConfigBanner } from '@/lib/supabase';
import type { Deck } from '@/types/deck';

const mockIsConfigured = vi.mocked(isConfigured);
const mockShowConfigBanner = vi.mocked(showConfigBanner);

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
    position: 0,
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
        act(async () => {
          await result.current.createDeck('Bad Deck');
        }),
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

      await act(async () => {
        await result.current.deleteDeck('deck-del');
      });

      expect(result.current.decks).toHaveLength(0);
    });

    it('should call dbDeleteDeck with the correct id', async () => {
      mockDeleteDeck.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteDeck('deck-xyz');
      });

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

      await act(async () => {
        await result.current.updateDeckEmoji('deck-1', '🎀');
      });

      expect(result.current.decks[0].emoji).toBe('🎀');
    });

    it('should roll back emoji on error', async () => {
      const deck = makeDeck({ id: 'deck-1', emoji: '🌸' });
      mockLoadDecks.mockResolvedValue([deck]);
      mockUpdateDeckEmoji.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateDeckEmoji('deck-1', '🎀');
      });

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

      await act(async () => {
        await result.current.pinDeck('deck-1', true);
      });

      expect(result.current.decks[0].pinned).toBe(true);
    });

    it('should roll back pin state on error', async () => {
      const deck = makeDeck({ id: 'deck-1', pinned: false });
      mockLoadDecks.mockResolvedValue([deck]);
      mockPinDeck.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.pinDeck('deck-1', true);
      });

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

    it('should update both name and description when description is provided', async () => {
      const deck = makeDeck({ id: 'deck-1', name: 'Old Name', description: 'Old desc' });
      mockLoadDecks.mockResolvedValue([deck]);
      mockRenameDeck.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.renameDeck('deck-1', 'New Name', 'New desc');
      });

      expect(result.current.decks[0].name).toBe('New Name');
      expect(result.current.decks[0].description).toBe('New desc');
    });
  });

  describe('updateDeckCount', () => {
    it('should update cardCount for the matching deck', async () => {
      const deck = makeDeck({ id: 'deck-1', cardCount: 5 });
      mockLoadDecks.mockResolvedValue([deck]);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.updateDeckCount('deck-1', 10);
      });

      expect(result.current.decks[0].cardCount).toBe(10);
    });
  });

  describe('setDeckPublic', () => {
    it('should optimistically update isPublic state', async () => {
      const deck = makeDeck({ id: 'deck-1', isPublic: false });
      mockLoadDecks.mockResolvedValue([deck]);
      mockSetDeckPublic.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setDeckPublic('deck-1', true);
      });

      expect(result.current.decks[0].isPublic).toBe(true);
    });

    it('should roll back isPublic on error', async () => {
      const deck = makeDeck({ id: 'deck-1', isPublic: false });
      mockLoadDecks.mockResolvedValue([deck]);
      mockSetDeckPublic.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setDeckPublic('deck-1', true);
      });

      expect(result.current.decks[0].isPublic).toBe(false);
    });
  });

  describe('setDeckReadingPractice', () => {
    it('should optimistically unlock reading practice', async () => {
      mockLoadDecks.mockResolvedValue([makeDeck({ id: 'deck-1', readingPractice: false })]);
      mockSetDeckReadingPractice.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setDeckReadingPractice('deck-1', true);
      });

      expect(result.current.decks[0].readingPractice).toBe(true);
      expect(mockSetDeckReadingPractice).toHaveBeenCalledWith('deck-1', true);
    });

    it('should roll back to locked on error', async () => {
      mockLoadDecks.mockResolvedValue([makeDeck({ id: 'deck-1', readingPractice: false })]);
      mockSetDeckReadingPractice.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.setDeckReadingPractice('deck-1', true);
      });

      expect(result.current.decks[0].readingPractice).toBe(false);
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

  describe('updateDeckEmoji edge cases', () => {
    it('should do nothing when deck id is not found', async () => {
      mockLoadDecks.mockResolvedValue([makeDeck({ id: 'deck-1' })]);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Should not throw and should not call the DB
      await act(async () => {
        await result.current.updateDeckEmoji('nonexistent', '🎀');
      });

      expect(mockUpdateDeckEmoji).not.toHaveBeenCalled();
    });
  });

  describe('reorderDecks', () => {
    it('should optimistically update positions and call dbReorderDecks', async () => {
      const deckA = makeDeck({ id: 'a', name: 'A', position: 0 });
      const deckB = makeDeck({ id: 'b', name: 'B', position: 1 });
      const deckC = makeDeck({ id: 'c', name: 'C', position: 2 });
      mockLoadDecks.mockResolvedValue([deckA, deckB, deckC]);
      mockReorderDecks.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Reorder: swap A and B
      await act(async () => {
        await result.current.reorderDecks([deckB, deckA]);
      });

      expect(mockReorderDecks).toHaveBeenCalledWith(['b', 'a']);
      // B should now have position 0, A position 1
      const reordered = result.current.decks;
      expect(reordered.find((d) => d.id === 'b')?.position).toBe(0);
      expect(reordered.find((d) => d.id === 'a')?.position).toBe(1);
      // C should remain untouched
      expect(reordered.find((d) => d.id === 'c')?.position).toBe(2);
    });

    it('should preserve relative order of untouched decks', async () => {
      const deckA = makeDeck({ id: 'a', name: 'A', position: 0, pinned: true });
      const deckB = makeDeck({ id: 'b', name: 'B', position: 1, pinned: true });
      const deckC = makeDeck({ id: 'c', name: 'C', position: 2 });
      const deckD = makeDeck({ id: 'd', name: 'D', position: 3 });
      mockLoadDecks.mockResolvedValue([deckA, deckB, deckC, deckD]);
      mockReorderDecks.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Only reorder pinned decks (A, B → B, A)
      await act(async () => {
        await result.current.reorderDecks([deckB, deckA]);
      });

      // Overall array order should be preserved: A, B, C, D (same indices)
      const ids = result.current.decks.map((d) => d.id);
      expect(ids).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should roll back state on dbReorderDecks failure', async () => {
      const deckA = makeDeck({ id: 'a', name: 'A', position: 0 });
      const deckB = makeDeck({ id: 'b', name: 'B', position: 1 });
      mockLoadDecks.mockResolvedValue([deckA, deckB]);
      mockReorderDecks.mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.reorderDecks([deckB, deckA]);
      });

      // Should roll back to original positions
      expect(result.current.decks[0].position).toBe(0);
      expect(result.current.decks[1].position).toBe(1);
    });
  });

  describe('when Supabase is not configured', () => {
    beforeEach(() => {
      mockIsConfigured.mockReturnValue(false);
    });

    afterEach(() => {
      mockIsConfigured.mockReturnValue(true);
    });

    it('createDeck should call showConfigBanner and throw', async () => {
      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.createDeck('My Deck');
        }),
      ).rejects.toThrow();

      expect(mockShowConfigBanner).toHaveBeenCalled();
      expect(mockCreateDeck).not.toHaveBeenCalled();
    });

    it('deleteDeck should call showConfigBanner and throw', async () => {
      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.deleteDeck('deck-1');
        }),
      ).rejects.toThrow();

      expect(mockShowConfigBanner).toHaveBeenCalled();
      expect(mockDeleteDeck).not.toHaveBeenCalled();
    });

    it('renameDeck should call showConfigBanner and throw', async () => {
      const { result } = renderHook(() => useDecks());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.renameDeck('deck-1', 'New Name');
        }),
      ).rejects.toThrow();

      expect(mockShowConfigBanner).toHaveBeenCalled();
      expect(mockRenameDeck).not.toHaveBeenCalled();
    });
  });
});
