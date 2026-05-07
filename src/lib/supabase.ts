'use client';

import { createClient } from '@supabase/supabase-js';

import type { Deck } from '@/types/deck';
import type { Flashcard, JlptLevel, MainViewMode } from '@/types/flashcard';
import type { EntryType, Todo } from '@/types/todo';
import type { ShowCard, ShowCardCategory } from '@/types/travel';

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

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface SupabaseDeckRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
  user_id: string;
  emoji: string | null;
  pinned: boolean | null;
  is_public: boolean | null;
  position: number;
}

interface SupabaseCardRow {
  id: string | number;
  deck_id: string | number;
  word: string;
  reading: string | null;
  meaning: string | null;
  image_url: string | null;
  image_query: string | null;
  example_jp: string | null;
  example_en: string | null;
  main_view_mode: MainViewMode;
  card_type: 'word' | 'phrase' | null;
  jlpt_level: JlptLevel | null;
  position: number;
}

function toNumber(value: string | null): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function dbCardToApp(card: SupabaseCardRow): Flashcard {
  return {
    id: String(card.id),
    deckId: String(card.deck_id),
    word: card.word,
    reading: card.reading ?? '',
    meaning: card.meaning ?? '',
    image_query: card.image_query ?? '',
    example_jp: card.example_jp ?? '',
    example_en: card.example_en ?? '',
    imageUrl: card.image_url ?? undefined,
    mainViewMode: card.main_view_mode ?? 'hiragana',
    cardType: card.card_type ?? 'word',
    jlptLevel: card.jlpt_level ?? undefined,
    position: card.position ?? 0,
  };
}

export function dbDeckToApp(deck: SupabaseDeckRow, cardCount: number, currentUserId: string): Deck {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description ?? '',
    createdAt: toNumber(deck.created_at),
    cardCount,
    ownerId: deck.user_id,
    isShared: deck.user_id !== currentUserId,
    emoji: deck.emoji ?? '',
    pinned: deck.pinned ?? false,
    isPublic: deck.is_public ?? false,
    position: deck.position ?? 0,
  };
}

export async function loadDecks(userId: string): Promise<Deck[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  // Fetch user's own decks
  const { data: deckRows, error: deckError } = await sb
    .from('decks')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (deckError) {
    console.error('Error loading decks', deckError);
    return [];
  }

  // Fetch decks assigned to this user (member viewing organizer's decks)
  const { data: assignedRows } = await sb
    .from('assignments')
    .select('deck_id')
    .eq('member_id', userId);

  const ownDeckIds = new Set((deckRows ?? []).map((d) => d.id));
  const assignedDeckIds = (assignedRows ?? [])
    .map((a) => a.deck_id as string)
    .filter((id) => !ownDeckIds.has(id));

  let assignedDecks: typeof deckRows = [];
  if (assignedDeckIds.length > 0) {
    const { data } = await sb.from('decks').select('*').in('id', assignedDeckIds);
    assignedDecks = data ?? [];
  }

  const allDecks = [...(deckRows ?? []), ...assignedDecks];
  const allDeckIds = allDecks.map((d) => d.id);

  const { data: cardRows, error: cardError } = await sb
    .from('cards')
    .select('*')
    .in('deck_id', allDeckIds)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (cardError) {
    console.error('Error loading cards', cardError);
    return [];
  }

  const cards = cardRows ?? [];

  return allDecks.map((deck) => {
    const deckCards = cards.filter((card) => String(card.deck_id) === deck.id);
    return dbDeckToApp(deck, deckCards.length, userId);
  });
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
    .single();
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
  const updates = orderedIds.map((id, index) =>
    sb.from('decks').update({ position: index }).eq('id', id),
  );
  await Promise.all(updates);
}

export async function dbReorderCards(orderedIds: string[]): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase not configured');
  }
  const updates = orderedIds.map((id, index) =>
    sb.from('cards').update({ position: index }).eq('id', id),
  );
  await Promise.all(updates);
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
    .single();
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
    .single();
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

export type AccountType = 'organizer' | 'member';

export async function loadProfile(userId: string): Promise<{
  username: string;
  displayName: string | null;
  colorScheme: string | null;
  showTodo: boolean;
  accountType: AccountType;
  organizerId: string | null;
  groupId: string | null;
  travelMainViewMode: string | null;
} | null> {
  const { data, error } = await sb
    .from('profiles')
    .select(
      'username, display_name, color_scheme, show_todo, account_type, organizer_id, group_id, travel_main_view_mode',
    )
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return {
    username: data.username,
    displayName: data.display_name ?? null,
    colorScheme: data.color_scheme ?? null,
    showTodo: data.show_todo !== false,
    accountType: (data.account_type as AccountType) ?? 'organizer',
    organizerId: data.organizer_id ?? null,
    groupId: data.group_id ?? null,
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

interface SupabaseTodoRow {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  emoji: string;
  created_at: string | null;
  frequency_days: number[] | null;
  completed_dates: string[] | null;
  sort_order: number | null;
  repeat_until_done: boolean | null;
}

interface SupabaseEventTypeRow {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
}

function dbEventTypeToApp(row: SupabaseEventTypeRow): EntryType {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
  };
}

function dbTodoToApp(row: SupabaseTodoRow): Todo {
  return {
    id: row.id,
    userId: row.user_id,
    text: row.text,
    completed: row.completed,
    emoji: row.emoji,
    createdAt: toNumber(row.created_at),
    frequencyDays: row.frequency_days ?? [],
    completedDates: row.completed_dates ?? [],
    sortOrder: row.sort_order ?? 0,
    repeatUntilDone: row.repeat_until_done ?? false,
  };
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
