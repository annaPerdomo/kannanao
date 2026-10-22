import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EndingsMode } from '@/components/Practice/EndingsMode';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

const recordAnswer = vi.fn().mockResolvedValue(undefined);
const endSession = vi.fn().mockResolvedValue(undefined);
const triggerReaction = vi.fn();

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    startSession: vi.fn().mockResolvedValue('session-1'),
    recordAnswer,
    endSession,
  }),
  XP_PER_WRONG: 2,
}));

vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ triggerXpEarned: vi.fn() }),
}));

vi.mock('@/contexts/BuddyReactionContext', () => ({
  useBuddyReaction: () => ({ triggerReaction, markMissed: vi.fn() }),
}));

vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));

function card(
  id: string,
  exampleJp: string,
  exampleEn: string,
  overrides: Partial<Flashcard> = {},
): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word: 'たかい',
    reading: 'たかい',
    meaning: 'expensive',
    image_query: '',
    example_jp: exampleJp,
    example_en: exampleEn,
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    ...overrides,
  };
}

// A single-card queue, so the queue's own shuffle can't pick a different card
// than the one each test is about. This one's own meaning is a plain gloss, so
// it's an ordinary vocab sentence, not a drill card for the negative ending.
const NEGATIVE_CARD = card('c1', 'このペンはたかくないです。', "This pen isn't expensive.");

// A Ch6-style conjugation card: the meaning spells the ending out on purpose.
const DRILL_CARD = card('d1', 'このペンはたかくないです。', "This pen isn't expensive.", {
  word: 'たかい (Negative)',
  meaning: 'たか くないです (drop い add くない)',
});

function renderMode(cardToPlay: Flashcard) {
  renderWithProviders(
    <EndingsMode cards={[cardToPlay]} deckId="deck-1" batchSize={4} onExit={vi.fn()} />,
  );
}

describe('EndingsMode', () => {
  beforeEach(() => vi.clearAllMocks());

  // Choice order is fixed (present/negative/past/pastNegative), so for this
  // card — an i-adj negative — the labels are A=いです, B=くないです (correct),
  // C=かったです, D=くなかったです.
  it('records a correct pick against its card and advances', async () => {
    renderMode(NEGATIVE_CARD);

    const correctChoice = await screen.findByRole('button', { name: 'Answer B: くないです' });
    fireEvent.click(correctChoice);

    await waitFor(() => expect(recordAnswer).toHaveBeenCalledTimes(1));
    expect(recordAnswer).toHaveBeenCalledWith('session-1', true, undefined, undefined);
    expect(triggerReaction).toHaveBeenCalledWith('correct', 'c1');
  });

  it('shows the miss explainer with the right rule on a wrong pick', async () => {
    renderMode(NEGATIVE_CARD);

    const wrongChoice = await screen.findByRole('button', { name: 'Answer C: かったです' });
    fireEvent.click(wrongChoice);

    await waitFor(() => expect(recordAnswer).toHaveBeenCalledTimes(1));
    expect(recordAnswer).toHaveBeenCalledWith('session-1', false, undefined, undefined);
    expect(triggerReaction).toHaveBeenCalledWith('wrong', 'c1');
    expect(await screen.findByText(/Not: drop い, add くないです/)).toBeInTheDocument();
  });

  it('moves the card review schedule only when it actually drills the ending', async () => {
    renderMode(DRILL_CARD);

    const correctChoice = await screen.findByRole('button', { name: 'Answer B: くないです' });
    fireEvent.click(correctChoice);

    await waitFor(() =>
      expect(recordAnswer).toHaveBeenCalledWith('session-1', true, undefined, 'd1'),
    );
  });
});
