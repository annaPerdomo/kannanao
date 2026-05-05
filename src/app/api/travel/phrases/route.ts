import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

const PhraseSchema = z.object({
  situation: z.enum([
    'greetings',
    'restaurant',
    'shopping',
    'transport',
    'hotel',
    'emergency',
    'polite',
    'numbers',
    'directions',
  ]),
  specificContext: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = PhraseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const { situation, specificContext } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const situationDescriptions: Record<string, string> = {
    greetings: 'Basic greetings, thank you, excuse me, sorry — the everyday essentials',
    restaurant:
      'Ordering food, asking for the menu/check, dietary restrictions, complimenting food',
    shopping: 'Asking prices, saying "just looking", asking for sizes, paying',
    transport: 'Buying tickets, asking which platform, asking if this is the right train/bus',
    hotel: 'Checking in/out, asking for amenities, room requests',
    emergency: 'Getting help, saying you\'re lost, medical needs, "I don\'t understand"',
    polite:
      'Polite expressions that make Japanese people smile — showing effort and cultural awareness',
    numbers: 'Counting, prices, time, dates — the number system basics',
    directions: 'Asking where things are, understanding basic directions, landmarks',
  };

  const prompt = `Generate 8 survival phrases for a zero-Japanese tourist in Japan. Category: ${situationDescriptions[situation]}${specificContext ? `. Focus: ${specificContext}` : ''}
Rules: sort by difficulty (1=simple,2=medium,3=longer), include phrases they'll HEAR + their responses, practical not textbook, romaji with hyphens for long words. Include breakdown (word-by-word), whenToUse (one specific scenario), culturalNote (only if important).`;

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
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  japanese: { type: 'string' },
                  romaji: { type: 'string' },
                  english: { type: 'string' },
                  breakdown: { type: 'string' },
                  whenToUse: { type: 'string' },
                  culturalNote: { type: 'string' },
                  formality: { type: 'string', enum: ['casual', 'polite', 'very_polite'] },
                  difficulty: { type: 'integer' },
                },
                required: [
                  'japanese',
                  'romaji',
                  'english',
                  'breakdown',
                  'whenToUse',
                  'formality',
                  'difficulty',
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
        route: '/api/travel/phrases',
        status: response.status,
        body: data,
      });
      return NextResponse.json(data, { status: response.status });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    return NextResponse.json(JSON.parse(rawText));
  } catch (err) {
    logger.error('Unhandled error', {
      route: '/api/travel/phrases',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
