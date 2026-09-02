import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MIN_SENTENCES } from '@/components/Practice/KotobaBubbleMode/constants';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

const makeCard = (id: string): Flashcard => ({
  id,
  deckId: 'deck-1',
  word: '猫',
  reading: 'ねこ',
  meaning: 'cat',
  image_query: '',
  example_jp: '猫が好きです',
  example_en: 'I like cats',
  mainViewMode: 'hiragana',
  cardType: 'word',
  position: 0,
});

const CARDS = [makeCard('c1'), makeCard('c2'), makeCard('c3')];

vi.mock('@/hooks/useCards', () => ({
  useCards: () => ({ cards: CARDS, loading: false, error: null, retry: vi.fn() }),
}));

vi.mock('@/hooks/useDecks', () => ({
  useDecks: () => ({ decks: [], loading: false, error: null, retry: vi.fn() }),
}));

vi.mock('@/hooks/usePracticeSentences', () => ({
  usePracticeSentences: () => ({
    sentences: [],
    loading: false,
    generating: false,
    saving: false,
    error: null,
    hasContent: false,
    generate: vi.fn(),
    regenerate: vi.fn(),
    justGenerated: false,
    clearJustGenerated: vi.fn(),
    updateSentences: vi.fn(),
  }),
}));

vi.mock('@/components/Practice/KotobaBubbleMode', () => ({
  KotobaBubbleMode: ({ batchSize }: { batchSize: number }) => (
    <div data-testid="kotoba-game" data-batch={batchSize} />
  ),
}));

vi.mock('@/components/Practice/KotobaBubbleMode/KotobaBubbleSetup', () => ({
  KotobaBubbleSetup: () => <div data-testid="kotoba-setup" />,
}));

import Practice from '@/pages/Practice';

describe('Practice — Kotoba Bubble as a mixed practice leg', () => {
  it('drops a pre-sized leg straight into the game', () => {
    renderWithProviders(
      <Practice
        deckId="deck-1"
        mode="kotoba-bubble"
        onBack={vi.fn()}
        cardIds={CARDS.map((c) => c.id)}
      />,
    );
    expect(screen.queryByTestId('kotoba-setup')).not.toBeInTheDocument();
    expect(screen.getByTestId('kotoba-game')).toBeInTheDocument();
  });

  it('does not starve the sentence batch on a short leg', () => {
    renderWithProviders(
      <Practice deckId="deck-1" mode="kotoba-bubble" onBack={vi.fn()} cardIds={['c1', 'c2']} />,
    );
    const batch = Number(screen.getByTestId('kotoba-game').dataset.batch);
    expect(batch).toBeGreaterThanOrEqual(MIN_SENTENCES);
  });

  it('skips the setup screen for a quest leg, which carries no cardIds', () => {
    renderWithProviders(<Practice deckId="deck-1" mode="kotoba-bubble" onBack={vi.fn()} inChain />);
    expect(screen.queryByTestId('kotoba-setup')).not.toBeInTheDocument();
    expect(screen.getByTestId('kotoba-game')).toBeInTheDocument();
  });

  it('still shows the setup screen when the learner picked the mode themselves', () => {
    renderWithProviders(<Practice deckId="deck-1" mode="kotoba-bubble" onBack={vi.fn()} />);
    expect(screen.getByTestId('kotoba-setup')).toBeInTheDocument();
  });
});
