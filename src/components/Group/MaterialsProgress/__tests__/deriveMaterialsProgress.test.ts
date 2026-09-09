import { describe, expect, it } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
import type { Deck } from '@/types/deck';

import { deriveMaterialsProgress } from '../deriveMaterialsProgress';

const TODAY = '2026-09-09';

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    organizer_id: 'org1',
    member_id: 'm1',
    deck_id: 'd1',
    kana_set: null,
    title: null,
    note: null,
    due_date: null,
    available_on: null,
    completed_at: null,
    created_at: '2026-07-01T00:00:00Z',
    required_accuracy: null,
    required_mode: null,
    progress_accuracy: null,
    decks: { id: 'd1', name: 'Animals', emoji: '🐾' },
    profiles: { display_name: 'Mika', username: 'mika' },
    ...overrides,
  };
}

function deck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd1',
    name: 'Animals',
    createdAt: 0,
    cardCount: 10,
    ownerId: 'org1',
    emoji: '🐾',
    position: 0,
    ...overrides,
  };
}

describe('deriveMaterialsProgress', () => {
  it('counts finished, current, and upcoming batches', () => {
    const assignments = [
      assignment({ id: 'a1', deck_id: 'd1', completed_at: '2026-09-01T00:00:00Z' }),
      assignment({ id: 'a2', deck_id: 'd2', completed_at: null }),
      assignment({
        id: 'a3',
        deck_id: 'd3',
        completed_at: null,
        available_on: '2026-09-20',
      }),
    ];
    const progress = deriveMaterialsProgress({ assignments, ownDecks: [], today: TODAY });
    expect(progress.finishedCount).toBe(1);
    expect(progress.currentCount).toBe(1);
    expect(progress.upcomingCount).toBe(1);
  });

  it('nextDue picks the unfinished batch with the nearest deadline and ignores no-deadline batches', () => {
    const assignments = [
      assignment({
        id: 'a1',
        deck_id: 'd1',
        due_date: '2026-09-30',
        completed_at: null,
        decks: { id: 'd1', name: 'Far Deck', emoji: null },
      }),
      assignment({
        id: 'a2',
        deck_id: 'd2',
        due_date: '2026-09-15',
        completed_at: null,
        decks: { id: 'd2', name: 'Near Deck', emoji: null },
      }),
      assignment({ id: 'a3', deck_id: 'd3', due_date: null, completed_at: null }),
    ];
    const progress = deriveMaterialsProgress({ assignments, ownDecks: [], today: TODAY });
    expect(progress.nextDue?.deckName).toBe('Near Deck');
    expect(progress.nextDue?.dueDate).toBe('2026-09-15');
  });

  it('nextDue is null when no current batch has a deadline', () => {
    const assignments = [
      assignment({ id: 'a1', deck_id: 'd1', due_date: null, completed_at: null }),
    ];
    const progress = deriveMaterialsProgress({ assignments, ownDecks: [], today: TODAY });
    expect(progress.nextDue).toBeNull();
  });

  it('recentlyFinished is ordered newest-first and capped at 3', () => {
    const assignments = [
      assignment({ id: 'a1', deck_id: 'd1', completed_at: '2026-09-01T00:00:00Z' }),
      assignment({ id: 'a2', deck_id: 'd2', completed_at: '2026-09-05T00:00:00Z' }),
      assignment({ id: 'a3', deck_id: 'd3', completed_at: '2026-09-03T00:00:00Z' }),
      assignment({ id: 'a4', deck_id: 'd4', completed_at: '2026-09-08T00:00:00Z' }),
    ];
    const progress = deriveMaterialsProgress({ assignments, ownDecks: [], today: TODAY });
    expect(progress.recentlyFinished).toHaveLength(3);
    expect(progress.recentlyFinished.map((b) => b.finishedAt)).toEqual([
      '2026-09-08T00:00:00Z',
      '2026-09-05T00:00:00Z',
      '2026-09-03T00:00:00Z',
    ]);
  });

  it('notHandedOut excludes decks with any assignment and ignores kana rows', () => {
    const ownDecks = [
      deck({ id: 'd1' }),
      deck({ id: 'd2', name: 'Verbs' }),
      deck({ id: 'd3', name: 'Colors' }),
    ];
    const assignments = [
      assignment({ id: 'a1', deck_id: 'd1' }),
      assignment({ id: 'a2', deck_id: null, kana_set: 'hira-ka' }),
    ];
    const progress = deriveMaterialsProgress({ assignments, ownDecks, today: TODAY });
    expect(progress.notHandedOut.map((d) => d.id)).toEqual(['d2', 'd3']);
  });
});
