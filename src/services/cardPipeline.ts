import { furiganaToKana, normalizeFurigana, stripFurigana } from '@/lib/furigana';
import type { Flashcard, GeneratedCard, MainViewMode } from '@/types/flashcard';

import { encodeUnsplashUrl, fetchImage, generateFlashcards, triggerUnsplashDownload } from './api';

/**
 * A card that is ready to be inserted, but has no database identity yet.
 * Every card-creation path in the app (type-a-word, PDF import, Travel save)
 * funnels through this shape so a card looks the same whichever door it came
 * through.
 */
export type NewCard = Omit<Flashcard, 'id' | 'position'>;

/**
 * A card the reviewer can still swap: `reusedFrom` names the deck the saved
 * copy came from, and `freshVersion` holds what the model just wrote, so
 * "use the new one instead" costs nothing but an image fetch. Neither field is
 * a column — dbInsertCards maps its columns explicitly, so both are dropped on
 * the way into the database.
 */
export interface ReusableCard extends NewCard {
  reusedFrom?: string;
  freshVersion?: NewCard;
}

/**
 * Swap in the user's own saved card for any word they already have. Their copy
 * keeps the artwork they chose and the sentence they corrected, and — because
 * this runs before withImages — a reused word never spends an Unsplash call.
 */
export function applyReuse(
  generated: GeneratedCard[],
  existing: Map<string, { card: Flashcard; deckName: string }>,
  deckId: string,
  mainViewMode: MainViewMode,
): { reused: (ReusableCard | null)[]; toFetch: GeneratedCard[] } {
  const reused: (ReusableCard | null)[] = [];
  const toFetch: GeneratedCard[] = [];

  for (const card of generated) {
    const match = existing.get(card.word);
    if (!match) {
      reused.push(null);
      toFetch.push(card);
      continue;
    }
    const { id: _id, position: _position, ...saved } = match.card;
    reused.push({
      ...saved,
      deckId,
      mainViewMode,
      reusedFrom: match.deckName,
      freshVersion: {
        word: card.word,
        reading: card.reading ?? '',
        romaji: card.romaji?.trim() ?? '',
        meaning: card.meaning ?? '',
        image_query: card.image_query?.trim() ?? '',
        example_jp: normalizeFurigana(card.example_jp ?? ''),
        example_en: card.example_en ?? '',
        deckId,
        mainViewMode,
        cardType: card.card_type ?? 'word',
        jlptLevel: card.jlpt_level ?? undefined,
      },
    });
  }

  return { reused, toFetch };
}

/** Gemini caps out at 50 items per generate request. */
const GENERATE_CHUNK = 50;

/** Hiragana, katakana, halfwidth katakana, and the punctuation a phrase may contain. */
const KANA_ONLY = /^[぀-ゟ゠-ヿｦ-ﾟ\s、。，．！？!?・…〜~]*$/;

/**
 * Turn `お{会計|かいけい}お{願|ねが}いします` into `おかいけいおねがいします`.
 * Returns '' when the text still holds kanji after the markup is resolved —
 * `reading` means "kana pronunciation" everywhere else in the app, and a half
 * kana / half kanji string would break furigana display and typed answers.
 */
export function readingFromFurigana(japanese: string): string {
  const kana = furiganaToKana(japanese);
  return KANA_ONLY.test(kana) ? kana : '';
}

/**
 * Fetch an Unsplash photo for each generated card and map the API's snake_case
 * fields onto the app's card shape. This is the step that used to be duplicated
 * (and quietly skipped) per entry point.
 */
