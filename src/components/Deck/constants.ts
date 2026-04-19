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
];
