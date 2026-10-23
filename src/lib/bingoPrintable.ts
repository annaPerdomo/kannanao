import type { LessonPlan } from '@/types/lessonPlan';

import { escapeHtml } from './lessonPrintable';
import { brandHeaderHtml, printDocumentHtml } from './printBrand';
import { frontHtml, frontText, hashSeed, printableDecks, seededShuffle } from './printPlan';

export type BingoSize = 3 | 4 | 5;

export interface BingoWord {
  front: string;
  frontHtml: string;
  meaning: string;
}

export interface BingoLabels {
  title: string;
  name: string;
  date: string;
  free: string;
  callerTitle: string;
  callerHint: string;
  called: string;
}

export interface BingoOptions {
  furigana: boolean;
  copies: number;
}

const BINGO_CSS = `
  body { padding: 0; }
  .sheet { break-before: page; }
  .sheet:first-of-type { break-before: auto; }
  .hint { font-size: 0.78rem; color: #555; margin: 0 0 8px; }
  .caller-table { width: 100%; border-collapse: collapse; }
  .caller-table th, .caller-table td { border-bottom: 1px solid #ccc; padding: 3px 6px; font-size: 0.85rem; text-align: left; }
  .caller-table td.check { width: 1.6em; }
  .caller-table td.check .box { display: inline-block; width: 3mm; height: 3mm; border: 1px solid #333; }
  .caller-table td.jp { font-size: 1rem; }
  .caller-table td.jp ruby rt { font-size: 0.5em; }
  .cards-wrap { break-before: page; }
  .bingo-card { break-inside: avoid; margin: 0; }
  .bingo-card:nth-child(even) { margin-top: 8mm; }
  .bingo-card.page-break { break-before: page; }
  .card-title { font-weight: 700; font-size: 0.85rem; margin: 0; }
  .card-name { font-size: 0.78rem; color: #333; margin: 0 0 3mm; }
  .bingo-grid { border-collapse: collapse; margin: 0 auto; }
  .bingo-grid td { border: 1px solid #000; text-align: center; vertical-align: middle; font-size: 13pt; padding: 1mm; overflow: hidden; }
  .bingo-grid td.shrink { font-size: 10pt; }
  .bingo-grid td.free { font-weight: 700; }
  .bingo-grid td ruby rt { font-size: 0.5em; }
  .bingo-grid.size-5 td { width: 19mm; height: 19mm; }
  .bingo-grid.size-4 td { width: 24mm; height: 24mm; }
  .bingo-grid.size-3 td { width: 30mm; height: 30mm; }
`;

export function bingoPool(plan: LessonPlan, furigana: boolean): BingoWord[] {
  const seenFront = new Set<string>();
  const seenMeaning = new Set<string>();
  const pool: BingoWord[] = [];

  for (const deck of printableDecks(plan)) {
    for (const card of deck.cards) {
      const front = frontText(deck, card);
      const meaningKey = card.meaning.trim().toLowerCase();
      if (seenFront.has(front) || seenMeaning.has(meaningKey)) continue;
      seenFront.add(front);
      seenMeaning.add(meaningKey);
      pool.push({ front, frontHtml: frontHtml(deck, card, furigana), meaning: card.meaning });
    }
  }

  return pool;
}

export function bingoSize(poolSize: number): BingoSize | null {
  if (poolSize >= 24) return 5;
  if (poolSize >= 16) return 4;
  if (poolSize >= 9) return 3;
  return null;
}

function clampCopies(copies: number): number {
  if (!Number.isFinite(copies)) return 1;
  return Math.min(40, Math.max(1, Math.floor(copies)));
}

function deckKey(plan: LessonPlan): string {
  return printableDecks(plan)
    .map((deck) => deck.name)
    .join('|');
}

function callerSheetHtml(pool: BingoWord[], key: string, labels: BingoLabels): string {
  const ordered = seededShuffle(pool, hashSeed(`caller:${key}`));
  const rows = ordered
    .map(
      (word) => `<tr>
  <td class="check"><span class="box"></span></td>
  <td class="meaning">${escapeHtml(word.meaning)}</td>
  <td class="jp">${word.frontHtml}</td>
</tr>`,
    )
    .join('\n');

  return `<div class="sheet caller">
${brandHeaderHtml({ title: labels.callerTitle })}
<p class="hint">${escapeHtml(labels.callerHint)}</p>
<table class="caller-table">
  <thead><tr><th>${escapeHtml(labels.called)}</th><th></th><th></th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>`;
}

function cardCellsHtml(words: BingoWord[], size: BingoSize, labels: BingoLabels): string {
  const total = size * size;
  const centre = size === 5 ? Math.floor(total / 2) : -1;
  const limit = size === 5 ? 3 : size === 4 ? 4 : 5;
  const cells: string[] = [];
  let wordIndex = 0;

  for (let cell = 0; cell < total; cell++) {
    if (cell === centre) {
      cells.push(`<td class="cell free">${escapeHtml(labels.free)}</td>`);
      continue;
    }
    const word = words[wordIndex++];
    const shrink = word.front.length > limit ? ' shrink' : '';
    cells.push(`<td class="cell${shrink}">${word.frontHtml}</td>`);
  }

  const rows: string[] = [];
  for (let r = 0; r < size; r++) {
    rows.push(`<tr>${cells.slice(r * size, (r + 1) * size).join('')}</tr>`);
  }
  return rows.join('\n');
}

function cardHtml(
  pool: BingoWord[],
  key: string,
  index: number,
  size: BingoSize,
  labels: BingoLabels,
): string {
  const take = size === 5 ? 24 : size * size;
  const words = seededShuffle(pool, hashSeed(`${key}:${index}`)).slice(0, take);
  const nameLine = `${labels.name}：＿＿＿＿＿＿　${labels.date}：＿＿＿＿`;
  const pageBreak = index % 2 === 0 && index > 0 ? ' page-break' : '';

  return `<div class="bingo-card${pageBreak}">
  <p class="card-title">${escapeHtml(labels.title)} #${index + 1}</p>
  <p class="card-name">${escapeHtml(nameLine)}</p>
  <table class="bingo-grid size-${size}"><tbody>${cardCellsHtml(words, size, labels)}</tbody></table>
</div>`;
}

export function buildBingoHtml(args: {
  locale: string;
  plan: LessonPlan;
  labels: BingoLabels;
  options: BingoOptions;
}): string {
  const { locale, plan, labels, options } = args;
  const pool = bingoPool(plan, options.furigana);
  const size = bingoSize(pool.length);

  const body =
    size === null
      ? `<div class="sheet">${brandHeaderHtml({ title: labels.title })}</div>`
      : (() => {
          const key = deckKey(plan);
          const copies = clampCopies(options.copies);
          const cards = Array.from({ length: copies }, (_, i) =>
            cardHtml(pool, key, i, size, labels),
          ).join('\n');
          return `${callerSheetHtml(pool, key, labels)}
<div class="cards-wrap">
${cards}
</div>`;
        })();

  return printDocumentHtml({
    title: labels.title,
    locale,
    css: BINGO_CSS,
    body,
    header: false,
  });
}
