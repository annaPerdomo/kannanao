import type { LessonPlan } from '@/types/lessonPlan';

import { escapeHtml } from './lessonPrintable';
import { brandHeaderHtml, printDocumentHtml } from './printBrand';
import { frontHtml, frontText, printableDecks, safeImageUrl } from './printPlan';

export interface FlashcardSheetLabels {
  title: string;
  fold: string;
}

export interface FlashcardSheetOptions {
  furigana: boolean;
  pictures: boolean;
}

const FLASHCARDS_CSS = `
  body { padding: 0; }
  .sheet { break-before: page; }
  .sheet:first-of-type { break-before: auto; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .card { display: flex; border: 1px dashed #888; border-radius: 0; height: 34mm; break-inside: avoid; }
  .half { flex: 1 1 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3mm; text-align: center; overflow: hidden; }
  .jp { position: relative; }
  .jp .word { font-size: 20pt; line-height: 1.2; }
  .jp .word.long { font-size: 15pt; }
  .jp .word ruby rt { font-size: 0.4em; }
  .meaning-half { position: relative; border-left: 1px dotted #aaa; }
  .meaning { font-size: 12pt; color: #1a1a1a; }
  .fold { position: absolute; top: 1mm; left: 2mm; font-size: 6pt; color: #aaa; }
  .meaning-half img { max-height: 18mm; max-width: 100%; object-fit: contain; margin-bottom: 2mm; }
`;

function cardHtml(
  deck: LessonPlan['decks'][number],
  card: LessonPlan['decks'][number]['cards'][number],
  labels: FlashcardSheetLabels,
  options: FlashcardSheetOptions,
): string {
  const front = frontHtml(deck, card, options.furigana);
  const long = frontText(deck, card).length > 6;
  const imageUrl = options.pictures ? safeImageUrl(card.imageUrl) : null;
  const image = imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="">` : '';

  return `<div class="card">
  <div class="half jp"><div class="word${long ? ' long' : ''}">${front}</div></div>
  <div class="half meaning-half"><div class="fold">${escapeHtml(labels.fold)}</div>${image}<div class="meaning">${escapeHtml(card.meaning)}</div></div>
</div>`;
}

export function buildFlashcardSheetHtml(args: {
  locale: string;
  plan: LessonPlan;
  labels: FlashcardSheetLabels;
  options: FlashcardSheetOptions;
}): string {
  const { locale, plan, labels, options } = args;
  const decks = printableDecks(plan);

  const sheets = decks.map((deck) => {
    const cardsHtml = deck.cards.map((card) => cardHtml(deck, card, labels, options)).join('\n');
    return `<div class="sheet">
${brandHeaderHtml({ title: `${deck.emoji} ${deck.name}`.trim(), subtitle: labels.title })}
<div class="grid">${cardsHtml}</div>
</div>`;
  });

  const body =
    sheets.length > 0
      ? sheets.join('\n')
      : `<div class="sheet">${brandHeaderHtml({ title: labels.title })}</div>`;

  return printDocumentHtml({
    title: labels.title,
    locale,
    css: FLASHCARDS_CSS,
    body,
    header: false,
  });
}
