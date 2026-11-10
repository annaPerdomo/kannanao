import {
  calendarWeeks,
  type CalendarWord,
  MONTH_WORDS,
  NUMBER_KANJI,
  TRICKY_MONTHS,
  WEEKDAY_WORDS,
} from './calendarWords';
import { modelSvg, practiceBoxSvg } from './kanjiSheetPrintable';
import type { KanjiStrokes } from './kanjiStrokes';
import { escapeHtml } from './lessonPrintable';
import { writingBoxSvg } from './printBoxes';
import { brandHeaderHtml, printDocumentHtml } from './printBrand';
import {
  gapSection,
  judgeSection,
  keyHtml,
  PRACTICE_CSS,
  type PracticeWord,
  type Section,
  sectionHtml,
  writeSection,
} from './readingCheckPrintable';
import { splitReading } from './readingConfusions';
import { hashSeed, seededShuffle } from './seededRandom';

const KANJI_TRACE_BOXES = 3;
const KANJI_BOXES = 9;
const KANJI_EXTRA_BOXES: Record<'months' | 'days', number> = { months: 0, days: 11 };
const SHORT_WORD_KANA = 4;
const ORDER_BLANK_DAYS = 3;
const ORDER_BLANK_MONTHS = 5;
const MATCH_MONTHS = 6;

export type CalendarTopic = 'months' | 'days';

const ABOUT_ME: Record<CalendarTopic, readonly { question: string; ending: string }[]> = {
  days: [
    { question: 'きょうは なんようび ですか。', ending: 'ようび です。' },
    { question: 'あしたは なんようび ですか。', ending: 'ようび です。' },
    { question: 'きのうは なんようび でしたか。', ending: 'ようび でした。' },
  ],
  months: [
    { question: 'いまは なんがつ ですか。', ending: 'がつ です。' },
    { question: 'らいげつは なんがつ ですか。', ending: 'がつ です。' },
    { question: 'たんじょうびは なんがつ ですか。', ending: 'がつ です。' },
  ],
};

export interface CalendarPackLabels {
  title: string;
  name: string;
  date: string;
  learnHeading: string;
  learnHint: string;
  monthsHeading: string;
  weekdaysHeading: string;
  trickyNote: string;
  traceHeading: string;
  traceHint: string;
  kanjiHeading: string;
  kanjiHint: string;
  judgeHeading: string;
  judgeHint: string;
  judgeRight: string;
  gapHeading: string;
  gapHint: string;
  matchHeading: string;
  matchHint: string;
  orderHeading: string;
  orderHint: string;
  myCalendarHeading: string;
  myCalendarHint: string;
  aboutHeading: string;
  aboutHint: string;
  /** One gloss per ABOUT_ME question of each topic, in order. */
  aboutGlossesDays: string[];
  aboutGlossesMonths: string[];
  kanjiWriteHeading: string;
  kanjiWriteHint: string;
  writeHeading: string;
  writeHint: string;
  numbersHeading: string;
  numbersHint: string;
  nextHeading: string;
  nextHint: string;
  answerKey: string;
  credit: string;
  /** January first. */
  monthNames: string[];
  /** Sunday first. */
  weekdayNames: string[];
  /** Sunday first. */
  weekdayPictures: string[];
}

export interface CalendarPackOptions {
  topic: CalendarTopic;
  learn: boolean;
  practice: boolean;
  answerKey: boolean;
  /** Print 月よう日 rather than 月曜日, as early textbooks do. */
  kanaYou: boolean;
}

