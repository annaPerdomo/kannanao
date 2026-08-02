import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const push = vi.fn();
const replace = vi.fn();
let search = new URLSearchParams('chain=assignment');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
  useSearchParams: () => search,
}));

const mockCardCount = vi.fn();
const mockProgress = vi.fn();
vi.mock('@/lib/supabase', () => ({
  dbDeckCardCount: (deckId: string) => mockCardCount(deckId),
  getCardProgressForUser: (userId: string) => mockProgress(userId),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

import type { Assignment } from '@/hooks/useAssignments';
import {
  usePracticeChain,
  useStartAssignmentQuest,
  useStartMixedPractice,
} from '@/hooks/usePracticeChain';
import { readChainState, writeChainState } from '@/lib/practiceChain';
import type { Flashcard } from '@/types/flashcard';

const assignment = (overrides: Partial<Assignment> = {}): Assignment =>
  ({
    id: 'a1',
    deck_id: 'd1',
    required_mode: 'quiz',
    required_accuracy: 80,
    ...overrides,
  }) as Assignment;

const questState = (overrides: Record<string, unknown> = {}) => ({
  kind: 'assignment' as const,
  assignmentId: 'a1',
  deckId: 'd1',
  requiredMode: 'quiz',
  requiredAccuracy: 80,
  cardCount: 12,
  legs: null,
  cardIds: null,
  index: 0,
  ...overrides,
});

const card = (id: string): Flashcard =>
  ({
    id,
    word: '犬',
    reading: 'いぬ',
    meaning: 'dog',
    example_jp: '犬がすきです。',
    example_en: 'I like dogs.',
    deckId: 'd1',
    mainViewMode: 'hiragana',
    cardType: 'word',
    position: 0,
    image_query: '',
  }) as Flashcard;

beforeEach(() => {
  window.sessionStorage.clear();
  push.mockClear();
  replace.mockClear();
  mockCardCount.mockReset().mockResolvedValue(12);
  mockProgress.mockReset().mockResolvedValue([]);
  search = new URLSearchParams('chain=assignment');
});

describe('useStartAssignmentQuest', () => {
  it('stores the quest and opens the warm-up leg', () => {
    const { result } = renderHook(() => useStartAssignmentQuest());
    act(() => result.current(assignment(), { id: 'd1', cardCount: 12 } as never));

    expect(push).toHaveBeenCalledWith('/deck/d1/study?chain=assignment');
    expect(readChainState()).toMatchObject({ assignmentId: 'a1', cardCount: 12, index: 0 });
  });

  it('leaves the card count for the leg page when the deck is not loaded', () => {
    const { result } = renderHook(() => useStartAssignmentQuest());
    act(() => result.current(assignment()));
    expect(readChainState()?.cardCount).toBeNull();
  });

  // A goal with no deck route (cross-deck review) or a mode the deck can't run
  // would strand the learner mid-quest, so it never starts one.
  it('falls back to the deck page for an unroutable goal', () => {
    const { result } = renderHook(() => useStartAssignmentQuest());
    act(() => result.current(assignment({ required_mode: 'review' })));

    expect(push).toHaveBeenCalledWith('/deck/d1');
    expect(readChainState()).toBeNull();
  });

  it('falls back to the deck page when Reading is off for the deck', () => {
    const { result } = renderHook(() => useStartAssignmentQuest());
    act(() =>
      result.current(assignment({ required_mode: 'reading' }), {
        id: 'd1',
        cardCount: 12,
        readingPractice: false,
      } as never),
    );

    expect(push).toHaveBeenCalledWith('/deck/d1');
    expect(readChainState()).toBeNull();
  });
});

describe('useStartMixedPractice', () => {
  const cards = Array.from({ length: 20 }, (_, i) => card(`c${i}`));

  it('plans the session once and opens its first leg', async () => {
    const { result } = renderHook(() => useStartMixedPractice());
    await act(async () => {
      await result.current.start('d1', cards, { readingUnlocked: false, ttsReady: false });
    });

    // Every card is new, so the session opens on flashcards.
    expect(push).toHaveBeenCalledWith('/deck/d1/study?chain=mixed');
    const state = readChainState();
    expect(state?.kind).toBe('mixed');
    expect(state?.legs?.map((leg) => leg.mode)).toEqual(['study', 'recall', 'match']);
    // The plan is carried, not re-derived: it depends on this learner's progress.
    expect(state?.cardIds).toHaveLength(12);
    expect(state?.assignmentId).toBeNull();
  });

  it('goes nowhere on a deck too small to practise', async () => {
    const { result } = renderHook(() => useStartMixedPractice());
    await act(async () => {
      await result.current.start('d1', [card('only')], {
        readingUnlocked: false,
        ttsReady: false,
      });
    });

    expect(push).not.toHaveBeenCalled();
    expect(readChainState()).toBeNull();
  });
});

describe('usePracticeChain', () => {
  it('is inactive without the chain marker in the URL', async () => {
    search = new URLSearchParams();
    writeChainState(questState());
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'study' }));
    await waitFor(() => expect(result.current).toBeNull());
    // A quest the learner navigated away from is left intact, not destroyed.
    expect(readChainState()).not.toBeNull();
  });

  it('ignores a chain of the other kind', async () => {
    search = new URLSearchParams('chain=mixed');
    writeChainState(questState());
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'study' }));

    await waitFor(() => expect(readChainState()).toBeNull());
    expect(result.current).toBeNull();
  });

  it('runs the warm-up leg with the full plan', async () => {
    writeChainState(questState());
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'study' }));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.legs.map((l) => l.step)).toEqual([
      'warmup',
      'practice',
      'practice',
      'goal',
    ]);
    expect(result.current?.index).toBe(0);
    expect(result.current?.handoff?.label).toBe('Next: Practice');
  });

  it('advances to the next leg on handoff', async () => {
    writeChainState(questState());
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'study' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => result.current!.handoff!.onNext());

    expect(replace).toHaveBeenCalledWith('/deck/d1/practice/recall?chain=assignment');
    expect(readChainState()?.index).toBe(1);
  });

  it('shows the finish screen instead of advancing past the goal leg', async () => {
    writeChainState(questState({ index: 3 }));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'quiz' }));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.handoff?.label).toBe('See how you did');

    act(() => result.current!.handoff!.onNext());

    expect(result.current?.phase).toBe('finish');
    expect(replace).not.toHaveBeenCalled();
  });

  it('remounts the goal leg on retry', async () => {
    writeChainState(questState({ index: 3 }));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'quiz' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => result.current!.handoff!.onNext());
    act(() => result.current!.retry());

    expect(result.current?.phase).toBe('play');
    expect(result.current?.attempt).toBe(1);
  });

  it('drops a chain whose stored step does not match the page', async () => {
    writeChainState(questState({ index: 0 }));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'listen' }));

    await waitFor(() => expect(readChainState()).toBeNull());
    expect(result.current).toBeNull();
  });

  it('drops a chain stored for another deck', async () => {
    writeChainState(questState({ deckId: 'other' }));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'study' }));

    await waitFor(() => expect(readChainState()).toBeNull());
    expect(result.current).toBeNull();
  });

  it('resolves the deck size once and keeps it for later legs', async () => {
    writeChainState(questState({ cardCount: null }));
    mockCardCount.mockResolvedValue(3);
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'study' }));

    await waitFor(() => expect(result.current).not.toBeNull());
    // Three cards is under the threshold for a Match grid, so that leg is dropped.
    expect(result.current?.legs.map((l) => l.mode)).toEqual(['study', 'recall', 'quiz']);
    expect(readChainState()?.cardCount).toBe(3);
    expect(mockCardCount).toHaveBeenCalledTimes(1);
  });

  it('gives up quietly when the deck can no longer be read', async () => {
    writeChainState(questState({ cardCount: null }));
    mockCardCount.mockResolvedValue(null);
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'study' }));

    await waitFor(() => expect(readChainState()).toBeNull());
    expect(result.current).toBeNull();
  });

  it('abandoning clears the chain and returns to the deck', async () => {
    writeChainState(questState());
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'study' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => result.current!.abandon());

    expect(readChainState()).toBeNull();
    expect(push).toHaveBeenCalledWith('/deck/d1');
  });
});

