import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  sb: {
    auth: { getSession: () => mockGetSession() },
  },
  isConfigured: vi.fn(() => true),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useItemAnalysis } from '@/hooks/useItemAnalysis';
import { _resetApiCache } from '@/lib/apiCache';

beforeEach(() => _resetApiCache());

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ANALYSIS = {
  deckId: 'deck-1',
  deckName: 'JLPT N5',
  deckEmoji: '📗',
  memberCount: 4,
  cards: [
    {
      cardId: 'c1',
      word: '水',
      reading: 'みず',
      meaning: 'water',
      attemptCount: 3,
      correctTotal: 1,
      wrongTotal: 5,
      strugglingCount: 3,
      strugglingPct: 100,
      classAccuracy: 17,
    },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useItemAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok123' } } });
  });

  it('stays idle and fetches nothing when no deck is picked', async () => {
    const { result } = renderHook(() => useItemAnalysis(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.analysis).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('loads the analysis for the picked deck', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ANALYSIS });
    const { result } = renderHook(() => useItemAnalysis('deck-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.analysis?.cards).toHaveLength(1);
    expect(result.current.analysis?.deckName).toBe('JLPT N5');
    expect(mockFetch.mock.calls[0][0]).toBe('/api/group/item-analysis?deckId=deck-1');
  });

  it('includes the Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ANALYSIS });
    renderHook(() => useItemAnalysis('deck-1'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok123');
  });

  it('sets an error when the fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useItemAnalysis('deck-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load analysis');
    expect(result.current.analysis).toBeNull();
  });
});
