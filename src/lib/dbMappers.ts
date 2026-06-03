// Pure DB-row → app-model mappers and row types. Intentionally free of any
// Supabase client or 'use client' directive so they can run on both the server
// (SSR data fetching) and the client. The browser data layer in `supabase.ts`
// and the server data layer in `serverData.ts` both build on these.

import type { Session } from '@supabase/supabase-js';

import type { Deck } from '@/types/deck';
import type { Flashcard, JlptLevel, MainViewMode } from '@/types/flashcard';
import type { HomeSections } from '@/types/homeSections';

export type AccountType = 'organizer' | 'member';

/** Server-resolved auth state used to seed the client AuthContext for SSR. */
export interface InitialAuth {
  session: Session | null;
  profile: UserProfile | null;
}

export interface SupabaseDeckRow {
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

export interface SupabaseCardRow {
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

/** App-shaped user profile, returned by both the client and server profile loaders. */
export interface UserProfile {
  username: string;
  displayName: string | null;
  colorScheme: string | null;
  showTodo: boolean;
  homeSections: Partial<HomeSections> | null;
  accountType: AccountType;
  organizerId: string | null;
  groupId: string | null;
  groupShowLeaderboard: boolean;
  travelMainViewMode: string | null;
}

export function toNumber(value: string | null): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
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
