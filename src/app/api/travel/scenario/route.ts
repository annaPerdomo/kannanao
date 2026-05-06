import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireAuth } from '../../_lib/requireAuth';

const RATE_LIMIT = { windowMs: 60_000, max: 15 };

const ScenarioSchema = z.object({
  category: z.enum([
    'restaurant',
    'convenience_store',
    'train',
    'hotel',
    'shopping',
    'emergency',
    'greeting',
    'taxi',
  ]),
  setting: z.string().max(500).optional(),
  /** What the user wants to say/do in English (free text input) */
  userIntent: z.string().max(300).optional(),
  displayMode: z.enum(['hiragana', 'romaji', 'kanji']).optional(),
  history: z
    .array(
      z.object({
        npcJapanese: z.string(),
        npcEnglish: z.string(),
        userIntent: z.string(),
        userJapanese: z.string(),
      }),
    )
    .max(10)
    .default([]),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ScenarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const { category, setting, userIntent, displayMode, history } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const categoryDescriptions: Record<string, string> = {
    restaurant: 'ordering food at a Japanese restaurant (izakaya, ramen shop, or sushi bar)',
    convenience_store: 'buying items at a Japanese konbini (7-Eleven, Lawson, FamilyMart)',
    train: 'navigating the Japanese train/subway system (buying tickets, asking platforms)',
    hotel: 'checking in/out of a Japanese hotel or ryokan',
    shopping: 'shopping at Japanese stores (clothing, souvenirs, electronics)',
    emergency: 'an emergency situation in Japan (lost, medical, police)',
    greeting: 'meeting someone or casual social interaction in Japan',
    taxi: 'taking a taxi in Japan',
  };

  const historyContext =
    history.length > 0
      ? `\nHistory:\n${history.map((h) => `NPC:"${h.npcJapanese}"(${h.npcEnglish}) User:"${h.userJapanese}"`).join('\n')}`
      : '';

  const userIntentContext = userIntent
    ? `\nUser wants to say: "${userIntent}"\nGive bestPhrase (polite Japanese), romaji, English, brief explanation, and a simpler alternative. Then NPC responds.`
    : '\nSTART: NPC initiates (greet/ask).';

  const furiganaRule =
    displayMode === 'hiragana'
      ? '\nIMPORTANT: For ALL Japanese text fields (npcJapanese, bestPhrase, alternative), use {kanji|reading} syntax for EVERY kanji to provide furigana. Example: "{助|たす}けて" or "お{会計|かいけい}". Pure hiragana/katakana needs no markup.'
      : '';

  const prompt = `Japanese conversation coach for a zero-Japanese tourist. Scenario: ${categoryDescriptions[category] || category}${setting ? `. Setting: ${setting}` : ''}${historyContext}${userIntentContext}
Rules: short realistic phrases, desu-masu form, practical cultural tips only, 2-3 suggestedResponses in English, set isEnding:true after 5-6 turns.${furiganaRule}`;

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
                bestPhrase: { type: 'string' },
                bestPhraseRomaji: { type: 'string' },
                bestPhraseEnglish: { type: 'string' },
                explanation: { type: 'string' },
                alternative: { type: 'string' },
                alternativeRomaji: { type: 'string' },
                alternativeExplanation: { type: 'string' },
                npcJapanese: { type: 'string' },
                npcRomaji: { type: 'string' },
                npcEnglish: { type: 'string' },
                context: { type: 'string' },
                culturalTip: { type: 'string' },
                suggestedResponses: {
                  type: 'array',
                  items: { type: 'string' },
                },
                isEnding: { type: 'boolean' },
              },
              required: [
                'npcJapanese',
                'npcRomaji',
                'npcEnglish',
                'context',
                'suggestedResponses',
                'isEnding',
              ],
            },
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      logger.error('Gemini API error', {
        route: '/api/travel/scenario',
        status: response.status,
        body: data,
      });
      return NextResponse.json(data, { status: response.status });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    return NextResponse.json(JSON.parse(rawText));
  } catch (err) {
    logger.error('Unhandled error', {
      route: '/api/travel/scenario',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
