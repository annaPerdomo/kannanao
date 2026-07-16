import type { DirectMessage } from '@/hooks/useDirectMessages';

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

/**
 * Structured (translation-key-friendly) breakdown of the same relative-time
 * logic as `timeAgo`, for callers that render via next-intl instead of the
 * hardcoded English above (see MessageBubble, which translates under the
 * "Group.messageThread" namespace).
 */
export type TimeAgoInfo =
  | { unit: 'justNow' }
  | { unit: 'minutes'; value: number }
  | { unit: 'hours'; value: number }
  | { unit: 'yesterday' }
  | { unit: 'days'; value: number };

export function timeAgoInfo(dateStr: string): TimeAgoInfo {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return { unit: 'justNow' };
  if (mins < 60) return { unit: 'minutes', value: mins };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { unit: 'hours', value: hours };
  const days = Math.floor(hours / 24);
  if (days === 1) return { unit: 'yesterday' };
  return { unit: 'days', value: days };
}

export interface TextSegment {
  text: string;
  isLink: boolean;
}

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;
// Trailing punctuation a sentence tends to end with isn't part of the URL
// itself (e.g. "check this out: https://x.com/foo." shouldn't link the period).
const TRAILING_PUNCTUATION = /[.,!?;:)\]}'"]+$/;

/** Split message text into plain-text and link segments so URLs can render
 * as clickable anchors while the rest stays plain text. Only http(s) links
 * are recognized — never `javascript:` or other schemes. */
export function splitLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    const start = match.index ?? 0;
    let url = match[0];
    let end = start + url.length;
    const trailing = url.match(TRAILING_PUNCTUATION);
    if (trailing) {
      url = url.slice(0, -trailing[0].length);
      end -= trailing[0].length;
    }
    if (!url) continue;
    if (start > lastIndex) segments.push({ text: text.slice(lastIndex, start), isLink: false });
    segments.push({ text: url, isLink: true });
    lastIndex = end;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), isLink: false });
  return segments;
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
