import { describe, expect, it } from 'vitest';

import type { AssignmentBatch } from '../groupAssignments';
import { sectionBatches } from '../sectionBatches';

const TODAY = '2026-09-09';

function batch(overrides: Partial<AssignmentBatch> = {}): AssignmentBatch {
  return {
    key: 'k1',
    deckName: 'Animals',
    deckEmoji: '🐾',
    dueDate: null,
    availableOn: null,
    total: 2,
    completed: 0,
    finishedAt: null,
    ids: ['a1', 'a2'],
    sample: {} as AssignmentBatch['sample'],
    members: [],
    ...overrides,
  };
}

describe('sectionBatches', () => {
  it('puts a finished batch (completed === total) in finished', () => {
    const b = batch({ completed: 2, finishedAt: '2026-09-01T00:00:00Z' });
    const { finished, current, upcoming } = sectionBatches([b], TODAY);
    expect(finished).toEqual([b]);
    expect(current).toEqual([]);
    expect(upcoming).toEqual([]);
  });

  it('puts an unfinished batch with a future availableOn in upcoming', () => {
    const b = batch({ availableOn: '2026-09-10' });
    const { upcoming, current } = sectionBatches([b], TODAY);
    expect(upcoming).toEqual([b]);
    expect(current).toEqual([]);
  });

  it('treats an availableOn equal to today as current, not upcoming', () => {
    const b = batch({ availableOn: TODAY });
    const { upcoming, current } = sectionBatches([b], TODAY);
    expect(upcoming).toEqual([]);
    expect(current).toEqual([b]);
  });

  it('puts everything else unfinished in current', () => {
    const b = batch({ availableOn: null, dueDate: '2026-09-20' });
    const { current } = sectionBatches([b], TODAY);
    expect(current).toEqual([b]);
  });

  it('sorts upcoming by availableOn ascending', () => {
    const later = batch({ key: 'later', availableOn: '2026-10-01' });
    const sooner = batch({ key: 'sooner', availableOn: '2026-09-15' });
    const { upcoming } = sectionBatches([later, sooner], TODAY);
    expect(upcoming.map((x) => x.key)).toEqual(['sooner', 'later']);
  });

  it('sorts finished by finishedAt descending, with null last', () => {
    const oldest = batch({ key: 'oldest', completed: 2, finishedAt: '2026-08-01T00:00:00Z' });
    const newest = batch({ key: 'newest', completed: 2, finishedAt: '2026-09-05T00:00:00Z' });
    const noDate = batch({ key: 'no-date', completed: 2, finishedAt: null });
    const { finished } = sectionBatches([oldest, newest, noDate], TODAY);
    expect(finished.map((x) => x.key)).toEqual(['newest', 'oldest', 'no-date']);
  });

  it('keeps current in the order it arrived', () => {
    const a = batch({ key: 'a' });
    const b = batch({ key: 'b' });
    const { current } = sectionBatches([a, b], TODAY);
    expect(current.map((x) => x.key)).toEqual(['a', 'b']);
  });
});
