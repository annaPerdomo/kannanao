import { describe, expect, it } from 'vitest';

import { PRACTICE_CONFIG } from '@/components/Deck/constants';
import { MODE_EMOJIS } from '@/components/Practice/CelebrationScreen/constants';
import { MODE_COLORS, MODE_LABELS } from '@/components/Stats/constants';
import { GOAL_MODE_LABELS, GOAL_MODES, isGoalMode } from '@/lib/assignmentMastery';

// A practice mode is only usable once it is registered in every one of these
// maps — a missing entry means a blank tile, an unlabelled stat, or a mode the
// organizer cannot assign. Guard the newest one (Listen) against that.
describe('listen mode registration', () => {
  it('should have a tile on the deck practice picker', () => {
    const tile = PRACTICE_CONFIG.find((t) => t.mode === 'listen');
    expect(tile).toBeDefined();
    expect(tile?.emoji).toBe('🎧');
    expect(tile?.label).toBe('Listen');
  });

  it('should have a stats label and colour', () => {
    expect(MODE_LABELS.listen).toBe('Listen');
    expect(MODE_COLORS.listen).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should have celebration emojis', () => {
    expect(MODE_EMOJIS.listen.length).toBeGreaterThan(0);
  });

  it('should be assignable as an organizer goal mode', () => {
    expect(GOAL_MODES).toContain('listen');
    expect(GOAL_MODE_LABELS.listen).toBe('Listen');
    expect(isGoalMode('listen')).toBe(true);
  });
});
