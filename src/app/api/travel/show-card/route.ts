import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireAuth } from '../../_lib/requireAuth';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

const ShowCardSchema = z.object({
  message: z.string().min(3).max(300),
  displayMode: z.enum(['hiragana', 'romaji', 'kanji']).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ShowCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const { message, displayMode } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const furiganaRule =
    displayMode === 'hiragana'
      ? '\nIMPORTANT: For the "japanese" field, use {kanji|reading} syntax for EVERY kanji character to provide furigana. Example: "{助|たす}けてください". Pure hiragana/katakana needs no markup.'
      : '';

  const prompt = `Create a bilingual "show card" for a tourist in Japan to display on their phone. Tourist wants to communicate: "${message}"
Japanese: natural, polite (です/ます), concise. Include romaji, situation note, emoji icon, and category.${furiganaRule}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            response_schema: {
              type: 'object',
              properties: {
                english: { type: 'string' },
                japanese: { type: 'string' },
                romaji: { type: 'string' },
                situation: { type: 'string' },
                icon: { type: 'string' },
                category: {
                  type: 'string',
                  enum: [
                    'allergies',
                    'directions',
                    'help',
                    'preferences',
                    'medical',
                    'communication',
                    'custom',
                  ],
                },
              },
              required: ['english', 'japanese', 'romaji', 'situation', 'icon', 'category'],
            },
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Gemini API error', {
        route: '/api/travel/show-card',
        status: response.status,
        body: data,
      });
      return NextResponse.json(data, { status: response.status });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    return NextResponse.json(JSON.parse(rawText));
  } catch (err) {
    logger.error('Unhandled error', {
      route: '/api/travel/show-card',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
