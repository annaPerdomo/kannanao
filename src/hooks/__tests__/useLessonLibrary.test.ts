import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  sb: { auth: { getSession: () => mockGetSession() } },
  isConfigured: vi.fn(() => true),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useLessonLibrary } from '@/hooks/useLessonLibrary';
import { _resetApiCache } from '@/lib/apiCache';

const LIBRARY = { units: [], loose: [] };

beforeEach(() => {
  _resetApiCache();
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
  mockFetch.mockReset();
});

describe('useLessonLibrary', () => {
  it('loads the library for a group', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => LIBRARY });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.library).toEqual(LIBRARY);
    expect(result.current.error).toBeNull();
  });

  it('skips the fetch when groupId is null', async () => {
    const { result } = renderHook(() => useLessonLibrary(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.library).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sets an error message when the fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('loadError');
  });

  it('clears the library and ignores a stale response when switching groups', async () => {
    const LIBRARY_B = {
      units: [{ id: 'b', title: 'B', level: null, createdAt: '', weeks: [] }],
      loose: [],
    };
    let resolveA: (v: unknown) => void = () => {};
    const pendingA = new Promise((res) => {
      resolveA = res;
    });
    mockFetch.mockImplementationOnce(() => pendingA);
    mockFetch.mockImplementationOnce(async () => ({ ok: true, json: async () => LIBRARY_B }));

    const { result, rerender } = renderHook(({ groupId }) => useLessonLibrary(groupId), {
      initialProps: { groupId: 'g1' },
    });
    rerender({ groupId: 'g2' });
    expect(result.current.library).toBeNull();

    await waitFor(() => expect(result.current.library).toEqual(LIBRARY_B));

    resolveA({ ok: true, json: async () => ({ units: [], loose: [{ deckId: 'stale' }] }) });
    await Promise.resolve();
    await Promise.resolve();
    expect(result.current.library).toEqual(LIBRARY_B);
  });
});
