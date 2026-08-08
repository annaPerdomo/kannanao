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
let deletedRow: Record<string, unknown> | null;
const deletes: { table: string; filters: [string, unknown][] }[] = [];

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from(table: string) {
      let deleting = false;
      const filters: [string, unknown][] = [];
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.delete = () => {
        deleting = true;
        deletes.push({ table, filters });
        return chain;
      };
      chain.eq = (column: string, value: unknown) => {
        filters.push([column, value]);
        return chain;
      };
      chain.maybeSingle = () => Promise.resolve({ data: deletedRow, error: null });
      chain.then = (ok: (r: unknown) => unknown) =>
        Promise.resolve(deleting ? { error: null } : { count: remaining, error: null }).then(ok);
      return chain;
    },
  }),
}));

import { DELETE } from '@/app/api/group/assignments/[id]/route';

function deleteRequest() {
  return new NextRequest('http://localhost/api/group/assignments/a1', {
    method: 'DELETE',
    headers: { authorization: 'Bearer token' },
  });
}

const params = Promise.resolve({ id: 'a1' });

function plannedDelete() {
  return deletes.find((d) => d.table === 'planned_assignments');
}

beforeEach(() => {
  _resetStore();
  deletes.length = 0;
  remaining = 0;
  deletedRow = { group_id: 'g1', deck_id: 'd1' };
});

describe('DELETE /api/group/assignments/[id]', () => {
  it('retires the plan-ahead template once the last copy of the deck is gone', async () => {
    // Otherwise catchUpGroupAssignments hands the deleted work to whoever
    // joins next, and the organizer has no UI to clear it.
    const res = await DELETE(deleteRequest(), { params });

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

    await DELETE(deleteRequest(), { params });

    expect(plannedDelete()).toBeUndefined();
  });

  it('touches no template when the assignment was not the caller’s to delete', async () => {
    deletedRow = null;

    const res = await DELETE(deleteRequest(), { params });

    expect(res.status).toBe(200);
    expect(plannedDelete()).toBeUndefined();
  });
});
