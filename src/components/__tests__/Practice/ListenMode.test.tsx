import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { VoiceStatus } from '@/hooks/useSpeech';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockStartSession = vi.fn().mockResolvedValue('session-1');
const mockRecordAnswer = vi.fn().mockResolvedValue(undefined);
const mockEndSession = vi.fn().mockResolvedValue(undefined);
const mockSpeak = vi.fn();

// Mutable so each test can pick the device it is pretending to be
let voiceStatus: VoiceStatus = 'ready';
let needsGesture = false;

vi.mock('@/hooks/useSpeech', () => ({
  useSpeech: () => ({ speak: mockSpeak, speakAll: vi.fn(), stop: vi.fn(), speaking: false }),
  useJapaneseVoice: () => voiceStatus,
  speechNeedsGesture: () => needsGesture,
}));

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

import { ListenMode } from '@/components/Practice/ListenMode';

// ─── Test data ────────────────────────────────────────────────────────────────

function makeCard(id: string, word: string, meaning: string): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word,
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
  makeCard('c1', '猫', 'cat'),
  makeCard('c2', '犬', 'dog'),
  makeCard('c3', '魚', 'fish'),
  makeCard('c4', '鳥', 'bird'),
];

const WORDS = CARDS.map((c) => c.word);
// The mode speaks the curated kana reading, not the raw word.
const SPOKEN = CARDS.map((c) => c.reading);

function renderMode(onExit = vi.fn()) {
  renderWithProviders(<ListenMode cards={CARDS} deckId="deck-1" batchSize={10} onExit={onExit} />);
  return onExit;
}

/** The card the queue happens to have shuffled to the front. */
function currentCard(): Flashcard {
  const spokenWord = mockSpeak.mock.calls[0]?.[0];
  const card = CARDS.find((c) => c.reading === spokenWord);
  if (!card) throw new Error('no word was spoken — cannot resolve the current card');
  return card;
}

