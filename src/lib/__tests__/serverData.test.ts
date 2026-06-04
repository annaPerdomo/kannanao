import { beforeEach, describe, expect, it, vi } from 'vitest';

// serverData.ts is `import 'server-only'` — neutralize it for the test env.
vi.mock('server-only', () => ({}));

// ─── Fake cookie-bound Supabase client ──────────────────────────────────────
//
// getHomeData fires several queries against the same table (e.g. `decks` is hit
// for the pinned rows AND for a head count), so the chain resolves its result
// lazily from what was recorded on it: table, head-count flag, and `.in()`
// filters. That lets one fixture set cover every query shape.

interface Fixtures {
  ownPinnedDecks: unknown[];
  ownDeckCount: number;
  assignments: { deck_id: string }[];
  assignedPinnedDecks: unknown[];
  cards: { deck_id: string }[];
  pinnedSpeeches: unknown[];
  speechCount: number;
  lines: { ohanashikai_id: string }[];
}

let fx: Fixtures;

function resolveFor(b: { table: string; head: boolean; hasInId: boolean }): {
  data: unknown;
  count: number | null;
  error: null;
} {
  const ok = (data: unknown, count: number | null = null) => ({ data, count, error: null });
  switch (b.table) {
    case 'decks':
      if (b.head) return ok(null, fx.ownDeckCount);
      return b.hasInId ? ok(fx.assignedPinnedDecks) : ok(fx.ownPinnedDecks);
    case 'assignments':
      return ok(fx.assignments);
    case 'cards':
      return ok(fx.cards);
    case 'ohanashikais':
      return b.head ? ok(null, fx.speechCount) : ok(fx.pinnedSpeeches);
    case 'ohanashikai_lines':
      return ok(fx.lines);
    default:
      return ok([]);
  }
}

function makeChain(table: string) {
  const b = { table, head: false, hasInId: false };
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn((_cols: string, opts?: { head?: boolean }) => {
    if (opts?.head) b.head = true;
    return chain;
  });
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.in = vi.fn((col: string) => {
    if (col === 'id') b.hasInId = true;
    return chain;
  });
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolveFor(b)));
  chain.single = vi.fn(() => Promise.resolve(resolveFor(b)));
  chain.then = (onful: (v: unknown) => unknown, onrej?: (e: unknown) => unknown) =>
    Promise.resolve(resolveFor(b)).then(onful, onrej);
  return chain;
}

const mockGetUser = vi.fn();
const fakeClient = {
  auth: { getUser: (...a: unknown[]) => mockGetUser(...a) },
  from: (table: string) => makeChain(table),
};

vi.mock('@/lib/supabaseServer', () => ({
  getServerSupabase: vi.fn(async () => fakeClient),
}));

import { getHomeData } from '@/lib/serverData';

const deckRow = (id: string, pinned: boolean) => ({
  id,
  name: `Deck ${id}`,
  description: null,
  created_at: '2026-01-01T00:00:00Z',
  user_id: 'u1',
  emoji: null,
  pinned,
  is_public: false,
  position: 0,
});

const speechRow = (id: string) => ({
  id,
  user_id: 'u1',
  title: `Speech ${id}`,
  description: null,
  created_at: '2026-01-01T00:00:00Z',
  pinned: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  fx = {
    ownPinnedDecks: [deckRow('d1', true)],
    ownDeckCount: 5,
    assignments: [],
    assignedPinnedDecks: [],
    cards: [{ deck_id: 'd1' }, { deck_id: 'd1' }, { deck_id: 'd1' }],
    pinnedSpeeches: [speechRow('o1')],
    speechCount: 3,
    lines: [{ ohanashikai_id: 'o1' }, { ohanashikai_id: 'o1' }],
  };
});

describe('getHomeData', () => {
  it('returns null payloads and zero counts for a signed-out request', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const data = await getHomeData();
    expect(data).toEqual({
      decks: null,
      ohanashikais: null,
      todos: null,
      eventTypes: null,
      totalDeckCount: 0,
      totalOhanashikaiCount: 0,
    });
  });

  it('returns only pinned decks with card counts plus the total deck count', async () => {
    const data = await getHomeData();
    expect(data.decks).toHaveLength(1);
    expect(data.decks?.[0]).toMatchObject({ id: 'd1', pinned: true, cardCount: 3 });
    // total = own deck count (5) + assigned-not-owned (0)
    expect(data.totalDeckCount).toBe(5);
  });

  it('counts assigned-but-not-owned decks toward the total', async () => {
    fx.assignments = [{ deck_id: 'shared1' }, { deck_id: 'd1' }]; // d1 is already owned-pinned
    fx.assignedPinnedDecks = [deckRow('shared1', true)];
    const data = await getHomeData();
    expect(data.decks?.map((d) => d.id).sort()).toEqual(['d1', 'shared1']);
    expect(data.totalDeckCount).toBe(6); // 5 own + 1 shared (d1 deduped out)
  });

  it('returns only pinned speeches with line counts plus the total speech count', async () => {
    const data = await getHomeData();
    expect(data.ohanashikais).toHaveLength(1);
    expect(data.ohanashikais?.[0]).toMatchObject({ id: 'o1', lineCount: 2 });
    expect(data.totalOhanashikaiCount).toBe(3);
  });

  it('reports zero totals when the user has no decks or speeches', async () => {
    fx = { ...fx, ownPinnedDecks: [], ownDeckCount: 0, pinnedSpeeches: [], speechCount: 0 };
    const data = await getHomeData();
    expect(data.decks).toEqual([]);
    expect(data.totalDeckCount).toBe(0);
    expect(data.ohanashikais).toEqual([]);
    expect(data.totalOhanashikaiCount).toBe(0);
  });
});
