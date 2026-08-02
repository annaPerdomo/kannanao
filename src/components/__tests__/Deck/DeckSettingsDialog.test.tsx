import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ApiModule from '@/services/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

const mockSetDeckPublic = vi.fn().mockResolvedValue(undefined);
const mockFetchImagesBatch = vi.fn();

vi.mock('@/lib/supabase', () => ({
  dbSetDeckPublic: (...args: unknown[]) => mockSetDeckPublic(...args),
}));

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  fetchImagesBatch: (...args: unknown[]) => mockFetchImagesBatch(...args),
}));

import { DeckSettingsDialog } from '@/components/DeckSettingsDialog';

function makeCards(count: number, overrides: Partial<Flashcard> = {}): Flashcard[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `card-${i}`,
    word: `語${i}`,
    reading: 'ご',
    meaning: `meaning ${i}`,
    image_query: `query ${i}`,
    imageUrl: 'https://images.unsplash.com/photo',
    example_jp: '',
    example_en: '',
    deckId: 'deck-1',
    mainViewMode: 'hiragana' as const,
    cardType: 'word' as const,
    position: i,
    ...overrides,
  }));
}

function renderDialog(props: Partial<React.ComponentProps<typeof DeckSettingsDialog>> = {}) {
  const onReadingChange = vi.fn();
  const onPublicChange = vi.fn();
  const onCardViewModeChange = vi.fn().mockResolvedValue(undefined);
  const onUpdateCard = vi.fn().mockResolvedValue(null);
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
      cards={makeCards(12)}
      onCardViewModeChange={onCardViewModeChange}
      onUpdateCard={onUpdateCard}
      {...props}
    />,
  );
  return { onReadingChange, onPublicChange, onCardViewModeChange, onUpdateCard };
}

