import { beforeEach, describe, expect, it, vi } from 'vitest';

const { assignHandoutMock, updateHandoutMock, linkWeekToUnitMock } = vi.hoisted(() => ({
  assignHandoutMock: vi.fn(),
  updateHandoutMock: vi.fn(),
  linkWeekToUnitMock: vi.fn(),
}));

vi.mock('../handoutWrites', () => ({
  assignHandout: (...args: unknown[]) => assignHandoutMock(...args),
  updateHandout: (...args: unknown[]) => updateHandoutMock(...args),
}));
vi.mock('../linkWeekToUnit', () => ({
  linkWeekToUnit: (...args: unknown[]) => linkWeekToUnitMock(...args),
}));

import { addDeckWeek } from '../addDeckWeek';

interface Result {
  data?: unknown;
  error?: unknown;
  count?: number;
}

const queues: Record<string, Result[]> = {};
function queue(table: string, ...results: Result[]) {
  queues[table] = [...results];
}
function takeResult(table: string): Result {
  const q = queues[table];
  if (!q || q.length === 0) return { data: null, error: null };
  if (q.length === 1) return q[0];
  return q.shift() as Result;
}

function makeChain(table: string) {
  let countRequested = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.select = vi.fn((_cols?: string, opts?: { count?: string }) => {
    if (opts?.count) countRequested = true;
    return chain;
  });
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(takeResult(table)));
  chain.maybeSingle = vi.fn(() => Promise.resolve(takeResult(table)));
  chain.upsert = vi.fn(() => Promise.resolve(takeResult(table)));
  chain.then = (onf: (v: unknown) => unknown, onr?: (e: unknown) => unknown) => {
    const r = takeResult(table);
    const result = countRequested
      ? { data: r.data ?? null, error: r.error ?? null, count: r.count ?? 0 }
      : r;
    return Promise.resolve(result).then(onf, onr);
  };
  return chain;
}

function makeSb() {
  return { from: (table: string) => makeChain(table) } as unknown as Parameters<
    typeof addDeckWeek
  >[0]['sb'];
}

const ORGANIZER = {
  id: 'org1',
  username: 'teacher',
  account_type: 'organizer' as const,
  display_name: 'Teacher',
};
const GROUP = {
  id: 'g1',
  organizer_id: 'org1',
  name: 'Group',
  emoji: '🎌',
  pinned: false,
  created_at: '',
};

const BASE_ARGS = {
  organizer: ORGANIZER,
  group: GROUP,
  planId: 'plan1',
  deckId: 'd9',
  nextPosition: 1,
  dueDate: '2026-10-20',
  availableOn: '2026-10-13',
};

describe('addDeckWeek', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(queues)) delete queues[key];
    assignHandoutMock.mockResolvedValue({ error: null });
    updateHandoutMock.mockResolvedValue({ error: null });
    linkWeekToUnitMock.mockResolvedValue({ status: 'ok' });
  });

  it('returns not_found when the deck is not owned by this organizer', async () => {
    queue('decks', { data: null });
    const result = await addDeckWeek({ sb: makeSb(), ...BASE_ARGS });
    expect(result).toEqual({ status: 'not_found' });
  });

  it('returns already_in_unit when the deck already has a week in this group', async () => {
    queue('decks', { data: { id: 'd9', name: 'Spare' } });
    queue('lesson_plans', { data: [{ id: 'plan1' }, { id: 'plan2' }] });
    queue('lesson_plan_decks', { data: [{ deck_id: 'd9' }] });

    const result = await addDeckWeek({ sb: makeSb(), ...BASE_ARGS });
    expect(result).toEqual({ status: 'already_in_unit' });
    expect(assignHandoutMock).not.toHaveBeenCalled();
    expect(updateHandoutMock).not.toHaveBeenCalled();
  });

  it('freshly assigns a deck that was never handed out', async () => {
    queue('decks', { data: { id: 'd9', name: 'Spare' } });
    queue('lesson_plans', { data: [] });
    queue('planned_assignments', { count: 0 });
    queue('assignments', { data: null });

    const result = await addDeckWeek({ sb: makeSb(), ...BASE_ARGS });
    expect(result).toEqual({ status: 'ok', deckId: 'd9' });
    expect(assignHandoutMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deckId: 'd9', title: 'Spare' }),
    );
    expect(updateHandoutMock).not.toHaveBeenCalled();
  });

  it('backfills a missing template from an existing assignment, then updates it', async () => {
    queue('decks', { data: { id: 'd9', name: 'Spare' } });
    queue('lesson_plans', { data: [] });
    queue('planned_assignments', { count: 0 }, { error: null });
    queue('assignments', {
      data: {
        title: 'Week 3',
        note: 'I can order food.',
        required_accuracy: 70,
        required_mode: 'study',
      },
    });

    const result = await addDeckWeek({ sb: makeSb(), ...BASE_ARGS });
    expect(result).toEqual({ status: 'ok', deckId: 'd9' });
    expect(updateHandoutMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        deckId: 'd9',
        patch: { dueDate: '2026-10-20', availableOn: '2026-10-13' },
      }),
    );
    expect(assignHandoutMock).not.toHaveBeenCalled();
  });

  it('updates an existing template directly when one is already there', async () => {
    queue('decks', { data: { id: 'd9', name: 'Spare' } });
    queue('lesson_plans', { data: [] });
    queue('planned_assignments', { count: 1 });
    queue('assignments', { data: { title: 'Week 3' } });

    await addDeckWeek({ sb: makeSb(), ...BASE_ARGS });
    expect(updateHandoutMock).toHaveBeenCalled();
  });

  it('propagates a link conflict without treating it as an error', async () => {
    queue('decks', { data: { id: 'd9', name: 'Spare' } });
    queue('lesson_plans', { data: [] });
    queue('planned_assignments', { count: 1 });
    linkWeekToUnitMock.mockResolvedValue({ status: 'conflict' });

    const result = await addDeckWeek({ sb: makeSb(), ...BASE_ARGS });
    expect(result).toEqual({ status: 'conflict' });
  });
});
