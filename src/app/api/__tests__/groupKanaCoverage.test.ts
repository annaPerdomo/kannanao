import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

let progressRows: Row[] = [];
let rosterIds: string[] = [];

vi.mock('@/app/api/group/_lib/membership', () => ({
  memberIdsFor: () => Promise.resolve(rosterIds),
}));

vi.mock('@/app/api/group/_lib/serviceSupabase', () => ({
  getServiceSupabase: () => ({
    from() {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        range: () => chain,
        then: (ok: (r: { data: Row[]; error: null }) => unknown) =>
          Promise.resolve({ data: progressRows, error: null }).then(ok),
      };
      return chain;
    },
  }),
}));

import { getGroupKanaCoverage } from '@/app/api/group/_lib/groupKanaCoverage';

function progress(userId: string, kana: string, correct: number, wrong = 0): Row {
  return { user_id: userId, kana, correct_count: correct, wrong_count: wrong };
}

beforeEach(() => {
  progressRows = [];
  rosterIds = [];
});

describe('getGroupKanaCoverage', () => {
  it('should return nothing for an empty roster', async () => {
    expect(await getGroupKanaCoverage('g1', 'org1')).toEqual({
      learnerCount: 0,
      knownByKana: {},
    });
  });

  it('should count one learner per character, against the whole roster', async () => {
    rosterIds = ['m1', 'm2', 'm3'];
    progressRows = [progress('m1', 'あ', 6), progress('m2', 'あ', 6), progress('m3', 'い', 6)];

    expect(await getGroupKanaCoverage('g1', 'org1')).toEqual({
      learnerCount: 3,
      knownByKana: { あ: 2, い: 1 },
    });
  });

  it('should count only the characters a learner actually reads', async () => {
    rosterIds = ['m1'];
    // Same four-fifths bar as every other group-known read: 10/13 falls short.
    progressRows = [progress('m1', 'あ', 12, 3), progress('m1', 'い', 10, 3)];

    expect((await getGroupKanaCoverage('g1', 'org1')).knownByKana).toEqual({ あ: 1 });
  });

  it('should never carry a learner id into the printable coverage', async () => {
    rosterIds = ['m1'];
    progressRows = [progress('m1', 'あ', 6)];

    const coverage = await getGroupKanaCoverage('g1', 'org1');
    expect(JSON.stringify(coverage)).not.toContain('m1');
  });
});
