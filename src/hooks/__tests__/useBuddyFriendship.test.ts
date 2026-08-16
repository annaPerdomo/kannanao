import { act, renderHook } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Pinned off UTC: in a UTC runner the local and UTC dates agree, so a
// local-vs-UTC stamping bug would be invisible.
const ORIGINAL_TZ = process.env.TZ;
process.env.TZ = 'Asia/Tokyo';
afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

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

const mockShop = vi.fn();
vi.mock('@/contexts/ShopContext', () => ({
  useShopCtx: () => mockShop(),
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
  await act(async () => {
    await hook.result.current.ensureLoaded();
  });
  return hook;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useBuddyFriendship', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockShop.mockReturnValue({ equipped: { study_buddy: 'buddy_bunny' }, loading: false });
    mockRpc.mockResolvedValue({ data: { status: 'ok', points: 11 }, error: null });
    setTable('buddy_friendship', [row()]);
  });

  // ── loading ─────────────────────────────────────────────────────────────────

  describe('loading', () => {
    it('should not query on mount — this provider is app-wide and renders nothing', () => {
      renderHook(() => useBuddyFriendship());

      expect(mockFrom).not.toHaveBeenCalled();
    });

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
      expect(result.current.loading).toBe(false);
    });

    it('should load once however many callers ask', async () => {
      const { result } = await renderLoaded();
      await act(async () => {
        await result.current.ensureLoaded();
      });

      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('should refetch on demand', async () => {
      const { result } = await renderLoaded();
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it('should fall back to the default buddy when nothing is equipped', async () => {
      mockShop.mockReturnValue({ equipped: {}, loading: false });
      setTable('buddy_friendship', [row({ buddy_key: 'buddy_tango', points: 7 })]);
      const { result } = await renderLoaded();

      expect(result.current.equipped?.points).toBe(7);
    });

    it('should surface a load error', async () => {
      setTable('buddy_friendship', null, { message: 'boom' });
      const { result } = await renderLoaded();

      expect(result.current.error).toBe('boom');
      expect(result.current.loading).toBe(false);
      expect(result.current.loadState).toBe('error');
    });

    it('should retry after a failed load rather than cache the failure', async () => {
      setTable('buddy_friendship', null, { message: 'boom' });
      const { result } = await renderLoaded();

      setTable('buddy_friendship', [row({ points: 4 })]);
      await act(async () => {
        await result.current.ensureLoaded();
      });

      expect(result.current.loadState).toBe('loaded');
      expect(result.current.equipped?.points).toBe(4);
    });

    it('should report an unfetched provider as idle, not loaded with no rows', () => {
      const { result } = renderHook(() => useBuddyFriendship());

      expect(result.current.loadState).toBe('idle');
    });

    it('should stay inert for a signed-out visitor', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      const { result } = await renderLoaded();

      let award: unknown = 'unset';
      await act(async () => {
        award = await result.current.awardFriendship('pet');
      });

      expect(result.current.friendships).toEqual({});
      expect(award).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  // ── awarding ────────────────────────────────────────────────────────────────

  describe('awardFriendship', () => {
    it('should call the RPC with the source points and reconcile from its total', async () => {
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
        p_today: todayLocal(),
      });
      expect(award).toEqual({ awarded: 3, points: 13, leveledUp: false, newLevel: 1 });
      expect(result.current.equipped?.points).toBe(13);
    });

    it('should stamp p_today with the LOCAL date, not the UTC one', async () => {
      // 22:00 UTC is already the 10th in Tokyo, so a toISOString() stamp lands
      // on the wrong day for the RPC's cap check.
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date('2026-08-09T22:00:00Z'));
      try {
        const { result } = await renderLoaded();
        await act(async () => {
          await result.current.petBuddy();
        });

        expect(mockRpc.mock.calls[0][1].p_today).toBe('2026-08-10');
      } finally {
        vi.useRealTimers();
      }
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
        lastPetDate: todayLocal(),
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

    it("should restore the buddy's own stamp on rollback, not another buddy's", async () => {
      setTable('buddy_friendship', [
        row(),
        row({ buddy_key: 'buddy_tango', last_pet_date: '2026-08-01' }),
      ]);
      mockRpc.mockResolvedValue({ data: null, error: { message: 'nope' } });
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.petBuddy();
      });

      // The merged '2026-08-01' belongs to buddy_tango, not to this row.
      expect(result.current.equipped?.lastPetDate).toBeNull();
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

    it('should not let a future-dated stamp mask a row that already paid today', async () => {
      // A clock-rolled row sorts newer than today, so taking the newest stamp
      // would fire an RPC guaranteed to come back capped.
      setTable('buddy_friendship', [
        row({ last_pet_date: todayLocal() }),
        row({ buddy_key: 'buddy_tango', last_pet_date: '2099-01-01' }),
      ]);
      const { result } = await renderLoaded();

      expect(result.current.canPetToday).toBe(false);
      await act(async () => {
        await result.current.petBuddy();
      });

      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('should not award while the shop is still resolving the equipped buddy', async () => {
      mockShop.mockReturnValue({ equipped: {}, loading: true });
      const { result } = await renderLoaded();

      let award: unknown = 'unset';
      await act(async () => {
        award = await result.current.petBuddy();
      });

      expect(award).toBeNull();
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  // ── concurrent awards ───────────────────────────────────────────────────────

  describe('concurrent awards', () => {
    /** Hands back a resolver per source so the two RPCs can settle out of order. */
    function deferRpc() {
      const resolvers: Record<string, (value: unknown) => void> = {};
      mockRpc.mockImplementation(
        (_fn: string, args: { p_source: string }) =>
          new Promise((resolve) => {
            resolvers[args.p_source] = resolve;
          }),
      );
      return resolvers;
    }

    it('should not lose the other award when one of them rolls back', async () => {
      // The quest-end path: endSession publishes the session signal, then
      // finishQuest awards the adventure while that RPC is still open.
      const resolvers = deferRpc();
      const { result } = await renderLoaded();

      let session!: Promise<unknown>;
      let adventure!: Promise<unknown>;
      await act(async () => {
        session = result.current.awardFriendship('session');
      });
      await act(async () => {
        adventure = result.current.awardFriendship('adventure');
      });
      expect(result.current.equipped?.points).toBe(14);

      await act(async () => {
        resolvers.session({ data: { status: 'ok', points: 11 }, error: null });
        await session;
      });
      await act(async () => {
        resolvers.adventure({ data: { status: 'capped' }, error: null });
        await adventure;
      });

      // 10 + 1 confirmed, 3 taken back — not 8, which is what assigning the
      // session's absolute total would have left behind.
      expect(result.current.equipped?.points).toBe(11);
      expect(result.current.equipped?.lastSessionDate).toBe(todayLocal());
      expect(result.current.equipped?.lastAdventureDate).toBeNull();
    });

    // The mirror of the case above — the ordering that happens whenever the
    // due-count read beats the session RPC home.
    it('should not double-count when the awards settle in the other order', async () => {
      const resolvers = deferRpc();
      const { result } = await renderLoaded();

      let session!: Promise<unknown>;
      let adventure!: Promise<unknown>;
      await act(async () => {
        session = result.current.awardFriendship('session');
      });
      await act(async () => {
        adventure = result.current.awardFriendship('adventure');
      });

      await act(async () => {
        resolvers.adventure({ data: { status: 'ok', points: 13 }, error: null });
        await adventure;
      });
      // 13 confirmed by the server, plus the session's 1 still in flight.
      expect(result.current.equipped?.points).toBe(14);

      await act(async () => {
        resolvers.session({ data: { status: 'ok', points: 14 }, error: null });
        await session;
      });

      expect(result.current.equipped?.points).toBe(14);
    });

    it('should take back only the capped award when it settles last', async () => {
      const resolvers = deferRpc();
      const { result } = await renderLoaded();

      let session!: Promise<unknown>;
      let adventure!: Promise<unknown>;
      await act(async () => {
        session = result.current.awardFriendship('session');
      });
      await act(async () => {
        adventure = result.current.awardFriendship('adventure');
      });

      await act(async () => {
        resolvers.adventure({ data: { status: 'ok', points: 13 }, error: null });
        await adventure;
      });
      await act(async () => {
        resolvers.session({ data: { status: 'capped' }, error: null });
        await session;
      });

      // 10 + the adventure's 3. Rebasing off local state would have left 12.
      expect(result.current.equipped?.points).toBe(13);
      expect(result.current.equipped?.lastSessionDate).toBeNull();
    });

    it('should detect a level-up the other award had optimistically hidden', async () => {
      setTable('buddy_friendship', [row({ points: 14 })]);
      const resolvers = deferRpc();
      const { result } = await renderLoaded();

      let session!: Promise<unknown>;
      let adventure!: Promise<unknown>;
      await act(async () => {
        session = result.current.awardFriendship('session');
      });
      await act(async () => {
        adventure = result.current.awardFriendship('adventure');
      });

      await act(async () => {
        resolvers.session({ data: { status: 'capped' }, error: null });
        await session;
      });
      await act(async () => {
        resolvers.adventure({ data: { status: 'ok', points: 17 }, error: null });
        await adventure;
      });

      // 14 → 17 crosses. A baseline read off local state would have seen the
      // session's unconfirmed 15 and called it level 2 already.
      expect(result.current.levelUpEvent).toEqual({ buddyKey: 'buddy_bunny', level: 2 });
    });
  });

  // ── today's goals ───────────────────────────────────────────────────────────

  describe('todayGoals', () => {
    it('should offer all three sources undone on a fresh day', async () => {
      const { result } = await renderLoaded();

      expect(result.current.todayGoals.map((goal) => goal.source)).toEqual([
        'adventure',
        'session',
        'pet',
      ]);
      expect(result.current.todayGoals.some((goal) => goal.done)).toBe(false);
      expect(result.current.heartsToday).toBe(0);
    });

    it('should count another buddy row — the daily cap is per user', async () => {
      setTable('buddy_friendship', [
        row(),
        row({ buddy_key: 'buddy_tango', last_adventure_date: todayLocal() }),
      ]);
      const { result } = await renderLoaded();

      expect(result.current.todayGoals.find((goal) => goal.source === 'adventure')?.done).toBe(
        true,
      );
      expect(result.current.heartsToday).toBe(3);
    });

    it('should close the pet goal as soon as a pet lands', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.petBuddy();
      });

      expect(result.current.todayGoals.find((goal) => goal.source === 'pet')?.done).toBe(true);
      expect(result.current.heartsToday).toBe(1);
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

    // A level-up is held until the reader leaves a session route, so an
    // unconsumed one outlives the sign-out unless it is dropped here.
    it('should drop a held event on sign-out rather than keep it for the next user', async () => {
      setTable('buddy_friendship', [row({ points: 14 })]);
      mockRpc.mockResolvedValue({ data: { status: 'ok', points: 17 }, error: null });
      const { result, rerender } = await renderLoaded();

      await act(async () => {
        await result.current.awardFriendship('adventure');
      });
      expect(result.current.levelUpEvent).not.toBeNull();

      mockUseAuth.mockReturnValue({ user: null });
      await act(async () => {
        rerender();
      });

      expect(result.current.levelUpEvent).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  // ── award events ────────────────────────────────────────────────────────────

  describe('awardEvent', () => {
    it('should report a server-confirmed award, and clear on demand', async () => {
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.awardFriendship('adventure');
      });

      expect(result.current.awardEvent).toEqual({
        buddyKey: 'buddy_bunny',
        source: 'adventure',
        awarded: 3,
      });

      act(() => result.current.clearAwardEvent());
      expect(result.current.awardEvent).toBeNull();
    });

    it('should stay quiet when the RPC reports capped', async () => {
      mockRpc.mockResolvedValue({ data: { status: 'capped' }, error: null });
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.awardFriendship('adventure');
      });

      expect(result.current.awardEvent).toBeNull();
    });

    it('should stay quiet when the award rolls back on an error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'network down' } });
      const { result } = await renderLoaded();

      await act(async () => {
        await result.current.awardFriendship('adventure');
      });

      expect(result.current.awardEvent).toBeNull();
    });

    it('should drop an unconsumed event on sign-out', async () => {
      const { result, rerender } = await renderLoaded();

      await act(async () => {
        await result.current.petBuddy();
      });
      expect(result.current.awardEvent).not.toBeNull();

      mockUseAuth.mockReturnValue({ user: null });
      await act(async () => {
        rerender();
      });

      expect(result.current.awardEvent).toBeNull();
    });
  });

  // ── session signal ──────────────────────────────────────────────────────────

  describe('session end signal', () => {
    it('should award on a meaningful session', async () => {
      await renderLoaded();

      await act(async () => {
        publishSessionEnd(5);
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'award_friendship',
        expect.objectContaining({ p_source: 'session', p_points: 1 }),
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
