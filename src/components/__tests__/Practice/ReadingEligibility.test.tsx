import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { PracticeMode } from '@/types/app';
import type { Flashcard } from '@/types/flashcard';

const cards = vi.hoisted(() => ({ current: [] as Flashcard[] }));
const readingUnlocked = vi.hoisted(() => ({ current: true }));

vi.mock('@/hooks/useCards', () => ({
  useCards: () => ({ cards: cards.current, loading: false }),
}));

vi.mock('@/hooks/useDecks', () => ({
  useDecks: () => ({
    decks: [{ id: 'deck-1', readingPractice: readingUnlocked.current }],
    loading: false,
  }),
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

vi.mock('@/components/Practice/MatchMode', () => ({ MatchMode: () => null }));
vi.mock('@/components/Practice/FillMode', () => ({ FillMode: () => null }));
vi.mock('@/components/Practice/RecallMode', () => ({ RecallMode: () => null }));
vi.mock('@/components/Practice/ListenMode', () => ({ ListenMode: () => null }));
vi.mock('@/components/Practice/QuizMode', () => ({ QuizMode: () => null }));
vi.mock('@/components/Practice/KotobaBubbleMode', () => ({ KotobaBubbleMode: () => null }));
vi.mock('@/components/Practice/KotobaBubbleMode/KotobaBubbleSetup', () => ({
  KotobaBubbleSetup: () => null,
}));
// The page also calls the real kanjiMatchPairs, so only the component is stubbed.
vi.mock('@/components/Practice/KanjiMatchMode', async () => ({
  ...(await vi.importActual<object>('@/components/Practice/KanjiMatchMode/pairs')),
  KanjiMatchMode: () => <div data-testid="kanji-board" />,
}));

import Practice from '@/pages/Practice';

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

function renderMode(mode: PracticeMode) {
  return renderWithProviders(<Practice deckId="deck-1" mode={mode} onBack={vi.fn()} />);
}

describe('Reading mode eligibility on the practice page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    readingUnlocked.current = true;
  });

  it('turns away a learner who types the URL for a locked deck', async () => {
    cards.current = KANJI_CARDS;
    readingUnlocked.current = false;
    renderReading();

    await waitFor(() =>
      expect(screen.getByText(/isn't open for this deck yet/)).toBeInTheDocument(),
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
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

describe('Kanji Pairs eligibility on the practice page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readingUnlocked.current = true;
  });

  it('turns away a learner who types the URL for a locked deck', async () => {
    cards.current = KANJI_CARDS;
    readingUnlocked.current = false;
    renderMode('kanji-match');

    await waitFor(() =>
      expect(screen.getByText(/isn't open for this deck yet/)).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('kanji-board')).not.toBeInTheDocument();
  });

  it('sends a kana-only deck back to the picker instead of an empty board', async () => {
    cards.current = KANA_CARDS;
    renderMode('kanji-match');

    await waitFor(() => expect(screen.getByText(/needs a few kanji words/)).toBeInTheDocument());
    expect(screen.queryByTestId('kanji-board')).not.toBeInTheDocument();
  });

  it('deals the board once enough kanji cards exist, counting only those', async () => {
    cards.current = [...KANJI_CARDS, ...KANA_CARDS];
    renderMode('kanji-match');

    await waitFor(() => expect(screen.getByTestId('kanji-board')).toBeInTheDocument());
    expect(screen.getByText('4 cards')).toBeInTheDocument();
  });

  // Five eligible cards, two pairs: the gate counts pairs, not cards.
  it('turns away a deck whose kanji cards mostly share one reading', async () => {
    cards.current = [
      makeCard('s1', '作る', 'つくる'),
      makeCard('s2', '造る', 'つくる'),
      makeCard('s3', '創る', 'つくる'),
      makeCard('s4', '佃る', 'つくる'),
      makeCard('s5', '走る', 'はしる'),
    ];
    renderMode('kanji-match');

    await waitFor(() => expect(screen.getByText(/needs a few kanji words/)).toBeInTheDocument());
    expect(screen.queryByTestId('kanji-board')).not.toBeInTheDocument();
  });
});

// The gate sits in the middle of the page's mode routing, so keep the ordinary
// paths honest too — none of them should be reading-gated.
describe('practice page mode routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readingUnlocked.current = false;
  });

  it('starts an ungated mode without consulting the reading switch', async () => {
    cards.current = KANA_CARDS;
    renderMode('match');

    await waitFor(() => expect(screen.getByText('Match JP ↔ EN')).toBeInTheDocument());
    expect(screen.queryByText(/isn't open for this deck yet/)).not.toBeInTheDocument();
  });

  it('asks for a batch size on a big deck', async () => {
    cards.current = [
      ...KANJI_CARDS,
      ...KANA_CARDS,
      ...KANJI_CARDS.map((c) => ({ ...c, id: `x${c.id}` })),
    ];
    renderMode('recall');

    await waitFor(() => expect(screen.getByText('How many cards?')).toBeInTheDocument());
  });

  it('says so when the deck is too small for any mode', async () => {
    cards.current = [makeCard('k1', '猫', 'ねこ')];
    renderMode('listen');

    await waitFor(() =>
      expect(screen.getByText(/Not enough cards to practice/)).toBeInTheDocument(),
    );
  });

  it('skips the batch picker for Quiz', async () => {
    cards.current = [...KANJI_CARDS, ...KANA_CARDS];
    renderMode('quiz');

    await waitFor(() => expect(screen.getByText('Quiz')).toBeInTheDocument());
    expect(screen.queryByText('How many cards?')).not.toBeInTheDocument();
  });
});
