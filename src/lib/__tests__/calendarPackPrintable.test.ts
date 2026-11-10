import { describe, expect, it } from 'vitest';

import {
  buildCalendarPackHtml,
  type CalendarPackLabels,
  type CalendarPackOptions,
} from '@/lib/calendarPackPrintable';
import { calendarWeeks, MONTH_WORDS, WEEKDAY_WORDS, weekdayIndex } from '@/lib/calendarWords';

const labels: CalendarPackLabels = {
  title: 'Months and days',
  name: 'Name',
  date: 'Date',
  learnHeading: 'Learn',
  learnHint: 'hint',
  monthsHeading: 'Months',
  weekdaysHeading: 'Days',
  trickyNote: 'careful',
  traceHeading: 'Trace',
  traceHint: 'hint',
  kanjiHeading: 'Kanji',
  kanjiHint: 'hint',
  judgeHeading: 'Right or wrong',
  judgeHint: 'hint',
  judgeRight: 'correct',
  gapHeading: 'Missing letter',
  gapHint: 'hint',
  matchHeading: 'Match',
  matchHint: 'hint',
  orderHeading: 'Order',
  orderHint: 'hint',
  myCalendarHeading: 'My calendar',
  myCalendarHint: 'hint',
  aboutHeading: 'About me',
  aboutHint: 'hint',
  aboutGlossesDays: ['d1', 'd2', 'd3'],
  aboutGlossesMonths: ['m1', 'm2', 'm3'],
  kanjiWriteHeading: 'Write it in kanji',
  kanjiWriteHint: 'hint',
  writeHeading: 'Write the reading',
  writeHint: 'hint',
  numbersHeading: 'One to ten',
  numbersHint: 'hint',
  nextHeading: 'Next day',
  nextHint: 'hint',
  answerKey: 'Answer key',
  credit: 'credit',
  monthNames: Array.from({ length: 12 }, (_, i) => `Month${i + 1}`),
  weekdayNames: Array.from({ length: 7 }, (_, i) => `Day${i}`),
  weekdayPictures: Array.from({ length: 7 }, (_, i) => `Picture${i}`),
};

const all: CalendarPackOptions = {
  topic: 'days',
  learn: true,
  practice: true,
  answerKey: true,
  kanaYou: true,
};
// November 2026 starts on a Sunday.
const TODAY = new Date(2026, 10, 9);

const build = (options: Partial<CalendarPackOptions> = {}, seed = 1) =>
  buildCalendarPackHtml({
    locale: 'en',
    labels,
    options: { ...all, ...options },
    strokes: new Map(),
    seed,
    today: TODAY,
  }).replace(/print-brand-rule-\d+/g, 'rule');

describe('calendar words', () => {
  it('has twelve months and seven days, Sunday first', () => {
    expect(MONTH_WORDS.map((m) => m.prompt).join(' ')).toBe(
      '一月 二月 三月 四月 五月 六月 七月 八月 九月 十月 十一月 十二月',
    );
    expect(MONTH_WORDS[3].reading).toBe('しがつ');
    expect(WEEKDAY_WORDS.map((d) => d.kanji).join('')).toBe('日月火水木金土');
  });

  it('recognises a weekday however 曜 is written', () => {
    expect(weekdayIndex('月曜日')).toBe(1);
    expect(weekdayIndex('月よう日')).toBe(1);
    expect(weekdayIndex('土曜')).toBe(6);
    expect(weekdayIndex('月')).toBeNull();
    expect(weekdayIndex('毎日')).toBeNull();
  });

  it('lays a month out in whole weeks', () => {
    const weeks = calendarWeeks(6, 30);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1]);
    expect(weeks.flat().filter((d) => d !== null)).toHaveLength(30);
  });
});

const months = (options: Partial<CalendarPackOptions> = {}, seed = 1) =>
  build({ topic: 'months', ...options }, seed);

