/**
 * Today's date written the Japanese way, with furigana.
 *
 * The dates are the point, not decoration: 一日 is «ついたち» and 二十日 is
 * «はつか», and a learner only picks those up by meeting them. Every part comes
 * back as `{kanji|reading}` markup for <FuriganaText>, so the reading rides
 * above the kanji instead of replacing it.
 */

/** ついたち…さんじゅういちにち, indexed by day-of-month − 1. */
const DAY_READINGS = [
  'ついたち',
  'ふつか',
  'みっか',
  'よっか',
  'いつか',
  'むいか',
  'なのか',
  'ようか',
  'ここのか',
  'とおか',
  'じゅういちにち',
  'じゅうににち',
  'じゅうさんにち',
  'じゅうよっか',
  'じゅうごにち',
  'じゅうろくにち',
  'じゅうしちにち',
  'じゅうはちにち',
  'じゅうくにち',
  'はつか',
  'にじゅういちにち',
  'にじゅうににち',
  'にじゅうさんにち',
  'にじゅうよっか',
  'にじゅうごにち',
  'にじゅうろくにち',
  'にじゅうしちにち',
  'にじゅうはちにち',
  'にじゅうくにち',
  'さんじゅうにち',
  'さんじゅういちにち',
] as const;

/** いちがつ…じゅうにがつ, indexed by month (0-based, as Date reports it). */
const MONTH_READINGS = [
  'いちがつ',
  'にがつ',
  'さんがつ',
  'しがつ',
  'ごがつ',
  'ろくがつ',
  'しちがつ',
  'はちがつ',
  'くがつ',
  'じゅうがつ',
  'じゅういちがつ',
  'じゅうにがつ',
] as const;

/**
 * Indexed by `Date#getDay()` — Sunday first, matching both JS and the Japanese
 * calendar week. `short` is the day's own kanji as it appears on a calendar;
 * `long` is the spoken 〜曜日 form.
 */
const WEEKDAYS = [
  { kanji: '日', reading: 'にち', long: '日曜日', longReading: 'にちようび' },
  { kanji: '月', reading: 'げつ', long: '月曜日', longReading: 'げつようび' },
  { kanji: '火', reading: 'か', long: '火曜日', longReading: 'かようび' },
  { kanji: '水', reading: 'すい', long: '水曜日', longReading: 'すいようび' },
  { kanji: '木', reading: 'もく', long: '木曜日', longReading: 'もくようび' },
  { kanji: '金', reading: 'きん', long: '金曜日', longReading: 'きんようび' },
  { kanji: '土', reading: 'ど', long: '土曜日', longReading: 'どようび' },
] as const;

export interface JapaneseDateParts {
  /** e.g. `{7月|しちがつ}` */
  month: string;
  /** e.g. `{26日|にじゅうろくにち}` */
  day: string;
  /** The calendar kanji, e.g. `{日|にち}` */
  weekday: string;
  /** The spoken form, e.g. `{日曜日|にちようび}` */
  weekdayLong: string;
}

/** Splits a date into the furigana-marked pieces the hero's date chip shows. */
export function japaneseDateParts(date: Date): JapaneseDateParts {
  const month = date.getMonth();
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];
  return {
    month: `{${month + 1}月|${MONTH_READINGS[month]}}`,
    day: `{${day}日|${DAY_READINGS[day - 1]}}`,
    weekday: `{${weekday.kanji}|${weekday.reading}}`,
    weekdayLong: `{${weekday.long}|${weekday.longReading}}`,
  };
}
