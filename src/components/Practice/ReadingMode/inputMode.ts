export type ReadingInputMode = 'tiles' | 'typed';

const STORAGE_KEY = 'kannanao:reading-input';

/** Remembered answer style. Tiles are the default — they need no keyboard. */
export function loadInputMode(): ReadingInputMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'typed' ? 'typed' : 'tiles';
  } catch {
    return 'tiles';
  }
}

export function saveInputMode(mode: ReadingInputMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage can be blocked (Safari private mode); the choice just won't stick.
  }
}
