'use client';

import { createBrowserClient } from '@supabase/ssr';

import {
  type AccountType,
  dbCardToApp,
  dbDeckToApp,
  dbEventTypeToApp,
  dbTodoToApp,
  type SupabaseCardRow,
  type UserProfile,
} from '@/lib/dbMappers';
import type { Deck } from '@/types/deck';
import type { Flashcard } from '@/types/flashcard';
import type { HomeSections } from '@/types/homeSections';
import type { EntryType, Todo } from '@/types/todo';
import type { ShowCard, ShowCardCategory } from '@/types/travel';

// Re-export the shared mappers/types so existing `@/lib/supabase` imports keep
// working unchanged.
export { dbCardToApp, dbDeckToApp };
export type { AccountType };

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'YOUR_SUPABASE_ANON_KEY';

export function isConfigured(): boolean {
  return (
    SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
    SUPABASE_URL !== '' &&
    SUPABASE_ANON_KEY !== ''
  );
}

export function showConfigBanner(): void {
  console.warn(
    'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_URL and SUPABASE_ANON_KEY via next.config.ts.',
  );
}

// Browser client — persists the auth session in cookies (not localStorage) so
// the Next.js server can read it and render authenticated pages. The API
// surface is identical to the previous createClient(), so all sb.from()/sb.auth
// usage across the app is unchanged.
export const sb = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function loadDecks(userId: string): Promise<Deck[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  // Fetch user's own decks and any assignments in parallel — they're independent.
  const [ownResult, assignedResult] = await Promise.all([
    sb
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    // Decks assigned to this user (member viewing organizer's decks)
    sb.from('assignments').select('deck_id').eq('member_id', userId),
  ]);

  const { data: deckRows, error: deckError } = ownResult;
  const { data: assignedRows } = assignedResult;
  if (deckError) {
    console.error('Error loading decks', deckError);
    return [];
  }

  const ownDeckIds = new Set((deckRows ?? []).map((d) => d.id));
  const assignedDeckIds = (assignedRows ?? [])
    .map((a) => a.deck_id as string)
    .filter((id) => !ownDeckIds.has(id));

  let assignedDecks: typeof deckRows = [];
  if (assignedDeckIds.length > 0) {
    const { data } = await sb
      .from('decks')
      .select('*')
      .in('id', assignedDeckIds)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    assignedDecks = data ?? [];
  }

  const allDecks = [...(deckRows ?? []), ...assignedDecks];

  // Card counts come from the trigger-maintained `card_count` column — no need to
  // fetch card rows for the whole library just to compute counts.
  return allDecks.map((deck) => dbDeckToApp(deck, deck.card_count ?? 0, userId));
}

export async function dbCreateDeck(name: string, description?: string): Promise<Deck> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase is not configured');
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get the current max position for this user's decks
  const { data: maxRow } = await sb
    .from('decks')
    .select('position')
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = (maxRow?.position ?? -1) + 1;

  const { data, error } = await sb
    .from('decks')
    .insert({ name, description: description ?? null, user_id: user.id, position: nextPos })
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error('Unable to create deck');
  }

  return dbDeckToApp(data, 0, user.id);
}

export async function dbDeleteDeck(id: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase is not configured');
  }

  const { error } = await sb.from('decks').delete().eq('id', id);
  if (error) throw error;
}

export async function dbUpdateDeckEmoji(id: string, emoji: string | null): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const { error } = await sb.from('decks').update({ emoji }).eq('id', id);
  if (error) throw error;
}

export async function dbPinDeck(id: string, pinned: boolean): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const { error } = await sb.from('decks').update({ pinned }).eq('id', id);
  if (error) throw error;
}

export async function dbSetDeckPublic(id: string, isPublic: boolean): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const { error } = await sb.from('decks').update({ is_public: isPublic }).eq('id', id);
  if (error) throw error;
}

