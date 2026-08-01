import type { PracticeMode } from '@/types/app';

export interface PracticeTileConfig {
  mode: PracticeMode;
  labelKey: string;
  descriptionKey: string;
  emoji: string;
  watermark: string;
  color: string;
  bg: string;
  border: string;
  shadowColor: string;
}

// Practice mode tiles use intentional semantic colors (purple, cyan, amber) for visual distinction
// labelKey/descriptionKey are looked up in the Deck.practiceModes translation namespace.
export const PRACTICE_CONFIG: PracticeTileConfig[] = [
  {
    mode: 'match',
    labelKey: 'match.label',
    descriptionKey: 'match.description',
    emoji: '🎯',
    watermark: '合',
    color: '#6D28D9',
    bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    border: 'rgba(196,181,253,0.7)',
    shadowColor: 'rgba(109,40,217,0.22)',
  },
  {
    mode: 'fill',
    labelKey: 'fill.label',
    descriptionKey: 'fill.description',
    emoji: '✏️',
    watermark: '書',
    color: '#0E7490',
    bg: 'linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)',
    border: 'rgba(34,211,238,0.6)',
    shadowColor: 'rgba(14,116,144,0.22)',
  },
  {
    mode: 'recall',
    labelKey: 'recall.label',
    descriptionKey: 'recall.description',
    emoji: '🌟',
    watermark: '思',
    color: '#B45309',
    bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    border: 'rgba(251,191,36,0.7)',
    shadowColor: 'rgba(180,83,9,0.22)',
  },
  {
    mode: 'kotoba-bubble',
    labelKey: 'kotobaBubble.label',
    descriptionKey: 'kotobaBubble.description',
    emoji: '🫧',
    watermark: '文',
    color: '#0891B2',
    bg: 'linear-gradient(135deg, #ECFEFF 0%, #E0F2FE 100%)',
    border: 'rgba(6,182,212,0.5)',
    shadowColor: 'rgba(8,145,178,0.22)',
  },
  {
    mode: 'listen',
    labelKey: 'listen.label',
    descriptionKey: 'listen.description',
    emoji: '🎧',
    watermark: '聞',
    color: '#4338CA',
    bg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
    border: 'rgba(129,140,248,0.6)',
    shadowColor: 'rgba(67,56,202,0.22)',
  },
  {
    mode: 'reading',
    labelKey: 'reading.label',
    descriptionKey: 'reading.description',
    emoji: '📖',
    watermark: '読',
    color: '#047857',
    bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    border: 'rgba(52,211,153,0.6)',
    shadowColor: 'rgba(4,120,87,0.22)',
  },
  {
    mode: 'quiz',
    labelKey: 'quiz.label',
    descriptionKey: 'quiz.description',
    emoji: '📝',
    watermark: '試',
    color: '#DB2777',
    bg: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
    border: 'rgba(244,114,182,0.6)',
    shadowColor: 'rgba(219,39,119,0.22)',
  },
];
