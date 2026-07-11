import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCombo } from '@/hooks/useCombo';

const mockTriggerXpEarned = vi.fn((_amount: number) => {});
vi.mock('@/contexts/XpAnimationContext', () => ({
  useXpAnimation: () => ({ triggerXpEarned: mockTriggerXpEarned }),
}));

describe('useCombo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('counts up on correct and resets on wrong', () => {
    const addBonusXp = vi.fn();
    const { result } = renderHook(() => useCombo(addBonusXp));

    act(() => void result.current.onAnswer(true));
    act(() => void result.current.onAnswer(true));
    expect(result.current.count).toBe(2);

    act(() => void result.current.onAnswer(false));
    expect(result.current.count).toBe(0);
  });

  it('awards each threshold bonus exactly once over a run', () => {
    const addBonusXp = vi.fn();
    const { result } = renderHook(() => useCombo(addBonusXp));

    act(() => {
      for (let i = 0; i < 12; i++) result.current.onAnswer(true);
    });

    // +5 at 3, +10 at 5, +25 at 10 — three awards, no more past the top.
    expect(addBonusXp.mock.calls.map((c) => c[0])).toEqual([5, 10, 25]);
    expect(mockTriggerXpEarned.mock.calls.map((c) => c[0])).toEqual([5, 10, 25]);
  });

  it('does not award any bonus on a wrong answer', () => {
    const addBonusXp = vi.fn();
    const { result } = renderHook(() => useCombo(addBonusXp));
    act(() => void result.current.onAnswer(false));
    expect(addBonusXp).not.toHaveBeenCalled();
  });

  it('re-arms the thresholds after a reset (new run earns them again)', () => {
    const addBonusXp = vi.fn();
    const { result } = renderHook(() => useCombo(addBonusXp));

    act(() => {
      result.current.onAnswer(true);
      result.current.onAnswer(true);
      result.current.onAnswer(true); // fires +5
      result.current.onAnswer(false); // reset
      result.current.onAnswer(true);
      result.current.onAnswer(true);
      result.current.onAnswer(true); // fires +5 again
    });

    expect(addBonusXp.mock.calls.map((c) => c[0])).toEqual([5, 5]);
  });

  it('reset() clears the count without awarding anything', () => {
    const addBonusXp = vi.fn();
    const { result } = renderHook(() => useCombo(addBonusXp));
    act(() => {
      result.current.onAnswer(true);
      result.current.onAnswer(true);
    });
    act(() => result.current.reset());
    expect(result.current.count).toBe(0);
    expect(addBonusXp).not.toHaveBeenCalled();
  });
});
