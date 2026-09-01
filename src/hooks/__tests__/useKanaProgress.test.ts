import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetKanaProgress = vi.fn();
const mockUpsertKanaProgress = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getKanaProgress: (userId: string) => mockGetKanaProgress(userId),
  upsertKanaProgress: (kana: string, correct: boolean) => mockUpsertKanaProgress(kana, correct),
}));

// One stable user object: a fresh identity per render would refire the load effect forever.
const AUTH = { user: { id: 'u1' } };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => AUTH }));

import { useKanaProgress } from '@/hooks/useKanaProgress';

const ROW = {
  kana: 'あ',
  correctCount: 2,
  wrongCount: 1,
  lastReviewedAt: null,
  nextReviewAt: '2026-09-01T00:00:00Z',
  intervalDays: 1,
  ease: 2.5,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetKanaProgress.mockResolvedValue([ROW]);
  mockUpsertKanaProgress.mockResolvedValue(true);
});

describe('useKanaProgress', () => {
  it('should load the learner’s rows into a map keyed by character', async () => {
    const { result } = renderHook(() => useKanaProgress());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.byKana!.get('あ')!.correctCount).toBe(2);
    expect(mockGetKanaProgress).toHaveBeenCalledWith('u1');
  });

  it('should surface a failed load as an error, never as an empty path', async () => {
    mockGetKanaProgress.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useKanaProgress());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.byKana).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should retry a failed load', async () => {
    mockGetKanaProgress.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useKanaProgress());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.byKana).not.toBeNull());
    expect(result.current.error).toBeNull();
  });

  it('should count an answer locally and persist it', async () => {
    const { result } = renderHook(() => useKanaProgress());
    await waitFor(() => expect(result.current.byKana).not.toBeNull());

    await act(() => result.current.record('あ', true));
    expect(result.current.byKana!.get('あ')).toMatchObject({ correctCount: 3, wrongCount: 1 });
    expect(mockUpsertKanaProgress).toHaveBeenCalledWith('あ', true);

    await act(() => result.current.record('い', false));
    expect(result.current.byKana!.get('い')).toMatchObject({ correctCount: 0, wrongCount: 1 });
  });

  it('should advance the local review schedule so a just-answered kana stops reading as due', async () => {
    const { result } = renderHook(() => useKanaProgress());
    await waitFor(() => expect(result.current.byKana).not.toBeNull());

    await act(() => result.current.record('あ', true));
    const entry = result.current.byKana!.get('あ')!;
    expect(new Date(entry.nextReviewAt!).getTime()).toBeGreaterThan(Date.now());
    expect(entry.intervalDays).toBe(3);

    await act(() => result.current.record('う', false));
    const wrong = result.current.byKana!.get('う')!;
    expect(new Date(wrong.nextReviewAt!).getTime()).toBeGreaterThan(Date.now());
    expect(wrong.intervalDays).toBe(0);
  });

  it('should roll the optimistic count back and surface an error when the write fails', async () => {
    mockUpsertKanaProgress.mockResolvedValue(false);
    const { result } = renderHook(() => useKanaProgress());
    await waitFor(() => expect(result.current.byKana).not.toBeNull());

    await act(() => result.current.record('あ', true));
    expect(result.current.byKana!.get('あ')).toMatchObject({ correctCount: 2, wrongCount: 1 });
    expect(result.current.error).not.toBeNull();
  });

  it('should drop a rolled-back character that had no row before', async () => {
    mockUpsertKanaProgress.mockResolvedValue(false);
    const { result } = renderHook(() => useKanaProgress());
    await waitFor(() => expect(result.current.byKana).not.toBeNull());

    await act(() => result.current.record('か', true));
    expect(result.current.byKana!.has('か')).toBe(false);
  });
});
