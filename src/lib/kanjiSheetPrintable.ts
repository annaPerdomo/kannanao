import type { PlanDeck } from '@/types/lessonPlan';

import { furiganaFromReading } from './furigana';
import {
  kanjiAliveUrl,
  type KanjiStrokes,
  KANJIVG_VIEWBOX,
  strokesSvg,
  uniqueKanji,
} from './kanjiStrokes';
import { escapeHtml, furiganaToRubyHtml } from './lessonPrintable';
import { brandHeaderHtml, printDocumentHtml } from './printBrand';

export const PRACTICE_BOXES = 10;
export const TRACE_BOXES = 3;

export interface KanjiSheetWeek {
  heading: string;
  deck: PlanDeck;
}

export interface KanjiSheetOptions {
  furigana: boolean;
  strokeOrder: boolean;
}

export interface KanjiSheetLabels {
  title: string;
  name: string;
  date: string;
  empty: string;
  strokeCount: (count: number) => string;
  watch: string;
  credit: string;
}

const KANJI_CSS = `
  body { padding: 0; }
  .sheet { page-break-after: always; }
  .sheet:last-of-type { page-break-after: auto; }
  .empty { font-size: 0.85rem; color: #555; }
  .card { border: 1px solid #333; padding: 6px 8px; margin-bottom: 8px; page-break-inside: avoid; }
  .wordline { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
  .word { font-size: 1.5rem; line-height: 1.2; }
  .word ruby rt { font-size: 0.4em; }
  .reading { font-size: 0.85rem; color: #555; }
  .meaning { font-size: 0.78rem; color: #555; }
  .kanji-row { margin: 6px 0; }
  .kanji-top { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
  .model { width: 20mm; height: 20mm; border: 1px solid #333; box-sizing: border-box; flex: none; }
  .info { flex: none; }
  .strokecount { font-size: 0.6rem; color: #555; }
  .watch { font-size: 0.6rem; color: #555; white-space: nowrap; }
  .watch a { color: #555; }
  .order { display: flex; flex-wrap: wrap; gap: 2px; flex: 1 1 auto; }
  .frame { width: 9mm; height: 9mm; border: 1px solid #ccc; box-sizing: border-box; }
  .practice { display: flex; gap: 1mm; flex-wrap: nowrap; }
  .practicebox { width: 16mm; height: 16mm; flex: none; }
  .credit { font-size: 0.65rem; color: #888; margin-top: 10px; }
`;

function kanjiCards(deck: PlanDeck): PlanDeck['cards'] {
  return (deck.cards ?? []).filter((card) => card.word && uniqueKanji(card.word).length > 0);
}

function modelSvg(kanji: string, data: KanjiStrokes | undefined, numbers: boolean): string {
  if (data) return strokesSvg(data, { numbers });
  return `<svg viewBox="0 0 ${KANJIVG_VIEWBOX} ${KANJIVG_VIEWBOX}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><text x="54.5" y="88" font-size="86" text-anchor="middle" fill="#000">${escapeHtml(kanji)}</text></svg>`;
}

function orderHtml(data: KanjiStrokes): string {
  const frames = data.strokes
    .map(
      (_, i) =>
        `<div class="frame">${strokesSvg(data, { upTo: i + 1, doneColor: '#b0b0b0' })}</div>`,
    )
    .join('');
  return `<div class="order">${frames}</div>`;
}

function practiceBoxSvg(kanji: string, data: KanjiStrokes | undefined, trace: boolean): string {
  const guide = `<rect x="2" y="2" width="105" height="105" fill="none" stroke="#999" stroke-width="2"/><line x1="54.5" y1="2" x2="54.5" y2="107" stroke="#ccc" stroke-width="1" stroke-dasharray="4 4"/><line x1="2" y1="54.5" x2="107" y2="54.5" stroke="#ccc" stroke-width="1" stroke-dasharray="4 4"/>`;
  const glyph = !trace
    ? ''
    : data
      ? strokesSvg(data, { color: '#c8c8c8', doneColor: '#c8c8c8' })
      : `<text x="54.5" y="88" font-size="86" text-anchor="middle" fill="#c8c8c8">${escapeHtml(kanji)}</text>`;
  return `<svg viewBox="0 0 ${KANJIVG_VIEWBOX} ${KANJIVG_VIEWBOX}" class="practicebox" xmlns="http://www.w3.org/2000/svg">${guide}${glyph}</svg>`;
}

