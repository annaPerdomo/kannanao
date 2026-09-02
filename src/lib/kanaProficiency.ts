import { getSet, type KanaSet, type KanaTrack, setsForTrack } from '@/lib/kanaCurriculum';

/** The part of a `kana_progress` row proficiency is judged on. */
export interface KanaMastery {
  correctCount: number;
  wrongCount: number;
  nextReviewAt?: string | null;
  lastReviewedAt?: string | null;
  /** Current SRS schedule, carried so an optimistic write can advance it locally. */
  intervalDays?: number;
  ease?: number;
}

export type KanaProgressMap = Map<string, KanaMastery>;

export type KanaStars = 0 | 1 | 2 | 3;

export const STRENGTH_BANDS = [0.4, 0.6, 0.8] as const;

export const MASTERED_STARS = 3;

const DAY_MS = 86_400_000;

const MIN_HALF_LIFE_DAYS = 0.5;
const LAPSE_HALF_LIFE_CAP_DAYS = 3;

const FULL_EVIDENCE_ANSWERS = 6;

/** Sets of the first track a learner must star before the second track opens. */
export const TRACK_UNLOCK_SETS = 3;

export type IslandStatus = 'locked' | 'next' | 'available' | 'mastered';

export interface KanaIsland {
  set: KanaSet;
  stars: KanaStars;
  status: IslandStatus;
  dueCount: number;
}

export function isUnseen(progress?: KanaMastery): boolean {
  return !progress || progress.correctCount + progress.wrongCount <= 0;
}

export function totalAnswers(progress?: KanaMastery): number {
  return progress ? progress.correctCount + progress.wrongCount : 0;
}

/**
 * What the learner has earned on this character, 0..1: lifetime accuracy,
 * discounted while the evidence is thin. Never falls as time passes.
 */
export function earnedStrength(progress?: KanaMastery): number {
  if (!progress || isUnseen(progress)) return 0;
  const answers = totalAnswers(progress);
  const evidence = 0.5 + 0.5 * Math.min(1, answers / FULL_EVIDENCE_ANSWERS);
  return Math.min(1, (progress.correctCount / answers) * evidence);
}

function halfLifeDays(progress: KanaMastery): number {
  // A lapsed character's interval is 0, so its answer history holds the
  // half-life up: otherwise one slip decays a known character overnight.
  if (progress.intervalDays && progress.intervalDays > 0) return progress.intervalDays;
  return Math.max(MIN_HALF_LIFE_DAYS, Math.min(LAPSE_HALF_LIFE_CAP_DAYS, progress.correctCount));
}

/**
 * How likely the learner is to read this right now, 0..1 — earned strength
 * decayed since the last review. Drives practice order, never unlocking.
 */
export function kanaStrength(progress: KanaMastery | undefined, now: Date = new Date()): number {
  const earned = earnedStrength(progress);
  if (!progress || earned <= 0) return 0;
  const elapsedDays = progress.lastReviewedAt
    ? Math.max(0, (now.getTime() - new Date(progress.lastReviewedAt).getTime()) / DAY_MS)
    : 0;
  const retention = Math.pow(0.5, elapsedDays / halfLifeDays(progress));
  return Math.min(1, Math.max(0, earned * retention));
}

// Stars gate island and track unlocking, so they read earned strength:
// decaying them takes the map back off a learner returning from a week away.
export function kanaStars(progress?: KanaMastery): KanaStars {
  const strength = earnedStrength(progress);
  if (strength >= STRENGTH_BANDS[2]) return 3;
  if (strength >= STRENGTH_BANDS[1]) return 2;
  if (strength >= STRENGTH_BANDS[0]) return 1;
  return 0;
}

/** The "learner reads this character" bar — also reading-prompts' "the group knows this kana". */
export function isKanaKnown(progress?: KanaMastery): boolean {
  return kanaStars(progress) >= MASTERED_STARS;
}

export function setStars(setId: string, byKana: KanaProgressMap): KanaStars {
  const set = getSet(setId);
  if (!set || set.entries.length === 0) return 0;
  return set.entries.reduce<KanaStars>((worst, entry) => {
    const stars = kanaStars(byKana.get(entry.kana));
    return stars < worst ? stars : worst;
  }, 3 as KanaStars);
}

export function kanaProgressMap(rows: (KanaMastery & { kana: string })[]): KanaProgressMap {
  return new Map(rows.map((row) => [row.kana, row]));
}

function isDue(progress: KanaMastery | undefined, now: Date): boolean {
  if (!progress?.nextReviewAt) return false;
  return new Date(progress.nextReviewAt).getTime() <= now.getTime();
}

// A set opens on the previous set's FIRST star, not on mastery: gating on
// mastery strands a learner who cannot perfect one row.
export function buildIslands(
  track: KanaTrack,
  byKana: KanaProgressMap,
  now: Date = new Date(),
): KanaIsland[] {
  const islands: KanaIsland[] = [];
  let unlocked = true;
  let nextTaken = false;

  for (const set of setsForTrack(track)) {
    const stars = setStars(set.id, byKana);
    let status: IslandStatus;
    if (!unlocked) status = 'locked';
    else if (stars >= MASTERED_STARS) status = 'mastered';
    else if (!nextTaken) {
      status = 'next';
      nextTaken = true;
    } else status = 'available';

    islands.push({
      set,
      stars,
      status,
      dueCount: set.entries.filter((e) => isDue(byKana.get(e.kana), now)).length,
    });
    unlocked = unlocked && stars >= 1;
  }

  return islands;
}

export function isTrackUnlocked(track: KanaTrack, byKana: KanaProgressMap): boolean {
  if (track === 'hiragana') return true;
  return setsForTrack('hiragana')
    .slice(0, TRACK_UNLOCK_SETS)
    .every((set) => setStars(set.id, byKana) >= 1);
}

/** Feeds the "{n} of 3" count in KanaJourney.journey locked copy. */
export function trackUnlockProgress(byKana: KanaProgressMap): number {
  return setsForTrack('hiragana')
    .slice(0, TRACK_UNLOCK_SETS)
    .filter((set) => setStars(set.id, byKana) >= 1).length;
}

export function unlockedKana(track: KanaTrack, byKana: KanaProgressMap): string[] {
  return buildIslands(track, byKana)
    .filter((island) => island.status !== 'locked')
    .flatMap((island) => island.set.entries.map((e) => e.kana));
}

export function drillChars(
  setId: string,
  byKana: KanaProgressMap,
  now: Date = new Date(),
): string[] {
  const set = getSet(setId);
  if (!set) return [];
  return set.entries
    .map((entry, index) => {
      const progress = byKana.get(entry.kana);
      return {
        kana: entry.kana,
        due: isDue(progress, now),
        strength: kanaStrength(progress, now),
        index,
      };
    })
    .sort((a, b) => {
      if (a.due !== b.due) return a.due ? -1 : 1;
      if (a.strength !== b.strength) return a.strength - b.strength;
      return a.index - b.index;
    })
    .map((c) => c.kana);
}
