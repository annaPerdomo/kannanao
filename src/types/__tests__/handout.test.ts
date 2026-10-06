import { describe, expect, it } from 'vitest';

import type { Assignment } from '@/hooks/useAssignments';
import { handoutRefFromAssignment, handoutRefFromWeek } from '@/types/handout';
import type { LessonUnitWeek } from '@/types/lessonUnit';

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1',
    organizer_id: 'org1',
    member_id: 'member1',
    deck_id: 'deck1',
    kana_set: null,
    title: null,
    note: 'Practice daily',
    due_date: '2026-10-01',
    available_on: null,
    completed_at: null,
    created_at: '2026-09-01T00:00:00Z',
    required_accuracy: 80,
    required_mode: 'study',
    progress_accuracy: null,
    decks: { id: 'deck1', name: 'Animals', emoji: '🐶' },
    ...overrides,
  };
}

describe('handoutRefFromAssignment', () => {
  it('maps a deck assignment', () => {
    const ref = handoutRefFromAssignment(makeAssignment(), 'Animals');

    expect(ref).toEqual({
      deckId: 'deck1',
      kanaSet: null,
      name: 'Animals',
      emoji: '🐶',
      note: 'Practice daily',
      availableOn: null,
      dueDate: '2026-10-01',
      requiredAccuracy: 80,
      requiredMode: 'study',
    });
  });

  it('maps a kana assignment', () => {
    const ref = handoutRefFromAssignment(
      makeAssignment({
        deck_id: null,
        kana_set: 'hira-a',
        decks: null,
        available_on: '2026-09-15',
        required_accuracy: null,
        required_mode: null,
      }),
      'あ・い・う・え・お',
    );

    expect(ref).toEqual({
      deckId: null,
      kanaSet: 'hira-a',
      name: 'あ・い・う・え・お',
      emoji: null,
      note: 'Practice daily',
      availableOn: '2026-09-15',
      dueDate: '2026-10-01',
      requiredAccuracy: null,
      requiredMode: null,
    });
  });
});

describe('handoutRefFromWeek', () => {
  it('maps a lesson unit week', () => {
    const week: LessonUnitWeek = {
      deckId: 'deck1',
      deckName: 'Animals',
      deckEmoji: '🐶',
      week: 2,
      title: null,
      note: 'Review before the quiz',
      dueDate: '2026-10-09',
      availableOn: '2026-10-02',
      requiredAccuracy: 80,
      requiredMode: 'study',
      learnerCount: 5,
      finishedCount: 3,
      status: 'current',
    };

    expect(handoutRefFromWeek(week)).toEqual({
      deckId: 'deck1',
      kanaSet: null,
      name: 'Animals',
      emoji: '🐶',
      note: 'Review before the quiz',
      availableOn: '2026-10-02',
      dueDate: '2026-10-09',
      requiredAccuracy: 80,
      requiredMode: 'study',
    });
  });
});
