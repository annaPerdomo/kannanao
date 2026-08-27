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
import { DataError } from '@/lib/dataError';

beforeEach(() => _resetApiCache());

// ─── Fixtures ────────────────────────────────────────────────────────────────

// The 2026-08-26 gateway body: text/plain, no JSON envelope.
const ENVOY_BODY = 'upstream connect error or disconnect/reset before headers.';

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
    expect(result.current.error).toBeInstanceOf(DataError);
    expect(result.current.errorMessage).toBe('Failed to load deck progress');
    expect(result.current.data).toBeNull();
  });

  it('calls a dead backend an outage rather than an empty rollup', async () => {
    mockFetch.mockResolvedValueOnce(new Response(ENVOY_BODY, { status: 503 }));
    const { result } = renderHook(() => useDeckReadiness('group-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.kind).toBe('upstream');
    expect(result.current.data).toBeNull();
    expect(result.current.stale).toBe(false);
  });

  it('keeps the cached rollup through an outage and flags it as stale', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READINESS });
      const first = renderHook(() => useDeckReadiness('group-1'));
      await waitFor(() => expect(first.result.current.loading).toBe(false));

      // Past the cache's 30s fresh window, so the second mount revalidates.
      vi.setSystemTime(Date.now() + 31_000);
      mockFetch.mockResolvedValueOnce(new Response(ENVOY_BODY, { status: 503 }));
      const { result } = renderHook(() => useDeckReadiness('group-1'));
      // Not `loading`: the cached paint clears that before the revalidation
      // that turns out to fail has even reached the network.
      await waitFor(() => expect(result.current.stale).toBe(true));

      expect(result.current.data?.decks).toHaveLength(1);
      expect(result.current.error).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
