import type { Flashcard } from '@/types/flashcard';

/**
 * Quiz mode — a graded, exam-like checkpoint. Unlike the practice modes it never
 * retries or re-queues a wrong card: every question is asked exactly once, so the
 * final score is a fair snapshot the teacher can put in a gradebook. This module
 * holds the pure, framework-free pieces (question building, scoring, CSV) so they
 * can be unit-tested without React or Supabase.
 */

/** Default number of questions when a deck has more cards than this. */
export const QUIZ_DEFAULT_COUNT = 10;

/** Alternating question formats — multiple-choice meaning, then typed answer. */
export type QuizQuestionType = 'choice' | 'typed';

export interface QuizQuestion {
  card: Flashcard;
  type: QuizQuestionType;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build the fixed question list for one quiz: a random sample of up to `count`
 * cards (all of them when the deck is smaller), each asked ONCE, with question
 * types alternating choice → typed → choice… so the quiz mixes recognition and
 * recall. The list is fixed up front — there is deliberately no re-queue.
 */
export function buildQuizQuestions(cards: Flashcard[], count = QUIZ_DEFAULT_COUNT): QuizQuestion[] {
  const picked = shuffle(cards).slice(0, Math.min(count, cards.length));
  return picked.map((card, i) => ({ card, type: i % 2 === 0 ? 'choice' : 'typed' }));
}

/**
 * Whether a typed answer is correct. Accepts either the written form (`word`)
 * or the reading, both trimmed. Matches FillMode's checking so the two typed
 * surfaces behave identically for students.
 */
export function checkTypedAnswer(input: string, card: Flashcard): boolean {
  const trimmed = input.trim();
  return trimmed.length > 0 && (trimmed === card.word || trimmed === card.reading);
}

/**
 * Star rating for a finished quiz: 3 stars at 90%+, 2 at 70%+, else 1. Kept as
 * simple thresholds a student instantly understands. `accuracyPct` is 0–100.
 */
export function quizStars(accuracyPct: number): 1 | 2 | 3 {
  if (accuracyPct >= 90) return 3;
  if (accuracyPct >= 70) return 2;
  return 1;
}

/** One friendly, non-anxious line for the finish screen, keyed to the star tier. */
export function quizEncouragement(stars: 1 | 2 | 3): string {
  switch (stars) {
    case 3:
      return 'Amazing! You really know these. 🌟';
    case 2:
      return 'Great work — so close to perfect! 💪';
    default:
      return 'Nice try! A little more practice and these are yours. 🌱';
  }
}

/** Accuracy as a rounded 0–100 integer; 0 when no questions were answered. */
export function quizAccuracy(score: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((score / total) * 100);
}

// ─── CSV export ────────────────────────────────────────────────────────────────

/** A single member's quiz standing for one deck, as returned by the API. */
export interface QuizScoreRow {
  memberId: string;
  name: string;
  attempts: number;
  best: { score: number; total: number; accuracy: number } | null;
  latest: { score: number; total: number; accuracy: number; takenAt: string } | null;
}

/** Wrap a value in quotes and escape embedded quotes, per RFC 4180. */
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ymd(iso: string): string {
  // Take the date portion of an ISO timestamp without pulling in a date lib.
  return iso.slice(0, 10);
}

/**
 * Turn already-fetched quiz standings into a CSV string (member name, deck,
 * best score, latest score, attempts, last taken date). Generated fully
 * client-side — there is no server endpoint for the export itself.
 */
export function quizResultsToCsv(rows: QuizScoreRow[], deckName: string): string {
  const header = ['Member', 'Deck', 'Best Score', 'Latest Score', 'Attempts', 'Last Taken'];
  const lines = rows.map((r) => {
    const best = r.best ? `${r.best.score}/${r.best.total}` : '';
    const latest = r.latest ? `${r.latest.score}/${r.latest.total}` : '';
    const lastTaken = r.latest ? ymd(r.latest.takenAt) : '';
    return [r.name, deckName, best, latest, r.attempts, lastTaken].map(csvCell).join(',');
  });
  return [header.map(csvCell).join(','), ...lines].join('\n');
}
