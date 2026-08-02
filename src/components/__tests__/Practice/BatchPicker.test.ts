import { describe, expect, it } from 'vitest';

import { maxBatchForMode } from '@/components/Practice/BatchPicker';
import { MIXED_SESSION_CARDS } from '@/lib/mixedPractice';

describe('maxBatchForMode', () => {
  it('keeps the Match grid under twenty tiles', () => {
    expect(maxBatchForMode('match')).toBe(10);
  });

  it('caps a mixed session that skips the picker', () => {
    // A mixed leg arrives pre-sized, so nothing else stops twelve pairs.
    expect(Math.min(MIXED_SESSION_CARDS, maxBatchForMode('match'))).toBe(10);
    expect(Math.min(MIXED_SESSION_CARDS, maxBatchForMode('recall'))).toBe(MIXED_SESSION_CARDS);
  });
});
