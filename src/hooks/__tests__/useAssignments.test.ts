import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  sb: {
    auth: { getSession: () => mockGetSession() },
  },
  isConfigured: vi.fn(() => true),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { useAssignments } from '@/hooks/useAssignments';
import { _resetApiCache } from '@/lib/apiCache';

beforeEach(() => _resetApiCache());

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ASSIGNMENT_1 = {
  id: 'a1',
  organizer_id: 'org1',
  member_id: 'm1',
  deck_id: 'd1',
  title: 'Study Kanji',
  note: 'Focus on N3',
  due_date: '2026-05-01',
  completed_at: null,
  created_at: '2026-04-25T00:00:00Z',
  decks: { id: 'd1', name: 'Kanji Deck', emoji: '漢' },
  profiles: { display_name: 'Member One', username: 'member1' },
};

const ASSIGNMENT_2 = {
  id: 'a2',
  organizer_id: 'org1',
  member_id: 'm2',
  deck_id: 'd2',
  title: null,
  note: null,
  due_date: null,
  completed_at: null,
  created_at: '2026-04-26T00:00:00Z',
  decks: { id: 'd2', name: 'Vocab', emoji: null },
  profiles: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
  });

  // ── initial load ──────────────────────────────────────────────────────────

  it('starts in loading state', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAssignments());
    expect(result.current.loading).toBe(true);
  });

  it('loads assignments on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1, ASSIGNMENT_2],
    });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assignments).toHaveLength(2);
    expect(result.current.assignments[0].id).toBe('a1');
  });

  it('sets empty assignments when no user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assignments).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sets error when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  // ── createAssignment ──────────────────────────────────────────────────────

  it('creates assignment and refetches', async () => {
    // Initial fetch
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Create call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'a-new' }),
    });
    // Refetch call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1],
    });

    await act(async () => {
      await result.current.createAssignment({
        memberIds: ['m1'],
        deckId: 'd1',
        title: 'Study Kanji',
      });
    });

    expect(result.current.assignments).toHaveLength(1);
    // Verify POST was called with correct data
    const postCall = mockFetch.mock.calls[1];
    expect(postCall[1].method).toBe('POST');
    const body = JSON.parse(postCall[1].body);
    expect(body.memberIds).toEqual(['m1']);
    expect(body.deckId).toBe('d1');
  });

  it('passes mastery goal fields through to the POST body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'a-new' }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    await act(async () => {
      await result.current.createAssignment({
        memberIds: ['m1'],
        deckId: 'd1',
        requiredAccuracy: 80,
        requiredMode: 'match',
      });
    });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.requiredAccuracy).toBe(80);
    expect(body.requiredMode).toBe('match');
  });

  it('passes goal fields through to the PATCH body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [ASSIGNMENT_1] });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // PATCH
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [ASSIGNMENT_1] }); // refetch

    await act(async () => {
      await result.current.updateAssignments(['a1'], { requiredAccuracy: 90, requiredMode: null });
    });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.requiredAccuracy).toBe(90);
    expect(body.requiredMode).toBeNull();
  });

  it('throws when create fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Deck not found' }),
    });

    await expect(
      act(async () => {
        await result.current.createAssignment({ memberIds: ['m1'], deckId: 'bad' });
      }),
    ).rejects.toThrow('Deck not found');
  });

  // ── updateAssignments (batch, optimistic) ─────────────────────────────────

  it('PATCHes every copy in the batch and refetches exactly once', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1, ASSIGNMENT_2],
    });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // PATCH a1
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // PATCH a2
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { ...ASSIGNMENT_1, note: 'Updated note' },
        { ...ASSIGNMENT_2, note: 'Updated note' },
      ],
    }); // refetch

    await act(async () => {
      await result.current.updateAssignments(['a1', 'a2'], { note: 'Updated note' });
    });

    const patches = mockFetch.mock.calls.filter((c) => c[1]?.method === 'PATCH');
    expect(patches.map((c) => c[0])).toEqual([
      '/api/group/assignments/a1',
      '/api/group/assignments/a2',
    ]);
    // 1 initial GET + 2 PATCH + 1 refetch — never a refetch per copy
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.current.assignments[0].note).toBe('Updated note');
  });

  it('throws on partial PATCH failure but still reconciles from the server', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1, ASSIGNMENT_2],
    });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // PATCH a1 lands
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }); // PATCH a2 fails
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...ASSIGNMENT_1, note: 'New' }, ASSIGNMENT_2],
    }); // refetch returns server truth

    // Catch inside act so the rejection doesn't stop React flushing the updates
    let err: unknown;
    await act(async () => {
      err = await result.current.updateAssignments(['a1', 'a2'], { note: 'New' }).catch((e) => e);
    });

    expect(err).toBeInstanceOf(Error);
    // The one copy that failed is back to its server state, not the optimistic one
    expect(result.current.assignments[1].note).toBeNull();
    expect(result.current.assignments[0].note).toBe('New');
  });

  it('restores the snapshot without refetching when every PATCH fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1],
    });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    let err: unknown;
    await act(async () => {
      err = await result.current.updateAssignments(['a1'], { note: 'Will fail' }).catch((e) => e);
    });

    expect(err).toBeInstanceOf(Error);
    expect(result.current.assignments[0].note).toBe('Focus on N3');
    // 1 initial GET + 1 PATCH — an offline refetch would just fail too
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // ── deleteAssignments (batch, optimistic) ─────────────────────────────────

  it('DELETEs every copy in one request and refetches once', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1, ASSIGNMENT_2],
    });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assignments).toHaveLength(2);

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // DELETE
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // refetch

    await act(async () => {
      await result.current.deleteAssignments(['a1', 'a2']);
    });

    expect(result.current.assignments).toHaveLength(0);
    expect(mockFetch.mock.calls[1][0]).toBe('/api/group/assignments');
    expect(mockFetch.mock.calls[1][1].method).toBe('DELETE');
    expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual({ ids: ['a1', 'a2'] });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('restores the list when nothing could be deleted', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1],
    });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockRejectedValueOnce(new Error('fail'));

    let err: unknown;
    await act(async () => {
      err = await result.current.deleteAssignments(['a1']).catch((e) => e);
    });

    expect(err).toBeInstanceOf(Error);
    expect(result.current.assignments).toHaveLength(1);
    expect(result.current.assignments[0].id).toBe('a1');
  });

  // ── auth header ───────────────────────────────────────────────────────────

  it('includes Authorization header from session token', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[1].headers.Authorization).toBe('Bearer tok123');
  });
});
