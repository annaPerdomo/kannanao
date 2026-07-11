import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGameSession } from '@/hooks/useGameSession';

// ─── Mocks ───────────────────────────────────────────────────────────────────

interface SessionSummary {
  cardsStudied: number;
  cardsCorrect: number;
  durationSecs: number;
}

const mockStartSession = vi.fn(async (_deckId: string | null, _mode: string) => 'sess-1');
const mockRecordAnswer = vi.fn(
  async (_sessionId: string, _correct: boolean, _jlpt?: string, _cardId?: string) => {},
);
const mockEndSession = vi.fn(async (_id: string, _summary: SessionSummary) => {});
const mockAddBonusXp = vi.fn(async (_amount: number) => {});
const mockTriggerXpEarned = vi.fn((_amount: number) => {});

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    startSession: mockStartSession,
    recordAnswer: mockRecordAnswer,
    endSession: mockEndSession,
    addBonusXp: mockAddBonusXp,
  }),
  XP_PER_WRONG: 2,
}));

vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ triggerXpEarned: mockTriggerXpEarned }),
}));

describe('useGameSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts one session on mount and only once', async () => {
    const { rerender } = renderHook(() => useGameSession('word-match'));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
    expect(mockStartSession).toHaveBeenCalledWith(null, 'word-match');
    rerender();
    expect(mockStartSession).toHaveBeenCalledTimes(1);
  });

  it('forwards cardId to recordAnswer so card-based games advance the SRS', async () => {
    const { result } = renderHook(() => useGameSession('kana-build'));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.answer(true, 'N5', 'card-42');
    });

    expect(mockRecordAnswer).toHaveBeenCalledWith('sess-1', true, 'N5', 'card-42');
    // Correct answer earns level-scaled XP (not the wrong-answer constant).
    expect(mockTriggerXpEarned).toHaveBeenCalledTimes(1);
    expect(mockTriggerXpEarned.mock.calls[0][0]).toBeGreaterThan(2);
  });

  it('passes cardId as undefined for grammar games (no SRS write)', async () => {
    const { result } = renderHook(() => useGameSession('question-quiz'));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.answer(false);
    });

    expect(mockRecordAnswer).toHaveBeenCalledWith('sess-1', false, undefined, undefined);
    // Wrong answer earns the flat consolation XP.
    expect(mockTriggerXpEarned).toHaveBeenCalledWith(2);
  });

  it('closes the session with accumulated counts on finish', async () => {
    const { result } = renderHook(() => useGameSession('word-match'));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.answer(true, undefined, 'c1');
      await result.current.answer(false, undefined, 'c2');
      await result.current.finish();
    });

    expect(mockEndSession).toHaveBeenCalledTimes(1);
    const [id, summary] = mockEndSession.mock.calls[0];
    expect(id).toBe('sess-1');
    expect(summary.cardsStudied).toBe(2);
    expect(summary.cardsCorrect).toBe(1);
  });

  it('carries the combo: exposes the run count and awards the flat bonus', async () => {
    const { result } = renderHook(() => useGameSession('word-match'));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.answer(true, undefined, 'c1');
      await result.current.answer(true, undefined, 'c2');
      await result.current.answer(true, undefined, 'c3'); // 3-in-a-row → +5
    });

    expect(result.current.comboCount).toBe(3);
    expect(mockAddBonusXp).toHaveBeenCalledWith(5);
  });

  it('resets the combo on a wrong answer', async () => {
    const { result } = renderHook(() => useGameSession('word-match'));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.answer(true, undefined, 'c1');
      await result.current.answer(true, undefined, 'c2');
      await result.current.answer(false, undefined, 'c3');
    });

    expect(result.current.comboCount).toBe(0);
    expect(mockAddBonusXp).not.toHaveBeenCalled();
  });
});
