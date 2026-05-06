import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireAuth } from '../../_lib/requireAuth';

const RATE_LIMIT = { windowMs: 60_000, max: 8 };

const DailySchema = z.object({
  plans: z.string().min(5).max(500),
  displayMode: z.enum(['hiragana', 'romaji', 'kanji']).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = DailySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const { plans, displayMode } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const furiganaRule =
    displayMode === 'hiragana'
      ? '\nIMPORTANT: For the "japanese" field, use {kanji|reading} syntax for EVERY kanji character to provide furigana. Example: "{助|たす}けてください" or "お{会計|かいけい}お{願|ねが}いします". Pure hiragana/katakana needs no markup.'
      : '';

  const prompt = `Generate 6 Japanese phrases a zero-Japanese tourist will need TODAY based on their plans: "${plans}"
Rules: practical phrases they'll actually use/hear, include romaji, sort by when they'll need them chronologically, mix of things to SAY and things they'll HEAR. Include a brief "when" note for each.${furiganaRule}`;

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
                phrases: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      japanese: { type: 'string' },
                      romaji: { type: 'string' },
                      english: { type: 'string' },
                      when: { type: 'string' },
                      type: { type: 'string', enum: ['say', 'hear'] },
                    },
                    required: ['japanese', 'romaji', 'english', 'when', 'type'],
                  },
                },
                dayTip: { type: 'string' },
              },
              required: ['phrases', 'dayTip'],
            },
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Gemini API error', {
        route: '/api/travel/daily',
        status: response.status,
        body: data,
      });
      return NextResponse.json(data, { status: response.status });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    return NextResponse.json(JSON.parse(rawText));
  } catch (err) {
    logger.error('Unhandled error', {
      route: '/api/travel/daily',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
