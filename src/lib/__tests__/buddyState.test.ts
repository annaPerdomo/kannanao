import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn((_table: string) => ({ select: mockSelect }));

vi.mock('@/lib/supabase', () => ({
  sb: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
  isConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { claimBuddyGreeting, fetchRecentWords, persistBuddyWords } from '@/lib/buddyState';

const INU = { word: '犬', reading: 'いぬ' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchRecentWords', () => {
  it('reads the account’s own row', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { recent_words: [INU] }, error: null });

    expect(await fetchRecentWords('u1')).toEqual([INU]);
    expect(mockFrom).toHaveBeenCalledWith('buddy_state');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('starts empty for a learner with no row yet', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    expect(await fetchRecentWords('u1')).toEqual([]);
  });

  it('stays quiet when the read fails', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'offline' } });

    expect(await fetchRecentWords('u1')).toEqual([]);
  });

  it('drops entries the column should not be holding', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { recent_words: ['nope', { word: '' }, INU] },
      error: null,
    });

    expect(await fetchRecentWords('u1')).toEqual([INU]);
  });
});

describe('claimBuddyGreeting', () => {
  it('reports the claim it won', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    expect(await claimBuddyGreeting('2026-08-16')).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('claim_buddy_greeting', { p_today: '2026-08-16' });
  });

  it('reports the claim someone else already took', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    expect(await claimBuddyGreeting('2026-08-16')).toBe(false);
  });

  // The greeting is once a day: a failed claim that read as "yours" would greet
  // on every load until the RPC recovered.
  it('refuses the day when the RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'offline' } });

    expect(await claimBuddyGreeting('2026-08-16')).toBe(false);
  });
});

describe('persistBuddyWords', () => {
  it('returns the window the server merged', async () => {
    mockRpc.mockResolvedValue({ data: [INU], error: null });

    expect(await persistBuddyWords([INU])).toEqual([INU]);
    expect(mockRpc).toHaveBeenCalledWith('remember_buddy_words', { p_words: [INU] });
  });

  it('does not call out with nothing to save', async () => {
    expect(await persistBuddyWords([])).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('reports failure rather than an empty window', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'offline' } });
    expect(await persistBuddyWords([INU])).toBeNull();

    mockRpc.mockResolvedValue({ data: [], error: null });
    expect(await persistBuddyWords([INU])).toBeNull();
  });
});
