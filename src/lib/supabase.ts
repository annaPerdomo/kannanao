"use client";

import { createClient } from "@supabase/supabase-js";
import type { Deck } from "@/types/deck";
import type { Flashcard, JlptLevel } from "@/types/flashcard";
import type { Todo } from "@/types/todo";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "YOUR_SUPABASE_ANON_KEY";

export function isConfigured(): boolean {
  return (
    SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
    SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY" &&
    SUPABASE_URL !== "" &&
    SUPABASE_ANON_KEY !== ""
  );
}

export function showConfigBanner(): void {
  console.warn(
    "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_URL and SUPABASE_ANON_KEY via next.config.ts.",
  );
}

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface SupabaseDeckRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
  user_id: string;
}

interface SupabaseCardRow {
  id: string | number;
  deck_id: string | number;
  word: string;
  reading: string | null;
  meaning: string | null;
  image_url: string | null;
  example_jp: string | null;
  example_en: string | null;
  main_view_mode: "hiragana" | "kanji";
  card_type: "word" | "phrase" | null;
  jlpt_level: JlptLevel | null;
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
    reading: card.reading ?? "",
    meaning: card.meaning ?? "",
    image_query: "",
    example_jp: card.example_jp ?? "",
    example_en: card.example_en ?? "",
    imageUrl: card.image_url ?? undefined,
    mainViewMode: card.main_view_mode ?? "hiragana",
    cardType: card.card_type ?? "word",
    jlptLevel: card.jlpt_level ?? undefined,
  };
}

export function dbDeckToApp(
  deck: SupabaseDeckRow,
  cardCount: number,
  currentUserId: string,
): Deck {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description ?? "",
    createdAt: toNumber(deck.created_at),
    cardCount,
    ownerId: deck.user_id,
    isShared: deck.user_id !== currentUserId,
  };
}

export async function loadDecks(userId: string): Promise<Deck[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  const { data: deckRows, error: deckError } = await sb
    .from("decks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (deckError) {
    console.error("Error loading decks", deckError);
    return [];
  }

  const { data: cardRows, error: cardError } = await sb
    .from("cards")
    .select("*")
    .order("created_at", { ascending: true });
  if (cardError) {
    console.error("Error loading cards", cardError);
    return [];
  }

  const cards = cardRows ?? [];

  return (deckRows ?? []).map((deck) => {
    const deckCards = cards.filter((card) => String(card.deck_id) === deck.id);
    return dbDeckToApp(deck, deckCards.length, userId);
  });
}

export async function dbCreateDeck(
  name: string,
  description?: string,
): Promise<Deck> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error("Supabase is not configured");
  }

  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await sb
    .from("decks")
    .insert({ name, description: description ?? null, user_id: user.id })
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create deck");
  }

  return dbDeckToApp(data, 0, user.id);
}

export async function dbDeleteDeck(id: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error("Supabase is not configured");
  }

  const { error } = await sb.from("decks").delete().eq("id", id);
  if (error) throw error;
}

export async function loadCards(deckId: string): Promise<Flashcard[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  const { data, error } = await sb
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading cards", error);
    return [];
  }

  return (data ?? []).map(dbCardToApp);
}

export async function dbInsertCards(
  deckId: string,
  newCards: Array<Omit<Flashcard, "id">>,
): Promise<Flashcard[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  const rows = newCards.map((card) => ({
    deck_id: deckId,
    word: card.word,
    reading: card.reading || "",
    meaning: card.meaning || "",
    image_url: card.imageUrl || "",
    example_jp: card.example_jp || "",
    example_en: card.example_en || "",
    main_view_mode: card.mainViewMode || "hiragana",
    card_type: card.cardType || "word",
    jlpt_level: card.jlptLevel ?? null,
  }));

  const { data, error } = await sb.from("cards").insert(rows).select("*");

  if (error) throw error;
  return (data ?? []).map(dbCardToApp);
}

export async function dbDeleteCard(cardId: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error("Supabase is not configured");
  }

  const { error } = await sb.from("cards").delete().eq("id", cardId);
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
  if (patch.example_jp !== undefined) payload.example_jp = patch.example_jp;
  if (patch.example_en !== undefined) payload.example_en = patch.example_en;
  if (patch.mainViewMode !== undefined)
    payload.main_view_mode = patch.mainViewMode;
  if (patch.cardType !== undefined) payload.card_type = patch.cardType;
  if (patch.jlptLevel !== undefined) payload.jlpt_level = patch.jlptLevel ?? null;

  if (Object.keys(payload).length === 0) {
    return null;
  }

  const { data, error } = await sb
    .from("cards")
    .update(payload)
    .eq("id", cardId)
    .select()
    .single();

  if (error || !data) {
    console.error("Error updating card", error);
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
    .from("cards")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading all cards", error);
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

  const rows = cards.map((card) => ({
    deck_id: targetDeckId,
    word: card.word,
    reading: card.reading || "",
    meaning: card.meaning || "",
    image_url: card.imageUrl || "",
    example_jp: card.example_jp || "",
    example_en: card.example_en || "",
    main_view_mode: card.mainViewMode ?? 'hiragana',
    card_type: card.cardType ?? 'word',
    jlpt_level: card.jlptLevel ?? null,
  }));

  const { data, error } = await sb.from("cards").insert(rows).select("*");

  if (error) throw error;
  return (data ?? []).map(dbCardToApp);
}

