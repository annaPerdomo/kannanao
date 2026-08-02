import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { normalizeFuriganaDeep } from '@/lib/furigana';
import { logger } from '@/lib/logger';

import { rateLimit } from '../_lib/rateLimit';
import { requireOrganizerAccount } from '../_lib/requireOrganizerAccount';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

/**
 * Ceiling on cards returned when topics are expanded. Five broad topics could
 * otherwise run to hundreds of cards in one response — past what the model will
 * emit before truncating its JSON, and far past what anyone reviews in a sitting.
 */
const MAX_EXPANDED_CARDS = 60;

const GenerateSchema = z.object({
  pendingWords: z
    .array(z.string().min(1).max(200))
    .min(1, 'No words provided')
    .max(50, 'Too many words — max 50 per request'),
  // Off by default: Travel enrichment pairs generated cards back to the phrases
  // it asked about by position, so it needs the strict one-card-per-item
  // contract. Only the card-authoring UI opts in.
  expandTopics: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const body = await req.json().catch(() => null);
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }
  const { pendingWords, expandTopics } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const scope = expandTopics
      ? `Japanese language teacher. Make cards for: ${pendingWords.join(', ')}.
Each item is either one word/phrase, or a topic naming a group of words.
- A word or phrase ("猫", "ごちそうさま") gets exactly one card.
- A topic ("days of the week", "months", "colors", "family members") gets one card per member of the group.
- Closed groups come back complete and in conventional order: 7 days, 12 months, 4 seasons, 10 for numbers 1-10.
- Open-ended topics ("food", "animals", "verbs") get the 12 most useful for a beginner, JLPT N5 and N4 first.
- When an item reads as both — "family" could be the word 家族 or the group of family members — prefer the single word. A plural or a phrase like "kinds of X" means the group.
- Return at most ${MAX_EXPANDED_CARDS} cards in total across every item.`
      : `Japanese language teacher. Create exactly one card per item for: ${pendingWords.join(', ')}.`;

    const prompt = `${scope}
- card_type: "word" for single vocabulary words, "phrase" for multi-word expressions or full phrases.
- reading: kana pronunciation (empty if already kana)
- romaji: Hepburn romaji with a SPACE between every word, e.g. "yoroshiku onegaishimasu" not "yoroshikuonegaishimasu". Punctuation keeps a space after it.
- image_query: 2-4 word English noun phrase for Unsplash (concrete, photographic, child-friendly). Verbs→scene (食べる="child eating noodles"), abstracts→closest visual (楽しい="children laughing"). For phrases, pick the most concrete noun in the phrase.
- example_jp: simple sentence for a young learner using the word naturally. Wrap every kanji (or kanji compound) with its hiragana reading using {kanji|reading} format. Example: {猫|ねこ}が{好|す}きです。 Each group holds exactly one reading — never split a compound's reading with extra pipes ({無関係|むかんけい} or {無|む}{関|かん}{係|けい}, never {無関係|む|かん|けい}). Pure kana words need no wrapping.
- example_en: English translation of the example sentence.
- jlpt_level: JLPT level this word/phrase belongs to ("N5", "N4", "N3", "N2", "N1"), or null if not in any JLPT list.
If a word has multiple meanings or translations, include all common ones separated by ", " (e.g. "front, surface, outside" for 表). Always list the most common meaning first.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            response_schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  word: { type: 'string' },
                  reading: { type: 'string' },
                  romaji: { type: 'string' },
                  meaning: { type: 'string' },
                  image_query: { type: 'string' },
                  example_jp: { type: 'string' },
                  example_en: { type: 'string' },
                  card_type: { type: 'string', enum: ['word', 'phrase'] },
                  jlpt_level: {
                    type: 'string',
                    enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
                    nullable: true,
                  },
                },
                required: [
                  'word',
                  'reading',
                  'romaji',
                  'meaning',
                  'image_query',
                  'example_jp',
                  'example_en',
                  'card_type',
                  'jlpt_level',
                ],
              },
            },
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Gemini API error', {
        route: '/api/generate',
        status: response.status,
        body: data,
      });
      return NextResponse.json(data, { status: response.status });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const cards = normalizeFuriganaDeep(JSON.parse(rawText));
    // Backstop for the prompt's own limit. Without expansion the input cap
    // already bounds this, so only trim when the model was free to expand.
    if (expandTopics && Array.isArray(cards) && cards.length > MAX_EXPANDED_CARDS) {
      logger.info('Trimmed expanded generation', {
        route: '/api/generate',
        returned: cards.length,
        kept: MAX_EXPANDED_CARDS,
      });
      return NextResponse.json(cards.slice(0, MAX_EXPANDED_CARDS));
    }
    return NextResponse.json(cards);
  } catch (err) {
    logger.error('Unhandled error', {
      route: '/api/generate',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
