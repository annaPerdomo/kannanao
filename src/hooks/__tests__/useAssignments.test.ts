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

  // ── updateAssignment (optimistic) ─────────────────────────────────────────

  it('optimistically updates and calls PATCH', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1],
    });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // PATCH succeeds
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await act(async () => {
      await result.current.updateAssignment('a1', { note: 'Updated note' });
    });

    // Optimistic: note should be updated locally
    expect(result.current.assignments[0].note).toBe('Updated note');

    const patchCall = mockFetch.mock.calls[1];
    expect(patchCall[0]).toBe('/api/group/assignments/a1');
    expect(patchCall[1].method).toBe('PATCH');
  });

  it('rolls back on PATCH failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1],
    });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // PATCH fails
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.updateAssignment('a1', { note: 'Will fail' });
    });

    // Rolled back to original note
    expect(result.current.assignments[0].note).toBe('Focus on N3');
  });

  // ── deleteAssignment (optimistic) ─────────────────────────────────────────

  it('optimistically removes and calls DELETE', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1, ASSIGNMENT_2],
    });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assignments).toHaveLength(2);

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await act(async () => {
      await result.current.deleteAssignment('a1');
    });

    expect(result.current.assignments).toHaveLength(1);
    expect(result.current.assignments[0].id).toBe('a2');
  });

  it('rolls back delete on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [ASSIGNMENT_1],
    });
    const { result } = renderHook(() => useAssignments());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockRejectedValueOnce(new Error('fail'));

    await act(async () => {
      await result.current.deleteAssignment('a1');
    });

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
