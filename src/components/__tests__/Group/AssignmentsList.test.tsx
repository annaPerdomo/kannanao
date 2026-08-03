import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AssignmentsList, groupAssignments } from '@/components/Group/AssignmentsList';
import type { Assignment } from '@/hooks/useAssignments';
import { renderWithProviders } from '@/test/renderWithProviders';

const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    organizer_id: 'org1',
    member_id: 'm1',
    deck_id: 'd1',
    title: null,
    note: null,
    due_date: null,
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

function render(
  assignments: Assignment[],
  maxVisible?: number,
  onDeleteBatch = vi.fn().mockResolvedValue(undefined),
) {
  renderWithProviders(
    <AssignmentsList
      assignments={assignments}
      onEditBatch={vi.fn().mockResolvedValue(undefined)}
      onDeleteBatch={onDeleteBatch}
      maxVisible={maxVisible}
    />,
  );
  return onDeleteBatch;
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

  it('collapses to the cap by batch, not by member', () => {
    render(
      [
        ...handout(10),
        ...handout(10, { deck_id: 'd2' }).map((a) => ({
          ...a,
          decks: { id: 'd2', name: 'Verbs', emoji: '📘' },
        })),
      ],
      1,
    );
    expect(screen.getByRole('button', { name: 'Show all 2' })).toBeInTheDocument();
    expect(screen.queryByText('Verbs')).not.toBeInTheDocument();
  });

  it('badges an overdue handout instead of repeating its date', () => {
    render(handout(2, { due_date: iso(-2) }));
    expect(screen.getByText('Overdue by 2d')).toBeInTheDocument();
  });

  it('shows the plain due date when the deadline is not urgent', () => {
    render(handout(2, { due_date: iso(10) }));
    expect(screen.getByText(/^Due /)).toBeInTheDocument();
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
    render(handout(3), undefined, onDeleteBatch);
    fireEvent.click(screen.getByRole('button', { name: /Remove assignment/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Removed for 1 of 3 members')).toBeInTheDocument();
    expect(screen.getByText(/will be removed for all 3 members/i)).toBeInTheDocument();
  });
});
