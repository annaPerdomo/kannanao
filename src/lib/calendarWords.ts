import { MONTH_READINGS, WEEKDAYS } from './japaneseDate';

export interface CalendarWord {
  prompt: string;
  word: string;
  reading: string;
}

const KANJI_MONTH_NUMBERS = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
  '十一',
  '十二',
] as const;

/** Kanji numbers, not digits: learners meet 一〜十 alongside the months. */
export const MONTH_WORDS: CalendarWord[] = MONTH_READINGS.map((reading, i) => ({
  prompt: `${KANJI_MONTH_NUMBERS[i]}月`,
  word: `${KANJI_MONTH_NUMBERS[i]}月`,
  reading,
}));

export const NUMBER_KANJI = [
  { kanji: '一', reading: 'いち' },
  { kanji: '二', reading: 'に' },
  { kanji: '三', reading: 'さん' },
  { kanji: '四', reading: 'し・よん' },
  { kanji: '五', reading: 'ご' },
  { kanji: '六', reading: 'ろく' },
  { kanji: '七', reading: 'しち・なな' },
  { kanji: '八', reading: 'はち' },
  { kanji: '九', reading: 'く・きゅう' },
  { kanji: '十', reading: 'じゅう' },
] as const;

export const TRICKY_MONTHS: readonly number[] = [4, 7, 9];

/** Sunday first. `mixed` is the early-textbook spelling that leaves 曜 in kana. */
export const WEEKDAY_WORDS = WEEKDAYS.map((day) => ({
  prompt: day.kanji,
  word: day.long,
  mixed: `${day.kanji}よう日`,
  reading: day.longReading,
  kanji: day.kanji,
}));

export const WEEKDAY_KANJI = WEEKDAYS.map((day) => day.kanji).join('');

const WEEKDAY_WORD_RE = /^([日月火水木金土])(?:曜日|よう日|ようび|曜)$/;

/** 0 for Sunday; null when the word isn't a day of the week. */
export function weekdayIndex(word: string): number | null {
  const kanji = WEEKDAY_WORD_RE.exec(word.trim())?.[1];
  return kanji ? WEEKDAY_KANJI.indexOf(kanji) : null;
}

export const CALENDAR_START_DAY = 6;
export const CALENDAR_DAYS = 30;

export function calendarWeeks(
  startDay: number = CALENDAR_START_DAY,
  days: number = CALENDAR_DAYS,
): (number | null)[][] {
  const cells: (number | null)[] = [
    ...Array.from({ length: startDay }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
