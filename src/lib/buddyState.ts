import { type BuddyWord, normalizeWords } from './buddyWords';
import { logger } from './logger';
import { sb } from './supabase';

/**
 * The per-user half of the buddy's memory — the day's greeting claim and the
 * rolling word window. Both live in `buddy_state` and are written only through
 * its RPCs (supabase/migrations/20260816000000_add_buddy_state.sql).
 *
 * Every call here fails soft: a buddy that stays quiet is a far better outcome
 * than a home screen that errors, and this is all cosmetic state.
 */

export async function fetchRecentWords(userId: string): Promise<BuddyWord[]> {
  const { data, error } = await sb
    .from('buddy_state')
    .select('recent_words')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    logger.error('buddy_state read failed', { message: error.message });
    return [];
  }
  return normalizeWords(data?.recent_words);
}

/** True only for the caller that actually took today's greeting. */
export async function claimBuddyGreeting(today: string): Promise<boolean> {
  const { data, error } = await sb.rpc('claim_buddy_greeting', { p_today: today });
  if (error) {
    logger.error('claim_buddy_greeting failed', { message: error.message });
    return false;
  }
  return data === true;
}

/** The merged window the server now holds, or null if it could not be saved. */
export async function persistBuddyWords(words: BuddyWord[]): Promise<BuddyWord[] | null> {
  if (!words.length) return null;
  const { data, error } = await sb.rpc('remember_buddy_words', { p_words: words });
  if (error) {
    logger.error('remember_buddy_words failed', { message: error.message });
    return null;
  }
  // A merge that took anything answers with at least what it took, so an empty
  // list is a refusal — reporting it would wipe the window the caller just showed.
  const saved = normalizeWords(data);
  return saved.length ? saved : null;
}
