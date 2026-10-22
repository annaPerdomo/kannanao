import { describe, expect, it } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
import { completedWithinDays, priorityDeckIds } from '@/lib/reviewPriority';

const TODAY = '2026-09-08';

const assignment = (overrides: Partial<Assignment> = {}): Assignment =>
  ({
    id: 'a1',
    deck_id: 'd1',
    kana_set: null,
    completed_at: null,
    available_on: null,
    created_at: '2026-09-01T00:00:00Z',
    ...overrides,
  }) as Assignment;

describe('completedWithinDays', () => {
  it('is true for a lesson completed today', () => {
    expect(completedWithinDays(`${TODAY}T10:00:00Z`, TODAY, 7)).toBe(true);
  });

  it('is true exactly at the 7-day boundary', () => {
    // Noon UTC so the local-timezone conversion can't shift it a day either way.
    expect(completedWithinDays('2026-09-01T12:00:00Z', TODAY, 7)).toBe(true);
  });

  it('is false once it has been 8 days', () => {
    expect(completedWithinDays('2026-08-31T12:00:00Z', TODAY, 7)).toBe(false);
  });

  it('is false for an unparsable date', () => {
    expect(completedWithinDays('not-a-date', TODAY, 7)).toBe(false);
  });
});

describe('priorityDeckIds', () => {
  it('includes every open, available assignment deck', () => {
    const ids = priorityDeckIds(
      [assignment({ deck_id: 'd1' }), assignment({ id: 'a2', deck_id: 'd2' })],
      TODAY,
    );
    expect(ids).toContain('d1');
    expect(ids).toContain('d2');
  });

  it('excludes an assignment that has not started yet', () => {
    const ids = priorityDeckIds([assignment({ available_on: '2026-09-09' })], TODAY);
    expect(ids).not.toContain('d1');
  });

  it('keeps the newest assignment even once completed, within 7 days', () => {
    const ids = priorityDeckIds(
      [
        assignment({
          deck_id: 'd1',
          completed_at: `${TODAY}T10:00:00Z`,
          created_at: '2026-09-05T12:00:00Z',
        }),
      ],
      TODAY,
    );
    expect(ids).toContain('d1');
  });

  it('drops the newest assignment once completed more than 7 days ago', () => {
    const ids = priorityDeckIds(
      [
        assignment({
          deck_id: 'd1',
          completed_at: '2026-08-31T12:00:00Z',
          created_at: '2026-08-20T12:00:00Z',
        }),
      ],
      TODAY,
    );
    expect(ids).not.toContain('d1');
  });
});
