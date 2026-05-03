import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';

import { rateLimit } from '../_lib/rateLimit';
import { requireOrganizerAccount } from '../_lib/requireOrganizerAccount';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

const FuriganaSchema = z.object({
  lines: z
    .array(z.string().min(1).max(2000))
    .min(1, 'No lines provided')
    .max(200, 'Too many lines — max 200 per request'),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const body = await req.json().catch(() => null);
  const parsed = FuriganaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }
  const { lines } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const prompt = `You are a Japanese language expert helping a child learn to read Japanese.

For each line of Japanese text below, do two things in one pass:
1. Rewrite it using natural kanji where a native Japanese speaker would write them (e.g. わたし→私, はは→母, にほんご→日本語, たべます→食べます)
2. Wrap every kanji or kanji compound immediately with its hiragana reading using {kanji|reading} format

Critical formatting rules:
- Only wrap the kanji characters, not the surrounding hiragana: {食|た}べます ✓  {食べます|たべます} ✗
- Katakana words and foreign names (マロリー, ダニエル, ラーメン) stay as katakana, no markup
- Japanese names in kanji still get furigana: {三浦|みうら}{直美|なおみ}
- Hiragana grammatical particles and endings (は, の, と, です, etc.) stay as hiragana, no markup
- Preserve all punctuation and spacing exactly
- Output exactly one formatted string per input line, same order, no numbering, no explanation

Input lines:
${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}`;

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
                lines: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['lines'],
            },
          },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      logger.error('Gemini API error', {
        route: '/api/furigana',
        status: response.status,
        body: data,
      });
      return NextResponse.json(data, { status: response.status });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"lines":[]}';
    return NextResponse.json(JSON.parse(rawText));
  } catch (err) {
    logger.error('Unhandled error', {
      route: '/api/furigana',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
