import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HandoutDetailDialog } from '@/components/Group/HandoutDetailDialog';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { HandoutRef } from '@/types/handout';

const mockUseDeckWords = vi.fn();

vi.mock('@/hooks/useDeckWords', () => ({
  useDeckWords: (...args: unknown[]) => mockUseDeckWords(...args),
}));

function deckHandout(overrides: Partial<HandoutRef> = {}): HandoutRef {
  return {
    deckId: 'deck-1',
    kanaSet: null,
    name: 'Animals',
    emoji: '🐾',
    note: 'Review before the quiz',
    availableOn: null,
    dueDate: '2026-10-01',
    requiredAccuracy: 80,
    requiredMode: 'study',
    ...overrides,
  };
}

describe('HandoutDetailDialog', () => {
  beforeEach(() => {
    mockUseDeckWords.mockReset();
    mockUseDeckWords.mockReturnValue({ words: [], loading: false, error: null });
  });

  it('renders title, goal, note and word rows for a deck handout', () => {
    mockUseDeckWords.mockReturnValue({
      words: [
        {
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
        },
      ],
      loading: false,
      error: null,
    });

    renderWithProviders(<HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} />);

    expect(screen.getByText('🐾 Animals')).toBeInTheDocument();
    expect(screen.getByText(/80%/)).toBeInTheDocument();
    expect(screen.getByText(/Review before the quiz/)).toBeInTheDocument();
    expect(screen.getByText('犬')).toBeInTheDocument();
    expect(screen.getByText('いぬ')).toBeInTheDocument();
    expect(screen.getByText('dog')).toBeInTheDocument();
  });

  it('renders characters for a kana handout', () => {
    renderWithProviders(
      <HandoutDetailDialog
        open
        onClose={vi.fn()}
        handout={deckHandout({
          deckId: null,
          kanaSet: 'hira-a',
          name: 'あ・い・う・え・お',
          emoji: null,
          requiredAccuracy: null,
          requiredMode: null,
        })}
      />,
    );

    expect(screen.getByText('あ')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('shows the empty-deck message', () => {
    renderWithProviders(<HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} />);

    expect(screen.getByText('This deck has no words yet.')).toBeInTheDocument();
  });

  it('shows the error alert', () => {
    mockUseDeckWords.mockReturnValue({ words: [], loading: false, error: 'boom' });

    renderWithProviders(<HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} />);

    expect(screen.getByText("Couldn't load the words. Try again.")).toBeInTheDocument();
  });
});
