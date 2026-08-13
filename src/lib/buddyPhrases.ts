/**
 * Copy lives in the message catalogs under `Shop.buddies.<key>.friendship.l2..l5`,
 * so every reader here takes it as `unknown`: most buddies have none written,
 * and a missing or half-authored level must degrade rather than throw in render.
 */

import { type FriendshipSource, MAX_FRIENDSHIP_LEVEL } from './friendship';

/** Lowest level that unlocks a story — level 1 is where everyone starts. */
export const FIRST_STORY_LEVEL = 2;

export interface BuddyStory {
  level: number;
  lines: string[];
}

function stringLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((line): line is string => typeof line === 'string' && line.trim() !== '');
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function levelCopy(copy: unknown, level: number): Record<string, unknown> | null {
  if (!copy || typeof copy !== 'object') return null;
  const entry = (copy as Record<string, unknown>)[`l${level}`];
  return entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null;
}

/** The story unlocked at `level`, or [] when this buddy has none written. */
export function storyLines(copy: unknown, level: number): string[] {
  return stringLines(levelCopy(copy, level)?.story);
}

/** Oldest first. A reached level with no copy is dropped, not rendered empty. */
export function unlockedStories(copy: unknown, level: number): BuddyStory[] {
  const stories: BuddyStory[] = [];
  const reached = Math.min(level, MAX_FRIENDSHIP_LEVEL);
  for (let l = FIRST_STORY_LEVEL; l <= reached; l++) {
    const lines = storyLines(copy, l);
    if (lines.length) stories.push({ level: l, lines });
  }
  return stories;
}

export function memoryTitle(copy: unknown, level: number): string | null {
  return nonEmptyString(levelCopy(copy, level)?.title);
}

export function memoryTeaser(copy: unknown, level: number): string | null {
  return nonEmptyString(levelCopy(copy, level)?.teaser);
}

/**
 * Index matches MINOR_MILESTONES, so an unauthored entry holds its place as ''
 * rather than shifting every later fact onto the wrong milestone.
 */
export function buddyFacts(copy: unknown): string[] {
  if (!copy || typeof copy !== 'object') return [];
  const value = (copy as Record<string, unknown>).facts;
  if (!Array.isArray(value)) return [];
  const facts = value.map((line) => (typeof line === 'string' && line.trim() !== '' ? line : ''));
  while (facts.length && !facts[facts.length - 1]) facts.pop();
  return facts;
}

export function awardLine(copy: unknown, source: FriendshipSource): string | null {
  if (!copy || typeof copy !== 'object') return null;
  const awards = (copy as Record<string, unknown>).awards;
  if (!awards || typeof awards !== 'object') return null;
  return nonEmptyString((awards as Record<string, unknown>)[source]);
}

/**
 * Base rotation plus the idle lines every reached level unlocked. Deduped, so a
 * line repeated across levels doesn't come up twice as often.
 */
export function blendHomePhrases(basePhrases: string[], copy: unknown, level: number): string[] {
  const pool = stringLines(basePhrases);
  const reached = Math.min(level, MAX_FRIENDSHIP_LEVEL);
  for (let l = FIRST_STORY_LEVEL; l <= reached; l++) {
    pool.push(...stringLines(levelCopy(copy, l)?.phrases));
  }
  return [...new Set(pool)];
}