const PACK_CSS = `
  .chart { width: 100%; border-collapse: collapse; margin: 0 0 1.5mm; }
  .chart td { border: 1px solid #bbb; padding: 1.5px 8px; font-size: 0.9rem; vertical-align: middle; }
  .chart td.jp { font-size: 14pt; white-space: nowrap; }
  .chart td.big { font-size: 18pt; text-align: center; width: 13mm; }
  .chart td.kana { font-size: 13pt; white-space: nowrap; }
  .chart td.en { color: #555; font-size: 0.78rem; font-family: "Nunito", sans-serif; }
  .chart b { font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
  .months { display: grid; grid-template-columns: 1fr 1fr; column-gap: 6mm; }
  .note { font-size: 0.76rem; color: #555; margin: 0; }
  .trace-row { display: flex; align-items: center; gap: 1mm; height: 11.5mm; break-inside: avoid; }
  .trace-row .tlabel { min-width: 17mm; padding-right: 2mm; flex: none; font-size: 14pt; white-space: nowrap; }
  .trace-row .gapcol { width: 4mm; flex: none; }
  .trace-row svg { flex: none; }
  .kblock { break-inside: avoid; margin-bottom: 1.5mm; }
  .krow { display: flex; align-items: center; gap: 1mm; margin-bottom: 1mm; }
  .krow .kmodel { width: 16mm; height: 16mm; border: 1px solid #333; flex: none; }
  .krow .practicebox { width: 15mm; height: 15mm; flex: none; }
  .kinfo { font-size: 0.7rem; color: #555; line-height: 1.25; margin: 0 0 0 1.5mm; }
  .match-row { display: flex; justify-content: space-between; align-items: center; height: 8.4mm; }
  .match-row span { display: inline-flex; align-items: center; gap: 3mm; font-size: 12.5pt; }
  .match-row .mk { font-size: 16pt; }
  .match-row .dot { font-size: 7pt; }
  .strip { display: flex; align-items: center; gap: 1.5mm; }
  .strip .cell { width: 15mm; height: 15mm; border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-size: 22pt; flex: none; }
  .strip svg { flex: none; }
  .strip .arrow { color: #777; font-size: 9pt; }
  .mgrid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1.5mm; }
  .mcell { border: 1px solid #333; height: 12mm; padding: 0.5mm 1.5mm; }
  .mcell .mnum { font-size: 9pt; color: #555; display: block; }
  .mcell .mstem { font-size: 11.5pt; white-space: nowrap; }
  .mcell.blank { border-width: 2px; }
  .cal { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 1mm; }
  .cal th { height: 13mm; border: 2px solid #000; }
  .cal td { height: 7.5mm; border: 1px solid #999; vertical-align: top; padding: 0.5mm 1.5mm; font-size: 9pt; font-family: "Nunito", sans-serif; }
  .fill { display: inline-block; border-bottom: 1.2px solid #333; min-width: 24mm; height: 6.5mm; vertical-align: bottom; margin: 0 1mm; }
  .fill.short { min-width: 12mm; }
  .sentence { font-size: 13pt; margin: 1mm 0 0; line-height: 1.9; }
  .about { margin: 0 0 2mm; break-inside: avoid; }
  .about .q { font-size: 12.5pt; margin: 0; }
  .about .gloss { font-size: 0.68rem; color: #777; margin-left: 2mm; font-family: "Nunito", sans-serif; white-space: nowrap; }
  .about .a { font-size: 12.5pt; margin: 0 0 0 5mm; }
  .kwrite { display: flex; align-items: center; gap: 1.5mm; min-height: 10.8mm; break-inside: avoid; }
  .kwrite .kana { font-size: 12.5pt; min-width: 33mm; white-space: nowrap; }
  .kwrite .rest { font-size: 14pt; }
  .kwrite svg { flex: none; }
  .nstrip { display: grid; grid-template-columns: repeat(10, 1fr); gap: 1.5mm; margin-bottom: 2mm; }
  .ncell { text-align: center; font-size: 10.5pt; line-height: 1.2; white-space: nowrap; }
  .ncell svg { display: block; margin: 0 auto 0.5mm; }
  .ncell .nk { display: block; font-size: 20pt; line-height: 1.25; }
  .ncell .nline { display: block; border-bottom: 1.2px solid #333; height: 6mm; }
  .prompt.small { font-size: 12pt; }
  .credit { font-size: 0.6rem; color: #888; margin: 0; }
`;

function readingHtml(reading: string): string {
  const { stem, suffix } = splitReading(reading);
  return `<b>${escapeHtml(stem)}</b>${escapeHtml(suffix)}`;
}

function weekdayWord(index: number, options: CalendarPackOptions): string {
  const day = WEEKDAY_WORDS[index];
  return options.kanaYou ? day.mixed : day.word;
}