export async function dbReorderDecks(orderedIds: string[]): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const results = await Promise.all(
    orderedIds.map((id, index) => sb.from('decks').update({ position: index }).eq('id', id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function dbReorderCards(orderedIds: string[]): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const results = await Promise.all(
    orderedIds.map((id, index) => sb.from('cards').update({ position: index }).eq('id', id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function loadCards(deckId: string): Promise<Flashcard[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  const { data, error } = await sb
    .from('cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading cards', error);
    return [];
  }

  return (data ?? []).map(dbCardToApp);
}

export async function dbInsertCards(
  deckId: string,
  newCards: Array<Omit<Flashcard, 'id' | 'position'>>,
): Promise<Flashcard[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  // Get the current max position for this deck
  const { data: maxRow } = await sb
    .from('cards')
    .select('position')
    .eq('deck_id', deckId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const startPos = (maxRow?.position ?? -1) + 1;

  const rows = newCards.map((card, i) => ({
    deck_id: deckId,
    word: card.word,
    reading: card.reading || '',
    meaning: card.meaning || '',
    image_url: card.imageUrl || '',
    image_query: card.image_query || '',
    example_jp: card.example_jp || '',
    example_en: card.example_en || '',
    main_view_mode: card.mainViewMode || 'hiragana',
    card_type: card.cardType || 'word',
    jlpt_level: card.jlptLevel ?? null,
    position: startPos + i,
  }));

  const { data, error } = await sb.from('cards').insert(rows).select('*');

  if (error) throw error;
  return (data ?? []).map(dbCardToApp);
}

export async function dbDeleteCard(cardId: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase is not configured');
  }

  const { error } = await sb.from('cards').delete().eq('id', cardId);
  if (error) throw error;
}

export async function dbUpdateCard(
  cardId: string,
  patch: Partial<Flashcard>,
): Promise<Flashcard | null> {
  if (!isConfigured()) {
    showConfigBanner();
    return null;
  }

  const payload: Partial<SupabaseCardRow> = {};
  if (patch.word !== undefined) payload.word = patch.word;
  if (patch.reading !== undefined) payload.reading = patch.reading;
  if (patch.meaning !== undefined) payload.meaning = patch.meaning;
  if (patch.imageUrl !== undefined) payload.image_url = patch.imageUrl;
  if (patch.image_query !== undefined) payload.image_query = patch.image_query;
  if (patch.example_jp !== undefined) payload.example_jp = patch.example_jp;
  if (patch.example_en !== undefined) payload.example_en = patch.example_en;
  if (patch.mainViewMode !== undefined) payload.main_view_mode = patch.mainViewMode;
  if (patch.cardType !== undefined) payload.card_type = patch.cardType;
  if (patch.jlptLevel !== undefined) payload.jlpt_level = patch.jlptLevel ?? null;

  if (Object.keys(payload).length === 0) {
    return null;
  }

  const { data, error } = await sb.from('cards').update(payload).eq('id', cardId).select().single();

  if (error || !data) {
    console.error('Error updating card', error);
    return null;
  }

  return dbCardToApp(data);
}

// ─── ADD THESE TWO FUNCTIONS TO THE BOTTOM OF /lib/supabase.ts ───────────────

/**
 * Load every card across all decks (used by the "add existing cards" picker).
 */
export async function loadAllCards(): Promise<Flashcard[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  const { data, error } = await sb
    .from('cards')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading all cards', error);
    return [];
  }

  return (data ?? []).map(dbCardToApp);
}

/**
 * Duplicate the given cards into a different deck.
 * The originals are untouched; new rows are inserted with targetDeckId.
 */
export async function dbCopyCardsIntoDeck(
  targetDeckId: string,
  cards: Flashcard[],
): Promise<Flashcard[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  if (cards.length === 0) return [];

  const { data: maxRow } = await sb
    .from('cards')
    .select('position')
    .eq('deck_id', targetDeckId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const startPos = (maxRow?.position ?? -1) + 1;

  const rows = cards.map((card, i) => ({
    deck_id: targetDeckId,
    word: card.word,
    reading: card.reading || '',
    meaning: card.meaning || '',
    image_url: card.imageUrl || '',
    image_query: card.image_query || '',
    example_jp: card.example_jp || '',
    example_en: card.example_en || '',
    main_view_mode: card.mainViewMode ?? 'hiragana',
    card_type: card.cardType ?? 'word',
    jlpt_level: card.jlptLevel ?? null,
    position: startPos + i,
  }));

  const { data, error } = await sb.from('cards').insert(rows).select('*');

  if (error) throw error;
  return (data ?? []).map(dbCardToApp);
}

export async function dbRenameDeck(id: string, name: string, description?: string): Promise<Deck> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await sb
    .from('decks')
    .update({ name, description: description ?? null })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error('Unable to rename deck');
  }

  // Preserve card count — caller passes it in via the hook
  return dbDeckToApp(data, 0, data.user_id);
}

// ─── Auth / profiles ─────────────────────────────────────────────────────────

export async function fetchDisplayName(userId: string): Promise<string | null> {
  if (!isConfigured()) return null;
  const { data } = await sb
    .from('profiles')
    .select('display_name, username')
    .eq('id', userId)
    .single();
  return data?.display_name || data?.username || null;
}

export async function upsertProfile(
  userId: string,
  username: string,
  displayName?: string,
): Promise<void> {
  const payload: { id: string; username: string; display_name?: string } = { id: userId, username };
  if (displayName) payload.display_name = displayName;
  const { error } = await sb.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) console.error('upsertProfile error', error);
}

export async function loadProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await sb
    .from('profiles')
    .select(
      'username, display_name, color_scheme, show_todo, home_sections, review_reminders, account_type, organizer_id, group_id, travel_main_view_mode, groups:group_id (show_leaderboard)',
    )
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  // groups join returns an object (single FK) or null; Supabase types infer array
  const groupRow = data.groups as unknown as { show_leaderboard: boolean } | null;
  return {
    username: data.username,
    displayName: data.display_name ?? null,
    colorScheme: data.color_scheme ?? null,
    showTodo: data.show_todo !== false,
    homeSections: (data.home_sections as Partial<HomeSections>) ?? null,
    reviewReminders: data.review_reminders !== false,
    accountType: (data.account_type as AccountType) ?? 'organizer',
    organizerId: data.organizer_id ?? null,
    groupId: data.group_id ?? null,
    groupShowLeaderboard: groupRow?.show_leaderboard ?? true,
    travelMainViewMode: data.travel_main_view_mode ?? null,
  };
}

export async function updateProfileColorScheme(userId: string, colorScheme: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    return;
  }
  const { error } = await sb
    .from('profiles')
    .update({ color_scheme: colorScheme })
    .eq('id', userId);
  if (error) console.error('updateProfileColorScheme error', error);
}

