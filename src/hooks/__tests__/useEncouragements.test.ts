import { act, renderHook } from '@testing-library/react';
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

import { useEncouragements } from '@/hooks/useEncouragements';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useEncouragements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
  });

  it('sends encouragement via POST', async () => {
    const { result } = renderHook(() => useEncouragements());

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'e-new' }),
    });

    await act(async () => {
      await result.current.sendEncouragement('m1', 'You can do it!', '🎉');
    });

    const postCall = mockFetch.mock.calls[0];
    expect(postCall[1].method).toBe('POST');
    const body = JSON.parse(postCall[1].body);
    expect(body.memberId).toBe('m1');
    expect(body.message).toBe('You can do it!');
    expect(body.emoji).toBe('🎉');
  });

  it('throws when send fails', async () => {
    const { result } = renderHook(() => useEncouragements());

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Member not found' }),
    });

    await expect(
      act(async () => {
        await result.current.sendEncouragement('bad', 'msg');
      }),
    ).rejects.toThrow('Member not found');
  });
});
