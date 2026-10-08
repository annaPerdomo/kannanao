import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateLesson = vi.fn();
const mockHandOutLesson = vi.fn();
const mockUpdateLessonKana = vi.fn();
vi.mock('@/services/api', () => ({
  createLesson: (...args: unknown[]) => mockCreateLesson(...args),
  handOutLesson: (...args: unknown[]) => mockHandOutLesson(...args),
  updateLessonKana: (...args: unknown[]) => mockUpdateLessonKana(...args),
}));

const mockInvalidateApiCache = vi.fn();
vi.mock('@/lib/apiCache', () => ({
  invalidateApiCache: (...args: unknown[]) => mockInvalidateApiCache(...args),
}));

import { useLessonEdits } from '../useLessonEdits';
import { LESSON_LIBRARY_CACHE_PREFIX } from '../useLessonLibrary';

describe('useLessonEdits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createLesson succeeds, invalidates the library cache and clears saving', async () => {
    mockCreateLesson.mockResolvedValue({ planId: 'p1', deckId: 'd1' });
    const { result } = renderHook(() => useLessonEdits('g1'));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.createLesson({ title: 'Food', unit: { title: null } });
    });

    expect(returned).toEqual({ planId: 'p1', deckId: 'd1' });
    expect(mockCreateLesson).toHaveBeenCalledWith({
      groupId: 'g1',
      title: 'Food',
      unit: { title: null },
    });
    expect(mockInvalidateApiCache).toHaveBeenCalledWith(LESSON_LIBRARY_CACHE_PREFIX);
    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('createLesson sets error and returns null on failure', async () => {
    mockCreateLesson.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useLessonEdits('g1'));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.createLesson({ title: 'Food', unit: { title: null } });
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe('nope');
  });

  it('handOut succeeds and invalidates both caches', async () => {
    mockHandOutLesson.mockResolvedValue({ assigned: 2, kanaAssigned: [], kanaFailed: [] });
    const { result } = renderHook(() => useLessonEdits('g1'));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.handOut({
        deckId: 'd1',
        dueDate: '2026-10-20',
        availableOn: null,
      });
    });

    expect(returned).toEqual({ assigned: 2, kanaAssigned: [], kanaFailed: [] });
    expect(mockInvalidateApiCache).toHaveBeenCalledWith(LESSON_LIBRARY_CACHE_PREFIX);
    expect(mockInvalidateApiCache).toHaveBeenCalledWith('/api/group/assignments');
  });

  it('handOut sets error and returns null on failure', async () => {
    mockHandOutLesson.mockRejectedValue(new Error('server down'));
    const { result } = renderHook(() => useLessonEdits('g1'));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.handOut({
        deckId: 'd1',
        dueDate: null,
        availableOn: null,
      });
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe('server down');
  });

  it('setKanaSets succeeds and returns true', async () => {
    mockUpdateLessonKana.mockResolvedValue({ kanaSets: ['hira-a'] });
    const { result } = renderHook(() => useLessonEdits('g1'));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.setKanaSets('d1', ['hira-a']);
    });

    expect(returned).toBe(true);
    expect(mockUpdateLessonKana).toHaveBeenCalledWith({
      groupId: 'g1',
      deckId: 'd1',
      kanaSets: ['hira-a'],
    });
    expect(mockInvalidateApiCache).toHaveBeenCalledWith(LESSON_LIBRARY_CACHE_PREFIX);
  });

  it('setKanaSets sets error and returns false on failure', async () => {
    mockUpdateLessonKana.mockRejectedValue(new Error('bad set'));
    const { result } = renderHook(() => useLessonEdits('g1'));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.setKanaSets('d1', ['hira-a']);
    });

    expect(returned).toBe(false);
    expect(result.current.error).toBe('bad set');
  });

  it('clearError resets the error state', async () => {
    mockCreateLesson.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useLessonEdits('g1'));

    await act(async () => {
      await result.current.createLesson({ title: 'Food', unit: { title: null } });
    });
    expect(result.current.error).toBe('nope');

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });
});
