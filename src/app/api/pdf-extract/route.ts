import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import type { GeneratedCard } from '@/types/flashcard';

import { rateLimit } from '../_lib/rateLimit';
import { requireOrganizerAccount } from '../_lib/requireOrganizerAccount';

const RATE_LIMIT = { windowMs: 60_000, max: 3 };

const PdfExtractSchema = z.object({
  // ~10 MB PDF fits comfortably within 13.3 MB of base64
  pdfBase64: z
    .string()
    .min(1, 'pdfBase64 is required')
    .max(14_000_000, 'PDF too large — max 10 MB'),
});

function stripPeriods(s: string) {
  return s.replace(/\./g, '');
}

const EXTRACT_PROMPT = `Japanese language teacher. Extract all vocabulary entries from this PDF and generate complete flashcard data for each one.
For each vocabulary word or phrase found, return a JSON object with:
- "word": the Japanese word/phrase (in kana or kanji)
- "reading": kana pronunciation (empty string if already kana)
- "meaning": English meanings — include all common meanings separated by ", " (e.g. "front, surface, outside" for 表). List the most common meaning first, no periods
- "image_query": 2-4 word English noun phrase for Unsplash (concrete, photographic, child-friendly). Verbs→scene (食べる="child eating noodles"), abstracts→closest visual (楽しい="children laughing"). For phrases, pick the most concrete noun.
- "example_jp": simple sentence for a young learner using the word naturally. Wrap every kanji (or kanji compound) with its hiragana reading using {kanji|reading} format. Example: {猫|ねこ}が{好|す}きです。 Pure kana words need no wrapping.
- "example_en": English translation of the example sentence, no trailing period.
- "card_type": "word" for single vocabulary words, "phrase" for multi-word expressions or full phrases.
- "jlpt_level": JLPT level this word/phrase belongs to ("N5", "N4", "N3", "N2", "N1"), or null if not in any JLPT list.

Skip section headers and meta-content. Focus only on actual vocabulary words and phrases a student would need to memorize. Do not include periods in any field.`;

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PdfExtractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 },
    );
  }
  const { pdfBase64 } = parsed.data;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: 'application/pdf',
                    data: pdfBase64,
                  },
                },
                { text: EXTRACT_PROMPT },
              ],
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
        route: '/api/pdf-extract',
        status: response.status,
        body: data,
      });
      return NextResponse.json(
        { error: data.error?.message ?? 'Gemini API error' },
        { status: response.status },
      );
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const cards: GeneratedCard[] = JSON.parse(rawText);
    const cleaned = cards.map((c) => ({
      ...c,
      word: stripPeriods(c.word),
      reading: stripPeriods(c.reading),
      meaning: stripPeriods(c.meaning),
      example_en: stripPeriods(c.example_en),
    }));

    return NextResponse.json(cleaned);
  } catch (err) {
    logger.error('Unhandled error', {
      route: '/api/pdf-extract',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
