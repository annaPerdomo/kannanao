import type { SessionMode } from '@/hooks/useProgress';

export const MODE_LABELS: Record<SessionMode, string> = {
  study: 'Study',
  review: 'Review',
  match: 'Match',
  fill: 'Fill',
  recall: 'Recall',
  quiz: 'Quiz',
  listen: 'Listen',
  reading: 'Reading',
  speech_read: 'Read-Through',
  speech_recall: 'Line Recall',
  'kotoba-bubble': 'Sentence Builder',
  'kana-build': 'Kana Builder',
  'kana-journey': 'Learn Kana',
  'particle-quiz': 'Particle Picker',
  'question-quiz': 'Question Quest',
  'word-match': 'Word Match',
  'counter-quiz': 'How Many?',
};

export const MODE_COLORS: Record<SessionMode, string> = {
  study: '#6366F1',
  review: '#F472B6',
  match: '#10B981',
  fill: '#F59E0B',
  recall: '#3B82F6',
  quiz: '#DB2777',
  listen: '#4338CA',
  reading: '#047857',
  speech_read: '#EC4899',
  speech_recall: '#8B5CF6',
  'kotoba-bubble': '#06B6D4',
  'kana-build': '#F97316',
  'kana-journey': '#E11D48',
  'particle-quiz': '#84CC16',
  'question-quiz': '#14B8A6',
  'word-match': '#EAB308',
  'counter-quiz': '#A855F7',
};

export function modeLabel(mode: SessionMode | null | undefined): string {
  return mode ? (MODE_LABELS[mode] ?? mode) : 'Study';
}

export function modeColor(mode: SessionMode | null | undefined): string {
  return mode ? (MODE_COLORS[mode] ?? '#6366F1') : '#6366F1';
}

export function toLocalDateStr(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function sessionLocalDate(started_at: string): string {
  return toLocalDateStr(new Date(started_at));
}

export interface ModeBreakdownEntry {
  mode: string;
  sessions: number;
  cardsStudied: number;
  cardsCorrect: number;
  accuracy: number;
}

/** Shared by the group and admin dashboards so "what are people actually
 * practicing" reads the same way everywhere it's asked. */
export function aggregateModeBreakdown(
  sessions: {
    practice_mode?: string | null;
    cards_studied?: number | null;
    cards_correct?: number | null;
  }[],
): ModeBreakdownEntry[] {
  const totals = new Map<string, { sessions: number; cards: number; correct: number }>();
  for (const s of sessions) {
    const mode = s.practice_mode || 'study';
    const bucket = totals.get(mode) ?? { sessions: 0, cards: 0, correct: 0 };
    bucket.sessions += 1;
    bucket.cards += s.cards_studied ?? 0;
    bucket.correct += s.cards_correct ?? 0;
    totals.set(mode, bucket);
  }
  return Array.from(totals.entries())
    .map(([mode, v]) => ({
      mode,
      sessions: v.sessions,
      cardsStudied: v.cards,
      cardsCorrect: v.correct,
      accuracy: v.cards > 0 ? Math.round((v.correct / v.cards) * 100) : 0,
    }))
    .sort((a, b) => b.cardsStudied - a.cardsStudied);
}
