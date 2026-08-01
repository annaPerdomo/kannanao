// Pure DB-row → app-model mappers and row types. Intentionally free of any
// Supabase client or 'use client' directive so they can run on both the server
// (SSR data fetching) and the client. The browser data layer in `supabase.ts`
// and the server data layer in `serverData.ts` both build on these.

import type { Session } from '@supabase/supabase-js';

import type { Achievement, StudySession, UserProgress } from '@/hooks/useProgress';
import type { Locale } from '@/i18n/config';
import type { Deck } from '@/types/deck';
import type { Flashcard, JlptLevel, MainViewMode } from '@/types/flashcard';
import type { HomeSections } from '@/types/homeSections';
import type { Ohanashikai } from '@/types/ohanashikai';
import type { UserPurchase } from '@/types/shop';
import type { EntryType, Todo } from '@/types/todo';

export type AccountType = 'organizer' | 'member';

/** Server-resolved auth state used to seed the client AuthContext for SSR. */
export interface InitialAuth {
  session: Session | null;
  profile: UserProfile | null;
}

/** Server-resolved progress used to seed ProgressContext. */
export interface InitialProgress {
  progress: UserProgress | null;
  achievements: Achievement[];
  recentSessions: StudySession[];
}

/** Server-resolved shop state used to seed ShopContext. */
export interface InitialShop {
  purchases: UserPurchase[];
  equipped: Record<string, string>;
}

/** Server-resolved home dashboard data, seeded into the home page's hooks. */
export interface HomeData {
  /** Only *pinned* decks — that's all the dashboard renders. */
  decks: Deck[] | null;
  /** Only *pinned* speeches — that's all the dashboard renders. */
  ohanashikais: Ohanashikai[] | null;
  todos: Todo[] | null;
  eventTypes: EntryType[] | null;
  /** Total decks the user has (pinned + unpinned) — drives empty-state copy. */
  totalDeckCount: number;
  /** Total speeches the user has — drives empty-state copy. */
  totalOhanashikaiCount: number;
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
  /** Denormalized, trigger-maintained count of cards in this deck. */
  card_count: number | null;
}

export interface SupabaseCardRow {
  id: string | number;
  deck_id: string | number;
  word: string;
  reading: string | null;
  /** Optional: absent from rows read before the column was added. */
  romaji?: string | null;
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
  /** profiles.review_reminders — the daily review-due push nudge. */
  reviewReminders: boolean;
  /**
   * profiles.locale — the account's explicit UI language, or null for "follow
   * the device". Null is not English: it means the user has never chosen, so the
   * NEXT_LOCALE cookie (landing toggle / Accept-Language) still wins. Only a
   * non-null value out-ranks the cookie, and only at sign-in.
   */
  locale: Locale | null;
  /** profiles.avatar — buddy-face avatar as '<item key>:<variant>', or null for the initial. */
  avatar: string | null;
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
    romaji: card.romaji ?? '',
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

export interface SupabaseTodoRow {
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

export function dbTodoToApp(row: SupabaseTodoRow): Todo {
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

export interface SupabaseEventTypeRow {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
}

export function dbEventTypeToApp(row: SupabaseEventTypeRow): EntryType {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
  };
}

export interface OhanashikaiRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string | null;
  pinned: boolean | null;
  /** Denormalized, trigger-maintained count of lines in this speech. */
  line_count: number | null;
}

export function rowToOhanashikai(
  row: OhanashikaiRow,
  lineCount: number,
  firstLine?: string,
): Ohanashikai {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    lineCount,
    createdAt: toNumber(row.created_at),
    pinned: row.pinned ?? false,
    firstLine,
  };
}

/**
 * Reduces `ohanashikai_lines` rows to one opening line per speech.
 *
 * Takes the lowest `order_index` rather than trusting query order or assuming
 * lines start at 0 — a speech whose first line was deleted starts at 1.
 */
export function pickFirstLines(
  rows: { ohanashikai_id: string; text: string; order_index: number }[],
): Map<string, string> {
  const best = new Map<string, { text: string; order: number }>();
  for (const row of rows) {
    const current = best.get(row.ohanashikai_id);
    if (!current || row.order_index < current.order) {
      best.set(row.ohanashikai_id, { text: row.text, order: row.order_index });
    }
  }
  return new Map([...best].map(([id, v]) => [id, v.text]));
}
