import { openKanaSetIds } from '@/lib/assignmentAvailability';
import { type CardStrength, cardStrength } from '@/lib/cardStrength';
import {
  dailyReviewCap,
  daysSince,
  pickFocusDeck,
  pickKanaRow,
  planDailyPracticeDetailed,
} from '@/lib/dailyPractice';
import { type DueRow, rankDueCards } from '@/lib/dueOrder';
import { endingItems } from '@/lib/grammarEndings';
import { isTricky, type WordProgressRow } from '@/lib/handoutWords';
import type { KanaProgressMap } from '@/lib/kanaProficiency';
import type { ChainLeg, ChainMode } from '@/lib/practiceChain';
import { hashSeed, seededShuffle } from '@/lib/printPlan';
import { pickQuestKana } from '@/lib/quest';
import { QUIZ_DEFAULT_COUNT } from '@/lib/quiz';
import { priorityDeckIds } from '@/lib/reviewPriority';
import { nextSchedule, START_EASE } from '@/lib/srs';
import type { CardProgress } from '@/lib/supabase';

import { DEMO_CARDS, DEMO_DECK, DEMO_SENTENCES, demoAssignment } from './deck';
import type { DemoPersona } from './personas';
import { dateKey, DAY_MS } from './time';

export const SITTING_GAP_MS = 20_000;

/** Which cards a leg's mode writes to `card_progress` — sentence and kana
 * modes never pass a cardId; `endings` writes only its drill items. */
export const PROGRESS_WRITES = {
  study: 'all',
  review: 'all',
  recall: 'all',
  listen: 'all',
  match: 'all',
  fill: 'all',
  reading: 'all',
  'kotoba-bubble': 'none',
  quiz: 'all',
  'kanji-match': 'all',
  endings: 'drill',
  'kana-journey': 'none',
} satisfies Record<ChainMode, 'all' | 'drill' | 'none'>;

export interface DemoDayPlan {
  date: string;
  /** ISO instant this day was planned — `explainPlan` reads it instead of guessing a time of day. */
  now: string;
  daysAway: number | null;
  dueCount: number;
  kanaDue: boolean;
  reviewCap: number;
  reviewCardIds: string[];
  plan: ChainLeg[];
  offered: ChainLeg[];
  sessionCardIds: string[];
}

export function planForDay(
  progress: CardProgress[],
  now: Date,
  { ttsReady = true }: { ttsReady?: boolean } = {},
): DemoDayPlan {
  const date = dateKey(now);
  const nowMs = now.getTime();

  const dueRows = progress.filter((row) => Date.parse(row.nextReviewAt) <= nowMs);
  const dueCount = dueRows.length;

  const lastStudied = progress.reduce<string | null>((latest, row) => {
    if (!row.lastReviewedAt) return latest;
    const key = dateKey(new Date(row.lastReviewedAt));
    return !latest || key > latest ? key : latest;
  }, null);
  const daysAway = daysSince(lastStudied, date);
  const reviewCap = dailyReviewCap(daysAway);

  const cardById = new Map(DEMO_CARDS.map((card) => [card.id, card]));
  const dueCardRows: DueRow[] = dueRows.flatMap((row) => {
    const card = cardById.get(row.cardId);
    return card ? [{ card, intervalDays: row.intervalDays, nextReviewAt: row.nextReviewAt }] : [];
  });
  const assignments = [demoAssignment(now)];
  const priorityIds = new Set(priorityDeckIds(assignments, date));
  const reviewCardIds = rankDueCards(dueCardRows, priorityIds)
    .slice(0, reviewCap)
    .map((card) => card.id);

  // Demo learners never carry kana_progress rows (the reset wipes them), which
  // mirrors useKanaProgress loaded-empty for a real learner with none — never the
  // pre-load null, since the simulator has no async fetch to settle.
  const byKana: KanaProgressMap = new Map();
  const assignedKanaSetIds = openKanaSetIds(assignments, date);
  const kanaDue = dueCount === 0 && pickQuestKana(byKana, assignedKanaSetIds).length > 0;
  const kanaRow = pickKanaRow(assignments, date);

  const focus = pickFocusDeck(assignments, [DEMO_DECK], date);
  const { legs: plan, offered } = planDailyPracticeDetailed({
    dueCount,
    kanaDue,
    kanaRow,
    focus,
    cards: DEMO_CARDS,
    progress,
    ttsReady,
    sentenceCount: DEMO_SENTENCES.length,
    now,
  });

  const sessionCardIds = [
    ...new Set(plan.flatMap((leg) => (leg.step !== 'review' ? (leg.cardIds ?? []) : []))),
  ];

  return {
    date,
    now: now.toISOString(),
    daysAway,
    dueCount,
    kanaDue,
    reviewCap,
    reviewCardIds,
    plan,
    offered,
    sessionCardIds,
  };
}

