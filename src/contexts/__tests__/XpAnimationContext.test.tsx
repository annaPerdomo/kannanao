import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useXpAnimation, XpAnimationProvider } from '@/contexts/XpAnimationContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <XpAnimationProvider>{children}</XpAnimationProvider>;
}

describe('XpAnimationContext / XpAnimationProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should start with an empty pendingXp array', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      expect(result.current.pendingXp).toEqual([]);
    });
  });

  describe('triggerXpEarned', () => {
    it('should add an event to pendingXp', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      act(() => {
        result.current.triggerXpEarned(100);
      });
      expect(result.current.pendingXp).toHaveLength(1);
      expect(result.current.pendingXp[0].amount).toBe(100);
    });

    it('should assign a unique incrementing key to each event', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      act(() => {
        result.current.triggerXpEarned(10);
        result.current.triggerXpEarned(20);
      });
      const [e1, e2] = result.current.pendingXp;
      expect(e1.key).toBeLessThan(e2.key);
    });

    it('should accumulate multiple events', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      act(() => {
        result.current.triggerXpEarned(50);
        result.current.triggerXpEarned(100);
        result.current.triggerXpEarned(150);
      });
      expect(result.current.pendingXp).toHaveLength(3);
    });

    it('should auto-remove the event after 2000ms', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      act(() => {
        result.current.triggerXpEarned(100);
      });
      expect(result.current.pendingXp).toHaveLength(1);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.pendingXp).toHaveLength(0);
    });

    it('should not remove the event before 2000ms', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      act(() => {
        result.current.triggerXpEarned(100);
      });
      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(result.current.pendingXp).toHaveLength(1);
    });

    it('should only remove the specific event after 2000ms, leaving others', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      act(() => {
        result.current.triggerXpEarned(10);
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        result.current.triggerXpEarned(20);
      }); // 2nd event, timer starts fresh
      act(() => {
        vi.advanceTimersByTime(1000);
      }); // 1st event timer fires (2000ms total)
      // First event removed, second (added at 1000ms) still pending (only 1000ms elapsed)
      expect(result.current.pendingXp).toHaveLength(1);
      expect(result.current.pendingXp[0].amount).toBe(20);
    });
  });

  describe('dismissXpEvent', () => {
    it('should remove the event with the matching key', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      act(() => {
        result.current.triggerXpEarned(50);
        result.current.triggerXpEarned(100);
      });
      const keyToRemove = result.current.pendingXp[0].key;
      act(() => {
        result.current.dismissXpEvent(keyToRemove);
      });
      expect(result.current.pendingXp).toHaveLength(1);
      expect(result.current.pendingXp[0].amount).toBe(100);
    });

    it('should not remove events with non-matching keys', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      act(() => {
        result.current.triggerXpEarned(100);
      });
      act(() => {
        result.current.dismissXpEvent(99999);
      }); // non-existent key
      expect(result.current.pendingXp).toHaveLength(1);
    });

    it('should handle dismissing from an already-empty array gracefully', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      expect(() => {
        act(() => {
          result.current.dismissXpEvent(1);
        });
      }).not.toThrow();
      expect(result.current.pendingXp).toHaveLength(0);
    });

    it('should remove all events individually', () => {
      const { result } = renderHook(() => useXpAnimation(), { wrapper });
      act(() => {
        result.current.triggerXpEarned(10);
        result.current.triggerXpEarned(20);
      });
      const [e1, e2] = result.current.pendingXp;
      act(() => {
        result.current.dismissXpEvent(e1.key);
      });
      act(() => {
        result.current.dismissXpEvent(e2.key);
      });
      expect(result.current.pendingXp).toHaveLength(0);
    });
  });
});