export async function updateProfileShowTodo(userId: string, showTodo: boolean): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    return;
  }
  const { error } = await sb.from('profiles').update({ show_todo: showTodo }).eq('id', userId);
  if (error) console.error('updateProfileShowTodo error', error);
}

/**
 * Unlike its siblings above, this reports failure to the caller: the settings
 * switch is optimistic, so it has to know when to roll back and say so.
 */
export async function updateProfileReviewReminders(
  userId: string,
  reviewReminders: boolean,
): Promise<{ error: string | null }> {
  if (!isConfigured()) {
    showConfigBanner();
    return { error: 'Not connected to the database.' };
  }
  const { error } = await sb
    .from('profiles')
    .update({ review_reminders: reviewReminders })
    .eq('id', userId);
  if (error) {
    console.error('updateProfileReviewReminders error', error);
    return { error: error.message };
  }
  return { error: null };
}

export async function updateProfileHomeSections(
  userId: string,
  sections: HomeSections,
): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    return;
  }
  const { error } = await sb
    .from('profiles')
    .update({ home_sections: sections, show_todo: sections.todo })
    .eq('id', userId);
  if (error) console.error('updateProfileHomeSections error', error);
}

export async function updateProfileTravelMainViewMode(userId: string, mode: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    return;
  }
  const { error } = await sb
    .from('profiles')
    .update({ travel_main_view_mode: mode })
    .eq('id', userId);
  if (error) console.error('updateProfileTravelMainViewMode error', error);
}

