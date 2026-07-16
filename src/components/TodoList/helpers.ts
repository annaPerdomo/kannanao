import type { CalendarEntry, EntryType, Todo } from '@/types/todo';

export const XP_PER_TODO = 5;

// English fallback labels — kept for non-manifest consumers (e.g. WeekStrip.tsx)
// that haven't been converted to Intl-derived weekday names yet.
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LABELS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// weekday index in DAY_LABELS → JS getDay() value
export const DAY_INDEX_TO_JS = [1, 2, 3, 4, 5, 6, 0]; // Mon=1, Tue=2, ..., Sun=0
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Locale-aware weekday name for a given JS getDay() value (0=Sun..6=Sat).
 * Jan 1, 2023 was a Sunday, so `Date.UTC(2023, 0, 1 + jsDay)` walks Sun→Sat.
 */
export function getWeekdayName(
  jsDay: number,
  locale: string,
  style: Exclude<Intl.DateTimeFormatOptions['weekday'], undefined> = 'short',
): string {
  const date = new Date(Date.UTC(2023, 0, 1 + jsDay));
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(date);
}

/** Locale-aware weekday names for a list of JS getDay() values, in the given order. */
export function getWeekdayNames(
  locale: string,
  order: number[] = DAY_INDEX_TO_JS,
  style: Exclude<Intl.DateTimeFormatOptions['weekday'], undefined> = 'short',
): string[] {
  return order.map((jsDay) => getWeekdayName(jsDay, locale, style));
}

/** Locale-aware month name for a given month index (0=Jan..11=Dec). */
export function getMonthName(
  monthIndex: number,
  locale: string,
  style: Exclude<Intl.DateTimeFormatOptions['month'], undefined> = 'long',
): string {
  return new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' }).format(
    new Date(Date.UTC(2023, monthIndex, 1)),
  );
}

// Celebration copy lives in messages under Todo.celebrationMessages — this only
// carries the stable key slugs so a plain module (no useTranslations here) can
// pick one at random. Resolve the actual text at the render boundary via
// useTranslations('Todo.celebrationMessages').
export const CELEBRATION_KEYS = [
  'amazingWork',
  'onFire',
  'productive',
  'keepItUp',
  'unstoppable',
  'youDidIt',
  'wonderful',
  'fabulous',
] as const;
export type CelebrationKey = (typeof CELEBRATION_KEYS)[number];

// Default entry type display names live in messages under Todo.defaultEntryTypeNames.
// `name` below stays as an English fallback / storage value; render call sites should
// resolve the localized label via `getEntryTypeName` instead of reading `.name` directly
// for these built-in ids. Custom (user-created) entry type names are user data — those
// keep using `.name` verbatim.
export const DEFAULT_ENTRY_TYPES: EntryType[] = [
  { id: 'event', name: 'Event', emoji: '📌', color: '#3B82F6' },
  { id: 'birthday', name: 'Birthday', emoji: '🎂', color: '#F59E0B' },
  { id: 'holiday', name: 'Holiday', emoji: '🎉', color: '#8B5CF6' },
  { id: 'reminder', name: 'Reminder', emoji: '⏰', color: '#EC4899' },
];

const DEFAULT_ENTRY_TYPE_IDS = new Set(DEFAULT_ENTRY_TYPES.map((t) => t.id));

/**
 * Resolve the display name for an entry type: translated for the built-in
 * DEFAULT_ENTRY_TYPES, verbatim (user data) for custom types.
 */
export function getEntryTypeName(type: EntryType, t: (key: string) => string): string {
  return DEFAULT_ENTRY_TYPE_IDS.has(type.id) ? t(type.id) : type.name;
}

export const CALENDAR_ENTRIES_KEY = 'kannanao-calendar-entries';

export function randomCelebration(): CelebrationKey {
  return CELEBRATION_KEYS[Math.floor(Math.random() * CELEBRATION_KEYS.length)];
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
  if (todo.repeatUntilDone) {
    const dateISO = toISODate(date);
    const createdISO = toISODate(new Date(todo.createdAt));
    if (dateISO < createdISO) return false;
    if (todo.completedDates.length === 0) return true;
    return todo.completedDates.includes(dateISO);
  }
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
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function formatWeekRange(weekDates: Date[], locale: string): string {
  const mon = weekDates[0];
  const sun = weekDates[6];
  const monMonth = getMonthName(mon.getMonth(), locale);
  if (mon.getMonth() === sun.getMonth()) {
    return `${monMonth} ${mon.getDate()}–${sun.getDate()}`;
  }
  const sunMonth = getMonthName(sun.getMonth(), locale);
  return `${monMonth} ${mon.getDate()} – ${sunMonth} ${sun.getDate()}`;
}

/**
 * Calculate how many consecutive days (going backward from today)
 * had ALL scheduled todos completed. Days with zero scheduled tasks are skipped.
 */
export function calculateStreak(todos: Todo[]): number {
  if (todos.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  // Go back up to a year
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateISO = toISODate(d);
    const scheduled = todos.filter((t) => isScheduledForDate(t, d));
    if (scheduled.length === 0) continue; // skip days with no tasks
    const completed = scheduled.filter((t) => isCompletedOnDate(t, dateISO));
    if (completed.length === scheduled.length) {
      streak++;
    } else {
      // If it's today and not all done yet, don't break streak — just don't count today
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

/**
 * Get weekly stats for the given week dates.
 */
export function getWeekStats(todos: Todo[], weekDates: Date[]) {
  let totalScheduled = 0;
  let totalCompleted = 0;
  let perfectDays = 0;

  for (const date of weekDates) {
    const dateISO = toISODate(date);
    const scheduled = todos.filter((t) => isScheduledForDate(t, date));
    const completed = scheduled.filter((t) => isCompletedOnDate(t, dateISO));
    totalScheduled += scheduled.length;
    totalCompleted += completed.length;
    if (scheduled.length > 0 && completed.length === scheduled.length) {
      perfectDays++;
    }
  }

  return { totalScheduled, totalCompleted, perfectDays };
}
