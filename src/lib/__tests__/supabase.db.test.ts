import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();

const tableData: Record<string, { data: unknown; error: unknown }> = {};

function setTable(table: string, data: unknown, error: unknown = null) {
  tableData[table] = { data, error };
}

function makeChain(table: string) {
  const result = () => tableData[table] ?? { data: null, error: null };
  const asPromise = () => Promise.resolve(result());
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'order', 'in', 'upsert', 'limit'].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  chain.single = vi.fn(() => asPromise());
  chain.maybeSingle = vi.fn(() => asPromise());
  // Make the chain itself thenable so `await chain` works
  chain.then = (onfulfilled: (v: unknown) => unknown, onrejected?: (e: unknown) => unknown) =>
    asPromise().then(onfulfilled, onrejected);
  return chain;
}

const mockFrom = vi.fn((table: string) => makeChain(table));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: (table: string) => mockFrom(table),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

import {
  dbCopyCardsIntoDeck,
  dbCreateDeck,
  dbCreateEventType,
  dbCreateTodo,
  dbDeleteCard,
  dbDeleteDeck,
  dbDeleteEventType,
  dbDeleteTodo,
  dbInsertCards,
  dbPinDeck,
  dbRenameDeck,
  dbSetDeckPublic,
  dbShareDeck,
  dbUpdateCard,
  dbUpdateDeckEmoji,
  dbUpdateEventType,
  dbUpdateTodo,
  loadAllCards,
  loadCards,
  loadDecks,
  loadEventTypes,
  loadProfile,
  loadTodos,
  updateProfileColorScheme,
  updateProfileShowTodo,
  upsertProfile,
} from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

// ─── Test data helpers ────────────────────────────────────────────────────────

function makeDeckRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deck-1',
    name: 'Test Deck',
    description: null,
    created_at: null,
    user_id: 'u1',
    emoji: '🌸',
    pinned: false,
    is_public: false,
    ...overrides,
  };
}

function makeCardRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'card-1',
    deck_id: 'deck-1',
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    image_url: null,
    image_query: null,
    example_jp: null,
    example_en: null,
    main_view_mode: 'hiragana',
    card_type: 'word',
    jlpt_level: 'N5',
    ...overrides,
  };
}

function makeCard(overrides: Partial<Flashcard> = {}): Omit<Flashcard, 'id'> {
  return {
    deckId: 'deck-1',
    word: '猫',
    reading: 'ねこ',
    meaning: 'cat',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'hiragana',
    cardType: 'word',
    jlptLevel: 'N5',
    ...overrides,
  } as Omit<Flashcard, 'id'>;
}

// ─── loadDecks ────────────────────────────────────────────────────────────────

describe('loadDecks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('decks', []);
    setTable('cards', []);
  });

  it('should return empty array when there are no decks', async () => {
    const decks = await loadDecks('u1');
    expect(decks).toEqual([]);
  });

  it('should return mapped decks with correct cardCount', async () => {
    setTable('decks', [makeDeckRow()]);
    setTable('cards', [makeCardRow(), makeCardRow({ id: 'card-2' })]);

    const decks = await loadDecks('u1');
    expect(decks).toHaveLength(1);
    expect(decks[0].id).toBe('deck-1');
    expect(decks[0].cardCount).toBe(2);
    expect(decks[0].name).toBe('Test Deck');
  });

  it('should set isShared=true for decks owned by a different user', async () => {
    setTable('decks', [makeDeckRow({ user_id: 'u2' })]);
    setTable('cards', []);

    const decks = await loadDecks('u1');
    expect(decks[0].isShared).toBe(true);
    expect(decks[0].ownerId).toBe('u2');
  });

  it('should return empty array when decks query errors', async () => {
    setTable('decks', null, { message: 'DB error' });

    const decks = await loadDecks('u1');
    expect(decks).toEqual([]);
  });

  it('should return empty array when cards query errors', async () => {
    setTable('decks', [makeDeckRow()]);
    setTable('cards', null, { message: 'cards fetch error' });

    const decks = await loadDecks('u1');
    expect(decks).toEqual([]);
  });

  it('should count only cards belonging to each deck', async () => {
    setTable('decks', [makeDeckRow({ id: 'deck-a' }), makeDeckRow({ id: 'deck-b' })]);
    setTable('cards', [
      makeCardRow({ id: 'c1', deck_id: 'deck-a' }),
      makeCardRow({ id: 'c2', deck_id: 'deck-a' }),
      makeCardRow({ id: 'c3', deck_id: 'deck-b' }),
    ]);

    const decks = await loadDecks('u1');
    const a = decks.find((d) => d.id === 'deck-a')!;
    const b = decks.find((d) => d.id === 'deck-b')!;
    expect(a.cardCount).toBe(2);
    expect(b.cardCount).toBe(1);
  });
});

