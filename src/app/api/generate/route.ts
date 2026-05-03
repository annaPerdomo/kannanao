import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';

import { rateLimit } from '../_lib/rateLimit';
import { requireOrganizerAccount } from '../_lib/requireOrganizerAccount';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

const GenerateSchema = z.object({
  pendingWords: z
    .array(z.string().min(1).max(200))
    .min(1, 'No words provided')
    .max(50, 'Too many words — max 50 per request'),
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
  const { pendingWords } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const prompt = `Japanese language teacher. Create exactly one card per item for: ${pendingWords.join(', ')}.
- card_type: "word" for single vocabulary words, "phrase" for multi-word expressions or full phrases.
- reading: kana pronunciation (empty if already kana)
- image_query: 2-4 word English noun phrase for Unsplash (concrete, photographic, child-friendly). Verbs→scene (食べる="child eating noodles"), abstracts→closest visual (楽しい="children laughing"). For phrases, pick the most concrete noun in the phrase.
- example_jp: simple sentence for a young learner using the word naturally. Wrap every kanji (or kanji compound) with its hiragana reading using {kanji|reading} format. Example: {猫|ねこ}が{好|す}きです。 Pure kana words need no wrapping.
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
    return NextResponse.json(JSON.parse(rawText));
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