// ─── Login events ────────────────────────────────────────────────────────────

export async function dbRecordLogin(userId: string): Promise<void> {
  if (!isConfigured()) return;
  const { error } = await sb.from('login_events').insert({ user_id: userId });
  if (error) console.error('dbRecordLogin error', error);
}

// ─── Deck sharing ─────────────────────────────────────────────────────────────

export async function dbShareDeck(
  deckId: string,
  targetUsername: string,
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile, error: lookupError } = await sb
    .from('profiles')
    .select('id')
    .eq('username', targetUsername.trim().toLowerCase())
    .single();

  if (lookupError || !profile) return { error: 'User not found' };

  const { error } = await sb
    .from('deck_shares')
    .insert({ deck_id: deckId, shared_with: profile.id, owner_id: user.id });

  if (error) {
    if (error.code === '23505') return { error: 'Already shared with this user' };
    return { error: error.message };
  }
  return { error: null };
}

export interface DeckShare {
  id: string;
  sharedWith: string;
  username: string;
}

export async function dbGetDeckShares(deckId: string): Promise<DeckShare[]> {
  const { data: shares, error } = await sb
    .from('deck_shares')
    .select('id, shared_with')
    .eq('deck_id', deckId);

  if (error || !shares || shares.length === 0) return [];

  const userIds = shares.map((s: { shared_with: string }) => s.shared_with);
  const { data: profiles } = await sb.from('profiles').select('id, username').in('id', userIds);

  const profileMap: Record<string, string> = {};
  (profiles ?? []).forEach((p: { id: string; username: string }) => {
    profileMap[p.id] = p.username;
  });

  return shares.map((s: { id: string; shared_with: string }) => ({
    id: s.id,
    sharedWith: s.shared_with,
    username: profileMap[s.shared_with] ?? s.shared_with,
  }));
}

export async function dbUnShareDeck(shareId: string): Promise<void> {
  const { error } = await sb.from('deck_shares').delete().eq('id', shareId);
  if (error) throw error;
}

// ─── Todos ────────────────────────────────────────────────────────────────────

const EMOJI_KEYWORDS: Array<[string[], string]> = [
  [['study', 'learn', 'read', 'book', 'homework', 'school', 'class', 'review', 'memorize'], '📚'],
  [['japanese', 'kanji', 'hiragana', 'katakana', 'vocab', 'flashcard', 'anki', 'nihongo'], '🗾'],
  [
    ['eat', 'food', 'lunch', 'dinner', 'breakfast', 'cook', 'meal', 'snack', 'recipe', 'bake'],
    '🍱',
  ],
  [
    ['exercise', 'workout', 'run', 'gym', 'walk', 'swim', 'sport', 'yoga', 'dance', 'stretch'],
    '🏃',
  ],
  [['sleep', 'rest', 'nap', 'bed'], '😴'],
  [['clean', 'wash', 'laundry', 'dishes', 'tidy', 'organize', 'vacuum', 'sweep', 'mop'], '🧹'],
  [['shop', 'buy', 'grocery', 'store', 'market', 'purchase', 'order'], '🛒'],
  [
    ['work', 'meeting', 'office', 'email', 'job', 'project', 'deadline', 'report', 'presentation'],
    '💼',
  ],
  [['friend', 'family', 'mom', 'dad', 'sister', 'brother', 'visit', 'hang out'], '💕'],
  [['music', 'sing', 'guitar', 'piano', 'listen', 'song', 'playlist', 'practice instrument'], '🎵'],
  [['draw', 'paint', 'art', 'craft', 'design', 'sketch', 'color'], '🎨'],
  [['write', 'journal', 'diary', 'essay', 'poem', 'story', 'blog', 'notes'], '✏️'],
  [['code', 'program', 'debug', 'build', 'develop', 'app', 'website', 'github'], '💻'],
  [['water', 'hydrate', 'drink water'], '💧'],
  [['coffee', 'tea', 'drink'], '☕'],
  [['birthday', 'party', 'celebrate', 'gift', 'present', 'event'], '🎉'],
  [['movie', 'watch', 'show', 'film', 'anime', 'video', 'tv', 'netflix', 'episode'], '🎬'],
  [['game', 'gaming', 'mario', 'pokemon', 'play game'], '🎮'],
  [['call', 'phone', 'text', 'message', 'facetime', 'zoom'], '📱'],
  [['doctor', 'medicine', 'health', 'appointment', 'dentist', 'hospital', 'checkup'], '🏥'],
  [['travel', 'trip', 'vacation', 'flight', 'pack', 'hotel', 'tour'], '✈️'],
  [['garden', 'plant', 'flower', 'water plant', 'outdoor', 'hike', 'nature'], '🌸'],
  [['pet', 'cat', 'dog', 'feed pet', 'walk dog', 'animal'], '🐾'],
  [['money', 'pay', 'bill', 'bank', 'budget', 'save', 'rent', 'finance', 'invoice'], '💰'],
  [['meditation', 'mindful', 'breathe', 'calm', 'relax'], '🧘'],
  [['photo', 'camera', 'picture', 'selfie', 'instagram'], '📷'],
  [['birthday', 'anniversary', 'wedding', 'graduation'], '🎊'],
];