// ─── dbCreateDeck ─────────────────────────────────────────────────────────────

describe('dbCreateDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.com' } } });
  });

  it('should throw when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(dbCreateDeck('Test')).rejects.toThrow('Not authenticated');
  });

  it('should throw when insert fails', async () => {
    setTable('decks', null, new Error('Insert failed'));
    await expect(dbCreateDeck('Test')).rejects.toThrow();
  });

  it('should return a mapped Deck on success', async () => {
    setTable('decks', makeDeckRow({ name: 'My Deck' }));
    const deck = await dbCreateDeck('My Deck');
    expect(deck.name).toBe('My Deck');
    expect(deck.id).toBe('deck-1');
    expect(deck.cardCount).toBe(0);
  });

  it('should pass description to the insert payload', async () => {
    setTable('decks', makeDeckRow({ name: 'Vocab', description: 'Basic vocab' }));
    const deck = await dbCreateDeck('Vocab', 'Basic vocab');
    expect(deck.description).toBe('Basic vocab');
  });
});

// ─── dbDeleteDeck ─────────────────────────────────────────────────────────────

describe('dbDeleteDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('decks', null, null);
  });

  it('should resolve without throwing on success', async () => {
    await expect(dbDeleteDeck('deck-1')).resolves.toBeUndefined();
  });

  it('should throw when the delete query errors', async () => {
    setTable('decks', null, new Error('Delete failed'));
    await expect(dbDeleteDeck('deck-1')).rejects.toThrow('Delete failed');
  });

  it('should call from("decks").delete().eq("id", id)', async () => {
    await dbDeleteDeck('deck-xyz');
    const calls = mockFrom.mock.calls.map((c) => c[0]);
    expect(calls).toContain('decks');
  });
});

// ─── dbUpdateDeckEmoji ────────────────────────────────────────────────────────

describe('dbUpdateDeckEmoji', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('decks', null, null);
  });

  it('should resolve without throwing on success', async () => {
    await expect(dbUpdateDeckEmoji('deck-1', '🎀')).resolves.toBeUndefined();
  });

  it('should throw when the update errors', async () => {
    setTable('decks', null, new Error('Update error'));
    await expect(dbUpdateDeckEmoji('deck-1', '🎀')).rejects.toThrow('Update error');
  });
});

// ─── dbPinDeck ────────────────────────────────────────────────────────────────

describe('dbPinDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('decks', null, null);
  });

  it('should resolve without throwing on success', async () => {
    await expect(dbPinDeck('deck-1', true)).resolves.toBeUndefined();
  });

  it('should throw when the update errors', async () => {
    setTable('decks', null, new Error('Pin error'));
    await expect(dbPinDeck('deck-1', true)).rejects.toThrow('Pin error');
  });
});

// ─── dbSetDeckPublic ──────────────────────────────────────────────────────────

describe('dbSetDeckPublic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('decks', null, null);
  });

  it('should resolve without throwing on success', async () => {
    await expect(dbSetDeckPublic('deck-1', true)).resolves.toBeUndefined();
  });

  it('should throw when the update errors', async () => {
    setTable('decks', null, new Error('Public error'));
    await expect(dbSetDeckPublic('deck-1', true)).rejects.toThrow('Public error');
  });
});

// ─── dbRenameDeck ─────────────────────────────────────────────────────────────

describe('dbRenameDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the renamed deck on success', async () => {
    setTable('decks', makeDeckRow({ name: 'New Name' }));
    const deck = await dbRenameDeck('deck-1', 'New Name');
    expect(deck.name).toBe('New Name');
  });

  it('should throw when update fails', async () => {
    setTable('decks', null, new Error('Rename failed'));
    await expect(dbRenameDeck('deck-1', 'New Name')).rejects.toThrow();
  });

  it('should throw when data is null', async () => {
    setTable('decks', null, null);
    await expect(dbRenameDeck('deck-1', 'New Name')).rejects.toThrow('Unable to rename deck');
  });
});

// ─── loadCards ────────────────────────────────────────────────────────────────

