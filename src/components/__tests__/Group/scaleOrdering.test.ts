import { describe, expect, it } from 'vitest';

import { daysSinceActive } from '@/components/Group/memberActivity';
import { rankQuizRows } from '@/components/Group/QuizScoresPanel';
import type { QuizScoreRow } from '@/lib/quiz';

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

function row(name: string, attempts: number, accuracy: number | null): QuizScoreRow {
  return {
    memberId: name,
    name,
    attempts,
    best: accuracy === null ? null : { score: accuracy / 10, total: 10, accuracy },
    latest: null,
  };
}

describe('daysSinceActive', () => {
  it('treats a member who never studied as infinitely stale', () => {
    expect(daysSinceActive(null)).toBe(Infinity);
  });

  it('measures in days', () => {
    expect(Math.round(daysSinceActive(daysAgo(4)))).toBe(4);
  });
});

describe('rankQuizRows', () => {
  it('lists members who have not taken it first, then the lowest scores', () => {
    const ranked = rankQuizRows([
      row('Top', 2, 95),
      row('NotTaken', 0, null),
      row('Middle', 1, 70),
      row('Low', 3, 40),
    ]);
    expect(ranked.map((r) => r.name)).toEqual(['NotTaken', 'Low', 'Middle', 'Top']);
  });

  it('leaves the source rows alone', () => {
    const rows = [row('B', 1, 50), row('A', 0, null)];
    rankQuizRows(rows);
    expect(rows.map((r) => r.name)).toEqual(['B', 'A']);
  });
});
