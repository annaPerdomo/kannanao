import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AssignmentsList, groupAssignments } from '@/components/Group/AssignmentsList';
import type { Assignment } from '@/hooks/useAssignments';
import type { GroupMember } from '@/hooks/useGroup';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('@/hooks/useDeckWords', () => ({
  useDeckWords: () => ({ words: [], loading: false, error: null }),
}));

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

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

/** The same deck and deadline handed to `count` different members. */
function handout(count: number, overrides: Partial<Assignment> = {}): Assignment[] {
  return Array.from({ length: count }, (_, i) =>
    assignment({ id: `${overrides.deck_id ?? 'd1'}-${i}`, member_id: `m${i}`, ...overrides }),
  );
}

function render(assignments: Assignment[], onDeleteBatch = vi.fn().mockResolvedValue(undefined)) {
  renderWithProviders(
    <AssignmentsList
      assignments={assignments}
      onEditBatch={vi.fn().mockResolvedValue(undefined)}
      onDeleteBatch={onDeleteBatch}
    />,
  );
  return onDeleteBatch;
}

function groupMember(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: 'm1',
    username: 'mika',
    displayName: 'Mika',
    createdAt: '2026-07-01T00:00:00Z',
    level: 1,
    totalXp: 0,
    streakDays: 0,
    totalCardsStudied: 0,
    totalCorrect: 0,
    totalSessions: 0,
    lastActive: null,
    lastNudgedAt: null,
    masteryLearning: 0,
    masteryStrong: 0,
    reviewsWaiting: null,
    reviewsOverdue3d: null,
    ...overrides,
  } as GroupMember;
}

function renderWithRoster(
  assignments: Assignment[],
  members: GroupMember[],
  onAssignMissing = vi.fn(),
) {
  renderWithProviders(
    <AssignmentsList
      assignments={assignments}
      onEditBatch={vi.fn().mockResolvedValue(undefined)}
      onDeleteBatch={vi.fn().mockResolvedValue(undefined)}
      members={members}
      onAssignMissing={onAssignMissing}
    />,
  );
  return onAssignMissing;
}

describe('groupAssignments', () => {
  it('collapses one deck handed to many members into a single batch', () => {
    const batches = groupAssignments(handout(6));
    expect(batches).toHaveLength(1);
    expect(batches[0].total).toBe(6);
    expect(batches[0].ids).toHaveLength(6);
  });

  it('counts how many members finished', () => {
    const [done, ...rest] = handout(4);
    const batches = groupAssignments([{ ...done, completed_at: iso(-1) }, ...rest]);
    expect(batches[0].completed).toBe(1);
    expect(batches[0].total).toBe(4);
  });

  it('keeps the same deck on two deadlines apart', () => {
    const batches = groupAssignments([
      ...handout(2, { due_date: iso(2) }),
      ...handout(2, { due_date: iso(9) }),
    ]);
    expect(batches).toHaveLength(2);
  });

  // A batch edit stamps one set of values onto every id in the batch, so two
  // handouts with different goals must never share one.
  it('keeps handouts with different goals apart', () => {
    const batches = groupAssignments([
      assignment({ id: 'g1', member_id: 'm1', required_accuracy: 80 }),
      assignment({ id: 'g2', member_id: 'm2' }),
    ]);
    expect(batches).toHaveLength(2);
  });

  // The edit dialog seeds from one copy and writes to every id, so a note the
  // batch doesn't share would be silently stamped onto members who never got it.
  it('keeps handouts with different notes apart', () => {
    const batches = groupAssignments([
      assignment({ id: 'n1', member_id: 'm1', note: 'review chapter 2' }),
      assignment({ id: 'n2', member_id: 'm2' }),
    ]);
    expect(batches).toHaveLength(2);
  });

  it('keeps handouts with different titles apart', () => {
    const batches = groupAssignments([
      assignment({ id: 't1', member_id: 'm1', title: 'Warm-up' }),
      assignment({ id: 't2', member_id: 'm2' }),
    ]);
    expect(batches).toHaveLength(2);
  });

  // A finished batch at the top would push live work below the fold.
  it('puts unfinished batches first, then the nearest deadline', () => {
    const finished = handout(1, { deck_id: 'd-done', due_date: iso(1) }).map((a) => ({
      ...a,
      completed_at: iso(-1),
      decks: { id: 'd-done', name: 'Done', emoji: '✅' },
    }));
    const later = handout(1, { deck_id: 'd-later', due_date: iso(9) }).map((a) => ({
      ...a,
      decks: { id: 'd-later', name: 'Later', emoji: '📗' },
    }));
    const sooner = handout(1, { deck_id: 'd-soon', due_date: iso(2) }).map((a) => ({
      ...a,
      decks: { id: 'd-soon', name: 'Soon', emoji: '📘' },
    }));

    expect(groupAssignments([...finished, ...later, ...sooner]).map((b) => b.deckName)).toEqual([
      'Soon',
      'Later',
      'Done',
    ]);
  });

  it('sets finishedAt to the latest completed_at once every member is done', () => {
    const [first, second] = handout(2);
    const secondCompletedAt = iso(-1);
    const batches = groupAssignments([
      { ...first, completed_at: iso(-3) },
      { ...second, completed_at: secondCompletedAt },
    ]);
    expect(batches[0].finishedAt).toBe(secondCompletedAt);
  });

  it('leaves finishedAt null while any member is unfinished', () => {
    const [done, ...rest] = handout(3);
    const batches = groupAssignments([{ ...done, completed_at: iso(-1) }, ...rest]);
    expect(batches[0].finishedAt).toBeNull();
  });
});

