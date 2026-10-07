import { beforeEach, describe, expect, it, vi } from 'vitest';

const { assignHandoutMock, removeHandoutMock, linkWeekToUnitMock } = vi.hoisted(() => ({
  assignHandoutMock: vi.fn(),
  removeHandoutMock: vi.fn(),
  linkWeekToUnitMock: vi.fn(),
}));

vi.mock('../handoutWrites', () => ({
  assignHandout: (...args: unknown[]) => assignHandoutMock(...args),
  removeHandout: (...args: unknown[]) => removeHandoutMock(...args),
}));
vi.mock('../linkWeekToUnit', () => ({
  linkWeekToUnit: (...args: unknown[]) => linkWeekToUnitMock(...args),
}));

import { copyUnit } from '../copyUnit';

const ORGANIZER = {
  id: 'org1',
  username: 'teacher',
  account_type: 'organizer',
  display_name: 'Teacher',
};
const SOURCE_PLAN = { id: 'plan1', group_id: 'g1', title: 'Unit 1', jlpt_level: 'N5' };
const TARGET_GROUP = {
  id: 'g2',
  organizer_id: 'org1',
  name: 'Section B',
  emoji: '🐱',
  pinned: false,
  created_at: '2026-01-01',
};

interface TableState {
  lesson_plan_decks: { deck_id: string; position: number }[];
  decks: { id: string; name: string; emoji: string | null }[];
  planned_assignments: Record<string, unknown>[];
  assignments: Record<string, unknown>[];
  alreadyHandedOutDeckIds: Set<string>;
  handedOutCheckErrorDeckIds: Set<string>;
  insertedPlans: unknown[];
  deletedPlanIds: string[];
}

