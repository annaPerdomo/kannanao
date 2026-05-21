import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import type { DbPracticeSentence } from '@/types/practiceSentence';

import { rateLimit } from '../../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../../../group/_lib/serviceSupabase';

const RATE_LIMIT = { windowMs: 60_000, max: 5 };

interface GeminiSentence {
  sentence_jp: string;
  sentence_en: string;
  target_particle: string;
  particle_index: number;
  distractors: string[];
  sentence_type: 'question' | 'response' | 'statement';
  conversation_group: number;
  sort_order: number;
  source_words: string[];
}

/**
 * GET — fetch existing practice sentences for a deck (any authenticated user).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: deckId } = await params;

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('deck_practice_sentences')
    .select('*')
    .eq('deck_id', deckId)
    .order('conversation_group', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    logger.error('Failed to fetch practice sentences', {
      route: 'GET /api/deck/[id]/practice-sentences',
      deckId,
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to load practice sentences.' }, { status: 500 });
  }

  return NextResponse.json({ sentences: data as DbPracticeSentence[] });
}

/**
 * POST — generate practice sentences for a deck (organizer only).
 * If sentences already exist, returns them without regenerating.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { id: deckId } = await params;
  const sb = getServiceSupabase();

  // Check for existing sentences
  const { data: existing } = await sb
    .from('deck_practice_sentences')
    .select('id')
    .eq('deck_id', deckId)
    .limit(1);

  if (existing && existing.length > 0) {
    // Already generated — return them
    const { data } = await sb
      .from('deck_practice_sentences')
      .select('*')
      .eq('deck_id', deckId)
      .order('conversation_group', { ascending: true })
      .order('sort_order', { ascending: true });

    return NextResponse.json({ sentences: data as DbPracticeSentence[] });
  }

  // Load deck cards
  const { data: cards, error: cardsError } = await sb
    .from('cards')
    .select('id, word, reading, meaning')
    .eq('deck_id', deckId)
    .order('position', { ascending: true });

  if (cardsError || !cards || cards.length === 0) {
    return NextResponse.json(
      { error: 'Deck has no cards to generate practice from.' },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  // Build a word list with IDs for mapping back
  const wordList = cards.map((c) => ({
    id: c.id,
    word: c.word,
    reading: c.reading,
    meaning: c.meaning,
  }));

  const wordListText = wordList.map((w) => `- ${w.word} (${w.reading}) = ${w.meaning}`).join('\n');

  const sentenceCount = Math.min(Math.max(cards.length * 2, 8), 20);

  const prompt = `You are a Japanese language teacher creating practice material for beginning Japanese learners (roughly JLPT N5 level).

Given these vocabulary words from a study deck:
${wordListText}

Generate exactly ${sentenceCount} Japanese sentences grouped into natural mini-conversations (2-3 sentences each). These will be used in a game where the learner picks the correct particle (は, が, を, に, で, へ, と, も, の, か) to complete the sentence.

CRITICAL — VOCABULARY CONSTRAINT:
Every sentence MUST contain at least one word from the deck list above, used VERBATIM (the exact Japanese word or its reading). Do NOT substitute with synonyms, related words, or specific examples. For instance, if the deck has "のみもの" (drink), you must use "のみもの" in the sentence — do NOT replace it with "ジュース", "おちゃ", or any other specific drink. The whole point is for the student to practice with the exact words they are studying. If you cannot naturally fit a deck word into a sentence, skip that sentence and make one that does use a deck word.

IMPORTANT RULES:
1. Every sentence must use at least one vocabulary word from the deck list EXACTLY as written
2. Mix questions and responses — learners absorb grammar better through dialogue. Example conversation:
   - Q: "What does Sakura like?" → A: "Sakura likes cats."
3. Keep grammar simple and natural — suitable for a beginning learner (short sentences, common structures, plain or polite form consistently within a conversation)
4. Each sentence must have ONE clearly identifiable target particle to test
5. Wrap every kanji or kanji compound with furigana using {kanji|reading} format. Example: {猫|ねこ}が{好|す}きです
6. Pure hiragana/katakana words need no wrapping
7. Provide 2-3 plausible distractor particles for each sentence (wrong but reasonable alternatives)
8. particle_index is the character position of the target particle in the PLAIN text (after removing all {x|y} markup, counting from 0)
9. Try to cover different particles across the set — don't repeat the same particle too many times
10. source_words: list the EXACT vocabulary words (from the deck) that appear in each sentence — these must match the deck words verbatim

Output a JSON array of objects with these exact fields:
- sentence_jp: the full Japanese sentence with {kanji|reading} furigana markup
- sentence_en: English translation
- target_particle: the particle being tested (e.g. "は", "が", "を")
- particle_index: character index of the target particle in the plain text (0-based)
- distractors: array of 2-3 wrong particle options
- sentence_type: "question", "response", or "statement"
- conversation_group: integer grouping sentences into conversations (1, 2, 3, ...)
- sort_order: order within the conversation group (1, 2, 3)
- source_words: array of vocabulary words used from the deck`;

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
                  sentence_jp: { type: 'string' },
                  sentence_en: { type: 'string' },
                  target_particle: { type: 'string' },
                  particle_index: { type: 'integer' },
                  distractors: { type: 'array', items: { type: 'string' } },
                  sentence_type: { type: 'string', enum: ['question', 'response', 'statement'] },
                  conversation_group: { type: 'integer' },
                  sort_order: { type: 'integer' },
                  source_words: { type: 'array', items: { type: 'string' } },
                },
                required: [
                  'sentence_jp',
                  'sentence_en',
                  'target_particle',
                  'particle_index',
                  'distractors',
                  'sentence_type',
                  'conversation_group',
                  'sort_order',
                  'source_words',
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
        route: 'POST /api/deck/[id]/practice-sentences',
        status: response.status,
        body: data,
      });
      return NextResponse.json(
        { error: 'Failed to generate practice sentences.' },
        { status: 502 },
      );
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    const generated: GeminiSentence[] = JSON.parse(rawText);

    if (!Array.isArray(generated) || generated.length === 0) {
      return NextResponse.json(
        { error: 'AI returned no sentences. Please try again.' },
        { status: 502 },
      );
    }

    // Map source_words back to card IDs
    const wordToId = new Map<string, string>();
    for (const w of wordList) {
      wordToId.set(w.word, w.id);
      wordToId.set(w.reading, w.id);
    }

    const rows = generated.map((s) => ({
      deck_id: deckId,
      sentence_jp: s.sentence_jp,
      sentence_en: s.sentence_en,
      target_particle: s.target_particle,
      particle_index: s.particle_index,
      distractors: s.distractors,
      sentence_type: s.sentence_type,
      conversation_group: s.conversation_group,
      sort_order: s.sort_order,
      source_card_ids: s.source_words
        .map((w) => wordToId.get(w))
        .filter((id): id is string => !!id),
    }));

    const { error: insertError } = await sb.from('deck_practice_sentences').insert(rows);

    if (insertError) {
      logger.error('Failed to insert practice sentences', {
        route: 'POST /api/deck/[id]/practice-sentences',
        deckId,
        error: insertError.message,
      });
      return NextResponse.json({ error: 'Failed to save practice sentences.' }, { status: 500 });
    }

    // Re-fetch to get proper IDs and ordering
    const { data: saved } = await sb
      .from('deck_practice_sentences')
      .select('*')
      .eq('deck_id', deckId)
      .order('conversation_group', { ascending: true })
      .order('sort_order', { ascending: true });

    return NextResponse.json({ sentences: saved as DbPracticeSentence[] });
  } catch (err) {
    logger.error('Unhandled error', {
      route: 'POST /api/deck/[id]/practice-sentences',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH — edit practice sentences (organizer) or increment peek count (any user).
 *
 * Body variants:
 * - { sentenceId }                   → increment meaning_peek_count (any auth)
 * - { updates: [...], deletes: [...] } → batch edit/delete sentences (organizer only)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: {
    sentenceId?: string;
    updates?: { id: string; sentence_jp?: string; sentence_en?: string }[];
    deletes?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const sb = getServiceSupabase();

  // ── Batch edit/delete (organizer only) ──
  if (body.updates || body.deletes) {
    const orgCheck = await requireOrganizerAccount(req);
    if (orgCheck instanceof NextResponse) return orgCheck;

    if (body.deletes && body.deletes.length > 0) {
      const { error: delErr } = await sb
        .from('deck_practice_sentences')
        .delete()
        .in('id', body.deletes);

      if (delErr) {
        logger.error('Failed to delete sentences', { error: delErr.message });
        return NextResponse.json({ error: 'Failed to delete sentences.' }, { status: 500 });
      }
    }

    if (body.updates && body.updates.length > 0) {
      for (const u of body.updates) {
        const fields: Record<string, string> = {};
        if (u.sentence_jp !== undefined) fields.sentence_jp = u.sentence_jp;
        if (u.sentence_en !== undefined) fields.sentence_en = u.sentence_en;
        if (Object.keys(fields).length > 0) {
          await sb.from('deck_practice_sentences').update(fields).eq('id', u.id);
        }
      }
    }

    // Return updated list
    const { id: deckId } = await params;
    const { data } = await sb
      .from('deck_practice_sentences')
      .select('*')
      .eq('deck_id', deckId)
      .order('conversation_group', { ascending: true })
      .order('sort_order', { ascending: true });

    return NextResponse.json({ sentences: data as DbPracticeSentence[] });
  }

  // ── Single peek increment (any auth) ──
  if (!body.sentenceId) {
    return NextResponse.json({ error: 'sentenceId is required.' }, { status: 400 });
  }

  const { error } = await sb.rpc('increment_meaning_peek', { row_id: body.sentenceId });

  if (error) {
    const { data: row } = await sb
      .from('deck_practice_sentences')
      .select('meaning_peek_count')
      .eq('id', body.sentenceId)
      .single();

    if (row) {
      await sb
        .from('deck_practice_sentences')
        .update({ meaning_peek_count: (row.meaning_peek_count ?? 0) + 1 })
        .eq('id', body.sentenceId);
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE — remove all practice sentences for a deck (organizer only).
 * Used when an organizer wants to regenerate after editing the deck.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  const { id: deckId } = await params;
  const sb = getServiceSupabase();

  const { error } = await sb.from('deck_practice_sentences').delete().eq('deck_id', deckId);

  if (error) {
    logger.error('Failed to delete practice sentences', {
      route: 'DELETE /api/deck/[id]/practice-sentences',
      deckId,
      error: error.message,
    });
    return NextResponse.json({ error: 'Failed to delete practice sentences.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
