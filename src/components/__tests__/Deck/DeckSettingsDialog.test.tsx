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
      {...props}
    />,
  );
  return { onReadingChange, onPublicChange };
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
