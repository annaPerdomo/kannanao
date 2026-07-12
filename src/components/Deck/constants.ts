import type { PracticeMode } from '@/types/app';

export interface PracticeTileConfig {
  mode: PracticeMode;
  label: string;
  description: string;
  emoji: string;
  watermark: string;
  color: string;
  bg: string;
  border: string;
  shadowColor: string;
}

// Practice mode tiles use intentional semantic colors (purple, cyan, amber) for visual distinction
export const PRACTICE_CONFIG: PracticeTileConfig[] = [
  {
    mode: 'match',
    label: 'Match',
    description: 'Pair Japanese to English',
    emoji: '🎯',
    watermark: '合',
    color: '#6D28D9',
    bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    border: 'rgba(196,181,253,0.7)',
    shadowColor: 'rgba(109,40,217,0.22)',
  },
  {
    mode: 'fill',
    label: 'Fill in Blank',
    description: 'Complete the sentence',
    emoji: '✏️',
    watermark: '書',
    color: '#0E7490',
    bg: 'linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)',
    border: 'rgba(34,211,238,0.6)',
    shadowColor: 'rgba(14,116,144,0.22)',
  },
  {
    mode: 'recall',
    label: 'Guess It!',
    description: 'Pick the right meaning',
    emoji: '🌟',
    watermark: '思',
    color: '#B45309',
    bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    border: 'rgba(251,191,36,0.7)',
    shadowColor: 'rgba(180,83,9,0.22)',
  },
  {
    mode: 'kotoba-bubble',
    label: 'Sentence Builder',
    description: 'Pick the right particle to complete each sentence',
    emoji: '🫧',
    watermark: '文',
    color: '#0891B2',
    bg: 'linear-gradient(135deg, #ECFEFF 0%, #E0F2FE 100%)',
    border: 'rgba(6,182,212,0.5)',
    shadowColor: 'rgba(8,145,178,0.22)',
  },
  {
    mode: 'quiz',
    label: 'Quiz',
    description: 'Show what you know — one try each',
    emoji: '📝',
    watermark: '試',
    color: '#DB2777',
    bg: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
    border: 'rgba(244,114,182,0.6)',
    shadowColor: 'rgba(219,39,119,0.22)',
  },
];