export async function dbRenameDeck(
  id: string,
  name: string,
  description?: string,
): Promise<Deck> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await sb
    .from("decks")
    .update({ name, description: description ?? null })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to rename deck");
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
  const { error } = await sb
    .from("profiles")
    .upsert(payload, { onConflict: "id" });
  if (error) console.error("upsertProfile error", error);
}

export async function loadProfile(userId: string): Promise<{ username: string; displayName: string | null; colorScheme: string | null } | null> {
  const { data, error } = await sb
    .from("profiles")
    .select("username, display_name, color_scheme")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return { username: data.username, displayName: data.display_name ?? null, colorScheme: data.color_scheme ?? null };
}

export async function updateProfileColorScheme(userId: string, colorScheme: string): Promise<void> {
  if (!isConfigured()) { showConfigBanner(); return; }
  const { error } = await sb.from("profiles").update({ color_scheme: colorScheme }).eq("id", userId);
  if (error) console.error("updateProfileColorScheme error", error);
}

// ─── Deck sharing ─────────────────────────────────────────────────────────────

export async function dbShareDeck(
  deckId: string,
  targetUsername: string,
): Promise<{ error: string | null }> {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile, error: lookupError } = await sb
    .from("profiles")
    .select("id")
    .eq("username", targetUsername.trim().toLowerCase())
    .single();

  if (lookupError || !profile) return { error: "User not found" };

  const { error } = await sb
    .from("deck_shares")
    .insert({ deck_id: deckId, shared_with: profile.id, owner_id: user.id });

  if (error) {
    if (error.code === "23505") return { error: "Already shared with this user" };
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
    .from("deck_shares")
    .select("id, shared_with")
    .eq("deck_id", deckId);

  if (error || !shares || shares.length === 0) return [];

  const userIds = shares.map((s: { shared_with: string }) => s.shared_with);
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

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
  const { error } = await sb.from("deck_shares").delete().eq("id", shareId);
  if (error) throw error;
}

// ─── Todos ────────────────────────────────────────────────────────────────────

const TODO_EMOJIS = ['🌸', '⭐', '🦋', '🌈', '💕', '🌺', '🎀', '🍓', '🌙', '✨', '🐝', '🍀'];

function randomTodoEmoji(): string {
  return TODO_EMOJIS[Math.floor(Math.random() * TODO_EMOJIS.length)];
}

interface SupabaseTodoRow {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  emoji: string;
  created_at: string | null;
}

function dbTodoToApp(row: SupabaseTodoRow): Todo {
  return {
    id: row.id,
    userId: row.user_id,
    text: row.text,
    completed: row.completed,
    emoji: row.emoji,
    createdAt: toNumber(row.created_at),
  };
}

export async function loadTodos(userId: string): Promise<Todo[]> {
  if (!isConfigured()) { showConfigBanner(); return []; }
  const { data, error } = await sb
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) { console.error('Error loading todos', error); return []; }
  return (data ?? []).map(dbTodoToApp);
}

export async function dbCreateTodo(text: string): Promise<Todo> {
  if (!isConfigured()) { showConfigBanner(); throw new Error('Supabase not configured'); }
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await sb
    .from('todos')
    .insert({ text, user_id: user.id, completed: false, emoji: randomTodoEmoji() })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Unable to create todo');
  return dbTodoToApp(data);
}

export async function dbUpdateTodo(id: string, patch: Partial<Pick<Todo, 'text' | 'completed' | 'emoji'>>): Promise<Todo> {
  if (!isConfigured()) { showConfigBanner(); throw new Error('Supabase not configured'); }
  const { data, error } = await sb
    .from('todos')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Unable to update todo');
  return dbTodoToApp(data);
}

export async function dbDeleteTodo(id: string): Promise<void> {
  if (!isConfigured()) { showConfigBanner(); throw new Error('Supabase not configured'); }
  const { error } = await sb.from('todos').delete().eq('id', id);
  if (error) throw error;
}