export async function withImages(
  generated: GeneratedCard[],
  deckId: string,
  mainViewMode: MainViewMode,
): Promise<NewCard[]> {
  return Promise.all(
    generated.map(async (card) => {
      const query = card.image_query?.trim() ?? '';
      // An empty query is a guaranteed 400 from /api/images — don't spend the call.
      const result = query ? await fetchImage(query).catch(() => null) : null;
      if (result) triggerUnsplashDownload(result.downloadLocation);

      return {
        word: card.word,
        reading: card.reading ?? '',
        romaji: card.romaji?.trim() ?? '',
        meaning: card.meaning ?? '',
        image_query: query,
        // Canonical markup on the way in: Gemini's per-character variant
        // (`{無関係|む|かん|けい}`) is understood by the readers but confuses
        // anyone hand-editing the sentence in the card editor.
        example_jp: normalizeFurigana(card.example_jp ?? ''),
        example_en: card.example_en ?? '',
        imageUrl: result ? encodeUnsplashUrl(result) : undefined,
        deckId,
        mainViewMode,
        cardType: card.card_type ?? 'word',
        jlptLevel: card.jlpt_level ?? undefined,
      };
    }),
  );
}

/**
 * Line generated cards back up with the words that were asked for. Gemini is
 * told to return exactly one card per item, so the common case is a positional
 * match; when the count differs we fall back to matching on the word itself and
 * leave a hole for anything that never came back.
 */
export function alignGenerated(
  words: string[],
  generated: GeneratedCard[],
): (GeneratedCard | undefined)[] {
  if (generated.length === words.length) return generated;

  const byWord = new Map<string, GeneratedCard>();
  for (const card of generated) {
    if (!byWord.has(card.word)) byWord.set(card.word, card);
  }
  return words.map((word) => byWord.get(word));
}

/** Generate in 50-item batches so a large import doesn't get rejected wholesale. */
async function generateAll(words: string[]): Promise<GeneratedCard[]> {
  const out: GeneratedCard[] = [];
  for (let i = 0; i < words.length; i += GENERATE_CHUNK) {
    const batch = await generateFlashcards({ pendingWords: words.slice(i, i + GENERATE_CHUNK) });
    out.push(...batch);
  }
  return out;
}

export interface TravelPhrase {
  japanese: string;
  romaji: string;
  english: string;
}

/**
 * The best card we can build from a travel phrase without calling out to Gemini.
 * Used for member accounts (who have no access to the paid routes) and whenever
 * enrichment fails, so a save always produces a usable card instead of failing.
 */
function localTravelCard(
  phrase: TravelPhrase,
  deckId: string,
  mainViewMode: MainViewMode,
): NewCard {
  return {
    word: stripFurigana(phrase.japanese),
    // Kana, not romaji — romaji in `reading` broke furigana, hiragana view, and
    // every typed-answer check. Romaji lives in its own field.
    reading: readingFromFurigana(phrase.japanese),
    romaji: phrase.romaji,
    meaning: phrase.english,
    image_query: '',
    // The phrase is its own example, so Fill and Recall have something to show.
    example_jp: phrase.japanese,
    example_en: phrase.english,
    deckId,
    mainViewMode,
    cardType: 'phrase',
  };
}

/**
 * Build full flashcards from Travel-mode phrases: same generation and imagery
 * as typing the word into the card generator, with the traveller's own English
 * gloss kept as the meaning (it's the wording they just read on screen).
 */
export async function buildTravelCards(
  phrases: TravelPhrase[],
  deckId: string,
  { mainViewMode, enrich }: { mainViewMode: MainViewMode; enrich: boolean },
): Promise<NewCard[]> {
  const fallback = phrases.map((p) => localTravelCard(p, deckId, mainViewMode));
  if (!enrich || phrases.length === 0) return fallback;

  const words = phrases.map((p) => stripFurigana(p.japanese));

  let aligned: (GeneratedCard | undefined)[];
  try {
    aligned = alignGenerated(words, await generateAll(words));
  } catch {
    // Rate limited, offline, or not entitled — a partial card beats no card.
    return fallback;
  }

  return Promise.all(
    phrases.map(async (phrase, i) => {
      const card = aligned[i];
      if (!card) return fallback[i];
      const [enriched] = await withImages(
        [
          {
            ...card,
            // Both of these are what the traveller just read on screen; the
            // model's own wording would be a surprise on the saved card.
            meaning: phrase.english || card.meaning,
            romaji: phrase.romaji || card.romaji,
          },
        ],
        deckId,
        mainViewMode,
      );
      return enriched ?? fallback[i];
    }),
  );
}
