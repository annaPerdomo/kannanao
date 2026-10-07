import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HandoutDetailDialog } from '@/components/Group/HandoutDetailDialog';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { HandoutRef } from '@/types/handout';

const mockUseDeckWords = vi.fn();
const mockUseHandoutWords = vi.fn();

vi.mock('@/hooks/useDeckWords', () => ({
  useDeckWords: (...args: unknown[]) => mockUseDeckWords(...args),
}));

vi.mock('@/hooks/useHandoutWords', () => ({
  useHandoutWords: (...args: unknown[]) => mockUseHandoutWords(...args),
}));

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
    mockUseHandoutWords.mockReset();
    mockUseHandoutWords.mockReturnValue({ data: null, loading: false, error: null });
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

  it('renders the plain word list when no groupId is given', () => {
    renderWithProviders(<HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} />);

    expect(mockUseHandoutWords).not.toHaveBeenCalled();
    expect(mockUseDeckWords).toHaveBeenCalled();
  });

  it('renders the group summary and per-word chips when groupId is given', () => {
    mockUseHandoutWords.mockReturnValue({
      data: {
        deck: { id: 'deck-1', name: 'Animals', emoji: '🐾' },
        learnerCount: 2,
        words: [{ card: card(), seenCount: 2, strongCount: 2, trickyCount: 0 }],
        learner: null,
      },
      loading: false,
      error: null,
    });

    renderWithProviders(
      <HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} groupId="g1" />,
    );

    expect(screen.getByText(/Learners have met 1 of 1 words/)).toBeInTheDocument();
    expect(screen.getByText('2/2 seen')).toBeInTheDocument();
    expect(screen.getByText('2 strong')).toBeInTheDocument();
    expect(screen.queryByText(/tricky/)).not.toBeInTheDocument();
  });

  it('shows the empty-deck message even with groupId and no learners', () => {
    mockUseHandoutWords.mockReturnValue({
      data: {
        deck: { id: 'deck-1', name: 'Animals', emoji: '🐾' },
        learnerCount: 0,
        words: [],
        learner: null,
      },
      loading: false,
      error: null,
    });

    renderWithProviders(
      <HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} groupId="g1" />,
    );

    expect(screen.getByText('This deck has no words yet.')).toBeInTheDocument();
    expect(
      screen.queryByText('No learners in this group yet, so there is nothing to track.'),
    ).not.toBeInTheDocument();
  });

  it('shows noLearnersYet when the group has no learners', () => {
    mockUseHandoutWords.mockReturnValue({
      data: {
        deck: { id: 'deck-1', name: 'Animals', emoji: '🐾' },
        learnerCount: 0,
        words: [{ card: card(), seenCount: 0, strongCount: 0, trickyCount: 0 }],
        learner: null,
      },
      loading: false,
      error: null,
    });

    renderWithProviders(
      <HandoutDetailDialog open onClose={vi.fn()} handout={deckHandout()} groupId="g1" />,
    );

    expect(
      screen.getByText('No learners in this group yet, so there is nothing to track.'),
    ).toBeInTheDocument();
  });
});
