/**
 * Under this many cards in the window an accuracy figure is noise, not a signal.
 * Shared by every widget reporting a per-mode accuracy: a mode one panel calls
 * "low sample" must not carry a confident percentage in the next.
 */
export const MIN_MODE_CARDS = 10;
