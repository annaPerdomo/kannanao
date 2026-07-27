import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GroupRow } from '@/components/Group/GroupRow';
import type { Group } from '@/hooks/useGroups';
import { renderWithProviders } from '@/test/renderWithProviders';

function group(overrides: Partial<Group> = {}): Group {
  return {
    id: 'g1',
    organizer_id: 'org1',
    name: 'Japanese Level 2',
    emoji: null,
    pinned: false,
    show_leaderboard: true,
    created_at: '2026-07-01T00:00:00Z',
    memberCount: 3,
    activeCount: 1,
    cardsStudied: 813,
    weeklyXp: 2140,
    faces: [
      { id: 'm1', name: 'Daisy' },
      { id: 'm2', name: 'Naomi' },
      { id: 'm3', name: 'Sora' },
    ],
    ...overrides,
  };
}

describe('GroupRow', () => {
  it('shows the name, cards studied and this week’s XP', () => {
    renderWithProviders(<GroupRow group={group()} onOpen={vi.fn()} />);

    expect(screen.getByText('Japanese Level 2')).toBeInTheDocument();
    expect(screen.getByText('813')).toBeInTheDocument();
    expect(screen.getByText('2,140')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
  });

  it('prefixes the emoji when the group has one', () => {
    renderWithProviders(<GroupRow group={group({ emoji: '🌸' })} onOpen={vi.fn()} />);
    expect(screen.getByText('🌸 Japanese Level 2')).toBeInTheDocument();
  });

  it('draws one initial per face and collapses the rest into +N', () => {
    renderWithProviders(<GroupRow group={group({ memberCount: 8 })} onOpen={vi.fn()} />);

    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('leaves out the overflow bubble when every member has a face', () => {
    renderWithProviders(<GroupRow group={group()} onOpen={vi.fn()} />);
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  // The live dot is a "someone is here right now" signal, so an idle group must
  // not show a green dot reading "0 active today".
  it('hides the live indicator when nobody has studied today', () => {
    renderWithProviders(<GroupRow group={group({ activeCount: 0 })} onOpen={vi.fn()} />);
    expect(screen.queryByText(/active today/)).not.toBeInTheDocument();
  });

  it('shows how many members studied today', () => {
    renderWithProviders(<GroupRow group={group({ activeCount: 2 })} onOpen={vi.fn()} />);
    expect(screen.getByText('2 active today')).toBeInTheDocument();
  });

  it('opens the group when the row is clicked', () => {
    const onOpen = vi.fn();
    renderWithProviders(<GroupRow group={group()} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button', { name: /Japanese Level 2/ }));
    expect(onOpen).toHaveBeenCalledWith('g1');
  });

  // The initials are decorative — the same names are already in the row's label,
  // and read aloud they would be a run of stray letters.
  it('names the row for screen readers without reading out the initials', () => {
    renderWithProviders(<GroupRow group={group()} onOpen={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Japanese Level 2 — 3 members, 813 cards studied' }),
    ).toBeInTheDocument();
  });

  // The visible label is the design's compact "813 cards"; only the accessible
  // name says what the number counts, so nothing is left implicit for a reader
  // who cannot see the row.
  it('says "cards studied" in the accessible name, not on screen', () => {
    renderWithProviders(<GroupRow group={group()} onOpen={vi.fn()} />);
    expect(screen.getByText('cards')).toBeInTheDocument();
    expect(screen.queryByText(/cards studied/)).not.toBeInTheDocument();
  });

  it('toggles the pin without opening the group', () => {
    const onOpen = vi.fn();
    const onPin = vi.fn();
    renderWithProviders(
      <GroupRow group={group({ pinned: false })} onOpen={onOpen} onPin={onPin} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pin to home' }));
    expect(onPin).toHaveBeenCalledWith('g1', true);
    expect(onOpen).not.toHaveBeenCalled();
  });

  // A group's pin decides whether it shows on the dashboard at all — the same
  // meaning a deck's or speech's pin carries, hence the same label.
  it('offers to unpin a group that is already pinned', () => {
    const onPin = vi.fn();
    renderWithProviders(
      <GroupRow group={group({ pinned: true })} onOpen={vi.fn()} onPin={onPin} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Unpin from home' }));
    expect(onPin).toHaveBeenCalledWith('g1', false);
  });

  it('leaves the pin out when no handler is given', () => {
    renderWithProviders(<GroupRow group={group()} onOpen={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /pin/i })).not.toBeInTheDocument();
  });
});
