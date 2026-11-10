import type { LessonPlan, PlanCard } from '@/types/lessonPlan';

import { isKanjiWord } from './kanjiPractice';
import { escapeHtml } from './lessonPrintable';
import { brandHeaderHtml, printDocumentHtml } from './printBrand';
import { printableDecks } from './printPlan';
import { readingDistractors, splitReading } from './readingConfusions';
import { hashSeed, seededShuffle } from './seededRandom';

/** Textbook faces show handwritten letter shapes; the brand's rounded face does not. */
export const TEXTBOOK_FONT = `"Klee One", "YuKyokasho Yoko", "YuKyokasho", "UD Digi Kyokasho NK-R", "Hiragino Mincho ProN", serif`;

export const PRACTICE_CSS = `
  body { padding: 0; font-family: "Nunito", ${TEXTBOOK_FONT}; }
  ruby, .word { font-family: inherit; }
  .part { break-before: page; }
  .part:first-of-type { break-before: auto; }
  .print-brand-header { margin-bottom: 4px; }
  .block { break-inside: avoid; margin-bottom: 2.2mm; }
  h2 { font-size: 0.95rem; margin: 0 0 1.5mm; break-after: avoid; line-height: 1.35; }
  h2 .hint { font-family: "Nunito", sans-serif; font-size: 0.74rem; font-weight: 400; color: #555; margin-left: 2mm; }
  h3 { font-size: 0.85rem; margin: 6px 0 2px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; column-gap: 8mm; }
  .cols { display: flex; gap: 8mm; align-items: flex-start; }
  .cols > .block { flex: 1; min-width: 0; }
  .num { width: 7mm; flex: none; color: #555; font-size: 0.8rem; font-family: "Nunito", sans-serif; }
  .prompt { font-size: 14pt; flex: none; min-width: 16mm; white-space: nowrap; }
  .judge { display: flex; align-items: flex-end; gap: 3mm; min-height: 8.3mm; break-inside: avoid; }
  .judge .shown { font-size: 13pt; min-width: 38mm; white-space: nowrap; }
  .judge .marks { font-size: 12pt; color: #555; flex: none; white-space: nowrap; }
  .judge .line { flex: 1; border-bottom: 1.2px solid #333; height: 6.5mm; }
  .gap { display: flex; align-items: center; gap: 2mm; min-height: 9.2mm; break-inside: avoid; }
  .kbox {
    width: 7.8mm; height: 8.2mm; border: 1px solid #999; display: inline-flex; flex: none;
    align-items: center; justify-content: center; font-size: 12.5pt; margin-right: -1px;
  }
  .kbox.blank { border: 2px solid #000; position: relative; z-index: 1; }
  .write { display: flex; align-items: flex-end; gap: 3mm; min-height: 9.2mm; break-inside: avoid; }
  .write .line { flex: 1; border-bottom: 1.2px solid #333; height: 7mm; max-width: 55mm; }
  .write .suffix { font-size: 12.5pt; }
  .key { font-size: 0.85rem; line-height: 1.9; margin: 2px 0 8px; }
  .key b { font-weight: 600; }
  .empty { font-size: 0.85rem; color: #555; }
`;

export interface Section {
  html: string;
  key: { label: string; answer: string }[];
}

export interface PracticeWord {
  /** Trusted HTML. */
  promptHtml: string;
  word: string;
  reading: string;
}

const WRONG_SHARE = 0.5;
const TRAP_KANA = /[っうんゃゅょがぎぐげござじずぜぞだでどばびぶべぼ]/;

export function judgeSection(words: PracticeWord[], seed: number, right: string): Section {
  const rows = words.map((word, i) => {
    const wrong = readingDistractors(word.word, word.reading, seed + i, 1)[0];
    const showWrong = !!wrong && (hashSeed(`${seed}:judge:${i}`) % 100) / 100 < WRONG_SHARE;
    return { word, shown: showWrong ? wrong : word.reading, isRight: !showWrong };
  });
  // A page of only ✗ (or only ○) can be answered without reading it.
  if (rows.length > 1 && rows.every((row) => !row.isRight)) {
    rows[0] = { ...rows[0], shown: rows[0].word.reading, isRight: true };
  }
  return {
    html: rows
      .map(
        (row, i) => `<div class="judge">
  <span class="num">${i + 1}.</span>
  <span class="prompt">${row.word.promptHtml}</span>
  <span class="shown">${escapeHtml(row.shown)}</span>
  <span class="marks">○　×</span>
  <span class="line"></span>
</div>`,
      )
      .join('\n'),
    key: rows.map((row, i) => ({
      label: `${i + 1}.`,
      answer: row.isRight ? `○ ${right}` : `× → ${row.word.reading}`,
    })),
  };
}

export function gapIndex(reading: string, seed: number): number {
  const stem = [...splitReading(reading).stem];
  const traps = stem.flatMap((ch, i) => (TRAP_KANA.test(ch) ? [i] : []));
  const pool = traps.length > 0 ? traps : stem.map((_, i) => i);
  return pool[hashSeed(`${seed}:gap:${reading}`) % pool.length];
}

