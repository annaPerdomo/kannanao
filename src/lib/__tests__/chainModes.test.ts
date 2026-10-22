import { describe, expect, it } from 'vitest';

import { GOAL_MODES } from '@/lib/assignmentMastery';
import { MODE_EMOJI } from '@/lib/chainModes';

describe('MODE_EMOJI', () => {
  it('has a non-empty entry for every GOAL_MODES member plus kana-journey and endings', () => {
    for (const mode of [...GOAL_MODES, 'kana-journey', 'endings'] as const) {
      expect(MODE_EMOJI[mode]).toBeTruthy();
    }
  });

  it('gives Sentence Builder its bubble emoji', () => {
    expect(MODE_EMOJI['kotoba-bubble']).toBe('🫧');
  });
});
