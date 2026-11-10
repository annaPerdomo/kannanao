import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { logger } from '@/lib/logger';

import { groupUsesKanjiPractice } from '../groupKanjiPractice';

function client(result: { data?: unknown[] | null; error?: { message: string } | null }) {
  const filters: [string, unknown][] = [];
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      filters.push([col, val]);
      return chain;
    },
    limit: () => Promise.resolve({ data: null, error: null, ...result }),
  };
  return { sb: { from: () => chain } as unknown as SupabaseClient, filters };
}

const ARGS = { organizerId: 'org1', groupId: 'g1' };

describe('groupUsesKanjiPractice', () => {
  it('is true when a deck handed out to the group has kanji practice on', async () => {
    const { sb, filters } = client({ data: [{ id: 'd1' }] });
    expect(await groupUsesKanjiPractice(sb, ARGS)).toBe(true);
    expect(filters).toEqual([
      ['user_id', 'org1'],
      ['reading_practice', true],
      ['assignments.group_id', 'g1'],
    ]);
  });

  it('is false when no handed-out deck has it on', async () => {
    expect(await groupUsesKanjiPractice(client({ data: [] }).sb, ARGS)).toBe(false);
  });

  it('logs a failed read and answers false', async () => {
    const { sb } = client({ error: { message: 'boom' } });
    expect(await groupUsesKanjiPractice(sb, ARGS)).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });
});
