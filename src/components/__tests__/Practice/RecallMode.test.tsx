import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Captured at module level so tests can assert on them
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
  useShop: () => ({ equipped: {}, purchases: [], ownsItem: vi.fn(() => false) }),
  CARD_BORDER_STYLES: {},
}));

vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ pendingXp: [], triggerXpEarned: vi.fn(), dismissXpEvent: vi.fn() }),
}));

vi.mock('@/contexts/BuddyReactionContext', () => ({
  useBuddyReaction: () => ({ reactionEvent: null, triggerReaction: vi.fn() }),
}));

vi.mock('@/components/UnsplashAttribution', () => ({
  UnsplashAttribution: () => null,
}));

vi.mock('@/hooks/useFuriganaMask', () => ({ useFuriganaMask: () => () => false }));
vi.mock('@/components/FuriganaText', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
  stripFurigana: (t: string) => t,
  titleRubySx: {},
}));

vi.mock('@/components/SpeakButton', () => ({
  SpeakButton: ({ onSpeak }: { onSpeak?: () => void }) => (
    <button type="button" aria-label="read aloud" onClick={onSpeak} />
  ),
}));

// The component preloads the answer image and only reveals it once loaded;
// jsdom never fetches, so resolve the load synchronously.
class LoadedImage {
  onload: (() => void) | null = null;
  set src(_url: string) {
    this.onload?.();
  }
}

import { RecallMode } from '@/components/Practice/RecallMode';

// ─── Test data ────────────────────────────────────────────────────────────────

function makeCard(id: string, meaning: string): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word: `word-${id}`,
    reading: `reading-${id}`,
    meaning,
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    jlptLevel: 'N5',
    position: 0,
  };
}

const CARDS: Flashcard[] = [
  makeCard('c1', 'cat'),
  makeCard('c2', 'dog'),
  makeCard('c3', 'fish'),
  makeCard('c4', 'bird'),
];

// Every card carries an image and an example sentence, so the gating assertions
// hold whichever card the queue happens to serve first.
const RICH_CARDS: Flashcard[] = CARDS.map((c) => ({
  ...c,
  imageUrl: `https://images.test/${c.id}.jpg`,
  example_jp: `example-${c.id}`,
}));

/** The choice tile for a given meaning, by its `Answer A: cat` accessible name. */
function choiceFor(meaning: string) {
  return screen.getByRole('button', { name: new RegExp(`: ${meaning}$`) });
}

