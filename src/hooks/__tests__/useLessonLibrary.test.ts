import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  sb: { auth: { getSession: () => mockGetSession() } },
  isConfigured: vi.fn(() => true),
}));

// Stable, not a fresh fn per call — `load`'s identity (and the loading effect) would never settle otherwise.
const translate = (key: string) => key;
vi.mock('next-intl', () => ({
  useTranslations: () => translate,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useLessonLibrary } from '@/hooks/useLessonLibrary';
import { _resetApiCache } from '@/lib/apiCache';
import type { LessonLibrary as LessonLibraryData } from '@/types/lessonUnit';

const LIBRARY = { units: [], loose: [] };

function week(overrides: Partial<LessonLibraryData['units'][number]['weeks'][number]> = {}) {
  return {
    deckId: 'd1',
    deckName: 'Food',
    deckEmoji: null,
    week: 1,
    title: null,
    note: null,
    dueDate: '2026-10-20',
    availableOn: '2026-10-13',
    requiredAccuracy: null,
    requiredMode: null,
    learnerCount: 2,
    finishedCount: 0,
    wordCount: 0,
    status: 'current' as const,
    ...overrides,
  };
}

function unitLibrary(): LessonLibraryData {
  return {
    units: [
      {
        id: 'u1',
        title: 'Unit 1',
        level: null,
        createdAt: '2026-01-01T00:00:00Z',
        weeks: [week()],
      },
    ],
    loose: [],
  };
}

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

  it('editWeek applies optimistically, saves, invalidates and refetches', async () => {
    const original = unitLibrary();
    const refetched = unitLibrary();
    refetched.units[0].weeks[0].title = 'Server title';

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => refetched });

    let ok = false;
    await act(async () => {
      ok = await result.current.editWeek('d1', { title: 'New title' });
    });

    expect(ok).toBe(true);
    expect(result.current.library?.units[0].weeks[0].title).toBe('Server title');

    const patchCall = mockFetch.mock.calls.find(([url]) => url === '/api/group/lessons/handout');
    expect(patchCall?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ groupId: 'g1', deckId: 'd1', title: 'New title' }),
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('editWeek rolls back on failure', async () => {
    const original = unitLibrary();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    let ok = true;
    await act(async () => {
      ok = await result.current.editWeek('d1', { title: 'New title' });
    });

    expect(ok).toBe(false);
    expect(result.current.library).toEqual(original);
  });

  it('removeWeek removes the week optimistically and toasts on success', async () => {
    const original = unitLibrary();
    const refetched = { units: [], loose: [] };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => refetched });

    let ok = false;
    await act(async () => {
      ok = await result.current.removeWeek('d1');
    });

    expect(ok).toBe(true);
    expect(result.current.library).toEqual(refetched);
    const deleteCall = mockFetch.mock.calls.find(([url]) =>
      String(url).startsWith('/api/group/lessons/handout?'),
    );
    expect(deleteCall?.[1]).toMatchObject({ method: 'DELETE' });
  });

  it('removeWeek rolls back on failure', async () => {
    const original = unitLibrary();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    let ok = true;
    await act(async () => {
      ok = await result.current.removeWeek('d1');
    });

    expect(ok).toBe(false);
    expect(result.current.library).toEqual(original);
  });

  it('renameUnit updates the unit title and saves', async () => {
    const original = unitLibrary();
    const refetched = unitLibrary();
    refetched.units[0].title = 'Server name';
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => refetched });

    let ok = false;
    await act(async () => {
      ok = await result.current.renameUnit('u1', 'New name');
    });

    expect(ok).toBe(true);
    expect(result.current.library?.units[0].title).toBe('Server name');
    const patchCall = mockFetch.mock.calls.find(([url]) => url === '/api/group/lessons/u1');
    expect(patchCall?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ title: 'New name' }),
    });
  });

  it('shiftFrom shifts dates on the affected week optimistically and saves', async () => {
    const original = unitLibrary();
    const refetched = unitLibrary();
    refetched.units[0].weeks[0].dueDate = '2026-10-27';
    refetched.units[0].weeks[0].availableOn = '2026-10-20';
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => refetched });

    let ok = false;
    await act(async () => {
      ok = await result.current.shiftFrom('u1', 'd1', 7);
    });

    expect(ok).toBe(true);
    expect(result.current.library?.units[0].weeks[0].dueDate).toBe('2026-10-27');
    const patchCall = mockFetch.mock.calls.find(([url]) => url === '/api/group/lessons/u1');
    expect(patchCall?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ shift: { fromDeckId: 'd1', days: 7 } }),
    });
  });

  it('shiftFrom rolls back on failure', async () => {
    const original = unitLibrary();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    let ok = true;
    await act(async () => {
      ok = await result.current.shiftFrom('u1', 'd1', 7);
    });

    expect(ok).toBe(false);
    expect(result.current.library).toEqual(original);
  });

  it('addWeek posts to the unit, refetches and invalidates, without an optimistic change', async () => {
    const original = unitLibrary();
    const refetched = unitLibrary();
    refetched.units[0].weeks.push(week({ deckId: 'd2', deckName: 'Review', week: 2 }));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ deckId: 'd2' }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => refetched });

    let outcome: string = '';
    await act(async () => {
      outcome = await result.current.addWeek('u1', { kind: 'review' });
    });

    expect(outcome).toBe('ok');
    expect(result.current.library?.units[0].weeks).toHaveLength(2);

    const postCall = mockFetch.mock.calls.find(([url]) => url === '/api/group/lessons/u1/weeks');
    expect(postCall?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ kind: 'review' }),
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('addWeek returns "error" on failure and leaves the library untouched', async () => {
    const original = unitLibrary();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    let outcome: string = 'ok';
    await act(async () => {
      outcome = await result.current.addWeek('u1', { kind: 'deck', deckId: 'd9' });
    });

    expect(outcome).toBe('error');
    expect(result.current.library).toEqual(original);
  });

  it('addWeek returns "already_in_unit" on a 409 with that error body, and refetches', async () => {
    const original = unitLibrary();
    const refetched = unitLibrary();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'already_in_unit' }),
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => refetched });

    let outcome: string = '';
    await act(async () => {
      outcome = await result.current.addWeek('u1', { kind: 'deck', deckId: 'd9' });
    });

    expect(outcome).toBe('already_in_unit');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('addWeek returns "error" on a 409 position conflict, and still refetches', async () => {
    const original = unitLibrary();
    const refetched = unitLibrary();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'conflict' }),
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => refetched });

    let outcome: string = '';
    await act(async () => {
      outcome = await result.current.addWeek('u1', { kind: 'review' });
    });

    expect(outcome).toBe('error');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('keeps loading false while the background refresh after a successful edit is in flight', async () => {
    const original = unitLibrary();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    let resolveRefresh: (v: unknown) => void = () => {};
    const pendingRefresh = new Promise((res) => {
      resolveRefresh = res;
    });
    mockFetch.mockImplementationOnce(() => pendingRefresh);

    let editPromise!: Promise<boolean>;
    act(() => {
      editPromise = result.current.editWeek('d1', { title: 'New title' });
    });

    expect(result.current.loading).toBe(false);
    await Promise.resolve();
    expect(result.current.loading).toBe(false);

    resolveRefresh({ ok: true, json: async () => ({ units: [], loose: [] }) });
    await act(async () => {
      await editPromise;
    });
    expect(result.current.loading).toBe(false);
  });

  it("skips a stale action's background refresh after the viewer has switched groups", async () => {
    const libraryA = unitLibrary();
    const libraryB: LessonLibraryData = {
      units: [
        {
          id: 'uB',
          title: 'Unit B',
          level: null,
          createdAt: '2026-02-01T00:00:00Z',
          weeks: [week({ deckId: 'dB', deckName: 'Other' })],
        },
      ],
      loose: [],
    };

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => libraryA });
    const { result, rerender } = renderHook(({ groupId }) => useLessonLibrary(groupId), {
      initialProps: { groupId: 'g1' },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.library).toEqual(libraryA);

    let resolvePatch: (v: unknown) => void = () => {};
    const pendingPatch = new Promise((res) => {
      resolvePatch = res;
    });
    mockFetch.mockImplementationOnce(() => pendingPatch);

    let editPromise!: Promise<boolean>;
    act(() => {
      editPromise = result.current.editWeek('d1', { title: 'Stale edit' });
    });

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => libraryB });
    rerender({ groupId: 'g2' });
    await waitFor(() => expect(result.current.library).toEqual(libraryB));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => libraryA });
    resolvePatch({ ok: true, json: async () => ({ ok: true }) });
    await act(async () => {
      await editPromise;
    });

    expect(result.current.library).toEqual(libraryB);
  });

  it('copyUnit posts to the copy route, returns added/skipped names, and invalidates both caches', async () => {
    const original = unitLibrary();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ planId: 'p2', added: 1, skipped: [{ deckId: 'd2', name: 'Food' }] }),
    });

    let outcome: Awaited<ReturnType<typeof result.current.copyUnit>> = { status: 'error' };
    await act(async () => {
      outcome = await result.current.copyUnit('u1', 'g2', '2026-10-20');
    });

    expect(outcome).toEqual({ status: 'ok', added: 1, skipped: ['Food'] });
    const postCall = mockFetch.mock.calls.find(([url]) => url === '/api/group/lessons/u1/copy');
    expect(postCall?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ groupId: 'g2', firstDueDate: '2026-10-20' }),
    });
  });

  it('copyUnit returns status "error" on a server failure', async () => {
    const original = unitLibrary();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    let outcome: Awaited<ReturnType<typeof result.current.copyUnit>> = {
      status: 'ok',
      added: 1,
      skipped: [],
    };
    await act(async () => {
      outcome = await result.current.copyUnit('u1', 'g2', '2026-10-20');
    });

    expect(outcome).toEqual({ status: 'error' });
  });

  it('copyUnit returns status "nothing" on a 409 (every week already handed out)', async () => {
    const original = unitLibrary();
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => original });
    const { result } = renderHook(() => useLessonLibrary('g1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'nothing_to_copy' }),
    });

    let outcome: Awaited<ReturnType<typeof result.current.copyUnit>> = {
      status: 'ok',
      added: 1,
      skipped: [],
    };
    await act(async () => {
      outcome = await result.current.copyUnit('u1', 'g2', '2026-10-20');
    });

    expect(outcome).toEqual({ status: 'nothing' });
  });
});