function learnSheet(labels: CalendarPackLabels, options: CalendarPackOptions): string {
  if (options.topic === 'days') {
    const rows = WEEKDAY_WORDS.map(
      (day, i) =>
        `<tr><td class="big">${day.kanji}</td><td class="jp">${escapeHtml(weekdayWord(i, options))}</td><td class="kana">${readingHtml(day.reading)}</td><td class="en">${escapeHtml(labels.weekdayNames[i] ?? '')}</td><td class="en">${escapeHtml(labels.weekdayPictures[i] ?? '')}</td></tr>`,
    ).join('');
    return sectionHtml(
      labels.learnHeading,
      labels.learnHint,
      `<table class="chart"><tbody>${rows}</tbody></table>`,
    );
  }

  const monthRow = (word: CalendarWord, i: number) => {
    const star = TRICKY_MONTHS.includes(i + 1) ? ' ★' : '';
    return `<tr><td class="jp">${escapeHtml(word.prompt)}${star}</td><td class="kana">${readingHtml(word.reading)}</td><td class="en">${escapeHtml(labels.monthNames[i] ?? '')}</td></tr>`;
  };
  const half = MONTH_WORDS.length / 2;
  const column = (from: number) =>
    `<table class="chart"><tbody>${MONTH_WORDS.slice(from, from + half)
      .map((word, i) => monthRow(word, from + i))
      .join('')}</tbody></table>`;
  return sectionHtml(
    labels.learnHeading,
    labels.learnHint,
    `<div class="months">${column(0)}${column(half)}</div>
<p class="note">${escapeHtml(labels.trickyNote)}</p>`,
  );
}

function traceRowHtml(label: string, reading: string): string {
  const kana = [...reading];
  const trace = kana.map((ch) => writingBoxSvg({ sizeMm: 10, trace: ch })).join('');
  const blank = kana.map(() => writingBoxSvg({ sizeMm: 10 })).join('');
  const sets = kana.length <= SHORT_WORD_KANA ? 2 : 1;
  const blanks = Array.from({ length: sets }, () => `<span class="gapcol"></span>${blank}`).join(
    '',
  );
  return `<div class="trace-row"><span class="tlabel">${escapeHtml(label)}</span>${trace}${blanks}</div>`;
}

/** Rows may split across pages, so this is not one unbreakable block. */
function flowingSection(heading: string, hint: string, body: string): string {
  return `<h2>${escapeHtml(heading)}<span class="hint">${escapeHtml(hint)}</span></h2>
${body}`;
}

function traceSheet(labels: CalendarPackLabels, rows: { label: string; reading: string }[]) {
  return flowingSection(
    labels.traceHeading,
    labels.traceHint,
    rows.map((row) => traceRowHtml(row.label, row.reading)).join('\n'),
  );
}

interface KanjiRow {
  kanji: string;
  /** Trusted HTML. */
  infoHtml: string;
}

function kanjiRows(labels: CalendarPackLabels, topic: CalendarTopic): KanjiRow[] {
  if (topic === 'days') {
    return WEEKDAY_WORDS.map((day, i) => ({
      kanji: day.kanji,
      infoHtml: `${readingHtml(day.reading)}<br>${escapeHtml(labels.weekdayNames[i] ?? '')}<br>${escapeHtml(labels.weekdayPictures[i] ?? '')}`,
    }));
  }
  return [
    ...NUMBER_KANJI.map((n, i) => ({
      kanji: n.kanji,
      infoHtml: `<b>${escapeHtml(n.reading)}</b><br>${i + 1}`,
    })),
    { kanji: '月', infoHtml: '<b>がつ</b>' },
  ];
}

export function packKanji(topic: CalendarTopic): string[] {
  return topic === 'days'
    ? WEEKDAY_WORDS.map((day) => day.kanji)
    : [...NUMBER_KANJI.map((n) => n.kanji), '月'];
}

