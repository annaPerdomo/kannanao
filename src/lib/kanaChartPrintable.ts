import type { PlanDeck } from '@/types/lessonPlan';

import { furiganaFromReading } from './furigana';
import { buildKanaChart, CHART_DIRECTION, type ChartBlock } from './kanaChart';
import type { KanaEntry, KanaLabelKey, KanaTrack } from './kanaCurriculum';
import { escapeHtml, furiganaToRubyHtml, PRINT_BASE_CSS } from './lessonPrintable';
import { isPureKana } from './reviewGames';

export type KanaSheetScript = KanaTrack | 'both';

export interface KanaSheetOptions {
  script: KanaSheetScript;
  romaji: boolean;
  blank: boolean;
}

export interface KanaSheetLabels {
  title: string;
  hint?: string;
  name?: string;
  date?: string;
  markedBlock: string;
  comboBlock: string;
  contextualBlock: string;
  contextual: Partial<Record<KanaLabelKey, string>>;
}

export interface KanjiSheetLabels {
  title: string;
  name: string;
  date: string;
  empty: string;
}

export interface KanjiSheetWeek {
  heading: string;
  deck: PlanDeck;
}

/** knownByKana counts learners who read that character, out of learnerCount. */
export interface GroupKanaCoverage {
  learnerCount: number;
  knownByKana: Record<string, number>;
}

export interface GroupSheetLabels extends KanaSheetLabels {
  legend: string;
  trackTitle: Record<KanaTrack, string>;
}

const TRACKS: Record<KanaSheetScript, KanaTrack[]> = {
  hiragana: ['hiragana'],
  katakana: ['katakana'],
  both: ['hiragana', 'katakana'],
};

interface PrintCell {
  entries: KanaEntry[];
}

interface PrintColumn {
  setId: string;
  labels: string[];
  cells: (PrintCell | null)[];
}

interface PrintBlock {
  id: ChartBlock['id'];
  rowLabels: readonly string[];
  columns: PrintColumn[];
}

// Nothing here knows the chart order: a curriculum change reaches paper
// through kanaChart.ts alone.
function printBlocks(script: KanaSheetScript): PrintBlock[] {
  const [first, ...rest] = TRACKS[script].map(buildKanaChart);

  return first.map((block, bi) => ({
    id: block.id,
    rowLabels: block.rowLabels,
    columns: block.columns.map((col, ci) => {
      const others = rest.map((chart) => chart[bi]?.columns[ci]);
      const depth = Math.max(col.cells.length, ...others.map((o) => o?.cells.length ?? 0));
      const cells = Array.from({ length: depth }, (_, i) => {
        const entries = [col.cells[i], ...others.map((o) => o?.cells[i] ?? null)].filter(
          (entry): entry is KanaEntry => !!entry,
        );
        return entries.length > 0 ? { entries } : null;
      });
      return {
        setId: col.setId,
        labels: [col.label, ...others.map((o) => o?.label).filter((l): l is string => !!l)],
        cells,
      };
    }),
  }));
}

function caption(cell: PrintCell, labels: KanaSheetLabels): string {
  const entry = cell.entries[0];
  return entry.labelKey ? (labels.contextual[entry.labelKey] ?? '') : entry.romaji;
}

function glyphsHtml(cell: PrintCell, blank: boolean): string {
  if (blank) return '<div class="glyph">&nbsp;</div>';
  // Two combination sounds side by side (きゃキャ) overflow a chart cell and
  // wrap mid-script, so a paired cell stacks them instead.
  const separator = cell.entries.some((entry) => [...entry.kana].length > 1) ? '<br>' : '';
  return `<div class="glyph">${cell.entries.map((e) => escapeHtml(e.kana)).join(separator)}</div>`;
}

function cellHtml(
  cell: PrintCell | null,
  options: KanaSheetOptions,
  labels: KanaSheetLabels,
): string {
  if (!cell) return '<td class="gap"></td>';
  const romaji = options.romaji
    ? `<div class="romaji">${escapeHtml(caption(cell, labels))}</div>`
    : '';
  return `<td class="cell">${glyphsHtml(cell, options.blank)}${romaji}</td>`;
}

/** あ on the right, ん on the left, exactly as the on-screen chart's `dir` renders it. */
function readingOrder(columns: PrintColumn[]): PrintColumn[] {
  return CHART_DIRECTION === 'rtl' ? [...columns].reverse() : columns;
}

