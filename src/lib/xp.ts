import { cardXp } from '@/lib/flashcardUtils';

export { cardXp };

/** XP for a wrong answer — correct answers earn cardXp(jlptLevel) instead. */
export const XP_PER_WRONG = 2;

export const xpForLevel = (level: number) => level * 200;

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
  }
  return level;
}
