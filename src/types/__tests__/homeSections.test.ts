import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HOME_SECTIONS,
  getDefaultGridLayout,
  getSectionsForRole,
  type HomeRole,
  type HomeSections,
  resolveGridLayout,
  resolveSectionOrder,
} from '../homeSections';

const LEARNER: HomeRole = { isInGroup: true, canRunGroups: false };
const ORGANIZER: HomeRole = { isInGroup: false, canRunGroups: true };
const BOTH: HomeRole = { isInGroup: true, canRunGroups: true };
const NEITHER: HomeRole = { isInGroup: false, canRunGroups: false };

describe('getSectionsForRole', () => {
  it('gives a learner the leaderboard and assignments but not groups', () => {
    const keys = getSectionsForRole(LEARNER);

    expect([...keys].sort()).toEqual(['assignments', 'decks', 'leaderboard', 'speeches', 'todo']);
  });

  it('gives an organizer groups but no learner sections', () => {
    const keys = getSectionsForRole(ORGANIZER);

    expect([...keys].sort()).toEqual(['decks', 'groups', 'speeches', 'todo']);
  });

  it('gives an organizer who joined a group both sets at once', () => {
    const keys = getSectionsForRole(BOTH);

    expect(keys.has('groups')).toBe(true);
    expect(keys.has('assignments')).toBe(true);
    expect(keys.has('leaderboard')).toBe(true);
  });

  it('drops the leaderboard when the joined group has it turned off', () => {
    expect(getSectionsForRole(BOTH, false).has('leaderboard')).toBe(false);
    expect(getSectionsForRole(BOTH, false).has('assignments')).toBe(true);
  });

  it('shows only the personal sections to an account with neither role', () => {
    expect([...getSectionsForRole(NEITHER)].sort()).toEqual(['decks', 'speeches', 'todo']);
  });
});

describe('getDefaultGridLayout', () => {
  it('keeps the established single-role layouts untouched', () => {
    // These are what existing dashboards already render; regenerating them
    // would move tiles for people who never changed anything.
    expect(getDefaultGridLayout(LEARNER)).toEqual([
      { i: 'todo', x: 0, y: 0, w: 6, h: 18 },
      { i: 'leaderboard', x: 6, y: 0, w: 6, h: 7 },
      { i: 'assignments', x: 6, y: 7, w: 6, h: 5 },
      { i: 'decks', x: 6, y: 12, w: 6, h: 7 },
      { i: 'speeches', x: 0, y: 18, w: 6, h: 5 },
    ]);
    expect(getDefaultGridLayout(ORGANIZER)).toEqual([
      { i: 'todo', x: 0, y: 0, w: 6, h: 18 },
      { i: 'groups', x: 6, y: 0, w: 6, h: 6 },
      { i: 'decks', x: 6, y: 6, w: 6, h: 7 },
      { i: 'speeches', x: 6, y: 13, w: 6, h: 5 },
    ]);
  });

  it('lays out every section for an account holding both roles', () => {
    const keys = getDefaultGridLayout(BOTH).map((l) => l.i);

    expect(keys).toEqual(['todo', 'leaderboard', 'assignments', 'groups', 'decks', 'speeches']);
  });
});

describe('resolveSectionOrder', () => {
  it('adds sections a role gained since the layout was saved', () => {
    // Saved as a plain organizer, then joined a group.
    const sections: HomeSections = {
      ...DEFAULT_HOME_SECTIONS,
      sectionOrder: ['todo', 'groups', 'decks'],
    };

    const order = resolveSectionOrder(sections, BOTH);

    expect(order).toContain('groups');
    expect(order).toContain('assignments');
    expect(order).toContain('leaderboard');
  });

  it('drops sections the role no longer has', () => {
    const sections: HomeSections = {
      ...DEFAULT_HOME_SECTIONS,
      sectionOrder: ['todo', 'groups', 'assignments', 'decks'],
    };

    expect(resolveSectionOrder(sections, LEARNER)).not.toContain('groups');
  });
});

describe('resolveGridLayout', () => {
  it('appends newly gained sections below a saved layout instead of discarding it', () => {
    const sections = {
      ...DEFAULT_HOME_SECTIONS,
      gridLayout: [{ i: 'todo', x: 0, y: 0, w: 12, h: 4 }],
    };

    const layout = resolveGridLayout(sections, BOTH);

    expect(layout[0]).toEqual({ i: 'todo', x: 0, y: 0, w: 12, h: 4 });
    expect(layout.map((l) => l.i)).toContain('assignments');
    expect(layout.every((l) => l.y >= 0)).toBe(true);
  });
});