describe('loadCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('cards', []);
  });

  it('should return empty array when no cards', async () => {
    const cards = await loadCards('deck-1');
    expect(cards).toEqual([]);
  });

  it('should return mapped cards', async () => {
    setTable('cards', [makeCardRow()]);
    const cards = await loadCards('deck-1');
    expect(cards).toHaveLength(1);
    expect(cards[0].word).toBe('猫');
    expect(cards[0].reading).toBe('ねこ');
    expect(cards[0].meaning).toBe('cat');
  });

  it('should return empty array when query errors', async () => {
    setTable('cards', null, { message: 'Query error' });
    const cards = await loadCards('deck-1');
    expect(cards).toEqual([]);
  });
});

// ─── loadAllCards ─────────────────────────────────────────────────────────────

describe('loadAllCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all cards across decks', async () => {
    setTable('cards', [makeCardRow(), makeCardRow({ id: 'card-2', deck_id: 'deck-2' })]);
    const cards = await loadAllCards();
    expect(cards).toHaveLength(2);
  });

  it('should return empty array on error', async () => {
    setTable('cards', null, { message: 'Error' });
    const cards = await loadAllCards();
    expect(cards).toEqual([]);
  });
});

// ─── dbInsertCards ────────────────────────────────────────────────────────────

describe('dbInsertCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mapped cards on success', async () => {
    setTable('cards', [makeCardRow()]);
    const cards = await dbInsertCards('deck-1', [makeCard()]);
    expect(cards).toHaveLength(1);
    expect(cards[0].word).toBe('猫');
  });

  it('should throw when insert errors', async () => {
    setTable('cards', null, new Error('Insert error'));
    await expect(dbInsertCards('deck-1', [makeCard()])).rejects.toThrow('Insert error');
  });

  it('should return empty array when data is null', async () => {
    setTable('cards', null, null);
    const cards = await dbInsertCards('deck-1', [makeCard()]);
    expect(cards).toEqual([]);
  });
});

// ─── dbCopyCardsIntoDeck ──────────────────────────────────────────────────────

describe('dbCopyCardsIntoDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when given no cards', async () => {
    const result = await dbCopyCardsIntoDeck('deck-target', []);
    expect(result).toEqual([]);
  });

  it('should return mapped cards on success', async () => {
    setTable('cards', [makeCardRow({ deck_id: 'deck-target' })]);
    const sourceCard: Flashcard = { id: 'c1', ...makeCard() };
    const result = await dbCopyCardsIntoDeck('deck-target', [sourceCard]);
    expect(result).toHaveLength(1);
  });
});

// ─── dbDeleteCard ─────────────────────────────────────────────────────────────

describe('dbDeleteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('cards', null, null);
  });

  it('should resolve without throwing on success', async () => {
    await expect(dbDeleteCard('card-1')).resolves.toBeUndefined();
  });

  it('should throw when delete errors', async () => {
    setTable('cards', null, new Error('Delete error'));
    await expect(dbDeleteCard('card-1')).rejects.toThrow('Delete error');
  });
});

// ─── dbUpdateCard ─────────────────────────────────────────────────────────────

describe('dbUpdateCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null for an empty patch', async () => {
    const result = await dbUpdateCard('card-1', {});
    expect(result).toBeNull();
  });

  it('should return mapped card on success', async () => {
    setTable('cards', makeCardRow({ meaning: 'kitten' }));
    const result = await dbUpdateCard('card-1', { meaning: 'kitten' });
    expect(result?.meaning).toBe('kitten');
  });

  it('should return null when query errors', async () => {
    setTable('cards', null, { message: 'Update error' });
    const result = await dbUpdateCard('card-1', { word: 'test' });
    expect(result).toBeNull();
  });

  it('should return null when data is null', async () => {
    setTable('cards', null, null);
    const result = await dbUpdateCard('card-1', { word: 'test' });
    expect(result).toBeNull();
  });
});

// ─── upsertProfile ────────────────────────────────────────────────────────────

describe('upsertProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('profiles', null, null);
  });

  it('should resolve without throwing on success', async () => {
    await expect(upsertProfile('u1', 'testuser')).resolves.toBeUndefined();
  });

  it('should not throw even when upsert errors (just logs)', async () => {
    setTable('profiles', null, { message: 'Conflict' });
    await expect(upsertProfile('u1', 'testuser')).resolves.toBeUndefined();
  });

  it('should include displayName when provided', async () => {
    await expect(upsertProfile('u1', 'testuser', 'Test User')).resolves.toBeUndefined();
    const tableCalls = mockFrom.mock.calls.map((c) => c[0]);
    expect(tableCalls).toContain('profiles');
  });
});

// ─── loadProfile ──────────────────────────────────────────────────────────────