describe('a mixed session running its legs', () => {
  const mixedState = (overrides: Record<string, unknown> = {}) => ({
    kind: 'mixed' as const,
    deckId: 'd1',
    index: 0,
    legs: [
      { step: 'practice' as const, mode: 'recall' as const },
      { step: 'goal' as const, mode: 'fill' as const },
    ],
    cardIds: ['c1', 'c2'],
    assignmentId: null,
    requiredMode: null,
    requiredAccuracy: null,
    cardCount: 12,
    ...overrides,
  });

  beforeEach(() => {
    search = new URLSearchParams('chain=mixed');
  });

  it('names the next game rather than the step', async () => {
    writeChainState(mixedState());
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'recall' }));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.handoff?.label).toBe('Next: Fill in Blank');
  });

  it('runs the stored plan without asking the deck for one', async () => {
    writeChainState(mixedState());
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'recall' }));

    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => result.current!.handoff!.onNext());

    expect(replace).toHaveBeenCalledWith('/deck/d1/practice/fill?chain=mixed');
    expect(mockCardCount).not.toHaveBeenCalled();
  });

  // Nothing to grade: the mode's celebration screen keeps its ordinary way out.
  it('offers no handoff on the last leg', async () => {
    writeChainState(mixedState({ index: 1 }));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'fill' }));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.handoff).toBeNull();
    expect(result.current?.phase).toBe('play');
  });
});