const FALLBACK_EMOJIS = ['🌸', '⭐', '🦋', '🌈', '💕', '🌺', '🎀', '🍓', '🌙', '✨', '🐝', '🍀'];

function pickEmojiForText(text: string): string {
  const lower = text.toLowerCase();
  for (const [keywords, emoji] of EMOJI_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return emoji;
  }
  return FALLBACK_EMOJIS[Math.floor(Math.random() * FALLBACK_EMOJIS.length)];
}

export async function loadEventTypes(userId: string): Promise<EntryType[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }
  const { data, error } = await sb
    .from('event_types')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) {
    console.error('Error loading event types', error);
    return [];
  }
  return (data ?? []).map(dbEventTypeToApp);
}

export async function dbCreateEventType(
  userId: string,
  name: string,
  emoji: string,
  color: string,
): Promise<EntryType> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const { data, error } = await sb
    .from('event_types')
    .insert({ user_id: userId, name, emoji, color })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Unable to create event type');
  return dbEventTypeToApp(data);
}

export async function dbUpdateEventType(
  id: string,
  name: string,
  emoji: string,
): Promise<EntryType> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const { data, error } = await sb
    .from('event_types')
    .update({ name, emoji })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Unable to update event type');
  return dbEventTypeToApp(data);
}

export async function dbDeleteEventType(id: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const { error } = await sb.from('event_types').delete().eq('id', id);
  if (error) throw error;
}

export async function loadTodos(userId: string): Promise<Todo[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }
  const { data, error } = await sb
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error loading todos', error);
    return [];
  }
  return (data ?? []).map(dbTodoToApp);
}

export async function dbCreateTodo(
  text: string,
  frequencyDays: number[] = [],
  assignedDateISO?: string,
  sortOrder?: number,
  repeatUntilDone = false,
): Promise<Todo> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const insertPayload: Record<string, unknown> = {
    text,
    user_id: user.id,
    completed: false,
    emoji: pickEmojiForText(text),
    frequency_days: frequencyDays,
    completed_dates: [],
    sort_order: sortOrder ?? null,
    repeat_until_done: repeatUntilDone,
  };
  if (assignedDateISO) {
    insertPayload.created_at = `${assignedDateISO}T12:00:00.000Z`;
  }
  const { data, error } = await sb.from('todos').insert(insertPayload).select().single();
  if (error || !data) throw error ?? new Error('Unable to create todo');
  return dbTodoToApp(data);
}