describe('AssignmentsList', () => {
  it('shows the empty state when there is nothing assigned', () => {
    render([]);
    expect(screen.getByText(/No assignments yet/i)).toBeInTheDocument();
  });

  it('shows one row per handout with its completion count', () => {
    const [done, ...rest] = handout(4);
    render([{ ...done, completed_at: iso(-1) }, ...rest]);
    expect(screen.getAllByText('Animals')).toHaveLength(1);
    expect(screen.getByText('1/4 done')).toBeInTheDocument();
  });

  it('renders one row per handout, not one per member', () => {
    render([
      ...handout(10),
      ...handout(10, { deck_id: 'd2' }).map((a) => ({
        ...a,
        decks: { id: 'd2', name: 'Verbs', emoji: '📘' },
      })),
    ]);
    expect(screen.getAllByText('Animals')).toHaveLength(1);
    expect(screen.getAllByText('Verbs')).toHaveLength(1);
  });

  it('badges an overdue handout instead of repeating its date', () => {
    render(handout(2, { due_date: iso(-2) }));
    expect(screen.getByText('Overdue by 2d')).toBeInTheDocument();
  });

  it('shows the plain due date when the deadline is not urgent', () => {
    render(handout(2, { due_date: iso(10) }));
    expect(screen.getByText(/^Due /)).toBeInTheDocument();
  });

  // A future start date is the organizer's cue that the learner cannot see it yet.
  it('labels a handout that has not started for the learner', () => {
    render(handout(2, { due_date: iso(30), available_on: iso(23) }));
    expect(screen.getByText(/^Starts /)).toBeInTheDocument();
  });

  it('does not label a handout that has already started', () => {
    render(handout(2, { due_date: iso(10), available_on: iso(-3) }));
    expect(screen.queryByText(/^Starts /)).not.toBeInTheDocument();
  });

  // Removing a batch removes it for everyone, so it asks first.
  it('confirms before removing every copy of a handout', async () => {
    const onDeleteBatch = render(handout(3));
    fireEvent.click(screen.getByRole('button', { name: /Remove assignment/i }));
    expect(onDeleteBatch).not.toHaveBeenCalled();

    expect(screen.getByText(/will be removed for all 3 members/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDeleteBatch).toHaveBeenCalledTimes(1);
    expect(onDeleteBatch).toHaveBeenCalledWith(['d1-0', 'd1-1', 'd1-2']);
    await waitFor(() =>
      expect(screen.queryByText(/will be removed for all 3 members/i)).not.toBeInTheDocument(),
    );
  });

  it('keeps the confirm dialog open and shows the error when removal fails', async () => {
    const onDeleteBatch = vi.fn().mockRejectedValue(new Error('Removed for 1 of 3 members'));
    render(handout(3), onDeleteBatch);
    fireEvent.click(screen.getByRole('button', { name: /Remove assignment/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Removed for 1 of 3 members')).toBeInTheDocument();
    expect(screen.getByText(/will be removed for all 3 members/i)).toBeInTheDocument();
  });

  it('collapses finished handouts to 3 with a Show all button, expanding on click', () => {
    const finished = Array.from(
      { length: 5 },
      (_, i) =>
        handout(1, {
          deck_id: `d${i}`,
          completed_at: iso(-1),
        }).map((a) => ({ ...a, decks: { id: `d${i}`, name: `Deck ${i}`, emoji: '📗' } }))[0],
    );
    render(finished);

    expect(screen.getByText('Finished · 5')).toBeInTheDocument();
    expect(screen.getAllByText(/^Deck \d$/)).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: /Show all 5/i }));
    expect(screen.getAllByText(/^Deck \d$/)).toHaveLength(5);
  });

  it('shows section headings with counts for in-progress and upcoming handouts', () => {
    render([
      ...handout(2, { due_date: iso(5) }),
      ...handout(2, { deck_id: 'd2', available_on: iso(10) }).map((a) => ({
        ...a,
        decks: { id: 'd2', name: 'Verbs', emoji: '📘' },
      })),
    ]);

    expect(screen.getByText('In progress · 1')).toBeInTheDocument();
    expect(screen.getByText('Coming up · 1')).toBeInTheDocument();
  });

  it('shows the nothing-in-progress hint when only finished batches exist', () => {
    render(handout(2, { completed_at: iso(-1) }));
    expect(screen.getByText('In progress · 0')).toBeInTheDocument();
    expect(screen.getByText('Nothing in progress right now.')).toBeInTheDocument();
  });

  it('flags learners who never got a handout and hands it to them in one tap', () => {
    const roster = [
      groupMember({ id: 'm0' }),
      groupMember({ id: 'm1' }),
      groupMember({ id: 'extra1', displayName: 'Extra One' }),
      groupMember({ id: 'extra2', displayName: 'Extra Two' }),
    ];
    const onAssignMissing = renderWithRoster(handout(2), roster);

    expect(screen.getByText('2 learners never got this')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Give Animals to the 2 learners who never got it' }),
    );
    expect(onAssignMissing).toHaveBeenCalledTimes(1);
    const [calledBatch, calledIds] = onAssignMissing.mock.calls[0];
    expect(calledBatch.deckName).toBe('Animals');
    expect(calledIds.sort()).toEqual(['extra1', 'extra2']);
  });

  it('counts missing learners next to a finished handout', () => {
    const roster = [
      groupMember({ id: 'm0' }),
      groupMember({ id: 'm1' }),
      groupMember({ id: 'late' }),
    ];
    renderWithRoster(handout(2, { completed_at: iso(-1) }), roster);

    expect(screen.getByText('2/2 done · 1 missing')).toBeInTheDocument();
  });

  it('does not flag a learner who holds the deck under another deadline', () => {
    const roster = [groupMember({ id: 'm0' }), groupMember({ id: 'm1' })];
    const later = assignment({ id: 'later', member_id: 'm1', due_date: iso(9) });
    renderWithRoster([assignment({ id: 'a0', member_id: 'm0' }), later], roster);

    expect(screen.queryByText(/never got this/i)).not.toBeInTheDocument();
  });

  it('does not flag missing learners on a scheduled handout', () => {
    const roster = [groupMember({ id: 'm0' }), groupMember({ id: 'extra' })];
    renderWithRoster(handout(1, { available_on: iso(1) }), roster);
    expect(screen.queryByText(/never got this/i)).not.toBeInTheDocument();
  });

  it('lists the missing members inside the expanded member list', () => {
    const roster = [groupMember({ id: 'm0' }), groupMember({ id: 'extra', displayName: 'Extra' })];
    renderWithRoster(handout(1), roster);
    fireEvent.click(screen.getByRole('button', { name: /Show who's done/i }));
    expect(screen.getByText('Extra')).toBeInTheDocument();
    expect(screen.getByText('never got this')).toBeInTheDocument();
  });

  it('opens the handout detail dialog when the deck name is clicked', () => {
    render(handout(2));
    fireEvent.click(screen.getByRole('button', { name: "See what's in Animals" }));
    expect(screen.getByText('🐾 Animals')).toBeInTheDocument();
  });
});
