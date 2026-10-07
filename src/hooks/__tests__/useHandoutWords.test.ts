import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  sb: { auth: { getSession: () => mockGetSession() } },
  isConfigured: vi.fn(() => true),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import type { HandoutWords } from '@/hooks/useHandoutWords';
import { useHandoutWords } from '@/hooks/useHandoutWords';
import { _resetApiCache } from '@/lib/apiCache';

const DATA: HandoutWords = {
  deck: { id: 'd1', name: 'Food', emoji: null },
  learnerCount: 2,
  words: [],
  learner: null,
};

beforeEach(() => {
  _resetApiCache();
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
  mockFetch.mockReset();
});

describe('useHandoutWords', () => {
  it('loads on mount', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => DATA });
    const { result } = renderHook(() =>
      useHandoutWords({ groupId: 'g1', deckId: 'd1', enabled: true }),
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(DATA);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/group/lessons/words?groupId=g1&deckId=d1'),
      expect.anything(),
    );
  });

  it('does not fetch when disabled', async () => {
    const { result } = renderHook(() =>
      useHandoutWords({ groupId: 'g1', deckId: 'd1', enabled: false }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('surfaces an error on failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const { result } = renderHook(() =>
      useHandoutWords({ groupId: 'g1', deckId: 'd1', enabled: true }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('refetch bypasses the cache', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => DATA });
    const { result } = renderHook(() =>
      useHandoutWords({ groupId: 'g1', deckId: 'd1', enabled: true }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await result.current.refetch();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
