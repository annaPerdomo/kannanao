import { describe, expect, it } from 'vitest';

import { assignmentWordProgress } from '../assignmentWordProgress';

const USER = 'user-1';

function makeCardsPage(allCards: { id: string; deck_id: string }[]) {
  return (from: number, to: number) => ({
    data: allCards.slice(from, to + 1),
    error: null,
  });
}

function makeSb(args: {
  cards: { id: string; deck_id: string }[];
  progress: { card_id: string; last_reviewed_at: string | null; interval_days: number }[];
}) {
  const cardsPage = makeCardsPage(args.cards);
  return {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.in = () => chain;
      chain.eq = () => chain;
      chain.order = () => chain;
      chain.range = (from: number, to: number) => Promise.resolve(cardsPage(from, to));
      chain.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: table === 'card_progress' ? args.progress : [], error: null });
      return chain;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('assignmentWordProgress', () => {
  it('returns an empty map with no deck assignments', async () => {
    const sb = makeSb({ cards: [], progress: [] });
    const result = await assignmentWordProgress(sb, USER, [
      { id: 'a1', deck_id: null, created_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(result.size).toBe(0);
  });

  it('pages past PostgREST’s 1000-row cap so total is not truncated', async () => {
    const cards = Array.from({ length: 1200 }, (_, i) => ({ id: `c${i}`, deck_id: 'd1' }));
    const sb = makeSb({ cards, progress: [] });
    const result = await assignmentWordProgress(sb, USER, [
      { id: 'a1', deck_id: 'd1', created_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(result.get('a1')?.total).toBe(1200);
  });

  it('tallies seen/known per assignment from the resulting cards', async () => {
    const cards = [
      { id: 'c1', deck_id: 'd1' },
      { id: 'c2', deck_id: 'd1' },
    ];
    const progress = [
      { card_id: 'c1', last_reviewed_at: '2026-02-01T00:00:00Z', interval_days: 1 },
    ];
    const sb = makeSb({ cards, progress });
    const result = await assignmentWordProgress(sb, USER, [
      { id: 'a1', deck_id: 'd1', created_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(result.get('a1')).toEqual({ total: 2, seen: 1, known: 1 });
  });
});
