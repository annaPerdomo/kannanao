import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
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
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
  isConfigured: vi.fn(() => true),
  showConfigBanner: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { SHOP_ITEMS, useShop } from '@/hooks/useShop';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useShop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockUseAuth.mockReturnValue({ isAdmin: false, user: { id: 'u1' } });
    mockRpc.mockResolvedValue({ data: null, error: null });
    setTable('user_purchases', []);
    setTable('user_equipped', []);
  });

  // ── initial load ────────────────────────────────────────────────────────────

  describe('initial load', () => {
    it('should start in loading state', () => {
      const { result } = renderHook(() => useShop());
      expect(result.current.loading).toBe(true);
    });

    it('should resolve loading after fetch', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('should start with empty equipped state when no rows', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.equipped).toEqual({});
    });

    it('should stop loading when there is no authenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('should populate equipped map from DB rows', async () => {
      setTable('user_equipped', [{ slot: 'card_border', item_key: 'border_golden' }]);
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.equipped.card_border).toBe('border_golden');
    });

    it('should load multiple equipped slots', async () => {
      setTable('user_equipped', [
        { slot: 'card_border', item_key: 'border_golden' },
        { slot: 'theme', item_key: 'theme_ocean' },
      ]);
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.equipped.card_border).toBe('border_golden');
      expect(result.current.equipped.theme).toBe('theme_ocean');
    });
  });

  // ── ownsItem ────────────────────────────────────────────────────────────────

  describe('ownsItem', () => {
    it('should return true for free items (price = 0)', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
      // border_none is free
      expect(result.current.ownsItem('border_none')).toBe(true);
    });

    it('should return true for all free themes', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const freeThemes = SHOP_ITEMS.filter((i) => i.price === 0 && !i.comingSoon);
      freeThemes.forEach((item) => {
        expect(result.current.ownsItem(item.key)).toBe(true);
      });
    });

    it('should return true for every item when user is admin', async () => {
      mockUseAuth.mockReturnValue({ isAdmin: true });
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
      // Admin owns premium items too
      expect(result.current.ownsItem('border_dragon')).toBe(true);
      expect(result.current.ownsItem('buddy_pink_cat')).toBe(true);
    });

    it('should return false for unpurchased paid items', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.ownsItem('border_golden')).toBe(false);
    });

    it('should return true for purchased items', async () => {
      setTable('user_purchases', [
        { id: 'p1', item_key: 'border_golden', purchased_at: new Date().toISOString() },
      ]);
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.ownsItem('border_golden')).toBe(true);
    });
  });

  // ── purchaseItem ────────────────────────────────────────────────────────────

  describe('purchaseItem', () => {
    it('should return "Item not found" for unknown item keys', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: string | null } | undefined;
      await act(async () => {
        res = await result.current.purchaseItem('nonexistent_key', 9999);
      });
      expect(res?.error).toBe('Item not found');
    });

    it('should return "Already owned" for free items', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: string | null } | undefined;
      await act(async () => {
        res = await result.current.purchaseItem('border_none', 9999);
      });
      expect(res?.error).toBe('Already owned');
    });

    it('should return "Not enough XP" when spendableXp is too low', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: string | null } | undefined;
      await act(async () => {
        // border_golden costs 300 — provide only 100
        res = await result.current.purchaseItem('border_golden', 100);
      });
      expect(res?.error).toBe('Not enough XP');
    });

    it('should return null error when purchase succeeds', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: string | null } | undefined;
      await act(async () => {
        res = await result.current.purchaseItem('border_golden', 500);
      });
      expect(res?.error).toBeNull();
    });

    it('should return "Not authenticated" when user is null during purchase', async () => {
      // Mount fetch uses the AuthContext user; only purchaseItem still calls
      // getUser — return null for it so the auth guard trips.
      mockGetUser.mockResolvedValueOnce({ data: { user: null } }); // purchaseItem getUser

      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: string | null } | undefined;
      await act(async () => {
        res = await result.current.purchaseItem('border_golden', 500);
      });
      expect(res?.error).toBe('Not authenticated');
    });

    it('should roll back optimistic update when DB insert fails', async () => {
      // Purchases insert fails
      setTable('user_purchases', null, { message: 'DB error', code: '42000' });

      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.purchaseItem('border_golden', 500);
      });

      // Equipped should be rolled back to empty
      expect(result.current.equipped.card_border).toBeUndefined();
    });

    it('should expose error state after a failed purchase', async () => {
      setTable('user_purchases', null, { message: 'DB error', code: '42000' });

      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.purchaseItem('border_golden', 500);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  // ── equipItem ───────────────────────────────────────────────────────────────

  describe('equipItem', () => {
    it('should return "Item not found" for unknown key', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: string | null } | undefined;
      await act(async () => {
        res = await result.current.equipItem('unknown_item_xyz');
      });
      expect(res?.error).toBe('Item not found');
    });

    it('should return "Item not owned" for an unowned paid item', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: string | null } | undefined;
      await act(async () => {
        // border_golden is paid and not purchased
        res = await result.current.equipItem('border_golden');
      });
      expect(res?.error).toBe('Item not owned');
    });

    it('should return null error when equipping a free item', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: string | null } | undefined;
      await act(async () => {
        res = await result.current.equipItem('border_none');
      });
      expect(res?.error).toBeNull();
    });

    it('should update equipped state after equipping', async () => {
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.equipItem('border_none');
      });
      expect(result.current.equipped.card_border).toBe('border_none');
    });

    it('should roll back equipped state when upsert fails', async () => {
      // user_equipped upsert fails
      setTable('user_equipped', null, new Error('Equip error'));

      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const prevEquipped = { ...result.current.equipped };
      await act(async () => {
        await result.current.equipItem('border_none');
      });
      // Should roll back to previous state
      expect(result.current.equipped).toEqual(prevEquipped);
    });
  });

  // ── unequipItem ─────────────────────────────────────────────────────────────

  describe('unequipItem', () => {
    it('should remove the slot from equipped state', async () => {
      setTable('user_equipped', [{ slot: 'card_border', item_key: 'border_golden' }]);
      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.equipped.card_border).toBe('border_golden');

      await act(async () => {
        await result.current.unequipItem('card_border');
      });
      expect(result.current.equipped.card_border).toBeUndefined();
    });

    it('should return "Not authenticated" when user is null during unequip', async () => {
      // Mount fetch uses the AuthContext user; only unequip still calls getUser.
      mockGetUser.mockResolvedValueOnce({ data: { user: null } }); // unequip

      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let res: { error: string | null } | undefined;
      await act(async () => {
        res = await result.current.unequipItem('card_border');
      });
      expect(res?.error).toBe('Not authenticated');
    });

    it('should roll back equipped state when delete fails', async () => {
      setTable('user_equipped', [{ slot: 'card_border', item_key: 'border_none' }]);

      const { result } = renderHook(() => useShop());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Now make delete fail
      setTable('user_equipped', null, new Error('Delete error'));

      await act(async () => {
        await result.current.unequipItem('card_border');
      });
      // Should have rolled back
      expect(result.current.equipped.card_border).toBe('border_none');
    });
  });

  // ── SHOP_ITEMS catalog ───────────────────────────────────────────────────────

  describe('SHOP_ITEMS catalog', () => {
    it('should include free themes (sakura, murasaki, yuki)', () => {
      const freeThemes = SHOP_ITEMS.filter(
        (i) => i.category === 'theme' && i.price === 0 && !i.comingSoon,
      );
      expect(freeThemes.map((t) => t.key)).toContain('theme_sakura');
      expect(freeThemes.map((t) => t.key)).toContain('theme_murasaki');
      expect(freeThemes.map((t) => t.key)).toContain('theme_yuki');
    });

    it('should include border_none as a free card border', () => {
      const borderNone = SHOP_ITEMS.find((i) => i.key === 'border_none');
      expect(borderNone).toBeDefined();
      expect(borderNone?.price).toBe(0);
    });

    it('should include paid items with price > 0', () => {
      const paid = SHOP_ITEMS.filter((i) => i.price > 0 && !i.comingSoon);
      expect(paid.length).toBeGreaterThan(0);
    });

    it('should have unique keys across all items', () => {
      const keys = SHOP_ITEMS.map((i) => i.key);
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    });
  });

  // ── Study buddy price ladder ─────────────────────────────────────────────────
  // Tuned July 2026 against real earn-rate data: the whole set is collectable
  // over one Sept–July school year. Shop.tsx renders items in array order, so
  // array order is the visible ladder.

  describe('study buddy price ladder', () => {
    // Coming-soon teasers aren't purchasable, so they're not part of the ladder.
    const buddies = SHOP_ITEMS.filter((i) => i.category === 'study_buddy' && !i.comingSoon);

    it('should price buddies in strictly ascending array order', () => {
      const prices = buddies.map((b) => b.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
      expect(new Set(prices).size).toBe(prices.length);
    });

    it('should have exactly one free buddy, the default Tango', () => {
      const free = buddies.filter((b) => b.price === 0);
      expect(free.map((b) => b.key)).toEqual(['buddy_tango']);
    });

    it('should crown the ladder with the lucky cat', () => {
      expect(buddies.at(-1)?.key).toBe('buddy_lucky_cat');
    });

    it('should put a cat within early reach, between Pico and Anko', () => {
      const price = (key: string) => buddies.find((b) => b.key === key)!.price;
      expect(price('buddy_pink_cat')).toBeGreaterThan(price('buddy_penguin'));
      expect(price('buddy_pink_cat')).toBeLessThan(price('buddy_panda'));
    });

    it('should keep the full set collectable within a school year', () => {
      const total = buddies.reduce((sum, b) => sum + b.price, 0);
      expect(total).toBe(243000);
    });

    it('should leave the cheapest buddy affordable but the second out of reach on launch day', () => {
      // Naomania had 26,040 XP banked and nothing spent when this was tuned.
      const banked = 26040;
      const paid = buddies.filter((b) => b.price > 0);
      expect(paid[0].price).toBeLessThanOrEqual(banked);
      expect(paid[0].price + paid[1].price).toBeGreaterThan(banked);
    });
  });
});
