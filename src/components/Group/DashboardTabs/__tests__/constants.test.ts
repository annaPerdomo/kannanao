import { describe, expect, it } from 'vitest';

import { resolveDashboardTab } from '../constants';

describe('resolveDashboardTab', () => {
  it('returns a valid tab unchanged', () => {
    expect(resolveDashboardTab('learners')).toBe('learners');
    expect(resolveDashboardTab('lessons')).toBe('lessons');
    expect(resolveDashboardTab('words')).toBe('words');
    expect(resolveDashboardTab('today')).toBe('today');
  });

  it('maps each legacy alias to its replacement', () => {
    expect(resolveDashboardTab('overview')).toBe('today');
    expect(resolveDashboardTab('activity')).toBe('today');
    expect(resolveDashboardTab('plan')).toBe('lessons');
    expect(resolveDashboardTab('assignments')).toBe('lessons');
  });

  it('falls back to the default tab for junk input', () => {
    expect(resolveDashboardTab('nonsense')).toBe('today');
  });

  it('falls back to the default tab for null', () => {
    expect(resolveDashboardTab(null)).toBe('today');
  });
});