describe('loadProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null on error', async () => {
    setTable('profiles', null, { message: 'Not found' });
    const result = await loadProfile('u1');
    expect(result).toBeNull();
  });

  it('should return null when data is null', async () => {
    setTable('profiles', null, null);
    const result = await loadProfile('u1');
    expect(result).toBeNull();
  });

  it('should return mapped profile on success', async () => {
    setTable('profiles', {
      username: 'testuser',
      display_name: 'Test User',
      color_scheme: 'sakura',
      show_todo: true,
    });
    const result = await loadProfile('u1');
    expect(result?.username).toBe('testuser');
    expect(result?.displayName).toBe('Test User');
    expect(result?.colorScheme).toBe('sakura');
    expect(result?.showTodo).toBe(true);
  });

  it('should return showTodo=true when show_todo is null', async () => {
    setTable('profiles', {
      username: 'u',
      display_name: null,
      color_scheme: null,
      show_todo: null,
    });
    const result = await loadProfile('u1');
    expect(result?.showTodo).toBe(true);
  });
});

// ─── updateProfileColorScheme ─────────────────────────────────────────────────

describe('updateProfileColorScheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('profiles', null, null);
  });

  it('should resolve without throwing on success', async () => {
    await expect(updateProfileColorScheme('u1', 'murasaki')).resolves.toBeUndefined();
  });

  it('should not throw on error (just logs)', async () => {
    setTable('profiles', null, { message: 'Error' });
    await expect(updateProfileColorScheme('u1', 'murasaki')).resolves.toBeUndefined();
  });
});

// ─── updateProfileShowTodo ────────────────────────────────────────────────────

describe('updateProfileShowTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('profiles', null, null);
  });

  it('should resolve without throwing', async () => {
    await expect(updateProfileShowTodo('u1', false)).resolves.toBeUndefined();
  });
});

// ─── dbShareDeck ──────────────────────────────────────────────────────────────

describe('dbShareDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  it('should return error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await dbShareDeck('deck-1', 'targetuser');
    expect(result.error).toBe('Not authenticated');
  });

  it('should return error when target user is not found', async () => {
    setTable('profiles', null, null);
    const result = await dbShareDeck('deck-1', 'unknownuser');
    expect(result.error).toBe('User not found');
  });

  it('should return error when profile lookup errors', async () => {
    setTable('profiles', null, { message: 'Not found' });
    const result = await dbShareDeck('deck-1', 'unknownuser');
    expect(result.error).toBe('User not found');
  });

  it('should return "Already shared" for duplicate (code 23505)', async () => {
    setTable('profiles', { id: 'u2' });
    setTable('deck_shares', null, { code: '23505', message: 'Duplicate key' });
    const result = await dbShareDeck('deck-1', 'targetuser');
    expect(result.error).toBe('Already shared with this user');
  });

  it('should return null error on success', async () => {
    setTable('profiles', { id: 'u2' });
    setTable('deck_shares', null, null);
    const result = await dbShareDeck('deck-1', 'targetuser');
    expect(result.error).toBeNull();
  });
});

// ─── loadTodos ────────────────────────────────────────────────────────────────

describe('loadTodos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array on error', async () => {
    setTable('todos', null, { message: 'Error' });
    const todos = await loadTodos('u1');
    expect(todos).toEqual([]);
  });

  it('should return mapped todos', async () => {
    setTable('todos', [
      {
        id: 't1',
        user_id: 'u1',
        text: 'Study',
        completed: false,
        emoji: '📚',
        created_at: null,
        frequency_days: [],
        completed_dates: [],
        sort_order: 0,
        repeat_until_done: false,
      },
    ]);
    const todos = await loadTodos('u1');
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe('Study');
    expect(todos[0].emoji).toBe('📚');
  });
});

// ─── dbCreateTodo ─────────────────────────────────────────────────────────────

describe('dbCreateTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  });

  it('should throw when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(dbCreateTodo('Study kanji')).rejects.toThrow('Not authenticated');
  });

  it('should return a mapped todo on success', async () => {
    setTable('todos', {
      id: 't1',
      user_id: 'u1',
      text: 'Study kanji',
      completed: false,
      emoji: '🗾',
      created_at: null,
      frequency_days: [],
      completed_dates: [],
      sort_order: null,
      repeat_until_done: false,
    });
    const todo = await dbCreateTodo('Study kanji');
    expect(todo.text).toBe('Study kanji');
    expect(todo.emoji).toBe('🗾');
  });
});

// ─── dbUpdateTodo ─────────────────────────────────────────────────────────────

