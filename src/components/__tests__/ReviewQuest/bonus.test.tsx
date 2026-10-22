import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as SupabaseLib from '@/lib/supabase';

type SupabaseModule = typeof SupabaseLib;

const startSession = vi.fn(async () => 'sess1');
const recordAnswer = vi.fn(async () => {});
const endSession = vi.fn(async () => {});
const addBonusXp = vi.fn(async () => {});
const triggerXpEarned = vi.fn();
const awardFriendship = vi.fn(async () => ({
  awarded: 2,
  points: 2,
  leveledUp: false,
  newLevel: 1,
}));

vi.mock('@/hooks/useProgress', () => ({
  XP_PER_WRONG: 2,
  useProgress: () => ({
    startSession,
    recordAnswer,
    endSession,
    addBonusXp,
    openDailyChest: vi.fn(async () => true),
    progress: { last_chest_date: null },
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({ awardFriendship }),
}));
vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ triggerXpEarned, pendingXp: [], dismissXpEvent: () => {} }),
}));
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak: vi.fn() }) }));
vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));
vi.mock('@/components/FlipStudy', () => ({
  __esModule: true,
  default: ({
    cards,
    controller,
  }: {
    cards: { id: string; jlptLevel?: string }[];
    controller: {
      onGrade: (card: { id: string; jlptLevel?: string }, correct: boolean) => void;
      onComplete: () => void;
    };
  }) => (
    <div>
      {cards.map((c) => (
        <button key={c.id} type="button" onClick={() => controller.onGrade(c, true)}>
          grade {c.id}
        </button>
      ))}
      <button type="button" onClick={controller.onComplete}>
        finish warm-up
      </button>
    </div>
  ),
}));
vi.mock('@/components/ReviewQuest/BossRound', () => ({
  BossRound: ({
    cards,
    grade,
    onComplete,
  }: {
    cards: { id: string; jlptLevel?: string }[];
    grade: (correct: boolean, jlpt?: string, cardId?: string) => void;
    onComplete: () => void;
  }) => (
    <div>
      {cards.map((c) => (
        <button key={c.id} type="button" onClick={() => grade(true, c.jlptLevel, c.id)}>
          boss {c.id}
        </button>
      ))}
      <button type="button" onClick={onComplete}>
        finish boss
      </button>
    </div>
  ),
}));
vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual<SupabaseModule>('@/lib/supabase');
  return { ...actual, getDueCount: vi.fn(async () => 0) };
});

import { ReviewQuest } from '@/components/ReviewQuest';
import { bonusRoundsToday } from '@/lib/bonusRound';
import { localDateString } from '@/lib/chest';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

function cards(n: number): Flashcard[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    word: 'いぬ',
    reading: 'いぬ',
    meaning: 'dog',
    image_query: '',
    example_jp: '',
    example_en: '',
    deckId: 'd1',
    mainViewMode: 'hiragana' as const,
    cardType: 'word' as const,
    position: i,
  }));
}

/** Warm-up (4 cards) then Boss Round (3 cards) — 7 answers total, enough to pay a bonus round. */
async function playSevenCardQuest() {
  renderWithProviders(<ReviewQuest cards={cards(7)} onExit={vi.fn()} bonus />);
  const warmupButtons = await screen.findAllByRole('button', { name: /^grade c/ });
  warmupButtons.forEach((btn) => fireEvent.click(btn));
  fireEvent.click(screen.getByRole('button', { name: 'finish warm-up' }));
  fireEvent.click(await screen.findByRole('button', { name: "Let's go" }));
  const bossButtons = await screen.findAllByRole('button', { name: /^boss c/ });
  bossButtons.forEach((btn) => fireEvent.click(btn));
  fireEvent.click(screen.getByRole('button', { name: 'finish boss' }));
}

describe('ReviewQuest bonus round', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    awardFriendship.mockResolvedValue({ awarded: 2, points: 2, leveledUp: false, newLevel: 1 });
  });
  afterEach(() => vi.useRealTimers());

  it('pays XP and hearts and records the round once 5+ cards are answered', async () => {
    await playSevenCardQuest();

    const today = localDateString(new Date());
    expect(await screen.findByText(/Bonus round cleared!/)).toBeInTheDocument();
    expect(addBonusXp).toHaveBeenCalledWith(50);
    expect(awardFriendship).toHaveBeenCalledWith('bonus');
    expect(bonusRoundsToday(today)).toBe(1);
  });

  it('pays nothing and does not record a round with fewer than 5 answers', async () => {
    renderWithProviders(<ReviewQuest cards={cards(3)} onExit={vi.fn()} bonus />);
    const warmupButtons = await screen.findAllByRole('button', { name: /^grade c/ });
    warmupButtons.forEach((btn) => fireEvent.click(btn));
    fireEvent.click(screen.getByRole('button', { name: 'finish warm-up' }));

    await screen.findByText("You cleared today's review!");
    expect(addBonusXp).not.toHaveBeenCalledWith(50);
    expect(awardFriendship).not.toHaveBeenCalledWith('bonus');
    const today = localDateString(new Date());
    expect(bonusRoundsToday(today)).toBe(0);
  });
});
