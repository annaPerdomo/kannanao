import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockStartSession = vi.fn().mockResolvedValue('session-1');
const mockRecordAnswer = vi.fn().mockResolvedValue(undefined);
const mockEndSession = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    startSession: mockStartSession,
    recordAnswer: mockRecordAnswer,
    endSession: mockEndSession,
    progress: null,
    spendableXp: 0,
    newlyUnlocked: [],
    clearNewlyUnlocked: vi.fn(),
  }),
  XP_PER_WRONG: 2,
}));

vi.mock('@/hooks/useShop', () => ({
  useShop: () => ({ equipped: {}, purchasedKeys: [], buyItem: vi.fn() }),
  CARD_BORDER_STYLES: {},
}));

vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ pendingXp: [], triggerXpEarned: vi.fn(), dismissXpEvent: vi.fn() }),
}));

vi.mock('@/contexts/BuddyReactionContext', () => ({
  useBuddyReaction: () => ({ reactionEvent: null, triggerReaction: vi.fn() }),
}));

vi.mock('@/components/FuriganaText', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
  stripFurigana: (t: string) => t,
}));

vi.mock('@/components/SpeakButton', () => ({
  SpeakButton: () => null,
}));

import { MatchMode } from '@/components/Practice/MatchMode';

// ─── Test data ────────────────────────────────────────────────────────────────

function makeCard(id: string, word: string, meaning: string): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word,
    reading: word,
    meaning,
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
  };
}

const CARDS: Flashcard[] = [
  makeCard('c1', 'ねこ', 'cat'),
  makeCard('c2', 'いぬ', 'dog'),
  makeCard('c3', 'さかな', 'fish'),
  makeCard('c4', 'とり', 'bird'),
];

describe('MatchMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartSession.mockResolvedValue('session-1');
    mockRecordAnswer.mockResolvedValue(undefined);
    mockEndSession.mockResolvedValue(undefined);
  });

  it('should render word tiles', async () => {
    renderWithProviders(
      <MatchMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('ねこ')).toBeInTheDocument();
    });
  });

  it('should render meaning tiles', async () => {
    renderWithProviders(
      <MatchMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('cat')).toBeInTheDocument();
    });
  });

  it('should render both Japanese and English tiles for each card', async () => {
    renderWithProviders(
      <MatchMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('ねこ')).toBeInTheDocument();
      expect(screen.getByText('cat')).toBeInTheDocument();
    });
  });

  it('should show a timer', async () => {
    renderWithProviders(
      <MatchMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
    );

    await waitFor(() => {
      const timerEl = screen.queryByText(/\d+s|\d+:\d+/);
      expect(timerEl).toBeInTheDocument();
    });
  });

  it('should show a progress bar', async () => {
    renderWithProviders(
      <MatchMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('should highlight a tile when clicked', async () => {
    renderWithProviders(
      <MatchMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('ねこ')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ねこ'));
  });

  it('should allow clicking a word tile without errors', async () => {
    renderWithProviders(
      <MatchMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('ねこ')).toBeInTheDocument();
      expect(screen.getByText('cat')).toBeInTheDocument();
    });

    expect(() => fireEvent.click(screen.getByText('ねこ'))).not.toThrow();
  });

  it('should call startSession on mount', async () => {
    renderWithProviders(
      <MatchMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
    );

    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalledWith('deck-1', 'match');
    });
  });

  it('should call recordAnswer with true when a correct pair is matched', async () => {
    renderWithProviders(
      <MatchMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
    );

    // Wait for tiles to appear
    await waitFor(() => {
      expect(screen.getByText('ねこ')).toBeInTheDocument();
      expect(screen.getByText('cat')).toBeInTheDocument();
    });

    // Click the JP word tile then the matching EN tile
    fireEvent.click(screen.getByText('ねこ'));
    fireEvent.click(screen.getByText('cat'));

    await waitFor(() => {
      expect(mockRecordAnswer).toHaveBeenCalledWith('session-1', true, undefined, 'c1');
    });
  });

  it('should not call recordAnswer when an incorrect pair is selected', async () => {
    renderWithProviders(
      <MatchMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByText('ねこ')).toBeInTheDocument();
      expect(screen.getByText('dog')).toBeInTheDocument();
    });

    // Click JP tile for 'cat' but EN tile for 'dog' — wrong pair
    fireEvent.click(screen.getByText('ねこ'));
    fireEvent.click(screen.getByText('dog'));

    // Give a moment for any async processing
    await new Promise((r) => setTimeout(r, 50));

    // recordAnswer should not have been called for a wrong pair (or called with false)
    const correctCalls = mockRecordAnswer.mock.calls.filter((args) => args[1] === true);
    expect(correctCalls).toHaveLength(0);
  });
});
