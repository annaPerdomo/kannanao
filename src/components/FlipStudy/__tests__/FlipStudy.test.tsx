import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FlipStudy from '@/components/FlipStudy';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard as FlashcardType } from '@/types/flashcard';

// A stand-in that never flips, so grading is exercised on the card's front.
vi.mock('@/components/Flashcard', () => ({
  Flashcard: ({ card }: { card: FlashcardType }) => <div>{card.word}</div>,
}));
vi.mock('@/components/Practice/CelebrationScreen', () => ({
  CelebrationScreen: () => <div>celebration</div>,
  pickPraise: () => ({ jp: 'すごい', en: 'Great' }),
}));
vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ triggerXpEarned: vi.fn() }),
}));
vi.mock('@/contexts/BuddyReactionContext', () => ({
  useBuddyReaction: () => ({ triggerReaction: vi.fn() }),
}));
const progress = vi.hoisted(() => ({
  startSession: vi.fn(),
  recordAnswer: vi.fn(),
  endSession: vi.fn(),
  addBonusXp: vi.fn(),
}));
vi.mock('@/hooks/useProgress', () => ({ XP_PER_WRONG: 2, useProgress: () => progress }));
vi.mock('@/hooks/useCombo', () => ({
  useCombo: () => ({
    count: 0,
    onAnswer: vi.fn(() => ({ count: 1, bonusAwarded: 0 })),
    reset: vi.fn(),
  }),
}));

const cards: FlashcardType[] = [
  { id: 'c1', deckId: 'd1', word: 'ホームワーク', reading: '', meaning: 'homework' },
  { id: 'c2', deckId: 'd1', word: 'テスト', reading: '', meaning: 'test' },
] as FlashcardType[];

const controller = {
  onGrade: vi.fn(() => ({ count: 1, bonusAwarded: 0 })),
  onComplete: vi.fn(),
  comboCount: 0,
};

const renderStudy = (props: Partial<ComponentProps<typeof FlipStudy>> = {}) =>
  renderWithProviders(
    <FlipStudy
      cards={cards}
      title="Katakana Words"
      sessionMode="study"
      sessionDeckId="d1"
      onBack={vi.fn()}
      controller={controller}
      {...props}
    />,
  );

describe('FlipStudy grading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    progress.startSession.mockResolvedValue('s1');
    progress.endSession.mockResolvedValue(undefined);
  });

  it('grades a card that was never flipped', () => {
    renderStudy();

    fireEvent.click(screen.getByRole('button', { name: /Got it/ }));

    expect(controller.onGrade).toHaveBeenCalledWith(cards[0], true);
  });

  it('records "still learning" as a wrong answer', () => {
    renderStudy();

    fireEvent.click(screen.getByRole('button', { name: /Still learning/ }));

    expect(controller.onGrade).toHaveBeenCalledWith(cards[0], false);
  });

  it('grades each card once, then completes the round', () => {
    vi.useFakeTimers();
    renderStudy();

    fireEvent.click(screen.getByRole('button', { name: /Got it/ }));
    act(() => vi.runAllTimers()); // the slide-out before the next card mounts
    fireEvent.click(screen.getByRole('button', { name: /Got it/ }));

    expect(controller.onGrade).toHaveBeenCalledTimes(2);
    expect(controller.onGrade).toHaveBeenLastCalledWith(cards[1], true);
    expect(controller.onComplete).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  // Without a controller, FlipStudy opens its own session and is the path that
  // writes SRS state — and it refuses to grade until that session row exists.
  it('records an unflipped card against the session when run standalone', async () => {
    renderStudy({ controller: undefined });
    await waitFor(() => expect(progress.startSession).toHaveBeenCalledWith('d1', 'study'));

    fireEvent.click(screen.getByRole('button', { name: /Got it/ }));

    await waitFor(() =>
      expect(progress.recordAnswer).toHaveBeenCalledWith('s1', true, undefined, 'c1'),
    );
  });
});
