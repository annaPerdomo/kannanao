import { getSet, type KanaSet, type KanaTrack, setsForTrack } from '@/lib/kanaCurriculum';

/** The part of a `kana_progress` row proficiency is judged on. */
export interface KanaMastery {
  correctCount: number;
  wrongCount: number;
  nextReviewAt?: string | null;
  /** Current SRS schedule, carried so an optimistic write can advance it locally. */
  intervalDays?: number;
  ease?: number;
}

export type KanaProgressMap = Map<string, KanaMastery>;

export type KanaStars = 0 | 1 | 2 | 3;

/** Correct answers needed for the 1st, 2nd and 3rd star. */
export const STAR_THRESHOLDS = [1, 3, 5] as const;

export const MASTERED_STARS = 3;

/** Sets of the first track a learner must star before the second track opens. */
export const TRACK_UNLOCK_SETS = 3;

export type IslandStatus = 'locked' | 'next' | 'available' | 'mastered';

export interface KanaIsland {
  set: KanaSet;
  stars: KanaStars;
  status: IslandStatus;
  dueCount: number;
}

// The last star also needs more right than wrong: without that, guessing
// through a row for long enough reads as mastered.
export function kanaStars(progress?: KanaMastery): KanaStars {
  if (!progress) return 0;
  const { correctCount, wrongCount } = progress;
  if (correctCount < STAR_THRESHOLDS[0]) return 0;
  if (correctCount < STAR_THRESHOLDS[1]) return 1;
  if (correctCount < STAR_THRESHOLDS[2] || correctCount <= wrongCount) return 2;
  return 3;
}

/** The "learner reads this character" bar. No app caller yet — read by furigana gating. */
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
      return { kana: entry.kana, due: isDue(progress, now), stars: kanaStars(progress), index };
    })
    .sort((a, b) => {
      if (a.due !== b.due) return a.due ? -1 : 1;
      if (a.stars !== b.stars) return a.stars - b.stars;
      return a.index - b.index;
    })
    .map((c) => c.kana);
}
