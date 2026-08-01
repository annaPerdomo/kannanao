import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const cards = vi.hoisted(() => ({ current: [] as Flashcard[] }));

vi.mock('@/hooks/useCards', () => ({
  useCards: () => ({ cards: cards.current, loading: false }),
}));

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    startSession: vi.fn().mockResolvedValue('session-1'),
    recordAnswer: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
    progress: null,
    spendableXp: 0,
    newlyUnlocked: [],
    clearNewlyUnlocked: vi.fn(),
  }),
  XP_PER_WRONG: 2,
}));

vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ pendingXp: [], triggerXpEarned: vi.fn(), dismissXpEvent: vi.fn() }),
}));

vi.mock('@/contexts/BuddyReactionContext', () => ({
  useBuddyReaction: () => ({ reactionEvent: null, triggerReaction: vi.fn() }),
}));

vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));

// The other modes are irrelevant here and only slow the page down — stub them.
vi.mock('@/components/Practice/MatchMode', () => ({ MatchMode: () => null }));
vi.mock('@/components/Practice/FillMode', () => ({ FillMode: () => null }));
vi.mock('@/components/Practice/RecallMode', () => ({ RecallMode: () => null }));
vi.mock('@/components/Practice/ListenMode', () => ({ ListenMode: () => null }));
vi.mock('@/components/Practice/QuizMode', () => ({ QuizMode: () => null }));
vi.mock('@/components/Practice/KotobaBubbleMode', () => ({ KotobaBubbleMode: () => null }));
vi.mock('@/components/Practice/KotobaBubbleMode/KotobaBubbleSetup', () => ({
  KotobaBubbleSetup: () => null,
}));

import Practice from '@/pages/Practice';

// ─── Test data ────────────────────────────────────────────────────────────────

function makeCard(id: string, word: string, reading: string): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word,
    reading,
    meaning: 'meaning',
    image_query: '',
    example_jp: `${word}です`,
    example_en: 'example',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
  };
}

const KANJI_CARDS = [
  makeCard('k1', '猫', 'ねこ'),
  makeCard('k2', '犬', 'いぬ'),
  makeCard('k3', '山', 'やま'),
  makeCard('k4', '川', 'かわ'),
];
const KANA_CARDS = [
  makeCard('a1', 'ねこ', 'ねこ'),
  makeCard('a2', 'いぬ', 'いぬ'),
  makeCard('a3', 'さかな', 'さかな'),
  makeCard('a4', 'とり', 'とり'),
];

function renderReading() {
  return renderWithProviders(<Practice deckId="deck-1" mode="reading" onBack={vi.fn()} />);
}

describe('Reading mode eligibility on the practice page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('sends a kana-only deck back to the picker instead of an empty round', async () => {
    cards.current = KANA_CARDS;
    renderReading();

    await waitFor(() => expect(screen.getByText(/needs a few kanji words/)).toBeInTheDocument());
    expect(screen.getByText('Pick another way to practice')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('falls back when only a couple of cards carry kanji', async () => {
    cards.current = [...KANA_CARDS, makeCard('k1', '猫', 'ねこ'), makeCard('k2', '犬', 'いぬ')];
    renderReading();

    await waitFor(() => expect(screen.getByText(/needs a few kanji words/)).toBeInTheDocument());
  });

  it('starts a round once enough kanji cards exist, counting only those', async () => {
    cards.current = [...KANJI_CARDS, ...KANA_CARDS];
    renderReading();

    await waitFor(() => expect(screen.getByRole('progressbar')).toBeInTheDocument());
    expect(screen.getByText('4 cards')).toBeInTheDocument();
  });
});
