import { describe, expect, it } from 'vitest';

import { materialsRedirectTarget } from '../materialsRedirect';

describe('materialsRedirectTarget', () => {
  it.each([
    ['lessonSet', '/group/g1/add/lesson'],
    ['kana', '/group/g1/add/kana'],
    ['quizlet', '/group/g1/add/quizlet'],
    ['deck', '/group/g1/add/blank'],
  ])('with a group and tab=%s goes to its add page', (tab, path) => {
    expect(materialsRedirectTarget({ group: 'g1', tab })).toBe(path);
  });

  it('with a group and no recognized tab goes to the Plan tab', () => {
    expect(materialsRedirectTarget({ group: 'g1' })).toBe('/group/g1?tab=plan');
    expect(materialsRedirectTarget({ group: 'g1', tab: 'assigned' })).toBe('/group/g1?tab=plan');
  });

  it('with no group and tab=quizlet asks the groups list to pick one', () => {
    expect(materialsRedirectTarget({ tab: 'quizlet' })).toBe('/group?next=quizlet');
  });

  it('with no group and no tab goes to the groups list', () => {
    expect(materialsRedirectTarget({})).toBe('/group');
    expect(materialsRedirectTarget({ tab: 'lessonSet' })).toBe('/group');
  });

  it('encodes the group id', () => {
    expect(materialsRedirectTarget({ group: 'a b', tab: 'kana' })).toBe('/group/a%20b/add/kana');
  });
});