export function gapSection(words: PracticeWord[], seed: number): Section {
  const order = seededShuffle(words, seed);
  const items = order.map((word, i) => {
    const kana = [...word.reading];
    const gap = gapIndex(word.reading, seed + i);
    const boxes = kana
      .map((ch, at) =>
        at === gap
          ? '<span class="kbox blank"></span>'
          : `<span class="kbox">${escapeHtml(ch)}</span>`,
      )
      .join('');
    return {
      html: `<div class="gap"><span class="num">${i + 1}.</span><span class="prompt">${word.promptHtml}</span>${boxes}</div>`,
      answer: `${kana[gap]}（${word.reading}）`,
    };
  });
  return {
    html: `<div class="grid2">${items.map((item) => item.html).join('\n')}</div>`,
    key: items.map((item, i) => ({ label: `${i + 1}.`, answer: item.answer })),
  };
}

export function writeSection(words: PracticeWord[], seed: number): Section {
  const order = seededShuffle(words, seed);
  return {
    html: `<div class="grid2">${order
      .map(
        (word, i) => `<div class="write">
  <span class="num">${i + 1}.</span>
  <span class="prompt">${word.promptHtml}</span>
  <span class="line"></span>
  <span class="suffix">${escapeHtml(splitReading(word.reading).suffix)}</span>
</div>`,
      )
      .join('\n')}</div>`,
    key: order.map((word, i) => ({ label: `${i + 1}.`, answer: word.reading })),
  };
}

export function sectionHtml(heading: string, hint: string, body: string): string {
  return `<div class="block"><h2>${escapeHtml(heading)}<span class="hint">${escapeHtml(hint)}</span></h2>
${body}</div>`;
}

export function keyHtml(heading: string, key: Section['key']): string {
  const line = key
    .map((entry) => `${escapeHtml(entry.label)} <b>${escapeHtml(entry.answer)}</b>`)
    .join('　');
  return `<h3>${escapeHtml(heading)}</h3><p class="key">${line}</p>`;
}

export const MAX_CHECK_WORDS = 12;

function checkCards(cards: PlanCard[]): PlanCard[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (!isKanjiWord(card) || seen.has(card.word)) return false;
    seen.add(card.word);
    return true;
  });
}

export function hasReadingCheckContent(plan: LessonPlan): boolean {
  return printableDecks(plan).some((deck) => checkCards(deck.cards).length > 0);
}

export interface ReadingCheckLabels {
  title: string;
  name: string;
  date: string;
  judgeHeading: string;
  judgeHint: string;
  judgeRight: string;
  gapHeading: string;
  gapHint: string;
  writeHeading: string;
  writeHint: string;
  answerKey: string;
  empty: string;
}

export function buildReadingCheckHtml(args: {
  locale: string;
  plan: LessonPlan;
  labels: ReadingCheckLabels;
  seed: number;
  answerKey: boolean;
}): string {
  const { labels, seed } = args;
  const nameLine = `${labels.name}：＿＿＿＿＿＿　${labels.date}：＿＿＿＿`;
  const keys: string[] = [];

  const sheets = printableDecks(args.plan).flatMap((deck) => {
    const deckSeed = hashSeed(`${seed}:${deck.name}`);
    const words: PracticeWord[] = seededShuffle(checkCards(deck.cards), deckSeed)
      .slice(0, MAX_CHECK_WORDS)
      .map((card) => ({
        promptHtml: escapeHtml(card.word),
        word: card.word,
        reading: card.reading.trim(),
      }));
    if (words.length === 0) return [];

    const judge = judgeSection(words, deckSeed, labels.judgeRight);
    const gap = gapSection(words, deckSeed + 1);
    const write = writeSection(words, deckSeed + 2);
    const title = `${labels.title} — ${deck.name}`;

    keys.push(
      `<h2>${escapeHtml(deck.name)}</h2>`,
      keyHtml(labels.judgeHeading, judge.key),
      keyHtml(labels.gapHeading, gap.key),
      keyHtml(labels.writeHeading, write.key),
    );

    return [
      `<div class="part">
${brandHeaderHtml({ title, nameLine })}
${sectionHtml(labels.judgeHeading, labels.judgeHint, judge.html)}
${sectionHtml(labels.gapHeading, labels.gapHint, gap.html)}
${sectionHtml(labels.writeHeading, labels.writeHint, write.html)}
</div>`,
    ];
  });

  if (sheets.length > 0 && args.answerKey) {
    sheets.push(`<div class="part">
${brandHeaderHtml({ title: `${labels.title} — ${labels.answerKey}` })}
${keys.join('\n')}
</div>`);
  }

  const body =
    sheets.length > 0
      ? sheets.join('\n')
      : `<div class="part">${brandHeaderHtml({ title: labels.title })}<p class="empty">${escapeHtml(labels.empty)}</p></div>`;

  return printDocumentHtml({
    title: labels.title,
    locale: args.locale,
    css: PRACTICE_CSS,
    body,
    header: false,
  });
}
