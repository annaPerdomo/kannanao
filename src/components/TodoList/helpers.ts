import type { Todo, CalendarEntry, EntryType } from '@/types/todo';

export const XP_PER_TODO = 5;

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LABELS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// weekday index in DAY_LABELS → JS getDay() value
export const DAY_INDEX_TO_JS = [1, 2, 3, 4, 5, 6, 0]; // Mon=1, Tue=2, ..., Sun=0
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CELEBRATION_MESSAGES = [
  '🎉 Amazing work!', "⭐ You're on fire!", '🌸 So productive!', '✨ Keep it up!',
  '🦋 Unstoppable!', '🌈 You did it!', '💕 Wonderful!', '🎀 Fabulous!',
];

export const DEFAULT_ENTRY_TYPES: EntryType[] = [
  { id: 'todo', name: 'To-Do', emoji: '📝', color: '#F97316' },
  { id: 'event', name: 'Event', emoji: '📌', color: '#3B82F6' },
  { id: 'birthday', name: 'Birthday', emoji: '🎂', color: '#F59E0B' },
  { id: 'holiday', name: 'Holiday', emoji: '🎉', color: '#8B5CF6' },
  { id: 'meeting', name: 'Meeting', emoji: '📅', color: '#10B981' },
  { id: 'reminder', name: 'Reminder', emoji: '⏰', color: '#8B5CF6' },
];

export const CALENDAR_ENTRIES_KEY = 'kannanao-calendar-entries';

export function randomCelebration() {
  return CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function todayDayIndex(): number {
  const dow = new Date().getDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1; // Mon=0, Sun=6
}

// Returns Mon–Sun dates for a given week offset (0 = current week)
export function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diffToMon + weekOffset * 7);
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

// Sparse calendar grid for a month — null = blank padding cell
export function getMonthCalendarDates(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const result: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) result.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) result.push(new Date(year, month, d));
  while (result.length % 7 !== 0) result.push(null);
  return result;
}

export function isScheduledForDate(todo: Todo, date: Date): boolean {
  if (todo.frequencyDays.length === 0) {
    return toISODate(new Date(todo.createdAt)) === toISODate(date);
  }
  return todo.frequencyDays.includes(date.getDay());
}

export function isCompletedOnDate(todo: Todo, dateISO: string): boolean {
  return todo.completedDates.includes(dateISO);
}

export function isEntryOnDate(entry: CalendarEntry, date: Date): boolean {
  const dateISO = toISODate(date);
  if (dateISO < entry.startDateISO || dateISO > entry.endDateISO) return false;
  if (!entry.frequencyDays || entry.frequencyDays.length === 0) return true;
  return entry.frequencyDays.includes(date.getDay());
}

export function getEntryType(typeId: string, entryTypes: EntryType[]): EntryType {
  return entryTypes.find((type) => type.id === typeId) ?? DEFAULT_ENTRY_TYPES[0];
}

export function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export function formatWeekRange(weekDates: Date[]): string {
  const mon = weekDates[0];
  const sun = weekDates[6];
  if (mon.getMonth() === sun.getMonth()) {
    return `${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()}–${sun.getDate()}`;
  }
  return `${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()} – ${MONTH_NAMES[sun.getMonth()]} ${sun.getDate()}`;
}
