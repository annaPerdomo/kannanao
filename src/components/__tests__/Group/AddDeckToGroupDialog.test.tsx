import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AddDeckToGroupDialog } from '@/components/Group/AddDeckToGroupDialog';
import { renderWithProviders } from '@/test/renderWithProviders';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

let groups: { id: string; name: string; emoji: string | null; memberCount: number }[] = [];
let loading = false;
let error: Error | null = null;
vi.mock('@/hooks/useGroups', () => ({
  useGroups: () => ({
    groups,
    loading,
    error,
    errorMessage: error ? 'Could not load your groups.' : null,
  }),
}));

describe('AddDeckToGroupDialog', () => {
  beforeEach(() => {
    pushMock.mockClear();
    loading = false;
    error = null;
  });

  it('lists the organizer groups as rows', () => {
    groups = [
      { id: 'g1', name: 'Morning class', emoji: '🌸', memberCount: 3 },
      { id: 'g2', name: 'Evening class', emoji: null, memberCount: 1 },
    ];
    renderWithProviders(
      <AddDeckToGroupDialog open onClose={vi.fn()} deckId="d1" deckName="JLPT N5" />,
    );
    expect(screen.getByText('Morning class')).toBeInTheDocument();
    expect(screen.getByText('Evening class')).toBeInTheDocument();
  });

  it('navigates to the group with the assign param when a row is clicked', () => {
    groups = [{ id: 'g1', name: 'Morning class', emoji: '🌸', memberCount: 3 }];
    const onClose = vi.fn();
    renderWithProviders(
      <AddDeckToGroupDialog open onClose={onClose} deckId="d1" deckName="JLPT N5" />,
    );
    fireEvent.click(screen.getByText('Morning class'));
    expect(pushMock).toHaveBeenCalledWith('/group/g1?tab=lessons&assign=d1');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an empty state with a link to make a group when there are none', () => {
    groups = [];
    renderWithProviders(
      <AddDeckToGroupDialog open onClose={vi.fn()} deckId="d1" deckName="JLPT N5" />,
    );
    expect(
      screen.getByText('Make a group first, then you can hand this deck out.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Make a group' }));
    expect(pushMock).toHaveBeenCalledWith('/group');
  });

  it('shows an error alert instead of the empty state when groups fail to load', () => {
    groups = [];
    error = new Error('network down');
    renderWithProviders(
      <AddDeckToGroupDialog open onClose={vi.fn()} deckId="d1" deckName="JLPT N5" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your groups.');
    expect(
      screen.queryByText('Make a group first, then you can hand this deck out.'),
    ).not.toBeInTheDocument();
  });
});
