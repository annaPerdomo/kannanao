import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DeckHeader } from '@/components/Deck/DeckHeader';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Deck } from '@/types/deck';

vi.mock('@/components/Group/AddDeckToGroupDialog', () => ({
  AddDeckToGroupDialog: ({ open }: { open: boolean }) =>
    open ? <div>add-deck-to-group-dialog</div> : null,
}));

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'deck-1',
    name: 'JLPT N5',
    description: 'Basic vocabulary',
    createdAt: Date.now(),
    cardCount: 10,
    ownerId: 'user-1',
    isShared: false,
    emoji: '🌸',
    pinned: false,
    isPublic: false,
    position: 0,
    ...overrides,
  };
}

const baseProps = {
  cardCount: 10,
  onBack: vi.fn(),
  onRename: vi.fn(),
  onPin: vi.fn(),
  onSettingsOpen: vi.fn(),
  onEmojiChange: vi.fn(),
};

describe('DeckHeader — add to group', () => {
  it('renders no add-to-group button when canAddToGroup is omitted', () => {
    renderWithProviders(<DeckHeader deck={makeDeck()} {...baseProps} />);
    expect(screen.queryByRole('button', { name: 'Add deck to a group' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add to a group' })).not.toBeInTheDocument();
  });

  it('renders a labelled button (sm+) and an icon button (xs) when canAddToGroup is true', () => {
    renderWithProviders(<DeckHeader deck={makeDeck()} {...baseProps} canAddToGroup />);
    expect(screen.getByRole('button', { name: 'Add to a group' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add deck to a group' })).toBeInTheDocument();
  });

  it('opens the dialog when the add-to-group button is clicked', async () => {
    renderWithProviders(<DeckHeader deck={makeDeck()} {...baseProps} canAddToGroup />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to a group' }));
    expect(await screen.findByText('add-deck-to-group-dialog')).toBeInTheDocument();
  });
});
