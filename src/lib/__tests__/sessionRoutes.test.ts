import { describe, expect, it } from 'vitest';

import { isSessionRoute } from '@/lib/sessionRoutes';

describe('isSessionRoute', () => {
  it.each([
    '/deck/abc-123/practice',
    '/deck/abc-123/practice/typing',
    '/deck/abc-123/study',
    '/ohanashikai/xyz/practice/recite',
    '/review/today',
    '/review/match',
  ])('holds a celebration during %s', (path) => {
    expect(isSessionRoute(path)).toBe(true);
  });

  it.each(['/', '/decks', '/deck/abc-123', '/review', '/shop', '/group'])(
    'lets a celebration through on %s',
    (path) => {
      expect(isSessionRoute(path)).toBe(false);
    },
  );

  it('treats an unknown pathname as safe to celebrate on', () => {
    expect(isSessionRoute(null)).toBe(false);
    expect(isSessionRoute(undefined)).toBe(false);
  });
});
