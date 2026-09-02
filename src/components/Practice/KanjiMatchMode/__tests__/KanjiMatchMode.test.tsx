import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KanjiMatchMode } from '@/components/Practice/KanjiMatchMode';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

const recordAnswer = vi.fn().mockResolvedValue(undefined);
const endSession = vi.fn().mockResolvedValue(undefined);
const triggerReaction = vi.fn();
const markMissed = vi.fn();

vi.mock('@/components/Practice/KanjiMatchMode/useCardStrengths', () => ({
  useCardStrengths: () => new Map(),
}));

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
  useBuddyReaction: () => ({ triggerReaction, markMissed }),
}));

function card(id: string, word: string, reading: string): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word,
    reading,
    meaning: 'meaning',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'kanji',
    cardType: 'word',
    position: 0,
  };
}

const CARDS = [card('c1', '山', 'やま'), card('c2', '川', 'かわ')];

function renderMode() {
  renderWithProviders(
    <KanjiMatchMode cards={CARDS} deckId="deck-1" batchSize={6} onExit={vi.fn()} />,
  );
  return screen.findByRole('button', { name: '山' });
}

function tile(label: string) {
  return screen.getByRole('button', { name: label });
}

describe('KanjiMatchMode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records a matched pair against its own card', async () => {
    await renderMode();

    fireEvent.click(tile('山'));
    fireEvent.click(tile('やま'));

    await waitFor(() =>
      expect(recordAnswer).toHaveBeenCalledWith('session-1', true, undefined, 'c1'),
    );
    expect(triggerReaction).toHaveBeenCalledWith('correct', 'c1');
    expect(markMissed).not.toHaveBeenCalled();
  });

  it('blames a wrong attempt on the card whose tile was clicked', async () => {
    await renderMode();

    fireEvent.click(tile('山'));
    fireEvent.click(tile('かわ'));

    await waitFor(() =>
      expect(recordAnswer).toHaveBeenCalledWith('session-1', false, undefined, 'c2'),
    );
    expect(markMissed).toHaveBeenCalledWith('c2');
  });

  // Two ends of one pair, not two answers — scoring it twice would tell the
  // learner they answered more cards than the board held.
  it('counts a match as a single answer', async () => {
    await renderMode();

    fireEvent.click(tile('山'));
    fireEvent.click(tile('やま'));

    await waitFor(() => expect(recordAnswer).toHaveBeenCalledTimes(1));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('closes the session once, when the last pair is matched', async () => {
    await renderMode();

    fireEvent.click(tile('山'));
    fireEvent.click(tile('やま'));
    fireEvent.click(tile('川'));
    fireEvent.click(tile('かわ'));

    await waitFor(() => expect(endSession).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(endSession.mock.calls[0][1]).toMatchObject({ cardsStudied: 2, cardsCorrect: 2 });
  });
});
