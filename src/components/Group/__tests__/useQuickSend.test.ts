import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useQuickSend } from '../useQuickSend';

describe('useQuickSend', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends to every member and confirms', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useQuickSend(onSend));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.send(['a', 'b'], 'hi', '⭐');
    });

    expect(ok).toBe(true);
    expect(onSend).toHaveBeenCalledTimes(2);
    expect(onSend).toHaveBeenCalledWith('a', 'hi', '⭐');
    expect(onSend).toHaveBeenCalledWith('b', 'hi', '⭐');
    expect(result.current.sent).toBe(true);
    expect(result.current.sending).toBe(false);
  });

  it('reports failure and never confirms when one recipient rejects', async () => {
    const onSend = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useQuickSend(onSend));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.send(['a', 'b'], 'hi');
    });

    expect(ok).toBe(false);
    expect(result.current.sent).toBe(false);
    expect(result.current.sending).toBe(false);
  });

  it('holds sending true until the send settles', async () => {
    let release: () => void = () => {};
    const onSend = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const { result } = renderHook(() => useQuickSend(onSend));

    let pending: Promise<boolean>;
    act(() => {
      pending = result.current.send(['a'], 'hi');
    });
    expect(result.current.sending).toBe(true);

    await act(async () => {
      release();
      await pending;
    });
    expect(result.current.sending).toBe(false);
  });

  it('clears the confirmation on its own after the reset window', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useQuickSend(onSend));

    await act(async () => {
      await result.current.send(['a'], 'hi');
    });
    expect(result.current.sent).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.sent).toBe(false);
  });

  it('reset() drops the confirmation immediately so a reused dialog starts clean', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useQuickSend(onSend));

    await act(async () => {
      await result.current.send(['a'], 'hi');
    });
    expect(result.current.sent).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.sent).toBe(false);

    // The pending timer must be dead too, or it fires mid-way through the next send.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.sent).toBe(false);
  });
});
