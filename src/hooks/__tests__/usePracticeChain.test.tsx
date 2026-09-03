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
const mockLoadCards = vi.fn();
vi.mock('@/lib/supabase', () => ({
  dbDeckCardCount: (deckId: string) => mockCardCount(deckId),
  getCardProgressForUser: (userId: string, cardIds?: string[]) => mockProgress(userId, cardIds),
  loadCards: (deckId: string) => mockLoadCards(deckId),
}));

let isMemberAccount = false;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isMemberAccount }),
}));

const mockSentences = vi.fn();
vi.mock('@/services/api', () => ({
  fetchPracticeSentences: (deckId: string, memberId?: string) => mockSentences(deckId, memberId),
}));

const mockAward = vi.fn();
vi.mock('@/contexts/BuddyFriendshipContext', () => ({
  useBuddyFriendshipCtx: () => ({ awardFriendship: mockAward }),
}));

import type { Assignment } from '@/hooks/useAssignments';
import {
  usePracticeChain,
  useStartAssignmentQuest,
  useStartDailyPractice,
  useStartMixedPractice,
} from '@/hooks/usePracticeChain';
import type { GoalMode } from '@/lib/assignmentMastery';
import type { FocusPick } from '@/lib/dailyPractice';
import { readChainState, writeChainState } from '@/lib/practiceChain';
import { publishSessionEnd } from '@/lib/sessionSignal';
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
  mockLoadCards.mockReset().mockResolvedValue([]);
  mockSentences.mockReset().mockResolvedValue([]);
  mockAward.mockReset().mockResolvedValue(null);
  isMemberAccount = false;
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
    expect(result.current.starting).toBe(false);
  });

  it('reads progress for this deck only', async () => {
    const { result } = renderHook(() => useStartMixedPractice());
    await act(async () => {
      await result.current.start('d1', cards, { readingUnlocked: false, ttsReady: false });
    });

    expect(mockProgress).toHaveBeenCalledWith(
      'u1',
      cards.map((c) => c.id),
    );
  });

  const strongRows = (ids: string[]) =>
    ids.map((cardId) => ({
      cardId,
      correctCount: 3,
      wrongCount: 0,
      lastReviewedAt: null,
      nextReviewAt: '2020-01-01T00:00:00.000Z',
      intervalDays: 6,
      ease: 2.5,
    }));

  const sentence = (id: string) => ({ id, deck_id: 'd1' });

  it('climbs to Kotoba Bubble once the deck has sentences to play', async () => {
    mockProgress.mockResolvedValue(strongRows(cards.map((c) => c.id)));
    mockSentences.mockResolvedValue([sentence('s1'), sentence('s2'), sentence('s3')]);
    const { result } = renderHook(() => useStartMixedPractice());
    await act(async () => {
      await result.current.start('d1', cards, { readingUnlocked: false, ttsReady: false });
    });

    const legs = readChainState()?.legs?.map((leg) => leg.mode);
    expect(legs?.[legs.length - 1]).toBe('kotoba-bubble');
  });

  it('counts a member against their own sentence set, not the shared one', async () => {
    isMemberAccount = true;
    const { result } = renderHook(() => useStartMixedPractice());
    await act(async () => {
      await result.current.start('d1', cards, { readingUnlocked: false, ttsReady: false });
    });

    expect(mockSentences).toHaveBeenCalledWith('d1', 'u1');
  });

  it('reads the shared sentence set for an organizer', async () => {
    const { result } = renderHook(() => useStartMixedPractice());
    await act(async () => {
      await result.current.start('d1', cards, { readingUnlocked: false, ttsReady: false });
    });

    expect(mockSentences).toHaveBeenCalledWith('d1', undefined);
  });

  it('drops the Kotoba Bubble rung when the sentence read fails, not the button', async () => {
    mockProgress.mockResolvedValue(strongRows(cards.map((c) => c.id)));
    mockSentences.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useStartMixedPractice());
    await act(async () => {
      await result.current.start('d1', cards, { readingUnlocked: false, ttsReady: false });
    });

    const legs = readChainState()?.legs?.map((leg) => leg.mode);
    expect(legs).not.toContain('kotoba-bubble');
    expect(legs?.[legs.length - 1]).toBe('fill');
    expect(result.current.error).toBeNull();
    expect(push).toHaveBeenCalled();
  });

  it('surfaces a failed start instead of leaving the button busy forever', async () => {
    mockProgress.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useStartMixedPractice());
    await act(async () => {
      await result.current.start('d1', cards, { readingUnlocked: false, ttsReady: false });
    });

    expect(result.current.error).toBe('offline');
    expect(result.current.starting).toBe(false);
    expect(push).not.toHaveBeenCalled();
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

  it('lets the learner stop mid-chain from the handoff', async () => {
    writeChainState(questState());
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'study' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => result.current!.handoff!.onStop());

    expect(push).toHaveBeenCalledWith('/deck/d1');
    expect(readChainState()).toBeNull();
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

  it('still drops a hand-navigated chain after a hand-off', async () => {
    writeChainState(questState({ index: 0 }));
    const { result, rerender } = renderHook(
      ({ mode }: { mode: GoalMode }) => usePracticeChain({ deckId: 'd1', mode }),
      { initialProps: { mode: 'study' as GoalMode } },
    );
    await waitFor(() => expect(result.current).not.toBeNull());

    // Advancing exempts the mismatch it creates; landing on the new leg must
    // end that exemption, or nothing is guarded for the rest of the chain.
    act(() => result.current!.handoff!.onNext());
    rerender({ mode: 'recall' });
    await waitFor(() => expect(result.current).not.toBeNull());

    rerender({ mode: 'listen' });
    await waitFor(() => expect(readChainState()).toBeNull());
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

describe('useStartDailyPractice', () => {
  const cards = Array.from({ length: 12 }, (_, i) => card(`c${i}`));
  const focus = (assignment: FocusPick['assignment'] = null): FocusPick => ({
    deckId: 'd1',
    deckName: 'Week 1',
    emoji: '📘',
    cardCount: 12,
    readingUnlocked: false,
    assignment,
  });

  it('opens on the review leg when words are due', async () => {
    mockLoadCards.mockResolvedValue(cards);
    const { result } = renderHook(() => useStartDailyPractice());
    let ok = false;
    await act(async () => {
      ok = await result.current(focus(), 3, false);
    });

    expect(ok).toBe(true);
    expect(replace).toHaveBeenCalledWith('/review/today?chain=daily');
    const state = readChainState();
    expect(state?.kind).toBe('daily');
    expect(state?.legs?.[0].mode).toBe('review');
    expect(state?.legs?.[1]).toMatchObject({ mode: 'study', deckId: 'd1' });
  });

  it('goes straight to the deck when nothing is due', async () => {
    mockLoadCards.mockResolvedValue(cards);
    const { result } = renderHook(() => useStartDailyPractice());
    await act(async () => {
      await result.current(focus(), 0, false);
    });
    expect(replace).toHaveBeenCalledWith('/deck/d1/study?chain=daily');
  });

  it('carries the assignment only when the chain plays its deck', async () => {
    mockLoadCards.mockResolvedValue(cards);
    const goal = { id: 'a1', requiredMode: 'quiz', requiredAccuracy: 80 };
    const { result } = renderHook(() => useStartDailyPractice());
    await act(async () => {
      await result.current(focus(goal), 0, false);
    });
    expect(readChainState()).toMatchObject({ assignmentId: 'a1', requiredMode: 'quiz' });
    expect(readChainState()?.legs?.at(-1)).toMatchObject({ step: 'goal', mode: 'quiz' });

    window.sessionStorage.clear();
    mockLoadCards.mockResolvedValue([]);
    await act(async () => {
      await result.current(null, 2, false);
    });
    expect(readChainState()?.assignmentId).toBeNull();
  });

  it('reports nothing to play instead of navigating', async () => {
    const { result } = renderHook(() => useStartDailyPractice());
    let ok = true;
    await act(async () => {
      ok = await result.current(null, 0, false);
    });
    expect(ok).toBe(false);
    expect(push).not.toHaveBeenCalled();
    expect(readChainState()).toBeNull();
  });
});

describe('usePracticeChain — daily session', () => {
  const dailyState = (index = 0, assignmentId: string | null = null) => ({
    kind: 'daily' as const,
    deckId: 'd1',
    index,
    legs: [
      { step: 'review' as const, mode: 'review' as const },
      { step: 'practice' as const, mode: 'recall' as const, deckId: 'd1', cardIds: ['c1', 'c2'] },
      { step: 'practice' as const, mode: 'match' as const, deckId: 'd1', cardIds: ['c1', 'c2'] },
    ],
    cardIds: null,
    assignmentId,
    requiredMode: null,
    requiredAccuracy: null,
    cardCount: 12,
  });

  beforeEach(() => {
    search = new URLSearchParams('chain=daily');
  });

  it('runs the review leg from the deckless today page', async () => {
    writeChainState(dailyState());
    const { result } = renderHook(() => usePracticeChain({ deckId: null, mode: 'review' }));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.legs).toHaveLength(3);
    expect(result.current?.handoff?.label).toContain('Next');

    act(() => result.current?.handoff?.onNext());
    expect(replace).toHaveBeenCalledWith('/deck/d1/practice/recall?chain=daily');
    expect(readChainState()?.index).toBe(1);
  });

  it('hands each deck leg its own cards', async () => {
    writeChainState(dailyState(1));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'recall' }));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.cardIds).toEqual(['c1', 'c2']);
  });

  it('ignores a leg that belongs to another deck', async () => {
    writeChainState(dailyState(1));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd2', mode: 'recall' }));
    await waitFor(() => expect(readChainState()).toBeNull());
    expect(result.current).toBeNull();
  });

  it('sends the last leg home, and leaves to the hub', async () => {
    writeChainState(dailyState(2));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'match' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => result.current?.handoff?.onNext());
    expect(push).toHaveBeenCalledWith('/');
    expect(readChainState()).toBeNull();

    writeChainState(dailyState(2));
    const again = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'match' }));
    await waitFor(() => expect(again.result.current).not.toBeNull());
    act(() => again.result.current?.abandon());
    expect(push).toHaveBeenLastCalledWith('/review');
  });

  it('ends on the assignment verdict when it played one', async () => {
    writeChainState(dailyState(2, 'a1'));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'match' }));
    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => result.current?.handoff?.onNext());
    expect(result.current?.phase).toBe('finish');
  });

  it('marks only the last leg as the final handoff', async () => {
    writeChainState(dailyState(1));
    const mid = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'recall' }));
    await waitFor(() => expect(mid.result.current).not.toBeNull());
    expect(mid.result.current?.handoff?.final).toBe(false);
    mid.unmount();

    writeChainState(dailyState(2));
    const last = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'match' }));
    await waitFor(() => expect(last.result.current).not.toBeNull());
    expect(last.result.current?.handoff?.final).toBe(true);
  });

  it('pays the adventure hearts when the last leg is finished', async () => {
    writeChainState(dailyState(2));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'match' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => publishSessionEnd(12));
    expect(mockAward).not.toHaveBeenCalled();
    act(() => result.current?.handoff?.onNext());
    expect(mockAward).toHaveBeenCalledWith('adventure');
    expect(push).toHaveBeenCalledWith('/');
  });

  it('pays nothing when the learner quits out of the last leg', async () => {
    writeChainState(dailyState(2));
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'match' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => publishSessionEnd(12));
    act(() => result.current?.handoff?.onStop());
    expect(mockAward).not.toHaveBeenCalled();
  });

  it('pays nothing when a mixed lesson from the binder ends', async () => {
    search = new URLSearchParams('chain=mixed');
    writeChainState({
      kind: 'mixed',
      deckId: 'd1',
      index: 1,
      legs: [
        { step: 'practice', mode: 'recall' },
        { step: 'goal', mode: 'fill' },
      ],
      cardIds: ['c1', 'c2'],
      assignmentId: null,
      requiredMode: null,
      requiredAccuracy: null,
      cardCount: 12,
    });
    const { result } = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'fill' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => publishSessionEnd(12));
    act(() => result.current?.handoff?.onNext());
    expect(mockAward).not.toHaveBeenCalled();
  });

  it('pays nothing for a middle leg or a session too short to count', async () => {
    writeChainState(dailyState(1));
    const mid = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'recall' }));
    await waitFor(() => expect(mid.result.current).not.toBeNull());
    act(() => publishSessionEnd(12));
    act(() => mid.result.current?.handoff?.onNext());
    expect(mockAward).not.toHaveBeenCalled();
    mid.unmount();

    writeChainState(dailyState(2));
    const last = renderHook(() => usePracticeChain({ deckId: 'd1', mode: 'match' }));
    await waitFor(() => expect(last.result.current).not.toBeNull());
    act(() => publishSessionEnd(2));
    act(() => last.result.current?.handoff?.onNext());
    expect(mockAward).not.toHaveBeenCalled();
  });
});
