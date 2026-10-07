import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

const mockUseHandoutWords = vi.fn();
vi.mock('@/hooks/useHandoutWords', () => ({
  useHandoutWords: (...args: unknown[]) => mockUseHandoutWords(...args),
}));

import { WordStrip } from '../WordStrip';

function card(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    word: '犬',
    reading: 'いぬ',
    meaning: 'dog',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    deckId: 'deck-1',
    position: 0,
    ...overrides,
  };
}

describe('WordStrip', () => {
  beforeEach(() => {
    mockUseHandoutWords.mockReset();
  });

  it('shows loading', () => {
    mockUseHandoutWords.mockReturnValue({ data: null, loading: true, error: null });
    renderWithProviders(<WordStrip deckId="deck-1" groupId="g1" onShowDetail={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error alert', () => {
    mockUseHandoutWords.mockReturnValue({ data: null, loading: false, error: 'boom' });
    renderWithProviders(<WordStrip deckId="deck-1" groupId="g1" onShowDetail={vi.fn()} />);
    expect(screen.getByText("Couldn't load the words. Try again.")).toBeInTheDocument();
  });

  it('shows the empty state when there are no words', () => {
    mockUseHandoutWords.mockReturnValue({
      data: {
        deck: { id: 'deck-1', name: 'Food', emoji: null },
        learnerCount: 0,
        words: [],
        learner: null,
      },
      loading: false,
      error: null,
    });
    renderWithProviders(<WordStrip deckId="deck-1" groupId="g1" onShowDetail={vi.fn()} />);
    expect(screen.getByText('This deck has no words yet.')).toBeInTheDocument();
  });

  it('renders chips with reading/meaning titles and calls onShowDetail', () => {
    const onShowDetail = vi.fn();
    mockUseHandoutWords.mockReturnValue({
      data: {
        deck: { id: 'deck-1', name: 'Food', emoji: null },
        learnerCount: 2,
        words: [
          { card: card(), seenCount: 1, strongCount: 0, trickyCount: 0 },
          {
            card: card({ id: 'c2', word: '猫', reading: 'ねこ', meaning: 'cat' }),
            seenCount: 0,
            strongCount: 0,
            trickyCount: 0,
          },
        ],
        learner: null,
      },
      loading: false,
      error: null,
    });

    renderWithProviders(<WordStrip deckId="deck-1" groupId="g1" onShowDetail={onShowDetail} />);

    expect(screen.getByText('Words in this week (2)')).toBeInTheDocument();
    expect(screen.getByTitle('いぬ · dog')).toHaveTextContent('犬');
    expect(screen.getByTitle('ねこ · cat')).toHaveTextContent('猫');

    fireEvent.click(screen.getByText('See how learners are doing'));
    expect(onShowDetail).toHaveBeenCalled();
  });
});
