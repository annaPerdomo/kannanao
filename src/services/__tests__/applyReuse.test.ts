import { describe, expect, it } from 'vitest';

import { applyReuse } from '@/services/cardPipeline';
import type { Flashcard, GeneratedCard } from '@/types/flashcard';

function generated(word: string, over: Partial<GeneratedCard> = {}): GeneratedCard {
  return {
    word,
    reading: 'よみ',
    romaji: 'yomi',
    meaning: 'fresh meaning',
    image_query: 'fresh query',
    example_jp: `{${word}|よみ}です`,
    example_en: 'fresh example',
    card_type: 'word',
    jlpt_level: 'N5',
    ...over,
  } as GeneratedCard;
}

function saved(word: string, over: Partial<Flashcard> = {}): Flashcard {
  return {
    id: `id-${word}`,
    deckId: 'old-deck',
    position: 3,
    word,
    reading: 'ねこ',
    romaji: 'neko',
    meaning: 'the meaning I fixed',
    image_query: 'my query',
    example_jp: 'my sentence',
    example_en: 'my translation',
    imageUrl: 'https://example.com/mine.jpg',
    mainViewMode: 'romaji',
    cardType: 'word',
    ...over,
  } as Flashcard;
}

const match = (word: string, deckName = 'Japanese Level 1', over?: Partial<Flashcard>) =>
  new Map([[word, { card: saved(word, over), deckName }]]);

describe('applyReuse', () => {
  it('should send every word for images when nothing matches', () => {
    const cards = [generated('猫'), generated('犬')];
    const { reused, toFetch } = applyReuse(cards, new Map(), 'deck-1', 'hiragana');

    expect(reused).toEqual([null, null]);
    expect(toFetch).toEqual(cards);
  });

  it('should keep the saved card and never request its image', () => {
    const { reused, toFetch } = applyReuse(
      [generated('猫'), generated('犬')],
      match('猫'),
      'deck-1',
      'hiragana',
    );

    // Only the unmatched word costs an Unsplash call.
    expect(toFetch.map((c) => c.word)).toEqual(['犬']);
    expect(reused[0]).toMatchObject({
      word: '猫',
      meaning: 'the meaning I fixed',
      example_jp: 'my sentence',
      imageUrl: 'https://example.com/mine.jpg',
      reusedFrom: 'Japanese Level 1',
    });
    expect(reused[1]).toBeNull();
  });

  it('should retarget the reused card at the deck being filled', () => {
    const { reused } = applyReuse([generated('猫')], match('猫'), 'new-deck', 'kanji');

    expect(reused[0]).toMatchObject({ deckId: 'new-deck', mainViewMode: 'kanji' });
    // The saved row's own identity must not ride along into the insert.
    expect(reused[0]).not.toHaveProperty('id');
    expect(reused[0]).not.toHaveProperty('position');
  });

  it('should keep the generated card as the fresh alternative', () => {
    const { reused } = applyReuse([generated('猫')], match('猫'), 'deck-1', 'hiragana');

    expect(reused[0]?.freshVersion).toMatchObject({
      word: '猫',
      meaning: 'fresh meaning',
      example_en: 'fresh example',
      deckId: 'deck-1',
    });
    // Reuse is what skipped the lookup, so the alternative has no image.
    expect(reused[0]?.freshVersion?.imageUrl).toBeUndefined();
  });

  it('should mark a match whose deck name could not be read', () => {
    const { reused } = applyReuse([generated('猫')], match('猫', ''), 'deck-1', 'hiragana');

    // Empty, not absent — the row still shows as reused, just without a name.
    expect(reused[0]?.reusedFrom).toBe('');
  });

  it('should preserve order when matches and misses interleave', () => {
    const existing = new Map([...match('犬', 'Deck A'), ...match('鳥', 'Deck B')]);
    const { reused, toFetch } = applyReuse(
      [generated('猫'), generated('犬'), generated('魚'), generated('鳥')],
      existing,
      'deck-1',
      'hiragana',
    );

    expect(reused.map((c) => c?.word ?? null)).toEqual([null, '犬', null, '鳥']);
    expect(toFetch.map((c) => c.word)).toEqual(['猫', '魚']);
  });
});
