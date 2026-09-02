import { describe, expect, it } from 'vitest';

import {
  buildBinder,
  DEFAULT_FILTERS,
  filterBinderCards,
  hasPhrases,
  jlptLevelsIn,
} from '@/lib/binder';
import type { CardProgress } from '@/lib/supabase';
import type { Deck } from '@/types/deck';
import type { Flashcard } from '@/types/flashcard';

const deck = (id: string): Deck => ({ id, name: `Deck ${id}`, emoji: '📘', cardCount: 3 }) as Deck;

const card = (id: string, deckId: string, overrides: Partial<Flashcard> = {}): Flashcard =>
  ({
    id,
    deckId,
    word: id,
    reading: id,
    meaning: `meaning ${id}`,
    example_jp: '',
    example_en: '',
    cardType: 'word',
    position: 0,
    ...overrides,
  }) as Flashcard;

const row = (cardId: string, overrides: Partial<CardProgress> = {}): CardProgress => ({
  cardId,
  correctCount: 1,
  wrongCount: 0,
  lastReviewedAt: '2026-09-01T00:00:00Z',
  nextReviewAt: '2026-09-02T00:00:00Z',
  intervalDays: 1,
  ease: 2.5,
  ...overrides,
});

const decks = [deck('d1'), deck('d2'), deck('empty')];
const cards = [
  card('inu', 'd1', { reading: 'いぬ', jlptLevel: 'N5', position: 0 }),
  card('neko', 'd1', { reading: 'ねこ', jlptLevel: 'N5', position: 1 }),
  card('arigatou', 'd1', { reading: 'ありがとう', cardType: 'phrase', position: 2 }),
  card('yama', 'd2', { reading: 'やま', jlptLevel: 'N4', position: 0 }),
];
const progress = [
  row('inu', { intervalDays: 8, correctCount: 6, wrongCount: 1 }),
  row('neko', {
    intervalDays: 1,
    correctCount: 1,
    wrongCount: 3,
    lastReviewedAt: '2026-08-01T00:00:00Z',
  }),
];

describe('buildBinder', () => {
  const tabs = buildBinder(decks, cards, progress);

  it('makes a tab per deck that has cards, in deck order', () => {
    expect(tabs.map((t) => t.deck.id)).toEqual(['d1', 'd2']);
  });

  it('counts collected and strong cards per tab', () => {
    expect(tabs[0]).toMatchObject({ collected: 2, strong: 1 });
    expect(tabs[1]).toMatchObject({ collected: 0, strong: 0 });
  });

  it('grades every card off its progress row', () => {
    const byId = Object.fromEntries(tabs[0].cards.map((c) => [c.card.id, c.strength]));
    expect(byId).toEqual({ inu: 'strong', neko: 'learning', arigatou: 'new' });
  });
});

describe('filterBinderCards', () => {
  const all = buildBinder(decks, cards, progress).flatMap((t) => t.cards);
  const ids = (list: ReturnType<typeof filterBinderCards>) => list.map((c) => c.card.id);

  it('keeps everything in lesson order by default', () => {
    expect(ids(filterBinderCards(all, DEFAULT_FILTERS))).toEqual([
      'inu',
      'neko',
      'arigatou',
      'yama',
    ]);
  });

  it('filters by strength, level and type', () => {
    expect(ids(filterBinderCards(all, { ...DEFAULT_FILTERS, strength: 'new' }))).toEqual([
      'arigatou',
      'yama',
    ]);
    expect(ids(filterBinderCards(all, { ...DEFAULT_FILTERS, jlpt: 'N4' }))).toEqual(['yama']);
    expect(ids(filterBinderCards(all, { ...DEFAULT_FILTERS, type: 'phrase' }))).toEqual([
      'arigatou',
    ]);
  });

  it('searches word, reading and meaning, ignoring case', () => {
    expect(ids(filterBinderCards(all, { ...DEFAULT_FILTERS, query: 'ねこ' }))).toEqual(['neko']);
    expect(ids(filterBinderCards(all, { ...DEFAULT_FILTERS, query: 'MEANING YAMA' }))).toEqual([
      'yama',
    ]);
  });

  it('sorts strongest, weakest, most missed and recently practised', () => {
    expect(ids(filterBinderCards(all, { ...DEFAULT_FILTERS, sort: 'strongest' }))[0]).toBe('inu');
    expect(ids(filterBinderCards(all, { ...DEFAULT_FILTERS, sort: 'weakest' })).at(-1)).toBe('inu');
    expect(ids(filterBinderCards(all, { ...DEFAULT_FILTERS, sort: 'missed' }))[0]).toBe('neko');
    expect(ids(filterBinderCards(all, { ...DEFAULT_FILTERS, sort: 'newest' }))[0]).toBe('inu');
  });

  it('sorts by reading in kana order', () => {
    expect(ids(filterBinderCards(all, { ...DEFAULT_FILTERS, sort: 'reading' }))).toEqual([
      'arigatou',
      'inu',
      'neko',
      'yama',
    ]);
  });

  it('only offers the levels and types that exist', () => {
    expect(jlptLevelsIn(all)).toEqual(['N5', 'N4']);
    expect(hasPhrases(all)).toBe(true);
    expect(hasPhrases(all.filter((c) => c.card.cardType === 'word'))).toBe(false);
  });
});
