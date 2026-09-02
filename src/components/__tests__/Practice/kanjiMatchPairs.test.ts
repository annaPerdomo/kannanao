import { describe, expect, it } from 'vitest';

import { kanjiMatchPairs } from '@/components/Practice/KanjiMatchMode/pairs';
import type { CardStrength } from '@/lib/cardStrength';
import type { Flashcard } from '@/types/flashcard';

function card(id: string, word: string, reading: string): Flashcard {
  return {
    id,
    deckId: 'deck-1',
    word,
    reading,
    meaning: 'meaning',
    image_query: '',
    example_jp: '',
    example_en: '',
    mainViewMode: 'kanji',
    cardType: 'word',
    position: 0,
  };
}

describe('kanjiMatchPairs', () => {
  it('pairs a card word against its reading', () => {
    expect(kanjiMatchPairs([card('c1', '猫', 'ねこ')])[0]).toMatchObject({
      key: 'c1',
      left: '猫',
      right: 'ねこ',
      cardId: 'c1',
    });
  });

  it('skips cards that print their own answer', () => {
    const pairs = kanjiMatchPairs([
      card('k1', '猫', 'ねこ'),
      card('a1', 'ねこ', 'ねこ'),
      card('a2', 'テレビ', ''),
      card('a3', '犬', '犬'),
    ]);

    expect(pairs.map((p) => p.cardId)).toEqual(['k1']);
  });

  it('never puts two cards with the same reading in the deal', () => {
    const pairs = kanjiMatchPairs([
      card('c1', '作る', 'つくる'),
      card('c2', '造る', 'つくる'),
      card('c3', '走る', 'はしる'),
    ]);

    expect(pairs.map((p) => p.cardId)).toEqual(['c1', 'c3']);
  });

  it('leads with the cards the SRS says are being missed', () => {
    const cards = [card('c1', '山', 'やま'), card('c2', '川', 'かわ'), card('c3', '空', 'そら')];
    const strength: Record<string, CardStrength> = { c1: 'strong', c2: 'new', c3: 'learning' };

    expect(kanjiMatchPairs(cards, (id) => strength[id]).map((p) => p.cardId)).toEqual([
      'c3',
      'c2',
      'c1',
    ]);
  });

  // A round of unrelated readings is answerable without reading anything.
  it('deals look-alike readings next to each other', () => {
    const pairs = kanjiMatchPairs([
      card('c1', '山', 'やま'),
      card('c2', '家', 'いえ'),
      card('c3', '山道', 'やまみち'),
    ]);

    expect(pairs.map((p) => p.cardId)).toEqual(['c1', 'c3', 'c2']);
  });

  // Clustering reorders the whole list, so a limit applied after would deal the
  // weak cards straight out of the session.
  it('keeps the weakest cards in a limited session', () => {
    const weak = [card('w1', '山', 'やま'), card('w2', '川', 'かわ')];
    const strong = Array.from({ length: 20 }, (_, i) =>
      card(`s${i}`, `語${i}`, `やまみち${'ん'.repeat(i)}`),
    );
    const strengthOf = (id: string): CardStrength => (id.startsWith('w') ? 'learning' : 'strong');

    const dealt = kanjiMatchPairs([...strong, ...weak], strengthOf, 6).map((p) => p.cardId);

    expect(dealt).toHaveLength(6);
    expect(dealt).toContain('w1');
    expect(dealt).toContain('w2');
  });

  it('leaves the read-aloud button off — hearing one tile hands over the match', () => {
    const [pair] = kanjiMatchPairs([card('c1', '猫', 'ねこ')]);

    expect(pair.leftSpeak).toBeUndefined();
    expect(pair.rightSpeak).toBeUndefined();
  });

  it('returns nothing for a deck with no kanji at all', () => {
    expect(kanjiMatchPairs([card('a1', 'ねこ', 'ねこ'), card('a2', 'いぬ', 'いぬ')])).toEqual([]);
  });
});