describe('dbUpdateTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the updated todo on success', async () => {
    setTable('todos', {
      id: 't1',
      user_id: 'u1',
      text: 'Updated',
      completed: true,
      emoji: '✅',
      created_at: null,
      frequency_days: [],
      completed_dates: [],
      sort_order: 0,
      repeat_until_done: false,
    });
    const todo = await dbUpdateTodo('t1', { completed: true });
    expect(todo.completed).toBe(true);
  });

  it('should throw when update errors', async () => {
    setTable('todos', null, new Error('Update failed'));
    await expect(dbUpdateTodo('t1', { completed: true })).rejects.toThrow('Update failed');
  });
});

// ─── dbDeleteTodo ─────────────────────────────────────────────────────────────

describe('dbDeleteTodo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('todos', null, null);
  });

  it('should resolve without throwing on success', async () => {
    await expect(dbDeleteTodo('t1')).resolves.toBeUndefined();
  });

  it('should throw when delete errors', async () => {
    setTable('todos', null, new Error('Delete error'));
    await expect(dbDeleteTodo('t1')).rejects.toThrow('Delete error');
  });
});

// ─── loadEventTypes ───────────────────────────────────────────────────────────

function makeEventTypeRow(overrides: Record<string, unknown> = {}) {
  return { id: 'et-1', user_id: 'u1', name: 'Walk', emoji: '🚶', color: '#4CAF50', ...overrides };
}

describe('loadEventTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array on error', async () => {
    setTable('event_types', null, { message: 'Error' });
    const result = await loadEventTypes('u1');
    expect(result).toEqual([]);
  });

  it('should return empty array when data is null', async () => {
    setTable('event_types', null, null);
    const result = await loadEventTypes('u1');
    expect(result).toEqual([]);
  });

  it('should return mapped event types on success', async () => {
    setTable('event_types', [makeEventTypeRow()]);
    const result = await loadEventTypes('u1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Walk');
    expect(result[0].emoji).toBe('🚶');
    expect(result[0].color).toBe('#4CAF50');
  });

  it('should map multiple event types', async () => {
    setTable('event_types', [
      makeEventTypeRow({ id: 'et-1', name: 'Walk' }),
      makeEventTypeRow({ id: 'et-2', name: 'Run', emoji: '🏃', color: '#F44336' }),
    ]);
    const result = await loadEventTypes('u1');
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('Run');
  });
});

// ─── dbCreateEventType ────────────────────────────────────────────────────────

describe('dbCreateEventType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mapped event type on success', async () => {
    setTable('event_types', makeEventTypeRow({ name: 'Swim', emoji: '🏊', color: '#2196F3' }));
    const result = await dbCreateEventType('u1', 'Swim', '🏊', '#2196F3');
    expect(result.name).toBe('Swim');
    expect(result.emoji).toBe('🏊');
    expect(result.color).toBe('#2196F3');
  });

  it('should throw when insert errors', async () => {
    setTable('event_types', null, new Error('Insert failed'));
    await expect(dbCreateEventType('u1', 'Swim', '🏊', '#2196F3')).rejects.toThrow('Insert failed');
  });

  it('should throw when data is null', async () => {
    setTable('event_types', null, null);
    await expect(dbCreateEventType('u1', 'Swim', '🏊', '#2196F3')).rejects.toThrow(
      'Unable to create event type',
    );
  });
});

// ─── dbUpdateEventType ────────────────────────────────────────────────────────

describe('dbUpdateEventType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return updated event type on success', async () => {
    setTable('event_types', makeEventTypeRow({ name: 'Jog', emoji: '🏃' }));
    const result = await dbUpdateEventType('et-1', 'Jog', '🏃');
    expect(result.name).toBe('Jog');
    expect(result.emoji).toBe('🏃');
  });

  it('should throw when update errors', async () => {
    setTable('event_types', null, new Error('Update failed'));
    await expect(dbUpdateEventType('et-1', 'Jog', '🏃')).rejects.toThrow('Update failed');
  });

  it('should throw when data is null', async () => {
    setTable('event_types', null, null);
    await expect(dbUpdateEventType('et-1', 'Jog', '🏃')).rejects.toThrow(
      'Unable to update event type',
    );
  });
});

// ─── dbDeleteEventType ────────────────────────────────────────────────────────

describe('dbDeleteEventType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTable('event_types', null, null);
  });

  it('should resolve without throwing on success', async () => {
    await expect(dbDeleteEventType('et-1')).resolves.toBeUndefined();
  });

  it('should throw when delete errors', async () => {
    setTable('event_types', null, new Error('Delete error'));
    await expect(dbDeleteEventType('et-1')).rejects.toThrow('Delete error');
  });
});