function makeSb(state: TableState) {
  const insertLessonPlansMock = vi.fn((row: Record<string, unknown>) => {
    state.insertedPlans.push(row);
    return Promise.resolve({ error: null });
  });

  function makeChain(table: string) {
    const filters: Record<string, unknown> = {};
    let deleting = false;
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn((col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    });
    chain.in = vi.fn((col: string, val: unknown) => {
      filters[col] = val;
      return chain;
    });
    chain.order = vi.fn(() => chain);
    chain.range = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.delete = vi.fn(() => {
      deleting = true;
      return chain;
    });
    chain.insert = table === 'lesson_plans' ? insertLessonPlansMock : vi.fn();
    chain.maybeSingle = vi.fn(() => {
      if (table === 'planned_assignments' || table === 'assignments') {
        if (
          filters.group_id === TARGET_GROUP.id &&
          state.handedOutCheckErrorDeckIds.has(filters.deck_id as string)
        ) {
          return Promise.resolve({ data: null, error: { message: 'boom' } });
        }
        const found =
          filters.group_id === TARGET_GROUP.id &&
          state.alreadyHandedOutDeckIds.has(filters.deck_id as string);
        return Promise.resolve({ data: found ? { deck_id: filters.deck_id } : null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
      if (deleting && table === 'lesson_plans') {
        state.deletedPlanIds.push(filters.id as string);
        return Promise.resolve({ error: null }).then(res, rej);
      }
      if (table === 'lesson_plan_decks')
        return Promise.resolve({ data: state.lesson_plan_decks, error: null }).then(res, rej);
      if (table === 'decks')
        return Promise.resolve({ data: state.decks, error: null }).then(res, rej);
      if (table === 'planned_assignments')
        return Promise.resolve({ data: state.planned_assignments, error: null }).then(res, rej);
      if (table === 'assignments')
        return Promise.resolve({ data: state.assignments, error: null }).then(res, rej);
      return Promise.resolve({ data: [], error: null }).then(res, rej);
    };
    return chain;
  }

  return { from: (table: string) => makeChain(table) };
}

function makeState(overrides: Partial<TableState> = {}): TableState {
  return {
    lesson_plan_decks: [
      { deck_id: 'd1', position: 0 },
      { deck_id: 'd2', position: 1 },
    ],
    decks: [
      { id: 'd1', name: 'Greetings', emoji: null },
      { id: 'd2', name: 'Food', emoji: null },
    ],
    planned_assignments: [
      {
        deck_id: 'd1',
        title: 'Week 1',
        note: 'Can greet',
        due_date: '2026-09-01',
        available_on: '2026-08-25',
        required_accuracy: 80,
        required_mode: 'quiz',
      },
      {
        deck_id: 'd2',
        title: 'Week 2',
        note: 'Can order food',
        due_date: '2026-09-08',
        available_on: '2026-09-01',
        required_accuracy: null,
        required_mode: null,
      },
    ],
    assignments: [],
    alreadyHandedOutDeckIds: new Set(),
    handedOutCheckErrorDeckIds: new Set(),
    insertedPlans: [],
    deletedPlanIds: [],
    ...overrides,
  };
}

describe('copyUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assignHandoutMock.mockResolvedValue({ error: null });
    removeHandoutMock.mockResolvedValue({ error: null });
    linkWeekToUnitMock.mockResolvedValue({ status: 'ok' });
  });

  it('copies every week, preserving positions, and never touches decks or cards', async () => {
    const state = makeState();
    const sb = makeSb(state);

    const result = await copyUnit({
      sb: sb as never,
      organizer: ORGANIZER,
      sourcePlan: SOURCE_PLAN,
      targetGroup: TARGET_GROUP as never,
      firstDueDate: '2026-10-06',
    });

    expect(result).toEqual({
      status: 'ok',
      planId: expect.any(String),
      added: 2,
      skipped: [],
    });
    expect(assignHandoutMock).toHaveBeenCalledTimes(2);
    expect(linkWeekToUnitMock).toHaveBeenNthCalledWith(1, sb, {
      planId: expect.any(String),
      deckId: 'd1',
      position: 0,
    });
    expect(linkWeekToUnitMock).toHaveBeenNthCalledWith(2, sb, {
      planId: expect.any(String),
      deckId: 'd2',
      position: 1,
    });
  });

  it('skips a deck already handed out in the target group and reports it', async () => {
    const state = makeState({ alreadyHandedOutDeckIds: new Set(['d2']) });
    const sb = makeSb(state);

    const result = await copyUnit({
      sb: sb as never,
      organizer: ORGANIZER,
      sourcePlan: SOURCE_PLAN,
      targetGroup: TARGET_GROUP as never,
      firstDueDate: '2026-10-06',
    });

    expect(result).toEqual({
      status: 'ok',
      planId: expect.any(String),
      added: 1,
      skipped: [{ deckId: 'd2', name: 'Food' }],
    });
    expect(assignHandoutMock).toHaveBeenCalledTimes(1);
  });

  it('rolls back both the failed week and the ones already added when a later week fails to assign', async () => {
    const state = makeState();
    const sb = makeSb(state);
    assignHandoutMock
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: 'db exploded' });

    const result = await copyUnit({
      sb: sb as never,
      organizer: ORGANIZER,
      sourcePlan: SOURCE_PLAN,
      targetGroup: TARGET_GROUP as never,
      firstDueDate: '2026-10-06',
    });

    expect(result).toEqual({ status: 'error' });
    expect(removeHandoutMock).toHaveBeenCalledTimes(2);
    expect(removeHandoutMock).toHaveBeenCalledWith(sb, {
      organizerId: 'org1',
      groupId: 'g2',
      deckId: 'd1',
    });
    expect(removeHandoutMock).toHaveBeenCalledWith(sb, {
      organizerId: 'org1',
      groupId: 'g2',
      deckId: 'd2',
    });
    expect(state.deletedPlanIds).toHaveLength(1);
  });

  it('rolls back both weeks when the 2nd week fails to link (assign already landed)', async () => {
    const state = makeState();
    const sb = makeSb(state);
    linkWeekToUnitMock
      .mockResolvedValueOnce({ status: 'ok' })
      .mockResolvedValueOnce({ status: 'error' });

    const result = await copyUnit({
      sb: sb as never,
      organizer: ORGANIZER,
      sourcePlan: SOURCE_PLAN,
      targetGroup: TARGET_GROUP as never,
      firstDueDate: '2026-10-06',
    });

    expect(result).toEqual({ status: 'error' });
    expect(removeHandoutMock).toHaveBeenCalledTimes(2);
    expect(removeHandoutMock).toHaveBeenCalledWith(sb, {
      organizerId: 'org1',
      groupId: 'g2',
      deckId: 'd1',
    });
    expect(removeHandoutMock).toHaveBeenCalledWith(sb, {
      organizerId: 'org1',
      groupId: 'g2',
      deckId: 'd2',
    });
    expect(state.deletedPlanIds).toHaveLength(1);
  });

  it('rolls back and never writes when the duplicate check itself errors', async () => {
    const state = makeState({ handedOutCheckErrorDeckIds: new Set(['d2']) });
    const sb = makeSb(state);

    const result = await copyUnit({
      sb: sb as never,
      organizer: ORGANIZER,
      sourcePlan: SOURCE_PLAN,
      targetGroup: TARGET_GROUP as never,
      firstDueDate: '2026-10-06',
    });

    expect(result).toEqual({ status: 'error' });
    expect(assignHandoutMock).toHaveBeenCalledTimes(1);
    expect(removeHandoutMock).toHaveBeenCalledTimes(1);
    expect(removeHandoutMock).toHaveBeenCalledWith(sb, {
      organizerId: 'org1',
      groupId: 'g2',
      deckId: 'd1',
    });
    expect(state.deletedPlanIds).toHaveLength(1);
  });

  it('returns nothing_to_copy and removes the plan row when every week is already handed out', async () => {
    const state = makeState({ alreadyHandedOutDeckIds: new Set(['d1', 'd2']) });
    const sb = makeSb(state);

    const result = await copyUnit({
      sb: sb as never,
      organizer: ORGANIZER,
      sourcePlan: SOURCE_PLAN,
      targetGroup: TARGET_GROUP as never,
      firstDueDate: '2026-10-06',
    });

    expect(result).toEqual({ status: 'nothing_to_copy' });
    expect(assignHandoutMock).not.toHaveBeenCalled();
    expect(state.deletedPlanIds).toHaveLength(1);
  });

  it('returns nothing_to_copy without creating a plan row when the source unit has no weeks', async () => {
    const state = makeState({ lesson_plan_decks: [], decks: [] });
    const sb = makeSb(state);

    const result = await copyUnit({
      sb: sb as never,
      organizer: ORGANIZER,
      sourcePlan: SOURCE_PLAN,
      targetGroup: TARGET_GROUP as never,
      firstDueDate: '2026-10-06',
    });

    expect(result).toEqual({ status: 'nothing_to_copy' });
    expect(state.insertedPlans).toHaveLength(0);
  });
});
