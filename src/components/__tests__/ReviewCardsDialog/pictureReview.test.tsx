import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewCardsDialog } from '@/components/ReviewCardsDialog';
import type { PendingCard } from '@/components/ReviewCardsDialog/CardRow';
import { renderWithProviders } from '@/test/renderWithProviders';

const mockFetchImage = vi.fn();

vi.mock('@/services/api', () => ({
  fetchImage: (...args: unknown[]) => mockFetchImage(...args),
  uploadImage: vi.fn(),
  deleteStorageImage: vi.fn(),
  isStorageImage: vi.fn(() => false),
  encodeUnsplashUrl: vi.fn((r: { url: string }) => r.url),
  triggerUnsplashDownload: vi.fn(),
  formatFurigana: vi.fn(),
}));

/** A card that already lives in the deck, as the picture review hands it over. */
function savedCard(id: string, word: string): PendingCard {
  return {
    id,
    word,
    reading: '',
    romaji: '',
    meaning: 'meaning',
    image_query: 'cat',
    imageUrl: 'https://images.unsplash.com/first',
    example_jp: '',
    example_en: '',
    mainViewMode: 'kanji',
    cardType: 'word',
  };
}

function setup(overrides: Partial<React.ComponentProps<typeof ReviewCardsDialog>> = {}) {
  const onConfirm = vi.fn();
  renderWithProviders(
    <ReviewCardsDialog
      open
      cards={[savedCard('card-1', '猫'), savedCard('card-2', '犬')]}
      onConfirm={onConfirm}
      onClose={vi.fn()}
      title="🖼️ New pictures"
      subtitle="2 cards got pictures — try again on any you don't like"
      confirmLabel="Save pictures"
      allowRemove={false}
      {...overrides}
    />,
  );
  return { onConfirm };
}

beforeEach(() => vi.clearAllMocks());

describe('ReviewCardsDialog over saved cards', () => {
  it('promises to save rather than to add', () => {
    setup();

    expect(screen.getByText('🖼️ New pictures')).toBeInTheDocument();
    expect(
      screen.getByText("2 cards got pictures — try again on any you don't like"),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save pictures/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add .* to Deck/ })).not.toBeInTheDocument();
  });

  it('keeps the deck ids so the confirm can write the edits back', () => {
    const { onConfirm } = setup();

    fireEvent.click(screen.getByRole('button', { name: /Save pictures/ }));

    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'card-1' }),
      expect.objectContaining({ id: 'card-2' }),
    ]);
  });

  it('carries a redone picture through to the confirm', async () => {
    mockFetchImage.mockResolvedValue({
      url: 'https://images.unsplash.com/second',
      downloadLocation: 'https://api.unsplash.com/photos/x/download',
      photographerName: 'Jane',
      photographerUrl: 'https://unsplash.com/@jane',
      photoPageUrl: 'https://unsplash.com/photos/x',
    });
    const { onConfirm } = setup();

    fireEvent.click(screen.getAllByLabelText('Fetch from Unsplash')[0]);
    await screen.findByRole('button', { name: /Save pictures/ });
    fireEvent.click(screen.getByRole('button', { name: /Save pictures/ }));

    expect(onConfirm).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'card-1', imageUrl: 'https://images.unsplash.com/second' }),
      expect.objectContaining({ id: 'card-2', imageUrl: 'https://images.unsplash.com/first' }),
    ]);
  });

  // The trash icon means "don't add this card", which can't be true of a card
  // that is already in the deck — it removed the row and saved nothing.
  it('offers no way to drop a card that is already in the deck', () => {
    setup();

    expect(screen.queryByLabelText('Remove card')).not.toBeInTheDocument();
  });

  it('still offers to drop a card while the cards are only pending', () => {
    setup({ allowRemove: true });

    expect(screen.getAllByLabelText('Remove card')).toHaveLength(2);
  });

  it('clears a picture through to the confirm', () => {
    const { onConfirm } = setup();

    fireEvent.click(screen.getAllByLabelText('Remove image')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Save pictures/ }));

    expect(onConfirm.mock.calls[0][0][0].imageUrl).toBeUndefined();
  });

  it('locks the dialog while the save is in flight', () => {
    setup({ saving: true });

    expect(screen.getByRole('button', { name: /Save pictures/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('says so when the save failed', () => {
    setup({ saveError: "Those changes didn't save. Please try again." });

    expect(screen.getByRole('alert')).toHaveTextContent("Those changes didn't save");
  });
});