function kanjiSheet(
  labels: CalendarPackLabels,
  topic: CalendarTopic,
  strokes: Map<string, KanjiStrokes>,
): string {
  const extra = KANJI_EXTRA_BOXES[topic];
  const rows = kanjiRows(labels, topic)
    .map((row) => {
      const data = strokes.get(row.kanji);
      const boxes = Array.from({ length: KANJI_BOXES }, (_, box) =>
        practiceBoxSvg(row.kanji, data, box < KANJI_TRACE_BOXES),
      ).join('');
      const second =
        extra > 0
          ? `<div class="krow">${Array.from({ length: extra }, () => practiceBoxSvg(row.kanji, data, false)).join('')}</div>`
          : '';
      return `<div class="kblock"><div class="krow"><div class="kmodel">${modelSvg(row.kanji, data, true)}</div>${boxes}<p class="kinfo">${row.infoHtml}</p></div>${second}</div>`;
    })
    .join('\n');
  const credit = strokes.size > 0 ? `<p class="credit">${escapeHtml(labels.credit)}</p>` : '';
  return flowingSection(labels.kanjiHeading, labels.kanjiHint, `${rows}\n${credit}`);
}

const monthPractice = (): PracticeWord[] =>
  MONTH_WORDS.map((m) => ({ promptHtml: escapeHtml(m.prompt), word: m.word, reading: m.reading }));

const dayPractice = (options: CalendarPackOptions): PracticeWord[] =>
  WEEKDAY_WORDS.map((day, i) => ({
    promptHtml: escapeHtml(weekdayWord(i, options)),
    word: day.word,
    reading: day.reading,
  }));

function matchSection(pairs: { left: string; right: string }[], seed: number): Section {
  const left = seededShuffle(pairs, seed);
  const right = seededShuffle(pairs, seed + 1);
  const rows = left
    .map(
      (pair, i) =>
        `<div class="match-row"><span><span class="mk">${escapeHtml(pair.left)}</span><span class="dot">●</span></span><span><span class="dot">●</span>${escapeHtml(right[i].right)}</span></div>`,
    )
    .join('');
  return {
    html: rows,
    key: left.map((pair) => ({ label: pair.left, answer: pair.right })),
  };
}

function dayOrderSection(seed: number): Section {
  const blank = new Set(seededShuffle([1, 2, 3, 4, 5, 6], seed).slice(0, ORDER_BLANK_DAYS));
  const strip = WEEKDAY_WORDS.map((day, i) =>
    blank.has(i) ? writingBoxSvg({ sizeMm: 15 }) : `<span class="cell">${day.kanji}</span>`,
  ).join('<span class="arrow">▶</span>');
  return {
    html: `<div class="strip">${strip}</div>`,
    key: [...blank]
      .sort((a, b) => a - b)
      .map((i) => ({ label: `${i + 1}.`, answer: WEEKDAY_WORDS[i].kanji })),
  };
}

function monthOrderSection(seed: number): Section {
  const blank = new Set(
    seededShuffle(
      MONTH_WORDS.map((_, i) => i),
      seed,
    ).slice(0, ORDER_BLANK_MONTHS),
  );
  const cells = MONTH_WORDS.map((month, i) => {
    const stem = blank.has(i) ? '' : escapeHtml(splitReading(month.reading).stem);
    return `<div class="mcell${blank.has(i) ? ' blank' : ''}"><span class="mnum">${escapeHtml(month.prompt)}</span><span class="mstem">${stem}</span></div>`;
  }).join('');
  return {
    html: `<div class="mgrid">${cells}</div>`,
    key: [...blank]
      .sort((a, b) => a - b)
      .map((i) => ({
        label: MONTH_WORDS[i].prompt,
        answer: splitReading(MONTH_WORDS[i].reading).stem,
      })),
  };
}

function kanjiWriteSection(
  items: { reading: string; boxes: number; rest: string; answer: string }[],
  seed: number,
): Section {
  const order = seededShuffle(items, seed);
  return {
    html: `<div class="grid2">${order
      .map(
        (item, i) =>
          `<div class="kwrite"><span class="num">${i + 1}.</span><span class="kana">${escapeHtml(item.reading)}</span>${writingBoxSvg({ sizeMm: 10 }).repeat(item.boxes)}<span class="rest">${escapeHtml(item.rest)}</span></div>`,
      )
      .join('\n')}</div>`,
    key: order.map((item, i) => ({ label: `${i + 1}.`, answer: item.answer })),
  };
}

