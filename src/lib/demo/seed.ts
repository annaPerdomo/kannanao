import { LAPSE_INTERVAL_DAYS } from '@/lib/srs';
import type { CardProgress } from '@/lib/supabase';
import { cardXp, levelFromXp, XP_PER_WRONG } from '@/lib/xp';
import type { Deck } from '@/types/deck';
import type { Flashcard } from '@/types/flashcard';
import type { DbPracticeSentence } from '@/types/practiceSentence';

import { DEMO_CARDS, DEMO_DECK, DEMO_SENTENCES, demoAssignment } from './deck';
import { DEMO_USERNAME_PREFIX } from './identity';
import { DEMO_PERSONAS } from './personas';
import type { DemoDayLog } from './simulate';
import { simulatePersona, SITTING_GAP_MS } from './simulate';
import { dateKey } from './time';

export interface DemoSeedLearner {
  username: string;
  displayName: string;
  progress: CardProgress[];
  days: DemoDayLog[];
}

export interface DemoSessionStats {
  date: string;
  startedAt: string;
  endedAt: string;
  practiceMode: string;
  cardsStudied: number;
  cardsCorrect: number;
  xpEarned: number;
}

export interface DemoProgressTotals {
  totalXp: number;
  level: number;
  totalCardsStudied: number;
  totalCorrect: number;
  totalSessions: number;
  streakDays: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

export interface DemoSeed {
  organizer: { username: string; displayName: string };
  group: { name: string };
  learners: DemoSeedLearner[];
  deck: Deck;
  cards: Flashcard[];
  sentences: DbPracticeSentence[];
  assignment: ReturnType<typeof demoAssignment>;
}

export function buildDemoSeed(now: Date): DemoSeed {
  const sims = DEMO_PERSONAS.map((persona) => simulatePersona(persona, now));

  return {
    organizer: { username: `${DEMO_USERNAME_PREFIX}teacher`, displayName: 'Demo Teacher' },
    group: { name: 'Demo group: Japanese 101' },
    learners: sims.map((sim) => ({
      username: sim.persona.username,
      displayName: sim.persona.displayName,
      progress: sim.progress,
      days: sim.days,
    })),
    deck: DEMO_DECK,
    cards: DEMO_CARDS,
    sentences: DEMO_SENTENCES,
    assignment: demoAssignment(now),
  };
}

/** One `study_sessions` row per played leg, in plan order, back-to-back in time —
 * the real app opens and closes a session per leg, never one for the whole day. */
export function sessionStatsForDay(day: DemoDayLog): DemoSessionStats[] {
  let cursor = Date.parse(day.now);
  return day.legSessions.map((leg) => {
    const cardsStudied = leg.answers.length;
    const cardsCorrect = leg.answers.filter((a) => a.correct).length;
    const xpEarned = leg.answers.reduce(
      (sum, a) => sum + (a.correct ? cardXp('N5') : XP_PER_WRONG),
      0,
    );
    const startedAt = new Date(cursor).toISOString();
    const lastAnsweredOffset = cardsStudied > 0 ? (cardsStudied - 1) * SITTING_GAP_MS : 0;
    cursor += lastAnsweredOffset;
    const endedAt = new Date(cursor).toISOString();
    return {
      date: day.date,
      startedAt,
      endedAt,
      practiceMode: leg.mode,
      cardsStudied,
      cardsCorrect,
      xpEarned,
    };
  });
}

/** Rough streak/XP totals for a learner's `user_progress` row, from their day logs. */
export function progressTotalsFor(days: DemoDayLog[], now: Date): DemoProgressTotals {
  const sessions = days.flatMap(sessionStatsForDay).sort((a, b) => (a.date < b.date ? -1 : 1));

  const totalXp = sessions.reduce((sum, s) => sum + s.xpEarned, 0);
  const totalCardsStudied = sessions.reduce((sum, s) => sum + s.cardsStudied, 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + s.cardsCorrect, 0);

  // Several rows now share a date (one per leg) — the streak counts study
  // days, not rows, so it walks the distinct dates instead.
  const studyDates = [...new Set(sessions.map((s) => s.date))].sort();

  let streakDays = 0;
  let longestStreak = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const date of studyDates) {
    if (prevDate === null) {
      run = 1;
    } else {
      const gapDays = Math.round((Date.parse(date) - Date.parse(prevDate)) / 86_400_000);
      run = gapDays === 1 ? run + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prevDate = date;
  }

  const today = dateKey(now);
  const lastStudyDate = studyDates.length > 0 ? studyDates[studyDates.length - 1] : null;
  const gapFromToday =
    lastStudyDate != null
      ? Math.round((Date.parse(today) - Date.parse(lastStudyDate)) / 86_400_000)
      : null;
  streakDays = gapFromToday === 0 || gapFromToday === 1 ? run : 0;

  return {
    totalXp,
    level: levelFromXp(totalXp),
    totalCardsStudied,
    totalCorrect,
    totalSessions: sessions.length,
    streakDays,
    longestStreak,
    lastStudyDate,
  };
}

/** Lapse counts per card, the way `increment_card_progress` stamps `lapse_count`:
 * a wrong first-pass answer when the card's prior interval was already >= LAPSE_INTERVAL_DAYS. */
export function lapseCountsFor(days: DemoDayLog[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const day of days) {
    const missedThisDay = new Set(day.answers.filter((a) => !a.correct).map((a) => a.cardId));
    for (const change of day.changes) {
      if (!missedThisDay.has(change.cardId)) continue;
      const priorInterval = change.before?.intervalDays ?? 0;
      if (priorInterval >= LAPSE_INTERVAL_DAYS) {
        counts.set(change.cardId, (counts.get(change.cardId) ?? 0) + 1);
      }
    }
  }
  return counts;
}
