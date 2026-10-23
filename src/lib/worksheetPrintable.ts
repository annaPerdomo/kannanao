import type { LessonPlan, PlanCard, PlanDeck } from '@/types/lessonPlan';

import type { FuriganaSegment } from './furigana';
import { parseFurigana } from './furigana';
import { escapeHtml } from './lessonPrintable';
import { brandHeaderHtml, printDocumentHtml } from './printBrand';
import {
  frontHtml,
  frontText,
  hashSeed,
  printableDecks,
  shuffleAvoidingIdentity,
} from './printPlan';

export interface WorksheetLabels {
  title: string;
  name: string;
  date: string;
  matchHeading: string;
  matchHint: string;
  blankHeading: string;
  blankHint: string;
  wordBank: string;
  answerKey: string;
}

export interface WorksheetOptions {
  furigana: boolean;
  answerKey: boolean;
}

const WORKSHEET_CSS = `
  body { padding: 0; }
  .sheet { break-before: page; }
  .sheet:first-of-type { break-before: auto; }
  h2 { font-size: 0.95rem; margin: 10px 0 4px; }
  .hint { font-size: 0.78rem; color: #555; margin: 0 0 8px; }
  .match-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .match-table td { padding: 4px 6px; font-size: 0.95rem; vertical-align: middle; }
  .match-table td.num, .match-table td.letter { width: 1.6em; color: #777; }
  .match-table td.jp { font-size: 1.1rem; }
  .match-table td.blank-box { width: 2.5em; text-align: center; color: #999; }
  .match-table ruby rt { font-size: 0.5em; }
  .blank-row { margin-bottom: 10px; break-inside: avoid; }
  .blank-line { display: flex; gap: 8px; align-items: baseline; }
  .blank-num { width: 1.6em; color: #777; font-size: 0.9rem; flex: none; }
  .blank-jp { flex: 1; font-size: 13pt; line-height: 1.6; }
  .blank-jp ruby rt { font-size: 0.5em; }
  .blank-en { font-size: 0.75rem; color: #777; margin: 2px 0 0 1.6em; }
  .word-bank { border: 1px solid #999; padding: 6px 8px; margin-bottom: 10px; font-size: 1rem; }
  .key-deck { margin-bottom: 10px; break-inside: avoid; }
  .key-deck h3 { font-size: 0.85rem; margin: 0 0 4px; }
  .key-match, .key-blank { font-size: 0.85rem; margin: 2px 0; }
`;

function renderSegments(segments: FuriganaSegment[], furigana: boolean): string {
  return segments
    .map((segment) => {
      if (typeof segment === 'string') return escapeHtml(segment);
      if (furigana)
        return `<ruby>${escapeHtml(segment.kanji)}<rt>${escapeHtml(segment.reading)}</rt></ruby>`;
      return escapeHtml(segment.kanji);
    })
    .join('');
}

/** A ruby segment can't be split without losing its reading, so one that touches the match at all is dropped whole. */
function splitAtMatch(
  segments: FuriganaSegment[],
  matchStart: number,
  matchEnd: number,
): { before: FuriganaSegment[]; after: FuriganaSegment[]; droppedLength: number } {
  const before: FuriganaSegment[] = [];
  const after: FuriganaSegment[] = [];
  let droppedLength = 0;
  let pos = 0;

  for (const segment of segments) {
    const text = typeof segment === 'string' ? segment : segment.kanji;
    const start = pos;
    const end = pos + text.length;
    pos = end;

    if (end <= matchStart) {
      before.push(segment);
      continue;
    }
    if (start >= matchEnd) {
      after.push(segment);
      continue;
    }
    if (typeof segment === 'string') {
      if (matchStart > start) before.push(segment.slice(0, matchStart - start));
      if (matchEnd < end) after.push(segment.slice(matchEnd - start));
    } else {
      droppedLength += text.length;
    }
  }

  return { before, after, droppedLength };
}

export function blankSentenceHtml(
  exampleJp: string,
  answer: string,
  furigana: boolean,
): string | null {
  if (!answer) return null;
  const segments = parseFurigana(exampleJp);
  const plain = segments
    .map((segment) => (typeof segment === 'string' ? segment : segment.kanji))
    .join('');
  const matchStart = plain.indexOf(answer);
  if (matchStart === -1) return null;
  const matchEnd = matchStart + answer.length;

  const { before, after, droppedLength } = splitAtMatch(segments, matchStart, matchEnd);
  // Dropping a whole ruby group for a partial match (日 inside {今日|きょう}) would blank more than the answer.
  if (droppedLength > answer.length) return null;
  return `${renderSegments(before, furigana)}<span class="blank">（　　　　　）</span>${renderSegments(after, furigana)}`;
}

function blankableHtml(card: PlanCard, furigana: boolean): string | null {
  const fromWord = blankSentenceHtml(card.exampleJp, card.word, furigana);
  if (fromWord) return fromWord;
  if (card.reading.length < 2) return null;
  return blankSentenceHtml(card.exampleJp, card.reading, furigana);
}

function uniqueCards(deck: PlanDeck, cards: PlanCard[]): PlanCard[] {
  const seenFront = new Set<string>();
  const seenMeaning = new Set<string>();
  return cards.filter((card) => {
    const front = frontText(deck, card);
    if (seenFront.has(front) || seenMeaning.has(card.meaning)) return false;
    seenFront.add(front);
    seenMeaning.add(card.meaning);
    return true;
  });
}

interface MatchSection {
  html: string;
  answers: string;
}

