import type { PlanDeck } from '@/types/lessonPlan';

import { furiganaFromReading, parseFurigana } from './furigana';

export type PrintableVariant = 'study' | 'quiz';

export interface PrintableWeek {
  heading: string;
  deck: PlanDeck;
}

export interface PrintableLabels {
  name: string;
  date: string;
  word: string;
  reading: string;
  meaning: string;
  example: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** {漢字|かんじ} markup → <ruby> HTML, everything escaped. */
export function furiganaToRubyHtml(text: string): string {
  return parseFurigana(text)
    .map((segment) =>
      typeof segment === 'string'
        ? escapeHtml(segment)
        : `<ruby>${escapeHtml(segment.kanji)}<rt>${escapeHtml(segment.reading)}</rt></ruby>`,
    )
    .join('');
}

function wordCellHtml(word: string, reading: string): string {
  const marked = furiganaFromReading(word, reading);
  return marked ? furiganaToRubyHtml(marked) : escapeHtml(word);
}

const PAGE_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif;
    color: #1a1a1a;
    margin: 0;
    padding: 24px;
  }
  @page { margin: 14mm; }
  section.week { page-break-after: always; }
  section.week:last-child { page-break-after: auto; }
  .week-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
  h1 { font-size: 1.15rem; margin: 0 0 4px; }
  .nameline { font-size: 0.85rem; white-space: nowrap; }
  .desc { font-size: 0.8rem; color: #555; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 0.9rem; }
  th { background: #f2f2f2; font-size: 0.75rem; }
  td.num { width: 2.2em; text-align: center; color: #777; }
  td.blank { height: 2.4em; }
  ruby rt { font-size: 0.55em; }
  .jp { line-height: 2; }
  .en { font-size: 0.78rem; color: #555; }
`;

function studyRow(deck: PlanDeck, index: number): string {
  const card = deck.cards[index];
  return `<tr>
    <td class="num">${index + 1}</td>
    <td class="jp">${wordCellHtml(card.word, card.reading)}</td>
    <td>${escapeHtml(card.meaning)}</td>
    <td><div class="jp">${furiganaToRubyHtml(card.exampleJp)}</div><div class="en">${escapeHtml(card.exampleEn)}</div></td>
  </tr>`;
}

function quizRow(deck: PlanDeck, index: number): string {
  const card = deck.cards[index];
  return `<tr>
    <td class="num">${index + 1}</td>
    <td class="jp">${escapeHtml(card.word)}</td>
    <td class="blank"></td>
    <td class="blank"></td>
  </tr>`;
}

function weekSection(
  week: PrintableWeek,
  variant: PrintableVariant,
  labels: PrintableLabels,
): string {
  const { deck } = week;
  const header =
    variant === 'study'
      ? `<th></th><th>${escapeHtml(labels.word)}</th><th>${escapeHtml(labels.meaning)}</th><th>${escapeHtml(labels.example)}</th>`
      : `<th></th><th>${escapeHtml(labels.word)}</th><th>${escapeHtml(labels.reading)}</th><th>${escapeHtml(labels.meaning)}</th>`;
  const rows = deck.cards
    .map((_, i) => (variant === 'study' ? studyRow(deck, i) : quizRow(deck, i)))
    .join('\n');

  return `<section class="week">
  <div class="week-head">
    <h1>${escapeHtml(week.heading)}</h1>
    <div class="nameline">${escapeHtml(labels.name)}：＿＿＿＿＿＿＿＿　${escapeHtml(labels.date)}：＿＿＿＿＿＿</div>
  </div>
  ${variant === 'study' && deck.description ? `<p class="desc">${escapeHtml(deck.description)}</p>` : ''}
  <table>
    <thead><tr>${header}</tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</section>`;
}

/**
 * A complete printable HTML document: one page per week, study sheets with
 * ruby furigana or quiz sheets with blank reading/meaning columns. Callers
 * pass the plan already filtered to what will be created.
 */
export function buildLessonPrintableHtml(args: {
  title: string;
  locale: string;
  variant: PrintableVariant;
  weeks: PrintableWeek[];
  labels: PrintableLabels;
}): string {
  const sections = args.weeks
    .map((week) => weekSection(week, args.variant, args.labels))
    .join('\n');

  return `<!doctype html>
<html lang="${escapeHtml(args.locale)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(args.title)}</title>
<style>${PAGE_CSS}</style>
</head>
<body>
${sections}
<script>window.addEventListener('load', function () { window.print(); });</script>
</body>
</html>`;
}

/** Opens the built document in a new tab, which immediately offers the print dialog. */
export function openPrintWindow(html: string): void {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
