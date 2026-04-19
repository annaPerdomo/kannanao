import type { Flashcard as FlashcardType } from '@/types/flashcard';

export const SAKURA_CARD: FlashcardType = {
  id: 'demo-sakura',
  word: '桜',
  reading: 'さくら',
  meaning: 'cherry blossom',
  image_query: 'cherry blossom japan',
  imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=600&q=80',
  example_jp: '{桜|さくら}の{花|はな}が{綺麗|きれい}に{咲|さ}いています。',
  example_en: 'The cherry blossoms are blooming beautifully.',
  deckId: 'demo',
  mainViewMode: 'kanji',
  cardType: 'word',
  jlptLevel: 'N5',
};

export const YUME_CARD: FlashcardType = {
  id: 'demo-yume',
  word: '夢',
  reading: 'ゆめ',
  meaning: 'dream',
  image_query: 'dream clouds stars night',
  example_jp: '{昨夜|さくや}{素晴|すば}らしい{夢|ゆめ}を{見|み}ました。',
  example_en: 'I had a wonderful dream last night.',
  deckId: 'demo',
  mainViewMode: 'kanji',
  cardType: 'word',
  jlptLevel: 'N4',
};

export const DEMO_WORDS = ['cherry blossom', '夢', 'beautiful', '月', 'voyage'];

export const DEMO_REVIEW_CARDS = [
  { word: '桜',    reading: 'さくら',     meaning: 'cherry blossom', jlpt: 'N5' },
  { word: '夢',    reading: 'ゆめ',       meaning: 'dream',          jlpt: 'N4' },
  { word: '美しい', reading: 'うつくしい', meaning: 'beautiful',      jlpt: 'N3' },
  { word: '月',    reading: 'つき',       meaning: 'moon',           jlpt: 'N5' },
  { word: '旅',    reading: 'たび',       meaning: 'journey',        jlpt: 'N4' },
];

export const DEMO_IMAGE_CARDS: FlashcardType[] = [
  {
    id: 'img-1', word: '桜', reading: 'さくら', meaning: 'cherry blossom',
    image_query: 'cherry blossom',
    imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=400&q=80',
    example_jp: '{桜|さくら}が{美|うつく}しく{咲|さ}いています。',
    example_en: 'The cherry blossoms are blooming beautifully.',
    deckId: 'demo', mainViewMode: 'kanji', cardType: 'word', jlptLevel: 'N5',
  },
  {
    id: 'img-2', word: '夢', reading: 'ゆめ', meaning: 'dream',
    image_query: 'dream stars galaxy',
    imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=400&q=80',
    example_jp: '{素晴|すば}らしい{夢|ゆめ}を{見|み}た。',
    example_en: 'I had a wonderful dream.',
    deckId: 'demo', mainViewMode: 'kanji', cardType: 'word', jlptLevel: 'N4',
  },
  {
    id: 'img-3', word: '美しい', reading: 'うつくしい', meaning: 'beautiful',
    image_query: 'beautiful japan landscape',
    imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=400&q=80',
    example_jp: '{景色|けしき}が{本当|ほんとう}に{美|うつく}しい。',
    example_en: 'The scenery is truly beautiful.',
    deckId: 'demo', mainViewMode: 'kanji', cardType: 'word', jlptLevel: 'N3',
  },
  {
    id: 'img-4', word: '月', reading: 'つき', meaning: 'moon',
    image_query: 'full moon night',
    imageUrl: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=400&q=80',
    example_jp: '今夜の{月|つき}は{丸|まる}くて{明|あか}るい。',
    example_en: "Tonight's moon is round and bright.",
    deckId: 'demo', mainViewMode: 'kanji', cardType: 'word', jlptLevel: 'N5',
  },
  {
    id: 'img-5', word: '旅', reading: 'たび', meaning: 'journey',
    image_query: 'travel japan journey',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80',
    example_jp: '{長|なが}い{旅|たび}が{始|はじ}まります。',
    example_en: 'A long journey begins.',
    deckId: 'demo', mainViewMode: 'kanji', cardType: 'word', jlptLevel: 'N4',
  },
];
