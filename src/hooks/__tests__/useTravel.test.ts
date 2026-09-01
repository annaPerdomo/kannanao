import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockLoadShowCards = vi.fn();
const mockDbUpdateShowCard = vi.fn();
const mockDbDeleteShowCard = vi.fn();

vi.mock('@/lib/supabase', () => ({
  loadShowCards: (...args: unknown[]) => mockLoadShowCards(...args),
  dbSaveShowCard: vi.fn(),
  dbUpdateShowCard: (...args: unknown[]) => mockDbUpdateShowCard(...args),
  dbDeleteShowCard: (...args: unknown[]) => mockDbDeleteShowCard(...args),
  sb: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

import { useShowCards } from '@/hooks/useTravel';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useShowCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadShowCards.mockResolvedValue([]);
  });

  describe('updateCard rollback', () => {
    it('restores the original card from memory on a failed write, without re-reading the database', async () => {
      mockDbUpdateShowCard.mockRejectedValue(new Error('gateway down'));

      const { result } = renderHook(() => useShowCards());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockLoadShowCards).toHaveBeenCalledTimes(1);

      const original = result.current.cards.find((c) => c.id === 'default-1');

      await act(async () => {
        await result.current.updateCard('default-1', { english: 'changed' });
      });

      expect(result.current.cards.find((c) => c.id === 'default-1')).toEqual(original);
      // The rollback must not re-fetch — the backend that just failed can't help here.
      expect(mockLoadShowCards).toHaveBeenCalledTimes(1);
    });

    it('keeps the optimistic edit when the write succeeds', async () => {
      mockDbUpdateShowCard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useShowCards());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateCard('default-1', { english: 'changed' });
      });

      expect(result.current.cards.find((c) => c.id === 'default-1')?.english).toBe('changed');
    });
  });

  describe('deleteCard rollback', () => {
    it('restores the deleted card from memory on a failed write, without re-reading the database', async () => {
      mockDbDeleteShowCard.mockRejectedValue(new Error('gateway down'));

      const { result } = renderHook(() => useShowCards());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const before = result.current.cards;
      expect(mockLoadShowCards).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.deleteCard('default-1');
      });

      expect(result.current.cards).toEqual(before);
      expect(mockLoadShowCards).toHaveBeenCalledTimes(1);
    });

    it('removes the card when the write succeeds', async () => {
      mockDbDeleteShowCard.mockResolvedValue(undefined);

      const { result } = renderHook(() => useShowCards());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteCard('default-1');
      });

      expect(result.current.cards.find((c) => c.id === 'default-1')).toBeUndefined();
    });
  });
});