export interface DemoAnswerInput {
  cardId: string;
  correct: boolean;
}

export interface DemoCardChange {
  cardId: string;
  before?: CardProgress;
  after: CardProgress;
  strengthBefore: CardStrength;
  strengthAfter: CardStrength;
}

export function answersForSitting(cardIds: string[], misses: string[]): DemoAnswerInput[] {
  const missSet = new Set(misses);
  const firstPass = cardIds.map((cardId) => ({ cardId, correct: !missSet.has(cardId) }));
  const retries = cardIds
    .filter((cardId) => missSet.has(cardId))
    .map((cardId) => ({ cardId, correct: true }));
  return [...firstPass, ...retries];
}

export function applyAnswers(
  progress: CardProgress[],
  answers: DemoAnswerInput[],
  at: Date,
): { progress: CardProgress[]; changes: DemoCardChange[] } {
  const byId = new Map(progress.map((row) => [row.cardId, row]));
  const changes = new Map<string, DemoCardChange>();

  answers.forEach((answer, i) => {
    const answeredAt = new Date(at.getTime() + i * SITTING_GAP_MS);
    const before = byId.get(answer.cardId);
    const current: CardProgress = before ?? {
      cardId: answer.cardId,
      correctCount: 0,
      wrongCount: 0,
      lastReviewedAt: null,
      nextReviewAt: answeredAt.toISOString(),
      intervalDays: 0,
      ease: START_EASE,
    };

    const result = nextSchedule(
      {
        correct: answer.correct,
        intervalDays: current.intervalDays,
        ease: current.ease,
        lastReviewedAt: current.lastReviewedAt ? new Date(current.lastReviewedAt) : null,
      },
      answeredAt,
    );

    const after: CardProgress = {
      cardId: answer.cardId,
      correctCount: current.correctCount + (answer.correct ? 1 : 0),
      wrongCount: current.wrongCount + (answer.correct ? 0 : 1),
      lastReviewedAt: answeredAt.toISOString(),
      nextReviewAt: result.nextReviewAt.toISOString(),
      intervalDays: result.intervalDays,
      ease: result.ease,
    };
    byId.set(answer.cardId, after);

    const existing = changes.get(answer.cardId);
    changes.set(answer.cardId, {
      cardId: answer.cardId,
      before: existing ? existing.before : before,
      after,
      strengthBefore: existing ? existing.strengthBefore : cardStrength(before),
      strengthAfter: cardStrength(after),
    });
  });

  return { progress: [...byId.values()], changes: [...changes.values()] };
}

const DRILL_CARD_IDS = new Set(
  endingItems(DEMO_CARDS)
    .filter((item) => item.drillsCard)
    .map((item) => item.card.id),
);

function quizStandIn(seedKey: string, date: string): string[] {
  const seed = hashSeed(`${seedKey}${date}`);
  return seededShuffle(DEMO_CARDS, seed)
    .slice(0, QUIZ_DEFAULT_COUNT)
    .map((card) => card.id);
}

