import type { Flashcard as FlashcardType } from '@/types/flashcard';

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
  position: 1,
};

export const DEMO_WORDS = ['cherry blossom', '夢', 'beautiful', '月', 'voyage'];

export const DEMO_REVIEW_CARDS = [
  { word: '桜', reading: 'さくら', meaning: 'cherry blossom', jlpt: 'N5' },
  { word: '夢', reading: 'ゆめ', meaning: 'dream', jlpt: 'N4' },
  { word: '美しい', reading: 'うつくしい', meaning: 'beautiful', jlpt: 'N3' },
  { word: '月', reading: 'つき', meaning: 'moon', jlpt: 'N5' },
  { word: '旅', reading: 'たび', meaning: 'journey', jlpt: 'N4' },
];

/**
 * Real Unsplash search results, attribution fragment and all. Re-sourcing one
 * means a fresh search plus a download ping, per Unsplash's API guidelines.
 */
export const DEMO_IMAGE_CARDS: FlashcardType[] = [
  {
    id: 'img-1',
    word: '桜',
    reading: 'さくら',
    meaning: 'cherry blossom',
    image_query: 'cherry blossom',
    imageUrl:
      'https://images.unsplash.com/photo-1522383225653-ed111181a951?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MDkxNzR8MHwxfHNlYXJjaHwxfHxjaGVycnklMjBibG9zc29tfGVufDB8MHx8fDE3ODU2NzgyMjJ8MA&ixlib=rb-4.1.0&q=80&w=400&auto=format#unsplash:name=AJ&pu=https%3A%2F%2Funsplash.com%2F%40ajny%3Futm_source%3Dtangodachi%26utm_medium%3Dreferral&pp=https%3A%2F%2Funsplash.com%2Fphotos%2Fpink-flowers-McsNra2VRQQ%3Futm_source%3Dtangodachi%26utm_medium%3Dreferral',
    example_jp: '{桜|さくら}が{美|うつく}しく{咲|さ}いています。',
    example_en: 'The cherry blossoms are blooming beautifully.',
    deckId: 'demo',
    mainViewMode: 'kanji',
    cardType: 'word',
    jlptLevel: 'N5',
    position: 0,
  },
  {
    id: 'img-2',
    word: '夢',
    reading: 'ゆめ',
    meaning: 'dream',
    image_query: 'dream stars galaxy',
    imageUrl:
      'https://images.unsplash.com/photo-1646656487404-3fa1f1216b19?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MDkxNzR8MHwxfHNlYXJjaHwxfHxkcmVhbSUyMHN0YXJzJTIwZ2FsYXh5fGVufDB8MHx8fDE3ODU2NzgyMjN8MA&ixlib=rb-4.1.0&q=80&w=400&auto=format#unsplash:name=%D0%9E%D0%BB%D0%B5%D0%B3%20%D0%9C%D0%BE%D1%80%D0%BE%D0%B7&pu=https%3A%2F%2Funsplash.com%2F%40tengyart%3Futm_source%3Dtangodachi%26utm_medium%3Dreferral&pp=https%3A%2F%2Funsplash.com%2Fphotos%2Fthe-night-sky-is-filled-with-stars-and-stars-RUMON1xRy_U%3Futm_source%3Dtangodachi%26utm_medium%3Dreferral',
    example_jp: '{素晴|すば}らしい{夢|ゆめ}を{見|み}た。',
    example_en: 'I had a wonderful dream.',
    deckId: 'demo',
    mainViewMode: 'kanji',
    cardType: 'word',
    jlptLevel: 'N4',
    position: 1,
  },
  {
    id: 'img-3',
    word: '美しい',
    reading: 'うつくしい',
    meaning: 'beautiful',
    image_query: 'beautiful japan landscape',
    imageUrl:
      'https://images.unsplash.com/photo-1551241090-67de81d3541c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MDkxNzR8MHwxfHNlYXJjaHwxfHxiZWF1dGlmdWwlMjBqYXBhbiUyMGxhbmRzY2FwZXxlbnwwfDB8fHwxNzg1Njc4MjI0fDA&ixlib=rb-4.1.0&q=80&w=400&auto=format#unsplash:name=Hu%20Chen&pu=https%3A%2F%2Funsplash.com%2F%40huchenme%3Futm_source%3Dtangodachi%26utm_medium%3Dreferral&pp=https%3A%2F%2Funsplash.com%2Fphotos%2Fjapanese-garden-wall-murals-A7asc8TrnY4%3Futm_source%3Dtangodachi%26utm_medium%3Dreferral',
    example_jp: '{景色|けしき}が{本当|ほんとう}に{美|うつく}しい。',
    example_en: 'The scenery is truly beautiful.',
    deckId: 'demo',
    mainViewMode: 'kanji',
    cardType: 'word',
    jlptLevel: 'N3',
    position: 2,
  },
  {
    id: 'img-4',
    word: '月',
    reading: 'つき',
    meaning: 'moon',
    image_query: 'full moon night',
    imageUrl:
      'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MDkxNzR8MHwxfHNlYXJjaHwxfHxmdWxsJTIwbW9vbiUyMG5pZ2h0fGVufDB8MHx8fDE3ODU2NzgyMjR8MA&ixlib=rb-4.1.0&q=80&w=400&auto=format#unsplash:name=Mike%20Petrucci&pu=https%3A%2F%2Funsplash.com%2F%40mikepetrucci%3Futm_source%3Dtangodachi%26utm_medium%3Dreferral&pp=https%3A%2F%2Funsplash.com%2Fphotos%2Ffull-moon-photography-uIf6H1or1nE%3Futm_source%3Dtangodachi%26utm_medium%3Dreferral',
    example_jp: '今夜の{月|つき}は{丸|まる}くて{明|あか}るい。',
    example_en: "Tonight's moon is round and bright.",
    deckId: 'demo',
    mainViewMode: 'kanji',
    cardType: 'word',
    jlptLevel: 'N5',
    position: 3,
  },
  {
    id: 'img-5',
    word: '旅',
    reading: 'たび',
    meaning: 'journey',
    image_query: 'travel japan journey',
    imageUrl:
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5MDkxNzR8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBqYXBhbiUyMGpvdXJuZXl8ZW58MHwwfHx8MTc4NTY3ODIyNXww&ixlib=rb-4.1.0&q=80&w=400&auto=format#unsplash:name=Su%20San%20Lee&pu=https%3A%2F%2Funsplash.com%2F%40blackodc%3Futm_source%3Dtangodachi%26utm_medium%3Dreferral&pp=https%3A%2F%2Funsplash.com%2Fphotos%2Fpagoda-surrounded-by-trees-E_eWwM29wfU%3Futm_source%3Dtangodachi%26utm_medium%3Dreferral',
    example_jp: '{長|なが}い{旅|たび}が{始|はじ}まります。',
    example_en: 'A long journey begins.',
    deckId: 'demo',
    mainViewMode: 'kanji',
    cardType: 'word',
    jlptLevel: 'N4',
    position: 4,
  },
];
