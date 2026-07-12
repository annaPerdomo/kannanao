import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));

import { BossRound } from '@/components/ReviewQuest/BossRound';
import { cardXp } from '@/lib/flashcardUtils';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

function card(overrides: Partial<Flashcard>): Flashcard {
  return {
    id: 'c1',
    word: 'いぬ',
    reading: 'いぬ',
    meaning: 'dog',
    image_query: '',
    example_jp: '',
    example_en: '',
    deckId: 'd1',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    ...overrides,
  };
}

describe('BossRound', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('records each answer with its cardId (SRS advances) and awards double XP once at the end', () => {
    const boss = card({ id: 'boss1', meaning: 'dog', jlptLevel: 'N4' });
    const distractor = card({ id: 'd2', word: 'ねこ', reading: 'ねこ', meaning: 'cat' });
    const grade = vi.fn(() => ({ count: 1, bonusAwarded: 0 }));
    const onBossBonus = vi.fn();
    const onComplete = vi.fn();

    renderWithProviders(
      <BossRound
        cards={[boss]}
        pool={[boss, distractor]}
        comboCount={0}
        grade={grade}
        onBossBonus={onBossBonus}
        onComplete={onComplete}
      />,
    );

    // Pick the correct meaning.
    fireEvent.click(screen.getByRole('button', { name: 'dog' }));

    // The answer is recorded exactly as usual — with the card's id, so the SRS
    // sees it — and NOT as a bonus (that batches at the end).
    expect(grade).toHaveBeenCalledWith(true, 'N4', 'boss1');
    expect(onBossBonus).not.toHaveBeenCalled();

    // After the reveal auto-advances past the last card, the batched double-XP
    // (one extra cardXp per correct boss card) is awarded once, then it completes.
    vi.advanceTimersByTime(1200);
    expect(onBossBonus).toHaveBeenCalledTimes(1);
    expect(onBossBonus).toHaveBeenCalledWith(cardXp('N4'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('a wrong boss answer records but adds nothing to the double-XP bonus', () => {
    const boss = card({ id: 'boss1', meaning: 'dog', jlptLevel: 'N5' });
    const distractor = card({ id: 'd2', word: 'ねこ', reading: 'ねこ', meaning: 'cat' });
    const grade = vi.fn(() => ({ count: 0, bonusAwarded: 0 }));
    const onBossBonus = vi.fn();
    const onComplete = vi.fn();

    renderWithProviders(
      <BossRound
        cards={[boss]}
        pool={[boss, distractor]}
        comboCount={0}
        grade={grade}
        onBossBonus={onBossBonus}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'cat' }));
    expect(grade).toHaveBeenCalledWith(false, 'N5', 'boss1');

    vi.advanceTimersByTime(1200);
    // Nothing correct → the batched bonus is zero.
    expect(onBossBonus).toHaveBeenCalledWith(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
