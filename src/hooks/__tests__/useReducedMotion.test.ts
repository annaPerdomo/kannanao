import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useReducedMotion } from '@/hooks/useReducedMotion';

type Listener = (event: MediaQueryListEvent) => void;

function mockPreference(matches: boolean) {
  const listeners = new Set<Listener>();
  vi.mocked(window.matchMedia).mockImplementation(
    (media: string) =>
      ({
        matches,
        media,
        addEventListener: (_: string, listener: Listener) => listeners.add(listener),
        removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
      }) as unknown as MediaQueryList,
  );
  return {
    change: (next: boolean) => {
      matches = next;
      listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
    },
  };
}

describe('useReducedMotion', () => {
  it('reports the preference on the very first render', () => {
    mockPreference(true);
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it('follows the preference changing while mounted', () => {
    const mq = mockPreference(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => mq.change(true));

    expect(result.current).toBe(true);
  });
});
