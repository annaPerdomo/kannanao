import { beforeEach,describe, expect, it, vi } from 'vitest';

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  single: mockSingle,
  order: mockOrder.mockReturnThis(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

import { GET } from '@/app/api/public/deck/[id]/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function setupDeckFound(deck: object, cards: object[]) {
  // First call: deck query
  mockSingle.mockResolvedValueOnce({ data: deck, error: null });
  // Second call: cards query (chained with order)
  mockOrder.mockResolvedValueOnce({ data: cards, error: null });
}

function setupDeckNotFound() {
  mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/public/deck/[id]', () => {
  it('should return deck and cards when deck is public', async () => {
    const deck = { id: 'deck-1', name: 'Public Deck', description: 'A deck', emoji: '🌸' };
    const cards = [
      { id: 'c1', deck_id: 'deck-1', word: '猫', reading: 'ねこ', meaning: 'cat', main_view_mode: 'hiragana' },
    ];
    setupDeckFound(deck, cards);

    const req = new Request('http://localhost/api/public/deck/deck-1');
    const res = await GET(req, makeParams('deck-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.deck).toEqual(deck);
    expect(body.cards).toHaveLength(1);
  });

  it('should return 404 when deck is not found', async () => {
    setupDeckNotFound();

    const req = new Request('http://localhost/api/public/deck/nonexistent');
    const res = await GET(req, makeParams('nonexistent'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should return 404 when deck is private (not found via is_public=true filter)', async () => {
    // Supabase returns null for private decks because the RLS filter won't match
    setupDeckNotFound();

    const req = new Request('http://localhost/api/public/deck/private-deck');
    const res = await GET(req, makeParams('private-deck'));
    expect(res.status).toBe(404);
  });

  it('should return 500 when Supabase is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const req = new Request('http://localhost/api/public/deck/deck-1');
    const res = await GET(req, makeParams('deck-1'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should return cards array even when empty', async () => {
    const deck = { id: 'deck-1', name: 'Empty Deck', description: '', emoji: '✨' };
    setupDeckFound(deck, []);

    const req = new Request('http://localhost/api/public/deck/deck-1');
    const res = await GET(req, makeParams('deck-1'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.cards).toEqual([]);
  });
});
