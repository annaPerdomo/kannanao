import type { DirectMessage } from '@/hooks/useDirectMessages';

export const QUICK_MESSAGES_MEMBER = [
  { emoji: '🎉', text: 'I finished studying!' },
  { emoji: '📚', text: 'Can I have a new deck?' },
  { emoji: '☀️', text: 'Good morning!' },
  { emoji: '🆘', text: 'I need help!' },
  { emoji: '💕', text: 'Thank you!' },
];

/** Return a human-friendly date label for grouping */
export function dateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - msgDay.getTime();
  const days = Math.round(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

/** Group sorted (oldest-first) messages by date label */
export function groupByDate(messages: DirectMessage[]): { label: string; msgs: DirectMessage[] }[] {
  const groups: { label: string; msgs: DirectMessage[] }[] = [];
  let current: { label: string; msgs: DirectMessage[] } | null = null;
  for (const m of messages) {
    const lbl = dateLabel(m.created_at);
    if (!current || current.label !== lbl) {
      current = { label: lbl, msgs: [] };
      groups.push(current);
    }
    current.msgs.push(m);
  }
  return groups;
}
