import type { Flashcard as FlashcardType } from '@/types/flashcard';

export const THEME_COLORS: Record<
  string,
  { bg: string; brand: string; accent: string; text: string; topBar: string }
> = {
  theme_sakura: {
    bg: '#FFF5FB',
    brand: '#F472B6',
    accent: '#A78BFA',
    text: '#5E2F6C',
    topBar: '#F472B6',
  },
  theme_murasaki: {
    bg: '#F5F3FF',
    brand: '#A78BFA',
    accent: '#F472B6',
    text: '#2E1065',
    topBar: '#A78BFA',
  },
  theme_yuki: {
    bg: '#F0F9FF',
    brand: '#38BDF8',
    accent: '#A78BFA',
    text: '#0C4A6E',
    topBar: '#38BDF8',
  },
  theme_ocean: {
    bg: '#EFF6FF',
    brand: '#60A5FA',
    accent: '#2DD4BF',
    text: '#1E3A8A',
    topBar: '#60A5FA',
  },
  theme_forest: {
    bg: '#F0FDF4',
    brand: '#4ADE80',
    accent: '#34D399',
    text: '#14532D',
    topBar: '#4ADE80',
  },
  theme_sunset: {
    bg: '#FFF7ED',
    brand: '#FB923C',
    accent: '#FBBF24',
    text: '#7C2D12',
    topBar: '#FB923C',
  },
  theme_lavender: {
    bg: '#FAF5FF',
    brand: '#C084FC',
    accent: '#F472B6',
    text: '#581C87',
    topBar: '#C084FC',
  },
  theme_midnight: {
    bg: '#F8FAFC',
    brand: '#94A3B8',
    accent: '#38BDF8',
    text: '#0F172A',
    topBar: '#94A3B8',
  },
  theme_matcha: {
    bg: '#FEFCE8',
    brand: '#84CC16',
    accent: '#34D399',
    text: '#365314',
    topBar: '#84CC16',
  },
  theme_rosegold: {
    bg: '#FFF1F2',
    brand: '#FB7185',
    accent: '#FBBF24',
    text: '#881337',
    topBar: '#FB7185',
  },
};

export const SAMPLE_CARD: FlashcardType = {
  id: 'preview',
  word: '桜',
  reading: 'さくら',
  meaning: 'Cherry blossom',
  image_query: 'cherry blossom japan',
  imageUrl:
    'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=600&q=80',
  example_jp: '{桜|さくら}の{花|はな}が{綺麗|きれい}に{咲|さ}いています。',
  example_en: 'The cherry blossoms are blooming beautifully.',
  deckId: 'preview',
  mainViewMode: 'kanji',
  cardType: 'word',
  jlptLevel: 'N5',
};
