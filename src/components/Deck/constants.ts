import type { PracticeMode } from '@/types/app';

export interface PracticeTileConfig {
  mode: PracticeMode;
  labelKey: string;
  descriptionKey: string;
  kanji: string;
  /** Semantic hue — tile border, badge, title and CTA all derive from it. */
  color: string;
}

// labelKey/descriptionKey are looked up in the Deck.practiceModes translation namespace.
export const PRACTICE_CONFIG: PracticeTileConfig[] = [
  {
    mode: 'match',
    labelKey: 'match.label',
    descriptionKey: 'match.description',
    kanji: '合',
    color: '#6D28D9',
  },
  {
    mode: 'fill',
    labelKey: 'fill.label',
    descriptionKey: 'fill.description',
    kanji: '書',
    color: '#0E7490',
  },
  {
    mode: 'recall',
    labelKey: 'recall.label',
    descriptionKey: 'recall.description',
    kanji: '思',
    color: '#B45309',
  },
  {
    mode: 'kotoba-bubble',
    labelKey: 'kotobaBubble.label',
    descriptionKey: 'kotobaBubble.description',
    kanji: '文',
    // Darkened from #0891B2, which fell to 3.7:1 — under AA for a 0.95rem label
    // — once the tile background moved from #ECFEFF to white.
    color: '#12708A',
  },
  {
    mode: 'listen',
    labelKey: 'listen.label',
    descriptionKey: 'listen.description',
    kanji: '聞',
    color: '#4338CA',
  },
  {
    mode: 'reading',
    labelKey: 'reading.label',
    descriptionKey: 'reading.description',
    kanji: '読',
    color: '#047857',
  },
  {
    mode: 'quiz',
    labelKey: 'quiz.label',
    descriptionKey: 'quiz.description',
    kanji: '試',
    color: '#DB2777',
  },
];