/** The pictures live in a dialog of their own, so picture tests open it first. */
function openPicker() {
  fireEvent.click(screen.getByRole('button', { name: 'Choose pictures' }));
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
    renderDialog({ cards: [], cardViewMode: null });

    expect(screen.getByRole('button', { name: '漢字' })).toBeDisabled();
    expect(screen.getByText('Add some cards first, then pick what they show')).toBeInTheDocument();
  });

  it('says how many cards still need a picture', () => {
    renderDialog({
      cards: makeCards(5).map((c, i) => (i < 2 ? { ...c, imageUrl: undefined } : c)),
    });

    expect(screen.getByText('2 cards have no picture yet')).toBeInTheDocument();

    openPicker();
    expect(screen.getByRole('button', { name: /Find 2 pictures/ })).toBeEnabled();
  });

  it('disables the picture search when nothing is picked', () => {
    renderDialog();

    expect(screen.getByText('Every card has a picture')).toBeInTheDocument();

    openPicker();
    expect(screen.getByRole('button', { name: /Find 0 pictures/ })).toBeDisabled();
  });

  it('shows every card as a picture big enough to judge', () => {
    renderDialog({ cards: makeCards(2) });
    openPicker();

    const tiles = screen.getAllByRole('checkbox');
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toHaveAccessibleName(expect.stringContaining('語0'));
    expect(document.querySelectorAll('img[src*="unsplash.com"]')).toHaveLength(2);
  });

  it('searches only the cards left ticked', async () => {
    mockFetchImagesBatch.mockResolvedValue({ results: [], rateLimited: false, remaining: 40 });
    renderDialog({ cards: makeCards(3, { imageUrl: undefined }) });
    openPicker();

    fireEvent.click(screen.getByRole('checkbox', { name: /語1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Find 2 pictures/ }));

    await waitFor(() => expect(mockFetchImagesBatch).toHaveBeenCalledTimes(1));
    expect(mockFetchImagesBatch.mock.calls[0][0]).toEqual([
      { query: 'query 0', variety: false },
      { query: 'query 2', variety: false },
    ]);
  });

  it('lets a card that already has a picture be ticked for a different one', () => {
    renderDialog({ cards: makeCards(2) });
    openPicker();

    expect(screen.getByRole('button', { name: /Find 0 pictures/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /語0/ }));

    expect(screen.getByRole('button', { name: /Find 1 picture/ })).toBeEnabled();
    expect(
      screen.getByText('1 ticked card already has a picture and will get a different one.'),
    ).toBeInTheDocument();
  });

  it('ticks and unticks every card at once', () => {
    renderDialog({ cards: makeCards(4) });
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByRole('button', { name: /Find 4 pictures/ })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('button', { name: /Find 0 pictures/ })).toBeDisabled();
  });

  it('waits with Tango while it looks', async () => {
    let finish: (value: unknown) => void = () => {};
    mockFetchImagesBatch.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    renderDialog({ cards: makeCards(2, { imageUrl: undefined }) });
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /Find 2 pictures/ }));

    expect(await screen.findByRole('status')).toHaveTextContent('Looking for pictures…');

    finish({ results: [], rateLimited: false, stopped: false, remaining: 40 });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('saves the pictures it finds and reports the count', async () => {
    mockFetchImagesBatch.mockResolvedValue({
      results: [
        {
          query: 'query 0',
          result: {
            url: 'https://images.unsplash.com/found',
            downloadLocation: 'https://api.unsplash.com/photos/x/download',
            photographerName: 'Jane',
            photographerUrl: 'https://unsplash.com/@jane',
            photoPageUrl: 'https://unsplash.com/photos/x',
          },
        },
      ],
      rateLimited: false,
      stopped: false,
      remaining: 40,
    });
    const { onUpdateCard } = renderDialog({ cards: makeCards(1, { imageUrl: undefined }) });
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /Find 1 picture/ }));

    expect(await screen.findByText('Added 1 picture.')).toBeInTheDocument();
    expect(mockFetchImagesBatch).toHaveBeenCalledWith([{ query: 'query 0', variety: false }]);
    expect(onUpdateCard).toHaveBeenCalledWith(
      'card-0',
      expect.objectContaining({ imageUrl: expect.stringContaining('unsplash.com/found') }),
    );
  });

  it('hands the pictures it found over for review', async () => {
    mockFetchImagesBatch.mockResolvedValue({
      results: [
        {
          query: 'query 0',
          result: {
            url: 'https://images.unsplash.com/found',
            downloadLocation: 'https://api.unsplash.com/photos/x/download',
            photographerName: 'Jane',
            photographerUrl: 'https://unsplash.com/@jane',
            photoPageUrl: 'https://unsplash.com/photos/x',
          },
        },
      ],
      rateLimited: false,
      stopped: false,
      remaining: 40,
    });
    const onImagesFilled = vi.fn();
    renderDialog({ cards: makeCards(1, { imageUrl: undefined }), onImagesFilled });
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /Find 1 picture/ }));

    await waitFor(() => expect(onImagesFilled).toHaveBeenCalledTimes(1));
    expect(onImagesFilled.mock.calls[0][0]).toEqual([
      expect.objectContaining({ id: 'card-0', imageUrl: expect.stringContaining('found') }),
    ]);
  });

  it('tells the owner when the hourly picture allowance ran out', async () => {
    mockFetchImagesBatch.mockResolvedValue({
      results: [],
      rateLimited: true,
      stopped: false,
      remaining: 0,
    });
    renderDialog({ cards: makeCards(2, { imageUrl: undefined }) });
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /Find 2 pictures/ }));

    expect(
      await screen.findByText(
        'The free picture searches ran out for this hour. Added 0 pictures — try again in an hour for the rest.',
      ),
    ).toBeInTheDocument();
  });

  it('says the run stopped early rather than calling the cards pictureless', async () => {
    mockFetchImagesBatch.mockResolvedValue({
      results: [],
      rateLimited: false,
      stopped: true,
      remaining: 40,
    });
    renderDialog({ cards: makeCards(2, { imageUrl: undefined }) });
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /Find 2 pictures/ }));

    expect(
      await screen.findByText(
        "The picture search stopped early. 2 cards weren't looked up — try again.",
      ),
    ).toBeInTheDocument();
  });

  it('keeps the picker open on a failure so the message can be read', async () => {
    mockFetchImagesBatch.mockRejectedValue(new Error('nope'));
    const onImagesFilled = vi.fn();
    renderDialog({ cards: makeCards(2, { imageUrl: undefined }), onImagesFilled });
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /Find 2 pictures/ }));

    expect(
      await screen.findByText("The pictures didn't load. Please try again."),
    ).toBeInTheDocument();
    expect(onImagesFilled).not.toHaveBeenCalled();
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
