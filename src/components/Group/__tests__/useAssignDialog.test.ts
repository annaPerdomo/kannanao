import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AssignmentBatch } from '@/components/Group/AssignmentsList/groupAssignments';
import type { Assignment } from '@/hooks/useAssignments';

import { useAssignDialog } from '../useAssignDialog';

function batch(overrides: Partial<Assignment> = {}): AssignmentBatch {
  const sample: Assignment = {
    id: 'a1',
    organizer_id: 'org1',
    member_id: 'm1',
    deck_id: 'd1',
    kana_set: null,
    title: null,
    note: null,
    due_date: null,
    available_on: null,
    completed_at: null,
    created_at: '2026-07-01T00:00:00Z',
    required_accuracy: null,
    required_mode: null,
    progress_accuracy: null,
    ...overrides,
  };
  return {
    key: 'k',
    deckName: 'Animals',
    deckEmoji: '🐾',
    dueDate: null,
    availableOn: null,
    total: 1,
    completed: 0,
    finishedAt: null,
    ids: ['a1'],
    sample,
    members: [sample],
  };
}

describe('useAssignDialog', () => {
  it('starts closed with no preset', () => {
    const { result } = renderHook(() => useAssignDialog());
    expect(result.current.open).toBe(false);
    expect(result.current.preset).toBeNull();
  });

  it('opens with a preset and bumps the session', () => {
    const { result } = renderHook(() => useAssignDialog());
    const firstSession = result.current.session;

    act(() => result.current.openAssign({ deckId: 'd1' }));

    expect(result.current.open).toBe(true);
    expect(result.current.preset).toEqual({ deckId: 'd1' });
    expect(result.current.session).toBe(firstSession + 1);
  });

  it('closeAssign clears both open and preset', () => {
    const { result } = renderHook(() => useAssignDialog());
    act(() => result.current.openAssign({ deckId: 'd1' }));
    act(() => result.current.closeAssign());

    expect(result.current.open).toBe(false);
    expect(result.current.preset).toBeNull();
  });

  it('assignMissing opens with the batch deck and the given member ids', () => {
    const { result } = renderHook(() => useAssignDialog());
    act(() => result.current.assignMissing(batch(), ['m2', 'm3']));

    expect(result.current.preset).toMatchObject({
      deckId: 'd1',
      kanaSet: undefined,
      memberIds: ['m2', 'm3'],
    });
  });

  it('assignMissing carries the note, goal, and a future deadline into the preset', () => {
    const { result } = renderHook(() => useAssignDialog());
    const soon = new Date(Date.now() + 5 * 86_400_000).toISOString();
    act(() =>
      result.current.assignMissing(
        batch({ note: 'Chapter 3', due_date: soon, required_accuracy: 80, required_mode: 'quiz' }),
        ['m2'],
      ),
    );

    expect(result.current.preset?.fields).toEqual({
      note: 'Chapter 3',
      dueDate: soon.slice(0, 10),
      requiredAccuracy: 80,
      requiredMode: 'quiz',
    });
  });

  it('assignMissing drops a deadline that has already passed', () => {
    const { result } = renderHook(() => useAssignDialog());
    act(() => result.current.assignMissing(batch({ due_date: '2020-01-01' }), ['m2']));

    expect(result.current.preset?.fields?.dueDate).toBeUndefined();
  });

  it('assignMissing opens with the kana set instead of a deck for a kana batch', () => {
    const { result } = renderHook(() => useAssignDialog());
    act(() => result.current.assignMissing(batch({ deck_id: null, kana_set: 'hira-ka' }), ['m2']));

    expect(result.current.preset).toMatchObject({
      deckId: undefined,
      kanaSet: 'hira-ka',
      memberIds: ['m2'],
    });
  });
});
