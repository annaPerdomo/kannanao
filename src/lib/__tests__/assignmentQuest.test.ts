import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearQuestState,
  planAssignmentQuest,
  QUEST_PRACTICE_MIN_CARDS,
  questLegHref,
  readQuestState,
  writeQuestState,
} from '@/lib/assignmentQuest';

const plan = (requiredMode: string | null, cardCount = 12) =>
  planAssignmentQuest({ cardCount, requiredMode });

describe('planAssignmentQuest', () => {
  it('gives a legacy assignment a single study leg', () => {
    expect(plan(null)).toEqual([{ step: 'goal', mode: 'study' }]);
  });

  it('treats an unknown mode as no goal at all', () => {
    expect(plan('macarena')).toEqual([{ step: 'goal', mode: 'study' }]);
  });

  it('collapses a study goal into one leg — the warm-up is the goal', () => {
    expect(plan('study')).toEqual([{ step: 'goal', mode: 'study' }]);
  });

  it('walks warm-up → practice → goal for a normal goal mode', () => {
    expect(plan('quiz')).toEqual([
      { step: 'warmup', mode: 'study' },
      { step: 'practice', mode: 'match' },
      { step: 'goal', mode: 'quiz' },
    ]);
  });

  it('skips the middle leg when the goal already is Word Match', () => {
    expect(plan('match')).toEqual([
      { step: 'warmup', mode: 'study' },
      { step: 'goal', mode: 'match' },
    ]);
  });

  it('skips the middle leg on a deck too small for it', () => {
    expect(plan('listen', QUEST_PRACTICE_MIN_CARDS - 1)).toEqual([
      { step: 'warmup', mode: 'study' },
      { step: 'goal', mode: 'listen' },
    ]);
  });

  it('keeps the middle leg at exactly the card threshold', () => {
    expect(plan('listen', QUEST_PRACTICE_MIN_CARDS).map((leg) => leg.step)).toEqual([
      'warmup',
      'practice',
      'goal',
    ]);
  });

  it('always starts on flip study, so the first leg needs no deck data', () => {
    for (const mode of [null, 'study', 'match', 'quiz', 'reading']) {
      expect(plan(mode, 0)[0].mode).toBe('study');
    }
  });

  it('always ends on the goal mode', () => {
    for (const mode of ['fill', 'recall', 'kotoba-bubble', 'listen', 'reading', 'quiz']) {
      const legs = plan(mode);
      expect(legs[legs.length - 1]).toEqual({ step: 'goal', mode });
    }
  });
});

describe('questLegHref', () => {
  it('routes the study leg to the deck study page', () => {
    expect(questLegHref('d1', { step: 'warmup', mode: 'study' })).toBe(
      '/deck/d1/study?quest=assignment',
    );
  });

  it('routes a practice leg to that mode', () => {
    expect(questLegHref('d1', { step: 'goal', mode: 'kotoba-bubble' })).toBe(
      '/deck/d1/practice/kotoba-bubble?quest=assignment',
    );
  });

  // Smart Review is cross-deck, so there is no deck route to send the learner
  // to — callers fall back to the plain deck page rather than guess.
  it('has nowhere to send a review goal', () => {
    expect(questLegHref('d1', { step: 'goal', mode: 'review' })).toBeNull();
  });
});

describe('quest state storage', () => {
  const state = {
    assignmentId: 'a1',
    deckId: 'd1',
    requiredMode: 'match',
    requiredAccuracy: 80,
    cardCount: 12,
    index: 1,
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('round-trips a quest across a navigation', () => {
    writeQuestState(state);
    expect(readQuestState()).toEqual(state);
  });

  it('reads nothing once cleared', () => {
    writeQuestState(state);
    clearQuestState();
    expect(readQuestState()).toBeNull();
  });

  it('ignores an unreadable entry instead of throwing', () => {
    window.sessionStorage.setItem('kannanao:assignment-quest', '{not json');
    expect(readQuestState()).toBeNull();
  });

  it('ignores an entry missing the fields a quest needs', () => {
    window.sessionStorage.setItem('kannanao:assignment-quest', JSON.stringify({ deckId: 'd1' }));
    expect(readQuestState()).toBeNull();
  });

  it('defaults the optional fields when they are absent', () => {
    window.sessionStorage.setItem(
      'kannanao:assignment-quest',
      JSON.stringify({ assignmentId: 'a1', deckId: 'd1', index: 0 }),
    );
    expect(readQuestState()).toEqual({
      assignmentId: 'a1',
      deckId: 'd1',
      requiredMode: null,
      requiredAccuracy: null,
      cardCount: null,
      index: 0,
    });
  });
});