function legCardIds(
  leg: ChainLeg,
  sessionCardIds: string[],
  seedKey: string,
  date: string,
): string[] {
  if (leg.cardIds) return leg.cardIds;
  if (leg.step !== 'goal') return sessionCardIds;
  if (leg.mode === 'quiz') return quizStandIn(seedKey, date);
  return DEMO_CARDS.map((card) => card.id);
}

function writableCardIds(leg: ChainLeg, cardIds: string[]): string[] {
  const writes = PROGRESS_WRITES[leg.mode];
  if (writes === 'none') return [];
  if (writes === 'drill') return cardIds.filter((id) => DRILL_CARD_IDS.has(id));
  return cardIds;
}

/** One `study_sessions` row's worth of answers — the real app opens one session
 * per played leg (`startSession`/`endSession` in `useProgress.ts`). */
export interface DemoLegSession {
  mode: ChainMode;
  answers: DemoAnswerInput[];
}

function playSitting(
  progress: CardProgress[],
  at: Date,
  misses: string[],
  seedKey: string,
  opts: { ttsReady?: boolean } = {},
): {
  dayPlan: DemoDayPlan;
  answers: DemoAnswerInput[];
  changes: DemoCardChange[];
  legSessions: DemoLegSession[];
  progress: CardProgress[];
  lastAnsweredAt: Date;
} {
  const dayPlan = planForDay(progress, at, opts);
  const askedIds = new Set<string>();
  const answers: DemoAnswerInput[] = [];
  const legSessions: DemoLegSession[] = [];

  // Empty when the review leg exists only for kanaDue: no kana answers are
  // simulated, so that leg's session reports zero rather than invented ones.
  const reviewAnswers =
    dayPlan.reviewCardIds.length > 0 ? answersForSitting(dayPlan.reviewCardIds, misses) : [];
  if (reviewAnswers.length > 0) {
    answers.push(...reviewAnswers);
    dayPlan.reviewCardIds.forEach((id) => askedIds.add(id));
  }

  for (const leg of dayPlan.plan) {
    if (leg.mode === 'review') {
      legSessions.push({ mode: leg.mode, answers: reviewAnswers });
      continue;
    }
    const cardIds = legCardIds(leg, dayPlan.sessionCardIds, seedKey, dayPlan.date);
    legSessions.push({ mode: leg.mode, answers: answersForSitting(cardIds, misses) });
    const writable = writableCardIds(leg, cardIds);
    if (writable.length === 0) continue;
    answers.push(...answersForSitting(writable, misses));
    writable.forEach((id) => askedIds.add(id));
  }

  for (const missedId of misses) {
    if (!askedIds.has(missedId)) {
      throw new Error(
        `${seedKey}: miss "${missedId}" on ${dayPlan.date} was not asked by any writing leg`,
      );
    }
  }

  const { progress: nextProgress, changes } = applyAnswers(progress, answers, at);
  const lastAnsweredAt =
    answers.length > 0 ? new Date(at.getTime() + (answers.length - 1) * SITTING_GAP_MS) : at;
  return { dayPlan, answers, changes, legSessions, progress: nextProgress, lastAnsweredAt };
}

export interface DemoDayLog extends DemoDayPlan {
  answers: DemoAnswerInput[];
  changes: DemoCardChange[];
  legSessions: DemoLegSession[];
}

export interface DemoSimulation {
  persona: DemoPersona;
  days: DemoDayLog[];
  progress: CardProgress[];
  today: DemoDayPlan;
  now: string;
}

export function simulatePersona(persona: DemoPersona, now: Date): DemoSimulation {
  const oldestFirst = [...persona.history].sort((a, b) => b.daysAgo - a.daysAgo);

  let progress: CardProgress[] = [];
  const days: DemoDayLog[] = [];

  for (const studyDay of oldestFirst) {
    const at = new Date(now.getTime() - studyDay.daysAgo * DAY_MS);
    const {
      dayPlan,
      answers,
      changes,
      legSessions,
      progress: nextProgress,
    } = playSitting(progress, at, studyDay.misses, persona.key);
    progress = nextProgress;
    days.push({ ...dayPlan, answers, changes, legSessions });
  }

  const today = planForDay(progress, now);
  return { persona, days, progress, today, now: now.toISOString() };
}

