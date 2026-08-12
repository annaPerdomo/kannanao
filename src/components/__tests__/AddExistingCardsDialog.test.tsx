import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AddExistingCardsDialog } from '@/components/AddExistingCardsDialog';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

const CARD: Flashcard = {
  id: 'c1',
  word: '桜',
  reading: 'さくら',
  meaning: 'cherry blossom',
  image_query: 'cherry blossom',
  example_jp: '',
  example_en: '',
  imageUrl: 'https://images.unsplash.com/photo-1?w=400#unsplash:name=Hu%20Chen',
  deckId: 'other-deck',
  mainViewMode: 'hiragana',
  cardType: 'word',
  position: 0,
};

vi.mock('@/lib/supabase', () => ({ loadAccessibleCards: vi.fn(async () => [CARD]) }));

vi.mock('@/services/api', () => ({
  decodeUnsplashAttribution: vi.fn((url: string) =>
    url.includes('#unsplash:')
      ? {
          name: 'Hu Chen',
          photographerUrl: 'https://unsplash.com/@huchenme',
          photoPageUrl: 'https://unsplash.com/photos/abc',
        }
      : null,
  ),
}));

function renderDialog() {
  return renderWithProviders(
    <AddExistingCardsDialog
      open
      onClose={vi.fn()}
      targetDeckId="target"
      userId="u1"
      onConfirm={vi.fn()}
    />,
  );
}

describe('AddExistingCardsDialog', () => {
  it('credits the photographer of a reusable card', async () => {
    renderDialog();
    expect(await screen.findByRole('link', { name: 'Hu Chen' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unsplash' })).toBeInTheDocument();
  });

  it('does not tick the card when the credit is followed', async () => {
    renderDialog();
    const credit = await screen.findByRole('link', { name: 'Hu Chen' });
    const checkbox = screen.getByRole('checkbox');

    fireEvent.click(credit);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(screen.getByText('桜'));
    await waitFor(() => expect(checkbox).toBeChecked());
  });
});
