import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockRpc = vi.fn();

const tableData: Record<string, { data: unknown; error: unknown }> = {};

function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: null, error: null };
  const asPromise = () => Promise.resolve(result());
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'order', 'in', 'upsert'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.single = vi.fn(() => asPromise());
  chain.maybeSingle = vi.fn(() => asPromise());
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    asPromise().then(onfulfilled, onrejected);
  return chain;
}

const mockFrom = vi.fn((table: string) => makeChain(table));

vi.mock('@/lib/supabase', () => ({
  sb: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
  isConfigured: vi.fn(() => true),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockEquipped = vi.fn();
vi.mock('@/contexts/ShopContext', () => ({
  useShopCtx: () => ({ equipped: mockEquipped() }),
}));

import { useBuddyFriendship } from '@/hooks/useBuddyFriendship';
import { publishSessionEnd } from '@/lib/sessionSignal';

/** A DB row for the buddy the tests keep equipped. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    buddy_key: 'buddy_bunny',
    points: 10,
    last_adventure_date: null,
    last_session_date: null,
    last_pet_date: null,
    ...overrides,
  };
}

/** The same local YYYY-MM-DD the hook stamps with (localDateString). */
function todayLocal() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

async function renderLoaded() {
  const hook = renderHook(() => useBuddyFriendship());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useBuddyFriendship', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockEquipped.mockReturnValue({ study_buddy: 'buddy_bunny' });
    mockRpc.mockResolvedValue({ data: { status: 'ok', points: 11 }, error: null });
    setTable('buddy_friendship', [row()]);
  });

  // ── initial load ────────────────────────────────────────────────────────────

  describe('initial load', () => {
    it('should key friendships by buddy_key and map to camelCase', async () => {
      setTable('buddy_friendship', [
        row({ buddy_key: 'buddy_tango', points: 3, last_pet_date: '2026-08-09' }),
        row(),
      ]);
      const { result } = await renderLoaded();

      expect(Object.keys(result.current.friendships).sort()).toEqual([
        'buddy_bunny',
        'buddy_tango',
      ]);
      expect(result.current.friendships.buddy_tango.lastPetDate).toBe('2026-08-09');
      expect(result.current.equipped?.points).toBe(10);
    });

    it('should fall back to the default buddy when nothing is equipped', async () => {
      mockEquipped.mockReturnValue({});
      setTable('buddy_friendship', [row({ buddy_key: 'buddy_tango', points: 7 })]);
      const { result } = await renderLoaded();

      expect(result.current.equipped?.points).toBe(7);
    });

    it('should surface a load error', async () => {
      setTable('buddy_friendship', null, { message: 'boom' });
      const { result } = await renderLoaded();

      expect(result.current.error).toBe('boom');
    });

    it('should resolve empty for a signed-out visitor', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const { result } = await renderLoaded();

      expect(result.current.friendships).toEqual({});
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  // ── awarding ────────────────────────────────────────────────────────────────

  describe('awardFriendship', () => {
    it('should call the RPC with the source points and a local today', async () => {
      mockRpc.mockResolvedValue({ data: { status: 'ok', points: 13 }, error: null });
      const { result } = await renderLoaded();

      let award: Awaited<ReturnType<typeof result.current.awardFriendship>> = null;
      await act(async () => {
        award = await result.current.awardFriendship('adventure');
      });

      expect(mockRpc).toHaveBeenCalledWith('award_friendship', {
        p_buddy_key: 'buddy_bunny',
        p_source: 'adventure',
        p_points: 3,
        p_today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
      expect(award).toEqual({ awarded: 3, points: 13, leveledUp: false, newLevel: 1 });
      // The RPC's total wins over the optimistic 10 + 3.
      expect(result.current.equipped?.points).toBe(13);
    });

    it('should stamp p_today with the LOCAL date, not the UTC one', async () => {
      // Late evening local is already tomorrow in UTC for any positive offset,
      // and the RPC's cap check compares against the learner's day.
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.petBuddy();
      });

      expect(mockRpc.mock.calls[0][1].p_today).toBe(todayLocal());
    });

    it('should create a local row for a buddy that has none yet', async () => {
      setTable('buddy_friendship', []);
      mockRpc.mockResolvedValue({ data: { status: 'ok', points: 1 }, error: null });
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.petBuddy();
      });

      expect(result.current.equipped).toEqual({
        buddyKey: 'buddy_bunny',
        points: 1,
        lastAdventureDate: null,
        lastSessionDate: null,
        lastPetDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
    });

    it('should roll back and set an error when the RPC fails', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'network down' } });
      const { result } = await renderLoaded();

      let award: unknown = 'unset';
      await act(async () => {
        award = await result.current.awardFriendship('adventure');
      });

      expect(award).toBeNull();
      expect(result.current.equipped?.points).toBe(10);
      expect(result.current.equipped?.lastAdventureDate).toBeNull();
      expect(result.current.error).toBe('network down');
    });

    it('should drop the created row entirely when the first award fails', async () => {
      setTable('buddy_friendship', []);
      mockRpc.mockResolvedValue({ data: null, error: { message: 'nope' } });
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.petBuddy();
      });

      expect(result.current.equipped).toBeNull();
    });

    it('should roll back silently when the RPC reports capped', async () => {
      mockRpc.mockResolvedValue({ data: { status: 'capped' }, error: null });
      const { result } = await renderLoaded();

      let award: unknown = 'unset';
      await act(async () => {
        award = await result.current.awardFriendship('adventure');
      });

      expect(award).toBeNull();
      expect(result.current.equipped?.points).toBe(10);
      expect(result.current.error).toBeNull();
    });

    it('should no-op without an RPC call when today already paid the source', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.petBuddy();
      });
      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(result.current.canPetToday).toBe(false);

      let second: unknown = 'unset';
      await act(async () => {
        second = await result.current.petBuddy();
      });

      expect(second).toBeNull();
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });

    it('should honour another buddy row stamp — the cap is per user, not per buddy', async () => {
      setTable('buddy_friendship', [
        row(),
        row({ buddy_key: 'buddy_tango', last_pet_date: todayLocal() }),
      ]);
      const { result } = await renderLoaded();

      expect(result.current.canPetToday).toBe(false);
      await act(async () => {
        await result.current.petBuddy();
      });
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  // ── level-ups ───────────────────────────────────────────────────────────────

  describe('levelUpEvent', () => {
    it('should fire when the reconciled total crosses a threshold', async () => {
      setTable('buddy_friendship', [row({ points: 14 })]);
      mockRpc.mockResolvedValue({ data: { status: 'ok', points: 17 }, error: null });
      const { result } = await renderLoaded();

      let award: { leveledUp: boolean; newLevel: number } | null = null;
      await act(async () => {
        award = await result.current.awardFriendship('adventure');
      });

      expect(award).toMatchObject({ leveledUp: true, newLevel: 2 });
      expect(result.current.levelUpEvent).toEqual({ buddyKey: 'buddy_bunny', level: 2 });

      act(() => result.current.clearLevelUpEvent());
      expect(result.current.levelUpEvent).toBeNull();
    });

    it('should stay quiet when the total does not cross a threshold', async () => {
      setTable('buddy_friendship', [row({ points: 8 })]);
      mockRpc.mockResolvedValue({ data: { status: 'ok', points: 11 }, error: null });
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.awardFriendship('adventure');
      });

      expect(result.current.levelUpEvent).toBeNull();
    });
  });

  // ── session signal ──────────────────────────────────────────────────────────

  describe('session end signal', () => {
    it('should award on a meaningful session', async () => {
      await renderLoaded();

      await act(async () => {
        publishSessionEnd(5);
      });

      await waitFor(() =>
        expect(mockRpc).toHaveBeenCalledWith(
          'award_friendship',
          expect.objectContaining({ p_source: 'session', p_points: 1 }),
        ),
      );
    });

    it('should ignore a session too short to count', async () => {
      await renderLoaded();

      await act(async () => {
        publishSessionEnd(3);
      });

      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = await renderLoaded();
      unmount();

      await act(async () => {
        publishSessionEnd(9);
      });

      expect(mockRpc).not.toHaveBeenCalled();
    });
  });
});