function blockTitle(id: ChartBlock['id'], labels: KanaSheetLabels): string {
  if (id === 'marked') return labels.markedBlock;
  if (id === 'combo') return labels.comboBlock;
  if (id === 'contextual') return labels.contextualBlock;
  return '';
}

// No column header row: on paper it would just reprint the あ row directly
// above itself.
function gridHtml(
  block: PrintBlock,
  widthPct: number,
  renderCell: (cell: PrintCell | null, column: PrintColumn) => string,
): string {
  const width = ` style="width:${widthPct.toFixed(2)}%"`;

  // A bare strip has no columns to order and would just print っ ー backwards.
  if (block.rowLabels.length === 0) {
    const strip = block.columns[0];
    return `<table class="grid strip"><tbody><tr>${strip.cells
      .map((cell) => renderCell(cell, strip))
      .join('')}</tr></tbody></table>`;
  }

  const columns = readingOrder(block.columns);
  const rows = block.rowLabels
    .map(
      (label, r) =>
        `<tr>${columns.map((col) => renderCell(col.cells[r] ?? null, col)).join('')}<th class="rowhead">${escapeHtml(label)}</th></tr>`,
    )
    .join('');

  return `<table class="grid"${width}><tbody>${rows}</tbody></table>`;
}

/** Every block's cells are one width: a five-column block stretched to the page reads as a different chart. */
function chartHtml(
  blocks: PrintBlock[],
  labels: KanaSheetLabels,
  renderCell: (cell: PrintCell | null, column: PrintColumn) => string,
): string {
  const units = Math.max(...blocks.map((block) => block.columns.length + 1));

  return blocks
    .map((block) => {
      const title = blockTitle(block.id, labels);
      return `<section class="block">
${title ? `<h2>${escapeHtml(title)}</h2>` : ''}
${gridHtml(block, ((block.columns.length + 1) / units) * 100, renderCell)}
</section>`;
    })
    .join('\n');
}

const GRID_CSS = `
  ${PRINT_BASE_CSS}
  body { padding: 0; }
  .sheet { page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .sheet-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
  h1 { font-size: 1.1rem; margin: 0 0 2px; }
  h2 { font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 3px; color: #444; }
  .nameline { font-size: 0.78rem; white-space: nowrap; }
  .hint { font-size: 0.74rem; color: #555; margin: 0 0 8px; }
  section.block { margin-bottom: 9px; }
  table.grid { table-layout: fixed; border-collapse: collapse; margin-left: auto; }
  table.grid.strip { width: auto; }
  table.grid th, table.grid td { border: 1px solid #333; text-align: center; padding: 2px 0; }
  th.rowhead { width: 2.2em; font-size: 0.62rem; color: #555; font-weight: 400; border-left-width: 2px; }
  td.gap { border-color: #ccc; }
  td.cell { height: 13mm; }
  table.grid.strip td.cell { width: 14mm; }
  .glyph { font-size: 1.15rem; line-height: 1.25; }
  .romaji { font-size: 0.58rem; color: #555; line-height: 1.1; }
  .cover { font-size: 0.58rem; color: #333; line-height: 1.2; }
  .bar { height: 3px; border: 1px solid #666; margin: 1px 3px 0; }
  .bar > i { display: block; height: 100%; background: #333; }
  .legend { font-size: 0.7rem; color: #555; margin: 6px 0 0; }
`;

function documentHtml(title: string, locale: string, css: string, body: string): string {
  return `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
${body}
<script>window.addEventListener('load', function () { window.print(); });</script>
</body>
</html>`;
}

function sheetHead(title: string, labels: KanaSheetLabels): string {
  const nameline = labels.name
    ? `<div class="nameline">${escapeHtml(labels.name)}：＿＿＿＿＿＿　${escapeHtml(labels.date ?? '')}：＿＿＿＿</div>`
    : '';
  return `<div class="sheet-head">
  <h1>${escapeHtml(title)}</h1>
  ${nameline}
</div>
${labels.hint ? `<p class="hint">${escapeHtml(labels.hint)}</p>` : ''}`;
}

export function buildKanaChartPrintableHtml(args: {
  locale: string;
  options: KanaSheetOptions;
  labels: KanaSheetLabels;
}): string {
  const { options, labels } = args;
  const body = chartHtml(printBlocks(options.script), labels, (cell) =>
    cellHtml(cell, options, labels),
  );

  return documentHtml(
    labels.title,
    args.locale,
    GRID_CSS,
    `<div class="sheet">
${sheetHead(labels.title, labels)}
${body}
</div>`,
  );
}

