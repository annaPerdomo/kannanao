import { describe, expect, it } from 'vitest';

import { PRACTICE_CONFIG } from '@/components/Deck/constants';
import { goalModeMessageKey } from '@/components/Group/useGoalLabel';
import { MODE_EMOJIS } from '@/components/Practice/CelebrationScreen/constants';
import { MODE_COLORS, MODE_LABELS } from '@/components/Stats/constants';
import { GOAL_MODE_LABELS, GOAL_MODES, type GoalMode, isGoalMode } from '@/lib/assignmentMastery';
import en from '@/messages/en.json';
import ja from '@/messages/ja.json';

// A practice mode is only usable once it is registered in every one of these
// maps — a missing entry means a blank tile, an unlabelled stat, or a mode the
// organizer cannot assign. Guard the newest one (Listen) against that.
describe('listen mode registration', () => {
  it('should have a tile on the deck practice picker', () => {
    const tile = PRACTICE_CONFIG.find((t) => t.mode === 'listen');
    expect(tile).toBeDefined();
    expect(tile?.kanji).toBe('聞');
    expect(tile?.labelKey).toBe('listen.label');
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

describe('reading mode registration', () => {
  it('should have a tile on the deck practice picker', () => {
    const tile = PRACTICE_CONFIG.find((t) => t.mode === 'reading');
    expect(tile).toBeDefined();
    expect(tile?.kanji).toBe('読');
    expect(tile?.labelKey).toBe('reading.label');
  });

  it('should have a stats label and colour', () => {
    expect(MODE_LABELS.reading).toBe('Reading');
    expect(MODE_COLORS.reading).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should have celebration emojis', () => {
    expect(MODE_EMOJIS.reading.length).toBeGreaterThan(0);
  });

  it('should be assignable as an organizer goal mode', () => {
    expect(GOAL_MODES).toContain('reading');
    expect(GOAL_MODE_LABELS.reading).toBe('Reading');
    expect(isGoalMode('reading')).toBe(true);
  });
});

describe('kanji match mode registration', () => {
  it('should have a tile on the deck practice picker', () => {
    const tile = PRACTICE_CONFIG.find((t) => t.mode === 'kanji-match');
    expect(tile).toBeDefined();
    expect(tile?.kanji).toBe('対');
    expect(tile?.labelKey).toBe('kanjiMatch.label');
  });

  it('should have a stats label and colour', () => {
    expect(MODE_LABELS['kanji-match']).toBe('Kanji Pairs');
    expect(MODE_COLORS['kanji-match']).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should have celebration emojis', () => {
    expect(MODE_EMOJIS['kanji-match'].length).toBeGreaterThan(0);
  });

  // The point of shipping it as a mode rather than a game: it carries a deck_id.
  it('should be assignable as an organizer goal mode', () => {
    expect(GOAL_MODES).toContain('kanji-match');
    expect(GOAL_MODE_LABELS['kanji-match']).toBe('Kanji Pairs');
    expect(isGoalMode('kanji-match')).toBe(true);
  });
});

// A missing message key throws only when the mode is opened, so walk every
// registered mode in both locales rather than trusting the newest one.
const LOCALES = { en, ja } as const;

describe.each(Object.entries(LOCALES))('%s practice-mode copy', (_locale, messages) => {
  const modes = messages.Deck.practiceModes as Record<string, Record<string, string>>;
  const titles = messages.Practice.page.modeTitles as Record<string, string>;
  const goalModes = messages.Group.goalPicker.modes as Record<string, string>;

  it.each(PRACTICE_CONFIG.map((t) => t.mode))('has a tile label for %s', (mode) => {
    const tile = PRACTICE_CONFIG.find((t) => t.mode === mode)!;
    const [key] = tile.labelKey.split('.');
    expect(modes[key]?.label).toBeTruthy();
    expect(modes[key]?.description).toBeTruthy();
    expect(titles[goalModeMessageKey(mode as GoalMode)]).toBeTruthy();
  });

  it.each(GOAL_MODES)('has a goal-picker label for %s', (mode) => {
    expect(goalModes[goalModeMessageKey(mode)]).toBeTruthy();
  });
});