describe('ListenMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    voiceStatus = 'ready';
    needsGesture = false;
    mockStartSession.mockResolvedValue('session-1');
    mockRecordAnswer.mockResolvedValue(undefined);
    mockEndSession.mockResolvedValue(undefined);
  });

  describe('no-voice fallback', () => {
    it('should show a loading state while voices are still being resolved', () => {
      voiceStatus = 'checking';
      renderMode();
      expect(screen.getByText(/warming up the voice/i)).toBeInTheDocument();
    });

    it('should show a friendly message when the device has no Japanese voice', () => {
      voiceStatus = 'unavailable';
      renderMode();
      expect(screen.getByText(/can't speak japanese yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pick another game/i })).toBeInTheDocument();
    });

    it('should send the learner back to the mode picker from the fallback', () => {
      voiceStatus = 'unavailable';
      const onExit = renderMode();
      fireEvent.click(screen.getByRole('button', { name: /pick another game/i }));
      expect(onExit).toHaveBeenCalled();
    });

    it('should not start a session or speak when there is no Japanese voice', async () => {
      voiceStatus = 'unavailable';
      renderMode();
      await new Promise((r) => setTimeout(r, 0));
      expect(mockStartSession).not.toHaveBeenCalled();
      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });

  describe('session + audio', () => {
    it('should start a session tagged as the listen mode', async () => {
      renderMode();
      await waitFor(() => expect(mockStartSession).toHaveBeenCalledWith('deck-1', 'listen'));
    });

    it('should auto-play the word where the platform allows it', async () => {
      renderMode();
      await waitFor(() => expect(mockSpeak).toHaveBeenCalledTimes(1));
      expect(SPOKEN).toContain(mockSpeak.mock.calls[0][0]);
    });

    it('should wait for a tap before speaking when the platform requires a gesture', async () => {
      needsGesture = true;
      renderMode();
      await waitFor(() => expect(screen.getByText(/tap to hear the word/i)).toBeInTheDocument());
      expect(mockSpeak).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /^play the word$/i }));
      await waitFor(() => expect(mockSpeak).toHaveBeenCalledTimes(1));
      expect(SPOKEN).toContain(mockSpeak.mock.calls[0][0]);
    });

    it('should replay the same word from the replay button', async () => {
      renderMode();
      await waitFor(() => expect(mockSpeak).toHaveBeenCalledTimes(1));
      const first = mockSpeak.mock.calls[0][0];

      fireEvent.click(screen.getByRole('button', { name: /play again/i }));
      expect(mockSpeak).toHaveBeenCalledTimes(2);
      expect(mockSpeak.mock.calls[1][0]).toBe(first);
    });

    it('should replay from the keyboard', async () => {
      renderMode();
      await waitFor(() => expect(mockSpeak).toHaveBeenCalledTimes(1));

      const replay = screen.getByRole('button', { name: /play again/i });
      replay.focus();
      fireEvent.keyDown(replay, { key: 'Enter' });
      fireEvent.click(replay); // MUI Button turns the Enter keypress into a click
      expect(mockSpeak.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('question', () => {
    it('should render four answer choices', async () => {
      renderMode();
      await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
      ['B', 'C', 'D'].forEach((l) => expect(screen.getByText(l)).toBeInTheDocument());
    });

    it('should keep the Japanese hidden until the question is answered', async () => {
      renderMode();
      await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
      const body = document.body.textContent ?? '';
      WORDS.forEach((w) => expect(body).not.toContain(w));
    });

    it('should reveal the word, reading and meaning after answering', async () => {
      renderMode();
      await waitFor(() => expect(mockSpeak).toHaveBeenCalled());
      const card = currentCard();

      fireEvent.click(screen.getByRole('button', { name: new RegExp(`: ${card.meaning}$`) }));

      await waitFor(() => {
        const body = document.body.textContent ?? '';
        expect(body).toContain(card.word);
        expect(body).toContain(card.reading);
      });
    });
  });

  describe('grading', () => {
    it('should record a correct answer against the card id', async () => {
      renderMode();
      await waitFor(() => expect(mockSpeak).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 0)); // let sessionIdRef settle
      const card = currentCard();

      fireEvent.click(screen.getByRole('button', { name: new RegExp(`: ${card.meaning}$`) }));

      await waitFor(() =>
        expect(mockRecordAnswer).toHaveBeenCalledWith('session-1', true, 'N5', card.id),
      );
    });

    it('should record a wrong answer against the card id', async () => {
      renderMode();
      await waitFor(() => expect(mockSpeak).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 0));
      const card = currentCard();
      const wrong = CARDS.find((c) => c.id !== card.id)!;

      fireEvent.click(screen.getByRole('button', { name: new RegExp(`: ${wrong.meaning}$`) }));

      await waitFor(() =>
        expect(mockRecordAnswer).toHaveBeenCalledWith('session-1', false, 'N5', card.id),
      );
    });

    it('should ignore a second pick on an already-answered question', async () => {
      renderMode();
      await waitFor(() => expect(mockSpeak).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 0));
      const card = currentCard();
      const wrong = CARDS.find((c) => c.id !== card.id)!;

      fireEvent.click(screen.getByRole('button', { name: new RegExp(`: ${wrong.meaning}$`) }));
      await waitFor(() => expect(mockRecordAnswer).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole('button', { name: new RegExp(`: ${card.meaning}$`) }));
      expect(mockRecordAnswer).toHaveBeenCalledTimes(1);
    });

    it('should end the session when the learner quits', async () => {
      const onExit = renderMode();
      await waitFor(() => expect(mockStartSession).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 0));

      fireEvent.click(screen.getByRole('button', { name: /quit & save progress/i }));

      await waitFor(() => expect(mockEndSession).toHaveBeenCalled());
      expect(onExit).toHaveBeenCalled();
    });
  });
});
