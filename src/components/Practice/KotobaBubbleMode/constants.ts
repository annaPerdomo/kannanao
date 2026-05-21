/** Max lives the player starts with */
export const MAX_LIVES = 3;

/** XP awarded for a correct answer */
export const XP_CORRECT = 40;

/** XP awarded for a wrong answer (participation) */
export const XP_WRONG = 2;

/** Bonus XP for completing with no mistakes */
export const XP_PERFECT_BONUS = 50;

/** Minimum sentences required to play */
export const MIN_SENTENCES = 3;

/** Kid-friendly particle hints shown on wrong answers */
export const PARTICLE_HINTS: Record<string, string> = {
  は: "tells us who or what we're talking about",
  が: 'shows who does the action',
  を: 'shows what the action happens to',
  に: 'tells us where or when',
  で: 'tells us where something happens or how',
  へ: "shows the direction we're going",
  と: 'means "and" or "with"',
  も: 'means "also" or "too"',
  の: 'connects two things, like "\'s" in English',
  か: 'makes a question',
  から: 'means "from" or "because"',
  まで: 'means "until" or "up to"',
  より: 'means "more than"',
};

/** Bubble colors — theme-independent, intentionally vibrant for game feel */
export const BUBBLE_COLORS = ['#FF6B9D', '#06B6D4', '#A855F7', '#F59E0B', '#10B981', '#F43F5E'];
