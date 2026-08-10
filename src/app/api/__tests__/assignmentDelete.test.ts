import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

/** Live assignments left for the deck after the delete. */
let remaining: number;
let deletedRows: Record<string, unknown>[];
const deletes: { table: string; filters: [string, unknown][] }[] = [];

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from(table: string) {
      let deleting = false;
      const filters: [string, unknown][] = [];
      const chain: Record<string, unknown> = {};
      chain.select = () =>
        deleting ? Promise.resolve({ data: deletedRows, error: null }) : (chain as never);
      chain.delete = () => {
        deleting = true;
        deletes.push({ table, filters });
        return chain;
      };
      chain.eq = (column: string, value: unknown) => {
        filters.push([column, value]);
        return chain;
      };
      chain.in = (column: string, value: unknown) => {
        filters.push([column, value]);
        return chain;
      };
      chain.then = (ok: (r: unknown) => unknown) =>
        Promise.resolve({ count: remaining, error: null }).then(ok);
      return chain;
    },
  }),
}));

import { DELETE } from '@/app/api/group/assignments/route';

function deleteRequest(ids: unknown) {
  return new NextRequest('http://localhost/api/group/assignments', {
    method: 'DELETE',
    headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

function plannedDelete() {
  return deletes.find((d) => d.table === 'planned_assignments');
}

function assignmentDelete() {
  return deletes.find((d) => d.table === 'assignments');
}

beforeEach(() => {
  _resetStore();
  deletes.length = 0;
  remaining = 0;
  deletedRows = [{ group_id: 'g1', deck_id: 'd1' }];
});

describe('DELETE /api/group/assignments', () => {
  it('removes every copy in one statement, scoped to the caller', async () => {
    deletedRows = [
      { group_id: 'g1', deck_id: 'd1' },
      { group_id: 'g1', deck_id: 'd1' },
    ];

    const res = await DELETE(deleteRequest(['a1', 'a2']));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, deleted: 2 });
    expect(assignmentDelete()?.filters).toEqual([
      ['id', ['a1', 'a2']],
      ['organizer_id', 'org1'],
    ]);
  });

  it('retires the plan-ahead template once the last copy of the deck is gone', async () => {
    // Otherwise catchUpGroupAssignments hands the deleted work to whoever
    // joins next, and the organizer has no UI to clear it.
    const res = await DELETE(deleteRequest(['a1']));

    expect(res.status).toBe(200);
    expect(plannedDelete()?.filters).toEqual([
      ['organizer_id', 'org1'],
      ['group_id', 'g1'],
      ['deck_id', 'd1'],
    ]);
  });

  it('keeps the template while another learner still holds the deck', async () => {
    // Assignments are one row per learner; removing one copy is not removing
    // the handout from the group.
    remaining = 2;

    await DELETE(deleteRequest(['a1']));

    expect(plannedDelete()).toBeUndefined();
  });

  it('touches no template when the assignment was not the caller’s to delete', async () => {
    deletedRows = [];

    const res = await DELETE(deleteRequest(['a1']));

    expect(res.status).toBe(200);
    expect(plannedDelete()).toBeUndefined();
  });

  it('checks each deck once when a batch spans several handouts', async () => {
    deletedRows = [
      { group_id: 'g1', deck_id: 'd1' },
      { group_id: 'g1', deck_id: 'd1' },
      { group_id: 'g1', deck_id: 'd2' },
    ];

    await DELETE(deleteRequest(['a1', 'a2', 'a3']));

    expect(deletes.filter((d) => d.table === 'planned_assignments')).toHaveLength(2);
  });

  it('rejects a request with no ids', async () => {
    const res = await DELETE(deleteRequest([]));

    expect(res.status).toBe(400);
    expect(assignmentDelete()).toBeUndefined();
  });
});
