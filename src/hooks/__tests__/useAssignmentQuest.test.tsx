import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const push = vi.fn();
const replace = vi.fn();
let search = new URLSearchParams('quest=assignment');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
  useSearchParams: () => search,
}));

const mockCardCount = vi.fn();
vi.mock('@/lib/supabase', () => ({
  dbDeckCardCount: (deckId: string) => mockCardCount(deckId),
}));

import { useAssignmentQuest, useStartAssignmentQuest } from '@/hooks/useAssignmentQuest';
import type { Assignment } from '@/hooks/useAssignments';
import { readQuestState, writeQuestState } from '@/lib/assignmentQuest';

const assignment = (overrides: Partial<Assignment> = {}): Assignment =>
  ({
    id: 'a1',
    deck_id: 'd1',
    required_mode: 'quiz',
    required_accuracy: 80,
    ...overrides,
  }) as Assignment;

const questState = (overrides: Record<string, unknown> = {}) => ({
  assignmentId: 'a1',
  deckId: 'd1',
  requiredMode: 'quiz',
  requiredAccuracy: 80,
  cardCount: 12,
  index: 0,
  ...overrides,
});

beforeEach(() => {
  window.sessionStorage.clear();
  push.mockClear();
  replace.mockClear();
  mockCardCount.mockReset().mockResolvedValue(12);
  search = new URLSearchParams('quest=assignment');
});

describe('useStartAssignmentQuest', () => {
  it('stores the quest and opens the warm-up leg', () => {
    const { result } = renderHook(() => useStartAssignmentQuest());
    act(() => result.current(assignment(), { id: 'd1', cardCount: 12 } as never));

    expect(push).toHaveBeenCalledWith('/deck/d1/study?quest=assignment');
    expect(readQuestState()).toMatchObject({ assignmentId: 'a1', cardCount: 12, index: 0 });
  });

  it('leaves the card count for the leg page when the deck is not loaded', () => {
    const { result } = renderHook(() => useStartAssignmentQuest());
    act(() => result.current(assignment()));
    expect(readQuestState()?.cardCount).toBeNull();
  });

  // A goal with no deck route (cross-deck review) or a mode the deck can't run
  // would strand the learner mid-quest, so it never starts one.
  it('falls back to the deck page for an unroutable goal', () => {
    const { result } = renderHook(() => useStartAssignmentQuest());
    act(() => result.current(assignment({ required_mode: 'review' })));

    expect(push).toHaveBeenCalledWith('/deck/d1');
    expect(readQuestState()).toBeNull();
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
    expect(readQuestState()).toBeNull();
  });
});

describe('useAssignmentQuest', () => {
  it('is inactive without the quest marker in the URL', async () => {
    search = new URLSearchParams();
    writeQuestState(questState());
    const { result } = renderHook(() => useAssignmentQuest({ deckId: 'd1', mode: 'study' }));
    await waitFor(() => expect(result.current).toBeNull());
    // A quest the learner navigated away from is left intact, not destroyed.
    expect(readQuestState()).not.toBeNull();
  });

  it('runs the warm-up leg with the full plan', async () => {
    writeQuestState(questState());
    const { result } = renderHook(() => useAssignmentQuest({ deckId: 'd1', mode: 'study' }));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.legs.map((l) => l.step)).toEqual(['warmup', 'practice', 'goal']);
    expect(result.current?.index).toBe(0);
    expect(result.current?.handoff.label).toBe('Next: Practice');
  });

  it('advances to the next leg on handoff', async () => {
    writeQuestState(questState());
    const { result } = renderHook(() => useAssignmentQuest({ deckId: 'd1', mode: 'study' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => result.current!.handoff.onNext());

    expect(replace).toHaveBeenCalledWith('/deck/d1/practice/match?quest=assignment');
    expect(readQuestState()?.index).toBe(1);
  });

  it('shows the finish screen instead of advancing past the goal leg', async () => {
    writeQuestState(questState({ index: 2 }));
    const { result } = renderHook(() => useAssignmentQuest({ deckId: 'd1', mode: 'quiz' }));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.handoff.label).toBe('See how you did');

    act(() => result.current!.handoff.onNext());

    expect(result.current?.phase).toBe('finish');
    expect(replace).not.toHaveBeenCalled();
  });

  it('remounts the goal leg on retry', async () => {
    writeQuestState(questState({ index: 2 }));
    const { result } = renderHook(() => useAssignmentQuest({ deckId: 'd1', mode: 'quiz' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => result.current!.handoff.onNext());
    act(() => result.current!.retry());

    expect(result.current?.phase).toBe('play');
    expect(result.current?.attempt).toBe(1);
  });

  it('drops a quest whose stored step does not match the page', async () => {
    writeQuestState(questState({ index: 0 }));
    const { result } = renderHook(() => useAssignmentQuest({ deckId: 'd1', mode: 'listen' }));

    await waitFor(() => expect(readQuestState()).toBeNull());
    expect(result.current).toBeNull();
  });

  it('drops a quest stored for another deck', async () => {
    writeQuestState(questState({ deckId: 'other' }));
    const { result } = renderHook(() => useAssignmentQuest({ deckId: 'd1', mode: 'study' }));

    await waitFor(() => expect(readQuestState()).toBeNull());
    expect(result.current).toBeNull();
  });

  it('resolves the deck size once and keeps it for later legs', async () => {
    writeQuestState(questState({ cardCount: null }));
    mockCardCount.mockResolvedValue(3);
    const { result } = renderHook(() => useAssignmentQuest({ deckId: 'd1', mode: 'study' }));

    await waitFor(() => expect(result.current).not.toBeNull());
    // Three cards is under the threshold, so the middle leg is dropped.
    expect(result.current?.legs.map((l) => l.step)).toEqual(['warmup', 'goal']);
    expect(readQuestState()?.cardCount).toBe(3);
    expect(mockCardCount).toHaveBeenCalledTimes(1);
  });

  it('gives up quietly when the deck can no longer be read', async () => {
    writeQuestState(questState({ cardCount: null }));
    mockCardCount.mockResolvedValue(null);
    const { result } = renderHook(() => useAssignmentQuest({ deckId: 'd1', mode: 'study' }));

    await waitFor(() => expect(readQuestState()).toBeNull());
    expect(result.current).toBeNull();
  });

  it('abandoning clears the quest and returns to the deck', async () => {
    writeQuestState(questState());
    const { result } = renderHook(() => useAssignmentQuest({ deckId: 'd1', mode: 'study' }));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => result.current!.abandon());

    expect(readQuestState()).toBeNull();
    expect(push).toHaveBeenCalledWith('/deck/d1');
  });
});
