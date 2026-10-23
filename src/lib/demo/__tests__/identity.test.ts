import { describe, expect, it } from 'vitest';

import { isDemoUsername } from '../identity';

describe('isDemoUsername', () => {
  it('matches the demo prefix case-insensitively', () => {
    expect(isDemoUsername('demo-maya')).toBe(true);
    expect(isDemoUsername('DEMO-x')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isDemoUsername('demon')).toBe(false);
    expect(isDemoUsername('maya-demo-')).toBe(false);
    expect(isDemoUsername(null)).toBe(false);
  });
});
