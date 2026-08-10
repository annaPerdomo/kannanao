const STORAGE_PREFIX = 'kannanao:group-attention-collapsed:';

/** Keyed per group, not globally: the panel is worth watching in some groups and not others. */
export function loadCollapsed(groupId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_PREFIX + groupId) === 'true';
  } catch {
    return false;
  }
}

export function saveCollapsed(groupId: string, collapsed: boolean): void {
  try {
    if (collapsed) localStorage.setItem(STORAGE_PREFIX + groupId, 'true');
    else localStorage.removeItem(STORAGE_PREFIX + groupId);
  } catch {
    // Storage can be blocked (Safari private mode); the choice just won't stick.
  }
}