function practiceRowHtml(kanji: string, data: KanjiStrokes | undefined): string {
  return Array.from({ length: PRACTICE_BOXES }, (_, i) =>
    practiceBoxSvg(kanji, data, i < TRACE_BOXES),
  ).join('');
}

function kanjiRowHtml(
  kanji: string,
  data: KanjiStrokes | undefined,
  options: KanjiSheetOptions,
  labels: KanjiSheetLabels,
): string {
  const model = modelSvg(kanji, data, options.strokeOrder);
  const strokeCount = data
    ? `<div class="strokecount">${escapeHtml(labels.strokeCount(data.strokes.length))}</div>`
    : '';
  const watch = `<div class="watch">${escapeHtml(labels.watch)} <a href="${kanjiAliveUrl(kanji)}">app.kanjialive.com/${escapeHtml(kanji)}</a></div>`;
  const order = options.strokeOrder && data ? orderHtml(data) : '';
  const practice = practiceRowHtml(kanji, data);

  return `<div class="kanji-row">
  <div class="kanji-top">
    <div class="model">${model}</div>
    <div class="info">
      ${strokeCount}
      ${watch}
    </div>
    ${order}
  </div>
  <div class="practice">${practice}</div>
</div>`;
}

function cardHtml(
  card: PlanDeck['cards'][number],
  options: KanjiSheetOptions,
  rowsHtml: string,
): string {
  const marked = options.furigana ? furiganaFromReading(card.word, card.reading) : null;
  const word = marked ? furiganaToRubyHtml(marked) : escapeHtml(card.word);
  const reading = options.furigana ? `<div class="reading">${escapeHtml(card.reading)}</div>` : '';
  return `<div class="card">
  <div class="wordline">
    <div class="word">${word}</div>
    ${reading}
    <div class="meaning">${escapeHtml(card.meaning)}</div>
  </div>
  ${rowsHtml}
</div>`;
}

export function buildKanjiSheetHtml(args: {
  locale: string;
  weeks: KanjiSheetWeek[];
  labels: KanjiSheetLabels;
  options: KanjiSheetOptions;
  strokes: Map<string, KanjiStrokes>;
}): string {
  const { labels, options, strokes } = args;
  let usedStrokeData = false;

  const weeksWithCards = args.weeks
    .map((week) => ({ week, cards: kanjiCards(week.deck) }))
    .filter((entry) => entry.cards.length > 0);

  const sheets = weeksWithCards.map(({ week, cards }, index) => {
    const seen = new Set<string>();
    const cardsHtml = cards
      .map((card) => {
        const rows = uniqueKanji(card.word)
          .filter((k) => !seen.has(k))
          .map((k) => {
            seen.add(k);
            const data = strokes.get(k);
            if (data) usedStrokeData = true;
            return kanjiRowHtml(k, data, options, labels);
          })
          .join('\n');
        return cardHtml(card, options, rows);
      })
      .join('\n');

    // cardsHtml above already set usedStrokeData for this week; reordering these two lines loses that.
    const credit =
      index === weeksWithCards.length - 1 && usedStrokeData
        ? `<p class="credit">${escapeHtml(labels.credit)}</p>`
        : '';

    const nameLine = `${labels.name}：＿＿＿＿＿＿　${labels.date}：＿＿＿＿`;

    return `<div class="sheet">
${brandHeaderHtml({ title: week.heading, nameLine })}
${cardsHtml}
${credit}
</div>`;
  });

  const body =
    sheets.length > 0
      ? sheets.join('\n')
      : `<div class="sheet">${brandHeaderHtml({ title: labels.title })}<p class="empty">${escapeHtml(labels.empty)}</p></div>`;

  return printDocumentHtml({
    title: labels.title,
    locale: args.locale,
    css: KANJI_CSS,
    body,
    header: false,
  });
}
