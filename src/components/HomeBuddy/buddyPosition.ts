const STORAGE_KEY = 'kannanao:buddy-position';

export const EDGE_MARGIN = 8;

/** Anchored bottom: the widget grows upward when its bubble appears, so a top anchor shoves the face down. */
export interface BuddyPosition {
  left: number;
  bottom: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_INSETS: Insets = {
  top: EDGE_MARGIN,
  right: EDGE_MARGIN,
  bottom: EDGE_MARGIN,
  left: EDGE_MARGIN,
};

/**
 * Measured, not derived from BOTTOM_NAV_HEIGHT: the rect is 0 where a bar is
 * `display: none`, and it includes `env(safe-area-inset-bottom)`.
 */
export function measureChromeInsets(): Insets {
  const height = (selector: string) =>
    document.querySelector(selector)?.getBoundingClientRect().height ?? 0;
  return {
    ...DEFAULT_INSETS,
    top: EDGE_MARGIN + height('[data-app-chrome="top"]'),
    bottom: EDGE_MARGIN + height('[data-app-chrome="bottom"]'),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampPosition(
  pos: BuddyPosition,
  size: Size,
  viewport: Size,
  insets: Insets = DEFAULT_INSETS,
): BuddyPosition {
  return {
    left: clamp(
      pos.left,
      insets.left,
      Math.max(insets.left, viewport.width - size.width - insets.right),
    ),
    bottom: clamp(
      pos.bottom,
      insets.bottom,
      Math.max(insets.bottom, viewport.height - size.height - insets.top),
    ),
  };
}

export function readStoredPosition(): BuddyPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { left, bottom } = parsed as Partial<BuddyPosition>;
    if (!Number.isFinite(left) || !Number.isFinite(bottom)) return null;
    return { left: left as number, bottom: bottom as number };
  } catch {
    return null;
  }
}

export function writeStoredPosition(pos: BuddyPosition): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // Storage can be blocked (Safari private mode); the spot just won't stick.
  }
}
