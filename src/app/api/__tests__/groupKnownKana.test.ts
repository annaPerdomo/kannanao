import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

let tables: Record<string, Row[]> = {};
let rosterIds: string[] = [];

vi.mock('@/app/api/group/_lib/membership', () => ({
  memberIdsFor: () => Promise.resolve(rosterIds),
}));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        range: () => chain,
        then: (ok: (r: { data: Row[]; error: null }) => unknown) =>
          Promise.resolve({ data: tables[table] ?? [], error: null }).then(ok),
      };
      return chain;
    },
  }),
}));

import { getGroupKnownKana } from '@/app/api/group/_lib/groupKnownKana';

function profile(id: string, name: string): Row {
  return { id, username: name, display_name: null };
}

/** Five right answers is the "started" bar; three stars is the "reads it" bar. */
function progress(userId: string, kana: string, correct: number, wrong = 0): Row {
  return { user_id: userId, kana, correct_count: correct, wrong_count: wrong };
}

beforeEach(() => {
  tables = { profiles: [], kana_progress: [] };
  rosterIds = [];
});

describe('getGroupKnownKana', () => {
  it('should return nothing for an empty roster', async () => {
    expect(await getGroupKnownKana('g1', 'org1')).toEqual({ members: [], shakyBy: {} });
  });

  it('should treat a member with no kana data as untried, not behind', async () => {
    rosterIds = ['m1'];
    tables.profiles = [profile('m1', 'ken')];

    const readiness = await getGroupKnownKana('g1', 'org1');
    expect(readiness.members).toEqual([{ id: 'm1', name: 'ken', started: false }]);
    // No started members means no judgement at all — not "every kana is a gap".
    expect(readiness.shakyBy).toEqual({});
  });

  it('should treat a couple of taps as untried', async () => {
    rosterIds = ['m1'];
    tables.profiles = [profile('m1', 'ken')];
    tables.kana_progress = [progress('m1', 'あ', 2)];

    const readiness = await getGroupKnownKana('g1', 'org1');
    expect(readiness.members[0].started).toBe(false);
  });

  it('should flag only the kana a started member has not mastered', async () => {
    rosterIds = ['m1'];
    tables.profiles = [profile('m1', 'ken')];
    tables.kana_progress = [progress('m1', 'あ', 6), progress('m1', 'い', 1)];

    const readiness = await getGroupKnownKana('g1', 'org1');
    expect(readiness.members[0].started).toBe(true);
    expect(readiness.shakyBy['あ']).toBeUndefined();
    expect(readiness.shakyBy['い']).toEqual([0]);
  });

  it('should hold the reads-it bar at four-fifths accuracy', async () => {
    rosterIds = ['m1'];
    tables.profiles = [profile('m1', 'ken')];
    tables.kana_progress = [
      progress('m1', 'あ', 12, 3),
      progress('m1', 'い', 10, 3),
      progress('m1', 'う', 4),
    ];

    const readiness = await getGroupKnownKana('g1', 'org1');
    expect(readiness.shakyBy['あ']).toBeUndefined();
    expect(readiness.shakyBy['い']).toEqual([0]);
    expect(readiness.shakyBy['う']).toBeUndefined();
  });

  it('should point at members by index and leave untried members out of the count', async () => {
    rosterIds = ['m1', 'm2', 'm3'];
    tables.profiles = [profile('m1', 'ken'), profile('m2', 'mai'), profile('m3', 'sam')];
    tables.kana_progress = [
      progress('m1', 'ら', 6),
      progress('m2', 'ら', 1, 4),
      progress('m2', 'り', 6),
    ];

    const readiness = await getGroupKnownKana('g1', 'org1');
    expect(readiness.members.map((m) => m.started)).toEqual([true, true, false]);
    expect(readiness.shakyBy['ら']).toEqual([1]);
  });

  it('should prefer a display name over the username', async () => {
    rosterIds = ['m1'];
    tables.profiles = [{ id: 'm1', username: 'ken', display_name: 'Ken T.' }];

    expect((await getGroupKnownKana('g1', 'org1')).members[0].name).toBe('Ken T.');
  });
});
