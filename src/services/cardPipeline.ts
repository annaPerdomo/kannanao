import { furiganaToKana, normalizeFurigana, stripFurigana } from '@/lib/furigana';
import type { Flashcard, GeneratedCard, MainViewMode } from '@/types/flashcard';

import { encodeUnsplashUrl, fetchImagesBatch, generateFlashcards, IMAGE_BATCH_SIZE } from './api';

/**
 * A card that is ready to be inserted, but has no database identity yet.
 * Every card-creation path in the app (type-a-word, PDF import, Travel save)
 * funnels through this shape so a card looks the same whichever door it came
 * through.
 */
export type NewCard = Omit<Flashcard, 'id' | 'position'>;

/**
 * A card the reviewer can still swap: `reusedFrom` names the deck the saved
 * copy came from and `alternate` holds the version that isn't showing. None of
 * the three are columns — dbInsertCards maps its columns explicitly, so they
 * are dropped on the way into the database.
 */
export interface ReusableCard extends NewCard {
  reusedFrom?: string;
  alternate?: NewCard;
  showingFresh?: boolean;
}

/**
 * Trade a row for its other version. The card being replaced becomes the new
 * alternate, so this is an involution — swap twice and you are exactly back
 * where you started, however many times the reviewer changes their mind.
 */
export function swapReusedVersion<
  T extends { reusedFrom?: string; alternate?: object; showingFresh?: boolean },
>(card: T): T {
  if (!card.alternate) return card;
  const { reusedFrom, alternate, showingFresh, ...current } = card;
  // The two versions hold the same fields, so the result is still a T — the
  // compiler can't see that through the spread of an unknown-shaped alternate.
  return {
    ...alternate,
    reusedFrom,
    alternate: current,
    showingFresh: !showingFresh,
  } as T;
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
    // A match in the deck being added to isn't a reuse — offering to "reuse"
    // a card from this same deck reads as nonsense and confirming it inserts a
    // duplicate alongside the original.
    if (!match || match.card.deckId === deckId) {
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
      showingFresh: false,
      alternate: {
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
 * One batch per IMAGE_BATCH_SIZE distinct queries, not one request per card:
 * a topic expansion can ask for 60 cards, and 60 parallel single-photo requests
 * spend the images route's per-minute budget on the first 20 and leave the rest
 * bare with nothing to show for it.
 */
async function fetchPhotos(queries: string[]): Promise<Map<string, string>> {
  const distinct = [...new Set(queries.filter(Boolean))];
  const urls = new Map<string, string>();

  for (let i = 0; i < distinct.length; i += IMAGE_BATCH_SIZE) {
    const chunk = distinct.slice(i, i + IMAGE_BATCH_SIZE);
    let batch;
    try {
      batch = await fetchImagesBatch(chunk.map((query) => ({ query })));
    } catch {
      // Rate limited, offline, or not entitled — a card without a picture is
      // still a card, and the deck's picture picker can fill it in later.
      break;
    }
    for (const { query, result } of batch.results) {
      if (result) urls.set(query, encodeUnsplashUrl(result));
    }
    if (batch.rateLimited || batch.stopped) break;
  }

  return urls;
}

/**
 * Fetch an Unsplash photo for each generated card and map the API's snake_case
 * fields onto the app's card shape. This is the step that used to be duplicated
 * (and quietly skipped) per entry point. The batch route triggers each photo's
 * download ping itself, so callers must not ping again.
 */
export async function withImages(
  generated: GeneratedCard[],
  deckId: string,
  mainViewMode: MainViewMode,
): Promise<NewCard[]> {
  const queries = generated.map((card) => card.image_query?.trim() ?? '');
  const photos = await fetchPhotos(queries);

  return generated.map((card, i) => ({
    word: card.word,
    reading: card.reading ?? '',
    romaji: card.romaji?.trim() ?? '',
    meaning: card.meaning ?? '',
    image_query: queries[i],
    // Canonical markup on the way in: Gemini's per-character variant
    // (`{無関係|む|かん|けい}`) is understood by the readers but confuses
    // anyone hand-editing the sentence in the card editor.
    example_jp: normalizeFurigana(card.example_jp ?? ''),
    example_en: card.example_en ?? '',
    imageUrl: photos.get(queries[i]),
    deckId,
    mainViewMode,
    cardType: card.card_type ?? 'word',
    jlptLevel: card.jlpt_level ?? undefined,
  }));
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

  const generated = phrases.map((phrase, i) => {
    const card = aligned[i];
    if (!card) return undefined;
    return {
      ...card,
      // Both of these are what the traveller just read on screen; the model's
      // own wording would be a surprise on the saved card.
      meaning: phrase.english || card.meaning,
      romaji: phrase.romaji || card.romaji,
    };
  });

  // One withImages call for the whole save, not one per phrase: each call is a
  // batch request, and the images route allows only a few of those a minute.
  const built = await withImages(
    generated.filter((c) => c !== undefined),
    deckId,
    mainViewMode,
  );

  let next = 0;
  return phrases.map((_, i) => (generated[i] ? (built[next++] ?? fallback[i]) : fallback[i]));
}
