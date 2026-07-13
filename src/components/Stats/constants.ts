import type { SessionMode } from '@/hooks/useProgress';

export const MODE_LABELS: Record<SessionMode, string> = {
  study: 'Study',
  review: 'Review',
  match: 'Match',
  fill: 'Fill',
  recall: 'Recall',
  quiz: 'Quiz',
  listen: 'Listen',
  speech_read: 'Read-Through',
  speech_recall: 'Line Recall',
  'kotoba-bubble': 'Sentence Builder',
  'kana-build': 'Kana Builder',
  'particle-quiz': 'Particle Picker',
  'question-quiz': 'Question Quest',
  'word-match': 'Word Match',
};

export const MODE_COLORS: Record<SessionMode, string> = {
  study: '#6366F1',
  review: '#F472B6',
  match: '#10B981',
  fill: '#F59E0B',
  recall: '#3B82F6',
  quiz: '#DB2777',
  listen: '#4338CA',
  speech_read: '#EC4899',
  speech_recall: '#8B5CF6',
  'kotoba-bubble': '#06B6D4',
  'kana-build': '#F97316',
  'particle-quiz': '#84CC16',
  'question-quiz': '#14B8A6',
  'word-match': '#EAB308',
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
