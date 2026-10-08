import { describe, expect, it } from 'vitest';

import { ADD_SOURCES, addToPlanDestination } from '../constants';

describe('ADD_SOURCES', () => {
  it('lists every source once, in the designed order', () => {
    expect(ADD_SOURCES.map((s) => s.key)).toEqual(['lesson', 'decks', 'quizlet', 'kana', 'blank']);
  });
});

describe('addToPlanDestination', () => {
  it('opens the assign dialog in place for decks', () => {
    expect(addToPlanDestination('g1', 'decks')).toEqual({ openAssign: true });
  });

  it.each([
    ['lesson', '/group/g1/add/lesson'],
    ['kana', '/group/g1/add/kana'],
    ['quizlet', '/group/g1/add/quizlet'],
    ['blank', '/group/g1/add/blank'],
  ] as const)('sends %s to its own page', (source, path) => {
    expect(addToPlanDestination('g1', source)).toEqual({ path });
  });
});
