const STORAGE_KEY = 'kannanao:materials-kana-sheet';

export function loadKanaSheetPreference(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function saveKanaSheetPreference(include: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, include ? 'true' : 'false');
  } catch {
    // Storage can be blocked (Safari private mode); the choice just won't stick.
  }
}