function numberSection(seed: number): Section {
  const order = seededShuffle(NUMBER_KANJI, seed);
  const first = (reading: string) => reading.split('・')[0];
  const toKanji = NUMBER_KANJI.map(
    (n) =>
      `<div class="ncell">${writingBoxSvg({ sizeMm: 12 })}${escapeHtml(first(n.reading))}</div>`,
  ).join('');
  const toReading = order
    .map(
      (n) =>
        `<div class="ncell"><span class="nk">${n.kanji}</span><span class="nline"></span></div>`,
    )
    .join('');
  return {
    html: `<div class="nstrip">${toKanji}</div><div class="nstrip">${toReading}</div>`,
    key: [
      { label: '', answer: NUMBER_KANJI.map((n) => n.kanji).join(' ') },
      { label: '', answer: order.map((n) => first(n.reading)).join(' ') },
    ],
  };
}

function nextDaySection(seed: number): Section {
  const order = seededShuffle([0, 1, 2, 3, 4, 5, 6], seed);
  return {
    html: `<div class="grid2">${order
      .map(
        (index, i) => `<div class="write">
  <span class="num">${i + 1}.</span>
  <span class="prompt small">${escapeHtml(WEEKDAY_WORDS[index].reading)} の つぎ</span>
  <span class="line"></span>
  <span class="suffix">ようび</span>
</div>`,
      )
      .join('\n')}</div>`,
    key: order.map((index, i) => ({
      label: `${i + 1}.`,
      answer: WEEKDAY_WORDS[(index + 1) % 7].reading,
    })),
  };
}

function myCalendarHtml(today: Date, options: CalendarPackOptions): string {
  const month = today.getMonth();
  const first = new Date(today.getFullYear(), month, 1).getDay();
  const days = new Date(today.getFullYear(), month + 1, 0).getDate();
  const rows = calendarWeeks(first, days)
    .map((week) => `<tr>${week.map((day) => `<td>${day ?? ''}</td>`).join('')}</tr>`)
    .join('');
  const rest = options.kanaYou ? 'よう日' : '曜日';
  return `<table class="cal"><thead><tr>${'<th></th>'.repeat(7)}</tr></thead><tbody>${rows}</tbody></table>
<p class="sentence">きょうは <span class="fill short"></span>${rest} です。</p>`;
}

function aboutMeHtml(labels: CalendarPackLabels, topic: CalendarTopic): string {
  const glosses = topic === 'days' ? labels.aboutGlossesDays : labels.aboutGlossesMonths;
  return ABOUT_ME[topic]
    .map(
      (item, i) => `<div class="about">
  <p class="q">${i + 1}. ${item.question}<span class="gloss">${escapeHtml(glosses[i] ?? '')}</span></p>
  <p class="a">→<span class="fill"></span>${item.ending}</p>
</div>`,
    )
    .join('\n');
}

interface Activity {
  html: string;
  keys: string[];
}

function activity(heading: string, hint: string, section: Section): Activity {
  return { html: sectionHtml(heading, hint, section.html), keys: [keyHtml(heading, section.key)] };
}

function sideBySide(left: Activity, right: Activity): Activity {
  return {
    html: `<div class="cols">${left.html}${right.html}</div>`,
    keys: [...left.keys, ...right.keys],
  };
}

function aboutMe(labels: CalendarPackLabels, topic: CalendarTopic): Activity {
  return {
    html: sectionHtml(labels.aboutHeading, labels.aboutHint, aboutMeHtml(labels, topic)),
    keys: [],
  };
}

function dayActivities(
  labels: CalendarPackLabels,
  options: CalendarPackOptions,
  seed: number,
  today: Date,
): Activity[] {
  const days = dayPractice(options);
  const rest = options.kanaYou ? 'よう日' : '曜日';
  const pairs = WEEKDAY_WORDS.map((day) => ({
    left: day.kanji,
    right: splitReading(day.reading).stem,
  }));
  const writes = WEEKDAY_WORDS.map((day, i) => ({
    reading: day.reading,
    boxes: 1,
    rest,
    answer: weekdayWord(i, options),
  }));
  return [
    sideBySide(
      activity(labels.matchHeading, labels.matchHint, matchSection(pairs, seed)),
      aboutMe(labels, 'days'),
    ),
    activity(labels.orderHeading, labels.orderHint, dayOrderSection(seed + 1)),
    activity(labels.gapHeading, labels.gapHint, gapSection(days, seed + 3)),
    activity(labels.kanjiWriteHeading, labels.kanjiWriteHint, kanjiWriteSection(writes, seed + 2)),
    activity(labels.nextHeading, labels.nextHint, nextDaySection(seed + 6)),
    activity(
      labels.judgeHeading,
      labels.judgeHint,
      judgeSection(days, seed + 4, labels.judgeRight),
    ),
    {
      html: sectionHtml(
        labels.myCalendarHeading,
        labels.myCalendarHint,
        myCalendarHtml(today, options),
      ),
      keys: [
        keyHtml(labels.myCalendarHeading, [
          { label: '', answer: WEEKDAY_WORDS.map((day) => day.kanji).join(' ') },
        ]),
      ],
    },
    activity(labels.writeHeading, labels.writeHint, writeSection(days, seed + 5)),
  ];
}

