import {
  type BuddyMemoryWord,
  FIRST_STORY_LEVEL,
  memoryTeaser,
  memoryTitle,
  memoryWord,
  storyLines,
} from './buddyPhrases';
import { clampPoints, friendshipLevel, LEVEL_THRESHOLDS, MAX_FRIENDSHIP_LEVEL } from './friendship';

export interface MemoryCardEntry {
  buddyKey: string;
  level: number;
  unlocked: boolean;
  heartsAway: number;
  title: string | null;
  teaser: string | null;
  lines: string[];
  word: BuddyMemoryWord | null;
}

export function memoryBuddyKeys(
  equippedKey: string,
  friendships: Record<string, { points: number }>,
): string[] {
  const others = Object.entries(friendships)
    .filter(([key, row]) => key !== equippedKey && clampPoints(row.points) > 0)
    .sort((a, b) => b[1].points - a[1].points)
    .map(([key]) => key);
  return [equippedKey, ...others];
}

export function buildMemoryCards(
  buddyKeys: string[],
  pointsFor: (buddyKey: string) => number,
  copyFor: (buddyKey: string) => unknown,
): MemoryCardEntry[] {
  const entries: MemoryCardEntry[] = [];
  const seen = new Set<string>();
  for (const buddyKey of buddyKeys) {
    if (seen.has(buddyKey)) continue;
    seen.add(buddyKey);
    const points = clampPoints(pointsFor(buddyKey));
    const copy = copyFor(buddyKey);
    const reached = friendshipLevel(points);
    for (let level = FIRST_STORY_LEVEL; level <= MAX_FRIENDSHIP_LEVEL; level++) {
      const lines = storyLines(copy, level);
      const title = memoryTitle(copy, level);
      if (!lines.length && !title) continue;
      entries.push({
        buddyKey,
        level,
        unlocked: reached >= level,
        heartsAway: Math.max(0, LEVEL_THRESHOLDS[level - 1] - points),
        title,
        teaser: memoryTeaser(copy, level),
        lines,
        word: memoryWord(copy, level),
      });
    }
  }
  return entries;
}
