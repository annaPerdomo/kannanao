import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as SupabaseLib from '@/lib/supabase';

type SupabaseModule = typeof SupabaseLib;

const startSession = vi.fn(async () => 'sess1');
const recordAnswer = vi.fn(async () => {});
const endSession = vi.fn(async () => {});

vi.mock('@/hooks/useProgress', () => ({
  XP_PER_WRONG: 2,
  useProgress: () => ({
    startSession,
    recordAnswer,
    endSession,
    addBonusXp: vi.fn(async () => {}),
    openDailyChest: vi.fn(async () => true),
    progress: { last_chest_date: null },
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({ awardFriendship: vi.fn(async () => null) }),
}));
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak: vi.fn() }) }));
vi.mock('@/components/SpeakButton', () => ({ SpeakButton: () => null }));
vi.mock('@/components/FlipStudy', () => ({
  __esModule: true,
  default: ({ controller }: { controller: { onComplete: () => void } }) => (
    <button type="button" onClick={controller.onComplete}>
      finish warm-up
    </button>
  ),
}));
vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual<SupabaseModule>('@/lib/supabase');
  return { ...actual, getDueCount: vi.fn(async () => 0) };
});

import { KANA_XP, romajiOf } from '@/components/KanaJourney';
import { ReviewQuest } from '@/components/ReviewQuest';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Flashcard } from '@/types/flashcard';

const CHARS = ['ぬ', 'ね', 'ま'];

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/** Characters the learner has met before — no meet card, straight to the drill. */
const seen = (chars: string[]) =>
  new Map(
    chars.map((k) => [
      k,
      {
        correctCount: 1,
        wrongCount: 4,
        intervalDays: 0,
        ease: 2.5,
        lastReviewedAt: daysAgo(9),
        nextReviewAt: daysAgo(8),
      },
    ]),
  );

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

function answerCorrectly(chars: string[] = CHARS): string {
  // Recall offers character tiles labelled by the character; Recognize offers
  // sounds labelled "Answer A: <romaji>" — which is on screen tells them apart.
  const asTiles = chars.filter((k) => screen.queryAllByRole('button', { name: k }).length > 0);
  const asked = asTiles.length
    ? chars.find((k) => screen.queryAllByText(romajiOf(k)).length > 0)!
    : chars.find((k) => screen.queryAllByText(k).length > 0)!;

  fireEvent.click(
    asTiles.length
      ? screen.getByRole('button', { name: asked })
      : screen.getByRole('button', { name: new RegExp(`: ${romajiOf(asked)}$`) }),
  );
  act(() => {
    vi.advanceTimersByTime(1200);
  });
  return asked;
}

describe('ReviewQuest — the kana node', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    startSession.mockClear();
    recordAnswer.mockClear();
    endSession.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  async function renderKanaOnlyQuest(recordKana: (k: string, c: boolean) => Promise<void>) {
    renderWithProviders(
      <ReviewQuest
        cards={[]}
        kanaChars={CHARS}
        kanaProgress={seen(CHARS)}
        recordKana={recordKana}
        onExit={vi.fn()}
      />,
    );
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: /continue|let's go/i }));
  }

  it('runs a kana-only quest inside ONE review session', async () => {
    await renderKanaOnlyQuest(vi.fn(async () => {}));
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(startSession).toHaveBeenCalledWith(null, 'review');
  });

  it('writes BOTH the session XP and the character row for every answer', async () => {
    const recordKana = vi.fn(async () => {});
    await renderKanaOnlyQuest(recordKana);

    const asked = answerCorrectly();

    expect(recordKana).toHaveBeenCalledWith(asked, true);
    // No cardId: a character has no card_progress row to advance.
    expect(recordAnswer).toHaveBeenCalledWith('sess1', true, undefined, undefined, KANA_XP);
  });

  it('waits for the kana writes to land before ending the session', async () => {
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const recordKana = vi.fn(() => pending);
    await renderKanaOnlyQuest(recordKana);

    for (let i = 0; i < CHARS.length * 2; i += 1) answerCorrectly();
    await act(async () => {});

    // endSession re-reads the session XP; a write still in flight reads it stale.
    expect(recordKana).toHaveBeenCalledTimes(CHARS.length * 2);
    expect(endSession).not.toHaveBeenCalled();

    release();
    await act(async () => {});
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it('follows the warm-up in a mixed quest, behind its own intro', async () => {
    const recordKana = vi.fn(async () => {});
    renderWithProviders(
      <ReviewQuest
        cards={cards(2)}
        kanaChars={CHARS}
        kanaProgress={seen(CHARS)}
        recordKana={recordKana}
        onExit={vi.fn()}
      />,
    );
    await act(async () => {});

    expect(screen.queryByText(/brush up/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /finish warm-up/i }));

    fireEvent.click(screen.getByRole('button', { name: /continue|let's go/i }));
    const asked = answerCorrectly();
    expect(recordKana).toHaveBeenCalledWith(asked, true);
  });

  it('renders nothing when there is neither a card nor a weak character', () => {
    const { container } = renderWithProviders(
      <ReviewQuest cards={[]} kanaChars={[]} recordKana={vi.fn(async () => {})} onExit={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(startSession).not.toHaveBeenCalled();
  });

  it('drops the kana node when nothing can write the characters back', () => {
    const { container } = renderWithProviders(
      <ReviewQuest cards={[]} kanaChars={CHARS} onExit={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
  describe('meeting a character for the first time', () => {
    const NEW_CHARS = ['あ', 'い', 'う'];

    async function renderFirstMeeting(recordKana: (k: string, c: boolean) => Promise<void>) {
      renderWithProviders(
        <ReviewQuest
          cards={[]}
          kanaChars={NEW_CHARS}
          kanaProgress={new Map()}
          recordKana={recordKana}
          onExit={vi.fn()}
        />,
      );
      await act(async () => {});
      fireEvent.click(screen.getByRole('button', { name: /continue|let's go/i }));
    }

    it('shows the character before asking about it', async () => {
      await renderFirstMeeting(vi.fn(async () => {}));
      expect(screen.getByText('Meet this character')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Got it' })).toBeInTheDocument();
    });

    it('asks only once every new character has been met', async () => {
      await renderFirstMeeting(vi.fn(async () => {}));
      for (let i = 0; i < NEW_CHARS.length; i += 1) {
        fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
      }
      expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
      expect(screen.getByText(/which sound|どの おと/i)).toBeInTheDocument();
    });

    it('credits the easier row-mates of a character met and answered right', async () => {
      const recordKana = vi.fn(async (_kana: string, _correct: boolean) => {});
      await renderFirstMeeting(recordKana);
      for (let i = 0; i < NEW_CHARS.length; i += 1) {
        fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
      }

      // The quest map also prints あ, so read the character off the glyph itself.
      const asked = screen.getByRole('button', { name: 'Tap to hear it' }).textContent!;
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`: ${romajiOf(asked)}$`) }));
      act(() => {
        vi.advanceTimersByTime(1200);
      });

      expect(recordKana).toHaveBeenCalledWith(asked, true);
      expect(recordKana.mock.calls.length).toBeGreaterThan(1);
      expect(recordKana.mock.calls.every((call) => call[1] === true)).toBe(true);
    });
  });
});
