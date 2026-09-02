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

function answerCorrectly(): string {
  // Recall offers character tiles labelled by the character; Recognize offers
  // sounds labelled "Answer A: <romaji>" — which is on screen tells them apart.
  const asTiles = CHARS.filter((k) => screen.queryAllByRole('button', { name: k }).length > 0);
  const asked = asTiles.length
    ? CHARS.find((k) => screen.queryAllByText(romajiOf(k)).length > 0)!
    : CHARS.find((k) => screen.queryAllByText(k).length > 0)!;

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
      <ReviewQuest cards={[]} kanaChars={CHARS} recordKana={recordKana} onExit={vi.fn()} />,
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
      <ReviewQuest cards={cards(2)} kanaChars={CHARS} recordKana={recordKana} onExit={vi.fn()} />,
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
});