function monthActivities(labels: CalendarPackLabels, seed: number): Activity[] {
  const months = monthPractice();
  const pairs = seededShuffle(MONTH_WORDS, seed)
    .slice(0, MATCH_MONTHS)
    .map((month) => ({ left: month.prompt, right: splitReading(month.reading).stem }));
  const writes = MONTH_WORDS.map((month) => ({
    reading: month.reading,
    boxes: [...month.word].length - 1,
    rest: '月',
    answer: month.word,
  }));
  return [
    sideBySide(
      activity(labels.matchHeading, labels.matchHint, matchSection(pairs, seed + 1)),
      aboutMe(labels, 'months'),
    ),
    activity(labels.orderHeading, labels.orderHint, monthOrderSection(seed + 2)),
    activity(labels.gapHeading, labels.gapHint, gapSection(months, seed + 3)),
    activity(labels.writeHeading, labels.writeHint, writeSection(months, seed + 6)),
    activity(labels.kanjiWriteHeading, labels.kanjiWriteHint, kanjiWriteSection(writes, seed + 4)),
    activity(
      labels.judgeHeading,
      labels.judgeHint,
      judgeSection(months, seed + 5, labels.judgeRight),
    ),
    activity(labels.numbersHeading, labels.numbersHint, numberSection(seed + 7)),
  ];
}

export function buildCalendarPackHtml(args: {
  locale: string;
  labels: CalendarPackLabels;
  options: CalendarPackOptions;
  strokes: Map<string, KanjiStrokes>;
  seed: number;
  /** The month drawn on the days packet's calendar. */
  today: Date;
}): string {
  const { labels, options, strokes } = args;
  const { topic } = options;
  const seed = hashSeed(`calendar-pack:${topic}:${args.seed}`);
  const title = topic === 'days' ? labels.weekdaysHeading : labels.monthsHeading;
  const nameLine = `${labels.name}：＿＿＿＿＿＿　${labels.date}：＿＿＿＿`;
  // One header per part, not per page: it is the only colour ink on the packet.
  const partHtml = (heading: string, body: string, withName = true) =>
    `<div class="part">
${brandHeaderHtml({ title: heading, nameLine: withName ? nameLine : undefined })}
${body}
</div>`;

  const parts: string[] = [];
  const keys: string[] = [];

  if (options.learn) {
    const rows =
      topic === 'days'
        ? WEEKDAY_WORDS.map((day, i) => ({
            label: weekdayWord(i, options),
            reading: day.reading,
          }))
        : MONTH_WORDS.map((word) => ({ label: word.prompt, reading: word.reading }));
    parts.push(
      partHtml(
        title,
        [
          learnSheet(labels, options),
          traceSheet(labels, rows),
          kanjiSheet(labels, topic, strokes),
        ].join('\n'),
      ),
    );
  }

  if (options.practice) {
    const activities =
      topic === 'days'
        ? dayActivities(labels, options, seed, args.today)
        : monthActivities(labels, seed);
    parts.push(partHtml(title, activities.map((a) => a.html).join('\n')));
    keys.push(...activities.flatMap((a) => a.keys));
  }

  if (options.answerKey && keys.length > 0) {
    parts.push(partHtml(`${title} — ${labels.answerKey}`, keys.join('\n'), false));
  }

  return printDocumentHtml({
    title,
    locale: args.locale,
    css: PRACTICE_CSS + PACK_CSS,
    body: parts.join('\n'),
    header: false,
  });
}
