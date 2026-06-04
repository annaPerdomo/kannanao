import { describe, expect, it, vi } from 'vitest';

// Mock the Supabase client before importing the module under test.
// lib/supabase.ts now builds its client with @supabase/ssr's createBrowserClient.
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockReturnThis(),
    })),
  })),
}));

import { dbCardToApp, dbDeckToApp } from '@/lib/supabase';

// ─── dbCardToApp ──────────────────────────────────────────────────────────────

describe('dbCardToApp', () => {
  it('should map all snake_case fields to camelCase correctly', () => {
    const row = {
      id: 'card-1',
      deck_id: 'deck-1',
      word: '猫',
      reading: 'ねこ',
      meaning: 'cat',
      image_url: 'https://example.com/cat.jpg',
      image_query: 'cat photo',
      example_jp: '{猫|ねこ}が好きです',
      example_en: 'I like cats',
      main_view_mode: 'hiragana' as const,
      card_type: 'word' as const,
      jlpt_level: 'N5' as const,
      position: 0,
    };

    const card = dbCardToApp(row);

    expect(card.id).toBe('card-1');
    expect(card.deckId).toBe('deck-1');
    expect(card.word).toBe('猫');
    expect(card.reading).toBe('ねこ');
    expect(card.meaning).toBe('cat');
    expect(card.imageUrl).toBe('https://example.com/cat.jpg');
    expect(card.image_query).toBe('cat photo');
    expect(card.example_jp).toBe('{猫|ねこ}が好きです');
    expect(card.example_en).toBe('I like cats');
    expect(card.mainViewMode).toBe('hiragana');
    expect(card.cardType).toBe('word');
    expect(card.jlptLevel).toBe('N5');
  });

  it('should handle null optional fields gracefully', () => {
    const row = {
      id: 42,
      deck_id: 10,
      word: 'hello',
      reading: null,
      meaning: null,
      image_url: null,
      image_query: null,
      example_jp: null,
      example_en: null,
      main_view_mode: 'kanji' as const,
      card_type: null,
      jlpt_level: null,
      position: 0,
    };

    const card = dbCardToApp(row);

    expect(card.id).toBe('42');
    expect(card.deckId).toBe('10');
    expect(card.reading).toBe('');
    expect(card.meaning).toBe('');
    expect(card.imageUrl).toBeUndefined();
    expect(card.image_query).toBe('');
    expect(card.example_jp).toBe('');
    expect(card.example_en).toBe('');
    expect(card.mainViewMode).toBe('kanji');
    expect(card.cardType).toBe('word'); // fallback
    expect(card.jlptLevel).toBeUndefined();
  });

  it('should coerce numeric id and deck_id to strings', () => {
    const row = {
      id: 99,
      deck_id: 77,
      word: 'test',
      reading: null,
      meaning: null,
      image_url: null,
      image_query: null,
      example_jp: null,
      example_en: null,
      main_view_mode: 'hiragana' as const,
      card_type: 'word' as const,
      jlpt_level: null,
      position: 0,
    };

    const card = dbCardToApp(row);
    expect(typeof card.id).toBe('string');
    expect(typeof card.deckId).toBe('string');
  });
});

it('should handle phrase card type correctly', () => {
  const row = {
    id: 'c3',
    deck_id: 'deck-1',
    word: 'お元気ですか',
    reading: 'おげんきですか',
    meaning: 'How are you?',
    image_url: null,
    image_query: null,
    example_jp: null,
    example_en: null,
    main_view_mode: 'kanji' as const,
    card_type: 'phrase' as const,
    jlpt_level: 'N5' as const,
    position: 0,
  };

  const card = dbCardToApp(row);
  expect(card.cardType).toBe('phrase');
  expect(card.jlptLevel).toBe('N5');
  expect(card.mainViewMode).toBe('kanji');
});

it('should map all JLPT levels correctly', () => {
  const levels = ['N1', 'N2', 'N3', 'N4', 'N5'] as const;
  levels.forEach((level) => {
    const row = {
      id: 'c1',
      deck_id: 'd1',
      word: 'test',
      reading: null,
      meaning: null,
      image_url: null,
      image_query: null,
      example_jp: null,
      example_en: null,
      main_view_mode: 'hiragana' as const,
      card_type: 'word' as const,
      jlpt_level: level,
      position: 0,
    };
    expect(dbCardToApp(row).jlptLevel).toBe(level);
  });
});

// ─── dbDeckToApp ─────────────────────────────────────────────────────────────

describe('dbDeckToApp', () => {
  it('should map all fields correctly', () => {
    const row = {
      id: 'deck-1',
      name: 'JLPT N5',
      description: 'Basic vocabulary',
      created_at: '2024-01-15T10:00:00.000Z',
      user_id: 'user-1',
      emoji: '🌸',
      pinned: true,
      is_public: false,
      position: 0,
      card_count: 12,
    };

    const deck = dbDeckToApp(row, 12, 'user-1');

    expect(deck.id).toBe('deck-1');
    expect(deck.name).toBe('JLPT N5');
    expect(deck.description).toBe('Basic vocabulary');
    expect(deck.cardCount).toBe(12);
    expect(deck.ownerId).toBe('user-1');
    expect(deck.emoji).toBe('🌸');
    expect(deck.pinned).toBe(true);
    expect(deck.isPublic).toBe(false);
    expect(deck.isShared).toBe(false);
    expect(typeof deck.createdAt).toBe('number');
  });

  it('should mark deck as shared when owner differs from current user', () => {
    const row = {
      id: 'deck-2',
      name: 'Shared Deck',
      description: null,
      created_at: null,
      user_id: 'user-other',
      emoji: '🎀',
      pinned: null,
      is_public: null,
      position: 0,
    };

    const deck = dbDeckToApp(row, 5, 'user-me');
    expect(deck.isShared).toBe(true);
  });

  it('should handle null optional fields with defaults', () => {
    const row = {
      id: 'deck-3',
      name: 'Empty',
      description: null,
      created_at: null,
      user_id: 'user-1',
      emoji: null,
      pinned: null,
      is_public: null,
      position: 0,
    };

    const deck = dbDeckToApp(row, 0, 'user-1');

    expect(deck.description).toBe('');
    expect(deck.pinned).toBe(false);
    expect(deck.isPublic).toBe(false);
    // Null DB emoji means no emoji (empty string)
    expect(deck.emoji).toBe('');
  });

  it('should parse created_at into a numeric timestamp', () => {
    const row = {
      id: 'deck-4',
      name: 'Timestamped',
      description: null,
      created_at: '2024-06-01T00:00:00.000Z',
      user_id: 'user-1',
      emoji: '✨',
      pinned: false,
      is_public: false,
      position: 0,
    };

    const deck = dbDeckToApp(row, 0, 'user-1');
    expect(deck.createdAt).toBe(Date.parse('2024-06-01T00:00:00.000Z'));
  });
});