function coverageCellHtml(cell: PrintCell | null, coverage: GroupKanaCoverage): string {
  if (!cell) return '<td class="gap"></td>';
  const known = coverage.knownByKana[cell.entries[0].kana] ?? 0;
  const total = Math.max(0, coverage.learnerCount);
  const pct = total > 0 ? Math.round((known / total) * 100) : 0;
  return `<td class="cell">${glyphsHtml(cell, false)}<div class="bar"><i style="width:${pct}%"></i></div><div class="cover">${known}/${total}</div></td>`;
}

// Aggregate only: a wall chart never names who is behind. A coverage cell is
// already three lines deep, so `both` pages per script instead of stacking.
export function buildGroupKanaChartHtml(args: {
  locale: string;
  script: KanaSheetScript;
  coverage: GroupKanaCoverage;
  labels: GroupSheetLabels;
}): string {
  const { labels, coverage } = args;
  const sheets = TRACKS[args.script].map((track) => {
    // っ/ッ/ー are only ever answered inside a word pair, so almost no learner
    // has a row for them: printing their coverage would read 0/N for every group.
    const blocks = printBlocks(track).filter((block) => block.id !== 'contextual');
    const body = chartHtml(blocks, labels, (cell) => coverageCellHtml(cell, coverage));

    return `<div class="sheet">
${sheetHead(`${labels.title} — ${labels.trackTitle[track]}`, labels)}
${body}
<p class="legend">${escapeHtml(labels.legend)}</p>
</div>`;
  });

  return documentHtml(labels.title, args.locale, GRID_CSS, sheets.join('\n'));
}

const KANJI_CSS = `
  ${PRINT_BASE_CSS}
  .sheet { page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .sheet-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
  h1 { font-size: 1.1rem; margin: 0 0 8px; }
  .nameline { font-size: 0.8rem; white-space: nowrap; }
  .empty { font-size: 0.85rem; color: #555; }
  .card { border: 1px solid #333; padding: 6px 8px; margin-bottom: 8px; display: flex; gap: 12px; align-items: center; page-break-inside: avoid; }
  .word { font-size: 1.9rem; line-height: 1.2; min-width: 4em; }
  .word ruby rt { font-size: 0.32em; }
  .gloss { flex: 1; font-size: 0.78rem; }
  .gloss .reading { font-size: 0.95rem; }
  .gloss .meaning { color: #555; }
  .boxes { display: flex; gap: 4px; }
  .boxes span { display: block; width: 16mm; height: 16mm; border: 1px solid #999; }
`;

function kanjiCardHtml(card: PlanDeck['cards'][number], boxes: number): string {
  const marked = furiganaFromReading(card.word, card.reading);
  const word = marked ? furiganaToRubyHtml(marked) : escapeHtml(card.word);
  return `<div class="card">
  <div class="word">${word}</div>
  <div class="gloss">
    <div class="reading">${escapeHtml(card.reading)}</div>
    <div class="meaning">${escapeHtml(card.meaning)}</div>
  </div>
  <div class="boxes">${'<span></span>'.repeat(boxes)}</div>
</div>`;
}

function kanjiCards(deck: PlanDeck): PlanDeck['cards'] {
  return (deck.cards ?? []).filter((card) => card.word && !isPureKana(card.word));
}

const WRITING_BOXES = 3;

/** No stroke order boxes: we have no stroke data. */
export function buildKanjiSheetHtml(args: {
  locale: string;
  weeks: KanjiSheetWeek[];
  labels: KanjiSheetLabels;
}): string {
  const { labels } = args;
  const sheets = args.weeks
    .map((week) => ({ week, cards: kanjiCards(week.deck) }))
    .filter((entry) => entry.cards.length > 0)
    .map(
      ({ week, cards }) => `<div class="sheet">
<div class="sheet-head">
  <h1>${escapeHtml(week.heading)}</h1>
  <div class="nameline">${escapeHtml(labels.name)}：＿＿＿＿＿＿　${escapeHtml(labels.date)}：＿＿＿＿</div>
</div>
${cards.map((card) => kanjiCardHtml(card, WRITING_BOXES)).join('\n')}
</div>`,
    );

  const body =
    sheets.length > 0
      ? sheets.join('\n')
      : `<div class="sheet"><h1>${escapeHtml(labels.title)}</h1><p class="empty">${escapeHtml(labels.empty)}</p></div>`;

  return documentHtml(labels.title, args.locale, KANJI_CSS, body);
}