function matchSection(
  deck: PlanDeck,
  labels: WorksheetLabels,
  options: WorksheetOptions,
): MatchSection | null {
  const cards = uniqueCards(deck, deck.cards).slice(0, 8);
  if (cards.length < 3) return null;

  const rightOrder = shuffleAvoidingIdentity(cards, hashSeed(`${deck.name}:match`));
  const rows = cards
    .map((card, i) => {
      const letter = String.fromCharCode(97 + i);
      const rightCard = rightOrder[i];
      return `<tr>
  <td class="num">${i + 1}.</td>
  <td class="jp">${frontHtml(deck, card, options.furigana)}</td>
  <td class="blank-box">（　）</td>
  <td class="letter">${letter}.</td>
  <td class="meaning">${escapeHtml(rightCard.meaning)}</td>
</tr>`;
    })
    .join('\n');

  const answers = cards
    .map((card, i) => {
      const letter = String.fromCharCode(97 + rightOrder.indexOf(card));
      return `${i + 1}–${letter}`;
    })
    .join('  ');

  return {
    html: `<div class="match-block">
  <h2>${escapeHtml(labels.matchHeading)}</h2>
  <p class="hint">${escapeHtml(labels.matchHint)}</p>
  <table class="match-table"><tbody>${rows}</tbody></table>
</div>`,
    answers,
  };
}

interface BlankSection {
  html: string;
  answers: string;
}

function blankSection(
  deck: PlanDeck,
  labels: WorksheetLabels,
  options: WorksheetOptions,
): BlankSection | null {
  const entries = deck.cards
    .map((card) => {
      const html = blankableHtml(card, options.furigana);
      return html ? { card, html } : null;
    })
    .filter((entry): entry is { card: PlanCard; html: string } => entry !== null)
    .slice(0, 8);

  if (entries.length < 2) return null;

  const bankOrder = shuffleAvoidingIdentity(
    entries.map((entry) => entry.card),
    hashSeed(`${deck.name}:bank`),
  );
  const bankHtml = bankOrder.map((card) => escapeHtml(frontText(deck, card))).join('　');

  const rows = entries
    .map(
      (entry, i) => `<div class="blank-row">
  <div class="blank-line"><span class="blank-num">${i + 1}.</span><span class="blank-jp">${entry.html}</span></div>
  <div class="blank-en">${escapeHtml(entry.card.exampleEn)}</div>
</div>`,
    )
    .join('\n');

  const answers = entries
    .map((entry, i) => `${i + 1} ＝ ${escapeHtml(frontText(deck, entry.card))}`)
    .join('  ');

  return {
    html: `<div class="blank-block">
  <h2>${escapeHtml(labels.blankHeading)}</h2>
  <p class="hint">${escapeHtml(labels.blankHint)}</p>
  <div class="word-bank"><strong>${escapeHtml(labels.wordBank)}：</strong>${bankHtml}</div>
  ${rows}
</div>`,
    answers,
  };
}

interface DeckSheet {
  html: string;
  deckName: string;
  deckEmoji: string;
  matchAnswers: string | null;
  blankAnswers: string | null;
}

function deckSheet(
  deck: PlanDeck,
  labels: WorksheetLabels,
  options: WorksheetOptions,
): DeckSheet | null {
  const match = matchSection(deck, labels, options);
  const blank = blankSection(deck, labels, options);
  if (!match && !blank) return null;

  const nameLine = `${labels.name}：＿＿＿＿＿＿　${labels.date}：＿＿＿＿`;

  return {
    html: `<div class="sheet">
${brandHeaderHtml({ title: `${deck.emoji} ${deck.name}`.trim(), subtitle: labels.title, nameLine })}
${match ? match.html : ''}
${blank ? blank.html : ''}
</div>`,
    deckName: deck.name,
    deckEmoji: deck.emoji,
    matchAnswers: match?.answers ?? null,
    blankAnswers: blank?.answers ?? null,
  };
}

function answerKeySheet(sheets: DeckSheet[], labels: WorksheetLabels): string {
  const sections = sheets
    .map(
      (sheet) => `<div class="key-deck">
  <h3>${escapeHtml(`${sheet.deckEmoji} ${sheet.deckName}`.trim())}</h3>
  ${sheet.matchAnswers ? `<p class="key-match">${escapeHtml(sheet.matchAnswers)}</p>` : ''}
  ${sheet.blankAnswers ? `<p class="key-blank">${sheet.blankAnswers}</p>` : ''}
</div>`,
    )
    .join('\n');

  return `<div class="sheet">
${brandHeaderHtml({ title: labels.answerKey })}
${sections}
</div>`;
}

export function hasWorksheetContent(plan: LessonPlan): boolean {
  return printableDecks(plan).some((deck) => {
    if (uniqueCards(deck, deck.cards).length >= 3) return true;
    const blankable = deck.cards.filter((card) => blankableHtml(card, false) !== null);
    return blankable.length >= 2;
  });
}

export function buildWorksheetHtml(args: {
  locale: string;
  plan: LessonPlan;
  labels: WorksheetLabels;
  options: WorksheetOptions;
}): string {
  const { locale, plan, labels, options } = args;
  const decks = printableDecks(plan);

  const sheets = decks
    .map((deck) => deckSheet(deck, labels, options))
    .filter((sheet): sheet is DeckSheet => sheet !== null);

  const pages = sheets.map((sheet) => sheet.html);
  if (options.answerKey && sheets.some((sheet) => sheet.matchAnswers || sheet.blankAnswers)) {
    pages.push(answerKeySheet(sheets, labels));
  }

  const body =
    pages.length > 0
      ? pages.join('\n')
      : `<div class="sheet">${brandHeaderHtml({ title: labels.title })}</div>`;

  return printDocumentHtml({
    title: labels.title,
    locale,
    css: WORKSHEET_CSS,
    body,
    header: false,
  });
}
