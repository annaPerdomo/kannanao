import { describe, expect, it, vi } from 'vitest';

import { linkWeekToUnit } from '../linkWeekToUnit';

function makeSb(result: { error: { message: string; code?: string } | null }) {
  const chain = {
    insert: vi.fn(() => Promise.resolve(result)),
  };
  return { from: vi.fn(() => chain) } as unknown as Parameters<typeof linkWeekToUnit>[0];
}

describe('linkWeekToUnit', () => {
  it('inserts the plan/deck/position row and reports ok', async () => {
    const sb = makeSb({ error: null });
    const result = await linkWeekToUnit(sb, { planId: 'p1', deckId: 'd1', position: 2 });
    expect(result).toEqual({ status: 'ok' });
  });

  it('maps a 23505 unique violation to "conflict"', async () => {
    const sb = makeSb({ error: { message: 'duplicate key', code: '23505' } });
    const result = await linkWeekToUnit(sb, { planId: 'p1', deckId: 'd1', position: 2 });
    expect(result).toEqual({ status: 'conflict' });
  });

  it('maps any other db error to "error"', async () => {
    const sb = makeSb({ error: { message: 'boom', code: '42601' } });
    const result = await linkWeekToUnit(sb, { planId: 'p1', deckId: 'd1', position: 2 });
    expect(result).toEqual({ status: 'error' });
  });
});
