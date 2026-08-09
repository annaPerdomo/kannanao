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

import { useDeckReadiness } from '@/hooks/useDeckReadiness';
import { _resetApiCache } from '@/lib/apiCache';

beforeEach(() => _resetApiCache());

// ─── Fixtures ────────────────────────────────────────────────────────────────

const READINESS = {
  decks: [
    {
      deckId: 'deck-1',
      deckName: 'JLPT N5',
      deckEmoji: '📗',
      cardCount: 20,
      learnerCount: 4,
      strong: 12,
      learning: 30,
      unseen: 38,
      accuracyPct: 68,
      strugglingLearnerIds: ['m3'],
    },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useDeckReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok123' } } });
  });

  it('stays idle and fetches nothing without a group', async () => {
    const { result } = renderHook(() => useDeckReadiness(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('loads the readiness rollup for the group', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READINESS });
    const { result } = renderHook(() => useDeckReadiness('group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.decks).toHaveLength(1);
    expect(result.current.data?.decks[0].accuracyPct).toBe(68);
    expect(mockFetch.mock.calls[0][0]).toBe('/api/group/readiness?groupId=group-1');
  });

  it('starts out loading so the empty state never paints first', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READINESS });
    const { result } = renderHook(() => useDeckReadiness('group-1'));
    expect(result.current.loading).toBe(true);
  });

  it('includes the Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READINESS });
    renderHook(() => useDeckReadiness('group-1'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok123');
  });

  it('sets an error when the fetch fails, leaving data null', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useDeckReadiness('group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load deck progress');
    expect(result.current.data).toBeNull();
  });
});
