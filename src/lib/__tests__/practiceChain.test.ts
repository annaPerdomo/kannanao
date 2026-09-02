import { beforeEach, describe, expect, it } from 'vitest';

import {
  chainLegHref,
  clearChainState,
  type PracticeChainState,
  readChainState,
  writeChainState,
} from '@/lib/practiceChain';

describe('chainLegHref', () => {
  it('routes the study leg to the deck study page', () => {
    expect(chainLegHref('d1', { step: 'warmup', mode: 'study' }, 'assignment')).toBe(
      '/deck/d1/study?chain=assignment',
    );
  });

  it('routes a practice leg to that mode', () => {
    expect(chainLegHref('d1', { step: 'goal', mode: 'kotoba-bubble' }, 'assignment')).toBe(
      '/deck/d1/practice/kotoba-bubble?chain=assignment',
    );
  });

  it('marks a mixed session so the two kinds cannot pick up each other legs', () => {
    expect(chainLegHref('d1', { step: 'practice', mode: 'match' }, 'mixed')).toBe(
      '/deck/d1/practice/match?chain=mixed',
    );
  });

  // Smart Review is cross-deck, so there is no deck route to send the learner
  // to — callers fall back to the plain deck page rather than guess.
  it('has nowhere to send a review goal', () => {
    expect(chainLegHref('d1', { step: 'goal', mode: 'review' }, 'assignment')).toBeNull();
  });
});

describe('chain state storage', () => {
  const state: PracticeChainState = {
    kind: 'assignment',
    deckId: 'd1',
    index: 1,
    legs: null,
    cardIds: null,
    assignmentId: 'a1',
    requiredMode: 'match',
    requiredAccuracy: 80,
    cardCount: 12,
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('round-trips a quest across a navigation', () => {
    writeChainState(state);
    expect(readChainState()).toEqual(state);
  });

  it('round-trips a mixed session, plan and cards included', () => {
    const mixed: PracticeChainState = {
      ...state,
      kind: 'mixed',
      assignmentId: null,
      requiredMode: null,
      requiredAccuracy: null,
      legs: [
        { step: 'practice', mode: 'recall' },
        { step: 'goal', mode: 'fill' },
      ],
      cardIds: ['c1', 'c2'],
    };
    writeChainState(mixed);
    expect(readChainState()).toEqual(mixed);
  });

  it('reads nothing once cleared', () => {
    writeChainState(state);
    clearChainState();
    expect(readChainState()).toBeNull();
  });

  it('ignores an unreadable entry instead of throwing', () => {
    window.sessionStorage.setItem('kannanao:practice-chain', '{not json');
    expect(readChainState()).toBeNull();
  });

  it('ignores an entry missing the fields a chain needs', () => {
    window.sessionStorage.setItem('kannanao:practice-chain', JSON.stringify({ deckId: 'd1' }));
    expect(readChainState()).toBeNull();
  });

  // An assignment quest with no assignment has nothing to complete or grade.
  it('ignores a quest that lost its assignment', () => {
    window.sessionStorage.setItem(
      'kannanao:practice-chain',
      JSON.stringify({ kind: 'assignment', deckId: 'd1', index: 0 }),
    );
    expect(readChainState()).toBeNull();
  });

  it('defaults the optional fields when they are absent', () => {
    window.sessionStorage.setItem(
      'kannanao:practice-chain',
      JSON.stringify({ kind: 'mixed', deckId: 'd1', index: 0 }),
    );
    expect(readChainState()).toEqual({
      kind: 'mixed',
      deckId: 'd1',
      index: 0,
      legs: null,
      cardIds: null,
      assignmentId: null,
      requiredMode: null,
      requiredAccuracy: null,
      cardCount: null,
    });
  });

  it('throws away a half-written plan rather than run a wrong one', () => {
    window.sessionStorage.setItem(
      'kannanao:practice-chain',
      JSON.stringify({ kind: 'mixed', deckId: 'd1', index: 0, legs: [{ step: 'practice' }] }),
    );
    expect(readChainState()?.legs).toBeNull();
  });
});

describe('daily chain', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('routes the review leg to the today page, but only for a daily session', () => {
    expect(chainLegHref('', { step: 'review', mode: 'review' }, 'daily')).toBe(
      '/review/today?chain=daily',
    );
    expect(chainLegHref('d1', { step: 'review', mode: 'review' }, 'mixed')).toBeNull();
  });

  it("uses the leg's own deck over the chain's", () => {
    expect(chainLegHref('', { step: 'practice', mode: 'match', deckId: 'd2' }, 'daily')).toBe(
      '/deck/d2/practice/match?chain=daily',
    );
  });

  it('round-trips per-leg decks and cards', () => {
    const legs = [
      { step: 'review' as const, mode: 'review' as const },
      { step: 'practice' as const, mode: 'recall' as const, deckId: 'd1', cardIds: ['c1', 'c2'] },
    ];
    writeChainState({
      kind: 'daily',
      deckId: 'd1',
      index: 0,
      legs,
      cardIds: null,
      assignmentId: null,
      requiredMode: null,
      requiredAccuracy: null,
      cardCount: 2,
    });
    expect(readChainState()).toMatchObject({ kind: 'daily', legs });
  });

  it('drops a daily chain that lost its plan', () => {
    window.sessionStorage.setItem(
      'kannanao:practice-chain',
      JSON.stringify({ kind: 'daily', deckId: 'd1', index: 0, legs: null }),
    );
    expect(readChainState()).toBeNull();
  });
});
