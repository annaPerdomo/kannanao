import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchGroupKanjiInUseMock = vi.fn();
vi.mock('@/services/api', () => ({
  fetchGroupKanjiInUse: (...args: unknown[]) => fetchGroupKanjiInUseMock(...args),
}));

import type { LessonSetForm } from '../constants';
import { useKanjiAnswer } from '../useKanjiAnswer';

const FORM = { level: 'N5', kanjiLevel: 'not-yet' } as LessonSetForm;

function setup() {
  return renderHook(() => {
    const [form, setForm] = useState(FORM);
    const withKanjiAnswer = useKanjiAnswer('g1', setForm);
    const change = (patch: Partial<LessonSetForm>) =>
      setForm((current) => ({ ...current, ...withKanjiAnswer(patch) }));
    return { form, change };
  });
}

describe('useKanjiAnswer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchGroupKanjiInUseMock.mockResolvedValue(false);
  });

  it('follows the level while the group has no kanji history', async () => {
    const { result } = setup();
    await waitFor(() => expect(fetchGroupKanjiInUseMock).toHaveBeenCalledWith('g1'));
    expect(result.current.form.kanjiLevel).toBe('not-yet');
    act(() => result.current.change({ level: 'N4' }));
    expect(result.current.form.kanjiLevel).toBe('yes');
    act(() => result.current.change({ level: 'N5' }));
    expect(result.current.form.kanjiLevel).toBe('not-yet');
  });

  it('prefills "learning" for a group that already practises kanji, on every level change', async () => {
    fetchGroupKanjiInUseMock.mockResolvedValue(true);
    const { result } = setup();
    await waitFor(() => expect(result.current.form.kanjiLevel).toBe('learning'));
    act(() => result.current.change({ level: 'N4' }));
    expect(result.current.form.kanjiLevel).toBe('yes');
    act(() => result.current.change({ level: 'N5' }));
    expect(result.current.form.kanjiLevel).toBe('learning');
  });

  it("keeps the educator's own answer over the level and the history", async () => {
    let resolve: (inUse: boolean) => void = () => {};
    fetchGroupKanjiInUseMock.mockReturnValue(new Promise<boolean>((r) => (resolve = r)));
    const { result } = setup();
    act(() => result.current.change({ kanjiLevel: 'not-yet' }));
    await act(async () => resolve(true));
    expect(result.current.form.kanjiLevel).toBe('not-yet');
    act(() => result.current.change({ level: 'N4' }));
    expect(result.current.form.kanjiLevel).toBe('not-yet');
  });
});