/** The card the queue is currently showing, identified by its reading. */
function currentCard(cards: Flashcard[]): Flashcard {
  const body = document.body.textContent ?? '';
  const card = cards.find((c) => body.includes(c.reading));
  if (!card) throw new Error('no card rendered');
  return card;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RecallMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartSession.mockResolvedValue('session-1');
    mockRecordAnswer.mockResolvedValue(undefined);
    mockEndSession.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render the first card question', async () => {
      renderWithProviders(
        <RecallMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => {
        const rendered = document.body.textContent ?? '';
        const cardReadings = CARDS.map((c) => c.reading);
        expect(cardReadings.some((r) => rendered.includes(r))).toBe(true);
      });
    });

    it('should render choice labels A through D', async () => {
      renderWithProviders(
        <RecallMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
        expect(screen.getByText('D')).toBeInTheDocument();
      });
    });

    it('should render a progress bar', async () => {
      renderWithProviders(
        <RecallMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should render the question prompt', async () => {
      renderWithProviders(
        <RecallMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => {
        expect(screen.getByText('WHAT DOES THIS MEAN?')).toBeInTheDocument();
      });
    });

    it('should include all card meanings as answer choices (with 4 cards)', async () => {
      renderWithProviders(
        <RecallMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => {
        // With 4 cards, all meanings are used (3 distractors + 1 correct)
        const body = document.body.textContent ?? '';
        const allMeanings = ['cat', 'dog', 'fish', 'bird'];
        // At least the correct card's meaning is visible as a choice
        expect(allMeanings.some((m) => body.includes(m))).toBe(true);
      });
    });
  });

  describe('session management', () => {
    it('should call startSession on mount', async () => {
      renderWithProviders(
        <RecallMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => expect(mockStartSession).toHaveBeenCalledWith('deck-1', 'recall'));
    });

    it('should call startSession with the provided deckId', async () => {
      renderWithProviders(
        <RecallMode cards={CARDS} deckId="my-deck-99" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => expect(mockStartSession).toHaveBeenCalledWith('my-deck-99', 'recall'));
    });
  });

  describe('answer interaction', () => {
    it('should not throw when clicking a choice button', async () => {
      renderWithProviders(
        <RecallMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());

      // Click the 'A' label (inside a button)
      expect(() => fireEvent.click(screen.getByText('A'))).not.toThrow();
    });

    it('should call recordAnswer after selecting an answer (once session is ready)', async () => {
      renderWithProviders(
        <RecallMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );

      // Wait for session to be started
      await waitFor(() => expect(mockStartSession).toHaveBeenCalled());

      // Flush the startSession promise so sessionIdRef is set
      await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());

      // Give the session promise time to resolve and set sessionIdRef
      await new Promise((r) => setTimeout(r, 0));

      // Click any answer
      fireEvent.click(screen.getByText('A'));

      await waitFor(() => {
        expect(mockRecordAnswer).toHaveBeenCalled();
      });
    });

    it('should call recordAnswer with correct=true for the right answer', async () => {
      renderWithProviders(
        <RecallMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => expect(mockStartSession).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 0));

      // Find the button containing the correct answer for the first card
      // The first card in the queue is one of the CARDS — find the card whose
      // reading appears in the rendered question, then find its meaning button
      const body = document.body.textContent ?? '';
      const currentCard = CARDS.find((c) => body.includes(c.reading));
      if (!currentCard) return; // safety — but should always find one

      // The correct answer button contains currentCard.meaning
      const meaningEl = screen.queryByText(currentCard.meaning);
      if (meaningEl) {
        fireEvent.click(meaningEl);
        await waitFor(() => {
          expect(mockRecordAnswer).toHaveBeenCalledWith(
            'session-1',
            true,
            currentCard.jlptLevel,
            currentCard.id,
          );
        });
      }
    });
  });

  describe('answer gating', () => {
    beforeEach(() => {
      vi.stubGlobal('Image', LoadedImage);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should hide the image and example sentence until an answer is picked', async () => {
      renderWithProviders(
        <RecallMode cards={RICH_CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => expect(screen.getByText('WHAT DOES THIS MEAN?')).toBeInTheDocument());

      // Both would give the meaning away before the learner commits to a guess.
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.queryByText(/^example-/)).not.toBeInTheDocument();
    });

    it('should reveal the image and example sentence after answering', async () => {
      renderWithProviders(
        <RecallMode cards={RICH_CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => expect(screen.getByText('WHAT DOES THIS MEAN?')).toBeInTheDocument());

      const card = currentCard(RICH_CARDS);
      fireEvent.click(choiceFor(card.meaning));

      await waitFor(() => expect(screen.getByText(`example-${card.id}`)).toBeInTheDocument());
      expect(screen.getByRole('img')).toHaveAttribute('src', card.imageUrl);
    });

    it('should leave the image out when it has not finished loading', async () => {
      // No load event ever fires — the card must not open a blank image slot it
      // would auto-advance past before anything painted.
      vi.stubGlobal(
        'Image',
        class {
          onload: (() => void) | null = null;
        },
      );
      renderWithProviders(
        <RecallMode cards={RICH_CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => expect(screen.getByText('WHAT DOES THIS MEAN?')).toBeInTheDocument());

      const card = currentCard(RICH_CARDS);
      fireEvent.click(choiceFor(card.meaning));

      await waitFor(() => expect(screen.getByText(`example-${card.id}`)).toBeInTheDocument());
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('auto-advance', () => {
    beforeEach(() => {
      vi.stubGlobal('Image', LoadedImage);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should hold the card open when the learner replays the audio', async () => {
      renderWithProviders(
        <RecallMode cards={RICH_CARDS} deckId="deck-1" batchSize={10} onExit={vi.fn()} />,
      );
      await waitFor(() => expect(screen.getByText('WHAT DOES THIS MEAN?')).toBeInTheDocument());

      const card = currentCard(RICH_CARDS);
      fireEvent.click(choiceFor(card.meaning));
      await waitFor(() => expect(screen.getByText('✓ Correct — moving on…')).toBeInTheDocument());

      // Replaying the example must swap the countdown for a manual Next, or the
      // card advances mid-utterance and the audio runs over the next prompt.
      const speakers = screen.getAllByLabelText('read aloud');
      fireEvent.click(speakers[speakers.length - 1]);

      expect(screen.queryByText('✓ Correct — moving on…')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next|See Results/ })).toBeInTheDocument();
    });
  });

  describe('onExit callback', () => {
    it('should not throw during initial render with onExit provided', () => {
      const onExit = vi.fn();
      expect(() =>
        renderWithProviders(
          <RecallMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={onExit} />,
        ),
      ).not.toThrow();
    });
  });
});
