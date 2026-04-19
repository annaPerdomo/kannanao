import type { SessionMode } from '@/hooks/useProgress';

export const MODE_LABELS: Record<SessionMode, string> = {
  study:         'Study',
  match:         'Match',
  fill:          'Fill',
  recall:        'Recall',
  speech_read:   'Read-Through',
  speech_recall: 'Line Recall',
};

export const MODE_COLORS: Record<SessionMode, string> = {
  study:         '#6366F1',
  match:         '#10B981',
  fill:          '#F59E0B',
  recall:        '#3B82F6',
  speech_read:   '#EC4899',
  speech_recall: '#8B5CF6',
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
