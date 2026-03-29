'use client';

import { createClient } from '@supabase/supabase-js';
import type { Deck } from '@/types/deck';
import type { Flashcard } from '@/types/flashcard';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

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
}

interface SupabaseCardRow {
  id: string | number;
  deck_id: string | number;
  word: string;
  reading: string | null;
  meaning: string | null;
  image_query: string | null;
  image_url: string | null;
  example_jp: string | null;
  example_en: string | null;
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
  };
}

export function dbDeckToApp(deck: SupabaseDeckRow, cardCount: number): Deck {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description ?? '',
    createdAt: toNumber(deck.created_at),
    cardCount,
  };
}

export async function loadDecks(): Promise<Deck[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  const { data: deckRows, error: deckError } = await sb
    .from('decks')
    .select('*')
    .order('created_at', { ascending: true });
  if (deckError) {
    console.error('Error loading decks', deckError);
    return [];
  }

  const { data: cardRows, error: cardError } = await sb
    .from('cards')
    .select('*')
    .order('created_at', { ascending: true });
  if (cardError) {
    console.error('Error loading cards', cardError);
    return [];
  }

  const cards = cardRows ?? [];

  return (deckRows ?? []).map((deck) => {
    const deckCards = cards.filter((card) => String(card.deck_id) === deck.id);
    return dbDeckToApp(deck, deckCards.length);
  });
}

export async function dbCreateDeck(
  name: string,
  description?: string,
): Promise<Deck> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await sb
    .from('decks')
    .insert({ name, description: description ?? null })
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error('Unable to create deck');
  }

  return dbDeckToApp(data, 0);
}

export async function dbDeleteDeck(id: string): Promise<void> {
  if (!isConfigured()) {
    showConfigBanner();
    throw new Error('Supabase is not configured');
  }

  const { error } = await sb.from('decks').delete().eq('id', id);
  if (error) throw error;
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
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading cards', error);
    return [];
  }

  return (data ?? []).map(dbCardToApp);
}

export async function dbInsertCards(
  deckId: string,
  newCards: Array<Omit<Flashcard, 'id'>>,
): Promise<Flashcard[]> {
  if (!isConfigured()) {
    showConfigBanner();
    return [];
  }

  const rows = newCards.map((card) => ({
    deck_id: deckId,
    word: card.word,
    reading: card.reading || '',
    meaning: card.meaning || '',
    image_query: card.image_query || '',
    image_url: card.imageUrl || '',
    example_jp: card.example_jp || '',
    example_en: card.example_en || '',
  }));

  const { data, error } = await sb
    .from('cards')
    .insert(rows)
    .select('*');

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
  if (patch.image_query !== undefined) payload.image_query = patch.image_query;
  if (patch.imageUrl !== undefined) payload.image_url = patch.imageUrl;
  if (patch.example_jp !== undefined) payload.example_jp = patch.example_jp;
  if (patch.example_en !== undefined) payload.example_en = patch.example_en;

  if (Object.keys(payload).length === 0) {
    return null;
  }

  const { data, error } = await sb
    .from('cards')
    .update(payload)
    .eq('id', cardId)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating card', error);
    return null;
  }

  return dbCardToApp(data);
}
