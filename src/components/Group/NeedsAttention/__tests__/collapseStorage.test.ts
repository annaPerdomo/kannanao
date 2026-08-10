import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadCollapsed, saveCollapsed } from '../collapseStorage';

describe('collapseStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to expanded for a group that was never collapsed', () => {
    expect(loadCollapsed('group-1')).toBe(false);
  });

  it('round-trips a collapsed group', () => {
    saveCollapsed('group-1', true);
    expect(loadCollapsed('group-1')).toBe(true);
  });

  it('keeps each group independent', () => {
    saveCollapsed('group-1', true);
    expect(loadCollapsed('group-2')).toBe(false);
  });

  it('clears the key when expanded again rather than storing false', () => {
    saveCollapsed('group-1', true);
    saveCollapsed('group-1', false);
    expect(loadCollapsed('group-1')).toBe(false);
    expect(localStorage.getItem('kannanao:group-attention-collapsed:group-1')).toBeNull();
  });

  it('treats blocked storage as expanded instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(loadCollapsed('group-1')).toBe(false);
  });

  it('swallows write failures so a blocked store never breaks the toggle', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveCollapsed('group-1', true)).not.toThrow();
  });
});