export async function dbUpdateTodo(
  id: string,
  patch: Partial<
    Pick<
      Todo,
      | 'text'
      | 'completed'
      | 'emoji'
      | 'completedDates'
      | 'frequencyDays'
      | 'createdAt'
      | 'sortOrder'
      | 'repeatUntilDone'
    >
  >,
): Promise<Todo> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const dbPatch: Record<string, unknown> = {};
  if (patch.text !== undefined) dbPatch.text = patch.text;
  if (patch.completed !== undefined) dbPatch.completed = patch.completed;
  if (patch.emoji !== undefined) dbPatch.emoji = patch.emoji;
  if (patch.completedDates !== undefined) dbPatch.completed_dates = patch.completedDates;
  if (patch.frequencyDays !== undefined) dbPatch.frequency_days = patch.frequencyDays;
  if (patch.createdAt !== undefined) dbPatch.created_at = new Date(patch.createdAt).toISOString();
  if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;
  if (patch.repeatUntilDone !== undefined) dbPatch.repeat_until_done = patch.repeatUntilDone;
  const { data, error } = await sb.from('todos').update(dbPatch).eq('id', id).select().single();
  if (error || !data) throw error ?? new Error('Unable to update todo');
  return dbTodoToApp(data);
}

export async function dbDeleteTodo(id: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const { error } = await sb.from('todos').delete().eq('id', id);
  if (error) throw error;
}

// ─── Show Cards ──────────────────────────────────────────────────

interface ShowCardRow {
  id: string;
  user_id: string;
  category: string;
  english: string;
  japanese: string;
  romaji: string;
  situation: string;
  icon: string;
  created_at: string;
}

function dbShowCardToApp(row: ShowCardRow): ShowCard {
  return {
    id: row.id,
    category: row.category as ShowCardCategory,
    english: row.english,
    japanese: row.japanese,
    romaji: row.romaji,
    situation: row.situation,
    icon: row.icon,
    isCustom: true,
  };
}

export async function loadShowCards(): Promise<ShowCard[]> {
  if (!isConfigured()) return [];
  const { data, error } = await sb
    .from('show_cards')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error loading show cards', error);
    return [];
  }
  return (data ?? []).map(dbShowCardToApp);
}

export async function dbSaveShowCard(
  card: Omit<ShowCard, 'id' | 'isCustom'>,
  userId: string,
): Promise<ShowCard> {
  if (!isConfigured()) throw new Error('Supabase not configured');
  const { data, error } = await sb
    .from('show_cards')
    .insert({
      user_id: userId,
      category: card.category,
      english: card.english,
      japanese: card.japanese,
      romaji: card.romaji,
      situation: card.situation,
      icon: card.icon,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to save show card');
  return dbShowCardToApp(data);
}

export async function dbUpdateShowCard(
  id: string,
  patch: Partial<
    Pick<ShowCard, 'english' | 'japanese' | 'romaji' | 'situation' | 'icon' | 'category'>
  >,
): Promise<ShowCard> {
  if (!isConfigured()) throw new Error('Supabase not configured');
  const { data, error } = await sb.from('show_cards').update(patch).eq('id', id).select().single();
  if (error || !data) throw error ?? new Error('Failed to update show card');
  return dbShowCardToApp(data);
}

export async function dbDeleteShowCard(id: string): Promise<void> {
  if (!isConfigured()) throw new Error('Supabase not configured');
  const { error } = await sb.from('show_cards').delete().eq('id', id);
  if (error) throw error;
}

// ─── Per-card progress ──────────────────────────────────────────

export interface CardProgress {
  cardId: string;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  intervalDays: number;
  ease: number;
}

interface CardProgressRow {
  card_id: string;
  correct_count: number;
  wrong_count: number;
  last_reviewed_at: string | null;
  next_review_at: string;
  interval_days: number;
  ease: number;
}

function dbCardProgressToApp(row: CardProgressRow): CardProgress {
  return {
    cardId: row.card_id,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    lastReviewedAt: row.last_reviewed_at,
    nextReviewAt: row.next_review_at,
    intervalDays: row.interval_days,
    ease: row.ease,
  };
}

/**
 * Record one graded answer against a card. Increments the matching counter and
 * stamps last_reviewed_at atomically via the `increment_card_progress` DB
 * function (client → Supabase direct, no Vercel function cost). Never throws —
 * a failed progress write must not break the study flow.
 */
export async function upsertCardProgress(cardId: string, correct: boolean): Promise<void> {
  if (!isConfigured()) return;
  const { error } = await sb.rpc('increment_card_progress', {
    p_card_id: cardId,
    p_correct: correct,
  });
  if (error) console.error('upsertCardProgress error', error);
}

/** Load every per-card progress row for a user (RLS scopes this to `userId`). */
export async function getCardProgressForUser(userId: string): Promise<CardProgress[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }
  const { data, error } = await sb.from('card_progress').select('*').eq('user_id', userId);
  if (error) {
    console.error('Error loading card progress', error);
    return [];
  }
  return (data ?? []).map(dbCardProgressToApp);
}

/**
 * Cross-deck due cards for Smart Review: cards whose scheduled review time has
 * arrived, ordered soonest-first, capped. Joins card_progress → cards, so cards
 * the student has NEVER graded (no progress row) are excluded by construction —
 * reviews never flood day one. RLS scopes progress rows to the user.
 */
export async function getDueCards(userId: string, limit = 20): Promise<Flashcard[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }
  const { data, error } = await sb
    .from('card_progress')
    .select('cards(*)')
    .eq('user_id', userId)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(limit);
  if (error) {
    console.error('Error loading due cards', error);
    return [];
  }
  return (data ?? [])
    .map((row) => (row as unknown as { cards: SupabaseCardRow | null }).cards)
    .filter((c): c is SupabaseCardRow => c != null)
    .map(dbCardToApp);
}

