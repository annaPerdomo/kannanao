import type { DifficultWordReason } from '@/lib/difficultWords';

/**
 * Severity token per reason. It picks the chip's tint — but the chip always
 * carries its label too, so the colour is reinforcement, never the message.
 */
export const REASON_SEVERITY: Record<DifficultWordReason, 'error' | 'warning' | 'info'> = {
  forgotten: 'error',
  missed: 'warning',
  shaky: 'info',
};

/** Rows shown before "show all"; a teacher works through a handful at a time. */
export const COLLAPSED_ROWS = 8;

/** Value of the deck filter that means "every deck assigned to this group". */
export const ALL_DECKS = '';
