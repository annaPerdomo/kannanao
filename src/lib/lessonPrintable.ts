import type { PlanDeck, WarmUpWord } from '@/types/lessonPlan';

import { furiganaFromReading, parseFurigana } from './furigana';
import { type KanaLabelKey, orderKanaSets } from './kanaCurriculum';

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
  warmUpTitle?: string;
  warmUpHint?: string;
  deck?: string;
  kanaTitle?: string;
  kanaHint?: string;
  kanaContextual?: Partial<Record<KanaLabelKey, string>>;
}

export function escapeHtml(text: string): string {
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

// Black on white, no background floods: a school printer may have only grey toner.
export const PRINT_BASE_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif;
    color: #1a1a1a;
    margin: 0;
    padding: 24px;
  }
  @page { margin: 14mm; }
`;

const PAGE_CSS = `
  ${PRINT_BASE_CSS}
  section.week { page-break-after: always; }
  section.warmup { page-break-after: always; }
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
  section.kana { page-break-before: always; }
  table.kana td { text-align: center; width: 5.5em; }
  table.kana td.rowhead { text-align: left; width: auto; font-weight: 700; font-size: 0.8rem; }
  .kana-char { font-size: 1.5rem; line-height: 1.2; }
  .kana-romaji { font-size: 0.7rem; color: #555; }
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

function warmUpSection(warmUp: WarmUpWord[], labels: PrintableLabels): string {
  const rows = warmUp
    .map(
      (w, i) => `<tr>
    <td class="num">${i + 1}</td>
    <td class="jp">${wordCellHtml(w.word, w.reading)}</td>
    <td>${escapeHtml(w.meaning)}</td>
    <td>${escapeHtml(w.deckName)}</td>
  </tr>`,
    )
    .join('\n');

  return `<section class="warmup">
  <h1>${escapeHtml(labels.warmUpTitle ?? '')}</h1>
  <p class="desc">${escapeHtml(labels.warmUpHint ?? '')}</p>
  <table>
    <thead><tr><th></th><th>${escapeHtml(labels.word)}</th><th>${escapeHtml(labels.meaning)}</th><th>${escapeHtml(labels.deck ?? '')}</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</section>`;
}

/** Only the rows this lesson uses: a full 46+46 chart buries the handful of characters the teacher wants reinforced. */
function kanaSheetSection(setIds: string[], labels: PrintableLabels): string {
  const sets = orderKanaSets(setIds);
  if (sets.length === 0) return '';

  const rows = sets
    .map((set) => {
      const cells = set.entries
        .map((entry) => {
          const caption = entry.labelKey
            ? (labels.kanaContextual?.[entry.labelKey] ?? '')
            : entry.romaji;
          return `<td><div class="kana-char">${escapeHtml(entry.kana)}</div><div class="kana-romaji">${escapeHtml(caption)}</div></td>`;
        })
        .join('');
      return `<tr><td class="rowhead">${escapeHtml(set.label)}</td>${cells}</tr>`;
    })
    .join('\n');

  return `<section class="kana">
  <h1>${escapeHtml(labels.kanaTitle ?? '')}</h1>
  <p class="desc">${escapeHtml(labels.kanaHint ?? '')}</p>
  <table class="kana">
    <tbody>
${rows}
    </tbody>
  </table>
</section>`;
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
  warmUp?: WarmUpWord[];
  kanaSets?: string[];
}): string {
  const warmUp =
    args.variant === 'study' && args.warmUp?.length ? warmUpSection(args.warmUp, args.labels) : '';
  const kana = args.kanaSets?.length ? kanaSheetSection(args.kanaSets, args.labels) : '';
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
${warmUp}
${sections}
${kana}
<script>window.addEventListener('load', function () { window.print(); });</script>
</body>
</html>`;
}

// Safari only honours window.open inside the gesture handler, so a caller that
// has to await data must claim the tab first and write into it afterwards.
export function openBlankPrintWindow(): Window | null {
  return window.open('', '_blank');
}

export function writePrintWindow(win: Window, html: string): void {
  win.document.write(html);
  win.document.close();
}

/** False means the browser blocked the tab. */
export function openPrintWindow(html: string): boolean {
  const win = openBlankPrintWindow();
  if (!win) return false;
  writePrintWindow(win, html);
  return true;
}
