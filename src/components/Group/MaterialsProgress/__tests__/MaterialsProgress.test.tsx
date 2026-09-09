import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Deck } from '@/types/deck';

import { MaterialsProgress } from '..';

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

function renderCard(props: Partial<Parameters<typeof MaterialsProgress>[0]> = {}) {
  const onViewAssignments = vi.fn();
  const onAssignDeck = vi.fn();
  const onOpenMaterials = vi.fn();
  renderWithProviders(
    <MaterialsProgress
      assignments={[]}
      loading={false}
      error={null}
      ownDecks={[]}
      canAssign
      onViewAssignments={onViewAssignments}
      onAssignDeck={onAssignDeck}
      onOpenMaterials={onOpenMaterials}
      {...props}
    />,
  );
  return { onViewAssignments, onAssignDeck, onOpenMaterials };
}

describe('MaterialsProgress', () => {
  it('hides Assign when the group has no learners', () => {
    renderCard({ ownDecks: [deck({ id: 'd2', name: 'Colors' })], canAssign: false });
    expect(screen.getByText(/Colors/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /assign colors/i })).not.toBeInTheDocument();
  });

  it('renders the three counts', () => {
    const assignments = [
      assignment({ id: 'a1', deck_id: 'd1', completed_at: '2026-09-01T00:00:00Z' }),
      assignment({ id: 'a2', deck_id: 'd2', completed_at: null }),
    ];
    renderCard({ assignments });
    expect(screen.getByText('Finished')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Coming up')).toBeInTheDocument();
  });

  it('clicking Assign calls onAssignDeck with the deck id', () => {
    const notHandedOutDeck = deck({ id: 'd2', name: 'Verbs' });
    const { onAssignDeck } = renderCard({
      assignments: [assignment({ id: 'a1', deck_id: 'd1' })],
      ownDecks: [deck({ id: 'd1' }), notHandedOutDeck],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Assign Verbs' }));
    expect(onAssignDeck).toHaveBeenCalledWith('d2');
  });

  it('footer buttons call their handlers', () => {
    const { onViewAssignments, onOpenMaterials } = renderCard({
      assignments: [assignment()],
    });
    fireEvent.click(screen.getByText('See all assignments'));
    expect(onViewAssignments).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Make new materials'));
    expect(onOpenMaterials).toHaveBeenCalled();
  });

  it('shows the empty hint with no data', () => {
    renderCard();
    expect(screen.getByText('Make a deck, then hand it out here.')).toBeInTheDocument();
  });
});