/** How many cards are due for review right now (for the home "N due" tile). */
export async function getDueCount(userId: string): Promise<number> {
  if (!isConfigured()) return 0;
  const { count, error } = await sb
    .from('card_progress')
    .select('card_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('next_review_at', new Date().toISOString());
  if (error) {
    console.error('Error loading due count', error);
    return 0;
  }
  return count ?? 0;
}

// ─── Quiz Results ───────────────────────────────────────────────

/** A student's best or latest graded quiz attempt for a deck. */
export interface QuizScore {
  score: number;
  total: number;
  accuracy: number;
  takenAt: string;
}

/**
 * Write one graded quiz attempt. `user_id` is set from the session so the RLS
 * insert policy (auth.uid() = user_id) passes. Returns false when it couldn't
 * persist so the caller can avoid claiming a saved score.
 */
export async function insertQuizResult(args: {
  deckId: string;
  score: number;
  total: number;
  accuracy: number;
  sessionId?: string | null;
}): Promise<boolean> {
  if (!isConfigured()) return false;
  const { data: session } = await sb.auth.getSession();
  const userId = session.session?.user?.id;
  if (!userId) return false;
  const { error } = await sb.from('quiz_results').insert({
    user_id: userId,
    deck_id: args.deckId,
    score: args.score,
    total: args.total,
    accuracy: args.accuracy,
    session_id: args.sessionId ?? null,
  });
  if (error) {
    console.error('insertQuizResult error', error);
    return false;
  }
  return true;
}

/**
 * The student's best quiz attempt for a deck (highest accuracy, then highest
 * score), or null if they haven't taken it. Drives the one-line "Best: 9/10"
 * on the deck page. RLS scopes rows to the current user.
 */
export async function getBestQuizForDeck(deckId: string): Promise<QuizScore | null> {
  if (!isConfigured()) return null;
  const { data, error } = await sb
    .from('quiz_results')
    .select('score, total, accuracy, taken_at')
    .eq('deck_id', deckId)
    .order('accuracy', { ascending: false })
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('getBestQuizForDeck error', error);
    return null;
  }
  if (!data) return null;
  return { score: data.score, total: data.total, accuracy: data.accuracy, takenAt: data.taken_at };
}

// ─── Travel Event Tracking ──────────────────────────────────────

/** Fire-and-forget travel event logging. Never throws. */
export function logTravelEvent(
  feature: string,
  action: string,
  metadata?: Record<string, unknown>,
): void {
  if (!isConfigured()) return;
  void (async () => {
    try {
      const { data: session } = await sb.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) return;
      await sb.from('travel_events').insert({
        user_id: userId,
        feature,
        action,
        metadata: metadata ?? {},
      });
    } catch {
      // Silent — analytics should never break the UX
    }
  })();
}
