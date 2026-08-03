import { type NextRequest, NextResponse } from 'next/server';

import { normalizeFurigana } from '@/lib/furigana';
import { buildLessonPlanPrompt } from '@/lib/lessonPrompts';
import { logger } from '@/lib/logger';
import type { LessonPlan } from '@/types/lessonPlan';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { consumeLessonBudget } from '../_lib/lessonBudget';
import { isMemberOfOrganizer } from '../_lib/memberAccess';
import { loadStudiedVocabulary } from '../_lib/studiedVocabulary';

const RATE_LIMIT = { windowMs: 60_000, max: 3 };

const GOAL_MIN = 3;
const GOAL_MAX = 500;
const WEEKS_MIN = 1;
const WEEKS_MAX = 8;
const CARDS_MIN = 5;
const CARDS_MAX = 20;
const CARDS_DEFAULT = 12;

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

const PLAN_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    decks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          emoji: { type: 'string' },
          mainViewMode: { type: 'string', enum: ['hiragana', 'kanji', 'romaji'] },
          cards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                word: { type: 'string' },
                reading: { type: 'string' },
                meaning: { type: 'string' },
                exampleJp: { type: 'string' },
                exampleEn: { type: 'string' },
                jlptLevel: {
                  type: 'string',
                  enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
                  nullable: true,
                },
              },
              required: ['word', 'reading', 'meaning', 'exampleJp', 'exampleEn', 'jlptLevel'],
            },
          },
        },
        required: ['name', 'description', 'emoji', 'mainViewMode', 'cards'],
      },
    },
  },
  required: ['decks'],
};

/**
 * POST — draft a multi-week lesson plan for one learner.
 *
 * Writes nothing: a plan the organizer rejects must cost tokens and nothing else.
 * `/api/group/lesson-plan/apply` is what turns an approved plan into decks.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const body = await req.json().catch(() => null);
  const { memberId, goal, weeks, cardsPerDeck } = (body ?? {}) as {
    memberId?: string;
    goal?: string;
    weeks?: number;
    cardsPerDeck?: number;
  };

  const trimmedGoal = typeof goal === 'string' ? goal.trim() : '';
  if (trimmedGoal.length < GOAL_MIN || trimmedGoal.length > GOAL_MAX) {
    return NextResponse.json(
      { error: `Describe what to cover in ${GOAL_MIN}–${GOAL_MAX} characters.` },
      { status: 400 },
    );
  }
  if (!Number.isInteger(weeks) || (weeks as number) < WEEKS_MIN || (weeks as number) > WEEKS_MAX) {
    return NextResponse.json(
      { error: `weeks must be between ${WEEKS_MIN} and ${WEEKS_MAX}.` },
      { status: 400 },
    );
  }
  const cards = cardsPerDeck ?? CARDS_DEFAULT;
  if (!Number.isInteger(cards) || cards < CARDS_MIN || cards > CARDS_MAX) {
    return NextResponse.json(
      { error: `cardsPerDeck must be between ${CARDS_MIN} and ${CARDS_MAX}.` },
      { status: 400 },
    );
  }
  if (!memberId) {
    return NextResponse.json({ error: 'memberId is required.' }, { status: 400 });
  }
  if (!(await isMemberOfOrganizer(memberId, orgCheck.id))) {
    return NextResponse.json({ error: 'Learner not found in your group.' }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const overBudget = consumeLessonBudget(orgCheck.id);
  if (overBudget) return overBudget;

  try {
    const knownWords = await loadStudiedVocabulary(memberId);

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildLessonPlanPrompt({
                  goal: trimmedGoal,
                  weeks: weeks as number,
                  cardsPerDeck: cards,
                  knownWords,
                }),
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: PLAN_RESPONSE_SCHEMA,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Gemini API error', {
        route: 'POST /api/group/lesson-plan',
        status: response.status,
        body: data,
      });
      return NextResponse.json({ error: 'Failed to build the plan.' }, { status: 502 });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    let plan: LessonPlan;
    try {
      plan = JSON.parse(rawText);
    } catch {
      plan = { decks: [] };
    }

    if (!Array.isArray(plan.decks) || plan.decks.length === 0) {
      return NextResponse.json(
        { error: 'The plan came back empty. Please try again.' },
        { status: 502 },
      );
    }

    plan.decks = plan.decks.map((deck) => ({
      ...deck,
      cards: (deck.cards ?? []).map((card) => ({
        ...card,
        exampleJp: normalizeFurigana(card.exampleJp ?? ''),
      })),
    }));

    logger.info('Lesson plan generated', {
      route: 'POST /api/group/lesson-plan',
      organizerId: orgCheck.id,
      memberId,
      weeks,
      cardsPerDeck: cards,
      knownWordCount: knownWords.length,
      deckCount: plan.decks.length,
      cardCount: plan.decks.reduce((n, d) => n + (d.cards?.length ?? 0), 0),
    });

    return NextResponse.json({
      plan,
      knownWords: knownWords.map((w) => ({ word: w.word, reading: w.reading })),
    });
  } catch (err) {
    logger.error('Unhandled error', {
      route: 'POST /api/group/lesson-plan',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to build the plan.' }, { status: 500 });
  }
}
