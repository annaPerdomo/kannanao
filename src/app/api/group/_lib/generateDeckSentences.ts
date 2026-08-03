import { normalizeFurigana } from '@/lib/furigana';
import { excludeDeckWords, type KnownWord } from '@/lib/knownWords';
import { buildSentencePrompt, type PromptWord, sentenceCountFor } from '@/lib/lessonPrompts';
import { logger } from '@/lib/logger';
import type { DbPracticeSentence } from '@/types/practiceSentence';

import { getServiceSupabase } from './serviceSupabase';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

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

const SENTENCE_RESPONSE_SCHEMA = {
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
};

/**
 * Sentence sets are keyed by (deck, learner); a null learner is the shared set.
 * Callers scope every read, write and delete or one learner's set shadows another's.
 */
export function selectSentences(deckId: string, memberId: string | null) {
  const base = getServiceSupabase()
    .from('deck_practice_sentences')
    .select('*')
    .eq('deck_id', deckId);

  const scoped = memberId ? base.eq('for_member_id', memberId) : base.is('for_member_id', null);

  return scoped
    .order('conversation_group', { ascending: true })
    .order('sort_order', { ascending: true });
}

export type GenerateOutcome =
  | { status: 'skipped'; sentences: DbPracticeSentence[]; deckWords: PromptWord[] }
  | { status: 'generated'; sentences: DbPracticeSentence[]; deckWords: PromptWord[] }
  | { status: 'failed'; error: string; httpStatus: number; deckWords: PromptWord[] };

/**
 * Generates and stores one deck's Kotoba Bubble sentences. Shared by the
 * per-deck route and the batch endpoint so prompt handling never diverges.
 * Returns the deck's words so a batch caller can feed them forward.
 */
export async function generateDeckSentences(args: {
  deckId: string;
  memberId: string | null;
  knownWords: KnownWord[];
  apiKey: string;
}): Promise<GenerateOutcome> {
  const { deckId, memberId, knownWords, apiKey } = args;
  const sb = getServiceSupabase();

  const { data: cards, error: cardsError } = await sb
    .from('cards')
    .select('id, word, reading, meaning')
    .eq('deck_id', deckId)
    .order('position', { ascending: true });

  if (cardsError || !cards || cards.length === 0) {
    return {
      status: 'failed',
      error: 'Deck has no cards to generate practice from.',
      httpStatus: 400,
      deckWords: [],
    };
  }

  const deckWords: PromptWord[] = cards.map((c) => ({
    word: c.word,
    reading: c.reading ?? '',
    meaning: c.meaning ?? '',
  }));

  const existingQuery = sb.from('deck_practice_sentences').select('id').eq('deck_id', deckId);
  const { data: existing } = await (
    memberId ? existingQuery.eq('for_member_id', memberId) : existingQuery.is('for_member_id', null)
  ).limit(1);

  if (existing && existing.length > 0) {
    const { data } = await selectSentences(deckId, memberId);
    return { status: 'skipped', sentences: (data ?? []) as DbPracticeSentence[], deckWords };
  }

  const prompt = buildSentencePrompt({
    deckWords,
    // The target deck's own words are the lesson, not the scaffolding.
    knownWords: excludeDeckWords(
      knownWords,
      deckWords.flatMap((w) => [w.word, w.reading]),
    ),
    sentenceCount: sentenceCountFor(cards.length),
  });

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: SENTENCE_RESPONSE_SCHEMA,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('Gemini API error', { route: 'generateDeckSentences', deckId, body: data });
    return {
      status: 'failed',
      error: 'Failed to generate practice sentences.',
      httpStatus: 502,
      deckWords,
    };
  }

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  let generated: GeminiSentence[];
  try {
    generated = JSON.parse(rawText);
  } catch {
    generated = [];
  }

  if (!Array.isArray(generated) || generated.length === 0) {
    return {
      status: 'failed',
      error: 'AI returned no sentences. Please try again.',
      httpStatus: 502,
      deckWords,
    };
  }

  const wordToId = new Map<string, string>();
  for (const c of cards) {
    wordToId.set(c.word, c.id);
    if (c.reading) wordToId.set(c.reading, c.id);
  }

  const rows = generated.map((s) => ({
    deck_id: deckId,
    for_member_id: memberId,
    sentence_jp: normalizeFurigana(s.sentence_jp),
    sentence_en: s.sentence_en,
    target_particle: s.target_particle,
    particle_index: s.particle_index,
    distractors: s.distractors,
    sentence_type: s.sentence_type,
    conversation_group: s.conversation_group,
    sort_order: s.sort_order,
    source_card_ids: (s.source_words ?? [])
      .map((w) => wordToId.get(w))
      .filter((id): id is string => !!id),
  }));

  const { error: insertError } = await sb.from('deck_practice_sentences').insert(rows);

  if (insertError) {
    logger.error('Failed to insert practice sentences', {
      route: 'generateDeckSentences',
      deckId,
      error: insertError.message,
    });
    return {
      status: 'failed',
      error: 'Failed to save practice sentences.',
      httpStatus: 500,
      deckWords,
    };
  }

  const { data: saved } = await selectSentences(deckId, memberId);
  return { status: 'generated', sentences: (saved ?? []) as DbPracticeSentence[], deckWords };
}