export function whatIf(
  progress: CardProgress[],
  misses: string[],
  now: Date,
  opts: { ttsReady?: boolean; personaKey?: string } = {},
): {
  changes: DemoCardChange[];
  progress: CardProgress[];
  today: DemoDayPlan;
  tomorrow: DemoDayPlan;
} {
  const {
    dayPlan,
    changes,
    progress: nextProgress,
    lastAnsweredAt,
  } = playSitting(progress, now, misses, opts.personaKey ?? 'whatif', { ttsReady: opts.ttsReady });
  // Uses lastAnsweredAt, not `now`: a retry lands seconds later, so `now + 1
  // day` can fall just short of a card's one-day-out review and miss it.
  const tomorrow = planForDay(nextProgress, new Date(lastAnsweredAt.getTime() + DAY_MS), {
    ttsReady: opts.ttsReady,
  });
  return { changes, progress: nextProgress, today: dayPlan, tomorrow };
}

export function groupProgressRows(sims: DemoSimulation[]): WordProgressRow[] {
  return sims.flatMap((sim) =>
    sim.progress.map((row) => ({
      userId: sim.persona.username,
      cardId: row.cardId,
      correctCount: row.correctCount,
      wrongCount: row.wrongCount,
      lastReviewedAt: row.lastReviewedAt,
      nextReviewAt: row.nextReviewAt,
      intervalDays: row.intervalDays,
      ease: row.ease,
    })),
  );
}

function shortCardName(cardId: string): string {
  return cardId.replace('demo-card-', '');
}

function formatRelative(targetIso: string, from: Date): string {
  const diffMs = Date.parse(targetIso) - from.getTime();
  const mins = Math.round(diffMs / 60_000);
  const sign = mins >= 0 ? '+' : '';
  if (Math.abs(mins) < 60 * 24) return `${sign}${mins}m`;
  const days = Math.round(diffMs / DAY_MS);
  return `${days >= 0 ? '+' : ''}${days}d`;
}

export function summarizeSimulation(sim: DemoSimulation): string {
  const now = new Date(sim.now);

  const dayLines = sim.days.map((day) => {
    const daysAgo = daysSince(day.date, sim.today.date) ?? 0;
    const missed = [
      ...new Set(day.answers.filter((a) => !a.correct).map((a) => shortCardName(a.cardId))),
    ];
    const modes = day.plan.map((leg) => leg.mode).join(',');
    const session = day.sessionCardIds.map(shortCardName).join(',');
    const missedPart = missed.length > 0 ? ` | missed ${missed.join(',')}` : '';
    return (
      `d-${daysAgo} ${day.date} due ${day.dueCount} cap ${day.reviewCap} ` +
      `review=${day.reviewCardIds.length} session=${session} | ${modes}${missedPart}`
    );
  });

  const cardLines = DEMO_CARDS.filter((card) => sim.progress.some((row) => row.cardId === card.id))
    .map((card) => sim.progress.find((row) => row.cardId === card.id)!)
    .map((row) => {
      const strength = cardStrength(row);
      const trickyMark = isTricky(row.correctCount, row.wrongCount) ? ' tricky' : '';
      return (
        `${shortCardName(row.cardId)} ${strength} ${row.correctCount}/${row.wrongCount}${trickyMark} ` +
        `next${formatRelative(row.nextReviewAt, now)}`
      );
    });

  const todayLine = `today: due ${sim.today.dueCount} cap ${sim.today.reviewCap} | ${sim.today.plan
    .map((leg) => leg.mode)
    .join(',')}`;

  return [...dayLines, ...cardLines, todayLine].join('\n');
}
