import { describe, expect, it } from 'vitest';

import { bottomNavItemsFor, LEARNER_NAV_ITEMS, navItemsFor } from '@/components/NavBar/constants';

describe('learner navigation', () => {
  // Three places fit a tablet's top bar with no overflow menu.
  it('gives a member exactly Practice, My Cards and Me, in both bars', () => {
    expect(navItemsFor(true).map((i) => i.key)).toEqual(['practice', 'binder', 'me']);
    expect(bottomNavItemsFor(true)).toBe(LEARNER_NAV_ITEMS);
  });

  it('makes Practice the member home', () => {
    expect(LEARNER_NAV_ITEMS[0]).toMatchObject({ href: '/', exact: true });
  });

  it('leaves organizers on the full nav', () => {
    expect(navItemsFor(false).map((i) => i.key)).toContain('materials');
    expect(bottomNavItemsFor(false).map((i) => i.key)).not.toContain('binder');
  });
});
