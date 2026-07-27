import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DeckTile } from '@/components/DeckCard';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Deck } from '@/types/deck';

vi.mock('@/components/LazyEmojiPicker', () => ({
  default: () => null,
  Theme: { LIGHT: 'light' },
}));

function deck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd1',
    ownerId: 'u1',
    name: 'Test',
    description: 'The first attempt',
    emoji: '🥰',
    cardCount: 37,
    pinned: true,
    isPublic: false,
    createdAt: 0,
    ...overrides,
  } as Deck;
}

describe('DeckTile', () => {
  it('shows the deck face and its card count', () => {
    renderWithProviders(<DeckTile deck={deck()} onOpen={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('The first attempt')).toBeInTheDocument();
    expect(screen.getByText('🥰')).toBeInTheDocument();
    expect(screen.getByText('37')).toBeInTheDocument();
  });

  // XP is the deck's worth at ten a card — the same number the collectible
  // card's top bar shows, so a deck cannot be worth two different amounts.
  it('prices the deck at ten XP a card', () => {
    renderWithProviders(<DeckTile deck={deck()} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('XP 370')).toBeInTheDocument();
  });

  it('opens the deck from the face', () => {
    const onOpen = vi.fn();
    renderWithProviders(<DeckTile deck={deck()} onOpen={onOpen} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open deck: Test' }));
    expect(onOpen).toHaveBeenCalledWith('d1');
  });

  // Every control sits inside the tile whose face is itself a button, so each
  // one has to stop the click from also opening the deck.
  it('runs a control without opening the deck', () => {
    const onOpen = vi.fn();
    const onPin = vi.fn();
    renderWithProviders(
      <DeckTile deck={deck()} onOpen={onOpen} onDelete={vi.fn()} onPin={onPin} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Unpin from home' }));
    expect(onPin).toHaveBeenCalledWith('d1', false);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('hides the owner-only controls for a deck you do not own', () => {
    renderWithProviders(
      <DeckTile
        deck={deck()}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onShare={vi.fn()}
        isOwner={false}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Delete deck' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share deck' })).not.toBeInTheDocument();
  });
});
