import { type KnownWord, rankKnownWords } from '@/lib/knownWords';
import { logger } from '@/lib/logger';

import { getServiceSupabase } from './serviceSupabase';

/** Supabase rejects very large `in()` lists — look the cards up in slices. */
const CARD_LOOKUP_CHUNK = 200;

/**
 * Progress rows to consider. rankKnownWords keeps far fewer than this; the cap
 * exists so the query and the card lookups stay bounded for a long-time learner.
 */
const PROGRESS_ROW_CAP = 500;

/**
 * Words this learner has actually answered correctly, ranked and capped.
 * Returns [] rather than throwing: a brand-new learner must still be able to
 * generate sentences.
 */
export async function loadStudiedVocabulary(memberId: string): Promise<KnownWord[]> {
  try {
    const sb = getServiceSupabase();

    // Ranked and capped in the DB before the card lookups: a learner two years
    // in has thousands of rows, and this runs once per deck on the apply path.
    const { data: progress, error: progressError } = await sb
      .from('card_progress')
      .select('card_id, correct_count, last_reviewed_at')
      .eq('user_id', memberId)
      .gt('correct_count', 0)
      .order('correct_count', { ascending: false })
      .order('last_reviewed_at', { ascending: false })
      .limit(PROGRESS_ROW_CAP);

    if (progressError) {
      logger.error('Failed to load card progress for studied vocabulary', {
        memberId,
        error: progressError.message,
      });
      return [];
    }
    if (!progress || progress.length === 0) return [];

    const byCardId = new Map(progress.map((p) => [p.card_id as string, p]));
    const cardIds = [...byCardId.keys()];
    const words: KnownWord[] = [];

    for (let i = 0; i < cardIds.length; i += CARD_LOOKUP_CHUNK) {
      const slice = cardIds.slice(i, i + CARD_LOOKUP_CHUNK);
      const { data: cards, error: cardsError } = await sb
        .from('cards')
        .select('id, word, reading, meaning')
        .in('id', slice);

      if (cardsError) {
        logger.error('Failed to load cards for studied vocabulary', {
          memberId,
          error: cardsError.message,
        });
        return [];
      }

      for (const card of cards ?? []) {
        const p = byCardId.get(card.id as string);
        if (!card.word) continue;
        words.push({
          word: card.word,
          reading: card.reading ?? '',
          meaning: card.meaning ?? '',
          correctCount: p?.correct_count ?? 0,
          lastReviewedAt: p?.last_reviewed_at ?? null,
        });
      }
    }

    return rankKnownWords(words);
  } catch (err) {
    logger.error('Unhandled error loading studied vocabulary', {
      memberId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