describe('buildCalendarPackHtml', () => {
  it('keeps the two topics apart', () => {
    const days = build();
    expect(days).toContain('<b>げつ</b>ようび');
    expect(days).not.toContain('がつ');
    const m = months();
    expect(m).toContain('<b>し</b>がつ');
    expect(m).not.toContain('ようび');
  });

  it('writes the months with kanji numbers, never digits', () => {
    const html = months({ answerKey: false });
    for (const month of MONTH_WORDS) expect(html).toContain(month.prompt);
    expect(html).not.toMatch(/\d月/);
  });

  it('spells 曜 in kana unless asked otherwise', () => {
    expect(build()).toContain('月よう日');
    expect(build()).not.toContain('月曜日');
    expect(build({ kanaYou: false })).toContain('月曜日');
  });

  it('sets Japanese in a textbook face, not the rounded display one', () => {
    expect(build()).toMatch(/body \{[^}]*Klee One/);
  });

  it('gives the months packet kanji practice for 一 to 十 and 月', () => {
    expect(months({ practice: false }).match(/class="kmodel"/g)).toHaveLength(11);
    expect(build({ practice: false }).match(/class="kmodel"/g)).toHaveLength(7);
  });

  it('gives the shorter days packet a second line of boxes per kanji', () => {
    expect(build({ practice: false }).match(/class="krow"/g)).toHaveLength(14);
    expect(months({ practice: false }).match(/class="krow"/g)).toHaveLength(11);
  });

  it('prints one header per part rather than one per page', () => {
    expect(build({ answerKey: false }).match(/class="print-brand-header"/g)).toHaveLength(2);
    expect(build().match(/class="part"/g)).toHaveLength(3);
  });

  it('uses spare room for number kanji and next-day practice', () => {
    expect(months({ learn: false }).match(/class="ncell"/g)).toHaveLength(20);
    const days = build({ learn: false });
    expect(days).toContain('の つぎ');
    expect(days.match(/class="write"/g)).toHaveLength(14);
    expect(months({ learn: false }).match(/class="write"/g)).toHaveLength(12);
  });

  it('asks every word of its topic once in each spelling exercise', () => {
    const days = build({ learn: false, answerKey: false });
    expect(days.match(/class="judge"/g)).toHaveLength(7);
    expect(days.match(/class="gap"/g)).toHaveLength(7);
    expect(days.match(/class="match-row"/g)).toHaveLength(7);
    expect(days.match(/class="kwrite"/g)).toHaveLength(7);
    const m = months({ learn: false, answerKey: false });
    expect(m.match(/class="judge"/g)).toHaveLength(12);
    expect(m.match(/class="gap"/g)).toHaveLength(12);
    expect(m.match(/class="match-row"/g)).toHaveLength(6);
    expect(m.match(/class="kwrite"/g)).toHaveLength(12);
  });

  it('gives a two-kanji month two boxes to write in', () => {
    const html = months({ learn: false, answerKey: false });
    const row = html.split('class="kwrite"').find((part) => part.includes('じゅういちがつ'))!;
    expect(row.match(/<svg/g)).toHaveLength(2);
  });

  it('shows both right and wrong spellings to judge', () => {
    const key = months({ learn: false });
    expect(key).toContain('○ correct');
    expect(key).toContain('× → ');
  });

  it('leaves three days and five months out of the sequences', () => {
    expect(build({ learn: false, answerKey: false }).match(/class="cell"/g)).toHaveLength(4);
    expect(months({ learn: false, answerKey: false }).match(/class="mcell blank"/g)).toHaveLength(
      5,
    );
  });

  it('draws the month it is printed in for the learner to label with days', () => {
    const html = build({ learn: false });
    expect(html.match(/<th><\/th>/g)).toHaveLength(7);
    expect(html).toContain('<tr><td>1</td><td>2</td>');
  });

  it('asks three about-me questions per topic with their glosses', () => {
    expect(build({ learn: false }).match(/class="about"/g)).toHaveLength(3);
    expect(build({ learn: false })).toContain('d3');
    expect(months({ learn: false })).toContain('m3');
  });

  it('leaves the key off when asked', () => {
    expect(build({ learn: false, answerKey: false })).not.toContain('Answer key');
    expect(months({ learn: false, answerKey: false })).not.toContain('Answer key');
  });

  it('mixes the questions differently for another seed, repeatably', () => {
    expect(build({}, 5)).toBe(build({}, 5));
    expect(months({ learn: false }, 5)).not.toBe(months({ learn: false }, 6));
  });

  it('leaves the practice pages and key out of a chart-only pack', () => {
    const html = build({ practice: false });
    expect(html).not.toContain('class="judge"');
    expect(html).not.toContain('Answer key');
  });
});
