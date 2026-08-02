import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const mockSetDeckPublic = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/supabase', () => ({
  dbSetDeckPublic: (...args: unknown[]) => mockSetDeckPublic(...args),
}));

import { DeckSettingsDialog } from '@/components/DeckSettingsDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof DeckSettingsDialog>> = {}) {
  const onReadingChange = vi.fn();
  const onPublicChange = vi.fn();
  const onCardViewModeChange = vi.fn().mockResolvedValue(undefined);
  renderWithProviders(
    <DeckSettingsDialog
      open
      onClose={vi.fn()}
      deckId="deck-1"
      deckName="Kanji Starter"
      isPublic={false}
      onPublicChange={onPublicChange}
      readingUnlocked={false}
      readingCardCount={6}
      onReadingChange={onReadingChange}
      cardViewMode="hiragana"
      cardCount={12}
      onCardViewModeChange={onCardViewModeChange}
      {...props}
    />,
  );
  return { onReadingChange, onPublicChange, onCardViewModeChange };
}

describe('DeckSettingsDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gathers both deck switches under one title', () => {
    renderDialog();

    expect(screen.getByText('Deck settings')).toBeInTheDocument();
    expect(screen.getByText('Kanji Starter')).toBeInTheDocument();
    expect(screen.getByLabelText('Kanji reading practice for this deck')).toBeInTheDocument();
    expect(screen.getByLabelText('Public embedding')).toBeInTheDocument();
  });

  it('unlocks reading practice', () => {
    const { onReadingChange } = renderDialog();

    fireEvent.click(screen.getByLabelText('Kanji reading practice for this deck'));

    expect(onReadingChange).toHaveBeenCalledWith(true);
  });

  it('locks reading practice again', () => {
    const { onReadingChange } = renderDialog({ readingUnlocked: true });

    fireEvent.click(screen.getByLabelText('Kanji reading practice for this deck'));

    expect(onReadingChange).toHaveBeenCalledWith(false);
  });

  it('disables the reading switch when no card carries kanji', () => {
    renderDialog({ readingCardCount: 0 });

    expect(screen.getByLabelText('Kanji reading practice for this deck')).toBeDisabled();
    expect(screen.getByText('This deck has no kanji words yet')).toBeInTheDocument();
  });

  it('changes every card to the picked view mode', async () => {
    const { onCardViewModeChange } = renderDialog();

    expect(screen.getByText('All 12 cards start with ひらがな')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '漢字' }));

    expect(onCardViewModeChange).toHaveBeenCalledWith('kanji');
    expect(await screen.findByText('Done — every card in this deck changed')).toBeInTheDocument();
  });

  it('tells the owner when the deck mixes view modes', () => {
    renderDialog({ cardViewMode: null });

    expect(
      screen.getByText('These cards use a mix — pick one to change them all'),
    ).toBeInTheDocument();
  });

  it('surfaces a failed view mode change', async () => {
    const onCardViewModeChange = vi.fn().mockRejectedValue(new Error('nope'));
    renderDialog({ onCardViewModeChange });

    fireEvent.click(screen.getByRole('button', { name: '漢字' }));

    expect(
      await screen.findByText("Those cards didn't change. Please try again."),
    ).toBeInTheDocument();
  });

  it('disables the view mode picker for an empty deck', () => {
    renderDialog({ cardCount: 0, cardViewMode: null });

    expect(screen.getByRole('button', { name: '漢字' })).toBeDisabled();
    expect(screen.getByText('Add some cards first, then pick what they show')).toBeInTheDocument();
  });

  it('still shares and embeds the deck', async () => {
    const { onPublicChange } = renderDialog();

    fireEvent.click(screen.getByLabelText('Public embedding'));

    await waitFor(() => expect(mockSetDeckPublic).toHaveBeenCalledWith('deck-1', true));
    expect(onPublicChange).toHaveBeenCalledWith(true);
  });

  it('shows the embed snippet only once the deck is public', () => {
    renderDialog({ isPublic: true });

    expect(screen.getByText(/<iframe/)).toBeInTheDocument();
    expect(screen.getByText('Canvas embed code')).toBeInTheDocument();
  });
});
