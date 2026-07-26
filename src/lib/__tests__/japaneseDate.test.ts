import { describe, expect, it } from 'vitest';

import { japaneseDateParts } from '@/lib/japaneseDate';

/** Local-time constructor so getDate()/getDay() don't drift by timezone. */
const on = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('japaneseDateParts', () => {
  it('should mark up the month with its reading', () => {
    expect(japaneseDateParts(on(2026, 7, 26)).month).toBe('{7月|しちがつ}');
    expect(japaneseDateParts(on(2026, 4, 1)).month).toBe('{4月|しがつ}');
  });

  // The irregular days are the whole reason this table is hand-written rather
  // than generated: 1日 is «ついたち», not «いちにち», and 20日 is «はつか».
  it('should use the irregular readings for the counted days', () => {
    expect(japaneseDateParts(on(2026, 7, 1)).day).toBe('{1日|ついたち}');
    expect(japaneseDateParts(on(2026, 7, 8)).day).toBe('{8日|ようか}');
    expect(japaneseDateParts(on(2026, 7, 14)).day).toBe('{14日|じゅうよっか}');
    expect(japaneseDateParts(on(2026, 7, 20)).day).toBe('{20日|はつか}');
  });

  it('should reach the last day of a long month', () => {
    expect(japaneseDateParts(on(2026, 7, 31)).day).toBe('{31日|さんじゅういちにち}');
  });

  it('should give both the calendar kanji and the spoken weekday', () => {
    // 2026-07-26 is a Sunday.
    const sunday = japaneseDateParts(on(2026, 7, 26));
    expect(sunday.weekday).toBe('{日|にち}');
    expect(sunday.weekdayLong).toBe('{日曜日|にちようび}');

    const wednesday = japaneseDateParts(on(2026, 7, 29));
    expect(wednesday.weekday).toBe('{水|すい}');
    expect(wednesday.weekdayLong).toBe('{水曜日|すいようび}');
  });
});
