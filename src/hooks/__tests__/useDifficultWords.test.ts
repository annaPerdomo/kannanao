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

import { useDifficultWords } from '@/hooks/useDifficultWords';
import { _resetApiCache } from '@/lib/apiCache';

beforeEach(() => _resetApiCache());

// ─── Fixtures ────────────────────────────────────────────────────────────────

const WORDS = {
  learnerCount: 6,
  decks: [{ id: 'deck-1', name: 'JLPT N5', emoji: '📗' }],
  words: [
    {
      cardId: 'c1',
      deckId: 'deck-1',
      deckName: 'JLPT N5',
      deckEmoji: '📗',
      word: '水',
      reading: 'みず',
      meaning: 'water',
      reason: 'forgotten',
      learnersAffected: 3,
      learnerCount: 5,
      attemptCount: 20,
      classAccuracy: 62,
    },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useDifficultWords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok123' } } });
  });

  it('stays idle and fetches nothing without a group', async () => {
    const { result } = renderHook(() => useDifficultWords(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('loads the words for the group', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => WORDS });
    const { result } = renderHook(() => useDifficultWords('group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.words).toHaveLength(1);
    expect(result.current.data?.learnerCount).toBe(6);
    expect(mockFetch.mock.calls[0][0]).toBe('/api/group/difficult-words?groupId=group-1');
  });

  it('starts out loading so the empty state never paints first', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => WORDS });
    const { result } = renderHook(() => useDifficultWords('group-1'));
    expect(result.current.loading).toBe(true);
  });

  it('narrows to one deck when given a deckId', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => WORDS });
    renderHook(() => useDifficultWords('group-1', 'deck-1'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toBe(
      '/api/group/difficult-words?groupId=group-1&deckId=deck-1',
    );
  });

  it('includes the Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => WORDS });
    renderHook(() => useDifficultWords('group-1'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok123');
  });

  it('sets an error when the fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useDifficultWords('group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load tricky words');
    expect(result.current.data).toBeNull();
  });
});
