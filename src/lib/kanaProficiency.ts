import { allKana, getSet, kanaDifficulty, type KanaTrack } from '@/lib/kanaCurriculum';

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

// Stars read earned strength, never decayed strength: "she has learned this"
// must survive a week away, which is what kanaStrengthState answers instead.
export function kanaStars(progress?: KanaMastery): KanaStars {
  const strength = earnedStrength(progress);
  if (strength >= STRENGTH_BANDS[2]) return 3;
  if (strength >= STRENGTH_BANDS[1]) return 2;
  if (strength >= STRENGTH_BANDS[0]) return 1;
  return 0;
}

export type KanaStrengthState = 'new' | 'learning' | 'rusty' | 'solid';

export function kanaStrengthState(
  progress: KanaMastery | undefined,
  now: Date = new Date(),
): KanaStrengthState {
  if (isUnseen(progress)) return 'new';
  if (kanaStrength(progress, now) >= STRONG_STRENGTH) return 'solid';
  if (earnedStrength(progress) >= STRONG_STRENGTH) return 'rusty';
  return 'learning';
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

export const STRONG_STRENGTH = STRENGTH_BANDS[2];

export const STRONG_INTERLEAVE_RATIO = 0.25;

export const MAX_UNSEEN_PER_QUEUE = 5;

export const REVIEW_SESSION_SIZE = 12;

const UNSEEN_SCORE = 0.8;
const DIFFICULTY_PRIOR_MAX = 0.6;
const PRIOR_HALF_EVIDENCE = 3;
const DUE_BONUS = 0.3;
const OVERDUE_BONUS_PER_DAY = 0.05;
const MAX_OVERDUE_BONUS = 0.2;
const LAST_ANSWER_WRONG_BONUS = 0.3;

export interface ReviewQueueOptions {
  /**
   * Upper bound, not a promise: a queue runs short rather than introduce more
   * than `MAX_UNSEEN_PER_QUEUE` never-answered characters at once.
   */
  size: number;
  track?: KanaTrack | 'both';
  setId?: string;
  includeStrong?: boolean;
  now?: Date;
}

export function difficultyWeight(answers: number): number {
  return 1 / (1 + answers / PRIOR_HALF_EVIDENCE);
}

function overdueBonus(progress: KanaMastery, now: Date): number {
  if (!progress.nextReviewAt) return 0;
  const overdueMs = now.getTime() - new Date(progress.nextReviewAt).getTime();
  if (overdueMs < 0) return 0;
  return DUE_BONUS + Math.min(MAX_OVERDUE_BONUS, (overdueMs / DAY_MS) * OVERDUE_BONUS_PER_DAY);
}

function reviewScore(kana: string, progress: KanaMastery | undefined, now: Date): number {
  if (!progress || isUnseen(progress)) return UNSEEN_SCORE;
  const prior =
    kanaDifficulty(kana) * difficultyWeight(totalAnswers(progress)) * DIFFICULTY_PRIOR_MAX;
  // srs_next zeroes the interval only on a wrong answer, so this reads "she
  // missed it last time" without a second column.
  const missedLast = progress.intervalDays === 0 ? LAST_ANSWER_WRONG_BONUS : 0;
  return 1 - kanaStrength(progress, now) + overdueBonus(progress, now) + missedLast + prior;
}

// The whole chart, never the progress rows: a character with no row has no
// next_review_at, so a pool built from rows never surfaces it.
function queuePool({ setId, track }: ReviewQueueOptions): string[] {
  if (setId) return getSet(setId)?.entries.map((e) => e.kana) ?? [];
  return track && track !== 'both' ? allKana(track) : allKana();
}

function interleave(needy: string[], strong: string[]): string[] {
  if (strong.length === 0) return needy;
  const gap = Math.max(1, Math.round(needy.length / (strong.length + 1)));
  const out: string[] = [];
  let placed = 0;
  needy.forEach((kana, i) => {
    out.push(kana);
    if (placed < strong.length && (i + 1) % gap === 0) out.push(strong[placed++]);
  });
  return [...out, ...strong.slice(placed)];
}

interface ScoredKana {
  kana: string;
  score: number;
  strong: boolean;
}

const byScore = (a: ScoredKana, b: ScoredKana) => b.score - a.score;

function splitPool(
  byKana: KanaProgressMap,
  opts: ReviewQueueOptions,
  now: Date,
): { needy: string[]; strong: string[] } {
  const pool = queuePool(opts);
  const scored = pool
    .filter((kana) => !isUnseen(byKana.get(kana)))
    .map((kana) => ({
      kana,
      score: reviewScore(kana, byKana.get(kana), now),
      strong: kanaStrength(byKana.get(kana), now) >= STRONG_STRENGTH,
    }))
    .sort(byScore);

  // Unseen characters keep curriculum order: a beginner meets あ before にゃ.
  const fresh = pool
    .filter((kana) => isUnseen(byKana.get(kana)))
    .slice(0, MAX_UNSEEN_PER_QUEUE)
    .map((kana) => ({ kana, score: UNSEEN_SCORE, strong: false }));

  return {
    needy: [...scored.filter((c) => !c.strong), ...fresh].sort(byScore).map((c) => c.kana),
    strong: scored.filter((c) => c.strong).map((c) => c.kana),
  };
}

export function pickReviewQueue(byKana: KanaProgressMap, opts: ReviewQueueOptions): string[] {
  const now = opts.now ?? new Date();
  const size = Math.max(0, Math.floor(opts.size));
  const { needy, strong } = splitPool(byKana, opts, now);

  const allowStrong = opts.includeStrong !== false;
  const strongSlots = allowStrong
    ? Math.min(strong.length, Math.floor(size * STRONG_INTERLEAVE_RATIO))
    : 0;
  const picked = needy.slice(0, size - strongSlots);
  const backfill = allowStrong ? size - strongSlots - picked.length : 0;
  return interleave(picked, strong.slice(0, strongSlots + backfill));
}

export function needsReviewCount(
  byKana: KanaProgressMap,
  opts: Omit<ReviewQueueOptions, 'size'> = {},
): number {
  const now = opts.now ?? new Date();
  return splitPool(byKana, { ...opts, size: 0 }, now).needy.filter(
    (kana) => !isUnseen(byKana.get(kana)),
  ).length;
}

export const NEW_LEARNER_MAX_SEEN = 10;

export function isNewLearner(byKana: KanaProgressMap): boolean {
  let seen = 0;
  for (const progress of byKana.values()) {
    if (!isUnseen(progress) && (seen += 1) >= NEW_LEARNER_MAX_SEEN) return false;
  }
  return true;
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
