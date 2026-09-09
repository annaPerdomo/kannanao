import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

let tableRows: Record<string, Row[]> = {};
let coverage: { learnerCount: number; knownByKana: Record<string, number> } = {
  learnerCount: 0,
  knownByKana: {},
};

vi.mock('@/app/api/group/_lib/groupKanaCoverage', () => ({
  getGroupKanaCoverage: () => Promise.resolve(coverage),
}));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        not: () => chain,
        order: () => chain,
        range: () => chain,
        then: (ok: (r: { data: Row[]; error: null }) => unknown) =>
          Promise.resolve({ data: tableRows[table] ?? [], error: null }).then(ok),
      };
      return chain;
    },
  }),
}));

import { getGroupKanaCourseNeeds } from '@/app/api/group/_lib/groupKanaCourseSource';

const TODAY = '2026-09-07';

function assignment(
  deckId: string,
  dueDate: string | null,
  completedAt: string | null = null,
): Row {
  return { deck_id: deckId, due_date: dueDate, completed_at: completedAt };
}

function planned(deckId: string, dueDate: string | null): Row {
  return { deck_id: deckId, due_date: dueDate };
}

function deck(id: string): Row {
  return { id };
}

function card(deckId: string, word: string, reading: string | null = null): Row {
  return { deck_id: deckId, word, reading };
}

beforeEach(() => {
  tableRows = {
    assignments: [],
    planned_assignments: [],
    decks: [],
    cards: [],
  };
  coverage = { learnerCount: 0, knownByKana: {} };
});

describe('getGroupKanaCourseNeeds', () => {
  it('returns nothing when no deck has an open due date', async () => {
    expect(await getGroupKanaCourseNeeds('g1', 'org1', TODAY)).toEqual({
      needs: [],
      deckCount: 0,
    });
  });

  it('ignores completed and past-due handouts', async () => {
    tableRows.assignments = [
      assignment('d1', '2026-08-01'), // past due
      assignment('d2', '2026-09-20', '2026-09-01T00:00:00Z'), // completed
    ];
    expect(await getGroupKanaCourseNeeds('g1', 'org1', TODAY)).toEqual({
      needs: [],
      deckCount: 0,
    });
  });

  it('extracts kana rows from card readings, dropping a whole row the group already reads', async () => {
    tableRows.assignments = [assignment('d1', '2026-09-20')];
    tableRows.decks = [deck('d1')];
    tableRows.cards = [card('d1', 'ねこ'), card('d1', 'いぬ')];
    coverage = {
      learnerCount: 4,
      // Every character in な行 (hira-na) known — な,に,ぬ,ね,の. か行 stays
      // unread except こ, so hira-ka does not clear the row-level bar.
      knownByKana: { な: 4, に: 4, ぬ: 4, ね: 4, の: 4, こ: 4 },
    };

    const result = await getGroupKanaCourseNeeds('g1', 'org1', TODAY);
    expect(result.deckCount).toBe(1);
    expect(result.needs.map((n) => n.setId).sort()).toEqual(['hira-a', 'hira-ka']);
    expect(result.needs.every((n) => n.firstDueDate === '2026-09-20')).toBe(true);
  });

  it('keeps the soonest open due date per deck across assignments and templates', async () => {
    tableRows.assignments = [assignment('d1', '2026-09-25'), assignment('d1', '2026-09-15')];
    tableRows.planned_assignments = [planned('d1', '2026-09-10')];
    tableRows.decks = [deck('d1')];
    tableRows.cards = [card('d1', 'あ')];

    const result = await getGroupKanaCourseNeeds('g1', 'org1', TODAY);
    expect(result.needs).toEqual([{ setId: 'hira-a', firstDueDate: '2026-09-10' }]);
  });

  it('orders by first due date, then curriculum, across decks', async () => {
    tableRows.assignments = [assignment('d1', '2026-09-20'), assignment('d2', '2026-09-13')];
    tableRows.decks = [deck('d1'), deck('d2')];
    tableRows.cards = [card('d1', 'か'), card('d2', 'あ')];

    const result = await getGroupKanaCourseNeeds('g1', 'org1', TODAY);
    expect(result.needs).toEqual([
      { setId: 'hira-a', firstDueDate: '2026-09-13' },
      { setId: 'hira-ka', firstDueDate: '2026-09-20' },
    ]);
  });

  it('never reads a deck the organizer does not own', async () => {
    tableRows.assignments = [assignment('d1', '2026-09-20')];
    tableRows.decks = []; // ownership check finds nothing
    tableRows.cards = [card('d1', 'あ')];

    expect(await getGroupKanaCourseNeeds('g1', 'org1', TODAY)).toEqual({
      needs: [],
      deckCount: 0,
    });
  });

  it('falls back to the word when reading is blank (already kana)', async () => {
    tableRows.assignments = [assignment('d1', '2026-09-20')];
    tableRows.decks = [deck('d1')];
    tableRows.cards = [card('d1', 'あい', '')];

    const result = await getGroupKanaCourseNeeds('g1', 'org1', TODAY);
    expect(result.needs.map((n) => n.setId)).toEqual(['hira-a']);
  });
});
