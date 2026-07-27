import { describe, expect, it } from 'vitest';

import { pickFirstLines } from '@/lib/dbMappers';

function line(id: string, text: string, order: number) {
  return { ohanashikai_id: id, text, order_index: order };
}

describe('pickFirstLines', () => {
  it('keeps one opening line per speech', () => {
    const result = pickFirstLines([
      line('s1', 'first', 0),
      line('s1', 'second', 1),
      line('s2', 'other', 0),
    ]);

    expect(result.get('s1')).toBe('first');
    expect(result.get('s2')).toBe('other');
    expect(result.size).toBe(2);
  });

  // The query has no ORDER BY — Postgres is free to return rows in any order,
  // so the lowest index has to win on comparison rather than on arrival.
  it('takes the lowest order_index whatever order the rows arrive in', () => {
    const result = pickFirstLines([line('s1', 'third', 2), line('s1', 'first', 0)]);
    expect(result.get('s1')).toBe('first');
  });

  // Reordering rewrites indices and deleting line one leaves a gap, so "first"
  // cannot be hard-coded to index 0.
  it('handles a speech whose indices do not start at zero', () => {
    const result = pickFirstLines([line('s1', 'now first', 3), line('s1', 'later', 7)]);
    expect(result.get('s1')).toBe('now first');
  });

  it('returns an empty map for no lines', () => {
    expect(pickFirstLines([]).size).toBe(0);
  });
});
