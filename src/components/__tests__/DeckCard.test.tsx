import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DeckCard } from '@/components/DeckCard';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Deck } from '@/types/deck';

// CardBorderContext is already mocked (empty border) in renderWithProviders

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'deck-1',
    name: 'JLPT N5',
    description: 'Basic vocabulary',
    createdAt: Date.now(),
    cardCount: 42,
    ownerId: 'user-1',
    isShared: false,
    emoji: '🌸',
    pinned: false,
    isPublic: false,
    ...overrides,
  };
}

describe('DeckCard', () => {
  it('should render the deck name', () => {
    const deck = makeDeck({ name: 'My Test Deck' });
    renderWithProviders(<DeckCard deck={deck} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('My Test Deck')).toBeInTheDocument();
  });

  it('should render the card count', () => {
    const deck = makeDeck({ cardCount: 42 });
    renderWithProviders(<DeckCard deck={deck} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/42 cards/)).toBeInTheDocument();
  });

  it('should call onOpen with deck id when card body is clicked', () => {
    const onOpen = vi.fn();
    const deck = makeDeck({ id: 'deck-xyz' });
    renderWithProviders(<DeckCard deck={deck} onOpen={onOpen} onDelete={vi.fn()} />);
    // Click the inner card area (has the deck name)
    fireEvent.click(screen.getByText('JLPT N5'));
    expect(onOpen).toHaveBeenCalledWith('deck-xyz');
  });

  it('should show pinned indicator when deck is pinned', () => {
    const deck = makeDeck({ pinned: true });
    const onPin = vi.fn();
    renderWithProviders(<DeckCard deck={deck} onOpen={vi.fn()} onDelete={vi.fn()} onPin={onPin} />);
    // MUI Tooltip renders title as aria-label on the wrapped button
    const pinButton = screen.getByRole('button', { name: 'Unpin from home' });
    expect(pinButton).toBeInTheDocument();
  });

  it('should show unpin option when deck is not pinned', () => {
    const deck = makeDeck({ pinned: false });
    renderWithProviders(
      <DeckCard deck={deck} onOpen={vi.fn()} onDelete={vi.fn()} onPin={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Pin to home' })).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    const deck = makeDeck({ id: 'deck-del' });
    renderWithProviders(<DeckCard deck={deck} onOpen={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete deck' }));
    expect(onDelete).toHaveBeenCalledWith('deck-del');
  });

  it('should show shared indicator when deck is shared', () => {
    const deck = makeDeck({ isShared: true });
    renderWithProviders(<DeckCard deck={deck} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/Shared/)).toBeInTheDocument();
  });

  it('should not show delete button when isOwner=false', () => {
    const deck = makeDeck();
    renderWithProviders(
      <DeckCard deck={deck} onOpen={vi.fn()} onDelete={vi.fn()} isOwner={false} />,
    );
    expect(screen.queryByRole('button', { name: 'Delete deck' })).not.toBeInTheDocument();
  });
});
