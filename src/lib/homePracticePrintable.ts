import type { LessonPlan, PlanCard, PlanDeck } from '@/types/lessonPlan';

import { escapeHtml } from './lessonPrintable';
import { writingBoxSvg } from './printBoxes';
import { brandHeaderHtml, printDocumentHtml } from './printBrand';
import { frontHtml, frontText, printableDecks } from './printPlan';

export const HOME_WRITE_MAX = 10;

export interface HomePracticeLabels {
  title: string;
  name: string;
  date: string;
  wordsHeading: string;
  sayIt: string;
  writeIt: string;
  trackerHeading: string;
  trackerApp: string;
  trackerPaper: string;
  days: string[];
  checkedBy: string;
  scan: string;
}

export interface HomePracticeOptions {
  furigana: boolean;
}

export interface HomePracticeQr {
  svg: string;
  url: string;
}

const HOME_CSS = `
  body { padding: 0; }
  .sheet { break-before: page; }
  .sheet:first-of-type { break-before: auto; }
  .top-strip { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 10px; break-inside: avoid; }
  .tracker-heading { font-size: 0.85rem; font-weight: 700; margin: 0 0 4px; }
  .tracker-table { border-collapse: collapse; }
  .tracker-table th, .tracker-table td { border: 1px solid #999; padding: 3px 6px; font-size: 0.75rem; text-align: center; }
  .tracker-table td.rowhead { text-align: left; font-size: 0.72rem; color: #555; white-space: nowrap; }
  .tick { width: 5mm; height: 5mm; }
  .checked-by { font-size: 0.75rem; color: #333; margin-top: 6px; }
  .qr { text-align: center; }
  .qr svg { width: 31mm; height: 31mm; }
  .qr-caption { font-size: 0.72rem; margin: 2mm 0 0; }
  .qr-url { font-size: 0.65rem; color: #777; margin: 1px 0 0; word-break: break-all; }
  h2 { font-size: 0.95rem; margin: 10px 0 4px; }
  .word-row { break-inside: avoid; }
  .word-row + .word-row { margin-top: 8px; }
  .word { font-size: 1.4rem; line-height: 1.2; }
  .word ruby rt { font-size: 0.4em; }
  .meaning { font-size: 0.8rem; color: #555; margin: 2px 0 4px; }
  .sayit { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #333; margin-bottom: 4px; }
  .sayit svg.circle { width: 4mm; height: 4mm; }
  .writeit-label { font-size: 0.78rem; color: #333; margin: 0 0 3px; }
  .trace-row, .blank-row { display: flex; gap: 1mm; flex-wrap: nowrap; }
  .blank-row { margin-top: 1mm; }
  .writing-line { width: 100%; height: 10mm; }
`;

function circleSvg(): string {
  return `<svg class="circle" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4" fill="none" stroke="#999" stroke-width="1"/></svg>`;
}

function trackerHtml(labels: HomePracticeLabels): string {
  const headers = labels.days.map((day) => `<th class="day">${escapeHtml(day)}</th>`).join('');
  const tickRow = () => labels.days.map(() => `<td class="tick"></td>`).join('');

  return `<div class="tracker">
  <p class="tracker-heading">${escapeHtml(labels.trackerHeading)}</p>
  <table class="tracker-table">
    <thead><tr><th></th>${headers}</tr></thead>
    <tbody>
      <tr><td class="rowhead">${escapeHtml(labels.trackerApp)}</td>${tickRow()}</tr>
      <tr><td class="rowhead">${escapeHtml(labels.trackerPaper)}</td>${tickRow()}</tr>
    </tbody>
  </table>
  <p class="checked-by">${escapeHtml(labels.checkedBy)}：＿＿＿＿＿＿</p>
</div>`;
}

function qrHtml(qr: HomePracticeQr | null, labels: HomePracticeLabels): string {
  if (!qr || !qr.svg.startsWith('<svg')) return '';
  const url = qr.url.replace(/^https:\/\//, '');
  return `<div class="qr">
  ${qr.svg}
  <p class="qr-caption">${escapeHtml(labels.scan)}</p>
  <p class="qr-url">${escapeHtml(url)}</p>
</div>`;
}

function writingChars(reading: string): string[] {
  return Array.from(reading.normalize('NFC')).filter(
    (ch) => ch.trim() && ch !== '〜' && ch !== '~',
  );
}

function writeItHtml(deck: PlanDeck, card: PlanCard): string {
  const reading = card.reading || frontText(deck, card);
  const chars = writingChars(reading);

  if (chars.length > HOME_WRITE_MAX) {
    return `<svg class="writing-line" viewBox="0 0 100 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="9" x2="100" y2="9" stroke="#999" stroke-width="0.5"/></svg>`;
  }

  const traceRow = chars.map((ch) => writingBoxSvg({ sizeMm: 10, trace: ch })).join('');
  const blankRow = chars.map(() => writingBoxSvg({ sizeMm: 10 })).join('');
  return `<div class="trace-row">${traceRow}</div><div class="blank-row">${blankRow}</div>`;
}

function wordRowHtml(
  deck: PlanDeck,
  card: PlanCard,
  options: HomePracticeOptions,
  labels: HomePracticeLabels,
): string {
  const circles = `${circleSvg()}${circleSvg()}${circleSvg()}`;

  return `<div class="word-row">
  <div class="word">${frontHtml(deck, card, options.furigana)}</div>
  <div class="meaning">${escapeHtml(card.meaning)}</div>
  <div class="sayit">${escapeHtml(labels.sayIt)}${circles}</div>
  <div class="writeit">
    <p class="writeit-label">${escapeHtml(labels.writeIt)}</p>
    ${writeItHtml(deck, card)}
  </div>
</div>`;
}

function deckSheetHtml(
  deck: PlanDeck,
  options: HomePracticeOptions,
  labels: HomePracticeLabels,
  qr: HomePracticeQr | null,
): string {
  const nameLine = `${labels.name}：＿＿＿＿＿＿　${labels.date}：＿＿＿＿`;
  const rows = deck.cards.map((card) => wordRowHtml(deck, card, options, labels)).join('\n');

  return `<div class="sheet">
${brandHeaderHtml({ title: `${deck.emoji} ${deck.name}`.trim(), subtitle: labels.title, nameLine })}
<div class="top-strip">
  ${trackerHtml(labels)}
  ${qrHtml(qr, labels)}
</div>
<h2>${escapeHtml(labels.wordsHeading)}</h2>
${rows}
</div>`;
}

export function buildHomePracticeHtml(args: {
  locale: string;
  plan: LessonPlan;
  labels: HomePracticeLabels;
  options: HomePracticeOptions;
  qr: HomePracticeQr | null;
}): string {
  const { locale, plan, labels, options, qr } = args;
  const decks = printableDecks(plan);

  const body =
    decks.length > 0
      ? decks.map((deck) => deckSheetHtml(deck, options, labels, qr)).join('\n')
      : `<div class="sheet">${brandHeaderHtml({ title: labels.title })}</div>`;

  return printDocumentHtml({
    title: labels.title,
    locale,
    css: HOME_CSS,
    body,
    header: false,
  });
}
