import { describe, expect, it } from 'vitest';

import { resolveDashboardTab } from '../constants';

describe('resolveDashboardTab', () => {
  it('returns a valid tab unchanged', () => {
    expect(resolveDashboardTab('learners')).toBe('learners');
    expect(resolveDashboardTab('plan')).toBe('plan');
    expect(resolveDashboardTab('words')).toBe('words');
    expect(resolveDashboardTab('today')).toBe('today');
  });

  it('maps each legacy alias to its replacement', () => {
    expect(resolveDashboardTab('overview')).toBe('today');
    expect(resolveDashboardTab('activity')).toBe('today');
    expect(resolveDashboardTab('assignments')).toBe('plan');
  });

  it('falls back to the default tab for junk input', () => {
    expect(resolveDashboardTab('nonsense')).toBe('today');
  });

  it('falls back to the default tab for null', () => {
    expect(resolveDashboardTab(null)).toBe('today');
  });
});
